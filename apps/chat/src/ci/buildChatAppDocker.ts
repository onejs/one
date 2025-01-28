import { config } from 'dotenv'
import { buildDockerImage } from './buildDockerImage'
import { exec } from '@actions/exec'
import FSExtra from 'fs-extra'

export async function buildChatAppDocker() {
  config()

  if (!process.env.GITHUB_TOKEN) {
    throw new Error(`no process.env.GITHUB_TOKEN`)
  }

  // we build app locally first
  if (!process.env.SKIP_WEB_BUILD) {
    await exec(`yarn`, [`build:web`])
  }

  // then docker just uses the dist and sets up node modules
  return await buildDockerImage({
    name: `chat-app`,
    releaseVersion: `${Date.now()}`,
    context: '.',
    image: 'Dockerfile',
    githubActor: 'natew',
    githubToken: process.env.GITHUB_TOKEN,
  })
}

async function run() {
  const { latest, specific } = await buildChatAppDocker()
  console.info(`Built:`, latest, specific)
  await FSExtra.writeFile('src/ci/LATEST_DOCKER_IMAGE_VERSION', specific)
}

if (process.env.RUN) {
  run()
}
