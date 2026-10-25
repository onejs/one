#import <Foundation/Foundation.h>

#include <folly/dynamic.h>

#include <functional>

NS_ASSUME_NONNULL_BEGIN

// NSURLSessionWebSocketTask behind the event names RN's WebSocket.js expects.
@interface OneMacosWebSocketManager : NSObject

- (instancetype)initWithEmitter:(std::function<void(const std::string &, folly::dynamic)>)emitter;

- (void)connect:(NSURL *)url protocols:(nullable NSArray<NSString *> *)protocols socketID:(NSInteger)socketID;
- (void)sendText:(NSString *)text socketID:(NSInteger)socketID;
- (void)sendBase64:(NSString *)base64 socketID:(NSInteger)socketID;
- (void)ping:(NSInteger)socketID;
- (void)close:(NSInteger)socketID code:(NSInteger)code reason:(nullable NSString *)reason;

@end

NS_ASSUME_NONNULL_END
