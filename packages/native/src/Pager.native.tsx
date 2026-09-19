import { useControlled } from './controlled'
import { Children, isValidElement, useMemo } from 'react'
import type { PageProps, PagerProps } from './groupTypes'
import NativeTab from './specs/OneNativeTabNativeComponent'
import NativePager from './specs/OneNativePagerNativeComponent'

const PAGE_STYLE = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
} as const

export function Page(_props: PageProps): never {
  throw new Error('Swift.Page must be a direct child of Swift.Pager')
}

// a pager is a tab bar without the bar: keyed React Native pages under a controlled
// selection, swiped rather than tapped. pages reuse the Tab component, so the native
// side mounts them through the same slot machinery.
export function Pager({
  children,
  selection,
  onSelectionChange,
  revision = 0,
  style,
  ...props
}: PagerProps) {
  const controlled = useControlled<{
    selection: string
    eventCount: number
    revision: number
  }>((event) => onSelectionChange(event.selection), revision)
  const pages = useMemo(() => {
    const ids = new Set<string>()
    return Children.toArray(children).map((child) => {
      if (!isValidElement<PageProps>(child) || child.type !== Page) {
        throw new Error('Swift.Pager accepts Swift.Page elements as direct children')
      }
      const { id, testID, children: page } = child.props
      if (!id || ids.has(id)) {
        throw new Error(`Swift.Pager requires unique, nonempty page ids: "${id}"`)
      }
      ids.add(id)
      return { id, testID, children: page }
    })
  }, [children])
  const selected = pages.find((page) => page.id === selection)
  if (!selected) {
    throw new Error(
      `Swift.Pager selection "${selection}" must identify a mounted Swift.Page`
    )
  }

  return (
    <NativePager
      {...props}
      style={[{ flex: 1 }, style]}
      selection={selection}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      onNativePagerSelectionChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
    >
      {pages.map((page) => {
        const visible = page.id === selection
        return (
          <NativeTab
            key={page.id}
            tabId={page.id}
            title=""
            systemImage=""
            badge=""
            tabRole=""
            action={false}
            testID={page.testID}
            style={PAGE_STYLE}
            collapsable={false}
            pointerEvents={visible ? 'auto' : 'none'}
            accessibilityElementsHidden={!visible}
            importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
          >
            {page.children}
          </NativeTab>
        )
      })}
    </NativePager>
  )
}
