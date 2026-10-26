#import "OneMacosWebSocket.h"

@interface OneMacosWebSocketManager () <NSURLSessionWebSocketDelegate>
@end

@implementation OneMacosWebSocketManager {
  std::function<void(const std::string &, folly::dynamic)> _emit;
  NSURLSession *_session;
  NSMutableDictionary<NSNumber *, NSURLSessionWebSocketTask *> *_tasks;
}

- (instancetype)initWithEmitter:(std::function<void(const std::string &, folly::dynamic)>)emitter
{
  if (self = [super init]) {
    _emit = std::move(emitter);
    _tasks = [NSMutableDictionary new];
    NSOperationQueue *queue = [NSOperationQueue new];
    queue.maxConcurrentOperationCount = 1;
    _session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.defaultSessionConfiguration
                                             delegate:self
                                        delegateQueue:queue];
  }
  return self;
}

- (NSNumber *)socketIDForTask:(NSURLSessionTask *)task
{
  @synchronized(self) {
    for (NSNumber *key in _tasks) {
      if (_tasks[key] == task) {
        return key;
      }
    }
  }
  return nil;
}

- (void)connect:(NSURL *)url protocols:(NSArray<NSString *> *)protocols socketID:(NSInteger)socketID
{
  NSURLSessionWebSocketTask *task = protocols.count > 0 ? [_session webSocketTaskWithURL:url protocols:protocols]
                                                         : [_session webSocketTaskWithURL:url];
  @synchronized(self) {
    _tasks[@(socketID)] = task;
  }
  [task resume];
  [self receive:task socketID:socketID];
}

- (void)receive:(NSURLSessionWebSocketTask *)task socketID:(NSInteger)socketID
{
  __weak OneMacosWebSocketManager *weakSelf = self;
  [task receiveMessageWithCompletionHandler:^(NSURLSessionWebSocketMessage *message, NSError *error) {
    OneMacosWebSocketManager *strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }
    if (error) {
      // closing already reported through the delegate
      if (task.state == NSURLSessionTaskStateRunning) {
        strongSelf->_emit(
            "websocketFailed",
            folly::dynamic::object("id", (int)socketID)("message", error.localizedDescription.UTF8String));
      }
      return;
    }
    if (message.type == NSURLSessionWebSocketMessageTypeString) {
      strongSelf->_emit(
          "websocketMessage",
          folly::dynamic::object("id", (int)socketID)("type", "text")("data", message.string.UTF8String));
    } else {
      strongSelf->_emit(
          "websocketMessage",
          folly::dynamic::object("id", (int)socketID)("type", "binary")(
              "data", [message.data base64EncodedStringWithOptions:0].UTF8String));
    }
    [strongSelf receive:task socketID:socketID];
  }];
}

- (nullable NSURLSessionWebSocketTask *)task:(NSInteger)socketID
{
  @synchronized(self) {
    return _tasks[@(socketID)];
  }
}

- (void)sendText:(NSString *)text socketID:(NSInteger)socketID
{
  [[self task:socketID] sendMessage:[[NSURLSessionWebSocketMessage alloc] initWithString:text]
                  completionHandler:^(NSError *error) {
                    if (error) {
                      self->_emit(
                          "websocketFailed",
                          folly::dynamic::object("id", (int)socketID)("message", error.localizedDescription.UTF8String));
                    }
                  }];
}

- (void)sendBase64:(NSString *)base64 socketID:(NSInteger)socketID
{
  NSData *data = [[NSData alloc] initWithBase64EncodedString:base64 options:0];
  [[self task:socketID] sendMessage:[[NSURLSessionWebSocketMessage alloc] initWithData:data]
                  completionHandler:^(NSError *error) {}];
}

- (void)ping:(NSInteger)socketID
{
  [[self task:socketID] sendPingWithPongReceiveHandler:^(NSError *error) {}];
}

- (void)close:(NSInteger)socketID code:(NSInteger)code reason:(NSString *)reason
{
  [[self task:socketID] cancelWithCloseCode:(NSURLSessionWebSocketCloseCode)code
                                     reason:[reason dataUsingEncoding:NSUTF8StringEncoding]];
}

#pragma mark - NSURLSessionWebSocketDelegate

- (void)URLSession:(NSURLSession *)session
          webSocketTask:(NSURLSessionWebSocketTask *)task
    didOpenWithProtocol:(NSString *)protocol
{
  NSNumber *socketID = [self socketIDForTask:task];
  if (socketID) {
    _emit(
        "websocketOpen",
        folly::dynamic::object("id", socketID.intValue)("protocol", protocol ? protocol.UTF8String : ""));
  }
}

- (void)URLSession:(NSURLSession *)session
       webSocketTask:(NSURLSessionWebSocketTask *)task
    didCloseWithCode:(NSURLSessionWebSocketCloseCode)closeCode
              reason:(NSData *)reason
{
  NSNumber *socketID = [self socketIDForTask:task];
  if (socketID) {
    NSString *reasonString = reason ? [[NSString alloc] initWithData:reason encoding:NSUTF8StringEncoding] : @"";
    _emit(
        "websocketClosed",
        folly::dynamic::object("id", socketID.intValue)("code", (int)closeCode)("reason", reasonString.UTF8String));
    @synchronized(self) {
      [_tasks removeObjectForKey:socketID];
    }
  }
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error
{
  NSNumber *socketID = [self socketIDForTask:task];
  if (socketID && error) {
    _emit(
        "websocketFailed",
        folly::dynamic::object("id", socketID.intValue)("message", error.localizedDescription.UTF8String));
    @synchronized(self) {
      [_tasks removeObjectForKey:socketID];
    }
  }
}

@end
