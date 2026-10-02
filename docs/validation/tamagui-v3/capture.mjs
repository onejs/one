import { chromium } from 'playwright'
import fs from 'node:fs/promises'
const [base = 'http://localhost:4317', dir = './screenshots'] = process.argv.slice(2)
await fs.mkdir(dir, {recursive:true})
const browser = await chromium.launch({headless:true,executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH})
const results=[]
for(const width of [1440,390]) for(const scheme of ['light','dark']) {
 const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,colorScheme:scheme,reducedMotion:'reduce',hasTouch:width===390,isMobile:width===390})
 await context.addInitScript(s=>{localStorage.setItem('vxrn-scheme',s)},scheme)
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 for(const [slug,path] of [['home','/'],['docs','/docs'],['intro','/docs/introduction'],['routing','/docs/routing'],['native','/docs/native-overview'],['components','/docs/components-Tabs'],['blog','/blog/version-two'],['menu','/docs/introduction']]) {
   errors.length=0
   const response=await page.goto(base+path,{waitUntil:'networkidle',timeout:90000})
   await page.evaluate(()=>document.fonts.ready)
   await page.addStyleTag({content:'*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;caret-color:transparent!important}html{scroll-behavior:auto!important}'})
   await page.evaluate(async()=>{for(const img of document.images) if(!img.complete) await new Promise(r=>{img.onload=r;img.onerror=r});window.scrollTo(0,0)})
   await page.waitForTimeout(700)
   if(slug==='menu') {
     const trigger=page.getByRole('button',{name:'Open the main menu'})
     if(width===1440) await page.evaluate(()=>window.scrollTo(0,400))
     await trigger.waitFor({state:'visible'})
     if(width===390) await trigger.click(); else await trigger.hover()
     const menu = page.getByLabel('Home menu contents')
     await menu.waitFor({state:'visible',timeout:15000})
     await page.waitForFunction(() => {
       const menu = document.querySelector('[aria-label="Home menu contents"]')
       const link = menu?.querySelector('a')
       if (!link) return false
       const r = link.getBoundingClientRect()
       if (!r.width || !r.height || r.top >= innerHeight || r.bottom <= 0) return false
       const target = document.elementFromPoint(r.left + r.width / 2, Math.max(0, r.top) + Math.min(r.height / 2, innerHeight - r.top - 1))
       return !!target && link.contains(target)
     }, null, {timeout:15000})
     await page.waitForTimeout(700)
   }
   const name=`${slug}-${width}-${scheme}`
   const body = await page.locator('body').innerText()
   const serverError = body.startsWith('Error rendering ')
   if (serverError && slug !== 'docs') throw Error(body.slice(0,500))
   await page.screenshot({path:`${dir}/${name}.png`,fullPage:slug!=='menu',animations:'disabled'})
   results.push({name,path,status:response.status(),url:page.url(),errors:[...errors],body,serverError,height:await page.evaluate(()=>document.documentElement.scrollHeight)})
   console.log(name,response.status(),errors.length)
 }
 await context.close()
}
await browser.close()
await fs.writeFile(`${dir}/results.json`,JSON.stringify(results,null,2))
