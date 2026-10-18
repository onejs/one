import Foundation
import Combine
import Observation

@Observable final class SDKObservedCounter {
  var count = 0
}

@main struct SDKObservationProbe {
  @MainActor static func main() async throws {
    let progress = Progress(totalUnitCount: 4)
    var kvoValues: [Double] = []
    let kvo = try OneSDKObservations.property(progress, \Progress.fractionCompleted, "kvo") {
      kvoValues.append($0 as! Double)
    }
    progress.completedUnitCount = 1
    precondition(kvoValues == [0, 0.25], "KVO did not emit initial and changed values")
    kvo.cancel()
    progress.completedUnitCount = 2
    precondition(kvoValues == [0, 0.25], "KVO emitted after cancellation")

    let counter = SDKObservedCounter()
    let changes = AsyncStream<Int>.makeStream()
    var trackingValues: [Int] = []
    let tracking = try OneSDKObservations.property(counter, \SDKObservedCounter.count, "tracking") {
      trackingValues.append($0 as! Int)
      changes.continuation.yield($0 as! Int)
    }
    var changed = changes.stream.makeAsyncIterator()
    let initial = await changed.next()
    precondition(initial == 0)
    counter.count = 1
    let next = await changed.next()
    precondition(next == 1)
    tracking.cancel()
    counter.count = 2
    await withCheckedContinuation { continuation in
      DispatchQueue.main.async { continuation.resume() }
    }
    precondition(trackingValues == [0, 1], "Observable emitted after cancellation")
    changes.continuation.finish()

    let publisher = PassthroughSubject<Int, Never>()
    var published: [Int] = []
    let combine = OneSDKObservations.publisher(publisher, { published.append($0 as! Int) }, { _ in preconditionFailure() })
    publisher.send(1)
    combine.cancel()
    publisher.send(2)
    precondition(published == [1], "publisher emitted after cancellation")

    let source = AsyncStream<Int>.makeStream()
    let received = AsyncStream<Int>.makeStream()
    var sequenced: [Int] = []
    let sequence = OneSDKObservations.sequence(source.stream, {
      sequenced.append($0 as! Int)
      received.continuation.yield($0 as! Int)
    }, { _ in preconditionFailure() })
    var values = received.stream.makeAsyncIterator()
    source.continuation.yield(1)
    let element = await values.next()
    precondition(element == 1)
    sequence.cancel()
    source.continuation.yield(2)
    source.continuation.finish()
    precondition(sequenced == [1], "sequence emitted after cancellation")
    received.continuation.finish()
    print("PASS: KVO, Observable, Combine, AsyncSequence changes and teardown")
  }
}
