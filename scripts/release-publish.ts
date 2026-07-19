import pMap from 'p-map'

export type PublishPackage = {
  name: string
  cwd: string
}

type PublishPackagesOptions<T extends PublishPackage> = {
  packages: T[]
  isPublished: (pkg: T) => Promise<boolean>
  publish: (pkg: T) => Promise<void>
  concurrency?: number
}

export function isNpmAuthError(error: unknown) {
  const message = String(error)
  return /EOTP|E401|ENEEDAUTH|one-time password|two-factor|2FA|authenticator|reauthenticate/i.test(
    message
  )
}

export async function publishPackagesWithAuthProbe<T extends PublishPackage>({
  packages,
  isPublished,
  publish,
  concurrency = 15,
}: PublishPackagesOptions<T>) {
  const skipped: string[] = []
  const pending: T[] = []

  for (const pkg of packages) {
    if (await isPublished(pkg)) {
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
      'npm will open the browser for 2FA. Select “do not challenge for the next 5 minutes” before approving so the remaining packages can publish.'
    )
  }

  const published: string[] = []
  const failed: string[] = []
  const [authPackage, probePackage, ...rest] = pending

  await publish(authPackage)
  published.push(authPackage.name)

  if (probePackage) {
    try {
      await publish(probePackage)
    } catch (error) {
      if (await isPublished(probePackage)) {
        published.push(probePackage.name)
      } else if (!isNpmAuthError(error) && String(error).trim() !== '') {
        throw error
      } else {
        console.error(
          'The second publish was challenged again. Approve 2FA once more and select “do not challenge for the next 5 minutes” before continuing.'
        )
        await publish(probePackage)
        published.push(probePackage.name)
      }
    }
    if (!published.includes(probePackage.name)) {
      published.push(probePackage.name)
    }
  }

  await pMap(
    rest,
    async (pkg) => {
      try {
        await publish(pkg)
        published.push(pkg.name)
      } catch (error) {
        console.error(`Failed to publish ${pkg.name}:`, error)
        failed.push(pkg.name)
      }
    },
    { concurrency }
  )

  return { skipped, published, failed }
}
