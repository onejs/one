import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const root = '/private/tmp/one-footer-navigation'
mkdirSync(`${root}/evidence/profile`, { recursive: true })
let code = readFileSync(process.argv[2] || `${root}/benchmark.mjs`, 'utf8')
code = code.replace('const samples=[];', `for (const site of sites) site.dev.unshift('--cpu-prof', '--cpu-prof-dir=${root}/evidence/profile');\nconst samples=[];`)
code = code.replace("const navigation=[];const listener", `const trace = []; const origin = performance.now();
 const event = (kind, data) => trace.push({ms: performance.now()-origin, kind, data});
 const request = req => event('request', req.url());
 const response = res => event('response', {url: res.url(), status: res.status()});
 const ws = socket => socket.on('framereceived', data => event('ws', data.payload.toString()));
 page.on('request', request); page.on('response', response); page.on('websocket', ws);
 const cdp = await page.context().newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
 await page.evaluate(marker => {
   window.__mutationAt = null;
   const observer = new MutationObserver(() => {
     if (document.body.textContent.includes(marker)) { window.__mutationAt = performance.now(); observer.disconnect(); }
   }); observer.observe(document.body, {subtree:true, characterData:true, childList:true});
 }, marker);
 const navigation=[];const listener`)
code = code.replace('writeFileSync(file,changed)', `event('write', file); await page.evaluate(() => window.__writeAt = performance.now()); writeFileSync(file,changed)`)
code = code.replace("page.removeListener('framenavigated',listener);writeFileSync", `const profile = await cdp.send('Profiler.stop');
   event('dom', await page.evaluate(() => ({mutationMs:window.__mutationAt-window.__writeAt})));
   writeFileSync(join(output, site.name+'-'+kind+'.cpuprofile'), JSON.stringify(profile.profile));
   writeFileSync(join(output, site.name+'-'+kind+'-trace.json'), JSON.stringify(trace,null,2));
   await cdp.detach(); page.off('request', request); page.off('response', response); page.off('websocket', ws);
   page.removeListener('framenavigated',listener);writeFileSync`)
code = code.replace("const began=performance.now();await session.page.getByRole", `const navCdp = await session.context.newCDPSession(session.page); await navCdp.send('Profiler.enable'); await navCdp.send('Profiler.start');
      const navEvents = []; const navOrigin=performance.now();
      session.page.on('request',req=>navEvents.push({ms:performance.now()-navOrigin,event:'request',url:req.url()}));
      session.page.on('response',res=>navEvents.push({ms:performance.now()-navOrigin,event:'response',url:res.url()}));
      await session.page.evaluate(() => {
        window.__nav = {clickAt:null,mutationAt:null};
        document.addEventListener('click', () => window.__nav.clickAt = performance.now(), {once:true,capture:true});
        const observer = new MutationObserver(() => {
          if (document.querySelector('h1')?.textContent === 'Introduction') { window.__nav.mutationAt=performance.now();observer.disconnect(); }
        });observer.observe(document.body,{subtree:true,characterData:true,childList:true});
      });
      const began=performance.now();await session.page.getByRole`)
code = code.replace("if(mode==='dev')for", `const navProfile=await navCdp.send('Profiler.stop');
      navEvents.push({event:'dom',...await session.page.evaluate(()=>window.__nav)});
      writeFileSync(join(output,site.name+'-navigation.cpuprofile'),JSON.stringify(navProfile.profile));
      writeFileSync(join(output,site.name+'-navigation-trace.json'),JSON.stringify(navEvents,null,2));await navCdp.detach();
      if(mode==='dev')for`)
writeFileSync(process.argv[3] || `${root}/profile.mjs`, code)
