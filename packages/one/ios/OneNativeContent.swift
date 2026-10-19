import UIKit

// react content inside UIKit that javascript built through the generated SDK bindings.
// Swift.UIKitContent mounts its subtree into a OneNativeContentView, which goes to an
// item of a cell source below, or to javascript as a UIView for any API that takes one,
// such as UIStackView.addArrangedSubview. React owns the subtree; UIKit only shows it.

// a native view for one Swift.UIKitContent mount. the subtree lays out at the width UIKit
// gives this view, and the view's height is the subtree's measured height.
@objcMembers
public final class OneNativeContentView: UIView {
  // reports the width yoga lays the subtree out in
  public var onWidth: ((CGFloat) -> Void)? {
    didSet {
      reportedWidth = -1
      setNeedsLayout()
    }
  }
  // tells a hosting cell its height changed, since a cell sizes from this view
  var onHeight: (() -> Void)?
  // tells the component view the content moved, so touches outside the surface reach it
  public var onWindow: (() -> Void)?
  // the height before the first measurement, and a fixed height that skips it; zero unsets
  public var estimatedHeight: CGFloat = 44 { didSet { if oldValue != estimatedHeight { resized() } } }
  public var fixedHeight: CGFloat = 0 { didSet { if oldValue != fixedHeight { resized() } } }
  private var measuredHeight: CGFloat = 0
  private var reportedWidth: CGFloat = -1
  // an unmounted content stays wherever the app placed it, empty and with no height
  private var retired = false

  var height: CGFloat {
    retired ? 0 : fixedHeight > 0 ? fixedHeight : measuredHeight > 0 ? measuredHeight : estimatedHeight
  }

  // zero is unset, so crossing it always applies; positive changes under half a point do not
  public func setMeasuredHeight(_ next: CGFloat) {
    guard next.isFinite, next >= 0,
      (measuredHeight == 0) != (next == 0) || abs(measuredHeight - next) >= 0.5 else { return }
    measuredHeight = next
    resized()
  }

  private func resized() {
    invalidateIntrinsicContentSize()
    onHeight?()
  }

  public func retire() {
    guard !retired else { return }
    retired = true
    resized()
    superview?.setNeedsLayout()
  }

  public override var intrinsicContentSize: CGSize { CGSize(width: UIView.noIntrinsicMetric, height: height) }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    onWindow?()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    guard bounds.width > 0, bounds.width != reportedWidth else { return }
    reportedWidth = bounds.width
    onWidth?(bounds.width)
  }
}

// content views by the id javascript reserved for a mount. the mounted component view
// creates the view and holds it here until it unmounts; javascript asks for it
// asynchronously and may ask before the mount, so a request waits for it.
@objcMembers
public final class OneNativeContentRegistry: NSObject {
  private static let lock = NSLock()
  nonisolated(unsafe) private static var next = 0
  @MainActor private static var views: [Int: OneNativeContentView] = [:]
  @MainActor private static var released = Set<Int>()
  @MainActor private static var waiting: [Int: [CheckedContinuation<OneNativeContentView, Error>]] = [:]

  static func reserve() -> Int {
    lock.lock()
    defer { lock.unlock() }
    next += 1
    return next
  }

  @MainActor public static func view(forId id: Int) -> OneNativeContentView {
    if let view = views[id] { return view }
    let view = OneNativeContentView()
    views[id] = view
    for waiter in waiting.removeValue(forKey: id) ?? [] { waiter.resume(returning: view) }
    return view
  }

  @MainActor public static func unmount(_ id: Int) {
    views[id] = nil
    released.insert(id)
    for waiter in waiting.removeValue(forKey: id) ?? [] {
      waiter.resume(throwing: OneSDKError.unsupported("Swift.UIKitContent \(id) unmounted before its view was read"))
    }
  }

  @MainActor static func mounted(_ id: Int) async throws -> OneNativeContentView {
    if let view = views[id] { return view }
    if released.contains(id) { throw OneSDKError.unsupported("Swift.UIKitContent \(id) unmounted before its view was read") }
    return try await withCheckedThrowingContinuation { waiting[id, default: []].append($0) }
  }
}

// the content each item of one diffable data source shows. the source's cell provider is
// native, so UIKit's synchronous cell requests never wait on javascript.
@MainActor
final class OneNativeCellSource: NSObject {
  nonisolated(unsafe) private static var key: UInt8 = 0
  private let contents = NSMapTable<NSNumber, OneNativeContentView>.strongToWeakObjects()
  private weak var view: UIScrollView?

  init(_ view: UIScrollView) {
    self.view = view
    super.init()
  }

  nonisolated static func of(_ source: NSObject) -> OneNativeCellSource? {
    objc_getAssociatedObject(source, &key) as? OneNativeCellSource
  }

  func content(_ item: Int) -> OneNativeContentView? { contents.object(forKey: NSNumber(value: item)) }

  // the first mounted content keeps its item; javascript rejects a second before it mounts
  func register(_ content: OneNativeContentView, item: Int) {
    if let current = self.content(item), current !== content { return }
    contents.setObject(content, forKey: NSNumber(value: item))
    show(content, item: item)
  }

  func unregister(_ content: OneNativeContentView, item: Int) {
    guard self.content(item) === content else { return }
    contents.removeObject(forKey: NSNumber(value: item))
    show(nil, item: item)
  }

  private func show(_ content: OneNativeContentView?, item: Int) {
    var shown = false
    for cell in visibleCells where cell.item == item {
      cell.show(content)
      shown = true
    }
    if shown { announce() }
  }

  // accessibility clients keep a visible cell's elements until told its layout changed, so
  // content that comes or goes there is announced once per turn. reuse while scrolling is not
  private var announcing = false

  private func announce() {
    guard !announcing else { return }
    announcing = true
    DispatchQueue.main.async { [weak self] in
      self?.announcing = false
      UIAccessibility.post(notification: .layoutChanged, argument: nil)
    }
  }

  // a cell's own self-sizing invalidation stops applying after its first changes, so a
  // height change asks the list to measure its visible cells again, once per turn
  private var remeasuring = false

  func remeasure() {
    guard !remeasuring else { return }
    remeasuring = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      remeasuring = false
      let view = view
      UIView.performWithoutAnimation {
        if let table = view as? UITableView {
          table.performBatchUpdates(nil)
        } else if let collection = view as? UICollectionView {
          // the layout's own self-sizing contract, so any layout takes its own context
          let layout = collection.collectionViewLayout
          for indexPath in collection.indexPathsForVisibleItems {
            guard let cell = collection.cellForItem(at: indexPath),
              let original = layout.layoutAttributesForItem(at: indexPath),
              let fitting = original.copy() as? UICollectionViewLayoutAttributes else { continue }
            let preferred = cell.preferredLayoutAttributesFitting(fitting)
            guard layout.shouldInvalidateLayout(forPreferredLayoutAttributes: preferred, withOriginalAttributes: original) else { continue }
            layout.invalidateLayout(with: layout.invalidationContext(forPreferredLayoutAttributes: preferred, withOriginalAttributes: original))
          }
        }
      }
    }
  }

  private var visibleCells: [OneNativeContentCell] {
    let cells: [UIView] = (view as? UICollectionView)?.visibleCells ?? (view as? UITableView)?.visibleCells ?? []
    return cells.compactMap { $0 as? OneNativeContentCell }
  }

  // UIKit holds a data source weakly, so the view it serves keeps it, and it keeps this
  static func collection(_ view: UICollectionView) -> UICollectionViewDiffableDataSource<Int, Int> {
    let source = OneNativeCellSource(view)
    let registration = UICollectionView.CellRegistration<OneNativeContentCollectionCell, Int> { [weak source] cell, _, item in
      cell.configure(source, item: item)
    }
    let data = UICollectionViewDiffableDataSource<Int, Int>(collectionView: view) { view, indexPath, item in
      view.dequeueConfiguredReusableCell(using: registration, for: indexPath, item: item)
    }
    source.retain(data, by: view)
    return data
  }

  static func table(_ view: UITableView) -> UITableViewDiffableDataSource<Int, Int> {
    let source = OneNativeCellSource(view)
    let identifier = "OneNativeContentTableCell"
    view.register(OneNativeContentTableCell.self, forCellReuseIdentifier: identifier)
    let data = UITableViewDiffableDataSource<Int, Int>(tableView: view) { [weak source] view, indexPath, item in
      let cell = view.dequeueReusableCell(withIdentifier: identifier, for: indexPath)
      (cell as? OneNativeContentTableCell)?.configure(source, item: item)
      return cell
    }
    source.retain(data, by: view)
    return data
  }

  // a later source for the same view replaces this one, as assigning dataSource does
  private func retain(_ data: NSObject, by view: UIView) {
    objc_setAssociatedObject(data, &Self.key, self, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    objc_setAssociatedObject(view, &Self.key, data, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
  }
}

// a cell that shows the content registered for its item
@MainActor
protocol OneNativeContentCell: UIView {
  var item: Int? { get }
  func show(_ content: OneNativeContentView?)
}

// holds a cell's content. UIKit can configure a reused cell for an item while another cell
// still shows it, so content moves only from nobody or from another cell's holder, and an
// off-screen holder takes it only from another off-screen holder.
private final class OneNativeContentHolder: UIView {
  private(set) var content: OneNativeContentView?
  // the cell, told when the content it shows changes height
  var onHeight: (() -> Void)?

  func show(_ next: OneNativeContentView?) {
    if let content, content !== next, content.superview === self {
      content.onHeight = nil
      content.removeFromSuperview()
    }
    content = next
    claim()
    onHeight?()
  }

  func claim() {
    guard let content, content.superview !== self else { return }
    if let holder = content.superview {
      guard holder is OneNativeContentHolder, window != nil || holder.window == nil else { return }
    }
    addSubview(content)
    content.onHeight = onHeight
    setNeedsLayout()
  }

  // a held content's height; an empty cell, or one whose content another cell shows, keeps the estimate
  var height: CGFloat { content.flatMap { $0.superview === self ? $0.height : nil } ?? 44 }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil { claim() }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if let content, content.superview === self { content.frame = bounds }
  }
}

final class OneNativeContentCollectionCell: UICollectionViewCell, OneNativeContentCell {
  private let holder = OneNativeContentHolder()
  private weak var source: OneNativeCellSource?
  private(set) var item: Int?

  override init(frame: CGRect) {
    super.init(frame: frame)
    holder.frame = contentView.bounds
    holder.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    contentView.addSubview(holder)
    holder.onHeight = { [weak self] in if self?.item != nil { self?.source?.remeasure() } }
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  func configure(_ source: OneNativeCellSource?, item: Int) {
    self.source = source
    self.item = item
    show(source?.content(item))
  }

  func show(_ content: OneNativeContentView?) { holder.show(content) }

  override func prepareForReuse() {
    super.prepareForReuse()
    item = nil
    holder.show(nil)
  }

  override func systemLayoutSizeFitting(
    _ targetSize: CGSize, withHorizontalFittingPriority horizontal: UILayoutPriority, verticalFittingPriority vertical: UILayoutPriority
  ) -> CGSize {
    CGSize(width: targetSize.width, height: holder.height)
  }
}

final class OneNativeContentTableCell: UITableViewCell, OneNativeContentCell {
  private let holder = OneNativeContentHolder()
  private weak var source: OneNativeCellSource?
  private(set) var item: Int?

  override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
    super.init(style: style, reuseIdentifier: reuseIdentifier)
    holder.frame = contentView.bounds
    holder.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    contentView.addSubview(holder)
    holder.onHeight = { [weak self] in if self?.item != nil { self?.source?.remeasure() } }
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  func configure(_ source: OneNativeCellSource?, item: Int) {
    self.source = source
    self.item = item
    show(source?.content(item))
  }

  func show(_ content: OneNativeContentView?) { holder.show(content) }

  override func prepareForReuse() {
    super.prepareForReuse()
    item = nil
    holder.show(nil)
  }

  override func systemLayoutSizeFitting(
    _ targetSize: CGSize, withHorizontalFittingPriority horizontal: UILayoutPriority, verticalFittingPriority vertical: UILayoutPriority
  ) -> CGSize {
    CGSize(width: targetSize.width, height: holder.height)
  }
}

// the component view registers and releases content through these, by the ids javascript
// passes as props
@objcMembers
public final class OneNativeCellSources: NSObject {
  @MainActor public static func register(_ content: OneNativeContentView, sourceId: Int, item: Int) {
    guard let data = OneNativeUIKitRegistry.object(sourceId), let source = OneNativeCellSource.of(data) else {
      preconditionFailure("Swift.UIKitContent source \(sourceId) was released before it mounted")
    }
    source.register(content, item: item)
  }

  @MainActor public static func unregister(_ content: OneNativeContentView, sourceId: Int, item: Int) {
    guard let data = OneNativeUIKitRegistry.object(sourceId) else { return }
    OneNativeCellSource.of(data)?.unregister(content, item: item)
  }
}
