import './src/global.js'
import '../types.generated'
import { AppInput, App, Config } from './src/config.js'
import * as _aws from '@pulumi/aws'

declare global {
  // @ts-expect-error
  export import aws = _aws
  interface Providers {
    providers?: {
      aws?: (_aws.ProviderArgs & { version?: string }) | boolean | string
    }
  }
  export const $config: (
    input: Omit<Config, 'app'> & {
      app(input: AppInput): Omit<App, 'providers'> & Providers
    }
  ) => Config
}
