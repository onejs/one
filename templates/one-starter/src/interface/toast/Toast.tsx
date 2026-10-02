import { Toast, toast } from '@tamagui/toast'
import type { ReactNode } from 'react'
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toast position="top-center" duration={3000}>
        <Toast.Viewport>
          <Toast.List />
        </Toast.Viewport>
      </Toast>
    </>
  )
}
export function showToast(
  title: string,
  options: {
    type?: 'error' | 'warn' | 'info' | 'success'
    message?: string
    duration?: number
  } = {}
) {
  const { type, message, ...rest } = options
  const details = {
    ...rest,
    description: message,
  }
  if (type === 'error') return toast.error(title, details)
  if (type === 'warn') return toast.warning(title, details)
  if (type === 'success') return toast.success(title, details)
  if (type === 'info') return toast.info(title, details)
  return toast(title, details)
}
