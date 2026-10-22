import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { transform } from 'esbuild'
import { resolveIosSdkImport } from '../../utils/iosSdkFacade'
import type { calendarNative as backendCalendarNative } from './backend.ios'

// boundary integration over the real ios calendar backend. production keeps
// the public one/ios/* specifiers (native package export, also resolved by
// the shipped metro/vite resolvers). web vitest cannot resolve those specifiers,
// so a test-local harness rewrites them to temp doubles and loads the real
// backend source through esbuild. no global config, no production fallback.
// native thread hop timing stays unproven here and needs a device run.

type BackendCal = ReturnType<typeof backendCalendarNative>
type Harness = { calendarNative: () => BackendCal; host: typeof host }

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(here, '..', '..', '..')

async function loadHarness(): Promise<Harness> {
  // single temp module: doubles inlined above the real backend source so both
  // share one instance no matter which loader imports the file.
  const testSource = readFileSync(join(here, 'backend.ios.test.ts'), 'utf8')
  const startMarker = '\n// harness-doubles-start\n'
  const endMarker = '\n// harness-doubles-end'
  const start = testSource.indexOf(startMarker)
  const end = testSource.indexOf(endMarker)
  if (start < 0 || end < 0 || end <= start)
    throw new Error('doubles section missing')
  const doublesTs = testSource.slice(start + startMarker.length, end)
  const backendSource = readFileSync(join(here, 'backend.ios.ts'), 'utf8')
  const rewritten = backendSource
    .replace(
      /import\s*\{[^}]*\}\s*from\s*'one\/ios\/Foundation'/,
      `const Bundle = FakeBundle
const NativeCalendar = FakeCalendar
const CharacterSet = FakeCharacterSet
const NSError = FakeNSError
const NSString = FakeNSString`
    )
    .replace(
      /import\s*\{[^}]*\}\s*from\s*'one\/ios\/EventKit'/,
      `const EKEvent = FakeEvent
const EKEventStore = FakeEventStore
const EKRecurrenceEnd = FakeRecurrenceEnd
const EKRecurrenceRule = FakeRecurrenceRule
const EKReminder = FakeReminder`
    )
    .replace(
      /import\s*\{[^}]*\}\s*from\s*'one\/ios-runtime'/,
      `const callSDKMethodAsync = fakeCallSDKMethodAsync`
    )
  if (rewritten.includes('one/ios/'))
    throw new Error('backend specifiers not fully rewritten')
  const combined = `${doublesTs}\n${rewritten}\nexport { host };\n`
  const code = (await transform(combined, { loader: 'ts' })).code
  const tmp = mkdtempSync(join(tmpdir(), 'cal-ios-'))
  writeFileSync(join(tmp, 'backend.mjs'), code)
  const mod = (await import(pathToFileURL(join(tmp, 'backend.mjs')).href)) as {
    calendarNative: () => BackendCal
    host: Harness['host']
  }
  return { calendarNative: mod.calendarNative, host: mod.host }
}

let ctx!: Harness
beforeAll(async () => {
  ctx = await loadHarness()
})
beforeEach(() => {
  ctx.host.reset()
})
function backend() {
  return ctx.calendarNative()
}

describe('calendar ios production import closure', () => {
  it('keeps public one/ios specifiers in production source', () => {
    const source = readFileSync(join(here, 'backend.ios.ts'), 'utf8')
    expect(source).toContain(`from 'one/ios/Foundation'`)
    expect(source).toContain(`from 'one/ios/EventKit'`)
    expect(source).toContain(`from 'one/ios-runtime'`)
    expect(source).not.toContain('ios-bindings')
  })

  it('resolves public facades through the shipped native resolver', () => {
    for (const framework of ['Foundation', 'EventKit']) {
      const file = resolveIosSdkImport(
        packageRoot,
        `one/ios/${framework}`,
        'ios',
        join(here, 'backend.ios.ts')
      )
      expect(file).toBe(join(packageRoot, 'ios-bindings', `${framework}.ts`))
      expect(existsSync(file!)).toBe(true)
    }
    expect(() =>
      resolveIosSdkImport(packageRoot, 'one/ios/EventKit', 'android', 'x')
    ).toThrow('is an iOS framework')
  })

  it('proves relative dist imports would miss the shipped facade', () => {
    expect(existsSync(join(packageRoot, 'ios-bindings', 'EventKit.ts'))).toBe(
      true
    )
    expect(existsSync(join(packageRoot, 'dist', 'ios-bindings'))).toBe(false)
  })
})

describe('calendar ios background boundary', () => {
  it('runs blocking store work through the background helper, never sync on js', async () => {
    const cal = backend()
    const id = await cal.create({
      title: 'A',
      startMs: 1000,
      endMs: 2000,
      allDay: false,
    })
    expect(typeof id).toBe('string')
    const listed = await cal.list(0, 86_400_000, 10)
    expect(listed).toHaveLength(1)
    const updated = await cal.update(id, 1000, { title: 'B' })
    expect(updated.title).toBe('B')
    await cal.remove(id, 1000)
    const rid = await cal.createReminder({ title: 'R' })
    await cal.setReminderCompleted(rid, true)
    await cal.removeReminder(rid)
    for (const method of [
      'events',
      'saveSpanCommit',
      'removeSpanCommit',
      'saveCommit',
      'removeCommit',
      'calendarItem',
    ]) {
      expect(ctx.host.FakeEventStore.asyncCalls).toContain(method)
    }
    expect(ctx.host.FakeEventStore.directSyncExpensive).toEqual([])
  })

  it('keeps permission reads sync and callbacks on the native path', async () => {
    const cal = backend()
    expect(cal.getPermissionStatus()).toBe('fullAccess')
    expect(cal.getRemindersPermissionStatus()).toBe('fullAccess')
    expect(ctx.host.FakeEventStore.asyncCalls).toEqual([])
    ctx.host.FakeEventStore.authEvent = 'notDetermined'
    ctx.host.FakeEventStore.requestDelayMs = 5
    const status = await cal.requestPermission()
    expect(status).toBe('fullAccess')
    expect(ctx.host.FakeEventStore.syncInitiations).toContain(
      'requestFullAccessToEvents'
    )
    expect(ctx.host.FakeEventStore.asyncCalls).not.toContain(
      'requestFullAccessToEvents'
    )
    ctx.host.FakeEventStore.authReminder = 'notDetermined'
    const reminderStatus = await cal.requestRemindersPermission()
    expect(reminderStatus).toBe('fullAccess')
    expect(ctx.host.FakeEventStore.syncInitiations).toContain(
      'requestFullAccessToReminders'
    )
    await cal.listReminders(10, false)
    expect(ctx.host.FakeEventStore.syncInitiations).toContain('fetchReminders')
    expect(ctx.host.FakeEventStore.asyncCalls).not.toContain('fetchReminders')
  })

  it('does not block later operations on a permission dialog', async () => {
    const cal = backend()
    ctx.host.FakeEventStore.authEvent = 'notDetermined'
    ctx.host.FakeEventStore.requestDelayMs = 60
    const request = cal.requestPermission()
    const list = cal
      .list(0, 1000, 10)
      .then(
        () => 'resolved',
        (error: Error & { code?: string }) => error.code
      )
    expect(await list).toBe('E_CALENDAR_PERMISSION')
    expect(await request).toBe('fullAccess')
  })

  it('serializes overlapping mutations without interleaving', async () => {
    const cal = backend()
    const [first, second] = await Promise.all([
      cal.create({ title: 'A', startMs: 1000, endMs: 2000, allDay: false }),
      cal.create({ title: 'B', startMs: 3000, endMs: 4000, allDay: false }),
    ])
    expect(first).not.toBe(second)
    expect(ctx.host.overlap.max).toBe(1)
    const listed = await cal.list(0, 86_400_000, 10)
    expect(listed.map((event) => event.title).sort()).toEqual(['A', 'B'])
  })

  it('propagates failures without poisoning later operations', async () => {
    const cal = backend()
    ctx.host.FakeEventStore.failNext = {
      method: 'saveSpanCommit',
      error: new Error('disk full'),
    }
    await expect(
      cal.create({ title: 'Fail', startMs: 1000, endMs: 2000, allDay: false })
    ).rejects.toMatchObject({
      code: 'E_CALENDAR_SAVE',
      message: 'Calendar.create: disk full',
    })
    const id = await cal.create({
      title: 'Ok',
      startMs: 3000,
      endMs: 4000,
      allDay: false,
    })
    expect(typeof id).toBe('string')
    ctx.host.FakeEventStore.failNext = {
      method: 'saveCommit',
      error: new Error('store busy'),
    }
    await expect(cal.createReminder({ title: 'Fail' })).rejects.toMatchObject({
      code: 'E_REMINDERS_SAVE',
      message: 'Calendar.createReminder: store busy',
    })
    const rid = await cal.createReminder({ title: 'Ok' })
    expect(typeof rid).toBe('string')
  })

  it('preserves exact sort, limit and output shape', async () => {
    const cal = backend()
    const store = new ctx.host.FakeEventStore()
    for (const [title, start, end] of [
      ['C', 3000, 3100],
      ['A', 1000, 1100],
      ['B', 2000, 2100],
    ] as const) {
      const event = new ctx.host.FakeEvent(store)
      event.title = title
      event.startDate = new Date(start)
      event.endDate = new Date(end)
      event.isAllDay = false
      event.location = `${title}-loc`
      event.eventIdentifier = `seed-${title}`
      ctx.host.FakeEventStore.events.push(event)
    }
    const listed = await cal.list(0, 86_400_000, 2)
    expect(listed.map((event) => event.title)).toEqual(['A', 'B'])
    expect(listed[0]).toMatchObject({
      identifier: 'seed-A',
      title: 'A',
      startMs: 1000,
      endMs: 1100,
      allDay: false,
      location: 'A-loc',
    })
    for (const [title, dueMs, completed] of [
      ['Z', 3000, false],
      ['A', 1000, false],
      ['M', 1000, false],
      ['Done', 500, true],
    ] as const) {
      const reminder = new ctx.host.FakeReminder(store)
      reminder.title = title
      reminder.dueDateComponents = { ms: dueMs }
      reminder.isCompleted = completed
      ctx.host.FakeEventStore.reminders.push(reminder)
    }
    const reminders = await cal.listReminders(10, false)
    expect(reminders.map((item) => item.title)).toEqual(['A', 'M', 'Z'])
    expect(reminders[0]).toMatchObject({
      title: 'A',
      completed: false,
      dueMs: 1000,
    })
    const limited = await cal.listReminders(2, false)
    expect(limited.map((item) => item.title)).toEqual(['A', 'M'])
  })

  it('preserves event error codes and messages', async () => {
    const cal = backend()
    ctx.host.FakeEventStore.usageEvent = ''
    await expect(cal.list(0, 1000, 10)).rejects.toMatchObject({
      code: 'E_CALENDAR_MANIFEST',
      message: 'Calendar.list: set native.app.calendar.usage',
    })
    ctx.host.FakeEventStore.usageEvent = 'calendar usage'
    ctx.host.FakeEventStore.authEvent = 'denied'
    await expect(cal.list(0, 1000, 10)).rejects.toMatchObject({
      code: 'E_CALENDAR_PERMISSION',
      message: 'Calendar.list: full calendar access is required',
    })
    ctx.host.FakeEventStore.authEvent = 'fullAccess'
    await expect(cal.list(1000, 500, 10)).rejects.toMatchObject({
      code: 'E_CALENDAR_INPUT',
    })
    await expect(
      cal.create({ title: '  ', startMs: 1000, endMs: 2000, allDay: false })
    ).rejects.toMatchObject({ code: 'E_CALENDAR_INPUT' })
    await expect(cal.update('missing', 1000, { title: 'X' })).rejects.toMatchObject(
      {
        code: 'E_CALENDAR_NOT_FOUND',
        message: 'Calendar.update: event occurrence was not found',
      }
    )
    await expect(cal.remove('missing', 1000)).rejects.toMatchObject({
      code: 'E_CALENDAR_NOT_FOUND',
      message: 'Calendar.delete: event occurrence was not found',
    })
    ctx.host.FakeEventStore.calendars.events = null
    await expect(
      cal.create({ title: 'A', startMs: 1000, endMs: 2000, allDay: false })
    ).rejects.toMatchObject({
      code: 'E_CALENDAR_UNAVAILABLE',
      message: 'Calendar.create: no writable calendar is available',
    })
  })

  it('preserves reminder error codes and messages', async () => {
    const cal = backend()
    ctx.host.FakeEventStore.usageReminder = undefined
    await expect(cal.listReminders(10, false)).rejects.toMatchObject({
      code: 'E_REMINDERS_MANIFEST',
      message: 'Calendar.listReminders: set native.app.calendar.remindersUsage',
    })
    ctx.host.FakeEventStore.usageReminder = 'reminders usage'
    ctx.host.FakeEventStore.authReminder = 'denied'
    await expect(cal.listReminders(10, false)).rejects.toMatchObject({
      code: 'E_REMINDERS_PERMISSION',
    })
    ctx.host.FakeEventStore.authReminder = 'fullAccess'
    await expect(cal.listReminders(0, false)).rejects.toMatchObject({
      code: 'E_REMINDERS_INPUT',
    })
    await expect(cal.createReminder({ title: '' })).rejects.toMatchObject({
      code: 'E_REMINDERS_INPUT',
    })
    await expect(
      cal.setReminderCompleted('missing', true)
    ).rejects.toMatchObject({
      code: 'E_REMINDERS_NOT_FOUND',
      message: 'Calendar.setReminderCompleted: reminder was not found',
    })
    await expect(cal.removeReminder('missing')).rejects.toMatchObject({
      code: 'E_REMINDERS_NOT_FOUND',
      message: 'Calendar.deleteReminder: reminder was not found',
    })
    ctx.host.FakeEventStore.calendars.reminders = null
    await expect(cal.createReminder({ title: 'R' })).rejects.toMatchObject({
      code: 'E_REMINDERS_UNAVAILABLE',
    })
  })
})

describe('calendar ios real entry and wire boundary', () => {
  it('dispatches a real store read through callAsync, never sync', async () => {
    const runtime = await import('one/ios-runtime')
    const syncIds: number[] = []
    const asyncIds: number[] = []
    const fake = {
      call: ((...args: [string, number, unknown, ...unknown[]]) => {
        const [_module, id] = args
        syncIds.push(id)
        if (id === 1727445216892317) return 'EKErrorDomain'
        if (id === 3696501966012837)
          return { typeName: 'EKEventStore', identity: 'wire-store' }
        if (id === 2520652220065123)
          return { typeName: 'WireTest.Predicate', identity: 'wire-pred' }
        throw new Error(`unexpected sync call ${id}`)
      }) as never,
      callAsync: (async (...args: [string, number, unknown, ...unknown[]]) => {
        const [_module, id] = args
        asyncIds.push(id)
        if (id === 3345005257635934) return []
        throw new Error(`unexpected async call ${id}`)
      }) as never,
      callSync: (() => {
        throw new Error('must not use callSync')
      }) as never,
      callFunction: (() => {
        throw new Error('must not use callFunction')
      }) as never,
      observe: (() => () => {}) as never,
      subscribe: (() => () => {}) as never,
    }
    runtime.setSDKNative(fake as never)
    const { EKEventStore: RealStore } = await import(
      '../../../ios-bindings/EventKit'
    )
    const store = RealStore.init()
    const predicate = store.predicateForEvents(new Date(0), new Date(1000))
    const events = await runtime.callSDKMethodAsync(store, 'events', predicate)
    expect(events).toEqual([])
    expect(asyncIds).toEqual([3345005257635934])
    expect(syncIds).not.toContain(3345005257635934)
    // native timing unproven: the fake transport resolves on a js microtask,
    // not the ios background queue. proving off-js execution needs a device.
  })
})

// harness doubles below run only inside the temp module the harness builds.
// the copies here are the single source for extraction plus static types.
// tests use ctx.host (same shape, shared with the transformed backend).
// harness-doubles-start
let asyncDepth = 0
const isAsync = () => asyncDepth > 0

const overlap = {
  current: 0,
  max: 0,
  reset() {
    this.current = 0
    this.max = 0
  },
  start() {
    this.current += 1
    if (this.current > this.max) this.max = this.current
  },
  end() {
    this.current -= 1
  },
}

class FakeNSString {
  constructor(private value: string) {}
  static initString(value: string) {
    return new FakeNSString(value)
  }
  trimmingCharacters(_set: unknown) {
    return this.value.trim()
  }
  compare(other: string) {
    if (this.value < other) return 'orderedAscending'
    if (this.value === other) return 'orderedSame'
    return 'orderedDescending'
  }
}
const FakeCharacterSet = { whitespacesAndNewlines: {} }
const FakeBundle = {
  main: {
    object: (key: string): unknown => {
      if (key === 'NSCalendarsFullAccessUsageDescription')
        return FakeEventStore.usageEvent
      if (key === 'NSRemindersFullAccessUsageDescription')
        return FakeEventStore.usageReminder
      return undefined
    },
  },
}
const FakeCalendar = {
  current: {
    dateFrom: (components: { ms?: number } | null): Date | null =>
      components && typeof components.ms === 'number'
        ? new Date(components.ms)
        : null,
    dateComponentsFrom: (_units: string[], date: Date) => ({
      ms: date.getTime(),
    }),
  },
}
class FakeNSError {
  constructor(public $handle: { message?: string }) {}
  get localizedDescription() {
    return this.$handle?.message ?? 'native error'
  }
}

class FakeRecurrenceEnd {
  constructor(
    public endDate?: Date,
    public occurrenceCount = 0
  ) {}
  static initOccurrenceCount(count: number) {
    return new FakeRecurrenceEnd(undefined, count)
  }
  static initEnd(date: Date) {
    return new FakeRecurrenceEnd(date, 0)
  }
}
class FakeRecurrenceRule {
  constructor(
    public frequency: string,
    public interval: number,
    public recurrenceEnd?: FakeRecurrenceEnd
  ) {}
  static initRecurrenceWithIntervalEnd(
    frequency: string,
    interval: number,
    end?: FakeRecurrenceEnd
  ) {
    return new FakeRecurrenceRule(frequency, interval, end)
  }
}

class FakeEvent {
  static counter = 0
  calendar: unknown = null
  title: string | null = null
  startDate: Date | null = null
  endDate: Date | null = null
  isAllDay = false
  location: string | null = null
  eventIdentifier: string | null = null
  recurrenceRules: FakeRecurrenceRule[] | null = null
  constructor(public store: unknown) {}
  static init(store: unknown) {
    return new FakeEvent(store)
  }
  addRecurrenceRule(rule: FakeRecurrenceRule) {
    if (!this.recurrenceRules) this.recurrenceRules = []
    this.recurrenceRules.push(rule)
  }
}

class FakeReminder {
  static counter = 0
  calendar: unknown = null
  title: string | null = null
  isCompleted = false
  dueDateComponents: { ms: number } | null = null
  recurrenceRules: FakeRecurrenceRule[] | null = null
  calendarItemIdentifier: string
  constructor(public store: unknown) {
    FakeReminder.counter += 1
    this.calendarItemIdentifier = `rem-${FakeReminder.counter}`
  }
  static init(store: unknown) {
    return new FakeReminder(store)
  }
  addRecurrenceRule(rule: FakeRecurrenceRule) {
    if (!this.recurrenceRules) this.recurrenceRules = []
    this.recurrenceRules.push(rule)
  }
}

class FakeEventStore {
  static authEvent = 'fullAccess'
  static authReminder = 'fullAccess'
  static usageEvent: string | undefined = 'calendar usage'
  static usageReminder: string | undefined = 'reminders usage'
  static events: FakeEvent[] = []
  static reminders: FakeReminder[] = []
  static calendars: {
    events: unknown
    reminders: unknown
  } = { events: { id: 'cal-events' }, reminders: { id: 'cal-rem' } }
  static failNext: { method: string; error: Error } | null = null
  static delayMs = 5
  static fetchDelayMs = 5
  static requestDelayMs = 5
  static requestNextAuth: string | null = null
  static requestNextError: { $handle: { message: string } } | null = null
  static directSyncExpensive: string[] = []
  static asyncCalls: string[] = []
  static syncInitiations: string[] = []

  static authorizationStatus(entity: string) {
    return entity === 'event' ? this.authEvent : this.authReminder
  }
  static init() {
    return new FakeEventStore()
  }
  private maybeFail(method: string) {
    if (FakeEventStore.failNext?.method === method) {
      const error = FakeEventStore.failNext.error
      FakeEventStore.failNext = null
      throw error
    }
  }
  predicateForEvents(start: Date, end: Date) {
    return { startMs: start.getTime(), endMs: end.getTime() }
  }
  events(_predicate: unknown) {
    if (!isAsync()) FakeEventStore.directSyncExpensive.push('events')
    this.maybeFail('events')
    return [...FakeEventStore.events]
  }
  get defaultCalendarForNewEvents() {
    return FakeEventStore.calendars.events
  }
  defaultCalendarForNewReminders() {
    return FakeEventStore.calendars.reminders
  }
  predicateForReminders() {
    return { kind: 'all' }
  }
  predicateForIncompleteReminders() {
    return { kind: 'incomplete' }
  }
  fetchReminders(
    predicate: { kind: string },
    completion: (reminders: FakeReminder[] | null) => void
  ) {
    FakeEventStore.syncInitiations.push('fetchReminders')
    const all = [...FakeEventStore.reminders]
    const filtered =
      predicate?.kind === 'incomplete'
        ? all.filter((item) => !item.isCompleted)
        : all
    setTimeout(() => completion(filtered), FakeEventStore.fetchDelayMs)
    return 1
  }
  saveSpanCommit(event: FakeEvent, _span: string, _commit: boolean) {
    if (!isAsync()) FakeEventStore.directSyncExpensive.push('saveSpanCommit')
    this.maybeFail('saveSpanCommit')
    if (!event.eventIdentifier) {
      FakeEvent.counter += 1
      event.eventIdentifier = `event-${FakeEvent.counter}`
      FakeEventStore.events.push(event)
    } else {
      const at = FakeEventStore.events.findIndex(
        (item) => item.eventIdentifier === event.eventIdentifier
      )
      if (at >= 0) FakeEventStore.events[at] = event
      else FakeEventStore.events.push(event)
    }
  }
  removeSpanCommit(event: FakeEvent, _span: string, _commit: boolean) {
    if (!isAsync()) FakeEventStore.directSyncExpensive.push('removeSpanCommit')
    this.maybeFail('removeSpanCommit')
    FakeEventStore.events = FakeEventStore.events.filter(
      (item) => item !== event && item.eventIdentifier !== event.eventIdentifier
    )
  }
  calendarItem(identifier: string) {
    if (!isAsync()) FakeEventStore.directSyncExpensive.push('calendarItem')
    this.maybeFail('calendarItem')
    return (
      FakeEventStore.reminders.find(
        (item) => item.calendarItemIdentifier === identifier
      ) ?? null
    )
  }
  saveCommit(reminder: FakeReminder, _commit: boolean) {
    if (!isAsync()) FakeEventStore.directSyncExpensive.push('saveCommit')
    this.maybeFail('saveCommit')
    const at = FakeEventStore.reminders.findIndex(
      (item) => item.calendarItemIdentifier === reminder.calendarItemIdentifier
    )
    if (at >= 0) FakeEventStore.reminders[at] = reminder
    else FakeEventStore.reminders.push(reminder)
  }
  removeCommit(reminder: FakeReminder, _commit: boolean) {
    if (!isAsync()) FakeEventStore.directSyncExpensive.push('removeCommit')
    this.maybeFail('removeCommit')
    FakeEventStore.reminders = FakeEventStore.reminders.filter(
      (item) =>
        item !== reminder &&
        item.calendarItemIdentifier !== reminder.calendarItemIdentifier
    )
  }
  requestFullAccessToEvents(completion: (granted: boolean, error: unknown) => void) {
    FakeEventStore.syncInitiations.push('requestFullAccessToEvents')
    setTimeout(() => {
      if (FakeEventStore.requestNextError) {
        const error = FakeEventStore.requestNextError
        FakeEventStore.requestNextError = null
        completion(false, error)
      } else {
        FakeEventStore.authEvent = FakeEventStore.requestNextAuth ?? 'fullAccess'
        FakeEventStore.requestNextAuth = null
        completion(true, null)
      }
    }, FakeEventStore.requestDelayMs)
  }
  requestFullAccessToReminders(
    completion: (granted: boolean, error: unknown) => void
  ) {
    FakeEventStore.syncInitiations.push('requestFullAccessToReminders')
    setTimeout(() => {
      if (FakeEventStore.requestNextError) {
        const error = FakeEventStore.requestNextError
        FakeEventStore.requestNextError = null
        completion(false, error)
      } else {
        FakeEventStore.authReminder =
          FakeEventStore.requestNextAuth ?? 'fullAccess'
        FakeEventStore.requestNextAuth = null
        completion(true, null)
      }
    }, FakeEventStore.requestDelayMs)
  }
}

async function fakeCallSDKMethodAsync(
  object: Record<string, (...args: never[]) => unknown>,
  method: string,
  ...args: never[]
) {
  FakeEventStore.asyncCalls.push(method)
  overlap.start()
  asyncDepth += 1
  try {
    await new Promise((resolve) =>
      setTimeout(resolve, FakeEventStore.delayMs)
    )
    const fn = object[method]
    if (typeof fn !== 'function')
      throw new TypeError(`unregistered asynchronous SDK method ${method}`)
    return await fn.apply(object, args)
  } finally {
    asyncDepth -= 1
    overlap.end()
  }
}

function reset() {
  FakeEventStore.events = []
  FakeEventStore.reminders = []
  FakeEventStore.authEvent = 'fullAccess'
  FakeEventStore.authReminder = 'fullAccess'
  FakeEventStore.usageEvent = 'calendar usage'
  FakeEventStore.usageReminder = 'reminders usage'
  FakeEventStore.calendars = {
    events: { id: 'cal-events' },
    reminders: { id: 'cal-rem' },
  }
  FakeEventStore.failNext = null
  FakeEventStore.directSyncExpensive = []
  FakeEventStore.asyncCalls = []
  FakeEventStore.syncInitiations = []
  FakeEventStore.requestNextAuth = null
  FakeEventStore.requestNextError = null
  FakeEventStore.delayMs = 5
  FakeEventStore.fetchDelayMs = 5
  FakeEventStore.requestDelayMs = 5
  FakeEvent.counter = 0
  FakeReminder.counter = 0
  asyncDepth = 0
  overlap.reset()
}

const host = {
  FakeNSString,
  FakeCharacterSet,
  FakeBundle,
  FakeCalendar,
  FakeNSError,
  FakeRecurrenceEnd,
  FakeRecurrenceRule,
  FakeEvent,
  FakeReminder,
  FakeEventStore,
  fakeCallSDKMethodAsync,
  overlap,
  reset,
}
// harness-doubles-end
