from pathlib import Path
from PIL import Image
from psd_tools import PSDImage
ROOT = Path(__file__).resolve().parent.parent
psd = PSDImage.open(ROOT / 'resource/v02/demo.psd')
layers = {layer.layer_id: layer for layer in psd.descendants()}
out = ROOT / 'assets'
out.mkdir(exist_ok=True)
def save_layer(layer_id, name):
 layer=layers[layer_id]
 im=layer.composite() if layer.is_group() else layer.topil()
 im.save(out / (name+'.png'))
for layer_id,name in [(13,'logo'),(568,'logo-footer'),(283,'machine'),(937,'application-antibody'),(948,'application-vaccine'),(954,'application-insulin'),(960,'application-protein'),(966,'application-blood'),(449,'research-icon'),(451,'team-icon')]:
 save_layer(layer_id,name)
def canvas_layer(layer_id, box, name):
 layer=layers[layer_id]; im=layer.topil().convert('RGBA'); canvas=Image.new('RGBA',(box[2]-box[0],box[3]-box[1]),'white');canvas.paste(im,(layer.left-box[0],layer.top-box[1]),im);canvas.convert('RGB').save(out/(name+'.webp'),quality=92)
canvas_layer(1800,(0,160,1920,998),'hero')
canvas_layer(929,(0,1158,1920,2404),'product-background')
# Backgrounds and news thumbnails are cropped from the supplied flattened design.
full=psd.topil()
for name,box in [('about-background',(0,2950,1920,3210)),('factory',(976,3346,1503,3642)),('news-factory',(360,4144,744,4326)),('news-lab',(768,4144,1152,4326)),('news-exhibition',(1176,4144,1560,4326)),('solution-background',(0,4756,350,5052))]:
 full.crop(box).convert('RGB').save(out/(name+'.webp'),quality=94)
print('Exported',len(list(out.iterdir())),'assets')
