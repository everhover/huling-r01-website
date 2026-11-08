"""Portable, static SEO generation. No network or hosting-provider integration."""
import argparse
import json
import shutil
from pathlib import Path
from urllib.parse import urlsplit, urljoin
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent

def config(root):
    return json.loads((root / 'seo.config.json').read_text())

def normalize_url(value):
    parts = urlsplit(value)
    if parts.scheme not in ('https', 'http') or not parts.netloc or parts.query or parts.fragment or parts.username or parts.password:
        raise ValueError('site_url must be an absolute HTTP(S) deployment URL without credentials, query or fragment')
    if any(p in ('.', '..') for p in parts.path.split('/')):
        raise ValueError('site_url cannot contain dot path segments')
    return value.rstrip('/') + '/'

def metadata(html, cfg, filename, base='', entry=False):
    soup = BeautifulSoup(html, 'html.parser')
    for el in soup.select('link[rel="canonical"], link[hreflang], meta[property^="og:"], meta[name^="twitter:"], script[data-seo], meta[name="robots"]'):
        el.decompose()
    def tag(element, **attrs):
        el = soup.new_tag(element, attrs=attrs)
        soup.head.append(el)
        return el
    def url(path):
        return urljoin(base, path) if base else (path or './')
    lang = soup.html.get('lang', 'zh-CN')
    title = soup.title.get_text(strip=True)
    description = soup.select_one('meta[name="description"]')['content']
    page_url = url(filename)
    tag('link', rel='canonical', href=page_url)
    for code, page in cfg['locales'].items():
        tag('link', rel='alternate', hreflang=code, href=url(page))
    tag('link', rel='alternate', hreflang='x-default', href=url(''))
    tag('meta', name='robots', content='index, follow, max-image-preview:large')
    for prop, value in {'type':'website','site_name':cfg['brand'],'title':title,'description':description,'url':page_url,'image':url(cfg['image']), 'image:alt':cfg['product'], 'locale':{'zh-CN':'zh_CN','zh-Hant':'zh_TW','en':'en_US','ja':'ja_JP'}[lang]}.items():
        tag('meta', property='og:'+prop, content=value)
    for name, value in {'card':'summary_large_image','title':title,'description':description,'image':url(cfg['image']),'image:alt':cfg['product']}.items():
        tag('meta', name='twitter:'+name, content=value)
    # Do not invent prices, reviews, medical claims, certifications or availability.
    graph = [
        {'@type':'Organization','@id':url('')+'#organization','name':cfg['brand'],'url':url(''),'logo':url('assets/wordmark.svg')},
        {'@type':'WebSite','@id':url('')+'#website','name':cfg['brand'],'url':url(''),'inLanguage':list(cfg['locales'])},
        {'@type':'WebPage','@id':page_url+'#webpage','url':page_url,'name':title,'description':description,'inLanguage':lang,'isPartOf':{'@id':url('')+'#website'},'about':{'@id':url('')+'#r01'}},
        {'@type':'Product','@id':url('')+'#r01','name':cfg['product'],'model':'R01','brand':{'@type':'Brand','name':cfg['brand']},'description':description,'image':[url(cfg['image'])]}
    ]
    script=tag('script', type='application/ld+json', **{'data-seo':'structured-data'})
    script.string=json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False).replace('<','\\u003c')
    # Real, crawlable alternatives when scripting is unavailable; no visual change with JS enabled.
    for old in soup.select('noscript[data-seo]'):
        old.decompose()
    fallback=soup.new_tag('noscript',attrs={'data-seo':'language-links'})
    nav=soup.new_tag('nav',attrs={'aria-label':'Language'})
    for code, label in [('zh-CN','简体中文'),('zh-Hant','繁體中文'),('en','English'),('ja','日本語')]:
        a=soup.new_tag('a',href=cfg['locales'][code],hreflang=code);a.string=label;nav.append(a);nav.append(' ')
    fallback.append(nav)
    soup.select_one('header').insert_after(fallback)
    if entry:soup.html['data-language-entry']='true'
    else:soup.html.attrs.pop('data-language-entry',None)
    return str(soup)

def update_source(root=ROOT):
    cfg=config(root)
    for page in cfg['locales'].values():
        p=root/page;p.write_text(metadata(p.read_text(),cfg,page))
    # Same current content as Chinese, with a canonical to the stable Chinese URL.
    (root/'index.html').write_text(metadata((root/'motion-b.html').read_text(),cfg,'motion-b.html',entry=True))
    active=set(cfg['locales'].values())|{'index.html'}
    for p in root.glob('*.html'):
        if p.name in active:continue
        soup=BeautifulSoup(p.read_text(),'html.parser')
        for old in soup.select('meta[name="robots"]'):old.decompose()
        soup.head.append(soup.new_tag('meta',attrs={'name':'robots','content':'noindex, follow'}))
        p.write_text(str(soup))
    (root/'robots.txt').write_text('User-agent: *\nAllow: /\n')

def build(site_url, output, root=ROOT):
    cfg=config(root);base=normalize_url(site_url or cfg['site_url'])
    output=Path(output).resolve()
    if output==root or (root in output.parents and output not in (root/'dist',root/'site-dist')):
        raise ValueError('Use dist/site-dist in the project, or a new directory outside the project')
    if output.exists():
        raise ValueError('Output directory already exists; choose a new directory to avoid overwriting files')
    output.mkdir(parents=True)
    # Explicit deployment allowlist: no .git, credentials, QA artifacts, historic pages, or platform config.
    for p in root.glob('*.css'):shutil.copy2(p,output/p.name)
    for name in ['locale-router.js','ring-renderer.js','motion-studies.js']:
        shutil.copy2(root/name,output/name)
    shutil.copytree(root/'assets',output/'assets')
    for page in cfg['locales'].values():
        (output/page).write_text(metadata((root/page).read_text(),cfg,page,base))
    (output/'index.html').write_text(metadata((root/'motion-b.html').read_text(),cfg,'motion-b.html',base,entry=True))
    ns='http://www.sitemaps.org/schemas/sitemap/0.9';xhtml='http://www.w3.org/1999/xhtml'
    ET.register_namespace('',ns);ET.register_namespace('xhtml',xhtml)
    tree=ET.Element('{'+ns+'}urlset')
    for page in cfg['locales'].values():
        item=ET.SubElement(tree,'{'+ns+'}url');ET.SubElement(item,'{'+ns+'}loc').text=urljoin(base,page)
        for code,path in [*cfg['locales'].items(),('x-default','')]:
            ET.SubElement(item,'{'+xhtml+'}link',rel='alternate',hreflang=code,href=urljoin(base,path))
    ET.ElementTree(tree).write(output/'sitemap.xml',encoding='utf-8',xml_declaration=True)
    (output/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+urljoin(base,'sitemap.xml')+'\n')
    print('Static deployment ready:',output)
    print('Public base URL:',base)
    print('For subdirectory hosting, merge this Sitemap line into the host-root /robots.txt.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-url',default='');parser.add_argument('--output',default='dist');parser.add_argument('--source-only',action='store_true')
    args=parser.parse_args()
    if args.source_only:update_source()
    else:
        try:build(args.site_url,args.output)
        except ValueError as e:parser.error(str(e))
