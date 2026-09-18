import pMap from 'p-map'

type NpmAuthenticationOptions = {
  env: NodeJS.ProcessEnv
  whoami: () => Promise<void>
  login: () => Promise<void>
}

export function isGitHubTrustedPublishingEnvironment(env: NodeJS.ProcessEnv) {
  return (
    env.GITHUB_ACTIONS === 'true' &&
    !!env.ACTIONS_ID_TOKEN_REQUEST_URL &&
    !!env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  )
}

export async function ensureNpmAuthentication({
  env,
  whoami,
  login,
}: NpmAuthenticationOptions) {
  if (isGitHubTrustedPublishingEnvironment(env)) {
    return
  }

  try {
    await whoami()
    return
  } catch {
    try {
      await login()
    } catch {
      // whoami below provides one consistent authentication error
    }
  }

  try {
    await whoami()
  } catch (error) {
    throw new Error(
      `npm is still not authenticated. Run \`npm login\`, confirm \`npm whoami\` succeeds, and then re-run the release.\n\n${error}`
    )
  }
}

export type PublishPackage = {
  name: string
  cwd: string
}

// reads the version document straight from the registry instead of `npm view`.
// `npm view <name>@<version>` fetches the whole packument, which npm caches
// locally and cloudflare caches with a five minute ttl, so a just-published
// version can stay invisible to the poll loop long after the registry accepted
// it: in run 35336058187 all 26 packages missed the 15 minute deadline even
// though the registry had timestamped them minutes earlier. the version
// document endpoint is served dynamic (uncached), so it reflects an accepted
// publish as soon as the registry's own read path does.
export function createNpmVersionProbe(
  version: string,
  options: {
    registry?: string
    fetchImpl?: typeof fetch
  } = {}
): (pkg: PublishPackage) => Promise<boolean> {
  const registry = (
    options.registry ??
    process.env.npm_config_registry ??
    'https://registry.npmjs.org'
  ).replace(/\/+$/, '')
  const fetchImpl = options.fetchImpl ?? fetch

  return async ({ name }) => {
    const url = `${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
    let res: Response
    try {
      res = await fetchImpl(url, {
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      })
    } catch (error) {
      throw new Error(`Could not verify ${name}@${version} on npm:\n${String(error)}`)
    }
    if (res.status === 404) {
      return false
    }
    if (!res.ok) {
      throw new Error(
        `Could not verify ${name}@${version} on npm:\nregistry responded ${res.status}`
      )
    }
    const doc = (await res.json()) as { version?: unknown }
    return doc?.version === version
  }
}

type PublishPackagesOptions<T extends PublishPackage> = {
  packages: T[]
  isPublished: (pkg: T) => Promise<boolean>
  publish: (packages: T[]) => Promise<void>
  verifyTimeoutMs?: number
  verifyIntervalMs?: number
  wait?: (ms: number) => Promise<void>
}

// npm publish returns as soon as the registry accepts a tarball, but the
// version document becomes readable on the registry's own schedule afterwards.
// in run 35299936912 all 26 packages took at least 54 seconds to appear and two
// took over five minutes, well after the publish step had already exited, so a
// single check straight after publishing would fail a release that worked. poll
// instead, with enough headroom that only a real miss reaches the deadline.
const VERIFY_TIMEOUT_MS = 15 * 60_000
const VERIFY_INTERVAL_MS = 15_000

const defaultWait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function publishPackagesWithAuthProbe<T extends PublishPackage>({
  packages,
  isPublished,
  publish,
  verifyTimeoutMs = VERIFY_TIMEOUT_MS,
  verifyIntervalMs = VERIFY_INTERVAL_MS,
  wait = defaultWait,
}: PublishPackagesOptions<T>) {
  const skipped: string[] = []
  const pending: T[] = []

  console.info(`Checking ${packages.length} package versions on npm...`)
  const publishedChecks = await pMap(
    packages,
    async (pkg) => ({ pkg, published: await isPublished(pkg) }),
    { concurrency: 8 }
  )

  for (const { pkg, published } of publishedChecks) {
    if (published) {
      skipped.push(pkg.name)
      console.info(`Skipping ${pkg.name}: this version is already published`)
    } else {
      pending.push(pkg)
    }
  }

  if (pending.length === 0) {
    return { skipped, published: [], failed: [] }
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    console.info(
      'npm will open the browser for 2FA once. Select “do not challenge for the next 5 minutes” before approving so the same short-lived approval can publish the remaining packages.'
    )
  }

  await publish(pending)

  // npm exits 0 for a workspace publish whose per-package result never reached
  // the registry, so the run is not green until the registry says every version
  // is there. this is the gate: anything still missing at the deadline is a
  // failed publish, and the caller turns that into a non-zero exit.
  const missing = new Map(pending.map((pkg) => [pkg.name, pkg]))
  const deadline = Date.now() + verifyTimeoutMs

  console.info(`Verifying ${pending.length} package versions on npm...`)

  while (true) {
    const checks = await pMap(
      [...missing.values()],
      async (pkg) => ({
        pkg,
        // a registry hiccup mid-poll is not a verdict, only the deadline is
        published: await isPublished(pkg).catch(() => false),
      }),
      { concurrency: 8 }
    )

    for (const { pkg, published } of checks) {
      if (published) {
        missing.delete(pkg.name)
      }
    }

    if (missing.size === 0) {
      return { skipped, published: pending.map((pkg) => pkg.name), failed: [] }
    }

    if (Date.now() >= deadline) {
      return {
        skipped,
        published: pending.filter((pkg) => !missing.has(pkg.name)).map((pkg) => pkg.name),
        failed: [...missing.keys()],
      }
    }

    console.info(
      `Waiting for ${missing.size} of ${pending.length} on npm: ${[...missing.keys()].join(', ')}`
    )
    await wait(verifyIntervalMs)
  }
}
