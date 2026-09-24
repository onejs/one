import NitroModules
import UIKit
import UserNotifications

// local notifications: permission, badge, foreground presentation, received
// and response callbacks, scheduling, push token. the android half is
// HybridOneNotifications.kt; ios has no channels, so those answer empty.
final class HybridOneNotifications: HybridOneNotificationsSpec {
  private let center = OneNotificationsCenter.shared

  override init() {
    super.init()
    // backstop for hosts that create the object without the launch
    // notification, without stomping another library's delegate.
    DispatchQueue.main.async {
      let notifications = UNUserNotificationCenter.current()
      if notifications.delegate == nil && OneNotificationsCenter.notificationsEnabled {
        notifications.delegate = OneNotificationsCenter.shared
      }
    }
  }

  // unauthorizationstatus 0 not determined, 1 denied, 2 authorized,
  // 3 provisional, 4 ephemeral. provisional and ephemeral count as granted:
  // the system delivers to those apps.
  private static func permission(_ status: UNAuthorizationStatus) -> NativePermissionResponse {
    let ios = NativeIosPermission(status: Double(status.rawValue))
    switch status {
    case .notDetermined:
      return NativePermissionResponse(status: .undetermined, granted: false, canAskAgain: true, ios: ios)
    case .denied:
      return NativePermissionResponse(status: .denied, granted: false, canAskAgain: false, ios: ios)
    default:
      return NativePermissionResponse(status: .granted, granted: true, canAskAgain: false, ios: ios)
    }
  }

  func getPermissions() throws -> Promise<NativePermissionResponse> {
    let promise = Promise<NativePermissionResponse>()
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      promise.resolve(withResult: Self.permission(settings.authorizationStatus))
    }
    return promise
  }

  func requestPermissions(options: NativePermissionRequest) throws -> Promise<NativePermissionResponse> {
    // unset fields default to yes, except provisional which defaults to no.
    let ios = options.ios
    var authOptions: UNAuthorizationOptions = []
    if ios?.allowAlert ?? true { authOptions.insert(.alert) }
    if ios?.allowBadge ?? true { authOptions.insert(.badge) }
    if ios?.allowSound ?? true { authOptions.insert(.sound) }
    if ios?.allowProvisional ?? false { authOptions.insert(.provisional) }
    let promise = Promise<NativePermissionResponse>()
    let notifications = UNUserNotificationCenter.current()
    notifications.requestAuthorization(options: authOptions) { _, error in
      if error != nil {
        promise.reject(
          withError: oneNativeError(
            "E_NOTIFICATIONS_PERMISSION", "notification authorization failed"))
        return
      }
      notifications.getNotificationSettings { settings in
        promise.resolve(withResult: Self.permission(settings.authorizationStatus))
      }
    }
    return promise
  }

  func getBadgeCount() throws -> Promise<Double> {
    let promise = Promise<Double>()
    DispatchQueue.main.async {
      // the only getter: UNUserNotificationCenter exposes just the setter,
      // and this property is deprecated since ios 17 but still reads
      // correctly.
      promise.resolve(withResult: Double(UIApplication.shared.applicationIconBadgeNumber))
    }
    return promise
  }

  func setBadgeCount(count: Double) throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    UNUserNotificationCenter.current().setBadgeCount(Int(count)) { error in
      if error != nil {
        promise.reject(
          withError: oneNativeError("E_NOTIFICATIONS_BADGE", "setting the badge count failed"))
        return
      }
      promise.resolve(withResult: true)
    }
    return promise
  }

  func setNotificationChannel(channelId: String, channel: NativeChannelInput) throws -> Promise<NativeChannel?> {
    return Promise.resolved(withResult: nil)
  }

  func getNotificationChannel(channelId: String) throws -> Promise<NativeChannel?> {
    return Promise.resolved(withResult: nil)
  }

  func getNotificationChannels() throws -> Promise<[NativeChannel]> {
    return Promise.resolved(withResult: [])
  }

  func deleteNotificationChannel(channelId: String) throws -> Promise<Void> {
    return Promise.resolved()
  }

  func scheduleNotification(request: NativeScheduleInput) throws -> Promise<String> {
    let content = request.content
    let nativeContent = UNMutableNotificationContent()
    if let title = content.title { nativeContent.title = title }
    if let subtitle = content.subtitle { nativeContent.subtitle = subtitle }
    if let body = content.body { nativeContent.body = body }
    if let data = content.data {
      nativeContent.userInfo = data.toDictionary().mapValues { $0 ?? NSNull() }
    }
    if content.sound == true { nativeContent.sound = .default }
    if let badge = content.badge { nativeContent.badge = NSNumber(value: badge) }
    let identifier = request.identifier ?? UUID().uuidString
    var nativeTrigger: UNNotificationTrigger?
    if let trigger = request.trigger {
      // channelId is android-only; ios ignores it.
      switch trigger.type {
      case "timeInterval":
        let seconds = trigger.seconds ?? 0
        let repeats = trigger.repeats ?? false
        if seconds <= 0 {
          return Promise.rejected(
            withError: oneNativeError(
              "E_NOTIFICATIONS_TRIGGER", "timeInterval seconds must be positive"))
        }
        if repeats && seconds < 60 {
          return Promise.rejected(
            withError: oneNativeError(
              "E_NOTIFICATIONS_TRIGGER", "a repeating timeInterval must be at least 60 seconds"))
        }
        nativeTrigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: repeats)
      case "date":
        let fireDate = Date(timeIntervalSince1970: (trigger.date ?? 0) / 1000)
        // a past date keeps the nil trigger and delivers immediately.
        if fireDate.timeIntervalSinceNow > 0 {
          let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute, .second], from: fireDate)
          nativeTrigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        }
      default:
        return Promise.rejected(
          withError: oneNativeError(
            "E_NOTIFICATIONS_TRIGGER", "unknown trigger type \(trigger.type)"))
      }
    }
    let nativeRequest = UNNotificationRequest(
      identifier: identifier, content: nativeContent, trigger: nativeTrigger)
    let promise = Promise<String>()
    UNUserNotificationCenter.current().add(nativeRequest) { error in
      if error != nil {
        promise.reject(
          withError: oneNativeError(
            "E_NOTIFICATIONS_SCHEDULE", "scheduling the notification failed"))
        return
      }
      promise.resolve(withResult: identifier)
    }
    return promise
  }

  func cancelScheduledNotification(identifier: String) throws -> Promise<Void> {
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
    return Promise.resolved()
  }

  func cancelAllScheduledNotifications() throws -> Promise<Void> {
    UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    return Promise.resolved()
  }

  func getAllScheduledNotifications() throws -> Promise<[NativeNotificationRequest]> {
    let promise = Promise<[NativeNotificationRequest]>()
    UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
      promise.resolve(withResult: requests.map(OneNotificationsCenter.request))
    }
    return promise
  }

  func getPresentedNotifications() throws -> Promise<[NativeNotification]> {
    let promise = Promise<[NativeNotification]>()
    UNUserNotificationCenter.current().getDeliveredNotifications { notifications in
      promise.resolve(withResult: notifications.map(OneNotificationsCenter.notification))
    }
    return promise
  }

  func dismissNotification(identifier: String) throws -> Promise<Void> {
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [identifier])
    return Promise.resolved()
  }

  func dismissAllNotifications() throws -> Promise<Void> {
    UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    return Promise.resolved()
  }

  // remote push token: a cached registration answers at once, otherwise the
  // getter waits for the os callback the app delegate forwards. an app built
  // without native.app.notifications.push rejects, as on android.
  func getDevicePushToken() throws -> Promise<NativePushToken> {
    guard (Bundle.main.object(forInfoDictionaryKey: "OneNativeNotificationsPush") as? Bool) == true
    else {
      return Promise.rejected(
        withError: oneNativeError(
          "E_NOTIFICATIONS_PUSH_TOKEN",
          "push is not enabled: set native.app.notifications.push to fetch a push token"))
    }
    let promise = Promise<NativePushToken>()
    DispatchQueue.main.async {
      if let cached = self.center.pushToken {
        promise.resolve(withResult: NativePushToken(type: "ios", data: cached))
        return
      }
      self.center.pendingPushTokens.append(promise)
      UIApplication.shared.registerForRemoteNotifications()
    }
    return promise
  }

  func setListeners(
    onReceived: @escaping (_ requestId: String, _ notification: NativeNotification) -> Void,
    onResponse: @escaping (_ response: NativeNotificationResponse) -> Void,
    onPushToken: @escaping (_ token: NativePushToken) -> Void
  ) throws {
    center.setListeners(
      OneNotificationsCenter.Listeners(
        onReceived: onReceived, onResponse: onResponse, onPushToken: onPushToken))
  }

  func presentNotification(requestId: String, behavior: NotificationBehavior) throws {
    // unknown ids stay quiet: the completion already fired or timed out.
    DispatchQueue.main.async {
      var options: UNNotificationPresentationOptions = []
      if behavior.shouldShowBanner { options.insert(.banner) }
      if behavior.shouldShowList { options.insert(.list) }
      if behavior.shouldPlaySound { options.insert(.sound) }
      if behavior.shouldSetBadge { options.insert(.badge) }
      self.center.present(requestId: requestId, options: options)
    }
  }

  func getLastNotificationResponse() throws -> NativeNotificationResponse? {
    return center.lastResponse
  }

  func clearLastNotificationResponse() throws {
    center.lastResponse = nil
  }
}

// the long-lived UNUserNotificationCenter delegate, installed at launch so a
// cold-start tap still lands, and outliving any one js runtime. pending
// willPresent completions wait for the js handler's answer through
// presentNotification, or show everything after 3s when js stalls. the
// delegate protocol needs an NSObject, which a hybrid object cannot
// subclass.
@objc(OneNotificationsCenter)
public final class OneNotificationsCenter: NSObject, UNUserNotificationCenterDelegate {
  struct Listeners {
    let onReceived: (String, NativeNotification) -> Void
    let onResponse: (NativeNotificationResponse) -> Void
    let onPushToken: (NativePushToken) -> Void
  }

  static let shared = OneNotificationsCenter()

  // matches expo's default action identifier, re-exported from types.ts.
  // categories are out of scope, so every response is a tap.
  private static let defaultAction = "expo.modules.notifications.actions.DEFAULT"
  private static let presentTimeout: TimeInterval = 3

  // listeners and the last response cross threads (js sets and reads, the
  // delegate writes on main); the rest is main-queue only.
  private let lock = NSLock()
  private var listeners: Listeners?
  private var storedResponse: NativeNotificationResponse?
  private var pendingCompletions: [String: (Int) -> Void] = [:]
  var pushToken: String?
  var pendingPushTokens: [Promise<NativePushToken>] = []

  // prebuild stamps OneNativeNotificationsEnabled into Info.plist only when
  // native.app.notifications is set. without it the delegate never installs,
  // so apps linking @vxrn/native for other modules keep whatever delegate
  // their own push library sets.
  @objc public static var notificationsEnabled: Bool {
    return (Bundle.main.object(forInfoDictionaryKey: "OneNativeNotificationsEnabled") as? Bool)
      ?? false
  }

  // called by OneNotificationsLaunch.mm at didFinishLaunching, before a
  // cold-start tap response can arrive.
  @objc public static func install() {
    UNUserNotificationCenter.current().delegate = shared
  }

  private override init() {
    super.init()
    // forwarded by the prebuild app delegate (which owns the
    // UIApplicationDelegate callbacks) when the os answers a remote
    // registration. without a register call they never fire.
    let notifications = NotificationCenter.default
    notifications.addObserver(
      forName: Notification.Name("OneNativePushTokenDidRegister"), object: nil, queue: .main
    ) { [weak self] note in
      guard let token = note.userInfo?["deviceToken"] as? Data else { return }
      self?.pushTokenRegistered(token)
    }
    notifications.addObserver(
      forName: Notification.Name("OneNativePushTokenDidFail"), object: nil, queue: .main
    ) { [weak self] note in
      self?.pushTokenFailed(note.userInfo?["error"] as? String)
    }
  }

  var lastResponse: NativeNotificationResponse? {
    get { lock.withLock { storedResponse } }
    set { lock.withLock { storedResponse = newValue } }
  }

  func setListeners(_ next: Listeners) {
    lock.withLock { listeners = next }
  }

  private func currentListeners() -> Listeners? {
    return lock.withLock { listeners }
  }

  // every registration answers the waiting getters and fans out to push
  // token listeners, matching expo: registering itself never fires, only
  // the os answering does. the token is the apns bytes as lowercase hex.
  private func pushTokenRegistered(_ deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02x", $0) }.joined()
    pushToken = token
    let waiting = pendingPushTokens
    pendingPushTokens = []
    let payload = NativePushToken(type: "ios", data: token)
    for promise in waiting {
      promise.resolve(withResult: payload)
    }
    currentListeners()?.onPushToken(payload)
  }

  private func pushTokenFailed(_ message: String?) {
    let waiting = pendingPushTokens
    pendingPushTokens = []
    for promise in waiting {
      promise.reject(
        withError: oneNativeError(
          "E_NOTIFICATIONS_PUSH_TOKEN",
          message ?? "registering for remote notifications failed"))
    }
  }

  func present(requestId: String, options: UNNotificationPresentationOptions) {
    guard let completion = pendingCompletions.removeValue(forKey: requestId) else { return }
    completion(Int(options.rawValue))
  }

  // c++ interop (which nitro needs) imports this requirement's options
  // block as (Int) -> Void; any other type leaves the method unbound and ios
  // never calls it.
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter, willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (Int) -> Void
  ) {
    // delegate callbacks may arrive off the main queue.
    DispatchQueue.main.async {
      guard let listeners = self.currentListeners() else {
        // nobody listens: show immediately instead of waiting out the
        // timeout below.
        completionHandler(Int(UNNotificationPresentationOptions([.banner, .list, .sound, .badge]).rawValue))
        return
      }
      let requestId = UUID().uuidString
      self.pendingCompletions[requestId] = completionHandler
      listeners.onReceived(requestId, Self.notification(notification))
      DispatchQueue.main.asyncAfter(deadline: .now() + Self.presentTimeout) {
        self.present(requestId: requestId, options: [.banner, .list, .sound, .badge])
      }
    }
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    DispatchQueue.main.async {
      let action =
        response.actionIdentifier == UNNotificationDefaultActionIdentifier
        ? Self.defaultAction : response.actionIdentifier
      let payload = NativeNotificationResponse(
        notification: Self.notification(response.notification), actionIdentifier: action)
      // a cold-start tap lands before js listens; getLastNotificationResponse
      // reads it then.
      self.lastResponse = payload
      self.currentListeners()?.onResponse(payload)
      completionHandler()
    }
  }

  static func trigger(_ trigger: UNNotificationTrigger?) -> NativeTrigger {
    switch trigger {
    case nil:
      // an immediate request, matching the android immediate trigger.
      return NativeTrigger(type: .timeinterval, seconds: 0, repeats: false, date: nil)
    case let timed as UNTimeIntervalNotificationTrigger:
      return NativeTrigger(
        type: .timeinterval, seconds: timed.timeInterval, repeats: timed.repeats, date: nil)
    case let dated as UNCalendarNotificationTrigger:
      let next = dated.nextTriggerDate() ?? Date()
      return NativeTrigger(
        type: .date, seconds: nil, repeats: nil, date: next.timeIntervalSince1970 * 1000)
    case is UNPushNotificationTrigger:
      return NativeTrigger(type: .push, seconds: nil, repeats: nil, date: nil)
    default:
      return NativeTrigger(type: .unknown, seconds: nil, repeats: nil, date: nil)
    }
  }

  static func content(_ content: UNNotificationContent) -> NativeContent {
    return NativeContent(
      title: content.title,
      subtitle: content.subtitle,
      body: content.body,
      data: anyMap(content.userInfo),
      sound: content.sound != nil,
      badge: content.badge?.doubleValue)
  }

  static func request(_ request: UNNotificationRequest) -> NativeNotificationRequest {
    return NativeNotificationRequest(
      identifier: request.identifier, content: content(request.content),
      trigger: trigger(request.trigger))
  }

  static func notification(_ notification: UNNotification) -> NativeNotification {
    return NativeNotification(
      request: request(notification.request),
      date: notification.date.timeIntervalSince1970 * 1000)
  }

  // userInfo holds foundation objects; a boolean NSNumber stays a boolean
  // and values with no json shape drop, as the bridge serializer did.
  private static func anyValue(_ value: Any) -> AnyValue? {
    switch value {
    case is NSNull:
      return .null
    case let string as String:
      return .string(string)
    case let number as NSNumber:
      return CFGetTypeID(number) == CFBooleanGetTypeID()
        ? .bool(number.boolValue) : .number(number.doubleValue)
    case let array as [Any]:
      return .array(array.map { anyValue($0) ?? .null })
    case let dictionary as [AnyHashable: Any]:
      return .object(anyObject(dictionary))
    default:
      return nil
    }
  }

  private static func anyObject(_ dictionary: [AnyHashable: Any]) -> [String: AnyValue] {
    var object: [String: AnyValue] = [:]
    for (key, value) in dictionary {
      if let key = key as? String, let value = anyValue(value) {
        object[key] = value
      }
    }
    return object
  }

  private static func anyMap(_ userInfo: [AnyHashable: Any]) -> AnyMap {
    let map = AnyMap()
    for (key, value) in anyObject(userInfo) {
      switch value {
      case .null: map.setNull(key: key)
      case .bool(let bool): map.setBoolean(key: key, value: bool)
      case .number(let number): map.setDouble(key: key, value: number)
      case .int64(let int): map.setInt64(key: key, value: int)
      case .string(let string): map.setString(key: key, value: string)
      case .array(let array): map.setArray(key: key, value: array)
      case .object(let object): map.setObject(key: key, value: object)
      }
    }
    return map
  }
}
