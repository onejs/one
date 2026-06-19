import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'
import { getStorageItem } from './safeStorage'
import type { Scheme } from './systemScheme'
import {
  getForceScheme,
  setForceScheme,
  setUserScheme,
  useUserScheme,
} from './userScheme'

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
  forceScheme,
}: {
  children: any
  getClassName?: (name: Scheme) => string
  /** Force a default scheme when no user preference is stored. Without this, falls back to system preference. */
  defaultScheme?: Scheme
  /** Lock the scheme to this value. Ignores user preference, system preference, and localStorage. Prevents hydration flicker. */
  forceScheme?: Scheme
}) {
  // set force before hooks so useState initializers return the forced value
  setForceScheme(forceScheme ?? null)

  const { value } = useUserScheme()
  const resolvedValue = forceScheme ?? value

  if (process.env.TAMAGUI_TARGET !== 'native') {
    // when defaultScheme is set and no stored preference, apply it on mount
    useIsomorphicLayoutEffect(() => {
      if (!forceScheme && defaultScheme) {
        if (!getStorageItem(storageKey)) {
          setUserScheme(defaultScheme)
        }
      }
    }, [defaultScheme, forceScheme])

    useIsomorphicLayoutEffect(() => {
      const toAdd = getClassName(resolvedValue)
      const toRemove = getClassName(resolvedValue === 'light' ? 'dark' : 'light')
      const { classList } = document.documentElement
      classList.remove(toRemove)
      if (!classList.contains(toAdd)) {
        classList.add(toAdd)
      }
    }, [getClassName, resolvedValue])
  }

  let scriptContent: string

  if (forceScheme) {
    // forced: just set the class, no localStorage interaction
    scriptContent = `let d = document.documentElement.classList
d.remove('${getClassName('light')}')
d.remove('${getClassName('dark')}')
d.add('${getClassName(forceScheme)}')`
  } else {
    const fallback = defaultScheme
      ? `'${defaultScheme}' === 'dark'`
      : `window.matchMedia('(prefers-color-scheme: dark)').matches`

    const seedStorage = defaultScheme
      ? `;if(!e){localStorage.setItem('${storageKey}','${defaultScheme}')}`
      : ''

    // localStorage access throws when storage is blocked - guard so the theme
    // still applies (falling back to system/default) instead of erroring
    scriptContent = `let d = document.documentElement.classList
d.remove('${getClassName('light')}')
d.remove('${getClassName('dark')}')
let e = null
try { e = localStorage.getItem('${storageKey}')${seedStorage} } catch (_e) {}
let t = 'system' === e || !e
  ? ${fallback}
  : e === 'dark'
t ? d.add('${getClassName('dark')}') : d.add('${getClassName('light')}')`
  }

  return (
    <>
      {process.env.TAMAGUI_TARGET === 'native' ? null : (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: scriptContent }}
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
  const forced = getForceScheme()

  const scriptContent = forced
    ? `document.getElementById('vxrn-theme-color').setAttribute('content','${forced === 'dark' ? darkColor : lightColor}')`
    : `let dc = document.getElementById('vxrn-theme-color')
let e1 = null
try { e1 = localStorage.getItem('${storageKey}') } catch (_e) {}
let isD = 'system' === e1 || !e1 ? window.matchMedia('(prefers-color-scheme: dark)').matches : e1 === 'dark'
dc.setAttribute('content', isD ? '${darkColor}' : '${lightColor}')`

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
        dangerouslySetInnerHTML={{ __html: scriptContent }}
      />
    </>
  )
}
