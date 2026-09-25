import SwiftUI
import UIKit

// the remote image behind One.iOS.Image's uri. SwiftUI's AsyncImage stays custom content
// in a toolbar, while a view that draws the SDK's Image(uiImage:) becomes the bar item's
// image (the Duo's edge dock takes it into its pill), so the bytes load here and the
// view draws Image(uiImage:). one loader per uri, shared across views; a failed load
// leaves the cache so the next view retries.
final class OneNativeRemoteImageLoader: ObservableObject {
  private static let cache = NSCache<NSString, OneNativeRemoteImageLoader>()

  static func loader(_ uri: String) -> OneNativeRemoteImageLoader {
    if let hit = cache.object(forKey: uri as NSString) { return hit }
    let loader = OneNativeRemoteImageLoader(uri)
    cache.setObject(loader, forKey: uri as NSString)
    return loader
  }

  @Published private(set) var image: UIImage?

  private init(_ uri: String) {
    guard let url = URL(string: uri) else {
      preconditionFailure("One.iOS.Image uri is not a URL: \(uri)")
    }
    URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      DispatchQueue.main.async {
        guard let data, let image = UIImage(data: data) else {
          Self.cache.removeObject(forKey: uri as NSString)
          return
        }
        self?.image = image
      }
    }.resume()
  }
}

// fills the frame it is given, like a React Native Image's default cover resize mode, and
// keeps the photo's own colors where a bar would template it.
struct OneNativeRemoteImage: View {
  @ObservedObject private var loader: OneNativeRemoteImageLoader

  init(uri: String) { loader = .loader(uri) }

  var body: some View {
    if let image = loader.image {
      Image(uiImage: image).renderingMode(.original).resizable().scaledToFill()
    } else {
      Color.clear
    }
  }
}
