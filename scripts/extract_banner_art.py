"""Recover exact saved banner backgrounds while keeping copy as separate artwork."""
from pathlib import Path
from PIL import Image, ImageChops
from psd_tools import PSDImage

MARKER = '/* Generated precise banner backgrounds. */'
COMPONENT_MARKER = '/* Generated exact component positions. */'

def export_components(root, output):
    css = [COMPONENT_MARKER, '@media(min-width:1280px){']
    pages = [
        ('home','demo',5052,[(294,'.products',1158),(441,'.about',2950),(480,'.news',3884)]),
        ('about','aboutv001',3460,[(1954,'main>.soft-section',1082),(1991,'.core-advantages',1892),(3709,'.mission',2537)]),
        ('product','product001',3919,[(1884,'#core-units',460),(1954,'#advantages',1176),(1991,'#working-mode',2086)]),
        ('process','gy001',3352,[(1884,'main>.soft-section:nth-child(2)',560),(1954,'.team-section',1282),(1991,'.certificates',2190)]),
        ('service','service001',4126,[(1884,'main>.soft-section:nth-child(2)',460),(1954,'.implementation-section',1181),(1991,'.faq-section',2646),(3709,'.downloads-section',3323)]),
        ('news','news',2008,[]),('news-detail','new_detail001',2058,[]),('contact','contact001',2283,[]),
    ]
    for page, name, foot, headings in pages:
        psd = PSDImage.open(root / 'resource/v02' / f'{name}.psd')
        layers = {layer.layer_id: layer for layer in psd.descendants()}
        pixels = psd.topil().convert('RGB')
        # Some saved designs contain a visible merged logo with an empty source
        # layer. Read its real ink bounds from the otherwise blank first column.
        region = pixels.crop((350,foot+30,600,foot+300))
        bounds = ImageChops.difference(region,Image.new('RGB',region.size,'white')).getbbox()
        if bounds is None:
            raise ValueError(f'Missing saved footer logo: {name}')
        region.crop(bounds).save(output / f'{name}-footer-logo.png')
        x,y,r,b = bounds
        css.append(f'body[data-page="{page}"] .footer-brand{{left:{x-10}px;top:{y-41}px;width:{r-x}px;height:{b-y}px;background:url("assets/psd/{name}-footer-logo.png") no-repeat}}')
        css.append(f'body[data-page="{page}"] .footer-brand img{{opacity:0!important}}')
        for ident, column, left in [(571,2,720),(576,3,953),(581,4,1393)]:
            layer = layers[ident]
            pixels.crop(layer.bbox).save(output / f'{name}-footer-rule-{ident}.png')
            css.append(f'body[data-page="{page}"] .footer-grid>div:nth-child({column}) h3:after{{position:absolute;left:{layer.left-left}px;top:{layer.top-foot-71}px;width:{layer.width}px;height:{layer.height}px;margin:0;background:url("assets/psd/{name}-footer-rule-{ident}.png") no-repeat}}')
        for ident, selector, top in headings:
            layer = layers[ident]
            css.append(f'body[data-page="{page}"] {selector} .section-title:after{{left:calc(50% + {layer.left-960}px);right:auto;top:{layer.top-top}px;width:{layer.width}px;height:{layer.height}px;transform:none;background-position:left top;background-size:{layer.width}px {layer.height}px}}')
    css.append('}')
    target = root / 'psd-art.css'
    previous = target.read_text().split(COMPONENT_MARKER)[0].rstrip()
    target.write_text(previous + '\n' + '\n'.join(css) + '\n')

def export_banners(root, output):
    base = Image.open(output / 'banner-background.png').convert('RGB')
    css = [MARKER, '@media(min-width:1280px){']
    for page, name in [('about','aboutv001'),('product','product001'),('process','gy001'),('service','service001'),('news','news'),('news-detail','new_detail001'),('contact','contact001')]:
        psd = PSDImage.open(root / 'resource/v02' / f'{name}.psd')
        layers = {layer.layer_id: layer for layer in psd.descendants()}
        pixels = psd.topil()
        top = 260 if page == 'process' else 160
        background = pixels.crop((0,top,1920,top+300)).convert('RGB')
        foreground = [1862,1863,1865] + ([3334,3335] if page == 'product' else [])
        for ident in foreground:
            layer = layers[ident]
            box = (layer.left,layer.top-top,layer.right,layer.bottom-top)
            background.paste(base.crop(box), box[:2])
        background.save(output / f'{name}-banner-background.png')
        css.append(f'body[data-page="{page}"] .page-banner{{background-image:url("assets/psd/{name}-banner-background.png")}}')
        layer = layers[1863]
        pixels.crop(layer.bbox).save(output / f'{name}-banner-heading.png')
        css.append(f'body[data-page="{page}"] .page-banner h1{{height:{layer.height}px;background-image:url("assets/psd/{name}-banner-heading.png");background-size:{layer.width}px {layer.height}px}}')
    css.append('}')
    target = root / 'psd-art.css'
    previous = target.read_text().split(MARKER)[0].rstrip()
    target.write_text(previous + '\n' + '\n'.join(css) + '\n')

if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    export_banners(root, root / 'assets/psd')
    export_components(root, root / 'assets/psd')
