import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const origin=process.argv[2]
if(!origin)throw new Error('usage: node scripts/verify-site.mjs http://127.0.0.1:4312')
mkdirSync('evidence',{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const errors=[];const result=[]
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2})
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(origin,{waitUntil:'networkidle'})
 await page.evaluate(()=>document.fonts.ready)
 await sharp(await page.screenshot({animations:'disabled'})).webp({quality:90}).toFile('evidence/home.webp')
 await page.evaluate(()=>{window.__documentToken='same-document'})
 await page.getByRole('link',{name:'Read the docs'}).click()
 await page.getByRole('heading',{name:'Introduction',exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>window.__documentToken),'same-document','docs link must navigate without a document reload')
 result.push('home to docs navigates in the same document')
 await page.evaluate(()=>document.fonts.ready)
 await sharp(await page.screenshot({animations:'disabled'})).webp({quality:90}).toFile('evidence/docs.webp')
 await page.getByRole('button',{name:'Toggle theme'}).click()
 assert.match(await page.locator('html').getAttribute('class'),/t_light/)
 await page.getByRole('button',{name:'Toggle theme'}).click()
 assert.match(await page.locator('html').getAttribute('class'),/t_dark/)
 await page.reload({waitUntil:'networkidle'})
 assert.match(await page.locator('html').getAttribute('class'),/t_dark/)
 result.push('light/dark toggle and persistence')
 await page.keyboard.press('Meta+k')
 await page.getByRole('searchbox').waitFor({state:'visible'})
 await page.keyboard.press('Escape')
 await page.getByRole('searchbox').waitFor({state:'hidden'})
 result.push('search opens and closes')
 await page.goto(origin+'/docs/this-page-does-not-exist',{waitUntil:'networkidle'})
 await page.getByRole('heading',{name:'404',exact:true}).waitFor()
 result.push('missing document renders the existing 404 page')
 for(const path of ['/docs','/blog/version-one-rc1','/docs/native-features']){
  const response=await fetch(origin+path,{redirect:'manual'})
  assert.equal(response.status,301,path+' redirect')
  result.push(path+' permanent redirect')
 }
 const feed=await fetch(origin+'/blog/rss.xml');assert.equal(feed.status,200);assert.match(await feed.text(),/<rss version="2.0">/)
 const llms=await fetch(origin+'/llms-full.txt');assert.equal(llms.status,200);assert.match(await llms.text(),/Introduction/)
 const signup=await fetch(origin+'/api/mailing-list-signup',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
 assert.equal(signup.status,400);assert.deepEqual(await signup.json(),{status:'error',message:'Invalid content type'})
 result.push('RSS, llms-full and invalid signup responses')
 assert.deepEqual(errors,[],'browser exceptions')
 console.log(JSON.stringify({result,errors},null,2))
 writeFileSync('evidence/verification.json',JSON.stringify({result,errors},null,2))
} finally {await browser.close()}
