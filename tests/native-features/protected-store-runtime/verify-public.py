from collections import Counter
import json
from pathlib import Path
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / 'public-entry-evidence'
events = [json.loads(line) for line in (root / 'events.jsonl').read_text().splitlines()]
results = [event for event in events if event.get('event') == 'result']
counts = Counter(event['id'] for event in results)
assert len(results) == 5 and all(count == 1 for count in counts.values()), counts
by_id = {event['id']: event for event in results}
prior = by_id['public-entry-before']
assert prior['outcome'] == 'rejected' and prior['message'] == 'Error: ProtectedStore.createItem needs an iOS or Android build', prior
for identifier in ['public-entry-create', 'public-entry-get', 'public-entry-delete', 'public-entry-missing']:
    assert by_id[identifier]['outcome'] == 'resolved', by_id[identifier]
assert by_id['public-entry-get']['value'] == 'public entry value'
assert by_id['public-entry-missing']['value'] is None
identity = json.loads((root / 'identity.json').read_text())
assert identity['appDoesNotDeclareBiometricPermission'] and identity['libraryPermissionMergedAndGranted']
assert identity['installedAPKMatches'] and identity['nativeBuild']['exitCode'] == 0
assert identity['packageBuild']['exitCode'] == 0 and identity['typecheck']['exitCode'] == 0
print(json.dumps({'passed': True, 'nativeResults': len(results), 'publicRoundTrip': ['create', 'get', 'delete', 'missing get'], 'baselineRejected': True}))
