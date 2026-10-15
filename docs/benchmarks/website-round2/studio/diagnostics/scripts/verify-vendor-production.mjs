import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
const root=import.meta.dirname
const out=join(root,'evidence/ssr-vendor-production')
mkdirSync(out,{recursive:true})
for(const environment of ['client','ssr']){
 const audit=JSON.parse(readFileSync(join(root,'one/evidence',`bundle-${environment}.json`)))
 assert.equal(audit.nativeModules.reduce((sum,module)=>sum+module.renderedLength,0),0)
 writeFileSync(join(out,`bundle-${environment}.json`),JSON.stringify(audit))
}
let log='',browser
const results=[]
const server=spawn(process.execPath,['node_modules/one/run.mjs','serve','--host','127.0.0.1','--port','4431'],{cwd:join(root,'one'),env:{...process.env,PORT:'4431',ONE_SERVER_URL:'http://127.0.0.1:4431'},detached:true,stdio:['ignore','pipe','pipe']})
try {
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('server readiness: '+log)),60000)
  const data=chunk=>{log+=chunk;if(/Local:\s+http/.test(log)){clearTimeout(timer);resolve()}}
  server.stdout.on('data',data);server.stderr.on('data',data)
  server.once('exit',code=>{clearTimeout(timer);reject(new Error(`server exit ${code}: ${log}`))})
 })
 browser=await chromium.launch({headless:true,channel:'chrome'})
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 for(const path of ['/','/docs/introduction','/docs/routing','/docs/configuration','/native','/blog/version-two']){
  const url='http://127.0.0.1:4431'+path
  const raw=await fetch(url);assert.equal(raw.status,200,path)
  const html=await raw.text();writeFileSync(join(out,`ssr-${path.replace(/[^a-z0-9]+/gi,'_')}.html`),html)
  const response=await page.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200,path)
  await page.locator('h1').first().waitFor()
  const expected=await page.evaluate(html=>new DOMParser().parseFromString(html,'text/html').querySelector('h1')?.textContent,html)
  const heading=await page.locator('h1').first().textContent()
  assert.equal(expected?.replace(/\s+/g,' ').trim(),heading?.replace(/\s+/g,' ').trim(),path)
  results.push({path,heading})
 }
 await page.goto('http://127.0.0.1:4431/',{waitUntil:'networkidle'})
 await page.getByRole('button',{name:'Toggle theme'}).click();await page.getByRole('button',{name:'Toggle theme'}).click()
 assert.match(await page.locator('html').getAttribute('class'),/t_dark/)
 assert.deepEqual(errors,[])
 assert(!/SSR error while loading|Error rendering .+ on server|Invalid hook call/.test(log))
 writeFileSync(join(out,'results.json'),JSON.stringify({source:'5ae371c95097f8cdf20797b743f1a9054b7d09ac',results,errors,themeRetained:true,nativeEmittedBytes:0},null,2))
 console.log(JSON.stringify({routes:results.length,errors,themeRetained:true,nativeEmittedBytes:0}))
}finally{
 if(browser)await browser.close()
 writeFileSync(join(out,'server.log'),log)
 if(server.exitCode===null){process.kill(-server.pid,'SIGTERM');await once(server,'exit')}
}
