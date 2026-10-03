import { VirtualList } from '~/interface/ui/lists/VirtualList'
import { useBottomTabBarHeight } from './bottomTabBarHeight'
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
 * native safe-area behavior lives in PageVirtualList.native.tsx; ordinary
 * collections use PageScrollView and map instead. the fixed web tab bar is
 * cleared here, inside the list's own content, for the reason spelled out in
 * interface/layout/bottomTabBarHeight.
 */
export function PageVirtualList<Item>({
  contentPaddingBottom = 0,
  contentPaddingTop = 0,
  ...props
}: PageVirtualListProps<Item>) {
  const bottomTabBarHeight = useBottomTabBarHeight()

  return (
    <VirtualList
      {...props}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom + bottomTabBarHeight,
      }}
    />
  )
}
