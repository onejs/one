import Foundation
import NitroModules

// the global fetch on native, over URLSession. the session delegate hands the
// response head, then every chunk as it arrives, to js, so response.body
// streams. the configuration matches react native's RCTHTTPRequestHandler
// (shared cookie storage, cookies always accepted), so this fetch and
// react native networking see the same cookies. URLSession also reads file:
// and data: urls, as react native's fetch does.
final class HybridOneFetch: HybridOneFetchSpec {
  private final class Request {
    let onResponse: (FetchNativeResponse) -> Void
    let onChunk: (ArrayBuffer) -> Void
    let onComplete: () -> Void
    let onError: (String) -> Void
    var redirected = false

    init(
      onResponse: @escaping (FetchNativeResponse) -> Void,
      onChunk: @escaping (ArrayBuffer) -> Void,
      onComplete: @escaping () -> Void,
      onError: @escaping (String) -> Void
    ) {
      self.onResponse = onResponse
      self.onChunk = onChunk
      self.onComplete = onComplete
      self.onError = onError
    }
  }

  // all request state lives on the session's serial delegate queue
  private final class Delegate: NSObject, URLSessionDataDelegate {
    let queue: OperationQueue = {
      let queue = OperationQueue()
      queue.maxConcurrentOperationCount = 1
      queue.name = "one.fetch"
      return queue
    }()
    var requests: [Int: Request] = [:]
    var tasks: [Double: URLSessionTask] = [:]

    func urlSession(
      _ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
      completionHandler: @escaping (URLSession.ResponseDisposition) -> Void
    ) {
      guard let request = requests[dataTask.taskIdentifier] else {
        completionHandler(.cancel)
        return
      }
      // file: and data: responses are not http; they read as a plain 200
      let http = response as? HTTPURLResponse
      var headers: [FetchHeader] = []
      if let http {
        for (name, value) in http.allHeaderFields {
          headers.append(FetchHeader(name: "\(name)", value: "\(value)"))
        }
      } else if let type = response.mimeType {
        headers.append(FetchHeader(name: "content-type", value: type))
      }
      // URLSession exposes no reason phrase; http/2 has none either
      request.onResponse(
        FetchNativeResponse(
          status: Double(http?.statusCode ?? 200),
          statusText: "",
          url: response.url?.absoluteString ?? dataTask.originalRequest?.url?.absoluteString ?? "",
          redirected: request.redirected,
          headers: headers))
      completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
      guard let request = requests[dataTask.taskIdentifier] else { return }
      do {
        request.onChunk(try ArrayBuffer.copy(data: data))
      } catch {
        fail(dataTask, error.localizedDescription)
      }
    }

    func urlSession(
      _ session: URLSession, task: URLSessionTask,
      willPerformHTTPRedirection response: HTTPURLResponse, newRequest: URLRequest,
      completionHandler: @escaping (URLRequest?) -> Void
    ) {
      requests[task.taskIdentifier]?.redirected = true
      completionHandler(newRequest)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
      guard let request = forget(task) else { return }
      if let error {
        request.onError(error.localizedDescription)
      } else {
        request.onComplete()
      }
    }

    func fail(_ task: URLSessionTask, _ message: String) {
      guard let request = forget(task) else { return }
      task.cancel()
      request.onError(message)
    }

    @discardableResult
    func forget(_ task: URLSessionTask) -> Request? {
      if let id = tasks.first(where: { $0.value === task })?.key {
        tasks[id] = nil
      }
      return requests.removeValue(forKey: task.taskIdentifier)
    }
  }

  private let delegate = Delegate()
  private let session: URLSession

  override init() {
    let configuration = URLSessionConfiguration.default
    configuration.httpShouldSetCookies = true
    configuration.httpCookieAcceptPolicy = .always
    configuration.httpCookieStorage = .shared
    session = URLSession(
      configuration: configuration, delegate: delegate, delegateQueue: delegate.queue)
    super.init()
  }

  deinit {
    session.invalidateAndCancel()
  }

  func start(
    id: Double, request: FetchNativeRequest,
    onResponse: @escaping (FetchNativeResponse) -> Void,
    onChunk: @escaping (ArrayBuffer) -> Void,
    onComplete: @escaping () -> Void,
    onError: @escaping (String) -> Void
  ) throws {
    guard let url = URL(string: request.url) else {
      onError("invalid url \(request.url)")
      return
    }
    var urlRequest = URLRequest(url: url)
    urlRequest.httpMethod = request.method
    urlRequest.httpShouldHandleCookies = !request.omitCredentials
    for header in request.headers {
      urlRequest.addValue(header.value, forHTTPHeaderField: header.name)
    }
    // js-owned buffers are only readable during this call, so copy now
    let body = request.body.map { $0.toData(copyIfNeeded: true) }
    let blob = request.blob
    let form = request.form
    let boundary = request.boundary
    let pending = Request(
      onResponse: onResponse, onChunk: onChunk, onComplete: onComplete, onError: onError)
    delegate.queue.addOperation { [delegate, session] in
      do {
        if let body {
          urlRequest.httpBody = body
        } else if let blob {
          urlRequest.httpBody = try Self.resolve(blob)
        } else if let form, let boundary {
          urlRequest.httpBody = try Self.multipart(form, boundary: boundary)
        }
      } catch {
        onError(error.localizedDescription)
        return
      }
      let task = session.dataTask(with: urlRequest)
      delegate.requests[task.taskIdentifier] = pending
      delegate.tasks[id] = task
      task.resume()
    }
  }

  func cancel(id: Double) throws {
    delegate.queue.addOperation { [delegate] in
      guard let task = delegate.tasks.removeValue(forKey: id) else { return }
      delegate.requests[task.taskIdentifier] = nil
      task.cancel()
    }
  }

  func storeBlob(bytes: ArrayBuffer) throws -> String {
    let data = bytes.toData(copyIfNeeded: true)
    guard let blobId = try Self.blobManager().perform(NSSelectorFromString("store:"), with: data)?
      .takeUnretainedValue() as? String
    else {
      throw RuntimeError.error(withMessage: "fetch: the react native blob store rejected the bytes")
    }
    return blobId
  }

  // react native's blob store, the BlobModule its networking and Blob use
  private static func blobManager() throws -> NSObject {
    guard let manager = OneFetchBlobStore.manager else {
      throw RuntimeError.error(withMessage: "fetch: react native's BlobModule is not loaded")
    }
    return manager
  }

  private static func resolve(_ blob: FetchBlobRef) throws -> Data {
    let ref: NSDictionary = [
      "blobId": blob.blobId, "offset": Int(blob.offset), "size": Int(blob.size),
    ]
    guard let data = try blobManager().perform(NSSelectorFromString("resolve:"), with: ref)?
      .takeUnretainedValue() as? Data
    else {
      throw RuntimeError.error(withMessage: "fetch: blob \(blob.blobId) is no longer in the store")
    }
    return data
  }

  private static func read(uri: String) throws -> Data {
    guard let url = URL(string: uri), url.isFileURL else {
      throw RuntimeError.error(withMessage: "fetch: FormData uri \(uri) is not a file: url")
    }
    return try Data(contentsOf: url)
  }

  // multipart/form-data per RFC 7578, the same layout react native writes
  private static func multipart(_ parts: [FetchFormPart], boundary: String) throws -> Data {
    var body = Data()
    func line(_ text: String) { body.append(Data((text + "\r\n").utf8)) }
    for part in parts {
      line("--\(boundary)")
      var disposition = "Content-Disposition: form-data; name=\"\(escape(part.name))\""
      if let filename = part.filename ?? part.uri.flatMap({ URL(string: $0)?.lastPathComponent }),
        part.value == nil
      {
        disposition += "; filename=\"\(escape(filename))\""
      }
      line(disposition)
      if let value = part.value {
        line("")
        line(value)
        continue
      }
      let data: Data
      if let uri = part.uri {
        data = try read(uri: uri)
      } else if let blob = part.blob {
        data = try resolve(blob)
      } else {
        throw RuntimeError.error(withMessage: "fetch: FormData part \(part.name) has no value")
      }
      line("Content-Type: \(part.type ?? "application/octet-stream")")
      line("")
      body.append(data)
      line("")
    }
    line("--\(boundary)--")
    return body
  }

  private static func escape(_ value: String) -> String {
    value.replacingOccurrences(of: "\"", with: "%22").replacingOccurrences(of: "\r", with: "%0D")
      .replacingOccurrences(of: "\n", with: "%0A")
  }
}

// set by OneFetchBlobStoreModule from react native's module registry
@objcMembers public final class OneFetchBlobStore: NSObject {
  public static weak var manager: NSObject?
}
