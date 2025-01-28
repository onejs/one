import { info, setFailed } from '@actions/core'
import { exec } from '@actions/exec'

export async function buildDockerImage({
  name,
  image,
  context,
  githubActor,
  githubToken,
  releaseVersion,
}: {
  name: string
  image: string
  context: string
  githubActor: string
  githubToken: string
  releaseVersion: string
}) {
  const imageName = `ghcr.io/onejs/one/${name}`
  const latestTag = 'latest'
  const versionTag = releaseVersion

  try {
    await exec('docker', ['login', 'ghcr.io', '-u', githubActor, '-p', githubToken])

    await exec('docker', [
      'build',
      '--platform=linux/amd64',
      '-f',
      image,
      '-t',
      `${imageName}:${latestTag}`,
      context,
    ])

    await exec('docker', ['tag', `${imageName}:${latestTag}`, `${imageName}:${versionTag}`])
    await exec('docker', ['push', `${imageName}:${latestTag}`])
    await exec('docker', ['push', `${imageName}:${versionTag}`])

    info(`Successfully pushed ${imageName}:${latestTag} and ${imageName}:${versionTag} to GHCR`)

    return {
      latest: `${imageName}:${latestTag}`,
      specific: `${imageName}:${versionTag}`,
    }
  } catch (error) {
    setFailed(`Failed to build and push Docker image: ${(error as any).message}`)
    throw error
  }
}
