"""Exact source borders and artwork around native contact form controls."""
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

MARKER='/* Generated contact component artwork. */'

def export_contact(root, output):
    psd=PSDImage.open(root/'resource/v02/contact001.psd')
    layers={layer.layer_id:layer for layer in psd.descendants()}
    pixels=psd.topil().convert('RGB')
    def crop(name,box):pixels.crop(box).save(output/f'{name}.png')
    crop('contact-photo-exact',(359,537,959,1089))
    frame_box=(350,529,1574,1097)
    frame=pixels.crop(frame_box)
    for x,y,r,b in [(359,537,959,1089),(1000,588,1491,1039)]:frame.paste('white',(x-350,y-529,r-350,b-529))
    frame.save(output/'contact-card-frame.png')
    crop('contact-form-heading',(650,1176,1270,1249))
    crop('contact-form-leading-edge',(0,1136,1920,1137))
    css=[MARKER,'@media(min-width:1280px){',
         '.contact-card{border:0;border-radius:0;overflow:visible;background:none}',
         '.contact-card:before{content:"";position:absolute;left:-10px;top:-8px;width:1224px;height:568px;background:url("assets/psd/contact-card-frame.png") no-repeat;pointer-events:none;z-index:0}',
         '.contact-visual{left:-1px;top:0;height:552px;overflow:visible}',
         '.contact-visual img{border-radius:0;mask-image:none;object-fit:fill}',
         '.contact-info{left:641px;top:45px}',
         '.form-heading{position:relative}',
         '.consultation-section{background:#f8f8f8 url("assets/psd/contact-form-leading-edge.png") center top no-repeat}',
         '.form-heading>h2,.form-heading>p{opacity:0!important}',
         '.form-heading:before{content:"";position:absolute;left:290px;top:0;width:620px;height:73px;background:url("assets/psd/contact-form-heading.png") no-repeat;pointer-events:none}',
         '.consultation-form .form-field :is(input,textarea){border:0;border-radius:0;box-shadow:none;font-size:16px;line-height:24px;padding-left:22px;padding-right:22px;background-repeat:no-repeat}',
         '.consultation-form .form-field textarea{resize:none;padding-top:21px}',
         '.consultation-form .form-field :is(input,textarea):focus{box-shadow:0 0 0 2px #00b6cc40}',
    ]
    # Preserve separate frames and placeholder art so typed values remain native.
    fields=[(4267,4319,-1),(4315,4320,0),(4325,4326,-1),(4330,4320,0),(4336,4337,-1)]
    first_frame=None
    for i,(shape,placeholder,left) in enumerate(fields,1):
        layer=layers[shape];box=layer.bbox
        frame=pixels.crop(box)
        # The email source repeats the company placeholder at its own y.
        text=layers[4331 if shape==4330 else placeholder]
        frame.paste('white',(text.left-layer.left,text.top-layer.top,text.right-layer.left,text.bottom-layer.top))
        frame.save(output/f'contact-field-frame-{i}.png')
        if i==1:first_frame=frame.copy()
        selector=f'.consultation-form>.form-field:nth-child({i}) '+('textarea' if i==5 else 'input')
        css.append(f'{selector}{{position:relative;left:{left}px;width:{layer.width}px;height:{layer.height}px;background-image:url("assets/psd/contact-field-frame-{i}.png");background-color:white}}')
        css.append(f'{selector}:placeholder-shown{{background-image:url("assets/psd/form-copy-{placeholder}.png"),url("assets/psd/contact-field-frame-{i}.png");background-position:22px 24px,0 0;background-repeat:no-repeat}}')
    first_frame.save(output/'contact-verification-frame.png')
    crop('contact-verification-original',(801,1845,911,1908))
    crop('contact-submit-control',(1123,1821,1584,1932))
    css += [
        '.consultation-form .verification-row{position:relative;left:-1px;display:block;width:553px;height:63px;background:url("assets/psd/contact-verification-frame.png") no-repeat}',
        '.consultation-form .verification-row input{position:absolute;left:0;top:0;width:443px;height:63px;background:none}',
        '.consultation-form .verification-row input:placeholder-shown{background:transparent url("assets/psd/form-copy-4346.png") 22px 24px no-repeat}',
        '.consultation-form .verification-code{position:absolute;left:443px;top:0;width:110px;height:63px;padding:0;border:0;border-radius:0}',
        '.consultation-form .verification-code:not([data-refreshed]){color:transparent;background:transparent url("assets/psd/contact-verification-original.png") no-repeat}',
        '.consultation-form .verification-code[data-refreshed]{color:#517e89;background:none}',
        '.consultation-form .form-submit .button{background:none;overflow:visible;box-shadow:none}',
        '.consultation-form .form-submit .button:before{content:"";position:absolute;inset:auto;left:-24px;top:-24px;width:461px;height:111px;transform:none;z-index:auto;background:url("assets/psd/contact-submit-control.png") no-repeat;pointer-events:none}',
        '.consultation-form .form-submit .button:after{display:none}',
        '}',
    ]
    target=root/'psd-art.css'
    target.write_text(target.read_text().split(MARKER)[0].rstrip()+'\n'+'\n'.join(css)+'\n')

if __name__=='__main__':
    root=Path(__file__).resolve().parent.parent
    export_contact(root,root/'assets/psd')
