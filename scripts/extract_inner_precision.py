"""Saved source backgrounds and borders, independent of semantic foregrounds."""
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

MARKER='/* Generated inner component artwork. */'

def export_inner(root, output):
    css=[MARKER,'@media(min-width:1280px){']
    def source(name):
        p=PSDImage.open(root/f'resource/v02/{name}.psd')
        return p.topil().convert('RGB'),{l.layer_id:l for l in p.descendants()}
    def crop(p,name,box):
        p.crop(box).save(output/f'{name}.png')
    def edge(p,name,selector,top,height,bottom=False):
        crop(p,name,(0,top,1920,top+height))
        css.append(f'{selector}{{position:relative}}')
        css.append(f'{selector}:{"after" if bottom else "before"}{{content:"";position:absolute;left:calc(50% - 50vw);{"bottom" if bottom else "top"}:0;width:100vw;height:{height}px;background:url("assets/psd/{name}.png") center top no-repeat;pointer-events:none}}')
    p,d=source('aboutv001')
    edge(p,'about-locations-edge','body[data-page="about"] main>.soft-section',1082,2)
    edge(p,'about-mission-edge','body[data-page="about"] .mission',3159,3,True)
    edge(p,'about-mission-leading-edge','body[data-page="about"] .mission',2537,2)
    # Store only the border/shadow; native icon and copy elements stay separate.
    for i,(box,clear,origin) in enumerate([
        ((349,1338,938,1575),[(392,1417,461,1483),(502,1417,854,1498)],(361,1350)),
        ((349,1589,938,1825),[(404,1667,458,1733),(501,1655,853,1759)],(361,1600))]):
        frame=p.crop(box)
        for x,y,r,b in clear:frame.paste('white',(x-box[0],y-box[1],r-box[0],b-box[1]))
        frame.save(output/f'location-frame-{i}.png')
        css.append(f'.location-cards article:nth-child({i+1}):before{{content:"";position:absolute;left:{box[0]-origin[0]}px;top:{box[1]-origin[1]}px;width:{box[2]-box[0]}px;height:{box[3]-box[1]}px;background:url("assets/psd/location-frame-{i}.png") no-repeat;pointer-events:none}}')
    css.append('.location-cards article{background:none;border-color:transparent;border-radius:0;box-shadow:none}')
    bg=p.crop((0,1892,1920,2537))
    # Foreground bounds are overwritten with the isolated background, then
    # restored by their own individual opaque source artwork at runtime.
    group=d[2028]
    bounds={ident:d[ident].bbox for ident in [1991,4168,4167,4169,4170]}
    for child in group:child.visible=child.layer_id in {1979,3989}
    raw=group.composite(viewport=(0,1892,1920,2537),force=True).convert('RGB')
    for ident in [1991,4168,4167,4169,4170]:
        x,y,r,b=bounds[ident];box=(x,y-1892,r,b-1892)
        bg.paste(raw.crop(box),box[:2])
        if ident!=1991:crop(p,f'about-adv-exact-{ident}',bounds[ident])
    bg.save(output/'about-advantages-exact-background.png')
    css.append('.core-advantages{background-image:url("assets/psd/about-advantages-exact-background.png");background-size:auto 645px}')
    for i,ident in enumerate([4168,4167,4169,4170]):
        css.append(f'.four-cards article:nth-child({i+1}){{background:url("assets/psd/about-adv-exact-{ident}.png") no-repeat}}')
    css.append('.four-cards img{opacity:0}')

    p,d=source('gy001')
    edge(p,'process-team-leading-edge','.team-section',1282,1)
    edge(p,'process-team-trailing-edge','.team-section',2137,53,True)
    css += ['.certificate-grid{position:relative;left:-1px}',
            '.certificate-grid h3{margin-bottom:28px}',
            '.certificate-placeholder{width:353px;height:453px;border:0;background-color:transparent;background-repeat:no-repeat}']
    for i,ident in enumerate([3363,3365,3370]):
        x,y,r,b=d[ident].bbox
        crop(p,f'certificate-frame-{i}',(x,y,r+1,b))
        css.append(f'.certificate-grid article:nth-child({i+1}) .certificate-placeholder{{background-image:url("assets/psd/certificate-frame-{i}.png")}}')

    p,d=source('service001')
    edge(p,'service-faq-leading-edge','.faq-section',2646,2)
    edge(p,'service-downloads-leading-edge','.downloads-section',3323,2)

    p,d=source('new_detail001')
    box=(348,527,1571,1573);frame=p.crop(box)
    for ident in [3998,4128,4130,4131]:
        x,y,r,b=d[ident].bbox;frame.paste('white',(x-box[0],y-box[1],r-box[0],b-box[1]))
    frame.save(output/'article-paper-frame.png')
    crop(p,'article-heading-rule',d[4128].bbox)
    css += ['.article-paper[data-psd-article]{border-color:transparent;border-radius:0;background:none}',
            '.article-paper[data-psd-article]:before{inset:auto;left:-13px;top:-11px;width:1223px;height:1046px;background:url("assets/psd/article-paper-frame.png") no-repeat;pointer-events:none}',
            '.article-paper[data-psd-article]:after{content:"";position:absolute;left:37px;top:169px;width:1124px;height:4px;background:url("assets/psd/article-heading-rule.png") no-repeat;pointer-events:none}',
            '.article-navigation a:last-child{left:-3px}']

    p,d=source('news')
    css += ['.news-list-section article[data-news-art]{position:relative;border-color:transparent;border-radius:0;background:none;overflow:visible}',
            '.news-list-section article[data-news-art]>.news-card-link{position:relative;z-index:1}',
            '.news-list-section article[data-news-art] .read-more{background-position:left top}',
            '.news-list-section article[data-news-art]:nth-child(3n+2) .read-more,.news-list-section article[data-news-art]:nth-child(3n) .read-more{left:26px}']
    for i,(x,y,ids) in enumerate([
        (359,658,[4005,4006,4007,4011]),(767,658,[4020,4021,4022,4028]),(1175,658,[4037,4038,4039,4044]),
        (359,1120,[4057,4058,4059,4063]),(767,1120,[4072,4073,4074,4080]),(1175,1120,[4089,4090,4091,4096])]):
        box=(x-10,y-11,x+396,y+434);frame=p.crop(box)
        for x1,y1,r,b in [(x+1,y+1,x+385,y+183)]+[d[v].bbox for v in ids]:
            frame.paste('white',(x1-box[0],y1-box[1],r-box[0],b-box[1]))
        frame.save(output/f'news-list-frame-{i}.png')
        css.append(f'.news-list-section article[data-news-art]:nth-child({i+1}):before{{content:"";position:absolute;left:-11px;top:-12px;width:406px;height:445px;background:url("assets/psd/news-list-frame-{i}.png") no-repeat;pointer-events:none}}')
    p,d=source('product001')
    # Native card content keeps its layout, while the saved border is separate.
    core_bounds={v:d[v].bbox for v in [1884,1908,1919,1931,1939]}
    core_bg=p.crop((0,460,1920,1176))
    raw=Image.open(output/'product-network.png').convert('RGB')
    for i,(ident,x,y,tile) in enumerate([(1908,360,696,1890),(1919,974,696,1914),(1931,360,912,1926),(1939,974,912,1934)]):
        box=(x-30,y-30,x+616,y+212);frame=p.crop(box)
        clear=[d[tile].bbox]+[l.bbox for l in d[ident].descendants() if l.kind=='type' and l.visible]
        for x1,y1,r,b in clear:frame.paste('white',(x1-box[0],y1-box[1],r-box[0],b-box[1]))
        frame.save(output/f'core-unit-frame-{i}.png')
        css.append(f'.core-unit:nth-child({i+1}):before{{content:"";position:absolute;left:-31px;top:-31px;width:646px;height:242px;background:url("assets/psd/core-unit-frame-{i}.png") no-repeat;pointer-events:none}}')
        relative=(box[0],box[1]-460,box[2],box[3]-460)
        core_bg.paste(raw.crop(relative),relative[:2])
        crop(p,f'core-unit-tile-{i}',d[tile].bbox)
        css.append(f'.core-unit:nth-child({i+1}) .icon-tile{{background:url("assets/psd/core-unit-tile-{i}.png") no-repeat;border-radius:0}}')
    x,y,r,b=core_bounds[1884];core_bg.paste(raw.crop((x,y-460,r,b-460)),(x,y-460))
    core_bg.save(output/'product-core-exact-background.png')
    css += ['.network-section{background-image:url("assets/psd/product-core-exact-background.png")}',
            '.core-unit,.core-unit:first-child{background:none;border-color:transparent;border-radius:0;box-shadow:none}',
            '.core-unit>.icon-tile,.core-unit>div:last-child{z-index:1}',
            '.core-unit .unit-icon{opacity:0}']
    css += ['.advantage-grid article{border-color:transparent;border-radius:0;overflow:visible}',
            '.advantage-grid h3{background:none}']
    for i,(ident,x,y,icon,label,copy_box) in enumerate([
        (2885,360,1412,2886,2874,(380,1510,722,1662)),
        (2243,770,1412,2244,2224,(792,1510,1132,1662)),
        (2261,1179,1412,2266,2250,(1202,1510,1540,1662)),
        (2291,360,1723,2330,2272,(380,1822,722,1880)),
        (2308,770,1723,2331,2297,(792,1822,1132,1880)),
        (2329,1179,1723,2332,2314,(1202,1822,1540,1880))]):
        l=d[ident];box=(l.left-10,l.top-10,l.right+10,l.bottom+10);frame=p.crop(box)
        for x1,y1,r,b in [d[icon].bbox,d[label].bbox,copy_box]:
            # Header icons/text sit on cyan, the body sits on white.
            patch=Image.new('RGB',(r-x1,b-y1),'white')
            if y1<y+80:patch=Image.new('RGB',patch.size,p.getpixel((l.left+180,l.top+20)))
            frame.paste(patch,(x1-box[0],y1-box[1]))
        frame.save(output/f'product-advantage-frame-{i}.png')
        css.append(f'.advantage-grid article:nth-child({i+1}):before{{content:"";position:absolute;left:{box[0]-x-1}px;top:{box[1]-y-1}px;width:{box[2]-box[0]}px;height:{box[3]-box[1]}px;background:url("assets/psd/product-advantage-frame-{i}.png") no-repeat;pointer-events:none}}')
        l=d[icon];crop(p,f'product-advantage-icon-{i}',l.bbox)
        css.append(f'.advantage-grid article:nth-child({i+1}) h3{{background:transparent url("assets/psd/product-advantage-icon-{i}.png") {l.left-x-1}px {l.top-y-1}px no-repeat}}')
    css.append('.advantage-grid .adv-icon{opacity:0}')
    edge(p,'product-flow-leading-edge','#working-mode',2086,1)
    edge(p,'product-flow-trailing-edge','#working-mode',2528,2,True)
    css += ['.work-flow:before{left:133px;right:auto;top:28px;width:958px;height:2px;background:url("assets/psd/product-workflow-line.png") no-repeat}',
            '.work-flow>li>span,.work-flow>li:nth-child(2)>span{border:0;border-radius:0;background:none;box-shadow:none;translate:none}',
            '.work-flow>li>span:after{inset:auto;left:-13px;top:-13px;width:81px;height:81px;background-position:0 0}',
            '.work-flow>li:hover>span:after,.work-flow>li:focus-visible>span:after{filter:brightness(.96)}']
    crop(p,'product-workflow-line',d[2082].bbox)
    for i,ident in enumerate([2031,2084,2052,2060,2068,2076]):
        l=d[ident];box=(l.left-10,l.top-10,l.right+10,l.bottom+10)
        crop(p,f'product-workflow-badge-{i}',box)
        css.append(f'.work-flow>li:nth-child({i+1})>span:after{{top:{box[1]-2326}px;background-image:url("assets/psd/product-workflow-badge-{i}.png")}}')
        crop(p,f'product-workflow-copy-{i}',(397+202*i,2402,513+202*i,2451))
        css.append(f'.work-flow>li:nth-child({i+1}):after{{background-image:url("assets/psd/product-workflow-copy-{i}.png")}}')
    for i,ident in enumerate([2491,2504,2509,2514,2520,2561,2578,2593,2599,2604,2609,2614,2620,2625,2631,2637]):
        l=d[ident];frame=p.crop(l.bbox);frame.paste('white',(6,6,l.width-6,l.height-6));frame.save(output/f'parameter-frame-{i}.png')
        css.append(f'.parameter-grid>div:nth-child({i+1}):after{{content:"";position:absolute;left:-2px;top:-2px;width:{l.width}px;height:{l.height}px;background:url("assets/psd/parameter-frame-{i}.png") no-repeat;pointer-events:none;z-index:-1}}')
    css.append('.parameter-grid>div{isolation:isolate;border-color:transparent;border-radius:0;background:none}')
    app=p.crop((0,3393,1920,3621));raw=Image.open(output/'background-product-applications.png').convert('RGB')
    for ident in [2649,2658,2667,2675,2683,2691]:
        l=d[ident];box=(l.left,l.top-3393,l.right,l.bottom-3393);app.paste(raw.crop(box),box[:2])
        if ident!=2649:
            crop(p,f'product-application-{ident}',l.bbox)
    app.save(output/'product-applications-exact-background.png')
    css += ['.application-strip{background-image:url("assets/psd/product-applications-exact-background.png")}',
            '.application-strip .eyebrow{position:relative;left:-.5px}']
    for i,ident in enumerate([2658,2667,2675,2683,2691]):
        css.append(f'.application-strip li:nth-child({i+1}) a{{background-image:url("assets/psd/product-application-{ident}.png")}}')

    p,d=source('service001')
    bg=p.crop((0,1181,1920,2646));raw=Image.open(output/'background-service-project.png').convert('RGB')
    clear=[d[1954].bbox,(941,1416,978,2380)]
    for i,(x,y,h,cx,cy,ch) in enumerate([
        (998,1416,173,1027,1440,125),(360,1623,173,389,1647,125),
        (998,1830,219,1027,1854,171),(360,2083,226,389,2107,178),
        (998,2343,226,1027,2367,178)]):
        box=(x-30,y-30,x+594,y+h+30);frame=p.crop(box)
        frame.paste('white',(cx-box[0],cy-box[1],cx+509-box[0],cy+ch-box[1]))
        frame.save(output/f'timeline-frame-{i}.png')
        clear.append(box)
        css.append(f'.project-timeline>li:nth-child({i+1}) article:before{{content:"";position:absolute;left:-31px;top:-31px;width:624px;height:{h+60}px;background:url("assets/psd/timeline-frame-{i}.png") no-repeat;pointer-events:none}}')
    for x,y,r,b in clear:
        box=(x,y-1181,r,b-1181);bg.paste(raw.crop(box),box[:2])
    bg.save(output/'service-project-exact-background.png')
    crop(p,'service-timeline-connector',(941,1416,978,2380))
    css += ['.implementation-section{background-image:url("assets/psd/service-project-exact-background.png")}',
            '.project-timeline article,.project-timeline li:first-child article{border-color:transparent;border-radius:0;box-shadow:none;background:none}',
            '.project-timeline:before{left:581px;top:0;bottom:auto;width:37px;height:964px;background:url("assets/psd/service-timeline-connector.png") no-repeat}',
            '.timeline-dot{opacity:0}',
            '.faq-item>summary{position:relative;z-index:1;background-position:22px 23px}',
            '.faq-item:nth-child(4)>summary{background-position:22px 24px}',
            '.faq-item:nth-child(4) .faq-answer:before{top:6px}']
    crop(p,'download-highlighted-frame',(946,3534,1588,3667))
    css.append('.download-row:nth-child(2):after{left:-24px;top:-26px;width:642px;height:133px;background-image:url("assets/psd/download-highlighted-frame.png")}')
    css.append('}')
    target=root/'psd-art.css'
    target.write_text(target.read_text().split(MARKER)[0].rstrip()+'\n'+'\n'.join(css)+'\n')

if __name__=='__main__':
    root=Path(__file__).resolve().parent.parent
    export_inner(root,root/'assets/psd')
