// Standalone native contract for a One share-target adapter.
// Apple-frameworks-only: no React/Expo/One Nitro runtime dependency.
// Safe under APPLICATION_EXTENSION_API_ONLY.

import Social
import UIKit

/// The native compose controller. Built on the system's own
/// `SLComposeServiceViewController` (the same base the Xcode "Share
/// Extension" template uses) rather than a bespoke `UIViewController`: it
/// supplies a correctly chrome'd navigation bar with Cancel/Post out of the
/// box, an editable text view preloaded with the share's initial text, and
/// an automatic attachment preview -- all native behavior a custom
/// `UIViewController` has to reimplement and can get wrong (a root
/// `UIViewController` has no navigation bar at all unless something wraps it
/// in a `UINavigationController`, which is what previously made Cancel/Post
/// invisible).
///
/// All sequencing (intake, persist, send, cancel, and the races between
/// them) lives in `OneShareTargetSubmissionCoordinator`, which this class
/// only renders and forwards user actions to.
///
/// A generated principal class (see `OneShareTargetViewController`) supplies
/// the adapter and configuration and is the one actually registered as the
/// Share extension's principal class.
open class OneShareComposeViewController: SLComposeServiceViewController {
  /// Must be overridden by the generated principal subclass.
  open var configuration: OneShareTargetConfiguration {
    fatalError("OneShareComposeViewController.configuration must be overridden")
  }

  /// Must be overridden by the generated principal subclass. Called once,
  /// lazily, on first use.
  open func makeAdapter() -> any OneShareTargetAdapter {
    fatalError("OneShareComposeViewController.makeAdapter() must be overridden")
  }

  private let submissionId = UUID().uuidString
  private var coordinator: OneShareTargetSubmissionCoordinator?
  private var refreshTask: Task<Void, Never>?

  // MARK: - Lifecycle

  open override func presentationAnimationDidFinish() {
    super.presentationAnimationDidFinish()

    let extensionItems = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
    let attachments = extensionItems.flatMap { $0.attachments ?? [] }
    let initialText = extensionItems.compactMap { $0.attributedContentText?.string }.first

    // Shown immediately, before intake finishes: the user's own typed
    // caption (if any) is never held back waiting on file copies. Never
    // re-injected with a URL/file representation afterwards -- those travel
    // separately in the submission's `items`, so there is exactly one place
    // this text appears, not a duplicate line repeating it.
    if let initialText {
      textView.text = initialText
    }

    refreshTask = Task { [weak self] in
      guard let self else { return }
      do {
        let store = try OneShareTargetDraftStore(appGroupIdentifier: self.configuration.appGroupIdentifier)
        let coordinator = OneShareTargetSubmissionCoordinator(
          submissionId: self.submissionId,
          configuration: self.configuration,
          adapter: self.makeAdapter(),
          draftStore: store
        )
        self.coordinator = coordinator
        await coordinator.load(attachments: attachments, accompanyingText: initialText).value
        await self.refresh()
      } catch {
        self.placeholder = "Couldn't prepare this share: \(error.localizedDescription)"
        self.validateContent()
      }
    }
  }

  @MainActor
  private func refresh() async {
    guard let coordinator else { return }
    let state = await coordinator.state
    if state == .failed {
      placeholder = await coordinator.lastError ?? "Couldn't load destinations."
    }
    isSendableSnapshot = await coordinator.isSendable
    let selectedId = await coordinator.selectedDestinationId
    let destinations = await coordinator.destinations
    destinationSummarySnapshot = destinations.first(where: { $0.id == selectedId })?.title ?? "Choose…"
    validateContent()
    reloadConfigurationItems()
  }

  // MARK: - SLComposeServiceViewController overrides

  open override func isContentValid() -> Bool {
    // `isContentValid()` is called synchronously by the system and cannot
    // itself await the actor; `isSendableSnapshot` is kept current by
    // `textViewDidChange` and `refresh()` instead of being read live here.
    guard coordinator != nil else { return false }
    return isSendableSnapshot
  }

  /// Mirrors `coordinator.isSendable`, updated whenever the coordinator's
  /// state could have changed it. `isContentValid()` must return
  /// synchronously, which an actor-isolated read cannot do.
  private var isSendableSnapshot = false

  open override func textViewDidChange(_ textView: UITextView) {
    super.textViewDidChange(textView)
    guard let coordinator else { return }
    let text = textView.text ?? ""
    Task {
      await coordinator.updateText(text)
      self.isSendableSnapshot = await coordinator.isSendable
      self.validateContent()
    }
  }

  open override func configurationItems() -> [Any]! {
    guard coordinator != nil else { return [] }
    let item = SLComposeSheetConfigurationItem()!
    item.title = "Send To"
    // `.subtitle`-style cells (used by the destination picker below) are
    // what let this item's value actually show; a default-style
    // `UITableViewCell` has no detail label to show one. The compose
    // controller already reads `item.value` for the row text, so this item
    // itself just needs a synchronous snapshot kept current.
    item.value = destinationSummarySnapshot
    item.tapHandler = { [weak self] in
      self?.presentDestinationPicker()
    }
    return [item]
  }

  /// Synchronous snapshot of the selected destination's display text,
  /// refreshed alongside `isSendableSnapshot`.
  private var destinationSummarySnapshot = "Loading…"

  private func presentDestinationPicker() {
    guard let coordinator else { return }
    Task {
      let destinations = await coordinator.destinations
      let selectedId = await coordinator.selectedDestinationId
      await MainActor.run { [weak self] in
        guard let self else { return }
        let picker = DestinationListViewController(destinations: destinations, selectedId: selectedId) { [weak self] id in
          guard let self, let coordinator = self.coordinator else { return }
          Task {
            await coordinator.selectDestination(id)
            self.destinationSummarySnapshot = await coordinator.destinations
              .first(where: { $0.id == id })?.title ?? "Choose…"
            self.isSendableSnapshot = await coordinator.isSendable
            await MainActor.run {
              self.validateContent()
              self.reloadConfigurationItems()
              self.popConfigurationViewController()
            }
          }
        }
        self.pushConfigurationViewController(picker)
      }
    }
  }

  open override func didSelectPost() {
    guard let coordinator else { return }
    // Disabling both buttons (not just relying on the coordinator's own
    // refusal) is what keeps a submission that may already be accepted from
    // ever being presented as cancellable: the control itself goes away.
    navigationItem.leftBarButtonItem?.isEnabled = false
    navigationItem.rightBarButtonItem?.isEnabled = false
    isModalInPresentation = true

    Task {
      let result = await coordinator.send()
      switch result {
      case .success:
        self.extensionContext?.completeRequest(returningItems: nil)
      case .failure(let error):
        self.isSendableSnapshot = await coordinator.isSendable
        await MainActor.run {
          self.navigationItem.leftBarButtonItem?.isEnabled = true
          self.navigationItem.rightBarButtonItem?.isEnabled = true
          self.isModalInPresentation = false
          self.validateContent()
          self.presentSendErrorAlert(error)
        }
      }
    }
  }

  open override func didSelectCancel() {
    guard let coordinator else {
      extensionContext?.cancelRequest(withError: NSError(domain: "OneShareTarget", code: NSUserCancelledError))
      return
    }
    navigationItem.leftBarButtonItem?.isEnabled = false
    navigationItem.rightBarButtonItem?.isEnabled = false

    Task {
      // Refused by the coordinator if a send is in flight/already accepted;
      // in that case this simply re-enables the UI rather than dismissing,
      // since the system's own Cancel tap already happened.
      let cancelled = await coordinator.cancel()
      if cancelled {
        self.extensionContext?.cancelRequest(withError: NSError(domain: "OneShareTarget", code: NSUserCancelledError))
      } else {
        await MainActor.run {
          self.navigationItem.leftBarButtonItem?.isEnabled = true
          self.navigationItem.rightBarButtonItem?.isEnabled = true
        }
      }
    }
  }

  private func presentSendErrorAlert(_ error: Error) {
    let alert = UIAlertController(
      title: "Couldn't send",
      message: error.localizedDescription,
      preferredStyle: .alert
    )
    alert.addAction(UIAlertAction(title: "OK", style: .default))
    present(alert, animated: true)
  }
}

/// A destination's title and subtitle, pushed by `configurationItems()`'s
/// tap handler. Uses `.subtitle`-style cells so a destination's `subtitle`
/// (staleness, metadata) is actually visible -- a default-style
/// `UITableViewCell` has no detail text label to show it in.
private final class DestinationListViewController: UITableViewController {
  private let destinations: [OneShareDestination]
  private let selectedId: String?
  private let onSelect: (String) -> Void
  private static let cellId = "destination"

  init(destinations: [OneShareDestination], selectedId: String?, onSelect: @escaping (String) -> Void) {
    self.destinations = destinations
    self.selectedId = selectedId
    self.onSelect = onSelect
    super.init(style: .plain)
    title = "Send To"
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not used")
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    tableView.register(UITableViewCell.self, forCellReuseIdentifier: Self.cellId)
  }

  override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    destinations.count
  }

  override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = UITableViewCell(style: .subtitle, reuseIdentifier: Self.cellId)
    let destination = destinations[indexPath.row]
    cell.textLabel?.text = destination.title
    cell.detailTextLabel?.text = destination.subtitle
    cell.accessoryType = destination.id == selectedId ? .checkmark : .none
    return cell
  }

  override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    tableView.deselectRow(at: indexPath, animated: true)
    onSelect(destinations[indexPath.row].id)
  }
}
