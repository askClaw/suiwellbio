import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const roots=['.','scripts','tests'];
let count=0;
for(const root of roots) {
 for(const name of await readdir(root)) {
  if(!/\.(?:m?js)$/.test(name)) continue;
  execFileSync(process.execPath,['--check',`${root}/${name}`],{stdio:'inherit'}); count++;
 }
}
console.log(`Syntax checked ${count} JavaScript files.`);
