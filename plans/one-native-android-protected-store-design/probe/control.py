import json
import re
import shlex
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

SERIAL = 'emulator-5562'
ROOT = Path(__file__).resolve().parent.parent / 'evidence'

def adb(*args):
    command_args = ['shell', shlex.join(args[1:])] if args and args[0] == 'shell' else list(args)
    command = ['/Users/n8/Library/Android/sdk/platform-tools/adb', '-s', SERIAL, *command_args]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    with (ROOT / 'commands.jsonl').open('a') as out:
        out.write(json.dumps({'epochMs': int(time.time() * 1000), 'command': command, 'exitCode': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr}) + '\n')
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return result.stdout

def snapshot():
    adb('shell', 'uiautomator', 'dump', '/sdcard/probe-ui.xml')
    xml = adb('shell', 'cat', '/sdcard/probe-ui.xml')
    (ROOT / ('ui-' + str(time.time_ns()) + '.xml')).write_text(xml)
    return ET.fromstring(xml)

def tap(node):
    left, top, right, bottom = map(int, re.findall(r'\d+', node.get('bounds')))
    adb('shell', 'input', 'tap', str((left + right) // 2), str((top + bottom) // 2))

mode = sys.argv[1]
if mode == 'snapshot':
    root = snapshot()
    print([(n.get('text'), n.get('resource-id'), n.get('content-desc'), n.get('bounds')) for n in root.iter('node') if n.get('text') or n.get('content-desc') or n.get('class') == 'android.widget.EditText'])
elif mode == 'tap':
    needle = sys.argv[2]
    root = snapshot()
    matches = [n for n in root.iter('node') if needle in [n.get('text'), n.get('resource-id'), n.get('content-desc')]]
    if len(matches) != 1:
        raise ValueError('expected one UI match: ' + needle + '; found ' + str(len(matches)))
    tap(matches[0])
elif mode == 'pin':
    root = snapshot()
    for digit in '246810':
        tap(next(n for n in root.iter('node') if n.get('text') == digit))
    tap(next(n for n in root.iter('node') if n.get('resource-id') == 'com.android.systemui:id/key_enter'))
    snapshot()
elif mode == 'action':
    action, key = sys.argv[2:4]
    policy = sys.argv[4] if len(sys.argv) > 4 else 'userPresence'
    value = sys.argv[5] if len(sys.argv) > 5 else 'probe-value-r59432'
    print(adb('shell', 'am', 'start', '-W', '-n', 'dev.onejs.protectedstoreprobe/.ProbeActivity', '--es', 'action', action, '--es', 'key', key, '--es', 'policy', policy, '--es', 'value', value))
elif mode == 'adb':
    print(adb(*sys.argv[2:]))
else:
    raise ValueError(mode)
