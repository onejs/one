import {
  type ColorSchemeName,
  setColorScheme,
  useColorScheme as useColorSchemeBase,
  useColorSchemeSetting,
} from '@vxrn/universal-color-scheme'
import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'
import { createContext, useContext, useMemo } from 'react'

export type Scheme = 'light' | 'dark'
export type SchemeSetting = 'system' | 'light' | 'dark'

export { getColorScheme, onColorSchemeChange } from '@vxrn/universal-color-scheme'

const storageKey = 'vxrn-scheme'

export const clearColorSchemeSetting = () => {
  setSchemeSetting('system')
}

const getSetting = (): SchemeSetting =>
  (typeof localStorage !== 'undefined' && (localStorage.getItem(storageKey) as SchemeSetting)) ||
  'system'

const SchemeContext = createContext<{
  setting: SchemeSetting
  scheme: 'light' | 'dark'
}>({
  setting: 'system',
  scheme: 'light',
})

export const useColorScheme = () => {
  const [state] = useColorSchemeBase()
  return [state, setSchemeSetting] as const
}

export function useSchemeSetting() {
  const values = useContext(SchemeContext)
  return [values, setSchemeSetting] as const
}

export function setSchemeSetting(next: SchemeSetting) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, next)
  }
  setColorScheme(next)
}

export function SchemeProvider({
  children,
  // defaults to tamagui-compatible
  getClassName = (name) => `t_${name}`,
}: {
  children: any
  getClassName?: (name: ColorSchemeName) => string
}) {
  const [colorSchemeSetting] = useColorSchemeSetting()
  const [colorScheme] = useColorScheme()

  if (process.env.TAMAGUI_TARGET !== 'native') {
    useIsomorphicLayoutEffect(() => {
      // on startup lets set from localstorage
      setColorScheme(getSetting())

      const toAdd = getClassName(colorScheme)
      const { classList } = document.documentElement
      if (!classList.contains(toAdd)) {
        const toRemove = colorScheme === 'light' ? 'dark' : 'light'
        classList.remove(getClassName(toRemove))
        classList.add(toAdd)
      }
    }, [colorScheme])
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
          let t =
            'system' === e || !e
              ? window.matchMedia('(prefers-color-scheme: dark)').matches
              : e === 'dark'
          t ? d.add('${getClassName('dark')}') : d.add('${getClassName('light')}')
          `,
          }}
        />
      )}
      <SchemeContext.Provider
        value={useMemo(
          () => ({
            scheme: colorScheme,
            setting: colorSchemeSetting,
          }),
          [colorScheme, colorSchemeSetting]
        )}
      >
        {children}
      </SchemeContext.Provider>
    </>
  )
}

export const MetaTheme = ({
  color,
  darkColor,
  lightColor,
}: {
  color: string
  darkColor: string
  lightColor: string
}) => {
  const [colorScheme] = useColorScheme()

  return (
    <>
      {/* itemProp removes hoisting - react wasnt de-duping it properly causing two in DOM */}
      {/* maybe bug in safari or react */}
      <meta
        itemProp="__deopt"
        // because the script below runs before render it actually ruins our nice ssr logic here
        // instead we just avoid the warning its a single tag
        suppressHydrationWarning
        id="vxrn-theme-color"
        name="theme-color"
        content={color ?? (colorScheme === 'dark' ? darkColor : lightColor)}
      />

      {/* ssr compat theme-color */}
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
