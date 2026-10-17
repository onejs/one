import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { chromium } from 'playwright'
const root=resolve(import.meta.dirname),out=join(root,'evidence/navigation-profile')
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const samples=[]
try {
 for(const [name,port,args] of [
  ['one',4431,['node_modules/one/run.mjs','dev','--host','127.0.0.1','--port','4431']],
  ['start',4432,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4432']],
 ]) {
  const server=spawn(process.execPath,args,{cwd:join(root,name),env:{...process.env,PORT:String(port),NO_COLOR:'1'},detached:true,stdio:['ignore','pipe','pipe']})
  let log=''
  try {
   await new Promise((done,fail)=>{const timer=setTimeout(()=>fail(new Error(log)),60000);const data=b=>{log+=b;if(/Local:\s+http/.test(log)){clearTimeout(timer);done()}};server.stdout.on('data',data);server.stderr.on('data',data);server.once('exit',code=>{clearTimeout(timer);fail(new Error(`server ${code}: ${log}`))})})
   const warmer=await browser.newContext();const warm=await warmer.newPage()
   for(const path of ['/','/docs/introduction','/docs/routing','/docs/configuration','/native','/blog/version-two'])await warm.goto(`http://127.0.0.1:${port}${path}`,{waitUntil:'networkidle'})
   await warmer.close()
   const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'}),page=await context.newPage(),cdp=await context.newCDPSession(page)
   await cdp.send('Network.enable');await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:100})
   const errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready)
   const cases=[['first-introduction','/docs/introduction','Introduction','Read the docs'],['first-routing','/docs/routing','Routing',null],['repeat-introduction','/docs/introduction','Introduction',null],['repeat-routing','/docs/routing','Routing',null]]
   for(const [label,path,heading,link]of cases){
    const events=[];let began=performance.now();const receive=event=>events.push({atMs:performance.now()-began,...event})
    const requested=e=>receive({kind:'request',id:e.requestId,url:e.request.url,initiator:e.initiator.type});const finished=e=>receive({kind:'finished',id:e.requestId,bytes:e.encodedDataLength});const response=e=>receive({kind:'response',id:e.requestId,status:e.response.status,timing:e.response.timing})
    cdp.on('Network.requestWillBeSent',requested);cdp.on('Network.responseReceived',response);cdp.on('Network.loadingFinished',finished)
    await page.evaluate(()=>{window.__navigationTrace=[];window.__navigationDocument=document;document.addEventListener('click',()=>window.__navigationTrace.push({event:'click',at:performance.now()}),{once:true,capture:true})})
    await cdp.send('Profiler.start');began=performance.now()
    if(link)await page.getByRole('link',{name:link,exact:true}).click();else await page.locator(`a[href="${path}"]`).first().click()
    await page.getByRole('heading',{name:heading,exact:true}).waitFor();await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))))
    const elapsedMs=performance.now()-began;const trace=await page.evaluate(()=>({click:window.__navigationTrace,now:performance.now(),resources:performance.getEntriesByType('resource').map(r=>({name:r.name,start:r.startTime,duration:r.duration})),sameDocument:window.__navigationDocument===document}))
    assert(trace.sameDocument);assert.deepEqual(errors,[])
    const {profile}=await cdp.send('Profiler.stop');writeFileSync(join(out,`${name}-${label}.cpuprofile`),JSON.stringify(profile))
    cdp.off('Network.requestWillBeSent',requested);cdp.off('Network.responseReceived',response);cdp.off('Network.loadingFinished',finished)
    samples.push({name,label,path,elapsedMs,events,trace});writeFileSync(join(out,'navigation.json'),JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),samples},null,2))
    console.log(JSON.stringify({name,label,elapsedMs,requests:events.filter(e=>e.kind==='request').map(e=>({at:e.atMs,url:e.url}))}))
   }
   await context.close()
  }finally{writeFileSync(join(out,`${name}-server.log`),log);if(server.exitCode===null){process.kill(-server.pid,'SIGTERM');await once(server,'exit')}}
 }
}finally{await browser.close()}
