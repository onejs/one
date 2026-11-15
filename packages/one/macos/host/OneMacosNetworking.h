#import <Foundation/Foundation.h>
#include <folly/dynamic.h>
#include <functional>
#import "OneMacosBlobStore.h"

@interface OneMacosNetworking : NSObject
- (instancetype)initWithEmitter:(std::function<void(const std::string &, folly::dynamic)>)emitter blobStore:(OneMacosBlobStore *)blobStore;
- (NSInteger)nextRequestID;
- (void)sendRequest:(NSDictionary *)query requestID:(NSInteger)requestID;
- (void)abortRequest:(NSInteger)requestID;
- (BOOL)clearCookies;
- (void)invalidate;
@end
