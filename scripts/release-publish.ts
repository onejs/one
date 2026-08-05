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

type PublishPackagesOptions<T extends PublishPackage> = {
  packages: T[]
  isPublished: (pkg: T) => Promise<boolean>
  publish: (packages: T[]) => Promise<void>
}

export async function publishPackagesWithAuthProbe<T extends PublishPackage>({
  packages,
  isPublished,
  publish,
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

  return { skipped, published: pending.map((pkg) => pkg.name), failed: [] }
}
