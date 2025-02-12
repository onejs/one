import { parentPort, isMainThread, Worker } from 'node:worker_threads'
import type { VXRNOptionsFilled } from './utils/getOptionsFilled'
import { loadEnv } from './exports/loadEnv'
import { getReactNativeBundle } from './utils/getReactNativeBundle'
import { resolvePath } from '@vxrn/resolve'
import {
  type ConfigSubset,
  getResolvedConfig,
  setResolvedConfig,
} from './plugins/getResolvedConfigSubset'

type WorkerCommands = {
  name: 'bundle-react-native'
  arg: {
    options: VXRNOptionsFilled
    platform: 'ios' | 'android'
  }
  returns: string
}

const workerPath = resolvePath('vxrn/worker')

let worker: Worker

export function runOnWorker<Command extends WorkerCommands>(
  name: Command['name'],
  arg: Command['arg']
): Promise<Command['returns']> {
  console.info(`RUN`, name)

  worker ||= new Worker(workerPath, {
    stdout: true,
    stderr: true,
  })

  return new Promise((resolve, reject) => {
    worker.postMessage({ name, arg, _resolvedConfig: getResolvedConfig() })

    worker.on('message', (message: any) => {
      if (message.result) {
        resolve(message.result)
      } else if (message.error) {
        reject(new Error(message.error))
      }
    })

    worker.on('error', (error) => {
      reject(error)
    })

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}

process.on('exit', () => {
  worker?.terminate()
})

if (!isMainThread && parentPort) {
  parentPort.on('message', async (message: WorkerCommands & { _resolvedConfig: ConfigSubset }) => {
    if (message._resolvedConfig) {
      setResolvedConfig(message._resolvedConfig)
    }

    switch (message.name) {
      case 'bundle-react-native': {
        const { options, platform } = message.arg

        try {
          loadEnv('development')
          const bundle = await getReactNativeBundle(options, platform, { mode: 'dev' })
          parentPort!.postMessage({ result: bundle })
        } catch (error: any) {
          parentPort!.postMessage({ error: error.message })
        }

        break
      }
    }
  })
}
