from pathlib import Path
import json,statistics
root=Path(__file__).resolve().parent
series=root/'evidence/ssr-vendor-local-confirmation'
data={(run,arm):json.loads((series/f'{run}-{arm}/memory.json').read_text()) for run in range(3) for arm in ['control','candidate']}
for key,d in data.items():
    assert len(d['samples'])==5,key
    assert len(d['behavior'])==9,key
    assert d['diagnostic'] and not d['quietRequested']
    assert all(b['sameDocument'] and b['themeRetained'] and b['reloads']==0 for b in d['behavior'] if b.get('metric')=='hmr')
rows=[]
def add(name,values):
    controls=[v[0] for v in values];candidates=[v[1] for v in values]
    rows.append({'metric':name,'controlMedian':statistics.median(controls),'candidateMedian':statistics.median(candidates),'pairedDeltas':[b-a for a,b in values],'pairs':values})
for phase in ['ready','home','six-routes','collected-six-routes','after-hmr']:
    add(phase+' tree RSS MiB',[[next(s for s in data[(r,a)]['samples'] if s['phase']==phase)['treeRssBytes']/1048576 for a in ['control','candidate']] for r in range(3)])
    add(phase+' heap MiB',[[next(s for s in data[(r,a)]['samples'] if s['phase']==phase)['memory']['heapUsed']/1048576 for a in ['control','candidate']] for r in range(3)])
add('startup ready ms',[[data[(r,a)]['samples'][0]['elapsedSinceSpawnMs'] for a in ['control','candidate']] for r in range(3)])
for path in ['/', '/docs/introduction','/docs/routing','/docs/configuration','/native','/blog/version-two']:
    for metric in ['ssrMs','visibleMs']:
        add(path+' '+metric,[[next(b for b in data[(r,a)]['behavior'] if b.get('path')==path)[metric] for a in ['control','candidate']] for r in range(3)])
for kind in ['component','shared-component','css']:
    add(kind+' HMR ms',[[next(b for b in data[(r,a)]['behavior'] if b.get('kind')==kind)['elapsedMs'] for a in ['control','candidate']] for r in range(3)])
result={'host':data[(0,'control')]['host'],'sourceBaseline':data[(0,'control')]['sourceBaseline'],'candidate':data[(0,'candidate')]['candidate'],'quiet':False,'comparison':'three alternating direct local pairs on a shared host; no exclusive timing claim','rows':rows}
(series/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
for row in rows:print(f"{row['metric']}: {row['controlMedian']:.1f} -> {row['candidateMedian']:.1f}; deltas "+', '.join(f'{d:+.1f}' for d in row['pairedDeltas']))
