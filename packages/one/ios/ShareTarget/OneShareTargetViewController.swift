// Standalone native contract for a One share-target adapter.
// Apple-frameworks-only: no React/Expo/One Nitro runtime dependency.
// Safe under APPLICATION_EXTENSION_API_ONLY.

import Social

/// The class generated code should actually subclass for an extension's
/// principal class (`NSExtensionPrincipalClass` in the extension's
/// `Info.plist`). It inherits the full compose controller from
/// `OneShareComposeViewController` and exists so generated subclasses have a
/// single, stable, versioned type to target regardless of how the compose
/// engine itself evolves.
///
/// A generated principal class looks like:
///
/// ```swift
/// final class GeneratedTeamMachineShareViewController: OneShareTargetViewController {
///   override var configuration: OneShareTargetConfiguration {
///     OneShareTargetConfiguration(
///       appGroupIdentifier: "group.com.example.teammachine",
///       acceptedFileTypeIdentifiers: ["public.image"]
///     )
///   }
///
///   override func makeAdapter() -> any OneShareTargetAdapter {
///     TeamMachineShareTargetAdapter()
///   }
/// }
/// ```
open class OneShareTargetViewController: OneShareComposeViewController {}
