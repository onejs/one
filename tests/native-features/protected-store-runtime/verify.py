import base64
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / 'evidence'
events = [json.loads(line) for line in (root/'events.jsonl').read_text().splitlines()]
results = {event['id']: event for event in events if event.get('event') == 'result'}
counts = Counter(event['id'] for event in events if event.get('event') == 'result')
checks = []
def check(name, condition):
    assert condition, name
    checks.append(name)
def resolved(identifier, value='unset'):
    event = results[identifier]
    check(identifier, event['outcome'] == 'resolved' and (value == 'unset' or event.get('value') == value))
def rejected(identifier, code):
    event = results[identifier]
    check(identifier, event['outcome'] == 'rejected' and event.get('code') == 'E_PROTECTED_STORE_'+code)

check('every native result settles exactly once', all(count == 1 for count in counts.values()))
commands = [event for event in events if event.get('event') == 'command']
check('only injected process death has no native result', {event['id'] for event in commands} - set(results) == {'orphan-keygen-crash'})
resolved('missing-get', None)
resolved('missing-delete')
rejected('missing-update','NOT_FOUND')
rejected('input-reason','INPUT')
for identifier in ['create-presence','create-biometry','update-presence','name-reuse','orphan-name-reuse','orphan-explicit-delete','invalidated-delete','create-long']:
    resolved(identifier)
for identifier in ['duplicate','invalidated-duplicate','orphan-duplicate']:
    rejected(identifier,'EXISTS')
for identifier in ['mismatch-get','mismatch-delete','metadata-weaken-delete']:
    rejected(identifier,'POLICY')
for identifier,value in [('get-presence','value-presence'),('get-biometry','value-biometry'),('read-updated','value-updated'),('pin-read','value-updated'),('presence-after-enrollment','value-updated'),('name-reuse-get','new-generation'),('orphan-reused-get','new-orphan-value'),('fresh-after-retirement','value-updated'),('active-after-stale','value-updated'),('serialized-read','value-updated'),('cipher-negative','value-updated'),('tamper-restored','value-updated')]:
    resolved(identifier,value)
long_value = 'Lé漢🙂\n'*1024
resolved('get-long',long_value)
check('long UTF-8 is recovered by exact digest', hashlib.sha256(results['get-long']['value'].encode()).hexdigest() == 'd82cb2af70f34a9a1103481499e93c7ee227a952e6fd573dba7f735b85743fac')
for identifier in ['cancel-update','cancel-getItem','cancel-deleteItem','destroy-update','generation-update','home-update','serialized-update','real-success-retired','orphan-cancel','orphan-destroy','orphan-real-success-retired']:
    rejected(identifier,'CANCELLED')
rejected('atomic-failure','WRITE')
rejected('tamper-get','GET')
for operation in ['getItem','updateItem']:
    rejected('invalidated-'+operation,'AUTH')
    rejected('orphan-incomplete-'+('get' if operation == 'getItem' else 'update'),'AUTH')
for operation in ['getItem','updateItem','deleteItem']:
    rejected('locked2-'+operation,'AUTH')
    rejected('locked-orphan-'+operation,'AUTH')
resolved('locked2-missing-getItem',None)
resolved('locked2-missing-deleteItem')
rejected('locked2-missing-updateItem','NOT_FOUND')
resolved('orphan-missing-get',None)
for operation in ['createItem','getItem','updateItem','deleteItem']:
    rejected('manifest-'+operation,'MANIFEST')

log = (root/'final-controls.log').read_text()
for signal in ['same-cipher=true; operation=getItem','same-cipher=true; operation=updateItem','consumed-cipher-rejected=IllegalBlockSizeException','fresh-cipher-rejected=IllegalBlockSizeException','retired-before-success','stale-success-delivered','"queued":1']:
    check('native signal '+signal, signal in log)
check('real stale results were delivered more than once', log.count('stale-success-delivered') >= 3)
prior = json.loads((root/'orphan-key-before.json').read_text())
after = json.loads((root/'orphan-key-after-cancel-destroy-stale.json').read_text())
reused = json.loads((root/'orphan-key-reused.json').read_text())
locked = json.loads((root/'locked-orphan-key.json').read_text())
check('orphan cancellation/destruction/stale success preserves immutable key', prior == after)
check('explicit orphan deletion permits a different key', prior['publicKey'] != reused['publicKey'])
check('locked orphan preserves its key', reused == locked)
check('orphan immutable policy has no auth window', prior['required'] and prior['timeout'] == 0 and prior['types'] == 3 and prior['unlocked'] and not prior['invalidatedByEnrollment'])
check('reported runtime is software security level', prior['securityLevel'] == 0)
for file,count in [('fingerprint-one.txt',1),('fingerprint-two.txt',2)]:
    dump = (root/file).read_text()
    sensor = next(json.loads(line) for line in dump.splitlines() if line.startswith('{"service"'))
    check('positive enrollment '+str(count), sensor['prints'][0]['count'] == count)
check('process death observed after key generation', json.loads((root/'keygen-death.json').read_text())['processAbsentAfterKeygen'])
check('installed production APK matches pullback', json.loads((root/'production-identity.json').read_text())['apkSHA256'] == json.loads((root/'installed-production.json').read_text())['sha256'])
for name in ['locked2-no-prompt','locked-orphan-no-prompt']:
    nodes = list(ET.parse(root/(name+'.xml')).getroot().iter('node'))
    check(name, not any('Protected proof' in node.get('text','') for node in nodes))
for key in ['presence','biometry','orphan','long']:
    record = json.loads((root/(key+'-final-record.json')).read_text())
    check(key+' final envelope', record['version'] == 1 and len(base64.b64decode(record['iv'])) == 12 and len(base64.b64decode(record['wrapped'])) == 256 and len(base64.b64decode(record['ciphertext'])) >= 16)
    check(key+' has only encrypted value fields', set(record) == {'version','identity','generation','policy','publicKey','wrapped','iv','ciphertext'})
report = {'passed':len(checks),'nativeResults':len(results),'events':len(events),'checks':checks,'limits':['API37 software emulator only','production and bounded fault APK identities are distinct','no hardware or API30 device campaign','assigned first-layer and assembled review pending']}
print(json.dumps(report,indent=2))
