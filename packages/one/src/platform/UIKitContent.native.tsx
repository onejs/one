import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'
import type {
  UICollectionView,
  UICollectionViewDiffableDataSource,
  UITableView,
  UITableViewDiffableDataSource,
  UIView,
} from 'one/ios/UIKit'
import { callSDK, callSDKAsync } from './sdk/wire'
import NativeContent from './specs/OneNativeContentNativeComponent'
import type { UIKitContentProps, UIKitContentSource } from './types'

// the mount holding each item of a source, so a second mount for an item is rejected
const claims = new WeakMap<object, Map<number, object>>()
const sourceIds = new WeakMap<object, number>()

function sourceId(source: UIKitContentSource) {
  let id = sourceIds.get(source)
  if (id === undefined) {
    id = callSDK<number>('OneNativeViews', 1, null, [source])
    sourceIds.set(source, id)
  }
  return id
}

function duplicate(item: number) {
  return new Error(`Swift.UIKitContent item ${item} already has content in this source`)
}

// react content that UIKit shows: the cell for an item of a cell source, or the view
// onView receives for any UIKit API that takes one. it renders nothing where it sits.
export function UIKitContent({
  onView,
  source,
  item,
  height,
  estimatedHeight,
  children,
  ...props
}: UIKitContentProps) {
  if (source && onView)
    throw new Error('Swift.UIKitContent takes source and item, or onView, not both')
  if (!source && !onView) throw new Error('Swift.UIKitContent needs source and item, or onView')
  if (source && !Number.isInteger(item))
    throw new Error('Swift.UIKitContent source needs an integer item')
  const owner = useRef({}).current
  if (source && claims.get(source)?.get(item!) && claims.get(source)?.get(item!) !== owner)
    throw duplicate(item!)
  // mounts in the same commit render before either claims, so the claim checks again
  useLayoutEffect(() => {
    if (!source) return
    const items = claims.get(source) ?? new Map<number, object>()
    claims.set(source, items)
    const held = items.get(item!)
    if (held && held !== owner) throw duplicate(item!)
    items.set(item!, owner)
    return () => {
      if (items.get(item!) === owner) items.delete(item!)
    }
  }, [source, item, owner])

  const contentId = useMemo(() => callSDK<number>('OneNativeViews', 2, null, []), [])
  const deliver = useRef(onView)
  deliver.current = onView
  const wantsView = !!onView
  useEffect(() => {
    if (!wantsView) return
    let active = true
    // native rejects the read once the content unmounts, which only an inactive effect sees
    void callSDKAsync<UIView>('OneNativeViews', 3, null, [contentId]).then(
      (view) => {
        if (active) deliver.current?.(view)
      },
      (error) => {
        if (active) throw error
      }
    )
    return () => {
      active = false
    }
  }, [contentId, wantsView])

  return (
    <NativeContent
      contentId={contentId}
      sourceId={source ? sourceId(source) : 0}
      item={item ?? 0}
      height={height ?? 0}
      estimatedHeight={estimatedHeight ?? 44}
    >
      <View {...props}>{children}</View>
    </NativeContent>
  )
}

// diffable data sources whose cell provider is native, for UIKitContent items
export function collectionCellSource(
  view: UICollectionView
): Promise<UICollectionViewDiffableDataSource<number, number>> {
  return callSDKAsync('OneNativeViews', 4, null, [view])
}

export function tableCellSource(
  view: UITableView
): Promise<UITableViewDiffableDataSource<number, number>> {
  return callSDKAsync('OneNativeViews', 5, null, [view])
}
