#import <AppKit/AppKit.h>

#include <react/renderer/imagemanager/ImageManager.h>
#include <react/renderer/imagemanager/ImageResponse.h>
#include <react/renderer/imagemanager/ImageTelemetry.h>

using namespace facebook::react;

// The host's ImageManager: loads http(s), file and data URIs through
// NSURLSession and hands the decoded NSImage to the request's observers. The
// cxx stub that ships with react-native is left out of the core build.

ImageManager::ImageManager(const std::shared_ptr<const ContextContainer> &) {}

ImageManager::~ImageManager() {}

ImageRequest ImageManager::requestImage(
    const ImageSource &imageSource, SurfaceId surfaceId, const ImageRequestParams &, Tag) const
{
  auto telemetry = std::make_shared<ImageTelemetry>(surfaceId);
  if (imageSource.type == ImageSource::Type::Invalid || imageSource.uri.empty()) {
    return {imageSource, telemetry, {}};
  }

  // the coordinator is created by the request, so the load closures reach it
  // through a slot filled right after
  auto coordinatorSlot = std::make_shared<std::weak_ptr<const ImageResponseObserverCoordinator>>();
  auto task = std::make_shared<NSURLSessionDataTask *__strong>(nil);
  NSURL *url = [NSURL URLWithString:[NSString stringWithUTF8String:imageSource.uri.c_str()]];
  NSMutableURLRequest *urlRequest = url ? [NSMutableURLRequest requestWithURL:url] : nil;
  if (urlRequest) {
    if (!imageSource.method.empty()) {
      urlRequest.HTTPMethod = [NSString stringWithUTF8String:imageSource.method.c_str()];
    }
    for (const auto &header : imageSource.headers) {
      [urlRequest setValue:[NSString stringWithUTF8String:header.second.c_str()]
          forHTTPHeaderField:[NSString stringWithUTF8String:header.first.c_str()]];
    }
  }

  // the coordinator starts out loading, so the request starts now; resume only
  // restarts one that was cancelled
  auto start = [=] {
    auto coordinator = coordinatorSlot->lock();
    if (!coordinator || *task) {
      return;
    }
    auto fail = [coordinator](const std::string &message) {
      auto error = std::make_shared<std::string>(message);
      coordinator->nativeImageResponseFailed(ImageLoadError(error));
    };
    if (!urlRequest) {
      fail("invalid image uri");
      return;
    }
    *task = [NSURLSession.sharedSession
        dataTaskWithRequest:urlRequest
          completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            if (error.code == NSURLErrorCancelled) {
              return;
            }
            NSImage *image = data ? [[NSImage alloc] initWithData:data] : nil;
            if (!image) {
              fail(error ? error.localizedDescription.UTF8String : "image could not be decoded");
              return;
            }
            // keep the pixel size, which is what scale-aware layout wants
            NSBitmapImageRep *rep = [image.representations.firstObject isKindOfClass:NSBitmapImageRep.class]
                ? (NSBitmapImageRep *)image.representations.firstObject
                : nil;
            if (rep) {
              image.size = NSMakeSize(rep.pixelsWide, rep.pixelsHigh);
            }
            std::shared_ptr<void> holder((void *)CFBridgingRetain(image), [](void *pointer) { CFRelease(pointer); });
            coordinator->nativeImageResponseComplete(ImageResponse(holder, nullptr));
          }];
    [*task resume];
  };
  SharedFunction<> resume(start);
  SharedFunction<> cancel([=] {
    if (*task) {
      [*task cancel];
      *task = nil;
    }
  });

  ImageRequest request(imageSource, telemetry, std::move(resume), std::move(cancel));
  *coordinatorSlot = request.getSharedObserverCoordinator();
  start();
  return request;
}
