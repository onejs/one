import { chromium } from 'playwright'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const origin=process.argv[2] ?? 'http://127.0.0.1:4311'
const browser=await chromium.launch({headless:true,channel:'chrome'})
const requests=new Set(); const errors=[]; const routes=[]
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 page.on('request',r=>requests.add(r.url()))
 page.on('pageerror',e=>errors.push(e.message))
 for (const path of ['/', '/docs/introduction', '/docs/routing', '/native', '/blog', '/blog/version-two', '/plans/routing-intercepting-routes']) {
  const response=await page.goto(origin+path,{waitUntil:'load',timeout:60000})
  const heading=page.locator('h1').first(); await heading.waitFor({state:'visible'})
  const text=await heading.textContent()
  routes.push({path,status:response.status(),heading:text,title:await page.title()})
  console.log(JSON.stringify(routes.at(-1)))
 }
 const maps=[...requests].map(url=>new URL(url).pathname).filter(path=>path.includes('/node_modules/.vite/deps/')&&path.endsWith('.js')).map(path=>'node_modules/.vite/deps/'+basename(path)+'.map').filter(existsSync)
 const nativeSources=maps.flatMap(file=>JSON.parse(readFileSync(file,'utf8')).sources.filter(source=>/(?:react-native-web|react-native-web-lite|react-native\/Libraries)/.test(source)).map(source=>({file,source})))
 const result={routes,errors,requests:[...requests],nativeSources}
 writeFileSync('evidence/dev-audit.json',JSON.stringify(result,null,2))
 console.log(JSON.stringify({errors,nativeSources,requests:requests.size,maps:maps.length}))
 if(errors.length || routes.some(route=>route.status!==200))process.exitCode=1
} finally {await browser.close()}
