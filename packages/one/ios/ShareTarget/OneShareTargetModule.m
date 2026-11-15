#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(OneShareTargetModule, NSObject)

RCT_EXTERN_METHOD(getDrafts:(NSString *)appGroup
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(discardDraft:(NSString *)appGroup
                  submissionId:(NSString *)submissionId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
