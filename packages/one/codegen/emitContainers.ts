// containers are structural rather than SDK bindings: they compose already-generated
// controls into one SwiftUI tree. a host reports the height SwiftUI measured back to
// Yoga; a form and a section lay out inside whatever box React Native gives them.
import type { StyleField } from './catalog'

const composedContent = {
  name: 'content',
  content: 'one-native',
  cardinality: 'many',
  layout: 'composed',
} as const

const environmentProps = {
  colorScheme: 'string',
  dynamicTypeSize: 'string',
  controlSize: 'string',
  locale: 'string',
  tint: 'ColorValue?',
  isEnabled: 'string',
} as const

export const environmentMethods = [
  {
    name: 'environment',
    parameters: [
      { label: '_', type: 'Swift.WritableKeyPath<SwiftUICore.EnvironmentValues, V>' },
      { label: '_', type: 'V' },
    ],
    requirements: [],
  },
]

export const containerComponents = [
  // the stacks take SwiftUI's arguments and defaults: a cross-axis alignment from the
  // stack's own alignment type, and the system spacing while spacing is unset. only a
  // standalone stack fills the width React Native gives it.
  {
    name: 'OneNativeHStack',
    publicName: 'HStack',
    host: { view: 'HStack', arguments: { alignment: 'alignment', spacing: 'spacing' }, children: 'content', accessible: 'container', modifiers: ['.frame(maxWidth: standalone ? .infinity : nil)'], layout: 'measured' },
    props: { alignment: 'string', spacing: 'Double' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: { alignment: 'VerticalAlignment' },
    layout: { kind: 'measured' },
    slots: [composedContent],
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeVStack',
    publicName: 'VStack',
    host: { view: 'VStack', arguments: { alignment: 'alignment', spacing: 'spacing' }, children: 'content', accessible: 'container', modifiers: ['.frame(maxWidth: standalone ? .infinity : nil)'], layout: 'measured' },
    props: { alignment: 'string', spacing: 'Double' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: { alignment: 'HorizontalAlignment' },
    layout: { kind: 'measured' },
    slots: [composedContent],
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeZStack',
    publicName: 'ZStack',
    host: { view: 'ZStack', arguments: { alignment: 'alignment' }, children: 'content', modifiers: ['.frame(maxWidth: standalone ? .infinity : nil, alignment: $alignment)'], layout: 'measured' },
    props: { alignment: 'string' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: {},
    layout: { kind: 'measured' },
    slots: [composedContent],
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeSpacer',
    publicName: 'Spacer',
    host: { view: 'Spacer', arguments: { minLength: 'minLength' }, layout: 'leaf' },
    props: { minLength: 'Double' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: {},
    layout: { kind: 'container' },
    // a spacer holds nothing; it takes the free space its parent stack offers.
    slots: [],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeForm',
    publicName: 'Form',
    host: { view: 'Form', children: 'content', initial: { sizing: '"fill"' }, measuredWhen: '@sizing == "content"', environment: true, layout: 'measured' },
    props: { sizing: 'string', ...environmentProps },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    // scroll modifiers such as scrollContentBackground reach the Form through swiftStyle.
    swiftStyle: true,
    enumProps: {},
    // fill takes the box React Native gave it; content reports the height SwiftUI
    // measured back to Yoga, so a form in a sheet wraps its rows.
    layout: { kind: 'measured' },
    slots: [composedContent],
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeSection',
    publicName: 'Section',
    host: { view: 'Section', arguments: { header: 'title', footer: 'footer' }, children: 'content', layout: 'container', rowModifiers: 'name.hasPrefix("listSection") || name == "headerProminence"' },
    props: { title: 'string', footer: 'string' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: {},
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeLabeledContent',
    publicName: 'LabeledContent',
    host: { view: 'LabeledContent', labels: { label: { title: 'label', systemImage: 'systemImage' } }, children: 'content', childrenFallback: 'value', childStack: 'HStack(spacing: 0)', modifiers: ['.frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)'], layout: 'measured' },
    props: { label: 'string', value: 'string', systemImage: 'string' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: {},
    // a row has an ideal height SwiftUI knows, so standalone it measures like a host.
    layout: { kind: 'measured' },
    slots: [composedContent],
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeGroupBox',
    publicName: 'GroupBox',
    host: { view: 'GroupBox', arguments: { label: 'label' }, omitWhenEmpty: ['label'], children: 'content', modifiers: ['.frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)'], layout: 'measured', scheme: true },
    props: { label: 'string' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: {},
    layout: { kind: 'measured' },
    slots: [composedContent],
    interfaceOnly: true,
  },
  {
    name: 'OneNativeViewThatFits',
    publicName: 'ViewThatFits',
    host: { view: 'ViewThatFits', arguments: { in: 'axes' }, aliases: { axes: { both: '[.horizontal, .vertical]' } }, children: 'content', modifiers: ['.frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)'], layout: 'measured', boundedHeight: true, scheme: true },
    props: { axes: 'string' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: {},
    layout: { kind: 'measured' },
    slots: [composedContent],
    interfaceOnly: true,
  },
  {
    name: 'OneNativeGeometryReader',
    publicName: 'GeometryReader',
    // a reader takes the box React Native gave it and runs its content closure
    // with a native GeometryProxy snapshot: the frame SwiftUI laid it out in
    // (global coordinates; its size is the reader's size) and its safe-area
    // insets. the event below is private transport for that snapshot, not a
    // public observer contract.
    props: {},
    events: {
      onNativeGeometryReaderChange: {
        x: 'Double',
        y: 'Double',
        width: 'Double',
        height: 'Double',
        localX: 'Double',
        localY: 'Double',
        localWidth: 'Double',
        localHeight: 'Double',
        sizeWidth: 'Double',
        sizeHeight: 'Double',
        safeAreaTop: 'Double',
        safeAreaLeading: 'Double',
        safeAreaBottom: 'Double',
        safeAreaTrailing: 'Double',
      },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    swiftStyle: true,
    enumProps: {},
    host: {
      view: 'GeometryReader',
      children: 'content',
      context: {
        event: 'onNativeGeometryReaderChange',
        values: { '': 'frame(in: .global)', local: 'frame(in: .local)', size: 'size', safeArea: 'safeAreaInsets' },
      },
      layout: 'container',
    },
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeScrollViewReader',
    publicName: 'ScrollViewReader',
    // a reader runs its content closure with a ScrollViewProxy and composes what it
    // returns inside SwiftUI's ScrollViewReader. the command below is private
    // transport for proxy.scrollTo(id, anchor:), run on the proxy SwiftUI handed
    // the native builder. hasAnchor false is the SDK's nil anchor.
    props: {},
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    commands: {
      scrollTo: { scrollID: 'string', hasAnchor: 'boolean', anchorX: 'Double', anchorY: 'Double' },
    },
    enumProps: {},
    host: {
      view: 'ScrollViewReader',
      children: 'content',
      context: { commands: { scrollTo: 'scrollTo' } },
      layout: 'container',
      scheme: true,
    },
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeTimelineView',
    publicName: 'TimelineView',
    // native owns the schedule and SwiftUI's TimelineView; its content closure runs in
    // JavaScript with the context date and cadence each entry reports. the props below
    // are private transport for the schedule: periodic starts at startDate (ms since the
    // epoch) and steps by interval seconds, and explicit lists its dates as a JSON array
    // of ms. the event is private transport for the context, not a public observer.
    props: { schedule: 'string', startDate: 'Double', interval: 'Double', dates: 'string' },
    events: {
      onNativeTimelineViewTick: { time: 'Double', cadence: 'string' },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    swiftStyle: true,
    enumProps: {},
    host: {
      view: 'TimelineView',
      builder: {
        label: '_',
        prop: 'schedule',
        members: ['everyMinute', 'periodic', 'explicit'],
        arguments: { from: 'startDate', by: 'interval', _: 'dates' },
      },
      children: 'content',
      context: { event: 'onNativeTimelineViewTick', values: { time: 'date', cadence: 'cadence' } },
      modifiers: ['.frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)'],
      layout: 'measured',
      scheme: true,
    },
    // a timeline sizes to its content like a labeled row, so it measures like a host.
    layout: { kind: 'measured' },
    slots: [composedContent],
    interfaceOnly: true,
  },
  {
    name: 'OneNativeOutlineGroup',
    publicName: 'OutlineGroup',
    // SwiftUI's OutlineGroup over a tree. the tree prop is private transport for its
    // shape: a JSON array of { id, children } nodes, children null for a leaf. the row
    // content is React's closure result per node, mounted as OneNativeOutlineRow
    // children and looked up by id when SwiftUI builds a row.
    props: { tree: 'string' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: {},
    host: {
      view: 'OutlineGroup',
      items: { label: '_', prop: 'tree', children: 'children', slot: 'OneNativeOutlineRow', key: 'rowId' },
      children: 'content',
      initial: { tree: '"[]"' },
      layout: 'container',
      scheme: true,
    },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'rows',
        content: 'OneNativeOutlineRow',
        cardinality: 'many',
        key: 'rowId',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeTable',
    publicName: 'Table',
    // SwiftUI's Table over rows and columns. rows and columns are private transport for
    // their shape: JSON arrays of { id } and { id, title }. the cell content is React's
    // closure result per row and column, mounted as OneNativeTableCell children and
    // looked up by ids when SwiftUI builds a cell. sort is the JSON { column, ascending }
    // of the sorted column, empty while none is; sortable adds the sort headers. native
    // reports a header tap and React re-sorts the rows, so the order stays React's.
    props: {
      rows: 'string',
      columns: 'string',
      sortable: 'boolean',
      sort: 'string',
      acknowledgedEvent: 'Int32',
      revision: 'Int32',
    },
    events: {
      onNativeTableSortChange: { sort: 'string', eventCount: 'Int32', revision: 'Int32' },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    swiftStyle: true,
    enumProps: {},
    controlled: { value: 'sort', event: 'onNativeTableSortChange' },
    host: {
      view: 'Table',
      items: { label: '_', prop: 'rows', slot: 'OneNativeTableCell', key: 'rowId' },
      columns: {
        label: 'columns',
        prop: 'columns',
        each: 'TableColumnForEach',
        column: 'TableColumn',
        key: 'columnId',
        sortUsing: 'sortUsing',
        sortable: 'sortable',
      },
      binding: { label: 'sortOrder', prop: 'sort', event: 'onNativeTableSortChange' },
      initial: { rows: '"[]"', columns: '"[]"' },
      layout: 'container',
      scheme: true,
    },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'cells',
        content: 'OneNativeTableCell',
        cardinality: 'many',
        key: 'rowId',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeCanvas',
    publicName: 'Canvas',
    // SwiftUI's Canvas. its renderer closure cannot cross the bridge, so React records
    // the GraphicsContext calls it makes into the ops JSON and native replays them on
    // the real context. the size event is private transport for the canvas's laid out
    // size, which the renderer is run with.
    props: {
      ops: 'string',
      opaque: 'boolean',
      colorMode: 'string',
      rendersAsynchronously: 'boolean',
    },
    events: {
      onNativeCanvasSizeChange: { width: 'Double', height: 'Double' },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    swiftStyle: true,
    enumProps: {},
    layout: { kind: 'container' },
    slots: [],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeGlassEffectContainer',
    publicName: 'GlassEffectContainer',
    host: { view: 'GlassEffectContainer', arguments: { spacing: 'spacing' }, children: 'content', modifiers: ['.frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)'], layout: 'measured', scheme: true },
    props: { spacing: 'Double', hasSpacing: 'boolean' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: {},
    layout: { kind: 'measured' },
    slots: [composedContent],
    interfaceOnly: true,
  },
  {
    name: 'OneNativeButton',
    publicName: 'Button',
    // a button is a measured container whose children are the SDK Button's label. React
    // builds the label its label props describe from the same children; buttonStyle and
    // disabled come from swiftStyle like any other modifier.
    host: {
      view: 'Button',
      arguments: { role: 'buttonRole' },
      action: { label: 'action', event: 'onNativeButtonPress' },
      children: 'label',
      childStack: 'HStack(spacing: 0)',
      accessible: true,
      modifiers: ['.frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)'],
      layout: 'measured',
    },
    props: { buttonRole: 'string' },
    events: {
      onNativeButtonPress: { eventCount: 'Int32' },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: { buttonRole: 'ButtonRole' },
    actions: [{ publicProp: 'onPress', event: 'onNativeButtonPress' }],
    layout: { kind: 'measured' },
    slots: [composedContent],
    // swiftStyle travels as its own struct prop like a generated control's, so a
    // standalone button keeps the fonts, colors, frame and chrome it always had.
    swiftStyle: true,
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeGlass',
    publicName: 'Glass',
    // a glass surface takes the box React Native gave it, behind the children it lays out
    // from the top leading corner. material and color scheme reach it through swiftStyle.
    host: {
      modifier: 'glassEffect',
      surface: true,
      childStack: 'VStack(alignment: .leading, spacing: 0)',
      arguments: { _: 'glassEffect' },
      chains: { _: { interactive: 'interactive', tint: 'tint' } },
      builder: { label: 'in', prop: 'shape', members: ['capsule', 'circle', 'ellipse', 'rect', 'containerRelative'], arguments: { cornerRadius: 'cornerRadius' }, optional: true },
      modifiers: ['.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)'],
      layout: 'container',
    },
    props: {
      glassEffect: 'string?',
      interactive: 'boolean?',
      shape: 'string?',
      cornerRadius: 'Double?',
      tint: 'ColorValue?',
    },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    swiftStyle: true,
    enumProps: {},
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeTabView',
    publicName: 'TabView',
    props: {
      selection: 'string',
      tabViewStyle: 'string',
      tabBarVisibility: 'string',
      // TabViewCustomization as its Codable JSON; empty leaves customization unbound.
      customization: 'string',
      customizable: 'boolean',
      bottomAccessoryEnabled: 'boolean',
      acknowledgedEvent: 'Int32',
      revision: 'Int32',
    },
    events: {
      onNativeTabViewSelectionChange: { selection: 'string', eventCount: 'Int32', revision: 'Int32' },
      // pressing an action tab is not a state change, so it carries no controlled event.
      onNativeTabViewAction: { tabId: 'string' },
      onNativeTabViewCustomizationChange: { customization: 'string' },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: { tabViewStyle: 'TabViewStyle', tabBarVisibility: 'Visibility' },
    controlled: { value: 'selection', event: 'onNativeTabViewSelectionChange' },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'pages',
        content: 'OneNativeTab',
        cardinality: 'many',
        key: 'tabId',
        layout: 'swiftui',
      },
    ],
    // tabBarMinimizeBehavior, tabViewSearchActivation, defaultTabBarPlacement and every
    // other scalar TabView modifier the SDK declares reach the TabView through swiftStyle.
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeContainerSlot',
    publicName: 'Slot',
    props: { height: 'Double', width: 'Double' },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'react-native',
        cardinality: 'many',
        layout: 'swiftui-proposal-to-yoga',
      },
    ],
    // SwiftUI proposes the box and the shared slot shadow node writes it back to Yoga.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeNavigationStack',
    publicName: 'NavigationStack',
    // the stack takes the box React Native gave it. its React Native children are the
    // stack's root, and the toolbar markers beside them fill the navigation bar.
    props: {},
    events: {
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'toolbar',
        content: 'OneNativeToolbar',
        cardinality: 'many',
        layout: 'composed',
      },
      {
        name: 'content',
        content: 'OneNativeNavigationStackContent',
        cardinality: 'one',
        layout: 'swiftui-proposal-to-yoga',
        origin: 'local',
      },
    ],
    // navigationTitle, navigationBarTitleDisplayMode, toolbarBackground and every other
    // scalar navigation or toolbar modifier reach the stack through swiftStyle.
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeNavigationSplitView',
    publicName: 'NavigationSplitView',
    props: {
      columnVisibility: 'string',
      columnVisibilityIsControlled: 'boolean',
      preferredCompactColumn: 'string',
      preferredCompactColumnIsControlled: 'boolean',
    },
    events: {
      onNativeNavigationSplitViewColumnVisibilityChange: { visibility: 'string' },
      onNativeNavigationSplitViewPreferredCompactColumnChange: { column: 'string' },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'columns',
        content: 'OneNativeNavigationSplitViewColumn',
        cardinality: 'many',
        key: 'column',
        layout: 'composed',
      },
    ],
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeToolbar',
    publicName: 'Toolbar',
    // a marker: its ToolbarItem children publish into the navigation bar of the
    // NavigationStack that hosts it, and nothing renders where it sits.
    props: {},
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeToolbarItem',
    publicName: 'ToolbarItem',
    props: { placement: 'string' },
    events: {
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: { placement: 'ToolbarItemPlacement' },
    layout: { kind: 'container' },
    slots: [composedContent],
    // the item's content is a SwiftUI view, so it takes every scalar modifier too.
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeToolbarItemGroup',
    publicName: 'ToolbarItemGroup',
    // a labelled group is the SDK's own labelled ToolbarItemGroup initializer, so the
    // label renders the way SwiftUI renders it rather than a row of the item's views.
    props: { placement: 'string', label: 'string', systemImage: 'string' },
    events: {
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: { placement: 'ToolbarItemPlacement' },
    layout: { kind: 'container' },
    slots: [composedContent],
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeToolbarSpacer',
    publicName: 'ToolbarSpacer',
    // a spacer holds nothing; it takes the space SwiftUI gives it between toolbar items.
    props: { sizing: 'string', placement: 'string' },
    events: {},
    enumProps: { sizing: 'SpacerSizing', placement: 'ToolbarItemPlacement' },
    layout: { kind: 'container' },
    slots: [],
    interfaceOnly: false,
  },
] as const

// a container whose only job is to carry a React Native subtree into a SwiftUI box the
// parent proposes. it has no public entry point, so it stays off the container surface.
export const contentComponents = [
  {
    name: 'OneNativeNavigationStackContent',
    publicName: null,
    props: {},
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'react-native',
        cardinality: 'many',
        layout: 'swiftui-proposal-to-yoga',
        origin: 'local',
      },
    ],
    // SwiftUI proposes the root box and the hand-written slot shadow node writes it back.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeNavigationSplitViewColumn',
    publicName: null,
    props: { column: 'string' },
    events: { onNativeSDKEvent: { name: 'string', value: 'string' } },
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'toolbars',
        content: 'OneNativeToolbar',
        cardinality: 'many',
        layout: 'composed',
      },
      {
        name: 'content',
        content: 'OneNativeNavigationStackContent',
        cardinality: 'one',
        layout: 'swiftui-proposal-to-yoga',
        origin: 'local',
      },
    ],
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeTableCell',
    publicName: null,
    props: { rowId: 'string', columnId: 'string' },
    events: {},
    enumProps: {},
    host: { keys: ['rowId', 'columnId'] },
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeOutlineRow',
    publicName: null,
    props: { rowId: 'string' },
    events: {},
    enumProps: {},
    host: { keys: ['rowId'] },
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
] as const

// the static members of SwiftUI's VerticalAlignment and HorizontalAlignment
export const hStackAlignments = ['top', 'center', 'bottom', 'firstTextBaseline', 'lastTextBaseline'] as const
export const vStackAlignments = ['leading', 'center', 'trailing', 'listRowSeparatorLeading', 'listRowSeparatorTrailing'] as const
export const zStackAlignments = [
  'topLeading',
  'top',
  'topTrailing',
  'leading',
  'center',
  'trailing',
  'bottomLeading',
  'bottom',
  'bottomTrailing',
] as const

export function emitContainers(
  header: string,
  outputs: Map<string, string>,
  styleFields: readonly StyleField[]
) {
  for (const component of [...containerComponents, ...contentComponents]) {
    const props = Object.entries(component.props).map(([key, declared]) => ({
      key,
      optional: declared.endsWith('?'),
      type: declared.replace('?', ''),
    }))
    const eventEntries = Object.entries(component.events)
    // only a container that keeps control chrome carries swiftStyle as its own struct
    // prop; every other container styles through its children or not at all.
    const styled = 'swiftStyle' in component && component.swiftStyle === true
    const eventTypes = eventEntries
      .flatMap(([, fields]) => Object.values(fields as Record<string, string>))
      .join(' ')
    const commandEntries = Object.entries(
      'commands' in component ? (component.commands as Record<string, Record<string, string>>) : {}
    )
    const commandTypes = commandEntries
      .flatMap(([, args]) => Object.values(args))
      .join(' ')
    const reactNativeTypes = [
      ...(props.some(({ type }) => type === 'ColorValue') ? ['ColorValue'] : []),
      ...(commandEntries.length ? ['HostComponent'] : []),
      ...(styled ? ['ProcessedColorValue'] : []),
      'ViewProps',
    ]
    const codegenTypes = [
      ...new Set([
        ...(eventEntries.length ? ['DirectEventHandler', 'Int32'] : []),
        ...(props.some(({ type }) => type === 'Double') ||
        styled ||
        /\bDouble\b/.test(eventTypes) ||
        /\bDouble\b/.test(commandTypes)
          ? ['Double']
          : []),
        ...(styled ? ['WithDefault'] : []),
      ]),
    ]
    outputs.set(
      `src/platform/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ${reactNativeTypes.join(', ')} } from 'react-native'
${codegenTypes.length ? `import type { ${codegenTypes.join(', ')} } from 'react-native/Libraries/Types/CodegenTypes'\n` : ''}import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${commandEntries.length ? `import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands'\nimport type * as React from 'react'\n` : ''}${styled ? `type OneNativeStyleNative = Readonly<{\n${styleFields.map((field) => `  ${field.name}?: ${field.kind === 'number' ? 'WithDefault<Double, -1>' : field.kind === 'boolean' ? 'boolean' : field.kind === 'color' ? 'ProcessedColorValue' : 'string'}`).join('\n')}\n  sdkModifiers?: string\n}>\n` : ''}interface NativeProps extends ViewProps {
${props.map(({ key, optional, type }) => `  ${key}${optional ? '?' : ''}: ${type}`).join('\n')}
${styled ? '  swiftStyle?: OneNativeStyleNative\n' : ''}${eventEntries.map(([name, fields]) => `  ${name}?: DirectEventHandler<\n    Readonly<{ ${Object.entries(fields as Record<string, string>).map(([field, type]) => `${field}: ${type}`).join('; ')} }>\n  >`).join('\n')}
}
${commandEntries.length ? `interface NativeCommands {\n${commandEntries.map(([name, args]) => `  ${name}(viewRef: React.ElementRef<HostComponent<NativeProps>>, ${Object.entries(args).map(([arg, type]) => `${arg}: ${type}`).join(', ')}): void`).join('\n')}\n}\nexport const Commands = codegenNativeCommands<NativeCommands>({\n  supportedCommands: [${commandEntries.map(([name]) => `'${name}'`).join(', ')}],\n})\n` : ''}export default codegenNativeComponent<NativeProps>('${component.name}'${component.interfaceOnly ? ', { interfaceOnly: true }' : ''})
`
    )
  }
  outputs.set(
    'src/platform/generated/containerTypes.ts',
    header +
      `import type { ReactNode } from 'react'
import type { ColorValue, ViewProps } from 'react-native'
import type { GlassEffect, GlassEffectShape, Material, OneNativeStyle, OneNativeViewProps } from './controlTypes'
import type * as Styles from './swiftui'
import type { ColorScheme, ControlSize, DynamicTypeSize, SpacerSizing, ToolbarItemPlacement } from './swiftui'
import type { SFSymbolName } from './sfSymbolNames'
export type HStackAlignment = ${hStackAlignments.map((value) => JSON.stringify(value)).join(' | ')}
export type VStackAlignment = ${vStackAlignments.map((value) => JSON.stringify(value)).join(' | ')}
export type ZStackAlignment = ${zStackAlignments.map((value) => JSON.stringify(value)).join(' | ')}
export interface EnvironmentProps {
  colorScheme?: ColorScheme
  dynamicTypeSize?: DynamicTypeSize
  controlSize?: ControlSize
  locale?: string
  tint?: ColorValue
  isEnabled?: boolean
}
export interface HStackProps extends ViewProps {
  alignment?: HStackAlignment
  spacing?: number
  swiftStyle?: OneNativeStyle
  children: ReactNode
}
export interface VStackProps extends ViewProps {
  alignment?: VStackAlignment
  spacing?: number
  swiftStyle?: OneNativeStyle
  children: ReactNode
}
export interface ZStackProps extends ViewProps {
  alignment?: ZStackAlignment
  swiftStyle?: OneNativeStyle
  children: ReactNode
}
export interface SpacerProps extends ViewProps {
  minLength?: number
  swiftStyle?: OneNativeStyle
}
export type FormSizing = 'fill' | 'content'
export interface FormProps extends ViewProps, EnvironmentProps {
  sizing?: FormSizing
  swiftStyle?: OneNativeStyle
  children: ReactNode
}
export interface SectionProps extends ViewProps {
  title?: string
  footer?: string
  swiftStyle?: OneNativeStyle
  children: ReactNode
}
export interface LabeledContentProps extends ViewProps {
  label: string
  value?: string
  systemImage?: SFSymbolName | ''
  swiftStyle?: OneNativeStyle
  children?: ReactNode
}
export interface ButtonProps extends OneNativeViewProps {
  onPress?: () => void
  label?: string
  systemImage?: SFSymbolName | ''
  buttonRole?: Styles.ButtonRole | ''
  children?: ReactNode
}
export interface GlassProps extends ViewProps {
  material?: Material
  glassEffect?: GlassEffect
  interactive?: boolean
  shape?: GlassEffectShape
  cornerRadius?: number
  tint?: ColorValue
  colorScheme?: ColorScheme
  swiftStyle?: OneNativeStyle
  children: ReactNode
}
export interface SlotProps extends ViewProps {
  height: number
  width?: number
  children: ReactNode
}
export interface NavigationStackProps extends OneNativeViewProps {
  children: ReactNode
}
export type NavigationSplitViewVisibility = 'automatic' | 'all' | 'doubleColumn' | 'detailOnly'
export type NavigationSplitViewColumn = 'sidebar' | 'content' | 'detail'
export interface NavigationSplitViewProps extends OneNativeViewProps {
  columnVisibility?: NavigationSplitViewVisibility
  onColumnVisibilityChange?: (visibility: NavigationSplitViewVisibility) => void
  preferredCompactColumn?: NavigationSplitViewColumn
  onPreferredCompactColumnChange?: (column: NavigationSplitViewColumn) => void
  children: ReactNode
}
export interface NavigationSplitViewColumnProps extends OneNativeViewProps {
  children: ReactNode
}
export interface ToolbarProps extends ViewProps {
  children: ReactNode
}
export interface ToolbarContentProps extends ViewProps {
  children: ReactNode
}
export interface ToolbarItemProps extends OneNativeViewProps {
  placement?: ToolbarItemPlacement
  children: ReactNode
}
export interface ToolbarItemGroupProps extends OneNativeViewProps {
  placement?: ToolbarItemPlacement
  label?: string
  systemImage?: SFSymbolName | ''
  children: ReactNode
}
export interface ToolbarSpacerProps extends ViewProps {
  sizing?: SpacerSizing
  placement?: ToolbarItemPlacement
}
export const hStackAlignments = [${hStackAlignments.map((value) => JSON.stringify(value)).join(', ')}] as const
export const vStackAlignments = [${vStackAlignments.map((value) => JSON.stringify(value)).join(', ')}] as const
export const zStackAlignments = [${zStackAlignments.map((value) => JSON.stringify(value)).join(', ')}] as const
`
  )
  outputs.set(
    'ios/Generated/OneNativeEnvironment.swift',
    header +
      `import SwiftUI
import UIKit

final class OneNativeEnvironmentModel: ObservableObject {
  @Published var colorScheme = ""
  @Published var dynamicTypeSize = ""
  @Published var controlSize = ""
  @Published var locale = ""
  @Published var tint: UIColor?
  @Published var isEnabled = ""

  func configure(
    colorScheme: String, dynamicTypeSize: String, controlSize: String, locale: String,
    tint: UIColor?, isEnabled: String
  ) {
    if self.colorScheme != colorScheme { self.colorScheme = colorScheme }
    if self.dynamicTypeSize != dynamicTypeSize { self.dynamicTypeSize = dynamicTypeSize }
    if self.controlSize != controlSize { self.controlSize = controlSize }
    if self.locale != locale { self.locale = locale }
    if self.tint != tint { self.tint = tint }
    if self.isEnabled != isEnabled { self.isEnabled = isEnabled }
  }

  func reset() {
    colorScheme = ""
    dynamicTypeSize = ""
    controlSize = ""
    locale = ""
    tint = nil
    isEnabled = ""
  }
}

struct OneNativeEnvironment<Content: View>: View {
  @ObservedObject var model: OneNativeEnvironmentModel
  let content: Content

  var body: some View {
    content
      .oneNativeColorScheme(model.colorScheme)
      .oneNativeDynamicTypeSize(model.dynamicTypeSize)
      .oneNativeControlSize(model.controlSize)
      .oneNativeLocale(model.locale)
      .oneNativeEnvironmentTint(model.tint)
      .oneNativeIsEnabled(model.isEnabled)
  }
}

extension View {
  @ViewBuilder func oneNativeColorScheme(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.colorScheme, OneNativeGenerated.colorScheme(value)) }
  }

  @ViewBuilder func oneNativeDynamicTypeSize(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.dynamicTypeSize, OneNativeGenerated.dynamicTypeSize(value)) }
  }

  @ViewBuilder func oneNativeControlSize(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.controlSize, OneNativeGenerated.controlSize(value)) }
  }

  @ViewBuilder func oneNativeLocale(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.locale, Locale(identifier: value)) }
  }

  @ViewBuilder func oneNativeEnvironmentTint(_ value: UIColor?) -> some View {
    if let value { self.tint(Color(uiColor: value)) }
    else { self }
  }

  @ViewBuilder func oneNativeIsEnabled(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.isEnabled, value == "enabled") }
  }
}
`
  )
}
