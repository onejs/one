#!/usr/bin/env python3
"""Summarize BENCH JSONL from any app; emit raw JSON, summaries and SVGs."""
import argparse
from collections import defaultdict
import html
import json
import math
from pathlib import Path
import re
import statistics


def parse_lines(text):
    rows = []
    for line in text.splitlines():
        match = re.search(r'BENCH (\{.*\})', line)
        if not match:
            continue
        row = json.loads(match[1])
        for key in ('app', 'engine', 'case', 'metric', 'unit', 'run'):
            if not isinstance(row.get(key), (str, int)) or isinstance(row.get(key), bool):
                raise ValueError(f'invalid {key}: {row}')
        if not isinstance(row.get('value'), (int, float)) or isinstance(row['value'], bool) or not math.isfinite(row['value']) or row['value'] < 0:
            raise ValueError(f'invalid value: {row}')
        rows.append(row)
    return rows


def percentile(values, fraction):
    position = (len(values) - 1) * fraction
    low = int(position)
    high = math.ceil(position)
    return values[low] + (values[high] - values[low]) * (position - low)


def report(rows, output, metadata):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    groups = defaultdict(list)
    seen = set()
    for row in rows:
        key = tuple(str(row[k]) for k in ('app', 'engine', 'case', 'metric', 'unit'))
        identity = (*key, str(row['run']))
        if identity in seen:
            raise ValueError(f'duplicate sample: {identity}')
        seen.add(identity)
        groups[key].append(row['value'])
    if not groups:
        raise ValueError('no BENCH samples')
    checksums = defaultdict(set)
    for row in rows:
        if row['metric'] == 'checksum':
            checksums[(row['app'], row['case'], row['unit'])].add(row['value'])
    for key, values in checksums.items():
        if len(values) != 1:
            raise ValueError(f'unequal workload checksums: {key}: {values}')
    summary = []
    for key, values in sorted(groups.items()):
        values.sort()
        summary.append(dict(zip(('app', 'engine', 'case', 'metric', 'unit'), key), n=len(values), median=statistics.median(values), p25=percentile(values, .25), p75=percentile(values, .75), minimum=min(values), maximum=max(values)))
    (output / 'raw.json').write_text(json.dumps({'metadata': metadata, 'samples': rows}, indent=2) + '\n')
    (output / 'summary.json').write_text(json.dumps({'metadata': metadata, 'summary': summary}, indent=2) + '\n')
    panels = defaultdict(list)
    for row in summary:
        if row['metric'] != 'checksum' and row['unit'] != 'timestamp-ms':
            panels[(row['app'], row['case'], row['metric'], row['unit'])].append(row)
    charts = []
    for index, (key, entries) in enumerate(sorted(panels.items())):
        app, case, metric, unit = key
        width, height = 960, 190 + len(entries) * 64
        maximum = max(entry['maximum'] for entry in entries) or 1
        scale = 530 / maximum
        title = f'{app} · {case} · {metric}'
        subtitle = f"{metadata.get('device', 'unknown device')} · iOS {metadata.get('os', '?')} · {metadata.get('commit', '?')}"
        esc = html.escape
        svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">', '<rect width="100%" height="100%" fill="#fff"/>', '<g font-family="system-ui, sans-serif" fill="#172033">', f'<text x="28" y="35" font-size="23">{esc(title)}</text>', f'<text x="28" y="65" font-size="15">{esc(subtitle)}</text>']
        for offset, entry in enumerate(entries):
            y = 100 + offset * 64
            color = '#2764d9' if entry['engine'] == 'bun' else '#868e9c'
            svg += [f'<text x="28" y="{y + 21}" font-size="18">{esc(entry["engine"])}</text>', f'<rect x="170" y="{y}" width="{entry["median"] * scale:.2f}" height="30" fill="{color}"/>']
            lo, hi = 170 + entry['minimum'] * scale, 170 + entry['maximum'] * scale
            q1, q3 = 170 + entry['p25'] * scale, 170 + entry['p75'] * scale
            svg += [f'<path d="M{lo:.2f},{y+15} H{hi:.2f} M{lo:.2f},{y+8} V{y+22} M{hi:.2f},{y+8} V{y+22}" stroke="#111" fill="none"/>', f'<path d="M{q1:.2f},{y+15} H{q3:.2f}" stroke="#111" stroke-width="5"/>', f'<text x="725" y="{y+21}" font-size="17">{entry["median"]:.2f} {esc(unit)} · n={entry["n"]}</text>']
        svg += [f'<text x="28" y="{height-40}" font-size="14">Bar: median · thick line: middle 50% · whiskers: minimum–maximum</text>', f'<text x="28" y="{height-18}" font-size="13">{esc(metadata.get("method", "Release builds; lower is better for duration and footprint"))}</text>', '</g></svg>']
        filename = f'{index:02d}-' + re.sub(r'[^a-zA-Z0-9_-]', '-', '-'.join(key[:3])) + '.svg'
        (output / filename).write_text('\n'.join(svg))
        charts.append(filename)
    (output / 'index.html').write_text('<!doctype html><meta charset="utf-8"><title>One iOS benchmarks</title><style>body{margin:20px;background:#eee}img{display:block;width:960px;max-width:100%;margin:20px auto}</style>' + ''.join(f'<img src="{html.escape(chart)}">' for chart in charts))
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('logs', nargs='+', type=Path)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--device', required=True)
    parser.add_argument('--os', required=True)
    parser.add_argument('--commit', required=True)
    args = parser.parse_args()
    rows = [row for log in args.logs for row in parse_lines(log.read_text())]
    report(rows, args.out, {'device': args.device, 'os': args.os, 'commit': args.commit})


if __name__ == '__main__':
    main()
