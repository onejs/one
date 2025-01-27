import { config } from 'dotenv'
import { buildDockerImage } from './buildDockerImage'
import { exec } from '@actions/exec'

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
    context: '.',
    image: 'Dockerfile',
    githubActor: 'natew',
    githubToken: process.env.GITHUB_TOKEN,
  })
}

if (process.env.RUN) {
  buildChatAppDocker().then((res) => {
    console.info(`Built:`, res)
  })
}
