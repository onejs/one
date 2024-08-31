import { useEffect, useLayoutEffect } from 'react'

// on native + client its a layout, if ssr its regular effect
export const useIsomorphicLayoutEffect =
  process.env.TAMAGUI_TARGET === 'native' || typeof window !== 'undefined'
    ? useLayoutEffect
    : useEffect
