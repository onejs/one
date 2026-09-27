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
      let predicate = Self.store.predicateForEvents(
        withStart: Date(timeIntervalSince1970: (startMs - 1_000) / 1_000),
        end: Date(timeIntervalSince1970: (startMs + 1_000) / 1_000),
        calendars: nil)
      guard let event = Self.store.events(matching: predicate).first(where: {
        $0.eventIdentifier == identifier &&
          abs($0.startDate.timeIntervalSince1970 * 1_000 - startMs) < 1_000
      }) else {
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

  private static var canRead: Bool {
    let value = EKEventStore.authorizationStatus(for: .event)
    return value == .fullAccess || value == .authorized
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
      location: event.location ?? "")
  }

  private static func error(_ code: String, _ message: String) -> RuntimeError {
    oneNativeError(code, message)
  }
}
