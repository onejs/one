#import <React/RCTBridgeModule.h>
#import "One-Swift.h"

// hands react native's blob store to One's fetch (Response.blob, Blob and
// FormData bodies). modules reach each other only through the registry react
// native injects into a module, and a nitro object gets none, so js calls
// install once when it installs fetch.
@interface OneFetchBlobStoreModule : NSObject <RCTBridgeModule>
@end

@implementation OneFetchBlobStoreModule

@synthesize moduleRegistry = _moduleRegistry;

RCT_EXPORT_MODULE(OneFetchBlobStore)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(install)
{
  OneFetchBlobStore.manager = [_moduleRegistry moduleForName:"BlobModule"];
  return @(OneFetchBlobStore.manager != nil);
}

@end
