import { AbortController } from 'abort-controller'
import { createNativeZero } from '../../src/zero/native/nitro'

Object.assign(globalThis, { AbortController })
const report = (
  globalThis as unknown as { report: (text: string, failed?: boolean) => void }
).report
async function run() {
  try {
    await createNativeZero({
      name: 'unavailable-backend',
      schema: { tables: {} },
      mutators: {},
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('requires the op-sqlite SQLite backend')
    ) {
      report(
        JSON.stringify({
          passed: 'Nitro bridge loads without SQLite and rejects native Zero explicitly',
        })
      )
      return
    }
    throw error
  }
  throw new Error('native Zero must reject an unavailable SQLite backend')
}
run().catch((error) => report(JSON.stringify({ failed: String(error) }), true))
