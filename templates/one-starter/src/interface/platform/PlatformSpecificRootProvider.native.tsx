import type { ReactNode } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
export function PlatformSpecificRootProvider({ children }: { children: ReactNode }) {
  return (
    <KeyboardProvider>
      <GestureHandlerRootView
        style={{
          flex: 1,
        }}
      >
        {children}
      </GestureHandlerRootView>
    </KeyboardProvider>
  )
}
