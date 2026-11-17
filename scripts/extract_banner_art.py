"""Recover exact saved banner backgrounds while keeping copy as separate artwork."""
from pathlib import Path
from PIL import Image, ImageChops
from psd_tools import PSDImage

MARKER = '/* Generated precise banner backgrounds. */'
COMPONENT_MARKER = '/* Generated exact component positions. */'

def export_components(root, output):
    css = [COMPONENT_MARKER, '@media(min-width:1280px){',
           '#main-nav .psd-nav-icon{opacity:0!important}',
           '#main-nav a:before{display:none!important}',
           '.top-actions{position:relative;left:1px}',
           '.top-actions .search-toggle{position:relative;top:.5px}']
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
        offset=100 if page=='process' else 0
        for key,box in [('navigation',(575,95+offset,1565,125+offset)),('search',(1399,21+offset,1418,40+offset)),('english',(1446,25+offset,1561,41+offset))]:
            pixels.crop(box).save(output/f'{name}-header-{key}.png')
        css.append(f'body[data-page="{page}"] .navigation:after{{left:215px;top:35px;width:990px;height:30px;background-image:url("assets/psd/{name}-header-navigation.png");background-size:990px 30px}}')
        css.append(f'body[data-page="{page}"] .top-actions .search-toggle{{background-image:url("assets/psd/{name}-header-search.png")}}')
        css.append(f'body[data-page="{page}"] .top-actions .english{{background-image:url("assets/psd/{name}-header-english.png")}}')
        # The saved CTA artwork overlaps the first footer rows by 1–2 pixels.
        pixels.crop((0,foot,1920,foot+4)).save(output / f'{name}-footer-edge.png')
        css.append(f'body[data-page="{page}"] footer{{background:#fff url("assets/psd/{name}-footer-edge.png") center top / auto 4px no-repeat}}')
        rule = layers[585]
        copyright_top = min(395,rule.top-foot)
        css.append(f'body[data-page="{page}"] .copyright{{top:{copyright_top}px;background-position:{rule.left-360}px {rule.top-foot-copyright_top}px}}')
        for ident, pseudo in [(586,'before'),(587,'after')]:
            css.append(f'body[data-page="{page}"] .copyright:{pseudo}{{top:{layers[ident].top-foot-copyright_top}px}}')
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
        cta=foot-298
        copy_box=layers[562].bbox
        control=layers[552]
        button_box=(control.left-10,control.top-10,control.right+10,control.bottom+10)
        pixels.crop(button_box).save(output/f'{name}-solution-control.png')
        css.append(f'body[data-page="{page}"] .solution .gold{{background:none;overflow:visible}}')
        css.append(f'body[data-page="{page}"] .solution .gold:before{{content:"";position:absolute;inset:auto;left:-10px;top:-10px;width:{control.width+20}px;height:{control.height+20}px;transform:none;z-index:0;background:url("assets/psd/{name}-solution-control.png") no-repeat;pointer-events:none}}')
        # Capture group bounds before changing visibility: hidden groups report
        # empty bounds, which would leave the original copy in the background.
        group=layers[563]
        for child in group:child.visible=child.layer_id in {533,535}
        base=group.composite(viewport=(0,cta,1920,foot),force=True).convert('RGB')
        exact=pixels.crop((0,cta,1920,foot))
        for x,y,r,b in [copy_box,button_box]:
            box=(x,y-cta,r,b-cta)
            exact.paste(base.crop(box),box[:2])
        exact.save(output/f'{name}-solution-background.png')
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
        if page == 'product':
            pixels.crop((1034,190,1445,420)).save(output / 'product-banner-device.png')
            css.append('body[data-page="product"] .banner-content:after{left:674px;top:30px;width:411px;height:230px;opacity:1;background-image:url("assets/psd/product-banner-device.png")}')
            css.append('body[data-page="product"] .banner-content>img{opacity:0!important}')
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
    from extract_home_precision import export_home
    export_home(root, root / 'assets/psd')
