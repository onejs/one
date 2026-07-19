import pMap from 'p-map'

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
