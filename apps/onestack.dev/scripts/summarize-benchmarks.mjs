import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
const root=resolve(process.argv[2] || 'evidence/benchmarks')
const median=items=>{const values=[...items].sort((a,b)=>a-b);const middle=Math.floor(values.length/2);return values.length%2?values[middle]:(values[middle-1]+values[middle])/2}
const stats=values=>`${median(values).toFixed(1)} (${Math.min(...values).toFixed(1)}–${Math.max(...values).toFixed(1)})`
const mib=bytes=>bytes/1024**2
const phases=['dev','build','production']
for(const phase of phases){
 const path=join(root,phase+'.json');if(!existsSync(path))continue
 const {metadata,samples}=JSON.parse(readFileSync(path,'utf8'))
 const select=(site,metric,filter=()=>true)=>samples.filter(row=>row.site===site&&row.metric===metric&&filter(row))
 const lines=[`# ${phase} comparison`, '',`RAN locally on ${metadata.host}, ${metadata.cpu}, Node ${metadata.node}, ${metadata.browser || 'no browser'}. ${metadata.runs} runs per framework, alternating order. Values show median (minimum–maximum).`, '']
 const table=(rows)=>{lines.push('| Measurement | One | TanStack Start |','| --- | ---: | ---: |',...rows.map(row=>'| '+row.join(' | ')+' |'),'')}
 if(phase==='build'){
  table([['Build time, ms',...['one','start'].map(site=>stats(select(site,'build').map(row=>row.elapsedMs)))],['Peak process RSS, MiB',...['one','start'].map(site=>stats(select(site,'build').map(row=>mib(row.maxProcessRssBytes))))],['Peak process-tree RSS, MiB',...['one','start'].map(site=>stats(select(site,'build').map(row=>mib(row.peakTreeRssBytes))))]])
  table(['js','jsGzip','jsBrotli','css','html'].map(key=>[`${key}, KiB`,...['one','start'].map(site=>(select(site,'assets')[0]?.[key]/1024).toFixed(1))]))
 }else{
  const startups=['one','start'].map(site=>select(site,'startup'))
  if(startups.every(rows=>rows.length))table([['Server ready, ms',...startups.map(rows=>stats(rows.map(row=>row.readyMs)))],['Ready + first visible load, ms',...startups.map(rows=>stats(rows.map(row=>row.firstVisibleSinceSpawnMs)))],['Server tree RSS after home, MiB',...startups.map(rows=>stats(rows.map(row=>mib(row.serverTreeRssBytes))))],['Home JS retained heap, MiB',...startups.map(rows=>stats(rows.map(row=>mib(row.firstLoad.jsRetainedHeapBytes))))],['Home client navigation, ms',...['one','start'].map(site=>stats(select(site,'navigation').map(row=>row.elapsedMs)))]] )
  if(phase==='dev')for(const kind of ['component','shared-component','css']){
   const rows=['one','start'].map(site=>select(site,'hmr',row=>row.kind===kind));if(rows.every(list=>list.length))table([[`${kind} edit to visible paint, ms`,...rows.map(list=>stats(list.map(row=>row.elapsedMs)))],['Same document retained',...rows.map(list=>`${list.filter(row=>row.sameDocument).length}/${list.length}`)],['Theme retained',...rows.map(list=>`${list.filter(row=>row.themeRetained).length}/${list.length}`)]])
  }
  for(const cache of ['fresh-context','repeat-context']){
   lines.push(`## Page loads: ${cache}`,'')
   const routes=[...new Set(samples.filter(row=>row.metric==='page').map(row=>row.path))]
   table(routes.map(path=>[`${path}, visible ms`,...['one','start'].map(site=>stats(select(site,'page',row=>row.path===path&&row.cache===cache).map(row=>row.visibleMs)))]))
   table(routes.map(path=>[`${path}, TTFB ms`,...['one','start'].map(site=>stats(select(site,'page',row=>row.path===path&&row.cache===cache).map(row=>row.ttfbMs)))]))
   table(routes.map(path=>[`${path}, retained JS MiB`,...['one','start'].map(site=>stats(select(site,'page',row=>row.path===path&&row.cache===cache).map(row=>mib(row.jsRetainedHeapBytes))))]))
   table(routes.map(path=>[`${path}, transferred KiB`,...['one','start'].map(site=>stats(select(site,'page',row=>row.path===path&&row.cache===cache).map(row=>row.transferBytes/1024)))]))
  }
 }
 lines.push('Notes: loopback HTTP, no bandwidth or CPU throttling; browser requests identity encoding for both. Browser memory is sampled after network idle, with retained heap after explicit GC. Each server starts anew for each run. Homepage is requested for startup before its page samples. Other pages first compile on their first request in each development run. Repeat context keeps browser and server caches. Build output is deleted before each build; dependencies and OS caches stay warm. Framework build timings exclude the shared OG preparation script. RSS sums can double-count shared resident pages; peak process and process-tree memory are separate measurements. Small sample ranges are descriptive, not confidence intervals.','')
 const report=join(root,phase+'.md');writeFileSync(report,lines.join('\n'));console.log(report)
}
