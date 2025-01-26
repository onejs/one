import { config } from 'dotenv'
import { buildDockerImage } from './buildDockerImage'

export async function buildChatAppDocker() {
  config()

  if (!process.env.GITHUB_TOKEN) {
    throw new Error(`no process.env.GITHUB_TOKEN`)
  }

  return await buildDockerImage({
    context: '../..',
    image: 'Dockerfile.chat',
    githubActor: 'natew',
    githubToken: process.env.GITHUB_TOKEN,
  })
}

if (process.env.RUN) {
  buildChatAppDocker().then((res) => {
    console.info(`Built:`, res)
  })
}
