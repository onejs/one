import {readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
const root=join(import.meta.dirname,'evidence/dev-memory-diagnostic')
const outputs=[]
for(const site of ['one','start']) {
 const data=JSON.parse(readFileSync(join(root,`${site}.heapsnapshot`)))
 const {nodes,strings}=data,meta=data.snapshot.meta,width=meta.node_fields.length
 const ix=Object.fromEntries(meta.node_fields.map((field,index)=>[field,index])),types=meta.node_types[0]
 const groups=new Map()
 for(let i=0;i<nodes.length;i+=width) {
  const type=types[nodes[i+ix.type]],name=strings[nodes[i+ix.name]],key=type+':'+name
  const row=groups.get(key)||{type,name,count:0,bytes:0}
  row.count++;row.bytes+=nodes[i+ix.self_size];groups.set(key,row)
 }
 const top=[...groups.values()].sort((a,b)=>b.bytes-a.bytes).slice(0,65)
 const summary={site,top,totalBytes:[...groups.values()].reduce((sum,row)=>sum+row.bytes,0)}
 outputs.push(summary)
 console.log(JSON.stringify(summary))
}
writeFileSync(join(root,'heap-census.json'),JSON.stringify(outputs,null,2))
