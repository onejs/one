#!/usr/bin/env node
// restore npm trusted publishing (OIDC) on every publishable workspace package.
//
// background: `npm publish --workspaces` walks the packages in order and dies
// on the first one whose trusted publisher is not registered, so a single
// missing package blocks the whole release and leaves the earlier ones already
// published. that is what a partial canary looks like.
//
// the trusted publisher is per package on npmjs.com. `npm trust github` sets one
// package per invocation and each invocation asks for its own one-time password,
// so doing 26 by hand means 26 passkey prompts. this does the web-otp handshake
// once and reuses the token for every request, re-authenticating only if the
// registry actually rejects it.
//
// usage:
//   node scripts/trust-publishers.mjs              # apply
//   node scripts/trust-publishers.mjs --dry-run    # report only, write nothing

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const REGISTRY = 'https://registry.npmjs.org'

// `npm-auth-type: web` is what makes the registry answer a privileged request
// with a browser auth challenge (authUrl + doneUrl) instead of a bare
// `401 {"message":"Unauthorized"}`. without it there is nothing to open.
const BASE_HEADERS = {
  'content-type': 'application/json',
  'npm-auth-type': 'web',
  'npm-command': 'trust',
  'user-agent': 'npm/11.12.1 node/v25.9.0 darwin arm64 workspaces/false',
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DRY_RUN = process.argv.includes('--dry-run')
const argValue = (flag) => {
  const i = process.argv.indexOf(flag)
  return i === -1 ? null : process.argv[i + 1]
}
// every privileged request can burn the one-time password, so a targeted
// repair reads one package for the template and writes only what is named.
const ONLY = (argValue('--only') || '').split(',').map((x) => x.trim()).filter(Boolean)
const TEMPLATE_FROM = argValue('--template-from')

const authToken = (() => {
  const npmrc = join(homedir(), '.npmrc')
  if (!existsSync(npmrc)) throw new Error(`no ~/.npmrc — run \`npm login\` first`)
  const line = readFileSync(npmrc, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('//registry.npmjs.org/:_authToken='))
  if (!line) throw new Error(`no registry.npmjs.org auth token in ~/.npmrc — run \`npm login\` first`)
  return line.slice(line.indexOf('=') + 1).trim()
})()

// the publishable set, derived the same way the release does: every workspace
// package.json that is not marked private.
function publishablePackages() {
  const workspaces = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).workspaces ?? []
  const names = []
  for (const glob of workspaces) {
    const dir = join(ROOT, glob.replace(/^\.\//, '').replace(/\/\*$/, ''))
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir)) {
      const manifest = join(dir, entry, 'package.json')
      if (!existsSync(manifest)) continue
      let json
      try {
        json = JSON.parse(readFileSync(manifest, 'utf8'))
      } catch {
        continue
      }
      if (!json.name || json.private === true) continue
      names.push(json.name)
    }
  }
  return [...new Set(names)].sort()
}

const escapeName = (name) => name.replace('/', '%2f')

let otp = null

async function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref()
}

// npm's web one-time-password handshake: the registry answers a privileged
// request with an authUrl to visit and a doneUrl that returns the token once
// the browser side finishes. 202 means "still waiting", honour its retry-after.
async function webAuth({ authUrl, doneUrl }) {
  console.log(`\n  APPROVE THIS TAB:\n  ${authUrl}\n`)
  await openBrowser(authUrl)
  const deadline = Date.now() + 10 * 60_000
  while (Date.now() < deadline) {
    const res = await fetch(doneUrl, {
      headers: { ...BASE_HEADERS, authorization: `Bearer ${authToken}` },
    })
    if (res.status === 200) {
      const body = await res.json()
      if (!body.token) throw new Error('registry finished auth without returning a token')
      console.log('  authenticated\n')
      return body.token
    }
    if (res.status !== 202) throw new Error(`auth check failed: ${res.status} ${await res.text()}`)
    await sleep(Math.max(1000, Number(res.headers.get('retry-after') || 1) * 1000))
  }
  throw new Error('no approval within 10 minutes')
}

// one request, transparently completing the passkey handshake if the registry
// demands one and retrying with the token it hands back.
async function registryFetch(path, init = {}, { allowAuth = true } = {}) {
  const send = () =>
    fetch(`${REGISTRY}${path}`, {
      ...init,
      headers: {
        ...BASE_HEADERS,
        authorization: `Bearer ${authToken}`,
        ...(otp ? { 'npm-otp': otp } : {}),
        ...init.headers,
      },
    })

  let res = await send()
  if (res.status === 401 && allowAuth && otp) {
    // the otp we hold went stale mid-run; without dropping it the registry
    // answers a bare Unauthorized instead of a fresh challenge.
    otp = null
    res = await send()
  }
  if (res.status === 401 && allowAuth) {
    const body = await res.clone().json().catch(() => ({}))
    if (body.authUrl && body.doneUrl) {
      // re-issuing this same request is what mints a replacement challenge.
      otp = await webAuth(body)
      res = await send()
    }
  }
  return res
}

const matchesGithub = (config, { repository, file }) =>
  config?.type === 'github' &&
  config?.claims?.repository === repository &&
  config?.claims?.workflow_ref?.file === file

async function readTrust(pkg) {
  const res = await registryFetch(`/-/package/${escapeName(pkg)}/trust`, { method: 'GET' })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`GET trust ${pkg}: ${res.status} ${(await res.text()).slice(0, 200)}`)
  const body = await res.json()
  return Array.isArray(body) ? body : body ? [body] : []
}

async function writeTrust(pkg, template) {
  const res = await registryFetch(`/-/package/${escapeName(pkg)}/trust`, {
    method: 'POST',
    body: JSON.stringify([template]),
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

const packages = ONLY.length
  ? [...new Set([TEMPLATE_FROM, ...ONLY].filter(Boolean))]
  : publishablePackages()
console.log(`${packages.length} publishable packages in this workspace\n`)
console.log('reading current trusted publishers (this needs one passkey)...')

const current = new Map()
for (const pkg of packages) {
  current.set(pkg, await readTrust(pkg))
}

// derive the target from the packages that already publish successfully rather
// than hardcoding a workflow name. if they disagree there is nothing safe to
// copy, so stop instead of inventing one.
const existing = [...current.values()].flat().filter((c) => c?.type === 'github')
const shapes = new Map()
for (const c of existing) {
  const repository = c.claims?.repository
  const file = c.claims?.workflow_ref?.file
  if (!repository || !file) continue
  const key = `${repository}::${file}`
  if (!shapes.has(key)) shapes.set(key, { count: 0, sample: c })
  shapes.get(key).count += 1
}

console.log('\ncurrent state:')
for (const pkg of packages) {
  const configs = current.get(pkg)
  const desc = configs.length
    ? configs
        .map((c) =>
          c.type === 'github'
            ? `github ${c.claims?.repository} ${c.claims?.workflow_ref?.file ?? '?'}${c.claims?.environment ? ` env=${c.claims.environment}` : ''}`
            : c.type
        )
        .join(', ')
    : '— none —'
  console.log(`  ${pkg.padEnd(36)} ${desc}`)
}

if (shapes.size === 0) {
  console.error(
    '\nno package has a GitHub trusted publisher yet, so there is no working ' +
      'config to copy. set one package up on npmjs.com first, then re-run this.'
  )
  process.exit(1)
}
if (shapes.size > 1) {
  console.error('\nthe configured packages disagree on repository/workflow:')
  for (const [k, v] of shapes) console.error(`  ${k} (${v.count})`)
  console.error('resolve that by hand before running this.')
  process.exit(1)
}

const [key, { sample }] = [...shapes.entries()][0]
const [repository, file] = key.split('::')
const target = { repository, file }
// the read shape carries server-assigned fields (`id`, `createdAt`, ...) that
// the write API rejects outright, so take an allowlist rather than stripping
// them one at a time. the VALUES still come from a package that really
// publishes, which is the part worth copying: `permissions` in particular is
// required on write and is not something to invent.
const template = Object.fromEntries(
  ['type', 'claims', 'permissions'].filter((k) => sample[k] !== undefined).map((k) => [k, sample[k]])
)
// a POST sends the whole config array, so writing to a package that already
// carries some other trusted publisher would silently drop it. leave those
// alone and say so rather than clobbering someone's deliberate setup.
const needsTarget = packages.filter((pkg) => !current.get(pkg).some((c) => matchesGithub(c, target)))
const wouldClobber = needsTarget.filter((pkg) => current.get(pkg).length > 0)
const missing = needsTarget
  .filter((pkg) => current.get(pkg).length === 0)
  .filter((pkg) => !ONLY.length || ONLY.includes(pkg))

console.log(`\ntarget, copied verbatim from the ${existing.length} package(s) that already work:`)
console.log(JSON.stringify(template, null, 2).split('\n').map((l) => '  ' + l).join('\n'))
console.log(`\n${missing.length} package(s) need it: ${missing.length ? missing.join(', ') : 'none'}`)
if (wouldClobber.length) {
  console.log(
    `\n${wouldClobber.length} package(s) already carry a different trusted publisher and are ` +
      `left untouched: ${wouldClobber.join(', ')}\n` +
      `  set those on npmjs.com by hand so nothing existing is dropped.`
  )
}

if (!missing.length) {
  console.log('\nnothing to do.')
  process.exit(0)
}
if (DRY_RUN) {
  console.log('\n--dry-run, wrote nothing.')
  process.exit(0)
}

console.log('\napplying...')
const failed = []
for (const pkg of missing) {
  try {
    await writeTrust(pkg, template)
    console.log(`  ok    ${pkg}`)
  } catch (err) {
    failed.push([pkg, err.message])
    console.log(`  FAIL  ${pkg} — ${err.message}`)
  }
}

console.log(`\n${missing.length - failed.length}/${missing.length} configured`)
if (failed.length) {
  console.log('\nstill missing:')
  for (const [pkg, msg] of failed) console.log(`  ${pkg}: ${msg}`)
  process.exit(1)
}
console.log('verifying...')
const stillMissing = []
for (const pkg of missing) {
  const configs = await readTrust(pkg)
  if (!configs.some((c) => matchesGithub(c, target))) stillMissing.push(pkg)
}
if (stillMissing.length) {
  console.log(`\nwrote but did not read back: ${stillMissing.join(', ')}`)
  process.exit(1)
}
console.log(`verified ${missing.length}/${missing.length}. release.yml can publish every package now.`)
