import { parentPort } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import { ESModulesEvaluator, ModuleRunner, RemoteRunnerTransport } from 'vite/module-runner'

if (!parentPort) {
  throw new Error(`No parent port`)
}

const runner = new ModuleRunner(
  {
    root: fileURLToPath(new URL('./', import.meta.url)),
    transport: new RemoteRunnerTransport({
      send: (data) => parentPort!.postMessage(data),
      onMessage: (listener) => parentPort!.on('message', listener),
      timeout: 5000,
    }),
  },
  new ESModulesEvaluator()
)
