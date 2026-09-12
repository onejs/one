// the matrix the tab bar geometry oracle measures. one entry per captured cell; the fixture
// renders a cell and the driver walks the list in order, so this module is the single source of
// truth shared by `app/one-native-tab-oracle.tsx` and `scripts/tab-bar-oracle.ts`.
//
// cell ids follow rnx's own fixture keying so the two tables diff with no mapping layer:
//
//   tabs<N>[-search][-action][-badges<T>][-icononly][-labelonly<all|mid>][-longlabels]
//          [-min<behavior>][-sidebar]-sel<i>-<light|dark>
//
//   tabs<N>      N page tabs in the main capsule. a detached search tab is NOT counted in N.
//   -search      a role="search" tab is present, which detaches into its own trailing capsule
//   -action      that search tab is an action tab (onPress, no page); follows -search
//   -badges<T>   the first main tab carries badge T, with non-alphanumerics dropped from the
//                token: -badges5 is "5", -badgesNEW is "NEW", -badges999 is "999+"
//   -icononly    every tab has a glyph and an empty title
//   -labelonlyall  no tab has a systemImage; -labelonlymid, only the middle tab lacks one
//   -longlabels  the FIRST main tab's title is long enough to truncate, the rest stay short.
//                one long label beside short ones at a fixed tab count is what separates an
//                equal-width track from per-tab content widths: under an equal-width track
//                every centre keeps the same pitch, under content widths every centre after
//                the long tab shifts.
//   -min<X>      tabBarMinimizeBehavior, omitted when it is the baseline "never"
//   -sidebar     sidebarAdaptable
//   -sel<i>      index of the selected tab in the full tab list, detached search tab included
//
// cells are ordered light first then dark, because switching simulator appearance is the
// slowest step in a run.

export type OracleTab = {
  id: string
  title: string
  systemImage?: string
  badge?: string
  /** a search-role tab detaches into its own trailing capsule */
  role?: 'search'
  /** an action tab runs onPress and never becomes the selection, so it has no page */
  action?: boolean
}

export type MinimizeBehavior = 'automatic' | 'onScrollDown' | 'onScrollUp' | 'never'

export type OracleCell = {
  id: string
  /** the axis this cell moves off the baseline; 'baseline' for the reference cell */
  axis: string
  note: string
  tabs: OracleTab[]
  selectedIndex: number
  appearance: 'light' | 'dark'
  minimizeBehavior: MinimizeBehavior
  sidebarAdaptable: boolean
}

const SHORT = ['First', 'Second', 'Third', 'Fourth', 'Fifth']
const GLYPH = ['1.circle', '2.circle', '3.circle', '4.circle', '5.circle']
const LONG = 'Notifications And Alerts'

const pageTabs = (count: number): OracleTab[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    title: SHORT[index],
    systemImage: GLYPH[index],
  }))

const searchPageTab: OracleTab = {
  id: 'search',
  title: 'Search',
  systemImage: 'magnifyingglass',
  role: 'search',
}
const searchActionTab: OracleTab = { ...searchPageTab, id: 'compose', title: 'Compose', systemImage: 'plus', action: true }

type Spec = {
  count: number
  detached?: 'page' | 'action'
  badge?: string
  icononly?: boolean
  labelonly?: 'all' | 'mid'
  longlabels?: boolean
  minimize?: MinimizeBehavior
  sidebar?: boolean
  selectedIndex?: number
  appearance?: 'light' | 'dark'
  axis: string
  note: string
}

const token = (badge: string) => badge.replace(/[^a-zA-Z0-9]/g, '')

function build(spec: Spec): OracleCell {
  let tabs = pageTabs(spec.count)
  if (spec.icononly) tabs = tabs.map((tab) => ({ ...tab, title: '' }))
  if (spec.labelonly === 'all') tabs = tabs.map(({ systemImage, ...rest }) => rest)
  if (spec.labelonly === 'mid')
    tabs = tabs.map((tab, index) =>
      index === Math.floor(spec.count / 2) ? { id: tab.id, title: tab.title } : tab
    )
  if (spec.longlabels) tabs = tabs.map((tab, index) => (index ? tab : { ...tab, title: LONG }))
  if (spec.badge) tabs = tabs.map((tab, index) => (index ? tab : { ...tab, badge: spec.badge }))
  if (spec.detached)
    tabs = [...tabs, spec.detached === 'page' ? searchPageTab : searchActionTab]

  const selectedIndex = spec.selectedIndex ?? 0
  const appearance = spec.appearance ?? 'light'
  const id = [
    `tabs${spec.count}`,
    spec.detached ? 'search' : '',
    spec.detached === 'action' ? 'action' : '',
    spec.badge ? `badges${token(spec.badge)}` : '',
    spec.icononly ? 'icononly' : '',
    spec.labelonly ? `labelonly${spec.labelonly}` : '',
    spec.longlabels ? 'longlabels' : '',
    spec.minimize ? `min${spec.minimize}` : '',
    spec.sidebar ? 'sidebar' : '',
    `sel${selectedIndex}`,
    appearance,
  ]
    .filter(Boolean)
    .join('-')

  return {
    id,
    axis: spec.axis,
    note: spec.note,
    tabs,
    selectedIndex,
    appearance,
    minimizeBehavior: spec.minimize ?? 'never',
    sidebarAdaptable: spec.sidebar ?? false,
  }
}

const specs: Spec[] = [
  { count: 3, axis: 'baseline', note: '3 page tabs, glyph plus short title, no badge, nothing detached' },

  // page tab count: the term rnx's regularTabTrackWidth claims is linear in tabCount
  ...[1, 2, 4, 5].map((count) => ({
    count,
    axis: 'pageTabCount',
    note: `${count} page tabs, nothing detached`,
  })),

  // tab count x detached tab. rnx drops the tabCount term entirely once a search tab exists,
  // so this crossing is what decides whether a constant 281pt track is right.
  ...[1, 2, 3, 4, 5].map((count) => ({
    count,
    detached: 'page' as const,
    axis: 'pageTabCount x detachedSearchPage',
    note: `${count} page tabs plus a role="search" page tab`,
  })),
  ...[1, 2, 3, 4, 5].map((count) => ({
    count,
    detached: 'action' as const,
    axis: 'pageTabCount x detachedSearchAction',
    note: `${count} page tabs plus a role="search" action tab, which react-native-bottom-tabs cannot express`,
  })),

  // badge width off the baseline, then badge width x tab count
  ...['5', 'NEW', '999+'].map((badge) => ({
    count: 3,
    badge,
    axis: 'badgeWidth',
    note: `3 page tabs, badge "${badge}" on the first tab`,
  })),
  ...[1, 2, 4, 5].map((count) => ({
    count,
    badge: '999+',
    axis: 'badgeWidth x pageTabCount',
    note: `${count} page tabs, badge "999+" on the first tab`,
  })),

  // glyph and label presence
  { count: 3, icononly: true, axis: 'labelPresence', note: '3 tabs with glyphs and empty titles' },
  { count: 3, labelonly: 'all' as const, axis: 'systemImage', note: '3 title-only tabs, no systemImage anywhere' },
  { count: 3, labelonly: 'mid' as const, axis: 'systemImage', note: '3 tabs, only the middle one title-only' },

  // one long label beside short ones, at four fixed tab counts and across the search lane.
  // this is the cell that separates an equal-width track from per-tab content widths.
  ...[2, 3, 4, 5].map((count) => ({
    count,
    longlabels: true,
    axis: 'labelWidth at fixed tab count',
    note: `${count} page tabs, the first titled "${LONG}", the rest short`,
  })),
  ...[2, 4].map((count) => ({
    count,
    detached: 'page' as const,
    longlabels: true,
    axis: 'labelWidth x detachedSearchPage',
    note: `${count} page tabs with a long first title, plus a search page tab`,
  })),

  // every value the generated TabBarMinimizeBehavior enum accepts; 'never' is the baseline
  ...(['automatic', 'onScrollDown', 'onScrollUp'] as MinimizeBehavior[]).map((minimize) => ({
    count: 3,
    minimize,
    axis: 'tabBarMinimizeBehavior (no rnx consumer: the prop does not exist there)',
    note: `3 page tabs, tabBarMinimizeBehavior="${minimize}", never scrolled`,
  })),

  // sidebarAdaptable at two tab counts, because one cell cannot show a non-interaction
  ...[3, 5].map((count) => ({
    count,
    sidebar: true,
    axis: 'sidebarAdaptable (no rnx consumer: the prop does not exist there)',
    note: `${count} page tabs, sidebarAdaptable`,
  })),

  // selected index: first is the baseline, so middle and last at 5 tabs, plus a selected
  // detached search page tab. an action tab can never hold the selection.
  { count: 5, selectedIndex: 2, axis: 'selectedIndex', note: '5 page tabs, the third selected' },
  { count: 5, selectedIndex: 4, axis: 'selectedIndex', note: '5 page tabs, the fifth selected' },
  {
    count: 3,
    detached: 'page' as const,
    selectedIndex: 3,
    axis: 'selectedIndex x detachedSearchPage',
    note: '3 page tabs plus a search page tab, the search tab selected',
  },

  // dark twins of the cells where a layout difference would show first if appearance
  // interacted with geometry at all
  ...([
    { count: 3, axis: 'appearance', note: 'dark twin of the baseline' },
    { count: 5, axis: 'appearance', note: 'dark twin of 5 page tabs' },
    { count: 3, detached: 'page' as const, axis: 'appearance', note: 'dark twin of the search page tab cell' },
    { count: 3, detached: 'action' as const, axis: 'appearance', note: 'dark twin of the search action tab cell' },
    { count: 3, badge: '999+', axis: 'appearance', note: 'dark twin of the overflow badge cell' },
  ] as Spec[]).map((spec) => ({ ...spec, appearance: 'dark' as const })),
]

export const cells: OracleCell[] = specs.map(build)

const seen = new Set<string>()
for (const cell of cells) {
  if (seen.has(cell.id)) throw new Error(`duplicate oracle cell id ${cell.id}`)
  seen.add(cell.id)
}
