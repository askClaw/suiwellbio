"""Separate the saved home artwork into backgrounds, text and live controls."""
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

MARKER = '/* Generated home component artwork. */'

def export_home(root, output):
    psd = PSDImage.open(root / 'resource/v02/demo.psd')
    layers = {layer.layer_id: layer for layer in psd.descendants()}
    bounds = {ident:layer.bbox for ident,layer in layers.items()}
    saved = psd.topil().convert('RGB')
    # Unlike the saved page crop, fixed controls need transparent artwork.
    phone_mask = layers[594].topil().convert('RGBA').getchannel('A')
    phone = Image.new('RGBA', phone_mask.size, 'white')
    phone.putalpha(phone_mask)  # The source layer uses a white color overlay.
    collapsed = layers[592].topil().convert('RGBA')
    collapsed.alpha_composite(phone, ((collapsed.width-phone.width)//2, (collapsed.height-phone.height)//2))
    collapsed.save(output / 'tool-phone-collapsed.png')
    css = [MARKER, '@media(min-width:1280px){']
    def crop(name, box):
        saved.crop(box).save(output / f'{name}.png')
    def artwork(selector, name, box, origin):
        crop(name, box)
        x,y,r,b = box
        css.append(f'{selector}{{content:"";position:absolute;inset:auto;left:{x-origin[0]}px;top:{y-origin[1]}px;width:{r-x}px;height:{b-y}px;transform:none;z-index:auto;background:url("assets/psd/{name}.png") no-repeat;pointer-events:none}}')
    css += [
        '.hero[data-slide="0"] .hero-copy h1{position:relative;background:none;filter:none}',
        '.hero[data-slide="0"] .hero-copy p{position:relative;left:1px;background:none}',
        '.hero-content>.button,.slide-arrow{color:transparent;background:none;border:0;border-radius:0;box-shadow:none;overflow:visible}',
        '.hero-content>.button:hover,.slide-arrow:hover{background:none;box-shadow:none}',
        '.hero-content>.button:after,.slide-arrow:after{display:none}',
        '.slide-arrow.next{right:49px}',
        '.slide-dots{left:calc(50% - 76px);transform:none;bottom:29px;height:8px;gap:7px}',
        '.slide-dots button{width:41px;height:8px}.slide-dots button.selected{width:55px}',
        '.hero[data-slide="0"] .slide-dots{background:url("assets/psd/home-slide-dots.png") no-repeat}',
        '.hero[data-slide="0"] .slide-dots button{background:none}',
    ]
    artwork('.hero[data-slide="0"] .hero-copy h1:before','home-hero-heading',(355,408,980,582),(372,426))
    artwork('.hero[data-slide="0"] .hero-copy p:before','home-hero-caption',(368,586,812,621),(373,592))
    artwork('.hero-content>.button:before','home-video-control',(360,634,568,716),(371,644))
    artwork('.slide-arrow.previous:before','home-slide-previous',(44,550,102,608),(48,554))
    artwork('.slide-arrow.next:before','home-slide-next',(1818,550,1876,608),(1822,554))
    crop('home-slide-dots',(884,961,1035,969))
    hero=saved.crop((0,160,1920,998))
    raw_hero=Image.open(output/'hero-lossless.png').convert('RGB')
    for x,y,r,b in [(355,408,980,582),(368,586,812,621),(360,634,568,716),(44,550,102,608),(1818,550,1876,608),(884,961,1035,969)]:
        box=(x,y-160,r,b-160)
        hero.paste(raw_hero.crop(box),box[:2])
    hero.save(output/'home-hero-exact-background.png')
    css.append('.hero[data-slide="0"]{outline:0;background-image:url("assets/psd/home-hero-exact-background.png")}')
    css += [
        '.metric-grid>div{border:0}',
        '.metric-grid strong{left:0;top:16px;transform:none;width:200px;min-width:0;justify-content:center}',
        '.metric-grid strong[data-counter-state="complete"] .metric-value,.metric-grid>div:nth-child(n+3) .metric-value{opacity:0!important}',
    ]
    for i,(number,label) in enumerate([(182,183),(187,188),(193,192),(198,197),(203,202),(208,207)]):
        x=360+200*i
        l=layers[number]
        css.append(f'.metric-grid>div:nth-child({i+1}) strong:after{{inset:auto;left:{l.left-x}px;top:0;width:{l.width}px;height:{l.height}px;background-position:left top}}')
        l=layers[label]
        css.append(f'.metric-grid>div:nth-child({i+1})>span{{left:{l.left-x}px;right:auto;width:{l.width}px;background-position:left top}}')
        if i<5:
            l=layers[210+i]
            artwork(f'.metric-grid>div:nth-child({i+1}):after',f'metric-rule-{i}',l.bbox,(x,1029))
    css.append('}')
    # The background includes the saved compositor's colors. Remove foreground
    # ink before placing the machine and the original controls independently.
    group=layers[275]
    base_ids={279,929,931,932,933}
    for child in group:child.visible=child.layer_id in base_ids
    viewport=(0,1158,1920,2404)
    base=group.composite(viewport=viewport,force=True).convert('RGB')
    for child in group:child.visible=child.layer_id in base_ids|{283}
    device_base=group.composite(viewport=viewport,force=True).convert('RGB')
    exact=saved.crop(viewport)
    device=layers[283]
    alpha=device.topil().convert('RGBA').getchannel('A').point(lambda value:255 if value else 0)
    box=(device.left,device.top-1158,device.right,device.bottom-1158)
    patch=exact.crop(box)
    patch.paste(base.crop(box),(0,0),alpha)
    exact.paste(patch,box[:2])
    machine=saved.crop(device.bbox).convert('RGBA')
    # A line is a separate control state, so never bake it into the device.
    line_box=(352,1546,608,1881)
    overlap=(max(line_box[0],device.left),max(line_box[1],device.top),min(line_box[2],device.right),min(line_box[3],device.bottom))
    patch=device_base.crop((overlap[0],overlap[1]-1158,overlap[2],overlap[3]-1158))
    machine.paste(patch,(overlap[0]-device.left,overlap[1]-device.top))
    machine.putalpha(alpha)
    machine.save(output/'machine-exact.png')
    foreground=[layers[294].bbox,(122,1446,453,1687),line_box,(858,2262,1026,2344)]
    for ident in [236,241,246,251,256]:foreground.append(bounds[ident])
    for ident in [595,599,603]:
        l=layers[ident];foreground.append((l.left-10,l.top-10,l.right+10,l.bottom+10))
    for x,y,r,b in foreground:
        box=(x,y-1158,r,b-1158)
        exact.paste(base.crop(box),box[:2])
    exact.save(output/'home-products-exact-background.png')
    css += ['@media(min-width:1600px){',
        'body[data-page="home"] .products{background-image:url("assets/psd/home-products-exact-background.png")}',
        '.unit-card[data-unit-index="0"]{background:none;border-radius:0;backdrop-filter:none}',
        '.machine-stage:has(.unit-card[data-unit-index="0"]) .connector path{stroke:transparent}',
        '.machine{filter:none}',
        '.hotspot,.hotspot[aria-pressed="true"]{border:0;border-radius:0;background-color:transparent;background-repeat:no-repeat;transform:none;box-shadow:none}',
        '.hotspot:before{display:none}',
        '.hotspot:hover,.hotspot:focus-visible{transform:none;outline:2px solid var(--gold);outline-offset:3px}',
        'body[data-page="home"] .products>.more{position:absolute;left:calc(50% - 91px);top:1114px;margin:0;width:145px;height:54px;color:transparent;border:0;border-radius:0;background:none;box-shadow:none;overflow:visible}',
        'body[data-page="home"] .products>.more:after{display:none}',
    ]
    artwork('.unit-card[data-unit-index="0"]:before','home-unit-panel',(122,1446,453,1687),(130,1454))
    artwork('.machine-stage:has(.unit-card[data-unit-index="0"]):has(.machine[data-motion-state="complete"]):after','home-default-connector',line_box,(160,1369))
    css[-1]=css[-1][:-1]+';z-index:1}'
    artwork('body[data-page="home"] .products>.more:before','home-product-link',(858,2262,1026,2344),(869,2272))
    for i,ident in enumerate([236,256,241,251,246]):
        crop(f'home-hotspot-{i}',bounds[ident])
        css.append(f'.hotspot[data-unit="{i}"]{{background-image:url("assets/psd/home-hotspot-{i}.png")}}')
    css.append('}')
    # Application icons remain individual buttons, with source text and graphics.
    applications=saved.crop((0,2404,1920,2950))
    raw=Image.open(output/'background-home-applications.png').convert('RGB')
    for box in [(600,2483,1320,2614)]+[bounds[i] for i in [939,944,952,958,964,970,971,972,973,974]]:
        x,y,r,b=box;relative=(x,y-2404,r,b-2404)
        applications.paste(raw.crop(relative),relative[:2])
    applications.save(output/'home-applications-exact-background.png')
    # Keep the card border separate from editable/semantic copy and its photo.
    frame_box=(352,3205,1567,3726)
    frame=saved.crop(frame_box)
    for x,y,r,b in [(398,3244,752,3296),bounds[443],bounds[444],bounds[783],(1043,3346,1522,3663)]:
        frame.paste('white',(x-frame_box[0],y-frame_box[1],r-frame_box[0],b-frame_box[1]))
    frame.save(output/'home-about-card-frame.png')
    about=saved.crop((0,2950,1920,3884))
    raw=Image.new('RGB',about.size,saved.getpixel((10,3500)))
    raw.paste(Image.open(output/'home-about-background.png').convert('RGB'),(0,0))
    for x,y,r,b in [bounds[441],frame_box,(875,3765,1044,3843)]:
        box=(x,y-2950,r,b-2950)
        about.paste(raw.crop(box),box[:2])
    about.save(output/'home-about-exact-background.png')
    css += ['@media(min-width:1600px){',
        'body[data-page="home"] .news{position:relative;background:#fff url("assets/psd/home-news-leading-edge.png") center top / auto 1px no-repeat}',
        'body[data-page="home"] .applications{background-image:url("assets/psd/home-applications-exact-background.png")}',
        'body[data-page="home"] .about{background:#f8f8f8 url("assets/psd/home-about-exact-background.png") center top / auto 934px no-repeat}',
        'body[data-page="home"] .about:before{display:none}',
        'body[data-page="home"] .about-card{background:none;border-radius:0}',
        'body[data-page="home"] .about-card:before{content:"";position:absolute;left:-8px;top:-6px;width:1215px;height:521px;background:url("assets/psd/home-about-card-frame.png") no-repeat;pointer-events:none;z-index:0}',
        'body[data-page="home"] .about>.container>.more,body[data-page="home"] .news>.container>.more{position:absolute;padding:0;min-width:0;min-height:0;margin:0;top:827px;left:calc(50% - 73px);width:145px;height:54px;background:none;color:transparent;border:0;border-radius:0;box-shadow:none;overflow:visible}',
        'body[data-page="home"] .about>.container>.more:after,body[data-page="home"] .news>.container>.more:after{display:none}',
        'body[data-page="home"] .news>.container>.more{top:731px;left:calc(50% - 72px);width:144px}',
    ]
    artwork('body[data-page="home"] .about>.container>.more:before','home-about-link',(875,3765,1044,3843),(887,3777))
    crop('home-news-leading-edge',(0,3884,1920,3885))
    artwork('body[data-page="home"] .news>.container>.more:before','home-news-link',(876,4603,1044,4693),(888,4615))
    css.append('body[data-page="home"] .news article[data-news-art]{border:0;padding:1px;border-radius:0;overflow:visible;background-repeat:no-repeat}')
    for i,(x,ids) in enumerate([(359,[486,487,488,491]),(767,[498,499,500,984]),(1175,[510,511,512,989])]):
        frame=saved.crop((x,4143,x+386,4567))
        frame.paste('white',(1,1,385,183))
        for ident in ids:
            l,t,r,b=bounds[ident]
            frame.paste('white',(l-x,t-4143,r-x,b-4143))
        frame.save(output/f'home-news-frame-{i}.png')
        css.append(f'body[data-page="home"] .news article[data-news-art]:nth-child({i+1}){{background-image:url("assets/psd/home-news-frame-{i}.png")}}')
    css.append('}')
    target=root/'psd-art.css'
    target.write_text(target.read_text().split(MARKER)[0].rstrip()+'\n'+'\n'.join(css)+'\n')

if __name__=='__main__':
    root=Path(__file__).resolve().parent.parent
    export_home(root,root/'assets/psd')
