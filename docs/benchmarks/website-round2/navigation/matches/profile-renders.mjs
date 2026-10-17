import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
const root=import.meta.dirname,site=join(root,'one'),out=join(root,process.env.RENDER_ARM?'evidence/navigation-matches-renders-'+process.env.RENDER_ARM:'evidence/navigation-renders')
mkdirSync(out,{recursive:true})
const files=new Map()
function edit(path,transform){const file=join(site,path),original=readFileSync(file,'utf8');const next=transform(original);assert.notEqual(next,original);files.set(file,original);writeFileSync(file,next)}
const router=join(site,'node_modules/one/dist/esm/router/router.mjs')
files.set(router,readFileSync(router));writeFileSync(router,readFileSync(join(root,'evidence/nav-control/router.mjs')))
if(process.env.RENDER_ARM)for(const name of ['useMatches','useLoader']){const file=join(site,'node_modules/one/dist/esm',name+'.mjs');files.set(file,readFileSync(file));writeFileSync(file,readFileSync(join(root,'evidence/matches-'+process.env.RENDER_ARM,name+'.mjs')))}
rmSync(join(site,'node_modules/.vite'),{recursive:true,force:true})
const browser=await chromium.launch({headless:true,channel:'chrome'});let server,log=''
try {
 edit('app/_layout.tsx',s=>s.replace("import { useEffect, useId }", "import { Profiler, useEffect, useId }").replace('<Slot />',`<Profiler id="routes" onRender={(id,phase,actualDuration,baseDuration,startTime,commitTime)=>{if(typeof window!=='undefined')(window.__renderProbe??=[]).push({id,phase,actualDuration,baseDuration,startTime,commitTime,path:location.pathname})}}><Slot /></Profiler>`))
 edit('app/(content)/docs/[slug].tsx',s=>s.replace('const Component = useMemo',`if(typeof window!=='undefined')(window.__pageRenderProbe??=[]).push({slug,path:location.pathname,at:performance.now()})\n  const Component = useMemo`))
 edit('features/docs/DocsLayout.tsx',s=>s.replace("const file = currentPath",`if(typeof window!=='undefined')(window.__layoutRenderProbe??=[]).push({currentPath,path:location.pathname,at:performance.now()})\n  const file = currentPath`))
 server=spawn(process.execPath,['node_modules/one/run.mjs','dev','--host','127.0.0.1','--port','4431'],{cwd:site,env:{...process.env,PORT:'4431',NO_COLOR:'1'},detached:true,stdio:['ignore','pipe','pipe']})
 await new Promise((done,fail)=>{const timer=setTimeout(()=>fail(new Error(log)),60000);const data=b=>{log+=b;if(/Local:\s+http/.test(log)){clearTimeout(timer);done()}};server.stdout.on('data',data);server.stderr.on('data',data);server.once('exit',c=>{clearTimeout(timer);fail(new Error('server '+c))})})
 const warm=await browser.newPage();for(const path of ['/','/docs/introduction','/docs/routing','/docs/configuration','/native','/blog/version-two'])await warm.goto('http://127.0.0.1:4431'+path,{waitUntil:'networkidle'});await warm.close()
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4431/',{waitUntil:'networkidle'});const samples=[]
 for(const [label,path,title]of [['first-intro','/docs/introduction','Introduction'],['first-routing','/docs/routing','Routing'],['repeat-intro','/docs/introduction','Introduction'],['repeat-routing','/docs/routing','Routing']]){
  await page.evaluate(()=>{window.__renderProbe=[];window.__pageRenderProbe=[];window.__layoutRenderProbe=[];window.__docToken=document})
  const began=performance.now();if(label==='first-intro')await page.getByRole('link',{name:'Read the docs',exact:true}).click();else await page.locator(`a[href="${path}"]`).first().click()
  await page.getByRole('heading',{name:title,exact:true}).waitFor();await page.waitForURL(url=>url.pathname===path);await page.waitForLoadState('networkidle');await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))))
  const sample={label,elapsedMs:performance.now()-began,...await page.evaluate(()=>({commits:window.__renderProbe,pages:window.__pageRenderProbe,layouts:window.__layoutRenderProbe,sameDocument:document===window.__docToken}))};assert(sample.sameDocument);samples.push(sample);console.log(JSON.stringify(sample))
 }
 assert.deepEqual(errors,[]);writeFileSync(join(out,'renders.json'),JSON.stringify({samples,errors,browser:browser.version()},null,2));await context.close()
}finally{for(const[file,original]of files)writeFileSync(file,original);if(server&&server.exitCode===null){process.kill(-server.pid,'SIGTERM');await once(server,'exit')}writeFileSync(join(out,'server.log'),log);await browser.close()}
