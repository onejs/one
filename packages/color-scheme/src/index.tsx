import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'
import type { Scheme } from './systemScheme'
import { useUserScheme } from './userScheme'

// re-export types
export type { Scheme } from './systemScheme'
export type { SchemeSetting, UserScheme } from './userScheme'

// re-export core
export { getSystemScheme, useSystemScheme } from './systemScheme'
export { getUserScheme, onUserSchemeChange, setUserScheme, useUserScheme } from './userScheme'

const storageKey = 'vxrn-scheme'

export function SchemeProvider({
  children,
  getClassName = (name) => `t_${name}`,
}: {
  children: any
  getClassName?: (name: Scheme) => string
}) {
  const { value } = useUserScheme()

  if (process.env.TAMAGUI_TARGET !== 'native') {
    useIsomorphicLayoutEffect(() => {
      const toAdd = getClassName(value)
      const { classList } = document.documentElement
      if (!classList.contains(toAdd)) {
        const toRemove = value === 'light' ? 'dark' : 'light'
        classList.remove(getClassName(toRemove))
        classList.add(toAdd)
      }
    }, [value])
  }

  return (
    <>
      {process.env.TAMAGUI_TARGET === 'native' ? null : (
        <script
          dangerouslySetInnerHTML={{
            __html: `let d = document.documentElement.classList
d.remove('${getClassName('light')}')
d.remove('${getClassName('dark')}')
let e = localStorage.getItem('${storageKey}')
let t = 'system' === e || !e
  ? window.matchMedia('(prefers-color-scheme: dark)').matches
  : e === 'dark'
t ? d.add('${getClassName('dark')}') : d.add('${getClassName('light')}')
`,
          }}
        />
      )}
      {children}
    </>
  )
}

export function MetaTheme({
  color,
  darkColor,
  lightColor,
}: {
  color?: string
  darkColor: string
  lightColor: string
}) {
  const { value } = useUserScheme()

  return (
    <>
      <meta
        itemProp="__deopt"
        suppressHydrationWarning
        id="vxrn-theme-color"
        name="theme-color"
        content={color ?? (value === 'dark' ? darkColor : lightColor)}
      />
      <script
        id="meta-theme-hydrate"
        dangerouslySetInnerHTML={{
          __html: `
let dc = document.getElementById('vxrn-theme-color')
let e1 = localStorage.getItem('${storageKey}')
let isD = 'system' === e1 || !e1 ? window.matchMedia('(prefers-color-scheme: dark)').matches : e1 === 'dark'
dc.setAttribute('content', isD ? '${darkColor}' : '${lightColor}')
`,
        }}
      />
    </>
  )
}
