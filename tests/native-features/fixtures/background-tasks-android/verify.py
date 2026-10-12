"""assert cold delivery receipts and actual WorkManager terminal states."""
import json
import sqlite3
import sys
from pathlib import Path

root = Path(sys.argv[1])
rows = [json.loads(line) for line in (root / 'background-proof.jsonl').read_text().splitlines()]
js = [dict(json.loads(row['detail']), pid=row['pid'], at=row['at']) for row in rows if row['event'] == 'javascript']

def one(event):
    found = [row for row in js if row['event'] == event]
    assert len(found) == 1, (event, found)
    return found[0]

calendar = one('calendar')['detail']
assert calendar['permission'] == 'fullAccess', calendar
assert [row['identifier'] for row in calendar['pending']] == [calendar['active']], calendar
assert {row['identifier']: row['completed'] for row in calendar['all']} == {calendar['active']: False, calendar['completed']: True}, calendar
assert calendar['invalid'] == 'E_REMINDERS_INPUT', calendar
assert calendar['missing'] == 'E_REMINDERS_NOT_FOUND', calendar
scheduled = one('scheduled')
original_pid = scheduled['pid']
assert (root / 'pid-after-kill.txt').read_text().strip() == '', 'process survived am kill'
assert not any(row['event'] in ['schedule-error', 'unknown-unexpectedly-accepted'] for row in js)
one('unknown-rejected')
before = {item['identifier']: item for item in one('pending-before-cancel')['detail']}
assert set(before) == {'proof.refresh', 'proof.power', 'proof.cancel', 'proof.fail'}, before
after = {item['identifier']: item for item in one('pending-after-cancel')['detail']}
assert set(after) == {'proof.refresh', 'proof.power', 'proof.fail'}, after
assert before['proof.power']['requiresExternalPower'] is True
assert before['proof.refresh']['earliestBeginDateMs'] == scheduled['detail']['earliestBeginDateMs']
handlers = [row for row in js if row['event'] == 'handler']
assert sorted(row['detail']['identifier'] for row in handlers) == ['proof.fail', 'proof.power', 'proof.refresh'], handlers
for row in handlers:
    assert row['pid'] != original_pid, ('warm handler', row)
    assert row['detail']['aborted'] is False, row
    assert not any(other['event'] == 'activity-created' and other['pid'] == row['pid'] for other in rows), ('activity mounted during cold work', row)
    assert not any(other['event'] == 'surface-mounted' and other['pid'] == row['pid'] for other in js), ('React surface mounted during cold work', row)
    expected_kind = 'refresh' if row['detail']['identifier'] == 'proof.refresh' else 'processing'
    assert row['detail']['kind'] == expected_kind, row
    if expected_kind == 'refresh':
        assert row['at'] >= scheduled['detail']['earliestBeginDateMs'], ('early delivery', row)
    else:
        assert row['at'] >= int((root / 'power-enabled-at.txt').read_text()), ('power constraint ignored', row)
assert len({row['detail']['executionId'] for row in handlers}) == 3, 'duplicate execution ID'
assert len([row for row in js if row['event'] == 'surface-mounted']) == 1
connection = sqlite3.connect(root / 'androidx.work.workdb')
actual = dict(connection.execute('select n.name, w.state from WorkName n join WorkSpec w on n.work_spec_id = w.id'))
expected = {'one-background-proof.refresh': 2, 'one-background-proof.power': 2, 'one-background-proof.cancel': 5, 'one-background-proof.fail': 3}
for name, state in expected.items():
    assert actual.get(name) == state, (name, actual)
print(json.dumps({'result': 'PASS', 'scheduled_pid': original_pid, 'cold_pids': sorted({row['pid'] for row in handlers}), 'handlers': len(handlers), 'work_states': actual}, indent=2))
