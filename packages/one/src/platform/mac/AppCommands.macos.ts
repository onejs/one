// native menu bar and key equivalent commands. the config shape matches
// react-native-gpui's AppCommands, so one command table serves both hosts.
import { createAppCommands } from '../desktop/createAppCommands'
export type { AppCommandBinding, AppCommandMenuItem, AppCommandMenu, AppCommandConfig, AppCommandToolbarItem, AppCommandListener } from '../desktop/appCommandTypes'

export const AppCommands = createAppCommands('OneMacAppCommands', 'oneMacAppCommand')

export type OneMacAppCommands = typeof AppCommands
