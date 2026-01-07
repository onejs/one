// For Metro and Expo, we only import types here.
// We use `projectImport` to dynamically import the actual modules
// at runtime to ensure they are loaded from the user's project root.
import type { TerminalReporter as TerminalReporterT, Terminal as TerminalT } from 'metro'
import colors from 'picocolors'

import { projectImport } from './projectImport'

export async function getTerminalReporter(projectRoot: string) {
  const { Terminal, TerminalReporter } = await projectImport<{
    Terminal: typeof TerminalT
    TerminalReporter: typeof TerminalReporterT
  }>(projectRoot, 'metro')

  let metroWelcomeMessagePrinted = false

  const terminal = new Terminal(process.stdout)
  ;(terminal as any)._log = terminal.log
  terminal.log = (message, ...rest) => {
    // Minimal Metro welcome message.
    // See: https://github.com/facebook/metro/blob/v0.82.4/packages/metro/src/lib/TerminalReporter.js#L278-L283
    if (!metroWelcomeMessagePrinted) {
      const match = message.match(/Welcome to Metro.+v(\d+\.\d+\.\d+)/)
      if (match) {
        const version = match[1]
        metroWelcomeMessagePrinted = true
        return (terminal as any)._log(
          colors.dim(`\n  Using Metro Bundler v${version}`),
          ...rest
        )
      }
    }

    return (terminal as any)._log(message, ...rest)
  }

  // See: https://github.com/facebook/metro/blob/v0.82.4/packages/metro/src/lib/TerminalReporter.js
  const terminalReporter = new TerminalReporter(terminal)

  // Do not print a giant Metro logo on start.
  // See: https://github.com/facebook/metro/blob/v0.82.4/packages/metro/src/lib/TerminalReporter.js#L230-L232
  ;(terminalReporter as any)._logInitializing = () => {}

  return terminalReporter
}
