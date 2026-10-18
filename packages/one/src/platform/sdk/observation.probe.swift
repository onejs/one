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
    let received = AsyncStream<String>.makeStream()
    var box: OneSDKHandleBox? = OneSDKHandleBox(source.stream)
    var first: [Int] = []
    var second: [Int] = []
    let one = try box!.subscribeSequence({
      first.append($0 as! Int)
      received.continuation.yield("one")
    }, { _ in preconditionFailure() })
    let two = try box!.subscribeSequence({
      second.append($0 as! Int)
      received.continuation.yield("two")
    }, { _ in preconditionFailure() })
    var values = received.stream.makeAsyncIterator()
    source.continuation.yield(1)
    _ = await values.next()
    _ = await values.next()
    precondition(first == [1] && second == [1], "subscribers competed for stream values")
    one.cancel()
    source.continuation.yield(2)
    _ = await values.next()
    precondition(first == [1] && second == [1, 2], "cancel affected another subscriber")
    two.cancel()
    let remount = try box!.subscribeSequence({
      second.append($0 as! Int)
      received.continuation.yield("remount")
    }, { _ in preconditionFailure() })
    _ = await values.next()
    precondition(second == [1, 2, 2], "remount did not receive latest snapshot")
    source.continuation.yield(3)
    _ = await values.next()
    precondition(second == [1, 2, 2, 3], "remount ended stream")
    remount.cancel()
    let terminated = AsyncStream<Void>.makeStream()
    source.continuation.onTermination = { _ in terminated.continuation.yield(()) }
    box = nil
    var end = terminated.stream.makeAsyncIterator()
    _ = await end.next()
    received.continuation.finish()
    terminated.continuation.finish()

    // singleton/child reference ids survive temporary boxes. value handles stay distinct.
    let native = NSObject()
    precondition(OneSDKHandleBox(native).identity == OneSDKHandleBox(native).identity)
    precondition(OneSDKHandleBox(counter).identity == OneSDKHandleBox(counter).identity)
    precondition(OneSDKHandleBox(NSObject()).identity != OneSDKHandleBox(NSObject()).identity)
    precondition(OneSDKHandleBox(source.stream).identity != OneSDKHandleBox(source.stream).identity)

    // direct Nitro value call path: CGRect, CGPoint, Data, Date, String, numbers, handles
    let rect = CGRect(x: 1, y: 2, width: 30, height: 40)
    let point = CGPoint(x: 5, y: 6)
    let direct = OneSDKCall(receiver: OneSDKHandleBox(native), argCount: 2, arg0: rect, arg1: "frame")
    precondition((try! direct.receiver() as NSObject) === native)
    precondition((try! direct.arg(0) as CGRect) == rect)
    precondition((try! direct.arg(1) as String) == "frame")
    precondition((direct.out(rect) as? CGRect) == rect)
    precondition((direct.out(point) as? CGPoint) == point)
    let rawBytes = Data([0, 1, 127, 128, 255])
    let directBytes = OneSDKCall(receiver: nil, argCount: 2, arg0: rawBytes, arg1: Date(timeIntervalSince1970: 1700000000))
    precondition((try! directBytes.arg(0) as Data) == rawBytes)
    precondition((directBytes.out(rawBytes) as? Data) == rawBytes)
    precondition((try! directBytes.arg(1) as Date) == Date(timeIntervalSince1970: 1700000000))
    let buffered = try OneSDKCall(data: ["args": [["$b": 0]]], handles: [], buffers: [rawBytes])
    precondition((try! buffered.arg(0) as Data) == rawBytes)

    print("PASS: KVO, Observable, Combine teardown; AsyncSequence fanout, independent cancel, remount, handle-release cancellation; native reference identity; direct Nitro value call fast-paths")
  }
}
