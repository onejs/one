import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { hostname, cpus, totalmem, platform, release } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { performance } from 'node:perf_hooks'
import { chromium } from 'playwright'
import { gzipSync, brotliCompressSync } from 'node:zlib'

const { values }=parseArgs({ options:{ one:{type:'string'}, start:{type:'string'}, phase:{type:'string',default:'dev'}, runs:{type:'string',default:'3'}, output:{type:'string',default:'evidence/benchmarks'}, clean:{type:'boolean',default:false} } })
assert(values.one && values.start,'--one and --start must name the two site directories')
const runs=Number(values.runs);assert(Number.isInteger(runs)&&runs>0&&runs<=30)
const output=resolve(values.output);mkdirSync(output,{recursive:true})
const sites=[{name:'one',cwd:resolve(values.one),port:4411,entry:'app/index.tsx',dev:['node_modules/one/run.mjs','dev','--host','127.0.0.1','--port','4411'],build:['node_modules/one/run.mjs','build'],prod:['node_modules/one/run.mjs','serve','--host','127.0.0.1','--port','4411']},{name:'start',cwd:resolve(values.start),port:4412,entry:'features/site/HomePage.tsx',dev:['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4412'],build:['node_modules/vite/bin/vite.js','build'],prod:['scripts/serve-start.mjs']}]
const routes=['/','/docs/introduction','/docs/routing','/docs/configuration','/native','/blog/version-two']
const samples=[];const children=new Set()
const browser=values.phase==='build'?null:await chromium.launch({headless:true,channel:'chrome'})
const metadata={startedAt:new Date().toISOString(),host:hostname(),platform:platform(),os:release(),cpu:cpus()[0]?.model,cores:cpus().length,ramBytes:totalmem(),node:process.version,nodeExecutable:process.execPath,browser:browser?await browser.version():null,phase:values.phase,runs,clean:values.clean,sites:sites.map(site=>({name:site.name,cwd:site.cwd,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:site.cwd,encoding:'utf8'}).trim(),versions:Object.fromEntries(['react','react-dom','tamagui','vite',site.name==='one'?'one':'@tanstack/react-start','oxc-transform-react'].map(name=>[name,JSON.parse(readFileSync(join(site.cwd,'node_modules',name,'package.json'),'utf8')).version]))}))}
function save(){writeFileSync(join(output,values.phase+'.json'),JSON.stringify({metadata,samples},null,2))}
function record(sample){samples.push(sample);save();console.log(JSON.stringify(sample))}
function treeRss(pid){
 const rows=execFileSync('ps',['-axo','pid=,ppid=,rss='],{encoding:'utf8'}).trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number))
 const ids=new Set([pid]);let changed=true
 while(changed){changed=false;for(const [id,parent] of rows)if(ids.has(parent)&&!ids.has(id)){ids.add(id);changed=true}}
 return rows.filter(([id])=>ids.has(id)).reduce((sum,row)=>sum+row[2]*1024,0)
}
async function stop(child){if(!children.has(child))return;children.delete(child);if(child.exitCode!==null)return;process.kill(-child.pid,'SIGTERM');await once(child,'exit')}
async function launch(site,mode,run){
 const path=join(output,`${site.name}-${mode}-${run}.log`);const stream=createWriteStream(path)
 const began=performance.now();const child=spawn(process.execPath,site[mode],{cwd:site.cwd,env:{...process.env,PORT:String(site.port),NO_COLOR:'1',ONE_SERVER_URL:`http://127.0.0.1:${site.port}`},detached:true,stdio:['ignore','pipe','pipe']});children.add(child)
 let text='';const ready=await new Promise((resolveReady,reject)=>{
  const timeout=setTimeout(()=>reject(new Error('server did not announce readiness: '+path)),60000)
  const onData=chunk=>{stream.write(chunk);text+=chunk.toString();if(/Local:\s+http/.test(text)){clearTimeout(timeout);resolveReady(performance.now()-began)}}
  child.stdout.on('data',onData);child.stderr.on('data',onData);child.once('exit',code=>{clearTimeout(timeout);stream.end();reject(new Error('server exited '+code+': '+path))})
 })
 return {child,readyMs:ready,began}
}
async function newPage(){const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,colorScheme:'light',extraHTTPHeaders:{'Accept-Encoding':'identity'}});await context.addInitScript(()=>{
 localStorage.setItem('vxrn-scheme','system');window.__bench={lcp:0,cls:0};new PerformanceObserver(list=>{for(const item of list.getEntries())window.__bench.lcp=item.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const item of list.getEntries())if(!item.hadRecentInput)window.__bench.cls+=item.value}).observe({type:'layout-shift',buffered:true})
 });const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');return {context,page,cdp}}
async function load(page,cdp,url){
 const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError)
 const start=performance.now();const response=await page.goto(url,{waitUntil:'load',timeout:60000});assert.equal(response.status(),200,url)
 await page.locator('h1').first().waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready)
 const visibleMs=performance.now()-start
 await page.waitForLoadState('networkidle')
 // two frames ensure the visible heading has been painted before collecting paint entries
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
 const timing=await page.evaluate(()=>{const nav=performance.getEntriesByType('navigation')[0];const resources=performance.getEntriesByType('resource');return {ttfbMs:nav.responseStart-nav.startTime,domContentLoadedMs:nav.domContentLoadedEventEnd,loadMs:nav.loadEventEnd,fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,lcpMs:window.__bench.lcp,cls:window.__bench.cls,transferBytes:nav.transferSize+resources.reduce((sum,item)=>sum+item.transferSize,0),decodedBytes:nav.decodedBodySize+resources.reduce((sum,item)=>sum+item.decodedBodySize,0),requests:resources.length+1,heading:document.querySelector('h1')?.textContent}})
 const metrics=await cdp.send('Performance.getMetrics');const heap=Object.fromEntries(metrics.metrics.map(item=>[item.name,item.value]));const dom=await cdp.send('Memory.getDOMCounters')
 await cdp.send('HeapProfiler.collectGarbage'); const retained=await cdp.send('Performance.getMetrics'); const jsRetainedHeapBytes=retained.metrics.find(metric=>metric.name==='JSHeapUsedSize')?.value
 page.removeListener('pageerror',onError);assert.deepEqual(errors,[],url+' browser exceptions')
 return {visibleMs,documentEncoding:response.headers()['content-encoding'] || 'identity',...timing,jsHeapUsedBytes:heap.JSHeapUsedSize,jsRetainedHeapBytes,jsHeapTotalBytes:heap.JSHeapTotalSize,domNodes:dom.nodes}
}
async function hmr(site,page,kind,run){
 const file=join(site.cwd,kind==='component'?site.entry:kind==='shared-component'?'features/site/Footer.tsx':'app/app.css');const original=readFileSync(file,'utf8')
 const needle=kind==='shared-component'?'Copyright 2024 Tamagui, LLC':'Read the docs';const marker=`Benchmark update ${run}`
 const changed=kind!=='css'?original.replace(needle,marker):original+'\nhtml { --benchmark-hmr: "'+marker+'"; }\n'
 assert.notEqual(original,changed)
 await page.evaluate(()=>localStorage.setItem('vxrn-scheme','system'))
 await page.goto(`http://127.0.0.1:${site.port}/`,{waitUntil:'networkidle'})
 await page.getByRole('button',{name:'Toggle theme'}).click();await page.getByRole('button',{name:'Toggle theme'}).click()
 assert.match(await page.locator('html').getAttribute('class'),/t_dark/)
 if(kind==='shared-component')await page.getByText(needle,{exact:true}).scrollIntoViewIfNeeded()
 await page.evaluate(()=>{window.__benchDocumentToken='same-document'})
 const navigation=[];const listener=frame=>{if(frame===page.mainFrame())navigation.push(frame.url())};page.on('framenavigated',listener)
 const started=performance.now()
 try {
  writeFileSync(file,changed)
  if(kind==='component')await page.getByRole('link',{name:marker,exact:true}).waitFor({state:'visible'})
  else if(kind==='shared-component')await page.getByText(marker,{exact:true}).waitFor({state:'visible'})
  else await page.waitForFunction(marker=>getComputedStyle(document.documentElement).getPropertyValue('--benchmark-hmr').includes(marker),marker)
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const elapsedMs=performance.now()-started
  const sameDocument=await page.evaluate(()=>window.__benchDocumentToken==='same-document')
  const themeRetained=/t_dark/.test(await page.locator('html').getAttribute('class'))
  record({site:site.name,run,metric:'hmr',kind,elapsedMs,sameDocument,themeRetained,reloads:navigation.length})
 } finally {
  page.removeListener('framenavigated',listener);writeFileSync(file,original)
  if(kind==='component')await page.getByRole('link',{name:needle,exact:true}).waitFor({state:'visible'})
  else if(kind==='shared-component')await page.getByText(needle,{exact:true}).waitFor({state:'visible'})
  else await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--benchmark-hmr')==='')
 }
}
function assetBytes(root){let js=0,css=0,jsGzip=0,jsBrotli=0,html=0,files=0;for(const item of readdirSync(root,{withFileTypes:true})){const path=join(root,item.name);if(item.isDirectory()){const child=assetBytes(path);js+=child.js;css+=child.css;jsGzip+=child.jsGzip;jsBrotli+=child.jsBrotli;html+=child.html;files+=child.files}else{files++;if(path.endsWith('.js')){const bytes=readFileSync(path);js+=bytes.length;jsGzip+=gzipSync(bytes).length;jsBrotli+=brotliCompressSync(bytes).length}else if(path.endsWith('.css'))css+=statSync(path).size;else if(path.endsWith('.html'))html+=statSync(path).size}}return {js,css,jsGzip,jsBrotli,html,files}}
try {
 for(let run=0;run<runs;run++){
  const ordered=run%2?[...sites].reverse():sites
  for(const site of ordered){
   if(values.phase==='build'){
    // clean output only; source, dependencies and host OS caches stay intact
    rmSync(join(site.cwd,'dist'),{recursive:true,force:true})
    const log=createWriteStream(join(output,`${site.name}-build-${run}.log`));const started=performance.now();const child=spawn('/usr/bin/time',['-l',process.execPath,...site.build],{cwd:site.cwd,env:{...process.env,NO_COLOR:'1',ONE_SERVER_URL:'https://onestack.dev'},detached:true,stdio:['ignore','pipe','pipe']});children.add(child);let text='';let peakTreeRssBytes=0
    const data=chunk=>{text+=chunk.toString();log.write(chunk)};child.stdout.on('data',data);child.stderr.on('data',data)
    const sampler=setInterval(()=>{try{peakTreeRssBytes=Math.max(peakTreeRssBytes,treeRss(child.pid))}catch{}},250)
    const [code]=await once(child,'exit');clearInterval(sampler);children.delete(child);log.end();assert.equal(code,0,site.name+' build failed: '+text.slice(-1800))
    record({site:site.name,run,metric:'build',elapsedMs:performance.now()-started,maxProcessRssBytes:Number(text.match(/(\d+)\s+maximum resident set size/)?.[1]),peakTreeRssBytes})
   }else {
    const mode=values.phase==='dev'?'dev':'prod'
    if(mode==='dev' && values.clean)rmSync(join(site.cwd,'node_modules/.vite'),{recursive:true,force:true})
    const server=await launch(site,mode,run)
    try {
     const first=await newPage();const firstLoad=await load(first.page,first.cdp,`http://127.0.0.1:${site.port}/`)
     record({site:site.name,run,metric:'startup',readyMs:server.readyMs,firstVisibleSinceSpawnMs:server.readyMs+firstLoad.visibleMs,firstLoad,serverTreeRssBytes:treeRss(server.child.pid)})
     await first.context.close()
     for(const path of routes){
      const session=await newPage()
      try{
       const cold=await load(session.page,session.cdp,`http://127.0.0.1:${site.port}${path}`)
       record({site:site.name,run,metric:'page',path,cache:'fresh-context',...cold,serverTreeRssBytes:treeRss(server.child.pid)})
       const warm=await load(session.page,session.cdp,`http://127.0.0.1:${site.port}${path}`)
       record({site:site.name,run,metric:'page',path,cache:'repeat-context',...warm,serverTreeRssBytes:treeRss(server.child.pid)})
      }finally{await session.context.close()}
     }
     const session=await newPage()
     try{
      await session.page.goto(`http://127.0.0.1:${site.port}/`,{waitUntil:'networkidle'})
      await session.page.evaluate(()=>{window.__benchDocumentToken='same-document'})
      const began=performance.now();await session.page.getByRole('link',{name:'Read the docs',exact:true}).click();await session.page.getByRole('heading',{name:'Introduction',exact:true}).waitFor()
      assert.equal(await session.page.evaluate(()=>window.__benchDocumentToken),'same-document')
      await session.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
      record({site:site.name,run,metric:'navigation',from:'/',to:'/docs/introduction',elapsedMs:performance.now()-began})
      if(mode==='dev')for(const kind of ['component','shared-component','css'])await hmr(site,session.page,kind,run)
     }finally{await session.context.close()}
    }finally{await stop(server.child)}
   }
  }
 }
 if(values.phase==='build')for(const site of sites)record({site:site.name,metric:'assets',...assetBytes(join(site.cwd,'dist/client'))})
}finally{for(const child of [...children])await stop(child);if(browser)await browser.close();metadata.finishedAt=new Date().toISOString();save()}
