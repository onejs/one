import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  define: {
    __DEV__: true,
    'process.env.EXPO_OS': JSON.stringify('web'),
  },
  test: {
    include: ['./src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
  resolve: {
    alias: {
      'react-native': resolve(__dirname, 'src/__mocks__/react-native.ts'),
      'react-native-screens': resolve(__dirname, 'src/__mocks__/react-native-screens.ts'),
      '@react-navigation/native-stack': resolve(__dirname, 'src/__mocks__/@react-navigation/native-stack.ts'),
      '@react-navigation/native': resolve(__dirname, 'src/__mocks__/@react-navigation/native.ts'),
      'expo-modules-core': resolve(__dirname, 'src/__mocks__/expo-modules-core.ts'),
      'expo-linking': resolve(__dirname, 'src/__mocks__/expo-linking.ts'),
    },
  },
})
