import type { findNodeHandle as findNodeHandleRN } from 'react-native'

type FindNodeHandleRN = typeof findNodeHandleRN

export const findNodeHandle: FindNodeHandleRN = (componentOrHandle) =>
  componentOrHandle as number | null
