#import "OneMacosNetworking.h"
#import <CoreFoundation/CoreFoundation.h>
#include <cfloat>

static std::string networkString(NSString *value)
{
  return std::string(value.UTF8String, [value lengthOfBytesUsingEncoding:NSUTF8StringEncoding]);
}

@interface OneMacosNetworkRequest : NSObject
@property NSInteger requestID;
@property NSURLSessionDataTask *task;
@property NSMutableData *data;
@property NSString *responseType;
@property BOOL incremental;
@property NSUInteger deliveredBytes;
@end
@implementation OneMacosNetworkRequest
@end

// the session retains its delegate; the delegate must not retain the module.
@interface OneMacosNetworkDelegate : NSObject <NSURLSessionDataDelegate>
@property (weak) OneMacosNetworking *owner;
@end

@interface OneMacosNetworking () <NSURLSessionDataDelegate>
@end

@implementation OneMacosNetworking {
  std::function<void(const std::string &, folly::dynamic)> _emit;
  NSURLSession *_session;
  OneMacosBlobStore *_blobStore;
  NSMutableDictionary<NSNumber *, OneMacosNetworkRequest *> *_requests;
  NSInteger _nextID;
  BOOL _invalidated;
}

- (instancetype)initWithEmitter:(std::function<void(const std::string &, folly::dynamic)>)emitter blobStore:(OneMacosBlobStore *)blobStore
{
  if ((self = [super init])) {
    _emit = std::move(emitter);
    _blobStore = blobStore;
    _requests = [NSMutableDictionary new];
    OneMacosNetworkDelegate *delegate = [OneMacosNetworkDelegate new];
    delegate.owner = self;
    NSOperationQueue *queue = [NSOperationQueue new];
    queue.maxConcurrentOperationCount = 1;
    _session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.defaultSessionConfiguration
                                           delegate:delegate delegateQueue:queue];
  }
  return self;
}

- (void)dealloc { [self invalidate]; }

- (void)invalidate
{
  @synchronized(self) {
    _invalidated = YES;
    _emit = nullptr;
    [_session invalidateAndCancel];
    [_requests removeAllObjects];
  }
}

- (NSInteger)nextRequestID
{
  @synchronized(self) { return ++_nextID; }
}

- (void)complete:(NSInteger)requestID error:(NSString *)error timeout:(BOOL)timeout
{
  if (_emit) {
    _emit("didCompleteNetworkResponse", folly::dynamic::array(
        (double)requestID, error ? folly::dynamic(networkString(error)) : folly::dynamic(nullptr), (bool)timeout));
  }
}

- (void)sendRequest:(NSDictionary *)query requestID:(NSInteger)requestID
{
  @synchronized(self) {
    if (_invalidated) return;
    NSURL *url = [NSURL URLWithString:query[@"url"]];
    if (!url || ![@[@"http", @"https"] containsObject:url.scheme.lowercaseString] || !url.host.length) {
      [self complete:requestID error:@"Invalid HTTP URL" timeout:NO];
      return;
    }
    NSString *type = query[@"responseType"] ?: @"text";
    if (![@[@"text", @"base64", @"blob"] containsObject:type]) {
      [self complete:requestID error:@"Unsupported networking response type" timeout:NO];
      return;
    }
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    request.HTTPMethod = query[@"method"] ?: @"GET";
    request.allHTTPHeaderFields = query[@"headers"];
    request.HTTPShouldHandleCookies = [query[@"withCredentials"] boolValue];
    double timeout = [query[@"timeout"] doubleValue];
    // XHR's zero means no deadline, rather than NSURLSession's default 60 seconds.
    request.timeoutInterval = timeout > 0 ? timeout / 1000.0 : DBL_MAX;
    NSDictionary *body = [query[@"data"] isKindOfClass:NSDictionary.class] ? query[@"data"] : @{};
    if ([body[@"string"] isKindOfClass:NSString.class]) {
      request.HTTPBody = [body[@"string"] dataUsingEncoding:NSUTF8StringEncoding];
    } else if ([body[@"base64"] isKindOfClass:NSString.class]) {
      request.HTTPBody = [[NSData alloc] initWithBase64EncodedString:body[@"base64"] options:0];
      if (!request.HTTPBody) {
        [self complete:requestID error:@"Invalid base64 request body" timeout:NO];
        return;
      }
    } else if (body[@"blob"]) {
      request.HTTPBody = [_blobStore resolve:body[@"blob"]];
      if (!request.HTTPBody) {
        [self complete:requestID error:@"Unable to resolve request blob" timeout:NO];
        return;
      }
      NSString *contentType = body[@"blob"][@"type"];
      if (contentType.length && ![request valueForHTTPHeaderField:@"Content-Type"]) {
        [request setValue:contentType forHTTPHeaderField:@"Content-Type"];
      }
    } else if (body[@"uri"] || body[@"formData"]) {
      [self complete:requestID error:@"Unsupported networking request body" timeout:NO];
      return;
    }
    OneMacosNetworkRequest *state = [OneMacosNetworkRequest new];
    state.requestID = requestID;
    state.responseType = type;
    state.incremental = [query[@"incrementalUpdates"] boolValue];
    state.data = [NSMutableData new];
    state.task = [_session dataTaskWithRequest:request];
    _requests[@(state.task.taskIdentifier)] = state;
    [state.task resume];
  }
}

- (void)abortRequest:(NSInteger)requestID
{
  @synchronized(self) {
    for (OneMacosNetworkRequest *state in _requests.allValues) {
      if (state.requestID == requestID) {
        [state.task cancel];
        return;
      }
    }
  }
}

- (BOOL)clearCookies
{
  NSHTTPCookieStorage *storage = NSHTTPCookieStorage.sharedHTTPCookieStorage;
  BOOL hadCookies = storage.cookies.count > 0;
  for (NSHTTPCookie *cookie in storage.cookies) [storage deleteCookie:cookie];
  return hadCookies;
}

- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)task
    didReceiveResponse:(NSURLResponse *)response completionHandler:(void (^)(NSURLSessionResponseDisposition))completionHandler
{
  @synchronized(self) {
    OneMacosNetworkRequest *state = _requests[@(task.taskIdentifier)];
    if (!state || !_emit) {
      completionHandler(NSURLSessionResponseCancel);
      return;
    }
    NSHTTPURLResponse *http = (NSHTTPURLResponse *)response;
    folly::dynamic headers = folly::dynamic::object();
    for (NSString *key in http.allHeaderFields) headers[key.UTF8String] = [http.allHeaderFields[key] description].UTF8String;
    _emit("didReceiveNetworkResponse", folly::dynamic::array(
        (double)state.requestID, (double)http.statusCode, std::move(headers), response.URL.absoluteString.UTF8String));
    completionHandler(NSURLSessionResponseAllow);
  }
}

- (NSString *)text:(NSData *)data response:(NSURLResponse *)response
{
  NSStringEncoding encoding = NSUTF8StringEncoding;
  if (response.textEncodingName) {
    CFStringEncoding converted = CFStringConvertIANACharSetNameToEncoding((__bridge CFStringRef)response.textEncodingName);
    if (converted != kCFStringEncodingInvalidId) encoding = CFStringConvertEncodingToNSStringEncoding(converted);
  }
  return [[NSString alloc] initWithData:data encoding:encoding];
}

- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)task didReceiveData:(NSData *)data
{
  @synchronized(self) {
    OneMacosNetworkRequest *state = _requests[@(task.taskIdentifier)];
    if (!state || !_emit) return;
    [state.data appendData:data];
    if (state.incremental && [state.responseType isEqualToString:@"text"]) {
      // hold incomplete encoded characters until the following packet arrives.
      NSData *pending = [state.data subdataWithRange:NSMakeRange(state.deliveredBytes, state.data.length - state.deliveredBytes)];
      NSString *text = [self text:pending response:task.response];
      NSUInteger decodedBytes = pending.length;
      // emit the complete prefix even when every packet ends inside a character.
      for (NSUInteger carry = 1; !text && carry <= 3 && carry < pending.length; carry++) {
        decodedBytes = pending.length - carry;
        text = [self text:[pending subdataWithRange:NSMakeRange(0, decodedBytes)] response:task.response];
      }
      if (text) {
        state.deliveredBytes += decodedBytes;
        _emit("didReceiveNetworkIncrementalData", folly::dynamic::array(
            (double)state.requestID, networkString(text), (double)state.deliveredBytes, (double)task.response.expectedContentLength));
      }
    } else if (state.incremental) {
      _emit("didReceiveNetworkDataProgress", folly::dynamic::array(
          (double)state.requestID, (double)state.data.length, (double)task.response.expectedContentLength));
    }
  }
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task
    didSendBodyData:(int64_t)bytesSent totalBytesSent:(int64_t)totalBytesSent totalBytesExpectedToSend:(int64_t)totalBytesExpectedToSend
{
  @synchronized(self) {
    OneMacosNetworkRequest *state = _requests[@(task.taskIdentifier)];
    if (state && _emit) _emit("didSendNetworkData", folly::dynamic::array(
        (double)state.requestID, (double)totalBytesSent, (double)totalBytesExpectedToSend));
  }
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error
{
  @synchronized(self) {
    OneMacosNetworkRequest *state = _requests[@(task.taskIdentifier)];
    if (!state || !_emit) return;
    NSString *text = nil;
    if ([state.responseType isEqualToString:@"blob"]) {
      NSString *identifier = NSUUID.UUID.UUIDString;
      [_blobStore store:state.data identifier:identifier];
      auto blob = folly::dynamic::object("blobId", identifier.UTF8String)("offset", 0)("size", (double)state.data.length)(
          "type", task.response.MIMEType ? task.response.MIMEType.UTF8String : "");
      _emit("didReceiveNetworkData", folly::dynamic::array((double)state.requestID, std::move(blob)));
    } else if (!(state.incremental && [state.responseType isEqualToString:@"text"])) {
      text = [state.responseType isEqualToString:@"base64"] ? [state.data base64EncodedStringWithOptions:0] : [self text:state.data response:task.response];
      if (text) _emit("didReceiveNetworkData", folly::dynamic::array((double)state.requestID, networkString(text)));
    }
    BOOL invalidText = !error && [state.responseType isEqualToString:@"text"] &&
        (state.incremental ? state.deliveredBytes != state.data.length : text == nil);
    [self complete:state.requestID error:invalidText ? @"Response text could not be decoded" : error.localizedDescription
          timeout:[error.domain isEqualToString:NSURLErrorDomain] && error.code == NSURLErrorTimedOut];
    [_requests removeObjectForKey:@(task.taskIdentifier)];
  }
}
@end

@implementation OneMacosNetworkDelegate
- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)task didReceiveResponse:(NSURLResponse *)response
    completionHandler:(void (^)(NSURLSessionResponseDisposition))completionHandler
{
  OneMacosNetworking *owner = self.owner;
  if (owner) [owner URLSession:session dataTask:task didReceiveResponse:response completionHandler:completionHandler];
  else completionHandler(NSURLSessionResponseCancel);
}
- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)task didReceiveData:(NSData *)data
{ [self.owner URLSession:session dataTask:task didReceiveData:data]; }
- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error
{ [self.owner URLSession:session task:task didCompleteWithError:error]; }
- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didSendBodyData:(int64_t)bytesSent
    totalBytesSent:(int64_t)sent totalBytesExpectedToSend:(int64_t)total
{ [self.owner URLSession:session task:task didSendBodyData:bytesSent totalBytesSent:sent totalBytesExpectedToSend:total]; }
@end
