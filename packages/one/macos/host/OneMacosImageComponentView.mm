#import "OneMacosImageComponentView.h"

#include <react/renderer/components/image/ImageEventEmitter.h>
#include <react/renderer/components/image/ImageProps.h>
#include <react/renderer/components/image/ImageShadowNode.h>
#include <react/renderer/imagemanager/ImageResponseObserver.h>

#import "OneMacosText.h"

using namespace facebook::react;

@class OneMacosImageComponentView;

namespace {

// observers are called from any thread; the view applies them on the main one
class ImageObserver final : public ImageResponseObserver {
 public:
  explicit ImageObserver(OneMacosImageComponentView *view) : view_(view) {}
  void didReceiveProgress(float progress, int64_t loaded, int64_t total) const override;
  void didReceiveImage(const ImageResponse &imageResponse) const override;
  void didReceiveFailure(const ImageLoadError &error) const override;

 private:
  __weak OneMacosImageComponentView *view_;
};

} // namespace

@interface OneMacosImageComponentView ()
- (void)applyImage:(NSImage *)image;
- (void)applyProgress:(float)progress loaded:(int64_t)loaded total:(int64_t)total;
- (void)applyFailure:(NSString *)message;
@end

void ImageObserver::didReceiveProgress(float progress, int64_t loaded, int64_t total) const
{
  OneMacosImageComponentView *view = view_;
  dispatch_async(dispatch_get_main_queue(), ^{
    [view applyProgress:progress loaded:loaded total:total];
  });
}

void ImageObserver::didReceiveImage(const ImageResponse &imageResponse) const
{
  OneMacosImageComponentView *view = view_;
  auto holder = imageResponse.getImage();
  dispatch_async(dispatch_get_main_queue(), ^{
    [view applyImage:(__bridge NSImage *)holder.get()];
  });
}

void ImageObserver::didReceiveFailure(const ImageLoadError &error) const
{
  OneMacosImageComponentView *view = view_;
  auto message = std::static_pointer_cast<std::string>(error.getError());
  NSString *text = [NSString stringWithUTF8String:message ? message->c_str() : "image failed to load"];
  dispatch_async(dispatch_get_main_queue(), ^{
    [view applyFailure:text];
  });
}

@implementation OneMacosImageComponentView {
  ImageShadowNode::ConcreteState::Shared _state;
  std::shared_ptr<const ImageObserver> _observer;
  std::shared_ptr<const ImageResponseObserverCoordinator> _coordinator;
  NSImage *_image;
  NSImage *_tintedImage;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _observer = std::make_shared<const ImageObserver>(self);
  }
  return self;
}

- (void)dealloc
{
  if (_coordinator) {
    _coordinator->removeObserver(_observer);
  }
}

- (std::shared_ptr<const ImageEventEmitter>)imageEmitter
{
  return std::static_pointer_cast<const ImageEventEmitter>(self.eventEmitter);
}

#pragma mark - Updates

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  _tintedImage = nil;
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  auto newState = std::static_pointer_cast<const ImageShadowNode::ConcreteState>(state);
  auto oldImageState = std::static_pointer_cast<const ImageShadowNode::ConcreteState>(oldState);
  BOOL sourceChanged = !oldImageState || oldImageState->getData().getImageSource() != newState->getData().getImageSource();
  _state = newState;
  if (!sourceChanged) {
    return;
  }
  if (_coordinator) {
    _coordinator->removeObserver(_observer);
  }
  _image = nil;
  _tintedImage = nil;
  [self setNeedsRender];

  const auto &request = _state->getData().getImageRequest();
  _coordinator = request.getSharedObserverCoordinator();
  if (auto emitter = [self imageEmitter]) {
    emitter->onLoadStart();
  }
  _coordinator->addObserver(_observer);
}

#pragma mark - Observer callbacks

- (void)applyImage:(NSImage *)image
{
  _image = image;
  _tintedImage = nil;
  [self setNeedsRender];
  if (auto emitter = [self imageEmitter]) {
    ImageSource source = _state ? _state->getData().getImageSource() : ImageSource{};
    CGFloat scale = source.scale > 0 ? source.scale : 1;
    source.size = {(Float)(image.size.width / scale), (Float)(image.size.height / scale)};
    emitter->onLoad(source);
    emitter->onLoadEnd();
  }
}

- (void)applyProgress:(float)progress loaded:(int64_t)loaded total:(int64_t)total
{
  if (auto emitter = [self imageEmitter]) {
    emitter->onProgress(progress, loaded, total);
  }
}

- (void)applyFailure:(NSString *)message
{
  if (auto emitter = [self imageEmitter]) {
    ImageErrorInfo info;
    info.error = message.UTF8String;
    emitter->onError(info);
    emitter->onLoadEnd();
  }
}

#pragma mark - Painting

- (NSImage *)paintedImage
{
  const auto &imageProps = static_cast<const ImageProps &>(*self.props);
  if (!imageProps.tintColor || !*imageProps.tintColor) {
    return _image;
  }
  if (!_tintedImage) {
    NSColor *tint = OneMacosColorFromSharedColor(*imageProps.tintColor);
    NSImage *source = _image;
    _tintedImage = [NSImage imageWithSize:source.size
                                  flipped:NO
                           drawingHandler:^BOOL(NSRect rect) {
                             [source drawInRect:rect];
                             [tint set];
                             NSRectFillUsingOperation(rect, NSCompositingOperationSourceIn);
                             return YES;
                           }];
  }
  return _tintedImage;
}

- (void)drawRect:(NSRect)dirtyRect
{
  [super drawRect:dirtyRect];
  if (!_image || !self.props) {
    return;
  }
  const auto &imageProps = static_cast<const ImageProps &>(*self.props);
  NSImage *image = [self paintedImage];
  NSSize natural = image.size;
  CGFloat scale = _state && _state->getData().getImageSource().scale > 0 ? _state->getData().getImageSource().scale : 1;
  NSSize size = NSMakeSize(natural.width / scale, natural.height / scale);
  NSRect bounds = self.bounds;
  if (size.width <= 0 || size.height <= 0 || bounds.size.width <= 0 || bounds.size.height <= 0) {
    return;
  }

  const auto border = imageProps.resolveBorderMetrics(self.layoutMetrics);
  CGFloat radius = MIN((CGFloat)border.borderRadii.topLeft.horizontal, MIN(bounds.size.width, bounds.size.height) / 2);
  [NSGraphicsContext saveGraphicsState];
  [[NSBezierPath bezierPathWithRoundedRect:bounds xRadius:radius yRadius:radius] addClip];

  NSRect target = bounds;
  switch (imageProps.resizeMode) {
    case ImageResizeMode::Cover: {
      CGFloat factor = MAX(bounds.size.width / size.width, bounds.size.height / size.height);
      target = NSMakeRect(0, 0, size.width * factor, size.height * factor);
      target.origin = NSMakePoint((bounds.size.width - target.size.width) / 2, (bounds.size.height - target.size.height) / 2);
      break;
    }
    case ImageResizeMode::Contain: {
      CGFloat factor = MIN(bounds.size.width / size.width, bounds.size.height / size.height);
      target = NSMakeRect(0, 0, size.width * factor, size.height * factor);
      target.origin = NSMakePoint((bounds.size.width - target.size.width) / 2, (bounds.size.height - target.size.height) / 2);
      break;
    }
    case ImageResizeMode::Center:
      target = NSMakeRect((bounds.size.width - size.width) / 2, (bounds.size.height - size.height) / 2, size.width, size.height);
      break;
    case ImageResizeMode::None:
      target = NSMakeRect(0, 0, size.width, size.height);
      break;
    case ImageResizeMode::Repeat:
      for (CGFloat y = 0; y < bounds.size.height; y += size.height) {
        for (CGFloat x = 0; x < bounds.size.width; x += size.width) {
          [image drawInRect:NSMakeRect(x, y, size.width, size.height)
                   fromRect:NSZeroRect
                  operation:NSCompositingOperationSourceOver
                   fraction:1
             respectFlipped:YES
                      hints:nil];
        }
      }
      [NSGraphicsContext restoreGraphicsState];
      return;
    case ImageResizeMode::Stretch:
      break;
  }
  [image drawInRect:target
           fromRect:NSZeroRect
          operation:NSCompositingOperationSourceOver
           fraction:1
     respectFlipped:YES
              hints:nil];
  [NSGraphicsContext restoreGraphicsState];
}

@end
