import React from 'react'

import type { RouteNode } from '../Route'

// import { Toast, ToastWrapper } from './Toast'

export function SuspenseFallback({ route }: { route: RouteNode }) {
  return null
  // return (
  //   <ToastWrapper>
  //     <Toast filename={route?.contextKey}>Bundling...</Toast>
  //   </ToastWrapper>
  // )
}
