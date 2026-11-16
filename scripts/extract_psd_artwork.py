"""Export artwork used for PSD-accurate desktop rendering.

Requires psd-tools and Pillow; source designs are local and not distributed.
"""
from pathlib import Path
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'psd'
OUT.mkdir(parents=True, exist_ok=True)
SELECTIONS = {
    'demo': [(16,'nav-home'),(17,'nav-product'),(18,'nav-process'),(19,'nav-service'),(20,'nav-about'),(21,'nav-news'),(22,'nav-contact'),(25,'nav-arrow'),(447,'home-factory'),(41,'home-hero-title'),(291,'title-home-product'),(320,'title-home-applications'),(438,'title-home-about'),(477,'title-home-news')],
    'product001': [(1891,'unit-gauge'),(1921,'unit-mix'),(1941,'unit-analysis'),(1942,'unit-control'),(2886,'adv-calibration'),(2244,'adv-batch'),(2266,'adv-precision'),(2330,'adv-statistics'),(2331,'adv-maintenance'),(2332,'adv-modular'),(1863,'banner-product'),(1881,'title-product-core'),(1951,'title-product-advantages'),(1988,'title-product-flow'),(2341,'title-product-parameters')],
    'gy001': [(2963,'stage-presale'),(3048,'stage-sales'),(3050,'stage-aftersale'),(3051,'stage-value'),(3342,'certificate-left'),(3340,'certificate-right'),(1863,'banner-process'),(1881,'title-process-system'),(1951,'title-process-team'),(1988,'title-process-compliance')],
    'service001': [(1863,'banner-service'),(1881,'title-service-system'),(1951,'title-service-project'),(1988,'title-service-faq'),(3706,'title-service-downloads')],
    'aboutv001': [(3878,'location-factory'),(3880,'location-lab'),(4168,'about-adv-1'),(4167,'about-adv-2'),(4169,'about-adv-3'),(4170,'about-adv-4'),(1863,'banner-about'),(1951,'title-about-locations'),(1988,'title-about-advantages'),(3706,'title-about-mission')],
    'news': [(1863,'banner-news')],
    'contact001': [(4297,'contact-company'),(4296,'contact-phone'),(4295,'contact-email'),(4300,'contact-web'),(4299,'contact-center'),(4298,'contact-factory'),(1863,'banner-contact')],
}
for name, selections in SELECTIONS.items():
    psd = PSDImage.open(ROOT / 'resource' / 'v02' / f'{name}.psd')
    layers = {layer.layer_id: layer for layer in psd.descendants()}
    merged = psd.topil()
    for ident, filename in selections:
        layer = layers[ident]
        artwork = layer.composite() if layer.is_group() else layer.topil()
        if layer.kind == 'type' and filename != 'home-hero-title':
            artwork = merged.crop(layer.bbox)
        if artwork is None:
            raise ValueError(f'No rendered pixels for {name}:{ident}')
        artwork.save(OUT / f'{filename}.png')

    exports = []
    if name == 'demo':
        exports = [(275,{279,929,933,931,932},(0,1158,1920,2404),'home-product-background'),(428,{454,429},(0,2950,1920,3418),'home-about-background'),(563,{533,535},(0,4756,1920,5052),'solution-background')]
    elif name == 'contact001':
        exports = [(169,{4305,4268},(359,537,959,1089),'contact-visual')]
    elif name == 'product001':
        exports = [(1903,{35,1869},(0,160,1920,460),'banner-background'),(169,{1906,3110},(0,460,1920,1176),'product-network')]
    for group_id, selected, viewport, filename in exports:
        group = layers[group_id]
        states = [(child, child.visible) for child in group]
        for child, _ in states:
            child.visible = child.layer_id in selected
        artwork = group.composite(viewport=viewport, force=True)
        artwork.convert('RGB').save(OUT / f'{filename}.webp', quality=95)
        artwork.convert('RGB').save(OUT / f'{filename}.png')
        for child, visible in states:
            child.visible = visible
