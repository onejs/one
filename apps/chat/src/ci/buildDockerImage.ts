import * as exec from '@actions/exec'
import * as core from '@actions/core'

export async function buildDockerImage({
  image,
  context,
  githubActor,
  githubToken,
}: { image: string; context: string; githubActor: string; githubToken: string }) {
  const imageName = 'ghcr.io/your-github-username/your-repo-name/chat-app'
  const tag = 'latest'

  try {
    // Build the Docker image
    await exec.exec('docker', ['build', '-f', image, '-t', `${imageName}:${tag}`, context])

    // Log in to GitHub Container Registry
    await exec.exec('docker', ['login', 'ghcr.io', '-u', githubActor, '-p', githubToken])

    // Push the Docker image to GHCR
    await exec.exec('docker', ['push', `${imageName}:${tag}`])

    core.info(`Successfully pushed ${imageName}:${tag} to GHCR`)
    return `${imageName}:${tag}`
  } catch (error) {
    core.setFailed(`Failed to build and push Docker image: ${(error as any).message}`)
    throw error
  }
}
