import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'
import type { Scheme } from './systemScheme'
import { setUserScheme, useUserScheme } from './userScheme'

// re-export types
export type { Scheme } from './systemScheme'
export type { SchemeSetting, UserScheme } from './userScheme'

// re-export core
export { getSystemScheme, useSystemScheme } from './systemScheme'
export {
  getUserScheme,
  onUserSchemeChange,
  setUserScheme,
  useUserScheme,
} from './userScheme'

const storageKey = 'vxrn-scheme'

export function SchemeProvider({
  children,
  getClassName = (name) => `t_${name}`,
  defaultScheme,
}: {
  children: any
  getClassName?: (name: Scheme) => string
  /** Force a default scheme when no user preference is stored. Without this, falls back to system preference. */
  defaultScheme?: Scheme
}) {
  const { value } = useUserScheme()

  if (process.env.TAMAGUI_TARGET !== 'native') {
    // when defaultScheme is set and no stored preference, apply it on mount
    useIsomorphicLayoutEffect(() => {
      if (defaultScheme && typeof localStorage !== 'undefined') {
        if (!localStorage.getItem(storageKey)) {
          setUserScheme(defaultScheme)
        }
      }
    }, [])

    useIsomorphicLayoutEffect(() => {
      const toAdd = getClassName(value)
      const toRemove = getClassName(value === 'light' ? 'dark' : 'light')
      const { classList } = document.documentElement
      classList.remove(toRemove)
      if (!classList.contains(toAdd)) {
        classList.add(toAdd)
      }
    }, [value])
  }

  const fallback = defaultScheme
    ? `'${defaultScheme}' === 'dark'`
    : `window.matchMedia('(prefers-color-scheme: dark)').matches`

  const seedStorage = defaultScheme
    ? `if(!e){localStorage.setItem('${storageKey}','${defaultScheme}')}`
    : ''

  return (
    <>
      {process.env.TAMAGUI_TARGET === 'native' ? null : (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `let d = document.documentElement.classList
d.remove('${getClassName('light')}')
d.remove('${getClassName('dark')}')
let e = localStorage.getItem('${storageKey}')
${seedStorage}
let t = 'system' === e || !e
  ? ${fallback}
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
        suppressHydrationWarning
        id="vxrn-theme-color"
        name="theme-color"
        content={color ?? (value === 'dark' ? darkColor : lightColor)}
      />
      <script
        suppressHydrationWarning
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
