import Docker from '@onreza/docker-api-typescript'
import { load } from 'js-yaml'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { objectEntries, objectFromEntries } from './typeHelpers'

const docker = new Docker({ socketPath: '/var/run/docker.sock' })

export async function getContainers() {
  return await docker.containers.containerList().readBody()
}

export async function getDockerComposeContainers() {
  const composePath = join(process.cwd(), 'docker-compose.yml')
  const compose = await parseDockerComposeYAML(composePath)
  const containers = await getContainers()

  return objectEntries(compose.services).map(([name, service]) => {
    return {
      name,
      ...service,
      instance: containers.find((container) => {
        return (
          container.Labels?.['com.docker.compose.project.config_files'] === composePath &&
          container.Labels?.['com.docker.compose.service'] === name
        )
      }),
    }
  })
}

interface DockerComposeConfig {
  version: string
  services: Record<string, ServiceConfig>
  networks?: Record<string, NetworkConfig>
  volumes?: Record<string, VolumeConfig>
  secrets?: Record<string, SecretConfig>
  configs?: Record<string, ConfigConfig>
}

interface ServiceConfig {
  image?: string
  build?: {
    context?: string
    dockerfile?: string
    args?: Record<string, string>
    target?: string
  }
  command?: string | string[]
  container_name?: string
  deploy?: {
    mode?: 'replicated' | 'global'
    replicas?: number
    resources?: {
      limits?: { cpus?: string; memory?: string }
      reservations?: { cpus?: string; memory?: string }
    }
  }
  environment?: Record<string, string> | string[]
  env_file?: string | string[]
  expose?: number[]
  ports?: string[]
  volumes?: string[]
  networks?: string[]
  depends_on?: string[]
  restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped'
  healthcheck?: {
    test: string | string[]
    interval?: string
    timeout?: string
    retries?: number
    start_period?: string
  }
}

interface NetworkConfig {
  driver?: 'bridge' | 'overlay' | 'host' | 'none'
  driver_opts?: Record<string, string>
  attachable?: boolean
  enable_ipv6?: boolean
  internal?: boolean
  labels?: Record<string, string>
}

interface VolumeConfig {
  driver?: string
  driver_opts?: Record<string, string>
  external?: boolean
  labels?: Record<string, string>
}

interface SecretConfig {
  file?: string
  external?: boolean
  name?: string
}

interface ConfigConfig {
  file?: string
  external?: boolean
  name?: string
}

export async function parseDockerComposeYAML(filePath: string): Promise<DockerComposeConfig> {
  const fileContents = readFileSync(filePath, 'utf8')
  const parsedYaml = load(fileContents) as DockerComposeConfig

  if (!parsedYaml.services || Object.keys(parsedYaml.services).length === 0) {
    throw new Error('At least one service is required')
  }

  return parsedYaml
}
