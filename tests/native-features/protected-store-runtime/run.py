import base64
import hashlib
import json
import re
import shlex
import subprocess
import sys
import threading
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EVIDENCE = Path('/Users/n8/.team-machine/handoffs/protected-store-runtime-evidence')
SERIAL = 'emulator-5562'
PACKAGE = 'dev.vxrn.nativefeatures.tests'
ADB = '/Users/n8/Library/Android/sdk/platform-tools/adb'

def adb(*arguments):
    arguments = ['shell', shlex.join(arguments[1:])] if arguments and arguments[0] == 'shell' else list(arguments)
    result = subprocess.run([ADB, '-s', SERIAL, *arguments], capture_output=True, text=True)
    with (EVIDENCE/'commands.jsonl').open('a') as out:
        out.write(json.dumps({'time': time.time(), 'arguments': arguments, 'exitCode': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr})+'\n')
    if result.returncode: raise RuntimeError(result.stderr or result.stdout)
    return result.stdout

def snapshot(label):
    adb('shell','uiautomator','dump','/sdcard/protected-ui.xml')
    xml = adb('shell','cat','/sdcard/protected-ui.xml')
    (EVIDENCE/(label+'.xml')).write_text(xml)
    return ET.fromstring(xml)

def tap(node):
    x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))

def command(identifier,operation,key='presence',policy='userPresence',value=None,reason=None):
    payload={'id':identifier,'operation':operation,'key':key,'policy':policy,'reason': reason if reason is not None else 'Protected proof '+identifier}
    if value is not None: payload['value']=value
    request=urllib.request.Request('http://localhost:8132/command',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=18) as response: return json.load(response)

def expect(result,outcome='resolved',code=None,value='unset'):
    assert result['outcome']==outcome,result
    if code: assert result.get('code')==code,result
    if value != 'unset': assert result.get('value')==value,result
    print(json.dumps(result,ensure_ascii=False))
    return result

def authenticate(identifier,operation,key='presence',policy='userPresence',value=None,mode='finger'):
    result=[]
    def call():
        try: result.append(command(identifier,operation,key,policy,value))
        except BaseException as error: result.append(error)
    thread=threading.Thread(target=call)
    thread.start()
    root=snapshot(identifier+'-prompt')
    assert any(n.get('text')=='Protected proof '+identifier for n in root.iter('node')), [(n.get('text'),n.get('resource-id')) for n in root.iter('node') if n.get('text')]
    if mode=='finger': adb('emu','finger','touch','1')
    elif mode=='cancel': adb('shell','input','keyevent','4')
    elif mode=='home': adb('shell','input','keyevent','3')
    elif mode=='destroy': adb('shell','am','broadcast','-n',PACKAGE+'/.ControlReceiver','--es','control','destroy')
    elif mode=='pin':
        tap(next(n for n in root.iter('node') if n.get('text')=='Use PIN'))
        pin=snapshot(identifier+'-pin')
        for digit in '246810': tap(next(n for n in pin.iter('node') if n.get('text')==digit))
        tap(next(n for n in pin.iter('node') if n.get('resource-id')=='com.android.systemui:id/key_enter'))
    else: raise ValueError(mode)
    thread.join(18)
    assert not thread.is_alive(),'native result missing'
    assert len(result)==1,result
    if isinstance(result[0],BaseException): raise result[0]
    return result[0]

def record(key):
    name=hashlib.sha256(key.encode()).hexdigest()
    return adb('shell','run-as',PACKAGE,'cat','no_backup/One.ProtectedStore/'+name+'.json').encode()

mode=sys.argv[1]
if mode=='prepare':
    expect(command('missing-get','getItem','missing'),value=None)
    expect(command('missing-update','updateItem','missing',value='none'),'rejected','E_PROTECTED_STORE_NOT_FOUND')
    expect(command('missing-delete','deleteItem','missing'))
    expect(command('input-reason','getItem','missing',reason=' '),'rejected','E_PROTECTED_STORE_INPUT')
    expect(command('create-presence','createItem',value='value-presence'))
    expect(command('create-biometry','createItem','biometry','biometryCurrentSet','value-biometry'))
    expect(command('duplicate','createItem',value='replacement'),'rejected','E_PROTECTED_STORE_EXISTS')
    expect(command('mismatch-get','getItem','biometry','userPresence'),'rejected','E_PROTECTED_STORE_POLICY')
    expect(command('mismatch-delete','deleteItem','biometry','userPresence'),'rejected','E_PROTECTED_STORE_POLICY')
elif mode=='positive':
    expect(authenticate('get-presence','getItem'),value='value-presence')
    expect(authenticate('get-biometry','getItem','biometry','biometryCurrentSet'),value='value-biometry')
    expect(authenticate('update-presence','updateItem',value='value-updated'))
    expect(authenticate('read-updated','getItem'),value='value-updated')
elif mode=='cancel':
    prior=record('presence')
    expect(authenticate('cancel-update','updateItem',value='must-not-commit',mode='cancel'),'rejected','E_PROTECTED_STORE_CANCELLED')
    assert record('presence')==prior
    expect(authenticate('destroy-update','updateItem',value='must-not-commit',mode='destroy'),'rejected','E_PROTECTED_STORE_CANCELLED')
    assert record('presence')==prior
    adb('shell','am','broadcast','-n',PACKAGE+'/.ControlReceiver','--es','control','stale')
    assert record('presence')==prior
elif mode=='long':
    value=('Lé漢🙂\n'*1024)
    expect(command('create-long','createItem','long',value=value))
    result=authenticate('get-long','getItem','long')
    assert result['value']==value,result
    result['valueSHA256']=hashlib.sha256(result.pop('value').encode()).hexdigest()
    print(json.dumps(result))
elif mode=='one':
    identifier,operation,key,policy,auth=sys.argv[2:7]
    value=sys.argv[7] if len(sys.argv)>7 else None
    result=command(identifier,operation,key,policy,value) if auth=='none' else authenticate(identifier,operation,key,policy,value,auth)
    print(json.dumps(result,ensure_ascii=False))
elif mode=='snapshot':
    root=snapshot(sys.argv[2])
    print([(n.get('text'),n.get('resource-id'),n.get('bounds')) for n in root.iter('node') if n.get('text')])
else: raise ValueError(mode)
