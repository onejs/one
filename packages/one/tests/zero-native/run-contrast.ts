import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const consumer = process.env.ONE_ZERO_CONTRAST_ROOT
const driver = process.env.ONE_ZERO_DRIVER
if (!consumer || !driver)
  throw new Error(
    'Set ONE_ZERO_CONTRAST_ROOT to Contrast and ONE_ZERO_DRIVER to a built native driver'
  )
const scratch =
  process.env.ONE_ZERO_TEST_DIR ?? join(homedir(), '.scratch', 'one-zero-native')
mkdirSync(scratch, { recursive: true })
const here = dirname(fileURLToPath(import.meta.url))
const reference = createRequire(join(consumer, 'package.json'))
const output = join(scratch, 'contrast-native-query-probe.mjs')
const esbuild = await import('esbuild')
await esbuild.build({
  entryPoints: [join(here, 'contrast-probe.ts')],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  nodePaths: [join(consumer, 'node_modules')],
  alias: {
    '~': join(consumer, 'src'),
    '@rocicorp/zero': reference.resolve('@rocicorp/zero'),
    '@rocicorp/zero/react': reference.resolve('@rocicorp/zero/react'),
    '@rocicorp/zero/bindings': reference.resolve('@rocicorp/zero/bindings'),
    'native-zero-consumer/schema': join(consumer, 'src/data/generated/schema.ts'),
    'native-zero-consumer/grouped-queries': join(
      consumer,
      'src/data/generated/groupedQueries.ts'
    ),
    'native-zero-consumer/mobile-manifest': join(
      consumer,
      'src/data/mobileSyncManifest.ts'
    ),
    'native-zero-consumer/instance-tables': join(
      consumer,
      'src/data/generated/instanceTables.ts'
    ),
  },
  banner: {
    js: 'import {createRequire as __createRequire} from "node:module";const require=__createRequire(import.meta.url);',
  },
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env.VITE_ENVIRONMENT': '"client"',
  },
})
const result = spawnSync(process.execPath, [output], {
  stdio: 'inherit',
  env: { ...process.env, ONE_ZERO_TEST_DIR: scratch, ONE_ZERO_DRIVER: driver },
})
process.exit(result.status ?? 1)
