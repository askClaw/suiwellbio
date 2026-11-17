"""Compare browser captures against supplied PSD composite pixels.
MAE is an RGB error on a 0..255 scale, not a claimed reproduction percentage.
"""
from pathlib import Path
from PIL import Image,ImageChops,ImageEnhance,ImageStat
from psd_tools import PSDImage
import json,sys
import numpy as np
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'.design/precision-review/local'
PAGES=dict(index='demo',about='aboutv001',product='product001',process='gy001',service='service001',news='news',**{'news-detail':'new_detail001'},contact='contact001')
browser=json.loads((OUT/'browser.json').read_text())
result=[]
def exact_stats(image):
 pixels=np.asarray(image)
 count=int(np.count_nonzero(np.any(pixels!=0,axis=2)))
 return {'pixel_equal':count==0,'different_pixels':count,'max_channel_delta':int(pixels.max())}
for page,source in PAGES.items():
 original=PSDImage.open(ROOT/f'resource/v02/{source}.psd').topil().convert('RGB')
 actual=Image.open(OUT/f'{page}.png').convert('RGB')
 assert original.size==actual.size,(page,original.size,actual.size)
 diff=ImageChops.difference(original,actual)
 row={'page':page,'rgb_mae':round(sum(ImageStat.Stat(diff).mean)/3,4),**exact_stats(diff),'sections':[]}
 layout=next(p for p in browser['pages'] if p['page']==('home' if page=='index' else page))['sections']
 header=diff.crop((0,0,1920,layout[0]['top']))
 row['header']={'height':layout[0]['top'],'mae':round(sum(ImageStat.Stat(header).mean)/3,4),**exact_stats(header)}
 for section in layout:
  box=(0,section['top'],1920,min(original.height,section['top']+section['height']))
  region=diff.crop(box)
  row['sections'].append(dict(section,mae=round(sum(ImageStat.Stat(region).mean)/3,4),**exact_stats(region)))
 diff=ImageEnhance.Contrast(diff).enhance(4);diff.save(OUT/f'{page}-difference.png')
 original.thumbnail((640,2000));actual.thumbnail((640,2000))
 sheet=Image.new('RGB',(1280,max(original.height,actual.height)), '#ddd');sheet.paste(original,(0,0));sheet.paste(actual,(640,0));sheet.save(OUT/f'{page}-comparison.jpg',quality=92)
 result.append(row);print(page,row['rgb_mae'],[(r['name'],r['mae']) for r in row['sections']])
(OUT/'comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
