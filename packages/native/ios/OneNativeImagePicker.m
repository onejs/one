#import "OneNativeImagePicker.h"

#import <AVFoundation/AVFoundation.h>
#import <ImageIO/ImageIO.h>
#import <PhotosUI/PhotosUI.h>
#import <React/RCTUtils.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

static NSString *const OneNativeImagePickerFailed = @"E_IMAGE_PICKER_FAILED";

@interface OneNativeImagePicker () <PHPickerViewControllerDelegate, UIImagePickerControllerDelegate,
    UINavigationControllerDelegate, UIAdaptivePresentationControllerDelegate>

@property (nonatomic, copy, nullable) RCTPromiseResolveBlock pendingResolve;
@property (nonatomic, copy, nullable) RCTPromiseRejectBlock pendingReject;
// set on launch, read by the delegate; one request is in flight at a time.
@property (nonatomic, assign) BOOL allowsImages;
@property (nonatomic, assign) BOOL allowsVideos;

@end

@implementation OneNativeImagePicker

RCT_EXPORT_MODULE()

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

#pragma mark - entry points

RCT_EXPORT_METHOD(launchLibrary:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  if (![self takePendingWithVerb:@"launchLibrary" resolve:resolve reject:reject]) {
    return;
  }
  NSArray *mediaTypes = options[@"mediaTypes"];
  BOOL allowsImages = [mediaTypes containsObject:@"images"];
  BOOL allowsVideos = [mediaTypes containsObject:@"videos"];
  if (!allowsImages && !allowsVideos) {
    // unreachable from the js entries, which validate first; settle rather
    // than hang a direct caller.
    [self rejectPendingWithVerb:@"launchLibrary"
                        message:@"mediaTypes must list at least one media type"];
    return;
  }
  UIViewController *presenter = [self topViewController];
  if (presenter == nil || presenter.presentedViewController != nil) {
    [self rejectPendingWithVerb:@"launchLibrary"
                        message:@"found no view controller to present from"];
    return;
  }
  PHPickerConfiguration *config = [[PHPickerConfiguration alloc] init];
  if (allowsImages && allowsVideos) {
    config.filter = [PHPickerFilter
        anyFilterMatchingSubfilters:@[ PHPickerFilter.imagesFilter, PHPickerFilter.videosFilter ]];
  } else if (allowsVideos) {
    config.filter = PHPickerFilter.videosFilter;
  } else {
    config.filter = PHPickerFilter.imagesFilter;
  }
  // zero is unlimited on both sides of the bridge, so the value passes through.
  config.selectionLimit = [options[@"selectionLimit"] integerValue];
  config.selection = PHPickerConfigurationSelectionOrdered;
  PHPickerViewController *picker = [[PHPickerViewController alloc] initWithConfiguration:config];
  picker.delegate = self;
  picker.presentationController.delegate = self;
  picker.modalPresentationStyle = UIModalPresentationAutomatic;
  self.allowsImages = allowsImages;
  self.allowsVideos = allowsVideos;
  [presenter presentViewController:picker animated:YES completion:nil];
}

RCT_EXPORT_METHOD(launchCamera:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  if (![self takePendingWithVerb:@"launchCamera" resolve:resolve reject:reject]) {
    return;
  }
  // refusing and missing hardware are ordinary outcomes: both resolve
  // canceled, like backing out of the picker.
  if (![UIImagePickerController
          isSourceTypeAvailable:UIImagePickerControllerSourceTypeCamera]) {
    [self resolvePendingCanceled];
    return;
  }
  // without the key the os kills the app on first camera access, so the
  // missing manifest entry is a rejection naming the fix, not a crash.
  if ([NSBundle.mainBundle objectForInfoDictionaryKey:@"NSCameraUsageDescription"] == nil) {
    [self rejectPendingWithVerb:@"launchCamera"
                        message:@"camera needs NSCameraUsageDescription: set native.app "
                                @"imagePicker.camera and rerun one prebuild"];
    return;
  }
  AVAuthorizationStatus status =
      [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  if (status == AVAuthorizationStatusDenied || status == AVAuthorizationStatusRestricted) {
    [self resolvePendingCanceled];
    return;
  }
  if (status == AVAuthorizationStatusNotDetermined) {
    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo
                             completionHandler:^(BOOL granted) {
                               dispatch_async(dispatch_get_main_queue(), ^{
                                 if (granted) {
                                   [self presentCamera];
                                 } else {
                                   [self resolvePendingCanceled];
                                 }
                               });
                             }];
    return;
  }
  [self presentCamera];
}

RCT_EXPORT_METHOD(getCameraPermissions:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  // a read, never a prompt; outside the pending slot so it answers during a pick.
  resolve([self cameraPermissionResponse]);
}

RCT_EXPORT_METHOD(requestCameraPermissions:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  if ([NSBundle.mainBundle objectForInfoDictionaryKey:@"NSCameraUsageDescription"] == nil) {
    reject(OneNativeImagePickerFailed,
           @"ImagePicker.requestCameraPermissions: camera needs "
           @"NSCameraUsageDescription: set native.app imagePicker.camera and rerun one prebuild",
           nil);
    return;
  }
  AVAuthorizationStatus status =
      [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  if (status != AVAuthorizationStatusNotDetermined) {
    resolve([self cameraPermissionResponse]);
    return;
  }
  [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo
                           completionHandler:^(BOOL _) {
                             dispatch_async(dispatch_get_main_queue(), ^{
                               resolve([self cameraPermissionResponse]);
                             });
                           }];
}

- (NSDictionary *)cameraPermissionResponse
{
  AVAuthorizationStatus status =
      [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  NSString *permission;
  BOOL granted = NO;
  BOOL canAskAgain = NO;
  switch (status) {
    case AVAuthorizationStatusAuthorized:
      permission = @"granted";
      granted = YES;
      canAskAgain = YES;
      break;
    case AVAuthorizationStatusNotDetermined:
      permission = @"undetermined";
      canAskAgain = YES;
      break;
    case AVAuthorizationStatusDenied:
    case AVAuthorizationStatusRestricted:
      permission = @"denied";
      break;
  }
  return @{@"status" : permission, @"granted" : @(granted), @"canAskAgain" : @(canAskAgain)};
}

#pragma mark - camera

- (void)presentCamera
{
  UIViewController *presenter = [self topViewController];
  if (presenter == nil || presenter.presentedViewController != nil) {
    [self rejectPendingWithVerb:@"launchCamera"
                        message:@"found no view controller to present from"];
    return;
  }
  UIImagePickerController *picker = [[UIImagePickerController alloc] init];
  picker.sourceType = UIImagePickerControllerSourceTypeCamera;
  picker.mediaTypes = @[ UTTypeImage.identifier ];
  picker.delegate = self;
  picker.presentationController.delegate = self;
  [presenter presentViewController:picker animated:YES completion:nil];
}

- (void)imagePickerController:(UIImagePickerController *)picker
    didFinishPickingMediaWithInfo:(NSDictionary<NSString *, id> *)info
{
  UIImage *image = info[UIImagePickerControllerOriginalImage];
  [picker dismissViewControllerAnimated:YES
                             completion:^{
                               if (image == nil || image.CGImage == NULL) {
                                 [self rejectPendingWithVerb:@"launchCamera"
                                                     message:@"the camera returned no image"];
                                 return;
                               }
                               NSData *data = UIImageJPEGRepresentation(image, 1.0);
                               if (data == nil) {
                                 [self rejectPendingWithVerb:@"launchCamera"
                                                     message:@"could not encode the photo"];
                                 return;
                               }
                               NSURL *destination = [self cacheURLWithPrefix:@"IMG"
                                                                   extension:@"jpg"];
                               NSError *error = nil;
                               if (destination == nil ||
                                   ![data writeToURL:destination
                                             options:NSDataWritingAtomic
                                               error:&error]) {
                                 [self rejectPendingWithVerb:@"launchCamera"
                                                     message:error.localizedDescription
                                                             ?: @"could not save the photo"];
                                 return;
                               }
                               [self resolvePendingWithAssets:@[ @{
                                 @"uri" : destination.absoluteString,
                                 @"width" : @(CGImageGetWidth(image.CGImage)),
                                 @"height" : @(CGImageGetHeight(image.CGImage)),
                                 @"mimeType" : @"image/jpeg",
                                 @"fileName" : destination.lastPathComponent,
                                 @"fileSize" : @(data.length),
                               } ]];
                             }];
}

- (void)imagePickerControllerDidCancel:(UIImagePickerController *)picker
{
  [picker dismissViewControllerAnimated:YES
                             completion:^{
                               [self resolvePendingCanceled];
                             }];
}

#pragma mark - interactive dismiss

// swiping a sheet down bypasses both picker delegates, so without this the
// promise would hang. settling is idempotent: whichever delegate fires
// first wins and the other is a no-op.
- (void)presentationControllerDidDismiss:(UIPresentationController *)presentationController
{
  [self resolvePendingCanceled];
}

#pragma mark - library

- (void)picker:(PHPickerViewController *)picker
    didFinishPicking:(NSArray<PHPickerResult *> *)results
{
  BOOL allowsImages = self.allowsImages;
  BOOL allowsVideos = self.allowsVideos;
  // dismiss first: loading file representations can take a while and the
  // picker staying up meanwhile reads as a hang.
  [picker dismissViewControllerAnimated:YES
                             completion:^{
                               if (results.count == 0) {
                                 [self resolvePendingCanceled];
                                 return;
                               }
                               [self loadResults:results
                                    allowsImages:allowsImages
                                    allowsVideos:allowsVideos];
                             }];
}

// one group entry per item; a video item leaves from its track callback.
// the assets array is indexed, so ordered selection order survives the
// out-of-order completions. the first failure rejects the whole call.
- (void)loadResults:(NSArray<PHPickerResult *> *)results
       allowsImages:(BOOL)allowsImages
       allowsVideos:(BOOL)allowsVideos
{
  NSMutableArray *assets = [NSMutableArray arrayWithCapacity:results.count];
  for (NSUInteger index = 0; index < results.count; index++) {
    [assets addObject:[NSNull null]];
  }
  dispatch_group_t group = dispatch_group_create();
  // written from completion queues under the group, read on notify.
  __block NSString *failure = nil;
  [results enumerateObjectsUsingBlock:^(PHPickerResult *result, NSUInteger index, BOOL *stop) {
    NSString *chosen = [self typeIdentifierForProvider:result.itemProvider
                                          allowsImages:allowsImages
                                          allowsVideos:allowsVideos];
    if (chosen == nil) {
      @synchronized(assets) {
        if (failure == nil) {
          failure = @"picked an item of an unsupported type";
        }
      }
      return;
    }
    dispatch_group_enter(group);
    [result.itemProvider loadFileRepresentationForTypeIdentifier:chosen
                                               completionHandler:^(NSURL *url, NSError *error) {
                                                 [self finishItemAtURL:url
                                                                 error:error
                                                          utiIdentifier:chosen
                                                                assets:assets
                                                                 index:index
                                                               failure:&failure
                                                                 group:group];
                                               }];
  }];
  // every item rejected up front leaves the group empty and still notifies.
  dispatch_group_notify(group, dispatch_get_main_queue(), ^{
    if (failure != nil || [assets containsObject:[NSNull null]]) {
      [self rejectPendingWithVerb:@"launchLibrary"
                          message:failure ?: @"could not load a picked item"];
      return;
    }
    [self resolvePendingWithAssets:assets];
  });
}

- (nullable NSString *)typeIdentifierForProvider:(NSItemProvider *)provider
                                    allowsImages:(BOOL)allowsImages
                                    allowsVideos:(BOOL)allowsVideos
{
  for (NSString *identifier in provider.registeredTypeIdentifiers) {
    UTType *type = [UTType typeWithIdentifier:identifier];
    if (type == nil) {
      continue;
    }
    if (allowsImages && [type conformsToType:UTTypeImage]) {
      return identifier;
    }
    if (allowsVideos && [type conformsToType:UTTypeMovie]) {
      return identifier;
    }
  }
  return nil;
}

- (void)finishItemAtURL:(nullable NSURL *)url
                  error:(nullable NSError *)error
          utiIdentifier:(NSString *)chosen
                 assets:(NSMutableArray *)assets
                  index:(NSUInteger)index
                failure:(NSString *_Nullable *_Nonnull)failure
                  group:(dispatch_group_t)group
{
  if (url == nil) {
    @synchronized(assets) {
      if (*failure == nil) {
        *failure = error.localizedDescription ?: @"could not load a picked item";
      }
    }
    dispatch_group_leave(group);
    return;
  }
  UTType *type = [UTType typeWithIdentifier:chosen];
  BOOL isVideo = type != nil && [type conformsToType:UTTypeMovie];
  NSString *extension = type.preferredFilenameExtension ?: url.pathExtension;
  if (extension.length == 0) {
    extension = @"dat";
  }
  NSURL *destination = [self cacheURLWithPrefix:isVideo ? @"VID" : @"IMG" extension:extension];
  NSError *copyError = nil;
  BOOL scoped = [url startAccessingSecurityScopedResource];
  if (destination != nil) {
    [[NSFileManager defaultManager] copyItemAtURL:url toURL:destination error:&copyError];
  }
  if (scoped) {
    [url stopAccessingSecurityScopedResource];
  }
  if (destination == nil || copyError != nil) {
    @synchronized(assets) {
      if (*failure == nil) {
        *failure = copyError.localizedDescription ?: @"could not copy a picked item";
      }
    }
    dispatch_group_leave(group);
    return;
  }
  NSMutableDictionary *asset = [@{
    @"uri" : destination.absoluteString,
    @"fileName" : destination.lastPathComponent,
  } mutableCopy];
  NSString *mimeType = type.preferredMIMEType;
  if (mimeType != nil) {
    asset[@"mimeType"] = mimeType;
  }
  NSNumber *fileSize = [self fileSizeAtURL:destination];
  if (fileSize != nil) {
    asset[@"fileSize"] = fileSize;
  }
  if (!isVideo) {
    CGSize size = [self imageSizeAtURL:destination];
    asset[@"width"] = @(size.width);
    asset[@"height"] = @(size.height);
    @synchronized(assets) {
      assets[index] = asset;
    }
    dispatch_group_leave(group);
    return;
  }
  AVURLAsset *media = [AVURLAsset URLAssetWithURL:destination options:nil];
  [media loadTracksWithMediaType:AVMediaTypeVideo
               completionHandler:^(NSArray<AVAssetTrack *> *_Nullable tracks, NSError *_Nullable _) {
                 CGSize size = CGSizeZero;
                 if (tracks.count > 0) {
                   // naturalSize is the encoded size; rotation handling
                   // stays out of this small api.
                   size = tracks.firstObject.naturalSize;
                 }
                 asset[@"width"] = @(size.width);
                 asset[@"height"] = @(size.height);
                 @synchronized(assets) {
                   assets[index] = asset;
                 }
                 dispatch_group_leave(group);
               }];
}

#pragma mark - files

- (nullable NSURL *)cacheURLWithPrefix:(NSString *)prefix extension:(NSString *)extension
{
  NSFileManager *files = [NSFileManager defaultManager];
  NSURL *cache = [[files URLsForDirectory:NSCachesDirectory inDomains:NSUserDomainMask] firstObject];
  if (cache == nil) {
    return nil;
  }
  NSURL *directory = [cache URLByAppendingPathComponent:@"one-native-image-picker"
                                            isDirectory:YES];
  NSError *error = nil;
  if (![files createDirectoryAtURL:directory
          withIntermediateDirectories:YES
                           attributes:nil
                                error:&error]) {
    return nil;
  }
  NSString *name = [NSString
      stringWithFormat:@"%@_%@.%@", prefix, [NSUUID UUID].UUIDString, extension];
  return [directory URLByAppendingPathComponent:name];
}

- (nullable NSNumber *)fileSizeAtURL:(NSURL *)url
{
  NSError *error = nil;
  NSDictionary *attributes =
      [[NSFileManager defaultManager] attributesOfItemAtPath:url.path error:&error];
  if (attributes == nil) {
    return nil;
  }
  return attributes[NSFileSize];
}

- (CGSize)imageSizeAtURL:(NSURL *)url
{
  CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)url, NULL);
  if (source == NULL) {
    return CGSizeZero;
  }
  NSDictionary *properties = (__bridge_transfer NSDictionary *)
      CGImageSourceCopyPropertiesAtIndex(source, 0, NULL);
  CFRelease(source);
  if (![properties isKindOfClass:[NSDictionary class]]) {
    return CGSizeZero;
  }
  return CGSizeMake(
      [properties[(__bridge NSString *)kCGImagePropertyPixelWidth] doubleValue],
      [properties[(__bridge NSString *)kCGImagePropertyPixelHeight] doubleValue]);
}

#pragma mark - promise plumbing

// one launch in flight: the js entries throw before a second launch, so
// this only settles direct callers instead of clobbering the pending promise.
- (BOOL)takePendingWithVerb:(NSString *)verb
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject
{
  if (self.pendingResolve != nil) {
    reject(OneNativeImagePickerFailed,
           [NSString stringWithFormat:@"ImagePicker.%@: another request is already in flight", verb],
           nil);
    return NO;
  }
  self.pendingResolve = resolve;
  self.pendingReject = reject;
  return YES;
}

- (void)resolvePendingWithAssets:(NSArray<NSDictionary *> *)assets
{
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  self.pendingResolve = nil;
  self.pendingReject = nil;
  if (resolve != nil) {
    resolve(@{@"canceled" : @NO, @"assets" : assets});
  }
}

- (void)resolvePendingCanceled
{
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  self.pendingResolve = nil;
  self.pendingReject = nil;
  if (resolve != nil) {
    resolve(@{@"canceled" : @YES, @"assets" : [NSNull null]});
  }
}

- (void)rejectPendingWithVerb:(NSString *)verb message:(NSString *)message
{
  RCTPromiseRejectBlock reject = self.pendingReject;
  self.pendingResolve = nil;
  self.pendingReject = nil;
  if (reject != nil) {
    reject(OneNativeImagePickerFailed,
           [NSString stringWithFormat:@"ImagePicker.%@: %@", verb, message],
           nil);
  }
}

- (nullable UIViewController *)topViewController
{
  UIViewController *top = RCTKeyWindow().rootViewController;
  while (top.presentedViewController != nil) {
    top = top.presentedViewController;
  }
  return top;
}

@end
