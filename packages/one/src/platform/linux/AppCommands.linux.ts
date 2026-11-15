import { createAppCommands } from '../desktop/createAppCommands'
import type { AppCommandConfig } from '../desktop/appCommandTypes'

export type LinuxAppCommandConfig = Omit<AppCommandConfig, 'toolbar'>
export const AppCommands = createAppCommands<LinuxAppCommandConfig>('OneLinuxAppCommands', 'oneLinuxAppCommand')
export type OneLinuxAppCommands = typeof AppCommands
