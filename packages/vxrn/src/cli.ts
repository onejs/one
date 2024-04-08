import { defineCommand, runMain } from 'citty'
import { commands } from './commands'

const main = defineCommand({
  meta: {
    name: 'main',
    version: '0.0.0',
    description: 'Welcome to vxrn',
  },
  subCommands: commands,
})

runMain(main)
