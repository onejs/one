#import <Foundation/Foundation.h>
#include <folly/dynamic.h>
#include <functional>

@interface OneMacosNetworking : NSObject
- (instancetype)initWithEmitter:(std::function<void(const std::string &, folly::dynamic)>)emitter;
- (NSInteger)nextRequestID;
- (void)sendRequest:(NSDictionary *)query requestID:(NSInteger)requestID;
- (void)abortRequest:(NSInteger)requestID;
- (BOOL)clearCookies;
- (void)invalidate;
@end
