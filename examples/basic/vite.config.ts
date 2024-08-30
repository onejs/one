import { vxs } from 'vxs/vite'
import type { DevEnvironmentOptions, UserConfig } from 'vite'

const webEnvironmentOptions: UserConfig = {
  resolve: {
    alias: {
      'react-native-svg': '@tamagui/react-native-svg',
    },
  },
}

export default {
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },

  environments: {
    client: webEnvironmentOptions,
    ssr: webEnvironmentOptions,
  },

  plugins: [
    vxs({}),
    // tamaguiPlugin(),
    // tamaguiExtractPlugin(),
  ],
} satisfies UserConfig
