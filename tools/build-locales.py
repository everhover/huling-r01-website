"""Build the English/Japanese/Traditional Chinese pages from the canonical Chinese page and reviewed copy."""
from pathlib import Path
import json,re
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent.parent
copy=json.loads((root/'assets/i18n/copy.json').read_text())
attrs={
'主导航':('Main navigation','メインナビゲーション'),'乎零首页':('HULING home','HULING ホーム'),
'下载入口即将开放':('Download coming soon','ダウンロードは近日公開'),
'乎零 App 产品周会录音界面':('HULING App meeting recording screen, shown in Chinese','HULING Appの会議録音画面（中国語）'),
'选择戒指颜色':('Choose a ring finish','リングのカラーを選択'),
'模型观察视角':('Model views','モデルの表示方向'),
'R01 两色交互模型，拖动或方向键旋转，Home 复位':('Interactive R01 model in two finishes. Drag or use arrow keys to rotate; Home resets.','R01の2色のインタラクティブモデル。ドラッグまたは矢印キーで回転、Homeキーでリセット。'),
'支持':('Supported','対応'),'不支持':('Not supported','非対応'),
'语言版本':('Language','言語'),
'乎零 HULING':('HULING','HULING')}
source=(root/'motion-b.html').read_text()
for lang,index in [('en',0),('ja',1)]:
 soup=BeautifulSoup(source,'html.parser');soup.html['lang']=lang;soup.html['data-locale']=lang
 for node in list(soup.find_all(string=True)):
  if node.parent.name in ['script','style']:continue
  text=str(node);key=text.strip()
  if key in copy and lang in copy[key]:node.replace_with(text.replace(key,copy[key][lang]))
 for el in soup.find_all(True):
  for attr in ['aria-label','alt','title','content']:
   value=el.get(attr)
   if value in attrs:el[attr]=attrs[value][index]
 soup.select_one('meta[name="description"]')['content']={
 'en':'HULING R01 combines health tracking and voice recording in one smart ring. Capture thoughts and organize recordings into notes, to-dos and calendar entries.',
 'ja':'HULING R01は、健康モニタリングと音声記録をひとつにしたスマートリング。思考を記録し、ノート、タスク、予定に整理します。'}[lang]
 for span in soup.select('.period'):span.string='.' if lang=='en' else '。'
 # The language names remain native so every visitor can recognize their choice.
 menu=soup.select_one('#language-select');menu['aria-label']='Language' if lang=='en' else '言語'
 for option in menu.select('option'):
  option.attrs.pop('selected',None)
  if option['value']==lang:option['selected']=''
 (root/f'motion-b-{lang}.html').write_text(str(soup))

# Traditional Chinese shares the canonical layout and reviewed product facts.
soup=BeautifulSoup(source,'html.parser')
soup.html['lang']='zh-Hant';soup.html['data-locale']='zh-Hant'
for node in list(soup.find_all(string=True)):
 if node.parent.name in ['script','style']:continue
 text=str(node);key=text.strip()
 if key in copy:node.replace_with(text.replace(key,copy[key]['zh-Hant']))
for el in soup.find_all(True):
 for attr in ['aria-label','alt','title','content']:
  value=el.get(attr)
  if value in copy:el[attr]=copy[value]['zh-Hant']
menu=soup.select_one('#language-select')
for option in menu.select('option'):
 option.attrs.pop('selected',None)
 if option['value']=='zh-Hant':option['selected']=''
(root/'motion-b-zh-hant.html').write_text(str(soup))
