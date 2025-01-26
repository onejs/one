import { info, setFailed } from '@actions/core'
import { exec } from '@actions/exec'

export async function buildDockerImage({
  image,
  context,
  githubActor,
  githubToken,
}: { image: string; context: string; githubActor: string; githubToken: string }) {
  const imageName = 'ghcr.io/your-github-username/your-repo-name/chat-app'
  const tag = 'latest'

  try {
    // Log in to GitHub Container Registry
    await exec('docker', ['login', ' ', '-u', githubActor, '-p', githubToken])

    // Build the Docker image
    await exec('docker', ['build', '-f', image, '-t', `${imageName}:${tag}`, context])

    // Push the Docker image to GHCR
    await exec('docker', ['push', `${imageName}:${tag}`])

    info(`Successfully pushed ${imageName}:${tag} to GHCR`)

    return `${imageName}:${tag}`
  } catch (error) {
    setFailed(`Failed to build and push Docker image: ${(error as any).message}`)
    throw error
  }
}
