#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(OneNativeAsyncActionModule, NSObject)
RCT_EXTERN_METHOD(complete:(NSString *)identifier)
RCT_EXTERN_METHOD(completeString:(NSString *)identifier value:(NSString * _Nullable)value error:(NSString * _Nullable)error)
@end
