// lists every public uikit view and view controller in the ios sdk with what a
// generated view host would expose: settable properties as props, target-action
// and delegate callbacks as events, and whether swiftui already has the view.
// run from packages/one:
//   bun codegen/sdk/views.ts [--json out.json]
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Bridge, buildIndex, collectFacts, inUniverse, type IndexFacts } from './bridge'
import { loadGraph, sdkModules, sdkVersion, type Fragment, type Relationship, type Symbol } from './graph'
import { parameterType, parseType, TypeParseError } from './types'

export type Prop = { name: string; ts: string; from: string }
export type Unbridged = { name: string; reason: string; from: string }
export type ViewEvent = {
  // control: a uicontrol target-action event; delegate: a delegate method that returns void
  kind: 'control' | 'delegate'
  name: string
  swift: string
  params: { name: string; ts: string }[]
  // set when a parameter cannot cross, with why
  unbridged?: string
  from: string
}
export type DelegateInfo = {
  property: string
  protocol: string
  events: ViewEvent[]
  // methods that must answer synchronously, so javascript cannot implement them as events
  queries: { swift: string; returns: string }[]
  from: string
}
export type SwiftUIEquivalent = {
  // covered: one has it; missing: swiftui has it and one does not; none: swiftui lacks it; unknown: not judged
  status: 'covered' | 'missing' | 'none' | 'unknown'
  name?: string
}
export type ViewReport = {
  name: string
  module: string
  kind: 'view' | 'controller'
  superclass: string
  deprecated: boolean
  control: boolean
  initializers: string[]
  props: Prop[]
  unbridgedProps: Unbridged[]
  events: ViewEvent[]
  delegates: DelegateInfo[]
  dataSources: DelegateInfo[]
  swiftUI: SwiftUIEquivalent
  // 0 to 100, set only for views swiftui lacks
  usefulness?: number
  why?: string
}

// the uicontrol events a control class sends; the symbol graph lists the event
// values but not which control sends which, so this is curated.
const CONTROL_EVENTS: Record<string, string[]> = {
  UIButton: ['touchDown', 'touchUpInside', 'touchUpOutside', 'touchCancel', 'primaryActionTriggered', 'menuActionTriggered'],
  UISwitch: ['valueChanged', 'primaryActionTriggered'],
  UISlider: ['valueChanged', 'touchDown', 'touchUpInside', 'touchUpOutside', 'touchCancel', 'primaryActionTriggered'],
  UIStepper: ['valueChanged', 'primaryActionTriggered'],
  UISegmentedControl: ['valueChanged', 'primaryActionTriggered'],
  UIPageControl: ['valueChanged', 'primaryActionTriggered'],
  UIDatePicker: ['valueChanged', 'primaryActionTriggered'],
  UIColorWell: ['valueChanged', 'primaryActionTriggered'],
  UIRefreshControl: ['valueChanged', 'primaryActionTriggered'],
  UITextField: ['editingDidBegin', 'editingChanged', 'editingDidEnd', 'editingDidEndOnExit', 'primaryActionTriggered'],
}
const DEFAULT_CONTROL_EVENTS = ['primaryActionTriggered']

// a uikit view and the swiftui view or modifier that does its job
const EQUIVALENT: Record<string, string> = {
  UILabel: 'Text', UIButton: 'Button', UISwitch: 'Toggle', UISlider: 'Slider', UIStepper: 'Stepper',
  UITextField: 'TextField', UITextView: 'TextEditor', UIImageView: 'Image', UIActivityIndicatorView: 'ProgressView',
  UIProgressView: 'ProgressView', UIDatePicker: 'DatePicker', UIColorWell: 'ColorPicker',
  UIColorPickerViewController: 'ColorPicker', UISegmentedControl: 'Picker', UIPickerView: 'Picker',
  UIScrollView: 'ScrollView', UITableView: 'List', UICollectionView: 'LazyVGrid', UIStackView: 'VStack',
  UIVisualEffectView: 'Material', UIPageControl: 'TabView', UIPageViewController: 'TabView',
  WKWebView: 'WebView', MKMapView: 'Map', AVPlayerViewController: 'VideoPlayer',
  PHPickerViewController: 'PhotosPicker', UIActivityViewController: 'ShareLink',
  UIDocumentPickerViewController: 'fileImporter', UISearchBar: 'searchable', UISearchController: 'searchable',
  UIRefreshControl: 'refreshable', UINavigationController: 'NavigationStack', UITabBarController: 'TabView',
  UITabBar: 'TabView', UISplitViewController: 'NavigationSplitView', UIAlertController: 'alert',
  UIToolbar: 'toolbar', UINavigationBar: 'navigationTitle', UITableViewController: 'List',
  UICollectionViewController: 'LazyVGrid', QLPreviewController: 'quickLookPreview',
  PKAddPassesViewController: 'AddPassToWalletButton', PKPaymentAuthorizationViewController: 'PayWithApplePayButton',
  CLLocationButton: 'LocationButton', MKCompassButton: 'MapCompass', MKUserTrackingButton: 'MapUserLocationButton',
  MKScaleView: 'MapScaleView', MKLookAroundViewController: 'LookAroundPreview', ARView: 'RealityView',
  SCNView: 'SceneView', SKView: 'SpriteView', UIHostingController: 'View', UIContentUnavailableView: 'ContentUnavailableView',
}

// views swiftui lacks, with how useful a generated host would be. an app reaches for
// these when it needs a system surface that swiftui never wrapped.
const LACKS: Record<string, [number, string]> = {
  UICalendarView: [100, 'month calendar with date selection and decorations'],
  PKCanvasView: [96, 'PencilKit drawing canvas'],
  PDFView: [95, 'PDF reader with page navigation and selection'],
  SFSafariViewController: [94, 'in-app browser with the user session and reader'],
  UIImagePickerController: [92, 'camera capture and legacy photo picker'],
  DataScannerViewController: [91, 'live text and barcode scanner'],
  VNDocumentCameraViewController: [90, 'document scanner'],
  UIFontPickerViewController: [88, 'system font picker'],
  UIDocumentBrowserViewController: [87, 'document browser for file-based apps'],
  CNContactPickerViewController: [85, 'contact picker'],
  CNContactViewController: [80, 'contact card view and editor'],
  EKEventEditViewController: [82, 'calendar event editor'],
  EKEventViewController: [70, 'calendar event card'],
  EKCalendarChooser: [64, 'calendar chooser'],
  MFMailComposeViewController: [80, 'mail composer'],
  MFMessageComposeViewController: [74, 'message composer'],
  MTKView: [78, 'Metal rendering surface'],
  PDFThumbnailView: [60, 'PDF page thumbnails'],
  HKActivityRingView: [66, 'activity rings'],
  AVRoutePickerView: [68, 'AirPlay route picker'],
  MPVolumeView: [62, 'system volume slider and route button'],
  MPMediaPickerController: [58, 'music library picker'],
  UIReferenceLibraryViewController: [60, 'dictionary definition sheet'],
  PHLivePhotoView: [60, 'Live Photo playback'],
  ARCoachingOverlayView: [66, 'AR coaching overlay'],
  ARSCNView: [56, 'ARKit with SceneKit'],
  SKStoreProductViewController: [58, 'App Store product sheet'],
  UICloudSharingController: [62, 'CloudKit sharing invitation'],
  PKAddPaymentPassViewController: [50, 'add card to Wallet'],
  GKGameCenterViewController: [46, 'Game Center dashboard'],
  UIVideoEditorController: [40, 'trim video'],
  UISearchTextField: [52, 'search field with tokens'],
  RPPreviewViewController: [28, 'screen recording preview'],
  RPSystemBroadcastPickerView: [32, 'broadcast picker'],
  UIInputView: [36, 'keyboard accessory host'],
  UIInputViewController: [40, 'custom keyboard controller'],
  INUIAddVoiceShortcutViewController: [34, 'add Siri shortcut'],
  INUIEditVoiceShortcutViewController: [30, 'edit Siri shortcut'],
  UIDocumentMenuViewController: [20, 'legacy document menu'],
  UITableViewCell: [54, 'table cell with content configuration'],
  UICollectionViewCell: [54, 'collection cell with content configuration'],
  UIListContentView: [50, 'list-style content configuration view'],
  UIDocumentViewController: [58, 'document-based app controller'],
  UIWindow: [20, 'window host'],
  LPLinkView: [68, 'rich link preview'],
  RoomCaptureView: [62, 'LiDAR room scan'],
  PaperMarkupViewController: [56, 'Markup canvas with shapes and text'],
  MarkupEditViewController: [44, 'PDF and image markup editor'],
  UITextFormattingViewController: [48, 'rich text formatting panel'],
  SWCollaborationView: [50, 'shared with you collaboration control'],
  SWAttributionView: [38, 'shared with you attribution'],
  HMCameraView: [44, 'HomeKit camera stream'],
  MSStickerView: [34, 'sticker view'],
  GKMatchmakerViewController: [36, 'Game Center matchmaking'],
  PKAddSecureElementPassViewController: [40, 'add a key to Wallet'],
  DDDevicePickerViewController: [34, 'accessory pairing picker'],
  ARSKView: [34, 'ARKit with SpriteKit'],
  BCChatButton: [26, 'Business Chat button'],
  GLKView: [22, 'OpenGL ES surface'],
  SKCloudServiceSetupViewController: [30, 'Apple Music subscription setup'],
}

type Info = {
  symbol: Symbol
  module: string
  superclass?: string
}

type Owner = { members: Symbol[]; requirements: Symbol[]; parents: string[] }

export type ViewsReport = {
  sdk: string
  controlEvents: string[]
  views: ViewReport[]
  totals: {
    views: number
    controllers: number
    props: number
    unbridgedProps: number
    events: number
    controlEvents: number
    delegateEvents: number
    delegateQueries: number
    covered: number
    missing: number
    none: number
    unknown: number
  }
  // curated names that no graph defines, so a stale table entry is visible
  staleCurated: string[]
}

const isDeprecated = (symbol: Symbol) =>
  !!symbol.availability?.some(
    (a) => a.isUnconditionallyDeprecated || (a.domain === 'iOS' && (a.deprecated || a.isUnconditionallyDeprecated))
  )

const spelled = (fragments?: Fragment[]) => (fragments ?? []).map((f) => f.spelling).join('')

// the declared type of a property: past the name's colon, before any accessor block or default
function propertyFragments(symbol: Symbol): Fragment[] | null {
  const fragments = symbol.declarationFragments ?? []
  const name = fragments.findIndex((f) => f.kind === 'identifier')
  const colon = fragments.findIndex((f, i) => i > name && f.kind === 'text' && f.spelling.includes(':'))
  if (colon < 0) return null
  const head = fragments[colon]
  const body = [{ ...head, spelling: head.spelling.slice(head.spelling.indexOf(':') + 1) }, ...fragments.slice(colon + 1)]
  const brace = body.findIndex((f) => f.kind === 'text' && /[{=]/.test(f.spelling))
  return brace < 0 ? body : [...body.slice(0, brace), { ...body[brace], spelling: body[brace].spelling.split(/[{=]/)[0] }]
}

// a stored `var` has no accessor block; an objective-c property spells `{ get set }`
function settable(symbol: Symbol) {
  const text = spelled(symbol.declarationFragments)
  if (/\blet\b/.test(text.split(':')[0])) return false
  const block = text.match(/\{([^{}]*)\}\s*$/)
  return block ? /\bset\b/.test(block[1]) : /\bvar\b/.test(text)
}

export function viewsReport(root: string): ViewsReport {
  const modules = sdkModules()
  const infos = new Map<string, Info>()
  const owners = new Map<string, Owner>()
  const symbols = new Map<string, Symbol>()
  const superOf = new Map<string, string>()
  const protocolParents = new Map<string, string[]>()
  const facts: IndexFacts[] = []
  const graphs: { module: string; relationships: Relationship[] }[] = []
  for (const module of modules) {
    const graph = loadGraph(root, module)
    if (!graph) continue
    facts.push(collectFacts(graph))
    for (const symbol of graph.symbols) {
      const usr = symbol.identifier.precise
      if (!symbols.has(usr)) symbols.set(usr, symbol)
      if (symbol.kind.identifier === 'swift.class' && !symbol.swiftExtension && !infos.has(usr)) {
        infos.set(usr, { symbol, module })
      }
    }
    graphs.push({ module, relationships: graph.relationships })
  }
  const bridge = new Bridge(buildIndex(facts))
  const seenRelationship = new Set<string>()
  const ownerOf = (usr: string) => owners.get(usr) ?? owners.set(usr, { members: [], requirements: [], parents: [] }).get(usr)!
  for (const { relationships } of graphs) {
    for (const rel of relationships) {
      const key = `${rel.kind}|${rel.source}|${rel.target}`
      if (seenRelationship.has(key)) continue
      seenRelationship.add(key)
      const member = symbols.get(rel.source)
      if (rel.kind === 'inheritsFrom') {
        if (symbols.get(rel.source)?.kind.identifier === 'swift.protocol') {
          protocolParents.set(rel.source, [...(protocolParents.get(rel.source) ?? []), rel.target])
        } else superOf.set(rel.source, rel.target)
      } else if (rel.kind === 'memberOf' && member) ownerOf(rel.target).members.push(member)
      else if ((rel.kind === 'requirementOf' || rel.kind === 'optionalRequirementOf') && member) {
        ownerOf(rel.target).requirements.push(member)
      }
    }
  }

  const rootOf = (usr: string, view: string, controller: string) => {
    for (let at = superOf.get(usr), hops = 0; at && hops < 64; at = superOf.get(at), hops++) {
      if (at === view) return 'view'
      if (at === controller) return 'controller'
    }
    return null
  }
  const UIVIEW = 'c:objc(cs)UIView'
  const UIVC = 'c:objc(cs)UIViewController'
  const chainOf = (usr: string) => {
    const chain: string[] = []
    for (let at: string | undefined = usr; at && chain.length < 64; at = superOf.get(at)) chain.push(at)
    return chain
  }
  const nameOf = (usr: string) => symbols.get(usr)?.pathComponents.join('.') ?? usr
  const stop = new Set([UIVIEW, UIVC])

  const covered = coveredNames()
  const universe = new Set<string>()
  const reports: ViewReport[] = []
  const controlEventNames = (symbols.size
    ? [...symbols.values()].filter(
        (s) => s.pathComponents[0] === 'UIControl' && s.pathComponents[1] === 'Event' && s.kind.identifier === 'swift.type.property'
      )
    : []
  ).map((s) => s.pathComponents[2]).sort()

  const eventsOf = (protocol: string, from: string, seen = new Set<string>()): { events: ViewEvent[]; queries: DelegateInfo['queries'] } => {
    const events: ViewEvent[] = []
    const queries: DelegateInfo['queries'] = []
    if (seen.has(protocol)) return { events, queries }
    seen.add(protocol)
    for (const requirement of owners.get(protocol)?.requirements ?? []) {
      const kind = requirement.kind.identifier
      if (kind !== 'swift.method' || !inUniverse(requirement, new Set()) || isDeprecated(requirement)) continue
      const signature = requirement.functionSignature
      const returns = spelled(signature?.returns).trim()
      const swift = requirement.pathComponents.at(-1)!
      if (returns && returns !== '()' && returns !== 'Void') {
        queries.push({ swift, returns })
        continue
      }
      const params: ViewEvent['params'] = []
      let unbridged: string | undefined
      const list = signature?.parameters ?? []
      // the first parameter is the sending view, which the host already is
      for (const [index, parameter] of list.entries()) {
        let type
        try {
          type = parameterType(parameter.declarationFragments)
        } catch (error) {
          if (error instanceof TypeParseError) { unbridged = 'unparsed type'; continue }
          throw error
        }
        if (index === 0 && type.k === 'named' && type.usr && universe.has(type.usr)) continue
        const b = bridge.type(type, 'output', new Set())
        if (b.ok) params.push({ name: parameter.name, ts: b.ts })
        else unbridged = b.reason
      }
      const labels = swift.slice(swift.indexOf('(') + 1, -1).split(':').filter(Boolean)
      const base = swift.slice(0, swift.indexOf('('))
      // `calendarView(_:didChangeVisibleDateComponentsFrom:)` is named by its label, while
      // `scrollViewDidScroll(_:)` and `scrollViewWillEndDragging(_:withVelocity:...)` are named by the method
      const second = labels[1]
      const label = labels[0] === '_' && second && !/(Did|Will|Should|Can)[A-Z]/.test(base) && /^(did|will|should|can|accessory)/.test(second) ? second : labels[0] !== '_' && labels[0] ? labels[0] : base
      events.push({ kind: 'delegate', name: label, swift, params, ...(unbridged ? { unbridged } : {}), from })
    }
    for (const parent of protocolParents.get(protocol) ?? []) {
      const inherited = eventsOf(parent, from, seen)
      events.push(...inherited.events)
      queries.push(...inherited.queries)
    }
    return { events, queries }
  }

  // the sending view in a delegate method is any view or controller in the sdk
  universe.add(UIVIEW)
  universe.add(UIVC)
  for (const usr of infos.keys()) if (rootOf(usr, UIVIEW, UIVC)) universe.add(usr)

  for (const [usr, info] of infos) {
    const kind = rootOf(usr, UIVIEW, UIVC)
    if (!kind) continue
    if (!inUniverse(info.symbol, new Set())) continue
    const name = nameOf(usr)
    const chain = chainOf(usr).filter((at) => !stop.has(at) && symbols.has(at) && !/^NSObject$/.test(nameOf(at)))
    const control = chainOf(usr).some((at) => nameOf(at) === 'UIControl')
    const props = new Map<string, Prop>()
    const unbridgedProps = new Map<string, Unbridged>()
    const delegates: DelegateInfo[] = []
    const dataSources: DelegateInfo[] = []
    const initializers: string[] = []
    for (const at of chain) {
      const from = nameOf(at)
      for (const member of owners.get(at)?.members ?? []) {
        if (!inUniverse(member, new Set()) || isDeprecated(member)) continue
        const memberName = member.pathComponents.at(-1)!
        const memberKind = member.kind.identifier
        if (memberKind === 'swift.init' && at === usr) {
          initializers.push(spelled(member.declarationFragments).replace(/\s+/g, ' ').trim())
          continue
        }
        if (memberKind !== 'swift.property' || props.has(memberName) || unbridgedProps.has(memberName)) continue
        if (!settable(member)) continue
        const fragments = propertyFragments(member)
        if (!fragments) continue
        let type
        try {
          type = parseType(fragments)
        } catch (error) {
          if (error instanceof TypeParseError) { unbridgedProps.set(memberName, { name: memberName, reason: 'unparsed type', from }); continue }
          throw error
        }
        const delegateLike = /(^|[a-z])(delegate|dataSource)$/i.test(memberName)
        const b = bridge.type(type, 'input', new Set())
        if (delegateLike) {
          const typeUsr = fragments.find((f) => f.kind === 'typeIdentifier' && bridge.index.get(f.preciseIdentifier ?? '')?.kind === 'protocol')?.preciseIdentifier
          if (!typeUsr) continue
          const { events, queries } = eventsOf(typeUsr, from)
          const entry: DelegateInfo = { property: memberName, protocol: nameOf(typeUsr), events, queries, from }
          ;(/dataSource$/i.test(memberName) ? dataSources : delegates).push(entry)
          continue
        }
        if (b.ok) props.set(memberName, { name: memberName, ts: b.ts, from })
        else unbridgedProps.set(memberName, { name: memberName, reason: b.reason, from })
      }
    }
    const events: ViewEvent[] = []
    if (control) {
      for (const event of CONTROL_EVENTS[name] ?? DEFAULT_CONTROL_EVENTS) {
        events.push({ kind: 'control', name: event, swift: `UIControl.Event.${event}`, params: [], from: 'UIControl' })
      }
    }
    for (const d of delegates) events.push(...d.events)

    const equivalent = EQUIVALENT[name]
    const lacks = LACKS[name]
    const swiftUI: SwiftUIEquivalent = equivalent
      ? { status: covered.has(equivalent) ? 'covered' : 'missing', name: equivalent }
      : lacks && lacks[0] > 0
        ? { status: 'none' }
        : { status: 'unknown' }
    const superclass = superOf.get(usr)
    reports.push({
      name,
      module: info.module,
      kind,
      superclass: superclass ? nameOf(superclass) : 'NSObject',
      deprecated: isDeprecated(info.symbol),
      control,
      initializers,
      props: [...props.values()],
      unbridgedProps: [...unbridgedProps.values()],
      events,
      delegates,
      dataSources,
      swiftUI,
      ...(swiftUI.status === 'none' ? { usefulness: lacks[0], why: lacks[1] } : {}),
    })
  }
  reports.sort((a, b) => a.name.localeCompare(b.name))

  const names = new Set(reports.map((r) => r.name))
  // a prop or event inherited from a superclass counts once, on the class that declares it
  const own = (pick: (r: ViewReport) => { name: string; from: string; kind?: string }[]) => {
    const seen = new Set<string>()
    for (const r of reports) for (const x of pick(r)) seen.add(`${x.from}|${x.name}|${(x as { swift?: string }).swift ?? ''}`)
    return seen
  }
  const totals = {
    views: reports.filter((r) => r.kind === 'view').length,
    controllers: reports.filter((r) => r.kind === 'controller').length,
    props: own((r) => r.props).size,
    unbridgedProps: own((r) => r.unbridgedProps).size,
    events: own((r) => r.events).size,
    controlEvents: new Set(reports.flatMap((r) => r.events).filter((e) => e.kind === 'control').map((e) => `${e.name}`)).size,
    delegateEvents: new Set(reports.flatMap((r) => r.events).filter((e) => e.kind === 'delegate').map((e) => `${e.from}|${e.swift}`)).size,
    delegateQueries: new Set(reports.flatMap((r) => r.delegates).flatMap((d) => d.queries.map((q) => `${d.protocol}|${q.swift}`))).size,
    covered: reports.filter((r) => r.swiftUI.status === 'covered').length,
    missing: reports.filter((r) => r.swiftUI.status === 'missing').length,
    none: reports.filter((r) => r.swiftUI.status === 'none').length,
    unknown: reports.filter((r) => r.swiftUI.status === 'unknown').length,
  }
  const staleCurated = [...new Set([...Object.keys(EQUIVALENT), ...Object.keys(LACKS)])]
    .filter((name) => !names.has(name))
    .sort()
  return { sdk: sdkVersion(), controlEvents: controlEventNames, views: reports, totals, staleCurated }
}

// the swiftui view and modifier names one exposes, from the checked-in manifest and the catalog
function coveredNames() {
  const manifest = JSON.parse(readFileSync(join(import.meta.dirname, '../swiftui-manifest.json'), 'utf8')) as {
    coverage: { views: Record<string, string[]>; modifiers: Record<string, string[]> }
  }
  const names = new Set<string>()
  for (const list of Object.values(manifest.coverage.views)) for (const n of list) names.add(n)
  for (const list of Object.values(manifest.coverage.modifiers)) for (const n of list) names.add(n)
  return names
}

const rank = (a: ViewReport, b: ViewReport) =>
  (b.usefulness ?? 0) - (a.usefulness ?? 0) || b.props.length + b.events.length - (a.props.length + a.events.length)

if (import.meta.main) {
  const args = process.argv.slice(2)
  const jsonAt = args.indexOf('--json')
  const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : join(process.cwd(), '.codegen-cache/sdk-views.json')
  const report = viewsReport(process.cwd())
  writeFileSync(jsonOut, JSON.stringify(report, null, 2))
  const t = report.totals
  console.log(`${t.views + t.controllers} public uikit hosts: ${t.views} views, ${t.controllers} view controllers`)
  console.log(`${t.props} props (${t.unbridgedProps} more cannot cross), ${t.events} events: ${t.controlEvents} target-action, ${t.delegateEvents} delegate (${t.delegateQueries} delegate methods answer synchronously and are not events)`)
  console.log(`swiftui: ${t.covered} covered by one, ${t.missing} in swiftui but not in one, ${t.none} swiftui lacks, ${t.unknown} not judged`)
  console.log('\ntop 40 views swiftui lacks:')
  const lacking = report.views.filter((v) => v.swiftUI.status === 'none').sort(rank).slice(0, 40)
  for (const v of lacking) {
    console.log(`  ${String(v.usefulness).padStart(3)}  ${v.name.padEnd(36)} ${v.module.padEnd(16)} ${String(v.props.length).padStart(3)} props ${String(v.events.length).padStart(3)} events  ${v.why}`)
  }
  if (report.staleCurated.length) console.log(`\nnot found in the sdk: ${report.staleCurated.join(', ')}`)
  console.log(`\nwrote ${jsonOut}`)
}
