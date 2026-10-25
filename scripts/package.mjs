import {readFile,mkdir,mkdtemp,cp,writeFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const manifest=JSON.parse(await readFile('theme.json','utf8'));
if(process.env.RELEASE_TAG&&process.env.RELEASE_TAG.replace(/^v/,'')!==manifest.version)throw new Error('Release tag/version mismatch');
const assets=await readdir('dist/assets');
for(const file of assets.filter(n=>n.endsWith('.js'))){const text=await readFile(path.join('dist/assets',file),'utf8');if(['/api/clients','/api/rpc2','/api/public','unlock-test/snapshot','window.pwned','OMARCHY DEMO'].some(s=>text.includes(s)))throw new Error('Forbidden demo or Komari code in production');}
await mkdir('.cache',{recursive:true});const stage=await mkdtemp(path.resolve('.cache/package-'));
const files=['dist','theme.json','preview.png','LICENSE','THIRD_PARTY.md','THIRD_PARTY_NOTICES.txt'];
for(const file of files)await cp(file,path.join(stage,file),{recursive:true});
const tar=spawnSync('tar',['--format','ustar','-czf',path.resolve('theme.tar.gz'),'-C',stage,...files],{stdio:'inherit'});if(tar.status!==0)throw new Error('tar failed');
const check=spawnSync(process.execPath,['scripts/check-package.mjs'],{stdio:'inherit'});if(check.status!==0)throw new Error('archive check failed');
const hash=createHash('sha256').update(await readFile('theme.tar.gz')).digest('hex');await writeFile('theme.tar.gz.sha256',`${hash}  theme.tar.gz\n`);
