// The principal class a real codegen step would produce: a one-line
// subclass supplying configuration + adapter. This is exactly the worked
// example in OneShareTargetViewController's doc comment, made real.
import Foundation

@objc(GeneratedHarnessShareViewController)
final class GeneratedHarnessShareViewController: OneShareTargetViewController {
  override var configuration: OneShareTargetConfiguration {
    OneShareTargetConfiguration(
      appGroupIdentifier: harnessAppGroupIdentifier,
      acceptedFileTypeIdentifiers: ["public.image"]
    )
  }

  override func makeAdapter() -> any OneShareTargetAdapter {
    HarnessShareTargetAdapter()
  }
}
