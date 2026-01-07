import colors from 'picocolors'
import type { Logger, ResolvedServerUrls } from 'vite'

export function printServerUrls(
  urls: ResolvedServerUrls,
  options: {} = {},
  info: Logger['info']
): void {
  const colorUrl = (url: string) =>
    colors.cyan(url.replace(/:(\d+)\//, (_, port) => `:${colors.bold(port)}/`))
  for (const url of urls.local) {
    info(`  ${colors.green('➜')}  ${colors.bold('Local')}:   ${colorUrl(url)}`)
  }
  for (const url of urls.network) {
    info(`  ${colors.green('➜')}  ${colors.bold('Network')}: ${colorUrl(url)}`)
  }
  // if (urls.network.length === 0 && optionsHost === undefined) {
  //   info(
  //     colors.dim(`  ${colors.green('➜')}  ${colors.bold('Network')}: use `) +
  //       colors.bold('--host') +
  //       colors.dim(' to expose')
  //   )
  // }
}
