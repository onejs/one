// Standalone native contract for a One share-target adapter.
// Apple-frameworks-only: no React/Expo/One Nitro runtime dependency.
// Safe under APPLICATION_EXTENSION_API_ONLY.

import UIKit
import UniformTypeIdentifiers

/// The native compose controller: system compose text input, a native
/// destination picker, attachment preview metadata, and Send/Cancel. Fully
/// generic; it knows nothing about any particular app's transport. A
/// generated principal class (see `OneShareTargetViewController`) supplies
/// the adapter and configuration and is the one actually registered as the
/// Share extension's principal class.
///
/// Depends only on Foundation/UIKit/UniformTypeIdentifiers and is safe to
/// link `APPLICATION_EXTENSION_API_ONLY`: it never touches `UIApplication`,
/// URL-opening, or any other app-only API.
open class OneShareComposeViewController: UIViewController {
  /// Must be overridden by the generated principal subclass.
  open var configuration: OneShareTargetConfiguration {
    fatalError("OneShareComposeViewController.configuration must be overridden")
  }

  /// Must be overridden by the generated principal subclass. Called once,
  /// lazily, on first use.
  open func makeAdapter() -> any OneShareTargetAdapter {
    fatalError("OneShareComposeViewController.makeAdapter() must be overridden")
  }

  // MARK: - State

  private let submissionId = UUID().uuidString
  private var draftStore: OneShareTargetDraftStore?
  private lazy var adapter: any OneShareTargetAdapter = makeAdapter()

  private var destinations: [OneShareDestination] = []
  private var selectedDestinationId: String?
  private var copiedItems: [OneSharedItem] = []
  private var accompanyingText: String = ""

  private var intakeTask: Task<Void, Never>?
  private var sendTask: Task<Void, Never>?
  private let cancellationFlag = OneShareTargetCancellationFlag()
  private var isSending = false

  // MARK: - UI

  private let textView = UITextView()
  private let destinationTable = UITableView(frame: .zero, style: .plain)
  private let attachmentTable = UITableView(frame: .zero, style: .plain)
  private let errorLabel = UILabel()
  private let activityIndicator = UIActivityIndicatorView(style: .medium)
  private var sendButton: UIBarButtonItem!
  private var cancelButton: UIBarButtonItem!

  private static let attachmentCellId = "attachment"
  private static let destinationCellId = "destination"

  // MARK: - Lifecycle

  override open func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    buildUI()
    beginLoading()
  }

  private func buildUI() {
    title = "Share"
    cancelButton = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(didTapCancel))
    sendButton = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(didTapSend))
    sendButton.isEnabled = false
    navigationItem.leftBarButtonItem = cancelButton
    navigationItem.rightBarButtonItem = sendButton

    textView.font = .preferredFont(forTextStyle: .body)
    textView.delegate = self
    textView.translatesAutoresizingMaskIntoConstraints = false

    destinationTable.dataSource = self
    destinationTable.delegate = self
    destinationTable.register(UITableViewCell.self, forCellReuseIdentifier: Self.destinationCellId)
    destinationTable.translatesAutoresizingMaskIntoConstraints = false

    attachmentTable.dataSource = self
    attachmentTable.delegate = self
    attachmentTable.isScrollEnabled = false
    attachmentTable.register(UITableViewCell.self, forCellReuseIdentifier: Self.attachmentCellId)
    attachmentTable.translatesAutoresizingMaskIntoConstraints = false

    errorLabel.numberOfLines = 0
    errorLabel.textColor = .systemRed
    errorLabel.font = .preferredFont(forTextStyle: .footnote)
    errorLabel.translatesAutoresizingMaskIntoConstraints = false

    activityIndicator.translatesAutoresizingMaskIntoConstraints = false

    let stack = UIStackView(arrangedSubviews: [textView, attachmentTable, errorLabel, destinationTable])
    stack.axis = .vertical
    stack.spacing = 12
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    view.addSubview(activityIndicator)

    NSLayoutConstraint.activate([
      stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
      stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),
      textView.heightAnchor.constraint(equalToConstant: 120),
      attachmentTable.heightAnchor.constraint(equalToConstant: 88),
      activityIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      activityIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
  }

  // MARK: - Loading

  private func beginLoading() {
    activityIndicator.startAnimating()

    let extensionItems = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
    let attachments = extensionItems.flatMap { $0.attachments ?? [] }
    let text = extensionItems.compactMap { $0.attributedContentText?.string }.first

    intakeTask = Task { [weak self] in
      guard let self else { return }
      await self.runIntake(attachments: attachments, accompanyingText: text)
    }
  }

  private func runIntake(attachments: [NSItemProvider], accompanyingText: String?) async {
    do {
      let store = try OneShareTargetDraftStore(appGroupIdentifier: configuration.appGroupIdentifier)
      draftStore = store
      let itemsDirectory = try await store.itemsDirectory(forSubmissionId: submissionId)

      let intake = OneShareTargetIntake(configuration: configuration)
      let items = try await intake.intake(
        attachments: attachments,
        accompanyingText: accompanyingText,
        destinationDirectory: itemsDirectory,
        isCancelled: { [cancellationFlag] in cancellationFlag.isCancelled }
      )

      if Task.isCancelled || cancellationFlag.isCancelled { return }

      let destinations = try await adapter.destinations()

      self.copiedItems = items
      self.accompanyingText = accompanyingText ?? ""
      self.destinations = destinations
      self.selectedDestinationId = destinations.first?.id

      try await persistDraft()

      activityIndicator.stopAnimating()
      attachmentTable.reloadData()
      destinationTable.reloadData()
      updateSendEnabled()
    } catch is CancellationError {
      // cancellation already handled by didTapCancel
    } catch let error as OneShareTargetError where error == .intakeCancelled {
      // cancellation already handled by didTapCancel
    } catch {
      activityIndicator.stopAnimating()
      showError("Couldn't prepare this share: \(error.localizedDescription)")
    }
  }

  private func persistDraft() async throws {
    guard let draftStore else { return }
    let draft = OneShareTargetDraft(
      id: submissionId,
      destinationId: selectedDestinationId,
      text: accompanyingText,
      items: copiedItems
    )
    try await draftStore.save(draft)
  }

  private func updateSendEnabled() {
    sendButton.isEnabled = !isSending && selectedDestinationId != nil && !destinations.isEmpty
  }

  private func showError(_ message: String) {
    errorLabel.text = message
  }

  // MARK: - Actions

  @objc private func didTapCancel() {
    cancellationFlag.cancel()
    intakeTask?.cancel()
    sendTask?.cancel()
    Task { [weak self] in
      guard let self else { return }
      try? await self.draftStore?.discard(submissionId: self.submissionId)
      self.extensionContext?.cancelRequest(
        withError: NSError(domain: "OneShareTarget", code: NSUserCancelledError)
      )
    }
  }

  @objc private func didTapSend() {
    guard let destinationId = selectedDestinationId, !isSending else { return }
    isSending = true
    updateSendEnabled()
    errorLabel.text = nil
    activityIndicator.startAnimating()

    let submission = OneShareSubmission(
      id: submissionId,
      destinationId: destinationId,
      text: accompanyingText,
      items: copiedItems
    )

    sendTask = Task { [weak self] in
      guard let self else { return }
      do {
        try await self.adapter.send(submission: submission)
        // success: remove only this delivered draft, then complete the host request.
        try? await self.draftStore?.discard(submissionId: self.submissionId)
        self.activityIndicator.stopAnimating()
        self.extensionContext?.completeRequest(returningItems: nil)
      } catch {
        // failure: retain the draft/UI so the user can retry.
        self.isSending = false
        self.activityIndicator.stopAnimating()
        self.updateSendEnabled()
        self.showError("Couldn't send: \(error.localizedDescription)")
      }
    }
  }
}

// MARK: - UITextViewDelegate

extension OneShareComposeViewController: UITextViewDelegate {
  public func textViewDidChange(_ textView: UITextView) {
    accompanyingText = textView.text
    Task { try? await self.persistDraft() }
  }
}

// MARK: - UITableViewDataSource / UITableViewDelegate

extension OneShareComposeViewController: UITableViewDataSource, UITableViewDelegate {
  public func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    tableView === destinationTable ? destinations.count : copiedItems.count
  }

  public func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    if tableView === destinationTable {
      let cell = tableView.dequeueReusableCell(withIdentifier: Self.destinationCellId, for: indexPath)
      let destination = destinations[indexPath.row]
      cell.textLabel?.text = destination.title
      cell.detailTextLabel?.text = destination.subtitle
      cell.accessoryType = destination.id == selectedDestinationId ? .checkmark : .none
      return cell
    }

    let cell = tableView.dequeueReusableCell(withIdentifier: Self.attachmentCellId, for: indexPath)
    switch copiedItems[indexPath.row] {
    case .text(let value):
      cell.textLabel?.text = value
      cell.detailTextLabel?.text = "Text"
    case .url(let value):
      cell.textLabel?.text = value.absoluteString
      cell.detailTextLabel?.text = "Link"
    case .file(let file):
      cell.textLabel?.text = file.name
      cell.detailTextLabel?.text = "\(file.mimeType) · \(ByteCountFormatter.string(fromByteCount: Int64(file.byteCount), countStyle: .file))"
    }
    cell.selectionStyle = .none
    return cell
  }

  public func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    tableView.deselectRow(at: indexPath, animated: true)
    guard tableView === destinationTable else { return }
    selectedDestinationId = destinations[indexPath.row].id
    tableView.reloadData()
    updateSendEnabled()
    Task { try? await self.persistDraft() }
  }
}
