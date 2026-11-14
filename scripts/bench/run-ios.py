#!/usr/bin/env python3
"""Run alternating, process-cold Release apps on one exclusively locked iPhone."""
import argparse
import fcntl
import json
import os
import re
import selectors
from pathlib import Path
import subprocess
import time
from report import parse_lines, report


def command(argv, timeout=120):
    return subprocess.run(argv, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout).stdout


def capture_console(argv, log, timeout, stop_on_done):
    deadline = time.monotonic() + timeout
    terminal = None
    pending = b''
    with subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.STDOUT) as process, selectors.DefaultSelector() as events, log.open('wb') as stream:
        events.register(process.stdout, selectors.EVENT_READ)
        try:
            while terminal is None or not stop_on_done:
                remaining = deadline - time.monotonic()
                if remaining <= 0 or not events.select(remaining):
                    raise subprocess.TimeoutExpired(argv, timeout)
                chunk = os.read(process.stdout.fileno(), 65536)
                if not chunk:
                    return process.wait(timeout=max(.01, deadline - time.monotonic()))
                stream.write(chunk)
                stream.flush()
                pending += chunk
                lines = pending.split(b'\n')
                pending = lines.pop()
                for line in lines:
                    marker = re.search(rb'(?:^|\s)BENCH_(DONE|ERROR)(?:\s|$)', line)
                    if marker and (terminal is None or marker[1] == b'ERROR'):
                        terminal = marker[1]
            return 0 if terminal == b'DONE' else 1
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device', required=True, help='devicectl UDID')
    parser.add_argument('--device-name', required=True)
    parser.add_argument('--os', required=True)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--app', action='append', required=True, help='engine=/absolute/path/App.app')
    parser.add_argument('--runs', type=int, default=10)
    parser.add_argument('--timeout', type=int, default=180)
    parser.add_argument('--cooldown', type=float, default=10)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--lock', type=Path, default=Path.home() / 'builders/.scratch/bun-aot-rn/iphone.lock')
    parser.add_argument('--stop-on-done', action='store_true', help='stop console capture on BENCH_DONE or BENCH_ERROR; the next launch terminates any remaining app')
    parser.add_argument('--launch-arg', action='append', default=[], help='additional app argument; use = for flags')
    args = parser.parse_args()
    apps = []
    for spec in args.app:
        engine, app = spec.split('=', 1)
        app = Path(app).resolve(strict=True)
        recorded_commit = (app.parent / 'commit.txt').read_text().strip()
        if recorded_commit != args.commit:
            parser.error(f'build commit mismatch for {app}: {recorded_commit}')
        bundle = command(['/usr/libexec/PlistBuddy', '-c', 'Print :CFBundleIdentifier', str(app / 'Info.plist')]).strip()
        apps.append((engine, app, bundle))
    if args.runs < 1 or len({engine for engine, _, _ in apps}) != len(apps):
        parser.error('positive run count and distinct engines required')
    args.out.mkdir(parents=True, exist_ok=False)
    args.lock.parent.mkdir(parents=True, exist_ok=True)
    metadata = dict(device=args.device_name, udid=args.device, os=args.os, commit=args.commit, runs=args.runs,
                    method='Release · alternating engines · process-cold launches · warm OS caches · no debugger',
                    apps=[dict(engine=e, path=str(p), bundle=b) for e, p, b in apps])
    (args.out / 'manifest.json').write_text(json.dumps(metadata, indent=2))
    rows = []
    environments = []
    with args.lock.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        installed = {}
        for run in range(args.runs):
            order = apps if run % 2 == 0 else list(reversed(apps))
            for engine, app, bundle in order:
                if installed.get(bundle) != engine:
                    receipt = command(['xcrun', 'devicectl', 'device', 'install', 'app', '--device', args.device, str(app)], timeout=300)
                    (args.out / f'{run:02d}-{engine}-install.log').write_text(receipt)
                    installed[bundle] = engine
                time.sleep(args.cooldown)
                argv = ['xcrun', 'devicectl', 'device', 'process', 'launch', '--device', args.device,
                        '--terminate-existing', '--console', bundle, '--', '--bench', '--bench-run', str(run), *args.launch_arg]
                log = args.out / f'{run:02d}-{engine}.log'
                returncode = capture_console(argv, log, args.timeout, args.stop_on_done)
                text = log.read_text()
                if returncode or 'BENCH_DONE' not in text or 'BENCH_ERROR' in text:
                    raise RuntimeError(f'incomplete run: {log} (exit {returncode})')
                for line in text.splitlines():
                    if 'BENCH_META ' in line:
                        environment = json.loads(line.split('BENCH_META ', 1)[1])
                        if environment.get('engine', engine) != engine:
                            raise ValueError(f'metadata engine mismatch: {environment}')
                        environments.append(dict(environment, engine=engine, run=run))
                        if environment.get('os') != args.os:
                            raise ValueError(f'OS label mismatch: {environment}')
                metadata['environments'] = environments
                samples = parse_lines(text)
                if not samples or any(row['engine'] != engine or str(row['run']) != str(run) for row in samples):
                    raise ValueError(f'engine/run mismatch or empty run: {log}')
                signature = {(r['app'], r['case'], r['metric'], r['unit']) for r in samples}
                if rows and signature != {(r['app'], r['case'], r['metric'], r['unit']) for r in rows}:
                    raise ValueError(f'case coverage changed: {log}')
                rows.extend(samples)
                report(rows, args.out / 'charts', metadata)
    print(f'Completed {args.runs * len(apps)} launches: {args.out / "charts/index.html"}')


if __name__ == '__main__':
    main()
