import {readFile,stat} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const file=process.argv[2]||'theme.tar.gz',compressed=await readFile(file),tar=gunzipSync(compressed);
assert.ok(compressed.length<=32*1024**2,'compressed limit');
let pos=0,count=0,total=0,manifest,ended=false;const entries=[];
while(pos+512<=tar.length){const h=tar.subarray(pos,pos+512);if(h.every(v=>v===0)){ended=true;break;}
 const str=(start,end)=>h.subarray(start,end).toString('utf8').replace(/\0.*$/s,'');
 const name=(str(345,500)?str(345,500)+'/':'')+str(0,100),type=str(156,157),size=parseInt(str(124,136).trim()||'0',8);
 assert.ok(Number.isSafeInteger(size)&&size>=0,'invalid size');assert.ok(type===''||type==='0'||type==='5','only files and directories');
 assert.ok(!name.startsWith('/')&&!name.includes('\\')&&!name.split('/').includes('..')&&!/^[A-Za-z]:/.test(name),'unsafe path');assert.ok(Buffer.byteLength(name)<=4096,'path limit');
 assert.ok(size<=8*1024**2,'single file limit');total+=size;count++;entries.push(name.replace(/^\.\//,''));
 if(name==='theme.json')manifest=JSON.parse(tar.subarray(pos+512,pos+512+size).toString());
 pos+=512+Math.ceil(size/512)*512;
}
assert.ok(ended&&tar.length-pos>=1024,'missing tar terminator');assert.ok(tar.length-pos<=1024*1024+1024,'tar padding limit');assert.ok(count<=2000&&total<=64*1024**2,'unpacked limit');
for(const item of ['theme.json','preview.png','LICENSE','THIRD_PARTY.md','THIRD_PARTY_NOTICES.txt','dist/index.html','dist/favicon.svg','dist/apple-touch-icon.png'])assert.ok(entries.includes(item),`missing ${item}`);
for(const key of ['name','short','description','version','author','url'])assert.equal(typeof manifest[key],'string',`manifest ${key}`);
assert.ok(manifest.name&&/^[A-Za-z0-9_-]+$/.test(manifest.short),'manifest identity');
const expected=JSON.parse(await readFile('theme.json','utf8'));assert.deepEqual(manifest,expected);
const png=await readFile('preview.png');assert.equal(png.subarray(1,4).toString(),'PNG');
const hash=createHash('sha256').update(compressed).digest('hex');
console.log(JSON.stringify({file,short:manifest.short,version:manifest.version,entries:count,unpackedBytes:total,compressedBytes:(await stat(file)).size,sha256:hash},null,2));
