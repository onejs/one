// Isolated to suppress deprecation warning for deep import
// React Native 0.81+ discourages deep imports but doesn't provide official alternative yet
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Types not exported from react-native
export { default as getDevServer } from 'react-native/Libraries/Core/Devtools/getDevServer'
