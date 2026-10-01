#!/usr/bin/env python3
"""Manual integration actions for the claimed simulator; no appearance tests.

AXe's full tree excludes remote extension windows on this SDK. Point hit tests
return the extension's real PID/AX controls, so capture accepts explicit points
chosen after inspecting a screenshot. Coordinates are simulator points.
"""
import argparse
import json
import pathlib
import plistlib
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--udid', required=True)
parser.add_argument('--axe', default='/opt/homebrew/Cellar/xcodebuildmcp/2.7.0/libexec/bundled/axe')
sub = parser.add_subparsers(dest='action', required=True)
control = sub.add_parser('control'); control.add_argument('json')
capture = sub.add_parser('capture'); capture.add_argument('name'); capture.add_argument('--point', action='append', default=[])
tap = sub.add_parser('tap'); tap.add_argument('x'); tap.add_argument('y')
type_text = sub.add_parser('type'); type_text.add_argument('text')
sub.add_parser('disk')
args = parser.parse_args()
evidence = pathlib.Path(__file__).parent / 'evidence'

def run(*command):
    return subprocess.check_output(command)

def group():
    root = pathlib.Path.home() / 'Library/Developer/CoreSimulator/Devices' / args.udid / 'data/Containers/Shared/AppGroup'
    for metadata in root.glob('*/.com.apple.mobile_container_manager.metadata.plist'):
        if plistlib.loads(metadata.read_bytes()).get('MCMMetadataIdentifier') == 'group.dev.one.sharetargetharness':
            return metadata.parent
    raise RuntimeError('Harness app group has not been created on this simulator')

if args.action == 'control':
    payload = json.loads(args.json)
    assert isinstance(payload, dict) and all(isinstance(value, bool) for value in payload.values())
    destination = group() / 'controls.json'
    pending = destination.with_suffix('.pending')
    pending.write_text(json.dumps(payload))
    pending.replace(destination)  # directory write event releases the gate
elif args.action == 'capture':
    destination = evidence / args.name
    run('xcrun', 'simctl', 'io', args.udid, 'screenshot', str(destination.with_suffix('.png')))
    run('cwebp', '-quiet', '-q', '90', str(destination.with_suffix('.png')), '-o', str(destination.with_suffix('.webp')))
    destination.with_suffix('.png').unlink()
    snapshots = [json.loads(run(args.axe, 'describe-ui', '--udid', args.udid))]
    for point in args.point:
        snapshots.append(json.loads(run(args.axe, 'describe-ui', '--udid', args.udid, '--point', point)))
    destination.with_suffix('.ax.json').write_text(json.dumps(snapshots, indent=2))
elif args.action == 'tap':
    run(args.axe, 'tap', '--udid', args.udid, '-x', args.x, '-y', args.y, '--post-delay', '1')
elif args.action == 'type':
    run(args.axe, 'key-combo', '--udid', args.udid, '--modifiers', '227', '--key', '4')
    run(args.axe, 'type', '--udid', args.udid, args.text)
elif args.action == 'disk':
    root = group()
    payload = {'drafts': [json.loads(p.read_text()) for p in root.glob('OneShareTarget/Drafts/*/draft.json')],
               'receipts': {p.name: p.read_text() for p in root.glob('*.receipt')}}
    print(json.dumps(payload, indent=2))
