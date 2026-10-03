#import <React/RCTBridgeModule.h>
#import <React/RCTConvert.h>
#import "One-Swift.h"

// the two react native modules One's fetch reads through: the blob store
// (Response.blob, Blob and FormData bodies) and networking, whose request
// handlers load FormData { uri } parts. modules reach each other only through
// the registry react native injects into a module, and a nitro object gets
// none, so js calls install once when it installs fetch. both are reached by
// name, without their headers, so the pod builds against prebuilt and source
// react native alike.
@protocol OneFetchNetworkTask <NSObject>
- (void)start;
@end

// the RCTNetworking methods RCTHTTPFormDataHelper loads a { uri } part with
@protocol OneFetchNetworking <NSObject>
@property (nonatomic, strong, readonly) dispatch_queue_t methodQueue;
- (BOOL)canHandleRequest:(NSURLRequest *)request;
- (id<OneFetchNetworkTask>)networkTaskWithRequest:(NSURLRequest *)request
                                  completionBlock:(void (^)(NSURLResponse *, NSData *, NSError *))completionBlock;
@end

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
  id<OneFetchNetworking> networking = [_moduleRegistry moduleForName:"Networking"];
  OneFetchBlobStore.loadURI = ^(NSString *uri, void (^done)(NSData *, NSString *, NSString *)) {
    // RCTHTTPFormDataHelper sends photo library uris through
    // RCTNetworkingPHUploadHackScheme, which hands over the original asset
    NSString *source = uri;
    if (uri.length >= 3 && [[uri substringToIndex:3] caseInsensitiveCompare:@"ph:"] == NSOrderedSame) {
      source = [@"ph-upload" stringByAppendingString:[uri substringFromIndex:2]];
    }
    NSURLRequest *request = [RCTConvert NSURLRequest:source];
    if (!networking || !request || ![networking canHandleRequest:request]) {
      done(nil, nil, [NSString stringWithFormat:@"fetch: no react native request handler reads FormData uri %@", uri]);
      return;
    }
    dispatch_async(networking.methodQueue, ^{
      id<OneFetchNetworkTask> task =
          [networking networkTaskWithRequest:request
                             completionBlock:^(NSURLResponse *response, NSData *data, NSError *error) {
                               if (error) {
                                 done(nil, nil, error.localizedDescription);
                               } else {
                                 done(data ?: [NSData data], response.MIMEType, nil);
                               }
                             }];
      [task start];
    });
  };
  return @(OneFetchBlobStore.manager != nil);
}

@end
