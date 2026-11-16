"""Original title artwork and decorative backgrounds, with PSD masks/effects."""
from pathlib import Path
from psd_tools import PSDImage
R=Path(__file__).resolve().parent.parent
O=R/'assets/psd';O.mkdir(exist_ok=True)
for name,groups,backgrounds in [
 ('demo',[(294,'home-product'),(441,'home-about'),(480,'home-news')],[(389,{311,977,978},(0,2404,1920,2950),'home-applications')]),
 ('aboutv001',[(1954,'about-locations'),(1991,'about-advantages'),(3709,'about-mission')],[]),
 ('product001',[(1884,'product-core'),(1954,'product-advantages'),(1991,'product-flow')],[(2643,{2645,2692,2693},(0,3393,1920,3621),'product-applications')]),
 ('gy001',[(1884,'process-system'),(1954,'process-team'),(1991,'process-compliance')],[(2028,{1979,3563,3564,3565,3566},(0,2190,1920,3054),'process-compliance')]),
 ('service001',[(1884,'service-system'),(1954,'service-project'),(1991,'service-faq'),(3709,'service-downloads')],[(1976,{2699,3787,3788},(0,1181,1920,2646),'service-project')])]:
 p=PSDImage.open(R/'resource/v02'/f'{name}.psd');d={l.layer_id:l for l in p.descendants()}
 for id,key in groups:
  g=d[id];im=g.composite();im.save(O/f'heading-{key}.png');print(key,g.bbox)
 for id,selected,box,key in backgrounds:
  g=d[id]
  for child in g:child.visible=child.layer_id in selected
  g.composite(viewport=box,force=True).convert('RGB').save(O/f'background-{key}.webp',quality=95)
for name,key,box in [('demo','home-applications',(600,2483,1320,2614)),('product001','product-parameters',(600,2605,1320,2704))]:
 p=PSDImage.open(R/'resource/v02'/f'{name}.psd');p.topil().crop(box).save(O/f'heading-{key}.png')
p=PSDImage.open(R/'resource/v02/demo.psd');d={l.layer_id:l for l in p.descendants()}
d[562].composite().save(O/'solution-copy.png')
# Rasterize text blocks whose mixed fonts and explicit PSD line breaks matter.
for name,ids in [
 ('demo',[444]),('aboutv001',[3793]),('product001',[1893,1917,1929,1937]),
 ('news',[4005,4006,4007,4011,4021,4022,4038,4039]),
 ('new_detail001',[]),('contact001',[4352])]:
 p=PSDImage.open(R/'resource/v02'/f'{name}.psd');d={l.layer_id:l for l in p.descendants()}
 for id in ids:
  d[id].topil().save(O/f'{name}-text-{id}.png')
for name,ids in [('demo',[14,595,599,603,577]),('new_detail001',[3998,4130,4131])]:
 p=PSDImage.open(R/'resource/v02'/f'{name}.psd');d={l.layer_id:l for l in p.descendants()}
 for id in ids:
  l=d[id];(l.composite() if l.is_group() else l.topil()).save(O/f'{name}-text-{id}.png')
p=PSDImage.open(R/'resource/v02/demo.psd');d={l.layer_id:l for l in p.descendants()}
for id in [42,274,182,183,187,188,192,193,197,198,202,203,207,208]:
 l=d[id];(l.composite() if l.is_group() else l.topil()).save(O/f'demo-text-{id}.png')
p.topil().crop((1043,3346,1522,3663)).save(O/'home-factory-clipped.png')
p=PSDImage.open(R/'resource/v02/aboutv001.psd');d={l.layer_id:l for l in p.descendants()}
p.topil().crop((1082,538,1561,1000)).save(O/'company-factory-clipped.png')
d[3961].topil().save(O/'mission-copy.png')
p=PSDImage.open(R/'resource/v02/product001.psd');im=p.topil()
for i,box in enumerate([(380,1510,722,1662),(792,1510,1132,1662),(1202,1510,1540,1662),(380,1822,722,1880),(792,1822,1132,1880),(1202,1822,1540,1880)]):im.crop(box).save(O/f'advantage-copy-{i+1}.png')
