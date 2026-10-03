import { VirtualList } from '~/interface/ui/lists/VirtualList'
import { useSafeAreaInsets } from 'one'
import { Platform } from 'react-native'
import { useTheme } from 'tamagui'
import { useNativeTabInsetsOwned } from './nativeTabInsets'
import type { ComponentProps } from 'react'

type PageVirtualListProps<Item> = Omit<
  ComponentProps<typeof VirtualList<Item>>,
  'contentContainerStyle'
> & {
  contentPaddingBottom?: number
  contentPaddingTop?: number
}

/**
 * @agent-rule
 * page-level virtualization is reserved for genuinely long or unbounded data.
 * this component keeps those lists clear of native safe areas and owns those
 * insets itself. ordinary collections use PageScrollView and map instead.
 */
export function PageVirtualList<Item>({
  contentPaddingBottom = 0,
  contentPaddingTop = 0,
  ...props
}: PageVirtualListProps<Item>) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const nativeTabsOwnInsets = useNativeTabInsetsOwned()
  // same ownership as PageScrollView: under ios native tabs the automatic
  // adjustment already insets the status-bar overlap.
  const manualTop = nativeTabsOwnInsets && Platform.OS === 'ios' ? 0 : insets.top
  return (
    <VirtualList
      {...props}
      style={[{ flex: 1, backgroundColor: theme.background?.val }, props.style]}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingTop: manualTop + contentPaddingTop,
        paddingBottom: Math.max(insets.bottom, 12) + contentPaddingBottom,
      }}
    />
  )
}
