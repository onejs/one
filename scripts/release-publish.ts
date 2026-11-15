import { randomUUID } from 'node:crypto'
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

type RegistryFetcher = (url: string, init?: RequestInit) => Promise<Response>

const registryVerificationRun = randomUUID()
const REGISTRY_READ_ATTEMPTS = 3
const REGISTRY_READ_TIMEOUT_MS = 15_000
const REGISTRY_RETRY_INTERVAL_MS = 1_000

class RetryableRegistryReadError extends Error {}

export async function isExactVersionPublishedOnNpm({
  name,
  version,
  attempt,
  fetcher = fetch,
  requestTimeoutMs = REGISTRY_READ_TIMEOUT_MS,
  retryIntervalMs = REGISTRY_RETRY_INTERVAL_MS,
}: {
  name: string
  version: string
  attempt: number
  fetcher?: RegistryFetcher
  requestTimeoutMs?: number
  retryIntervalMs?: number
}) {
  const url = new URL(
    `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
  )
  // positive attempts already belong to the post-publish verification loop.
  const readAttempts = attempt === 0 ? REGISTRY_READ_ATTEMPTS : 1
  // each read, including its body, is bounded. with eight concurrent lookups,
  // 24 packages take at most three batches of (3 * 15s + 2 * 1s).
  for (let readAttempt = 0; readAttempt < readAttempts; readAttempt++) {
    url.searchParams.set(
      'cache-bust',
      `${registryVerificationRun}-${readAttempt}-${attempt}`
    )
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new RetryableRegistryReadError('registry read timed out'))
            controller.abort()
          }, requestTimeoutMs)
        }),
      ])
    } catch (error) {
      if (
        !(error instanceof RetryableRegistryReadError) ||
        readAttempt === readAttempts - 1
      ) {
        throw new Error(`Could not verify ${name}@${version} on npm: ${error}`, {
          cause: error,
        })
      }
    } finally {
      clearTimeout(timer)
    }
    await defaultWait(retryIntervalMs)

    async function read() {
      const response = await fetcher(url.toString(), {
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      }).catch((error) => {
        throw new RetryableRegistryReadError(`registry transport failed: ${error}`)
      })
      if (!response.ok) {
        // only a registry 404 establishes that publishing this version is safe.
        void response.body?.cancel().catch(() => {})
        if (response.status === 404) return false
        const message = `HTTP ${response.status}`
        if ([408, 429, 500, 502, 503, 504].includes(response.status)) {
          throw new RetryableRegistryReadError(message)
        }
        throw new Error(message)
      }

      const metadata: unknown = await response.json().catch((error) => {
        if (error instanceof SyntaxError) throw error
        throw new RetryableRegistryReadError(`registry body read failed: ${error}`)
      })
      if (
        !metadata ||
        typeof metadata !== 'object' ||
        !('version' in metadata) ||
        metadata.version !== version
      ) {
        throw new Error(`invalid registry metadata: expected version ${version}`)
      }
      return true
    }
  }
  throw new Error(`Could not verify ${name}@${version} on npm`)
}

type PublishPackagesOptions<T extends PublishPackage> = {
  packages: T[]
  // packages users install directly. they publish only after every other
  // package is readable on the registry, so latest never names a version whose
  // pinned dependencies are missing.
  isEntry?: (pkg: T) => boolean
  isPublished: (pkg: T) => Promise<boolean>
  verifyPublished?: (pkg: T, attempt: number) => Promise<boolean>
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
// one, which carries the native sources, has taken 17 minutes to appear.
const VERIFY_TIMEOUT_MS = 30 * 60_000
const VERIFY_INTERVAL_MS = 15_000

const defaultWait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function publishPackagesWithAuthProbe<T extends PublishPackage>({
  packages,
  isEntry = () => false,
  isPublished,
  verifyPublished = isPublished,
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

  const waves = [pending.filter((pkg) => !isEntry(pkg)), pending.filter(isEntry)]
  const published: string[] = []
  for (const [index, wave] of waves.entries()) {
    if (wave.length === 0) continue
    await publish(wave)
    const result = await verify(wave)
    published.push(...result.published)
    if (result.failed.length > 0) {
      const unpublished = waves
        .slice(index + 1)
        .flat()
        .map((pkg) => pkg.name)
      return { skipped, published, failed: [...result.failed, ...unpublished] }
    }
  }
  return { skipped, published, failed: [] }

  async function verify(wave: T[]) {
    // npm exits 0 for a workspace publish whose per-package result never reached
    // the registry, so the run is not green until the registry says every version
    // is there. this is the gate: anything still missing at the deadline is a
    // failed publish, and the caller turns that into a non-zero exit.
    const missing = new Map(wave.map((pkg) => [pkg.name, pkg]))
    const deadline = Date.now() + verifyTimeoutMs

    console.info(`Verifying ${wave.length} package versions on npm...`)

    let verifyAttempt = 0
    while (true) {
      verifyAttempt++
      const checks = await pMap(
        [...missing.values()],
        async (pkg) => ({
          pkg,
          // a registry hiccup mid-poll is not a verdict, only the deadline is
          published: await verifyPublished(pkg, verifyAttempt).catch(() => false),
        }),
        { concurrency: 8 }
      )

      for (const { pkg, published } of checks) {
        if (published) {
          missing.delete(pkg.name)
        }
      }

      if (missing.size === 0) {
        return { published: wave.map((pkg) => pkg.name), failed: [] as string[] }
      }

      if (Date.now() >= deadline) {
        return {
          published: wave.filter((pkg) => !missing.has(pkg.name)).map((pkg) => pkg.name),
          failed: [...missing.keys()],
        }
      }

      console.info(
        `Waiting for ${missing.size} of ${wave.length} on npm: ${[...missing.keys()].join(', ')}`
      )
      await wait(verifyIntervalMs)
    }
  }
}
