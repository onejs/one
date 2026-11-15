import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'
import {
  NSCollectionLayoutDimension,
  NSCollectionLayoutGroup,
  NSCollectionLayoutItem,
  NSCollectionLayoutSection,
  NSCollectionLayoutSize,
  NSDiffableDataSourceSnapshot,
  UICollectionView,
  UICollectionViewCompositionalLayout,
  UICollectionViewDiffableDataSource,
  UITableView,
  UITableViewDiffableDataSource,
  UIStackView,
  UIView,
} from 'one/ios/UIKit'

// react content inside sdk-built uikit containers: a compositional collection and a
// table show UIKitContent cells through diffable sources, and a stack shows onView
// badges through addArrangedSubview. every container is built through the generated
// bindings and placed by the shared UIKit host.
type CellSource =
  | UICollectionViewDiffableDataSource<number, number>
  | UITableViewDiffableDataSource<number, number>

interface Row {
  id: number
  lines: number
  version: number
}

const sourceWork = new WeakMap<CellSource, Promise<void>>()

function enqueue(source: CellSource, work: () => Promise<void>): Promise<void> {
  const next = (sourceWork.get(source) ?? Promise.resolve()).then(work, work)
  sourceWork.set(source, next)
  return next
}

function seed(first: number, count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: first + index,
    lines: (index % 4) + 1,
    version: 1,
  }))
}

function body(row: Row): string {
  const sentence = 'width-dependent text that reflows when the host narrows'
  return Array.from({ length: row.lines }, () => `${sentence} (v${row.version})`).join(
    ' '
  )
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function makeCollection(): Promise<UICollectionView> {
  const width = await NSCollectionLayoutDimension.fractionalWidth(1)
  const estimate = await NSCollectionLayoutDimension.estimated(64)
  const itemSize = await NSCollectionLayoutSize.init(width, estimate)
  const item = await NSCollectionLayoutItem.initLayoutSize(itemSize)
  const groupSize = await NSCollectionLayoutSize.init(width, estimate)
  const group = await NSCollectionLayoutGroup.verticalLayoutSizeSubitems(groupSize, [
    item,
  ])
  const section = await NSCollectionLayoutSection.init(group)
  const layout = await UICollectionViewCompositionalLayout.initSection(section)
  return UICollectionView.initFrameCollectionViewLayout(
    { x: 0, y: 0, width: 0, height: 0 },
    layout
  )
}

async function makeTable(): Promise<UITableView> {
  const table = await UITableView.initFrameStyle(
    { x: 0, y: 0, width: 0, height: 0 },
    'plain'
  )
  await table.setRowHeight(await UITableView.automaticDimension)
  await table.setEstimatedRowHeight(44)
  return table
}

async function makeStack(): Promise<UIStackView> {
  const stack = await UIStackView.initFrame({ x: 0, y: 0, width: 0, height: 0 })
  await stack.setAxis('vertical')
  await stack.setDistribution('fill')
  await stack.setSpacing(8)
  return stack
}

function applyItems(source: CellSource, ids: number[]): Promise<void> {
  return enqueue(source, async () => {
    const snapshot = NSDiffableDataSourceSnapshot.init()
    snapshot.appendSections([0, 1, 2])
    const count = Math.ceil(ids.length / 3)
    for (let section = 0; section < 3; section++) {
      snapshot.appendItems(ids.slice(section * count, (section + 1) * count), section)
    }
    await source.applyAnimatingDifferences(snapshot, false)
  })
}

async function reconfigureItem(source: CellSource, id: number): Promise<void> {
  return enqueue(source, async () => {
    const snapshot = await source.snapshot()
    snapshot.reconfigureItems([id])
    await source.applyAnimatingDifferences(snapshot, false)
  })
}

function RowBody({
  row,
  prefix,
  onPress,
  fixed,
}: {
  row: Row
  prefix: string
  onPress: () => void
  fixed?: boolean
}) {
  return (
    <View testID={`${prefix}-row-${row.id}`} style={styles.row}>
      <Pressable testID={`${prefix}-press-${row.id}`} onPress={onPress}>
        <Text style={styles.title}>{`row ${row.id} v${row.version}`}</Text>
        <Text>{fixed ? 'Fixed-height React row' : body(row)}</Text>
      </Pressable>
    </View>
  )
}

export default function OneNativeUIKitContent() {
  const [generation, setGeneration] = useState(0)
  const [builtGeneration, setBuiltGeneration] = useState(-1)
  const [collection, setCollection] = useState<UICollectionView | null>(null)
  const [collectionSource, setCollectionSource] =
    useState<UICollectionViewDiffableDataSource<number, number> | null>(null)
  const [collectionRows, setCollectionRows] = useState<Row[]>(() => seed(1, 200))
  const [collectionApplied, setCollectionApplied] = useState<{
    source: CellSource
    rows: Row[]
  } | null>(null)
  const [collectionMounted, setCollectionMounted] = useState(true)
  const [table, setTable] = useState<UITableView | null>(null)
  const [tableSource, setTableSource] = useState<UITableViewDiffableDataSource<
    number,
    number
  > | null>(null)
  const [tableRows, setTableRows] = useState<Row[]>(() => seed(101, 8))
  const [tableApplied, setTableApplied] = useState<{
    source: CellSource
    rows: Row[]
  } | null>(null)
  const [tableMounted, setTableMounted] = useState(true)
  const [stack, setStack] = useState<UIStackView | null>(null)
  const [badges, setBadges] = useState<number[]>([201, 202, 203])
  const stackViews = useRef(new Map<number, UIView>())
  const [pressLog, setPressLog] = useState('none')
  const [pressCount, setPressCount] = useState(0)
  const [narrow, setNarrow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextId = useRef(1000)

  useEffect(() => {
    let active = true
    setError(null)
    setCollection(null)
    setCollectionSource(null)
    setTable(null)
    setTableSource(null)
    setStack(null)
    stackViews.current.clear()
    Promise.all([makeCollection(), makeTable(), makeStack()]).then(
      ([nextCollection, nextTable, nextStack]) => {
        if (!active) return
        setCollection(nextCollection)
        setTable(nextTable)
        setStack(nextStack)
        setBuiltGeneration(generation)
      },
      (error: unknown) => {
        if (active) setError(`view error ${message(error)}`)
      }
    )
    return () => {
      active = false
    }
  }, [generation])

  useEffect(() => {
    let active = true
    setCollectionSource(null)
    if (collection) {
      void One.iOS.collectionCellSource(collection).then(
        (next) => {
          if (active) setCollectionSource(next)
        },
        (error: unknown) => {
          if (active) setError(`collection source error ${message(error)}`)
        }
      )
    }
    return () => {
      active = false
    }
  }, [collection])

  useEffect(() => {
    let active = true
    setTableSource(null)
    if (table) {
      void One.iOS.tableCellSource(table).then(
        (next) => {
          if (active) setTableSource(next)
        },
        (error: unknown) => {
          if (active) setError(`table source error ${message(error)}`)
        }
      )
    }
    return () => {
      active = false
    }
  }, [table])

  useEffect(() => {
    if (!collectionSource) return
    let active = true
    void applyItems(
      collectionSource,
      collectionRows.map((row) => row.id)
    ).then(
      () => {
        if (active)
          setCollectionApplied({ source: collectionSource, rows: collectionRows })
      },
      (error: unknown) => {
        if (active) setError(`collection apply error ${message(error)}`)
      }
    )
    return () => {
      active = false
    }
  }, [collectionSource, collectionRows])

  useEffect(() => {
    if (!tableSource) return
    let active = true
    void applyItems(
      tableSource,
      tableRows.map((row) => row.id)
    ).then(
      () => {
        if (active) setTableApplied({ source: tableSource, rows: tableRows })
      },
      (error: unknown) => {
        if (active) setError(`table apply error ${message(error)}`)
      }
    )
    return () => {
      active = false
    }
  }, [tableSource, tableRows])

  const insertRow = (which: 'collection' | 'table') => {
    const id = nextId.current++
    const row: Row = { id, lines: (id % 4) + 1, version: 1 }
    if (which === 'collection') setCollectionRows((rows) => [...rows, row])
    else setTableRows((rows) => [...rows, row])
  }

  const removeRow = (which: 'collection' | 'table') => {
    if (which === 'collection') setCollectionRows((rows) => rows.slice(0, -1))
    else setTableRows((rows) => rows.slice(0, -1))
  }

  const reorderRows = (which: 'collection' | 'table') => {
    if (which === 'collection')
      setCollectionRows((rows) => (rows.length < 2 ? rows : [...rows.slice(1), rows[0]!]))
    else setTableRows((rows) => (rows.length < 2 ? rows : [...rows.slice(1), rows[0]!]))
  }

  const reconfigureRow = (which: 'collection' | 'table') => {
    const rows = which === 'collection' ? collectionRows : tableRows
    const source = which === 'collection' ? collectionSource : tableSource
    const first = rows[0]
    if (!first || !source) return
    const bump = (row: Row) =>
      row.id === first.id
        ? { ...row, version: row.version + 1, lines: (row.lines % 4) + 1 }
        : row
    if (which === 'collection') setCollectionRows((current) => current.map(bump))
    else setTableRows((current) => current.map(bump))
    void reconfigureItem(source, first.id).catch((error: unknown) =>
      setError(`${which} reconfigure error ${message(error)}`)
    )
  }

  const removeBadge = async () => {
    const last = badges[badges.length - 1]
    if (last === undefined || !stack) return
    const view = stackViews.current.get(last)
    stackViews.current.delete(last)
    setBadges((ids) => ids.filter((id) => id !== last))
    if (view) {
      try {
        await stack.removeArrangedSubview(view)
        await view.removeFromSuperview()
      } catch (error: unknown) {
        setError(`stack removal error ${message(error)}`)
      }
    }
  }

  const recordPress = (container: string, id: number) => {
    setPressCount((count) => count + 1)
    setPressLog(`${container} ${id} generation ${generation}`)
  }

  const collectionReady =
    collectionApplied?.source === collectionSource &&
    collectionApplied?.rows === collectionRows
  const tableReady =
    tableApplied?.source === tableSource && tableApplied?.rows === tableRows
  const viewsCurrent = builtGeneration === generation
  const status =
    error ??
    (builtGeneration !== generation
      ? 'building views'
      : !collectionSource || !tableSource
        ? 'building sources'
        : !collectionReady || !tableReady
          ? 'applying snapshots'
          : `ready generation ${generation}`)
  const hostStyle = narrow ? styles.narrow : styles.wide

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="one-native-uikit-content-screen"
    >
      <Text testID="one-native-uikit-content-status">{`Status: ${status}`}</Text>
      <Text testID="one-native-uikit-content-press">{`Press: ${pressLog}; count ${pressCount}`}</Text>
      <Text testID="one-native-uikit-content-width-mode">{`Width: ${narrow ? 'narrow' : 'wide'}`}</Text>
      <Text testID="one-native-uikit-content-collection-summary">
        {`Collection: ${collectionSource ? `${collectionRows.length} rows in 3 sections` : 'no source'}; first ${collectionRows[0]?.id ?? 'none'} v${collectionRows[0]?.version ?? 0}${collectionMounted ? '' : ' (content unmounted)'}`}
      </Text>
      <View style={styles.controls}>
        <Pressable
          testID="one-native-uikit-content-collection-insert"
          onPress={() => insertRow('collection')}
        >
          <Text>Insert</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-collection-remove"
          onPress={() => removeRow('collection')}
        >
          <Text>Remove</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-collection-reorder"
          onPress={() => reorderRows('collection')}
        >
          <Text>Reorder</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-collection-reconfigure"
          onPress={() => reconfigureRow('collection')}
        >
          <Text>Reconfigure</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-collection-empty"
          onPress={() => setCollectionRows([])}
        >
          <Text>Empty</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-collection-reset"
          onPress={() => setCollectionRows(seed(1, 200))}
        >
          <Text>Reset rows</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-collection-mounted"
          onPress={() => setCollectionMounted((value) => !value)}
        >
          <Text>{collectionMounted ? 'Unmount' : 'Remount'}</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-replace"
          onPress={() => setGeneration((value) => value + 1)}
        >
          <Text>{`Replace views (${generation})`}</Text>
        </Pressable>
      </View>
      {viewsCurrent && collection && (
        <One.iOS.UIKitView
          view={collection}
          testID="one-native-uikit-content-collection-host"
          style={[styles.collection, hostStyle]}
        />
      )}
      {viewsCurrent &&
        collectionMounted &&
        collectionSource &&
        collectionRows.map((row) => (
          <One.iOS.UIKitContent
            key={row.id}
            source={collectionSource}
            item={row.id}
            height={row.id % 5 === 0 ? 72 : undefined}
            estimatedHeight={64}
          >
            <RowBody
              row={row}
              prefix="one-native-uikit-content-collection"
              fixed={row.id % 5 === 0}
              onPress={() => recordPress('collection', row.id)}
            />
          </One.iOS.UIKitContent>
        ))}
      <Text testID="one-native-uikit-content-table-summary">
        {`Table: ${tableSource ? `${tableRows.length} rows in 3 sections` : 'no source'}; first ${tableRows[0]?.id ?? 'none'} v${tableRows[0]?.version ?? 0}${tableMounted ? '' : ' (content unmounted)'}`}
      </Text>
      <View style={styles.controls}>
        <Pressable
          testID="one-native-uikit-content-table-insert"
          onPress={() => insertRow('table')}
        >
          <Text>Insert</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-table-remove"
          onPress={() => removeRow('table')}
        >
          <Text>Remove</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-table-reorder"
          onPress={() => reorderRows('table')}
        >
          <Text>Reorder</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-table-reconfigure"
          onPress={() => reconfigureRow('table')}
        >
          <Text>Reconfigure</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-table-empty"
          onPress={() => setTableRows([])}
        >
          <Text>Empty</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-table-reset"
          onPress={() => setTableRows(seed(101, 8))}
        >
          <Text>Reset rows</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-table-mounted"
          onPress={() => setTableMounted((value) => !value)}
        >
          <Text>{tableMounted ? 'Unmount' : 'Remount'}</Text>
        </Pressable>
      </View>
      {viewsCurrent && table && (
        <One.iOS.UIKitView
          view={table}
          testID="one-native-uikit-content-table-host"
          style={[styles.table, hostStyle]}
        />
      )}
      {viewsCurrent &&
        tableMounted &&
        tableSource &&
        tableRows.map((row) => (
          <One.iOS.UIKitContent
            key={row.id}
            source={tableSource}
            item={row.id}
            estimatedHeight={44}
          >
            <RowBody
              row={row}
              prefix="one-native-uikit-content-table"
              onPress={() => recordPress('table', row.id)}
            />
          </One.iOS.UIKitContent>
        ))}
      <Text testID="one-native-uikit-content-stack-summary">
        {`Stack: ${stack ? `${badges.length} badges` : 'building'}`}
      </Text>
      <View style={styles.controls}>
        <Pressable
          testID="one-native-uikit-content-stack-remove"
          onPress={() => {
            void removeBadge()
          }}
        >
          <Text>Remove badge</Text>
        </Pressable>
        <Pressable
          testID="one-native-uikit-content-width"
          onPress={() => setNarrow((value) => !value)}
        >
          <Text>{narrow ? 'Wide hosts' : 'Narrow hosts'}</Text>
        </Pressable>
      </View>
      {viewsCurrent && stack && (
        <One.iOS.UIKitView
          view={stack}
          testID="one-native-uikit-content-stack-host"
          style={[styles.stack, hostStyle]}
        />
      )}
      {viewsCurrent &&
        stack &&
        badges.map((id) => (
          <One.iOS.UIKitContent
            key={`${generation}:${id}`}
            onView={(view) => {
              stackViews.current.set(id, view)
              void stack
                .addArrangedSubview(view)
                .catch((error: unknown) =>
                  setError(`stack placement error ${message(error)}`)
                )
            }}
          >
            <View
              testID={`one-native-uikit-content-stack-row-${id}`}
              style={styles.badge}
            >
              <Pressable
                testID={`one-native-uikit-content-stack-press-${id}`}
                onPress={() => recordPress('stack', id)}
              >
                <Text>{`badge ${id} with width-dependent text that reflows when the host narrows`}</Text>
              </Pressable>
            </View>
          </One.iOS.UIKitContent>
        ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 16, paddingTop: 90, paddingBottom: 40, gap: 12 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  collection: { height: 320 },
  table: { height: 260 },
  stack: { height: 280 },
  wide: { alignSelf: 'stretch' },
  narrow: { alignSelf: 'flex-start', width: 220 },
  row: { padding: 8, gap: 4 },
  title: { fontWeight: '600' },
  badge: { padding: 12, backgroundColor: '#e5e7eb', borderRadius: 8 },
})
