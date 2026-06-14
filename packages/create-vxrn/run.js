#!/usr/bin/env node

const command = require.resolve('create-vxrn')
const args = process.argv.slice(2)

// use the array form (shell: false) so user-supplied args can't be interpreted by a shell
const result = require('node:child_process').spawnSync('node', [command, ...args], {
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
