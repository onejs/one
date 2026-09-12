// the matrix the tab bar geometry oracle measures. one entry per captured cell; the fixture
// renders a cell and the driver walks the list in order, so this module is the single source of
// truth shared by `app/one-native-tab-oracle.tsx` and `scripts/tab-bar-oracle.ts`.
//
// cell ids follow rnx's own fixture keying so the two tables diff with no mapping layer:
//
//   tabs<N>[-search][-action][-badges<T>][-icononly][-labelonly<all|mid>][-longlabels]
//          [-min<behavior>][-sidebar][-scroll][-more|-morerow<i>][-<down|up|rest>]-sel<i>-<light|dark>
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
//   -scroll      the page is a tall ScrollView, which is what tabBarMinimizeBehavior needs in
//                order to do anything
//   -sweep       the cell is a SEQUENCE rather than a single capture: at rest, down through a
//                scroll, then back up, one settled frame per step tagged with the scroll offset
//   -more        the driver tapped the last visible slot, which is the More tab, and the capture
//                is the overflow screen More presents
//   -morerow<i>  ... and then tapped row i of that overflow list
//
// -more and -sweep cells are the only ones the driver interacts with. every other cell is
// mounted by the fixture and photographed without a touch.
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

/**
 * what the driver does to the cell before capturing it. 'rest' is a no-op that exists so a
 * scrolled cell has a same-fixture twin to subtract against: the unscrolled capture of a tall
 * ScrollView page is not the same as the baseline cell, whose page does not scroll at all.
 */
export type OracleInteraction =
  | { kind: 'none' }
  /**
   * a whole scroll sweep captured as a sequence: at rest, then settled frames on the way down,
   * then settled frames on the way back up, each tagged with the scroll offset the fixture
   * reported when it was taken. one still cannot tell a progress-driven collapse from a
   * threshold plus a fixed animation, because those two are identical at rest and identical
   * fully minimized. they differ only in what the bar looks like at the offsets in between,
   * and in whether the down and up sweeps disagree at the same offset.
   */
  | { kind: 'scrollSweep' }
  | { kind: 'more' }
  | { kind: 'moreRow'; row: number }

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
  /** a tall ScrollView page instead of the static panel, so a scroll has somewhere to go */
  scrollablePage: boolean
  interaction: OracleInteraction
}

const SHORT = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh']
const GLYPH = ['1.circle', '2.circle', '3.circle', '4.circle', '5.circle', '6.circle', '7.circle']
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
  scroll?: boolean
  interaction?: OracleInteraction
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
  const interaction: OracleInteraction = spec.interaction ?? { kind: 'none' }
  // new segments keep the existing ones in their existing order and positions, so an id that
  // carries none of them is byte-identical to what it was before these axes existed
  const interactionSegment =
    interaction.kind === 'scrollSweep'
      ? 'sweep'
      : interaction.kind === 'more'
        ? 'more'
        : interaction.kind === 'moreRow'
          ? `morerow${interaction.row}`
          : ''
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
    spec.scroll ? 'scroll' : '',
    interactionSegment,
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
    scrollablePage: spec.scroll ?? false,
    interaction,
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

  // ---- overflow: what is inside More ----------------------------------------------------
  // six tabs is where SwiftUI stops giving every tab a slot. the resting cells come first so
  // the opened-More cells have a same-fixture bar to subtract against; without them a slot
  // that moved when More opened could not be told from a slot that was never there.
  ...[6, 7].map((count) => ({
    count,
    axis: 'pageTabCount past the overflow threshold',
    note: `${count} page tabs, nothing detached, at rest. more tabs than slots, so a More tab appears`,
  })),
  {
    count: 6,
    interaction: { kind: 'more' as const },
    axis: 'overflow contents',
    note: '6 page tabs, the More tab tapped. which tabs kept a slot and which went into the list',
  },
  {
    count: 7,
    interaction: { kind: 'more' as const },
    axis: 'overflow contents',
    note: '7 page tabs, the More tab tapped. a third row is what gives the row pitch a second gap',
  },
  {
    count: 5,
    detached: 'page' as const,
    interaction: { kind: 'more' as const },
    axis: 'overflow contents x detachedSearchPage',
    note: '5 page tabs plus a search page tab, the More tab tapped. whether the search tab keeps any search affordance in the list or becomes an ordinary row',
  },
  {
    count: 5,
    detached: 'page' as const,
    interaction: { kind: 'moreRow' as const, row: 0 },
    axis: 'overflow selection',
    note: 'the first row of the overflow list tapped. whether the chosen tab swaps into a visible slot, or the bar keeps its slots with the selection shown inside More',
  },
  {
    count: 5,
    detached: 'page' as const,
    interaction: { kind: 'more' as const },
    appearance: 'dark' as const,
    axis: 'overflow contents x appearance',
    note: 'dark twin of the opened overflow list, where the list background flips and the row geometry should not',
  },
  {
    count: 5,
    detached: 'page' as const,
    interaction: { kind: 'moreRow' as const, row: 0 },
    appearance: 'dark' as const,
    axis: 'overflow selection x appearance',
    note: 'dark twin of the row selection, so the promotion answer is not read off one appearance',
  },

  // ---- tabBarMinimizeBehavior in motion --------------------------------------------------
  // the four values are identical at rest, which is why the resting cells above say nothing.
  // each value gets three captures of the same scrollable fixture: unscrolled, after scrolling
  // down, and after scrolling back up. -rest is the subtraction baseline, and it is NOT the
  // plain baseline cell, whose page is not a ScrollView at all.
  // light block then dark block, because switching simulator appearance is the slowest step in
  // a run and a sweep is already twenty-odd settled captures
  ...(['light', 'dark'] as const).flatMap((appearance) =>
    (['never', 'automatic', 'onScrollDown', 'onScrollUp'] as MinimizeBehavior[]).map(
      (minimize) => ({
        count: 3,
        // 'never' is the baseline value and carries no -min segment, exactly as at rest
        minimize: minimize === 'never' ? undefined : minimize,
        scroll: true,
        interaction: { kind: 'scrollSweep' as const },
        appearance,
        axis: 'tabBarMinimizeBehavior in motion',
        note: `3 page tabs over a tall ScrollView, tabBarMinimizeBehavior="${minimize}", swept down and back up in ${appearance} appearance`,
      })
    )
  ),
]

export const cells: OracleCell[] = specs.map(build)

const seen = new Set<string>()
for (const cell of cells) {
  if (seen.has(cell.id)) throw new Error(`duplicate oracle cell id ${cell.id}`)
  seen.add(cell.id)
}
