import EventKit
import NitroModules

final class HybridOneCalendar: HybridOneCalendarSpec {
  private static let store = EKEventStore()
  private static let queue = DispatchQueue(label: "one.calendar", qos: .userInitiated)

  func getPermissionStatus() throws -> CalendarPermissionStatus {
    Self.status(EKEventStore.authorizationStatus(for: .event))
  }

  func requestPermission() throws -> Promise<CalendarPermissionStatus> {
    let promise = Promise<CalendarPermissionStatus>()
    Self.queue.async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_MANIFEST", "Calendar.requestPermission: set native.app.calendar.usage"))
        return
      }
      Self.store.requestFullAccessToEvents { _, error in
        let status = Self.status(EKEventStore.authorizationStatus(for: .event))
        if status != .notdetermined {
          promise.resolve(withResult: status)
        } else if let error {
          promise.reject(withError: Self.error(
            "E_CALENDAR_PERMISSION", "Calendar.requestPermission: \(error.localizedDescription)"))
        } else {
          promise.resolve(withResult: status)
        }
      }
    }
    return promise
  }

  func list(startMs: Double, endMs: Double, limit: Double) throws -> Promise<[CalendarEvent]> {
    let promise = Promise<[CalendarEvent]>()
    Self.queue.async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_MANIFEST", "Calendar.list: set native.app.calendar.usage"))
        return
      }
      guard Self.canRead else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_PERMISSION", "Calendar.list: full calendar access is required"))
        return
      }
      guard startMs.isFinite, endMs.isFinite, endMs > startMs,
        endMs - startMs <= 366 * 24 * 60 * 60 * 1000,
        limit.isFinite, limit >= 1, limit <= 500, limit.rounded() == limit else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_INPUT", "Calendar.list: use a range up to 366 days and a limit from 1 to 500"))
        return
      }
      let predicate = Self.store.predicateForEvents(
        withStart: Date(timeIntervalSince1970: startMs / 1000),
        end: Date(timeIntervalSince1970: endMs / 1000),
        calendars: nil)
      let events = Self.store.events(matching: predicate)
        .sorted { $0.startDate < $1.startDate }
        .prefix(Int(limit))
        .compactMap(Self.info)
      promise.resolve(withResult: events)
    }
    return promise
  }

  func create(input: CalendarEventInput) throws -> Promise<String> {
    let promise = Promise<String>()
    Self.queue.async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_MANIFEST", "Calendar.create: set native.app.calendar.usage"))
        return
      }
      guard Self.canRead else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_PERMISSION", "Calendar.create: full calendar access is required"))
        return
      }
      let title = input.title.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !title.isEmpty, input.startMs.isFinite, input.endMs.isFinite,
        input.endMs > input.startMs else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_INPUT", "Calendar.create: title and increasing finite times are required"))
        return
      }
      var recurrenceRule: EKRecurrenceRule?
      if let recurrence = input.recurrence {
        guard let rule = Self.recurrenceRule(recurrence, startMs: input.startMs) else {
          promise.reject(withError: Self.error(
            "E_CALENDAR_INPUT", "Calendar.create: recurrence needs a whole-number interval and one valid end"))
          return
        }
        recurrenceRule = rule
      }
      guard let calendar = Self.store.defaultCalendarForNewEvents else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_UNAVAILABLE", "Calendar.create: no writable calendar is available"))
        return
      }
      let event = EKEvent(eventStore: Self.store)
      event.calendar = calendar
      event.title = title
      event.startDate = Date(timeIntervalSince1970: input.startMs / 1000)
      event.endDate = Date(timeIntervalSince1970: input.endMs / 1000)
      event.isAllDay = input.allDay
      if let recurrenceRule { event.addRecurrenceRule(recurrenceRule) }
      do {
        try Self.store.save(event, span: .thisEvent, commit: true)
        guard let identifier = event.eventIdentifier else {
          promise.reject(withError: Self.error(
            "E_CALENDAR_SAVE", "Calendar.create: saved event has no identifier"))
          return
        }
        promise.resolve(withResult: identifier)
      } catch {
        promise.reject(withError: Self.error(
          "E_CALENDAR_SAVE", "Calendar.create: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func update(
    identifier: String, originalStartMs: Double, changes: CalendarEventChanges
  ) throws -> Promise<CalendarEvent> {
    let promise = Promise<CalendarEvent>()
    Self.queue.async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_MANIFEST", "Calendar.update: set native.app.calendar.usage"))
        return
      }
      guard Self.canRead else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_PERMISSION", "Calendar.update: full calendar access is required"))
        return
      }
      guard !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
        originalStartMs.isFinite, abs(originalStartMs) <= 8_640_000_000_000_000,
        changes.title != nil || changes.startMs != nil || changes.endMs != nil ||
          changes.allDay != nil || changes.location != nil else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_INPUT", "Calendar.update: an event and at least one change are required"))
        return
      }
      guard let event = Self.eventOccurrence(identifier: identifier, startMs: originalStartMs) else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_NOT_FOUND", "Calendar.update: event occurrence was not found"))
        return
      }
      let startMs = changes.startMs ?? event.startDate.timeIntervalSince1970 * 1_000
      let endMs = changes.endMs ?? event.endDate.timeIntervalSince1970 * 1_000
      guard startMs.isFinite, endMs.isFinite,
        abs(startMs) <= 8_640_000_000_000_000, abs(endMs) <= 8_640_000_000_000_000,
        endMs > startMs else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_INPUT", "Calendar.update: increasing finite times are required"))
        return
      }
      if let title = changes.title {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
          promise.reject(withError: Self.error(
            "E_CALENDAR_INPUT", "Calendar.update: title cannot be empty"))
          return
        }
        event.title = trimmed
      }
      event.startDate = Date(timeIntervalSince1970: startMs / 1_000)
      event.endDate = Date(timeIntervalSince1970: endMs / 1_000)
      event.isAllDay = changes.allDay ?? event.isAllDay
      if let location = changes.location { event.location = location }
      do {
        try Self.store.save(event, span: .thisEvent, commit: true)
        guard let result = Self.info(event) else {
          promise.reject(withError: Self.error(
            "E_CALENDAR_SAVE", "Calendar.update: saved event has no identifier"))
          return
        }
        promise.resolve(withResult: result)
      } catch {
        promise.reject(withError: Self.error(
          "E_CALENDAR_SAVE", "Calendar.update: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func remove(identifier: String, startMs: Double) throws -> Promise<Void> {
    let promise = Promise<Void>()
    Self.queue.async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_MANIFEST", "Calendar.delete: set native.app.calendar.usage"))
        return
      }
      guard Self.canRead else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_PERMISSION", "Calendar.delete: full calendar access is required"))
        return
      }
      guard !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
        startMs.isFinite, abs(startMs) <= 8_640_000_000_000_000 else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_INPUT", "Calendar.delete: identifier and finite start time are required"))
        return
      }
      guard let event = Self.eventOccurrence(identifier: identifier, startMs: startMs) else {
        promise.reject(withError: Self.error(
          "E_CALENDAR_NOT_FOUND", "Calendar.delete: event occurrence was not found"))
        return
      }
      do {
        try Self.store.remove(event, span: .thisEvent, commit: true)
        promise.resolve()
      } catch {
        promise.reject(withError: Self.error(
          "E_CALENDAR_DELETE", "Calendar.delete: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func getRemindersPermissionStatus() throws -> CalendarPermissionStatus {
    Self.status(EKEventStore.authorizationStatus(for: .reminder))
  }

  func requestRemindersPermission() throws -> Promise<CalendarPermissionStatus> {
    let promise = Promise<CalendarPermissionStatus>()
    Self.queue.async {
      if let error = Self.remindersAccessError("requestRemindersPermission", needsAccess: false) {
        promise.reject(withError: error)
        return
      }
      Self.store.requestFullAccessToReminders { _, error in
        let status = Self.status(EKEventStore.authorizationStatus(for: .reminder))
        if status != .notdetermined {
          promise.resolve(withResult: status)
        } else if let error {
          promise.reject(withError: Self.error(
            "E_REMINDERS_PERMISSION", "Calendar.requestRemindersPermission: \(error.localizedDescription)"))
        } else {
          promise.resolve(withResult: status)
        }
      }
    }
    return promise
  }

  func listReminders(limit: Double, includeCompleted: Bool) throws -> Promise<[ReminderInfo]> {
    let promise = Promise<[ReminderInfo]>()
    Self.queue.async {
      if let error = Self.remindersAccessError("listReminders") {
        promise.reject(withError: error)
        return
      }
      guard limit.isFinite, limit >= 1, limit <= 500, limit.rounded() == limit else {
        promise.reject(withError: Self.error(
          "E_REMINDERS_INPUT", "Calendar.listReminders: use a whole-number limit from 1 to 500"))
        return
      }
      let predicate = includeCompleted
        ? Self.store.predicateForReminders(in: nil)
        : Self.store.predicateForIncompleteReminders(
          withDueDateStarting: nil, ending: nil, calendars: nil)
      Self.store.fetchReminders(matching: predicate) { reminders in
        Self.queue.async {
          let dated = (reminders ?? []).map { reminder in
            (reminder, reminder.dueDateComponents.flatMap { Calendar.current.date(from: $0) })
          }
          let sorted = dated.sorted {
            if $0.1 != $1.1 { return ($0.1 ?? .distantFuture) < ($1.1 ?? .distantFuture) }
            return ($0.0.title ?? "") < ($1.0.title ?? "")
          }
          promise.resolve(withResult: Array(sorted.prefix(Int(limit))).map {
            Self.reminderInfo($0.0, dueDate: $0.1)
          })
        }
      }
    }
    return promise
  }

  func createReminder(input: ReminderInput) throws -> Promise<String> {
    let promise = Promise<String>()
    Self.queue.async {
      if let error = Self.remindersAccessError("createReminder") {
        promise.reject(withError: error)
        return
      }
      let title = input.title.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !title.isEmpty,
        input.dueMs.map({ $0.isFinite && abs($0) <= 8_640_000_000_000_000 }) ?? true else {
        promise.reject(withError: Self.error(
          "E_REMINDERS_INPUT", "Calendar.createReminder: use a non-empty title and finite due time when supplied"))
        return
      }
      var recurrenceRule: EKRecurrenceRule?
      if let recurrence = input.recurrence {
        guard let dueMs = input.dueMs,
          let rule = Self.recurrenceRule(recurrence, startMs: dueMs) else {
          promise.reject(withError: Self.error(
            "E_REMINDERS_INPUT", "Calendar.createReminder: recurrence needs a due time and a valid rule"))
          return
        }
        recurrenceRule = rule
      }
      guard let calendar = Self.store.defaultCalendarForNewReminders() else {
        promise.reject(withError: Self.error(
          "E_REMINDERS_UNAVAILABLE", "Calendar.createReminder: no writable reminders list is available"))
        return
      }
      let reminder = EKReminder(eventStore: Self.store)
      reminder.calendar = calendar
      reminder.title = title
      if let dueMs = input.dueMs {
        reminder.dueDateComponents = Calendar.current.dateComponents(
          [.year, .month, .day, .hour, .minute, .second, .timeZone],
          from: Date(timeIntervalSince1970: dueMs / 1_000))
      }
      if let recurrenceRule { reminder.addRecurrenceRule(recurrenceRule) }
      do {
        try Self.store.save(reminder, commit: true)
        promise.resolve(withResult: reminder.calendarItemIdentifier)
      } catch {
        promise.reject(withError: Self.error(
          "E_REMINDERS_SAVE", "Calendar.createReminder: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func setReminderCompleted(identifier: String, completed: Bool) throws -> Promise<Void> {
    let promise = Promise<Void>()
    Self.queue.async {
      if let error = Self.remindersAccessError("setReminderCompleted") {
        promise.reject(withError: error)
        return
      }
      guard !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        promise.reject(withError: Self.error(
          "E_REMINDERS_INPUT", "Calendar.setReminderCompleted: identifier is required"))
        return
      }
      guard let reminder = Self.store.calendarItem(withIdentifier: identifier) as? EKReminder else {
        promise.reject(withError: Self.error(
          "E_REMINDERS_NOT_FOUND", "Calendar.setReminderCompleted: reminder was not found"))
        return
      }
      reminder.isCompleted = completed
      do {
        try Self.store.save(reminder, commit: true)
        promise.resolve()
      } catch {
        promise.reject(withError: Self.error(
          "E_REMINDERS_SAVE", "Calendar.setReminderCompleted: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func removeReminder(identifier: String) throws -> Promise<Void> {
    let promise = Promise<Void>()
    Self.queue.async {
      if let error = Self.remindersAccessError("deleteReminder") {
        promise.reject(withError: error)
        return
      }
      guard !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        promise.reject(withError: Self.error(
          "E_REMINDERS_INPUT", "Calendar.deleteReminder: identifier is required"))
        return
      }
      guard let reminder = Self.store.calendarItem(withIdentifier: identifier) as? EKReminder else {
        promise.reject(withError: Self.error(
          "E_REMINDERS_NOT_FOUND", "Calendar.deleteReminder: reminder was not found"))
        return
      }
      do {
        try Self.store.remove(reminder, commit: true)
        promise.resolve()
      } catch {
        promise.reject(withError: Self.error(
          "E_REMINDERS_DELETE", "Calendar.deleteReminder: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  private static func remindersAccessError(
    _ operation: String, needsAccess: Bool = true
  ) -> RuntimeError? {
    guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSRemindersFullAccessUsageDescription")
      as? String, !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return error("E_REMINDERS_MANIFEST", "Calendar.\(operation): set native.app.calendar.remindersUsage")
    }
    if needsAccess && EKEventStore.authorizationStatus(for: .reminder) != .fullAccess {
      return error("E_REMINDERS_PERMISSION", "Calendar.\(operation): full reminders access is required")
    }
    return nil
  }

  private static func reminderInfo(_ reminder: EKReminder, dueDate: Date?) -> ReminderInfo {
    ReminderInfo(
      identifier: reminder.calendarItemIdentifier,
      title: reminder.title ?? "",
      completed: reminder.isCompleted,
      dueMs: dueDate.map { $0.timeIntervalSince1970 * 1_000 },
      recurrence: recurrenceInfo(reminder)
    )
  }

  private static var canRead: Bool {
    let value = EKEventStore.authorizationStatus(for: .event)
    return value == .fullAccess || value == .authorized
  }

  private static func eventOccurrence(identifier: String, startMs: Double) -> EKEvent? {
    let predicate = store.predicateForEvents(
      withStart: Date(timeIntervalSince1970: (startMs - 1_000) / 1_000),
      end: Date(timeIntervalSince1970: (startMs + 1_000) / 1_000),
      calendars: nil)
    return store.events(matching: predicate).first {
      $0.eventIdentifier == identifier &&
        abs($0.startDate.timeIntervalSince1970 * 1_000 - startMs) < 1_000
    }
  }

  private static var hasUsageDescription: Bool {
    guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSCalendarsFullAccessUsageDescription")
      as? String else { return false }
    return !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  private static func status(_ value: EKAuthorizationStatus) -> CalendarPermissionStatus {
    switch value {
    case .notDetermined: return .notdetermined
    case .restricted: return .restricted
    case .denied: return .denied
    case .writeOnly: return .writeonly
    case .fullAccess, .authorized: return .fullaccess
    @unknown default: return .restricted
    }
  }

  private static func info(_ event: EKEvent) -> CalendarEvent? {
    guard let identifier = event.eventIdentifier else { return nil }
    return CalendarEvent(
      identifier: identifier,
      title: event.title ?? "",
      startMs: event.startDate.timeIntervalSince1970 * 1000,
      endMs: event.endDate.timeIntervalSince1970 * 1000,
      allDay: event.isAllDay,
      location: event.location ?? "",
      recurrence: recurrenceInfo(event))
  }

  private static func recurrenceInfo(_ item: EKCalendarItem) -> CalendarRecurrence? {
    item.recurrenceRules?.first.flatMap { rule -> CalendarRecurrence? in
      guard let frequency = frequency(rule.frequency) else { return nil }
      return CalendarRecurrence(
        frequency: frequency,
        interval: Double(rule.interval),
        endDateMs: rule.recurrenceEnd?.endDate.map { $0.timeIntervalSince1970 * 1_000 },
        occurrenceCount: rule.recurrenceEnd.flatMap { $0.occurrenceCount > 0
          ? Double($0.occurrenceCount) : nil })
    }
  }

  private static func recurrenceRule(_ value: CalendarRecurrence, startMs: Double) -> EKRecurrenceRule? {
    let interval = value.interval ?? 1
    guard interval.isFinite, interval >= 1, interval <= 1_000,
      interval.rounded() == interval,
      value.endDateMs == nil || value.occurrenceCount == nil,
      value.endDateMs.map({ $0.isFinite && $0 >= startMs &&
        $0 <= 8_640_000_000_000_000 }) ?? true,
      value.occurrenceCount.map({ $0.isFinite && $0 >= 1 && $0 <= 10_000 &&
        $0.rounded() == $0 }) ?? true else { return nil }
    let end: EKRecurrenceEnd?
    if let count = value.occurrenceCount {
      end = EKRecurrenceEnd(occurrenceCount: Int(count))
    } else if let endDateMs = value.endDateMs {
      end = EKRecurrenceEnd(end: Date(timeIntervalSince1970: endDateMs / 1_000))
    } else {
      end = nil
    }
    return EKRecurrenceRule(
      recurrenceWith: frequency(value.frequency), interval: Int(interval), end: end)
  }

  private static func frequency(_ value: CalendarRecurrenceFrequency) -> EKRecurrenceFrequency {
    switch value {
    case .daily: return .daily
    case .weekly: return .weekly
    case .monthly: return .monthly
    case .yearly: return .yearly
    }
  }

  private static func frequency(_ value: EKRecurrenceFrequency) -> CalendarRecurrenceFrequency? {
    switch value {
    case .daily: return .daily
    case .weekly: return .weekly
    case .monthly: return .monthly
    case .yearly: return .yearly
    @unknown default: return nil
    }
  }

  private static func error(_ code: String, _ message: String) -> RuntimeError {
    oneNativeError(code, message)
  }
}
