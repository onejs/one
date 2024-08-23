import { vxs } from 'vxs/vite'
import type { UserConfig } from 'vite'

export default {
  define: {
    'process.env.TAMAGUI_REACT_19': '"1"',
  },

  resolve: {
    alias: {
      '~': import.meta.dirname,
      'react-native-svg': '@tamagui/react-native-svg',
    },
  },

  plugins: [
    vxs({
      // app: {
      //   key: 'test',
      // },
    }),
    // tamaguiPlugin(),
    // tamaguiExtractPlugin(),
  ],
} satisfies UserConfig
