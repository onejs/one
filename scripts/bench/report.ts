#!/usr/bin/env bun
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

export type Sample = {
  app: string
  engine: string
  case: string
  metric: string
  value: number
  unit: string
  run: string | number
}
export type Metadata = Record<string, unknown>
type Summary = Omit<Sample, 'run' | 'value'> & {
  n: number
  median: number
  p25: number
  p75: number
  minimum: number
  maximum: number
}
const fields = ['app', 'engine', 'case', 'metric', 'unit'] as const
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  )

export function parseLines(text: string): Sample[] {
  return text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/BENCH (\{.*\})/)
    if (!match) return []
    const row = JSON.parse(match[1])
    for (const key of [...fields, 'run']) {
      if (!['string', 'number'].includes(typeof row[key]))
        throw new Error(`invalid ${key}: ${match[1]}`)
    }
    if (typeof row.value !== 'number' || !Number.isFinite(row.value) || row.value < 0)
      throw new Error(`invalid value: ${match[1]}`)
    return [row as Sample]
  })
}

function percentile(values: number[], fraction: number) {
  const position = (values.length - 1) * fraction
  const low = Math.floor(position)
  return values[low] + (values[Math.ceil(position)] - values[low]) * (position - low)
}

export function report(rows: Sample[], output: string, metadata: Metadata): Summary[] {
  mkdirSync(output, { recursive: true })
  const groups = new Map<string, Sample[]>()
  const seen = new Set<string>()
  const checksums = new Map<string, number>()
  for (const row of rows) {
    const key = JSON.stringify(fields.map((field) => String(row[field])))
    const identity = JSON.stringify([key, String(row.run)])
    if (seen.has(identity)) throw new Error(`duplicate sample: ${identity}`)
    seen.add(identity)
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
    if (row.metric === 'checksum') {
      const workload = JSON.stringify([row.app, row.case, row.unit])
      if (checksums.has(workload) && checksums.get(workload) !== row.value)
        throw new Error(`unequal workload checksums: ${workload}`)
      checksums.set(workload, row.value)
    }
  }
  if (!groups.size) throw new Error('no BENCH samples')
  const summary: Summary[] = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entries]) => {
      const values = entries.map((row) => row.value).sort((a, b) => a - b)
      const { run, value, ...key } = entries[0]
      return {
        ...key,
        n: values.length,
        median: percentile(values, 0.5),
        p25: percentile(values, 0.25),
        p75: percentile(values, 0.75),
        minimum: values[0],
        maximum: values.at(-1)!,
      }
    })
  writeFileSync(
    join(output, 'raw.json'),
    JSON.stringify({ metadata, samples: rows }, null, 2) + '\n'
  )
  writeFileSync(
    join(output, 'summary.json'),
    JSON.stringify({ metadata, summary }, null, 2) + '\n'
  )
  const panels = new Map<string, Summary[]>()
  for (const entry of summary) {
    if (entry.metric === 'checksum' || entry.unit === 'timestamp-ms') continue
    const key = JSON.stringify([entry.app, entry.case, entry.metric, entry.unit])
    const panel = panels.get(key) ?? []
    panel.push(entry)
    panels.set(key, panel)
  }
  const charts: string[] = []
  for (const [index, [key, entries]] of [...panels.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .entries()) {
    const [app, name, metric, unit] = JSON.parse(key)
    const height = 190 + entries.length * 64
    const scale = 530 / (Math.max(...entries.map((entry) => entry.maximum)) || 1)
    const title = `${app} · ${name} · ${metric}`
    const subtitle = `${metadata.device ?? 'unknown device'} · iOS ${metadata.os ?? '?'} · ${metadata.commit ?? '?'}`
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}">`,
      '<rect width="100%" height="100%" fill="#fff"/>',
      '<g font-family="system-ui, sans-serif" fill="#172033">',
      `<text x="28" y="35" font-size="23">${escape(title)}</text>`,
      `<text x="28" y="65" font-size="15">${escape(subtitle)}</text>`,
    ]
    entries.forEach((entry, offset) => {
      const y = 100 + offset * 64
      const color = entry.engine === 'bun' ? '#2764d9' : '#868e9c'
      const lo = 170 + entry.minimum * scale,
        hi = 170 + entry.maximum * scale
      const q1 = 170 + entry.p25 * scale,
        q3 = 170 + entry.p75 * scale
      svg.push(
        `<text x="28" y="${y + 21}" font-size="18">${escape(entry.engine)}</text>`,
        `<rect x="170" y="${y}" width="${entry.median * scale}" height="30" fill="${color}"/>`,
        `<path d="M${lo},${y + 15} H${hi} M${lo},${y + 8} V${y + 22} M${hi},${y + 8} V${y + 22}" stroke="#111" fill="none"/>`,
        `<path d="M${q1},${y + 15} H${q3}" stroke="#111" stroke-width="5"/>`,
        `<text x="725" y="${y + 21}" font-size="17">${entry.median.toFixed(2)} ${escape(unit)} · n=${entry.n}</text>`
      )
    })
    svg.push(
      `<text x="28" y="${height - 40}" font-size="14">Bar: median · thick line: middle 50% · whiskers: minimum–maximum</text>`,
      `<text x="28" y="${height - 18}" font-size="13">${escape(metadata.method ?? 'Release builds; lower is better for duration and footprint')}</text>`,
      '</g></svg>'
    )
    const filename = `${String(index).padStart(2, '0')}-${[app, name, metric].join('-').replace(/[^a-zA-Z0-9_-]/g, '-')}.svg`
    writeFileSync(join(output, filename), svg.join('\n'))
    charts.push(filename)
  }
  writeFileSync(
    join(output, 'index.html'),
    '<!doctype html><meta charset="utf-8"><title>One iOS benchmarks</title><style>body{margin:20px;background:#eee}img{display:block;width:960px;max-width:100%;margin:20px auto}</style>' +
      charts.map((chart) => `<img src="${escape(chart)}">`).join('')
  )
  return summary
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      device: { type: 'string' },
      os: { type: 'string' },
      commit: { type: 'string' },
    },
  })
  if (
    !values.out ||
    !values.device ||
    !values.os ||
    !values.commit ||
    !positionals.length
  )
    throw new Error(
      'usage: bun report.ts <logs...> --out <dir> --device <label> --os <version> --commit <sha>'
    )
  report(
    positionals.flatMap((log) => parseLines(readFileSync(log, 'utf8'))),
    values.out,
    { device: values.device, os: values.os, commit: values.commit }
  )
}
