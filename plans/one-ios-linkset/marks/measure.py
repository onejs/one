#!/usr/bin/env python3
import argparse, json, os, pathlib, select, statistics, subprocess, time, plistlib, re
p=argparse.ArgumentParser()
p.add_argument('--sim',required=True)
p.add_argument('--rounds',type=int,default=10)
p.add_argument('--output',required=True)
p.add_argument('apps',nargs='+',help='label:bundleID')
a=p.parse_args()
root=pathlib.Path(a.output); root.mkdir(parents=True,exist_ok=True)
apps=[x.split(':',1) for x in a.apps]
containers={}
for label,bundle in apps:
 data=subprocess.check_output(['xcrun','simctl','get_app_container',a.sim,bundle,'data'],text=True).strip()
 documents=pathlib.Path(data)/'Documents'; documents.mkdir(exist_ok=True)
 containers[label]=(documents, pathlib.Path(data)/"Library"/"Preferences"/f"{bundle}.plist")
rows=[]
for round in range(a.rounds+1):
 for label,bundle in (apps if round%2==0 else list(reversed(apps))):
  subprocess.run(['xcrun','simctl','terminate',a.sim,bundle],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  documents,prefs=containers[label]
  prefs.parent.mkdir(exist_ok=True)
  path=documents/f'startup-{root.name}-{round}-{label}.txt'
  env={**os.environ,'SIMCTL_CHILD_STARTUP_TRACE':str(path)}
  fd=os.open(path.parent,os.O_RDONLY)
  filefd=None
  preferencefd=None
  preferenceinode=None
  prefsfd=os.open(prefs.parent,os.O_RDONLY)
  try:
   watcher=select.kqueue(); watcher.control([select.kevent(fd,filter=select.KQ_FILTER_VNODE,flags=select.KQ_EV_ADD|select.KQ_EV_CLEAR,fflags=select.KQ_NOTE_WRITE)],0)
   watcher.control([select.kevent(prefsfd,filter=select.KQ_FILTER_VNODE,flags=select.KQ_EV_ADD|select.KQ_EV_CLEAR,fflags=select.KQ_NOTE_WRITE)],0)
   result=subprocess.run(['xcrun','simctl','launch',a.sim,bundle],env=env,capture_output=True,text=True,check=True)
   pid=re.search(r': (\d+)',result.stdout)[1]
   started=float(subprocess.check_output([str(pathlib.Path(__file__).with_name('proc-start')),pid],text=True))
   deadline=time.monotonic()+30
   while True:
    if filefd is None and path.exists():
     filefd=os.open(path,os.O_RDONLY)
     watcher.control([select.kevent(filefd,filter=select.KQ_FILTER_VNODE,flags=select.KQ_EV_ADD|select.KQ_EV_CLEAR,fflags=select.KQ_NOTE_WRITE)],0)
    marks=dict(line.split() for line in path.read_text().splitlines()) if path.exists() else {}
    if 'routed_content' in marks: marks.setdefault('first_content',marks.pop('routed_content'))
    route=0
    try:
     inode=prefs.stat().st_ino
     if inode!=preferenceinode:
      if preferencefd is not None: os.close(preferencefd)
      preferencefd=os.open(prefs,os.O_RDONLY); preferenceinode=inode
      watcher.control([select.kevent(preferencefd,filter=select.KQ_FILTER_VNODE,flags=select.KQ_EV_ADD|select.KQ_EV_CLEAR,fflags=select.KQ_NOTE_WRITE|select.KQ_NOTE_RENAME|select.KQ_NOTE_DELETE)],0)
     route=plistlib.loads(prefs.read_bytes()).get('oneStartupRoutedEpoch',0)
    except (FileNotFoundError,plistlib.InvalidFileException):
     pass
    if route>=started and 'app_delegate_init' in marks:
     marks['routed_content']=route-started
     break
    remaining=deadline-time.monotonic()
    if remaining<=0: raise RuntimeError(f'{label}: routed content did not appear: {result.stdout} {marks}')
    watcher.control(None,1,remaining)
   watcher.close()
  finally:
   os.close(fd)
   os.close(prefsfd)
   if filefd is not None: os.close(filefd)
   if preferencefd is not None: os.close(preferencefd)
  (root/f'{round}-{label}.txt').write_text(path.read_text())
  path.unlink()
  row={'round':round,'app':label,**{k:float(v) for k,v in marks.items()}}
  if round: rows.append(row)
  print(json.dumps(row),flush=True)
  subprocess.run(['xcrun','simctl','terminate',a.sim,bundle],check=True)
(root/'launches.json').write_text(json.dumps(rows,indent=2)+'\n')
for label,bundle in apps:
 summary={'app':label,'n':a.rounds}
 for mark in ['app_delegate_init','routed_content']:
  values=[x[mark] for x in rows if x['app']==label]
  summary[mark]={'median':statistics.median(values),'min':min(values),'max':max(values)}
 print(json.dumps(summary),flush=True)
