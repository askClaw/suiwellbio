from pathlib import Path
from psd_tools import PSDImage
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'inner'
OUT.mkdir(exist_ok=True)
selections = {
 'aboutv001': [(3867, 'locations-map'), (3796, 'factory-full')],
 'gy001': [(3519, 'team'), (3557, 'expert-icon'), (3558, 'team-icon'), (3561, 'global-icon'), (3560, 'local-icon')],
 'product001': [(3334, 'machine-back')],
}
for name, exports in selections.items():
 psd = PSDImage.open(ROOT / f'resource/v02/{name}.psd')
 layers = {l.layer_id:l for l in psd.descendants()}
 for ident, filename in exports:
  layer = layers[ident]
  image = psd.topil().crop(layer.bbox) if layer.is_group() else layer.topil()
  if filename == 'factory-full':
   image.convert('RGB').save(OUT / (filename+'.webp'), quality=92)
  else:
   image.save(OUT / (filename+'.png'))
  print(filename, image.size, flush=True)

# Export the two decorative backgrounds with their PSD clipping, opacity and
# base shapes; never flatten the headings or cards into the artwork.
psd = PSDImage.open(ROOT / 'resource/v02/aboutv001.psd')
layers = {layer.layer_id: layer for layer in psd.descendants()}
for group_id, selected, box, name in [
 (2028, {1979, 3989}, (0,1892,1920,2540), 'advantages-mountains'),
 (3743, {3959, 3988}, (359,2774,1561,3082), 'mission-mountains'),
]:
 group = layers[group_id]
 states = [(child, child.visible) for child in group]
 for child, _ in states:
  child.visible = child.layer_id in selected
 artwork = group.composite(viewport=box, force=True)
 artwork.convert('RGB').save(OUT / (name+'.webp'), quality=90)
 for child, visible in states:
  child.visible = visible
 print(name, artwork.size, flush=True)
