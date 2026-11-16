import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
const pages = ['index','about','product','process','service','news','news-detail','contact'];
const scripts = ['app','common','home','pages','page-model','site-data','motion-core','entrance-registry'];
const files = [...pages.map(name=>`${name}.html`), ...scripts.map(name=>`${name}.js`), 'styles.css','motion.css','pages.css','precision.css'];
// Validate inputs before replacing the disposable build output.
await Promise.all([...files,'assets'].map(name=>stat(resolve(root,name))));
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await Promise.all([...files,'assets'].map(name=>cp(resolve(root,name),resolve(output,name),{recursive:true})));
console.log(`Packaged ${pages.length} pages, runtime scripts, styles and assets into dist/.`);
