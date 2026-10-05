import base64
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent / 'evidence'
events = [json.loads(line) for line in (root / 'events-final.jsonl').read_text().splitlines() if line]
permission = [json.loads(line) for line in (root / 'events-no-permission.jsonl').read_text().splitlines() if line]
checks = []

def require(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)

def select(action, result):
    return [e for e in events if e['action'] == action and e['result'] == result]

def digest(value):
    return base64.b64encode(hashlib.sha256(value.encode()).digest()).decode()

def state(event):
    return json.loads(event['detail'])

for key in ['presence', 'biometric']:
    require(key + ' creation succeeded without prompt', bool(select('create:' + key, 'created-without-prompt')))
    metadata = [state(e) for e in select('state:' + key, 'observed') if state(e)['aliasPresent']]
    require(key + ' key has zero timeout and no private export', all(m['authRequired'] and m['timeout'] == 0 and not m['privateExportable'] and m['unlockedRequired'] for m in metadata) and bool(metadata))
    require(key + ' unauthenticated decrypt explicitly rejected by keystore', any('KEY_USER_NOT_AUTHENTICATED' in e['detail'] for e in select('unauth:' + key, 'error')))
    for mode in ['same', 'new']:
        require(key + ' rejects ' + mode + ' operation reuse', any('KEY_USER_NOT_AUTHENTICATED' in e['detail'] for e in select('reuse-' + mode + '-operation:' + key, 'blocked')))

require('credential private decrypt recovers original value', any('type=1;valueDigest=' + digest('probe-value-r59432') in e['detail'] for e in select('get:presence', 'authenticated')))
require('biometric private decrypt recovers original value', any('type=2;valueDigest=' + digest('probe-value-r59432') in e['detail'] for e in select('get:biometric', 'authenticated')))
for operation in ['get', 'update', 'delete']:
    require('canceled biometric ' + operation + ' preserves bytes', any('code=10;' in e['detail'] and 'unchanged=true' in e['detail'] for e in select(operation + ':biometric', 'auth-error')))
require('biometric update recovered by fresh read', any('valueDigest=' + digest('changed-value') in e['detail'] for e in select('get:biometric', 'authenticated')))
require('credential update recovered by fresh biometric read', any('type=2;valueDigest=' + digest('presence-next') in e['detail'] for e in select('get:presence', 'authenticated')))

states = select('state:biometric', 'observed')
before_stop = next(e for e in states if e['epochMs'] == 1791181755910)
before_enrollment = next(e for e in states if e['epochMs'] == 1791181798583)
after_enrollment = next(e for e in states if e['epochMs'] == 1791181989423)
require('process restart retains ciphertext and key identity', state(before_stop) == state(before_enrollment))
require('enrollment retains ciphertext and key identity', state(before_enrollment) == state(after_enrollment))
for operation in ['get', 'update']:
    require('enrollment invalidates ' + operation, any(e['epochMs'] > after_enrollment['epochMs'] and 'KeyPermanentlyInvalidatedException' in e['detail'] for e in select(operation + ':biometric', 'error')))
require('invalidated creation rejects replacement', any(e['epochMs'] > after_enrollment['epochMs'] and 'never replace alias' in e['detail'] for e in select('create:biometric', 'error')))
require('invalidated delete has independent fresh policy prompt', any(e['epochMs'] > after_enrollment['epochMs'] and 'crypto=false' in e['detail'] for e in select('delete:biometric', 'prompt-start')))
require('invalidated delete succeeds after fresh biometric authentication', any('type=2;' in e['detail'] and 'recordHash=missing' in e['detail'] for e in select('delete:biometric', 'authenticated')))
require('invalidated delete removes both record and alias', any(state(e) == {'recordHash': 'missing', 'aliasPresent': False} for e in states))
require('explicit delete permits new identity', any(state(e).get('publicHash') and state(e)['publicHash'] != state(after_enrollment)['publicHash'] for e in states if e['epochMs'] > 1791182117000))
require('home cancels pending update and preserves bytes', any('code=10;' in e['detail'] and 'unchanged=true' in e['detail'] and 1791182090000 < e['epochMs'] < 1791182096000 for e in select('update:presence', 'auth-error')))
require('policy metadata cannot weaken key policy for delete', any('metadata disagrees with immutable key policy' in e['detail'] for e in select('delete:integrity', 'error')))
require('tampered ciphertext rejected after authentication', any('AEADBadTagException' in e['detail'] for e in select('get:integrity', 'post-auth-error')))
integrity_states = [state(e) for e in select('state:integrity', 'observed')]
require('tamper precondition changed ciphertext with same key', len(integrity_states) == 3 and integrity_states[0]['recordHash'] != integrity_states[1]['recordHash'] and integrity_states[0]['publicHash'] == integrity_states[1]['publicHash'])
require('tamper failure leaves attempted record and key', integrity_states[1] == integrity_states[2])
require('missing permission discriminated by SecurityException', any(e['action'] == 'get:noperm' and e['result'] == 'error' and 'SecurityException' in e['detail'] and 'USE_BIOMETRIC' in e['detail'] for e in permission))
require('symmetric creation control rejected by keystore', any('KEY_USER_NOT_AUTHENTICATED' in e['detail'] for e in select('aes-negative:presence', 'error')))
require('locked creation rejected without alias or record', bool(select('create:locked', 'error')) and any(state(e) == {'recordHash': 'missing', 'aliasPresent': False} for e in select('state:locked', 'observed')))
for operation, result in [('get', 'missing'), ('delete', 'missing'), ('update', 'not-found')]:
    require('missing ' + operation + ' contract', bool(select(operation + ':missing', result)))
require('no observed unauthenticated positive', all(not e['result'].startswith('UNSAFE') for e in events))

large = json.loads((root / 'long-value.json').read_text())
require('envelope recovers UTF-8 payload larger than RSA capacity', large['utf8Bytes'] > 190 and any('valueDigest=' + large['expectedDigest'] in e['detail'] for e in select('get:' + large['key'], 'authenticated')))

identity = json.loads((root / 'producer-final.json').read_text())
require('both installed APK bytes match built producer artifacts', len([a for a in identity['artifacts'] if a.get('matchesBuiltApk')]) == 2)
source_path = root.parent / 'probe' / 'ProbeActivity.java'
source_receipt = next(a for a in identity['artifacts'] if a.get('path', '').endswith('/probe/ProbeActivity.java'))
require('final probe source matches producer hash', hashlib.sha256(source_path.read_bytes()).hexdigest() == source_receipt['sha256'])
report = {'status': 'pass', 'runtimeEvents': len(events), 'checks': checks, 'limitation': 'API37 emulator SDK protocol only; software securityLevel=0; no One native integration or physical hardware result.'}
(root / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
