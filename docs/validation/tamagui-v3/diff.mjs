import sharp from 'sharp'
import fs from 'node:fs/promises'
const [before, after, output] = process.argv.slice(2), rows=[]
if (!before || !after || !output) throw Error('usage: node diff.mjs <before> <after> <output>')
await fs.mkdir(output,{recursive:true})
for(const name of (await fs.readdir(before)).filter(n=>n.endsWith('.png'))) {
 const a=sharp(`${before}/${name}`),b=sharp(`${after}/${name}`)
 const am=await a.metadata(),bm=await b.metadata(),width=Math.max(am.width,bm.width),height=Math.max(am.height,bm.height)
 const [ab,bb]=await Promise.all([sharp({create:{width,height,channels:4,background:'#ff00ff'}}).composite([{input:await a.toBuffer(),left:0,top:0}]).raw().toBuffer(),sharp({create:{width,height,channels:4,background:'#00ffff'}}).composite([{input:await b.toBuffer(),left:0,top:0}]).raw().toBuffer()])
 const d=Buffer.alloc(width*height*4);let changed=0,max=0,sum=0,left=width,top=height,right=0,bottom=0
 for(let i=0;i<ab.length;i+=4){let different=false;for(let c=0;c<3;c++){const delta=Math.abs(ab[i+c]-bb[i+c]);sum+=delta;max=Math.max(max,delta);if(delta)different=true}
 if(different){changed++;const x=(i/4)%width,y=Math.floor(i/4/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);d[i]=255;d[i+3]=255}else{d[i]=ab[i];d[i+1]=ab[i+1];d[i+2]=ab[i+2];d[i+3]=70}}
 await sharp(d,{raw:{width,height,channels:4}}).png().toFile(`${output}/${name}`)
 const row={name,before:[am.width,am.height],after:[bm.width,bm.height],changed,percent:100*changed/(width*height),maxDelta:max,meanDelta:sum/(width*height*3),bounds:changed?[left,top,right,bottom]:null};rows.push(row);console.log(JSON.stringify(row))
}
await fs.writeFile(`${output}/results.json`,JSON.stringify(rows,null,2))
