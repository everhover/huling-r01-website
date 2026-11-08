"""Run with: python3 -m unittest discover -s tools -p 'test_*.py'."""
import json
import tempfile
import unittest
from pathlib import Path
from bs4 import BeautifulSoup
from seo import build, normalize_url
import xml.etree.ElementTree as ET

class PortableSEO(unittest.TestCase):
    def test_root_and_repository_deployments(self):
        for base in ['https://test.invalid/', 'https://another.invalid/repository/']:
            with self.subTest(base=base), tempfile.TemporaryDirectory() as temp:
                output=Path(temp)/'site'
                build(base,output)
                pages=list(output.glob('*.html'))
                self.assertEqual(len(pages),5)
                for page in pages:
                    soup=BeautifulSoup(page.read_text(),'html.parser')
                    self.assertTrue(soup.select_one('link[rel="canonical"]')['href'].startswith(base))
                    links=soup.select('link[hreflang]')
                    self.assertEqual(len(links),5)
                    for link in links:
                        self.assertTrue(link['href'].startswith(base))
                        target=link['href'][len(base):] or 'index.html'
                        self.assertTrue((output/target).is_file())
                    self.assertNotIn('noindex',soup.select_one('meta[name="robots"]')['content'])
                    self.assertEqual(len(json.loads(soup.select_one('script[data-seo]').string)['@graph']),4)
                    for el in soup.select('[src],link[rel="stylesheet"]'):
                        target=(el.get('src') or el.get('href')).split('?')[0]
                        self.assertTrue((output/target).is_file(),target)
                xml=ET.parse(output/'sitemap.xml')
                self.assertEqual(len(list(xml.getroot())),4)
                self.assertIn(base+'sitemap.xml',(output/'robots.txt').read_text())
                self.assertFalse((output/'.git').exists())
                self.assertFalse((output/'legacy-index.html').exists())
                with self.assertRaises(ValueError):build(base,output)
    def test_invalid_base_is_rejected(self):
        for value in ['', '/relative/', 'https://x.invalid/?q=1','https://x.invalid/#a','https://user:pass@x.invalid/','https://x.invalid/../']:
            with self.subTest(value=value),self.assertRaises(ValueError):normalize_url(value)

if __name__=='__main__':unittest.main()
