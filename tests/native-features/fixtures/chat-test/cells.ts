import { useEffect, useRef, useState } from 'react'
import {
  IndexPath,
  NSCollectionLayoutDimension,
  NSCollectionLayoutGroup,
  NSCollectionLayoutItem,
  NSCollectionLayoutSection,
  NSCollectionLayoutSize,
  NSDiffableDataSourceSnapshot,
  UICollectionView,
  UICollectionViewCompositionalLayout,
  type UICollectionViewDiffableDataSource,
  type UICollectionViewDelegate,
} from 'one/ios/UIKit'
import { One } from 'one'

export type Source = UICollectionViewDiffableDataSource<number, number>

// a full-width list whose rows size themselves from an estimate
export async function makeList(estimate: number): Promise<UICollectionView> {
  const width = await NSCollectionLayoutDimension.fractionalWidth(1)
  const height = await NSCollectionLayoutDimension.estimated(estimate)
  const size = await NSCollectionLayoutSize.init(width, height)
  const item = await NSCollectionLayoutItem.initLayoutSize(size)
  const group = await NSCollectionLayoutGroup.verticalLayoutSizeSubitems(size, [item])
  const section = await NSCollectionLayoutSection.init(group)
  const layout = await UICollectionViewCompositionalLayout.initSection(section)
  return UICollectionView.initFrameCollectionViewLayout(
    { x: 0, y: 0, width: 0, height: 0 },
    layout
  )
}

export interface CellWindow {
  // index range with mounted react content, inclusive
  start: number
  end: number
}

export interface CellStats {
  // cells UIKit showed before their react content was mounted
  blank: number
  displayed: number
}

// builds the collection and its cell source, applies the ids, and keeps react content
// mounted only for items near what UIKit displays when windowed. a display of an item
// outside the window counts as blank, since its cell shows no content until react mounts it
export function useCellList({
  ids,
  estimate,
  windowed,
  overscan,
  startAtEnd,
}: {
  ids: number[]
  estimate: number
  windowed: boolean
  overscan: number
  startAtEnd?: boolean
}) {
  const [collection, setCollection] = useState<UICollectionView | null>(null)
  const [source, setSource] = useState<Source | null>(null)
  const [applied, setApplied] = useState<number[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const initial = startAtEnd ? Math.max(0, ids.length - overscan) : 0
  const [range, setRange] = useState<CellWindow>({
    start: initial,
    end: initial + overscan,
  })
  const stats = useRef<CellStats>({ blank: 0, displayed: 0 })
  const shown = useRef(new Set<number>())
  const rangeRef = useRef(range)
  rangeRef.current = range
  const delegate = useRef<Partial<UICollectionViewDelegate> | null>(null)

  useEffect(() => {
    let active = true
    makeList(estimate).then(
      async (next) => {
        const nextSource = await One.iOS.collectionCellSource(next)
        if (!active) return
        setCollection(next)
        setSource(nextSource)
      },
      (reason: unknown) => active && setError(String(reason))
    )
    return () => {
      active = false
    }
  }, [estimate])

  useEffect(() => {
    if (!collection) return
    const reach = (index: number) => {
      const current = rangeRef.current
      // move the window only once the visible items near its edge, so a steady
      // scroll renders in batches rather than every row
      const low = index - overscan / 2
      const high = index + overscan / 2
      if (low >= current.start && high <= current.end) return
      const visible = [...shown.current]
      const min = Math.min(index, ...visible)
      const max = Math.max(index, ...visible)
      setRange({ start: Math.max(0, min - overscan), end: max + overscan })
    }
    delegate.current = {
      collectionViewWillDisplayForItemAt: (_view, _cell, indexPath) => {
        const index = indexPath.item
        shown.current.add(index)
        stats.current.displayed++
        const current = rangeRef.current
        if (windowed && (index < current.start || index > current.end))
          stats.current.blank++
        if (windowed) reach(index)
      },
      collectionViewDidEndDisplayingForItemAt: (_view, _cell, indexPath) => {
        shown.current.delete(indexPath.item)
      },
    }
    void collection
      .setDelegate(delegate.current)
      .catch((reason: unknown) => setError(String(reason)))
  }, [collection, windowed, overscan])

  useEffect(() => {
    if (!source || !collection) return
    let active = true
    const snapshot = NSDiffableDataSourceSnapshot.init()
    snapshot.appendSections([0])
    snapshot.appendItems(ids, 0)
    source.applyAnimatingDifferences(snapshot, false).then(
      async () => {
        if (!active) return
        if (startAtEnd && ids.length)
          await collection.scrollToItem(
            IndexPath.initItemSection(ids.length - 1, 0),
            ['bottom'],
            false
          )
        setApplied(ids)
      },
      (reason: unknown) => active && setError(String(reason))
    )
    return () => {
      active = false
    }
  }, [source, collection, ids, startAtEnd])

  const resetStats = () => {
    stats.current = { blank: 0, displayed: 0 }
  }
  const mounted = (index: number) =>
    !windowed || (index >= range.start && index <= range.end)

  return {
    collection,
    source,
    ready: applied === ids,
    error,
    range,
    stats,
    resetStats,
    mounted,
  }
}

// scrolls through the whole list in animated steps, the same way every run, so runs compare
export async function sweep(
  collection: UICollectionView,
  count: number,
  step: number,
  down: boolean
) {
  const targets: number[] = []
  for (
    let index = down ? 0 : count - 1;
    down ? index < count : index >= 0;
    index += down ? step : -step
  )
    targets.push(index)
  targets.push(down ? count - 1 : 0)
  for (const index of targets) {
    await collection.scrollToItem(
      IndexPath.initItemSection(index, 0),
      ['centeredVertically'],
      true
    )
    await new Promise((resolve) => setTimeout(resolve, 280))
  }
}
