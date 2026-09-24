#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(OneNativeAsyncActionModule, NSObject)
RCT_EXTERN_METHOD(complete:(NSString *)identifier)
@end
