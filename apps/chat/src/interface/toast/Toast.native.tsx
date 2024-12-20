// empty for now

import type { ToastShowOptions } from './types'

export const ToastProvider = ({ children }: { children: any }) => {
  return children
}

export const showToast = (title: string, options?: ToastShowOptions) => {}

export const hideToast = () => {}
