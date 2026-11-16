// This guard prevent the code from being compiled in the old architecture
#import "OneKeyboardControllerViewComponentView.h"
#import "OneKCFocusedInputLayoutChangedEvent.h"
#import "OneKCFocusedInputSelectionChangedEvent.h"
#import "OneKCFocusedInputTextChangedEvent.h"
#import "OneKCKeyboardMoveEvent.h"

#import "One-Swift.h"

#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>

#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface OneKeyboardControllerViewComponentView () <RCTOneKeyboardControllerViewViewProtocol>

@end

@implementation OneKeyboardControllerViewComponentView {
  OneKCKeyboardMovementObserver *keyboardObserver;
  OneKCFocusedInputObserver *inputObserver;

  CGSize _lastScreenSize;
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTOneKeyboardControllerViewHandleCommand(self, commandName, args);
}

- (void)synchronizeFocusedInputLayout
{
  [inputObserver syncUpLayout];
  [OneKCBridge emit:@"KeyboardController::layoutDidSynchronize" body:nil];
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneKeyboardControllerViewComponentDescriptor>();
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const OneKeyboardControllerViewProps>();
    _props = defaultProps;

    inputObserver = [[OneKCFocusedInputObserver alloc]
        initOnLayoutChangedHandler:^(NSDictionary *event) {
          if (self->_eventEmitter) {
            int target = [event[@"target"] integerValue];
            int parentScrollViewTarget = [event[@"parentScrollViewTarget"] integerValue];
            double absoluteY = [event[@"layout"][@"absoluteY"] doubleValue];
            double absoluteX = [event[@"layout"][@"absoluteX"] doubleValue];
            double contentY = [event[@"layout"][@"contentY"] doubleValue];
            double contentX = [event[@"layout"][@"contentX"] doubleValue];
            double y = [event[@"layout"][@"y"] doubleValue];
            double x = [event[@"layout"][@"x"] doubleValue];
            double width = [event[@"layout"][@"width"] doubleValue];
            double height = [event[@"layout"][@"height"] doubleValue];

            std::dynamic_pointer_cast<const facebook::react::OneKeyboardControllerViewEventEmitter>(
                self->_eventEmitter)
                ->onFocusedInputLayoutChanged(
                    facebook::react::OneKeyboardControllerViewEventEmitter::
                        OnFocusedInputLayoutChanged{
                            .target = target,
                            .parentScrollViewTarget = parentScrollViewTarget,
                            .layout = facebook::react::OneKeyboardControllerViewEventEmitter::
                                OnFocusedInputLayoutChangedLayout{
                                    .x = x,
                                    .y = y,
                                    .width = width,
                                    .height = height,
                                    .absoluteX = absoluteX,
                                    .absoluteY = absoluteY,
                                    .contentX = contentX,
                                    .contentY = contentY}});

            OneKCFocusedInputLayoutChangedEvent *inputChangedEvent =
                [[OneKCFocusedInputLayoutChangedEvent alloc] initWithReactTag:@(self.tag) event:event];
            [self postNotificationForEventDispatcherObserversWithEvent:inputChangedEvent];
          }
        }
        onTextChangedHandler:^(NSString *text) {
          if (self->_eventEmitter) {
            std::dynamic_pointer_cast<const facebook::react::OneKeyboardControllerViewEventEmitter>(
                self->_eventEmitter)
                ->onFocusedInputTextChanged(
                    facebook::react::OneKeyboardControllerViewEventEmitter::OnFocusedInputTextChanged{
                        .text = std::string([text UTF8String] ?: "")});

            OneKCFocusedInputTextChangedEvent *textChangedEvent =
                [[OneKCFocusedInputTextChangedEvent alloc] initWithReactTag:@(self.tag) text:text];
            [self postNotificationForEventDispatcherObserversWithEvent:textChangedEvent];
          }
        }
        onSelectionChangedHandler:^(NSDictionary *event) {
          if (self->_eventEmitter) {
            int target = [event[@"target"] integerValue];
            double startX = [event[@"selection"][@"start"][@"x"] doubleValue];
            double startY = [event[@"selection"][@"start"][@"y"] doubleValue];
            double endX = [event[@"selection"][@"end"][@"x"] doubleValue];
            double endY = [event[@"selection"][@"end"][@"y"] doubleValue];
            int start = [event[@"selection"][@"start"][@"position"] integerValue];
            int end = [event[@"selection"][@"end"][@"position"] integerValue];

            std::dynamic_pointer_cast<const facebook::react::OneKeyboardControllerViewEventEmitter>(
                self->_eventEmitter)
                ->onFocusedInputSelectionChanged(
                    facebook::react::OneKeyboardControllerViewEventEmitter::
                        OnFocusedInputSelectionChanged{
                            .target = target,
                            .selection = facebook::react::OneKeyboardControllerViewEventEmitter::
                                OnFocusedInputSelectionChangedSelection{
                                    .start =
                                        facebook::react::OneKeyboardControllerViewEventEmitter::
                                            OnFocusedInputSelectionChangedSelectionStart{
                                                .x = startX, .y = startY, .position = start},
                                    .end = facebook::react::OneKeyboardControllerViewEventEmitter::
                                        OnFocusedInputSelectionChangedSelectionEnd{
                                            .x = endX, .y = endY, .position = end}}});

            OneKCFocusedInputSelectionChangedEvent *selectionChangedEvent =
                [[OneKCFocusedInputSelectionChangedEvent alloc] initWithReactTag:@(self.tag)
                                                                      event:event];
            [self postNotificationForEventDispatcherObserversWithEvent:selectionChangedEvent];
          }
        }
        onFocusDidSet:^(NSDictionary *data) {
          [OneKCBridge emit:@"KeyboardController::focusDidSet" body:data];
        }];
    keyboardObserver = [[OneKCKeyboardMovementObserver alloc]
        initWithHandler:^(
            NSString *event,
            NSNumber *height,
            NSNumber *progress,
            NSNumber *duration,
            NSNumber *target) {
          if (self->_eventEmitter) {
            // TODO: use reflection to reduce code duplication?
            if ([event isEqualToString:@"onKeyboardMoveStart"]) {
              std::dynamic_pointer_cast<const facebook::react::OneKeyboardControllerViewEventEmitter>(
                  self->_eventEmitter)
                  ->onKeyboardMoveStart(
                      facebook::react::OneKeyboardControllerViewEventEmitter::OnKeyboardMoveStart{
                          .height = [height doubleValue],
                          .progress = [progress doubleValue],
                          .duration = [duration intValue],
                          .target = [target intValue]});
            }
            if ([event isEqualToString:@"onKeyboardMove"]) {
              std::dynamic_pointer_cast<const facebook::react::OneKeyboardControllerViewEventEmitter>(
                  self->_eventEmitter)
                  ->onKeyboardMove(
                      facebook::react::OneKeyboardControllerViewEventEmitter::OnKeyboardMove{
                          .height = [height doubleValue],
                          .progress = [progress doubleValue],
                          .duration = [duration intValue],
                          .target = [target intValue]});
            }
            if ([event isEqualToString:@"onKeyboardMoveEnd"]) {
              std::dynamic_pointer_cast<const facebook::react::OneKeyboardControllerViewEventEmitter>(
                  self->_eventEmitter)
                  ->onKeyboardMoveEnd(
                      facebook::react::OneKeyboardControllerViewEventEmitter::OnKeyboardMoveEnd{
                          .height = [height doubleValue],
                          .progress = [progress doubleValue],
                          .duration = [duration intValue],
                          .target = [target intValue]});
              [OneKCBridge animationEnded:self.tag];
            }
            if ([event isEqualToString:@"onKeyboardMoveInteractive"]) {
              std::dynamic_pointer_cast<const facebook::react::OneKeyboardControllerViewEventEmitter>(
                  self->_eventEmitter)
                  ->onKeyboardMoveInteractive(facebook::react::OneKeyboardControllerViewEventEmitter::
                                                  OnKeyboardMoveInteractive{
                                                      .height = [height doubleValue],
                                                      .progress = [progress doubleValue],
                                                      .duration = [duration intValue],
                                                      .target = [target intValue]});
            }
          }

          OneKCKeyboardMoveEvent *keyboardMoveEvent =
              [[OneKCKeyboardMoveEvent alloc] initWithReactTag:@(self.tag)
                                                    event:event
                                                   height:height
                                                 progress:progress
                                                 duration:duration
                                                   target:target];
          [self postNotificationForEventDispatcherObserversWithEvent:keyboardMoveEvent];
        }
        onNotify:^(NSString *event, NSDictionary *data) {
          [OneKCBridge emit:event body:data];
        }
        onRequestAnimation:^() {
          // no-op for fabric
        }
        onCancelAnimation:^(){
            // no-op for fabric
        }];
  }

  return self;
}

- (void)layoutSubviews
{
  [super layoutSubviews];

  UIWindow *window = self.window;
  if (!window) {
    return;
  }

  CGSize screenSize = window.bounds.size;
  if (CGSizeEqualToSize(screenSize, _lastScreenSize)) {
    return;
  }

  _lastScreenSize = screenSize;

  NSDictionary *data = @{@"width" : @(screenSize.width), @"height" : @(screenSize.height)};

  [OneKCBridge emit:@"KeyboardController::windowDidResize" body:data];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<const OneKeyboardControllerViewProps>(_props);
  const auto &newViewProps = *std::static_pointer_cast<const OneKeyboardControllerViewProps>(props);

  if (newViewProps.enabled != oldViewProps.enabled) {
    if (newViewProps.enabled) {
      [self mount];
    } else {
      [self unmount];
    }
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)willMoveToSuperview:(UIView *)newSuperview
{
  if (newSuperview == nil) {
    [self unmount];
  } else {
    [self mount];
  }
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (self.window) {
    [keyboardObserver.keyboardTrackingView attachToTopmostViewToWindow:self.window];
  }
}

- (void)mount
{
  [inputObserver mount];
  [keyboardObserver mount];
}

- (void)unmount
{
  [inputObserver unmount];
  [keyboardObserver unmount];
}

// TODO: once Fabric implements proper NativeAnimationDriver, this should be removed.
- (void)postNotificationForEventDispatcherObserversWithEvent:(NSObject<RCTEvent> *)event
{
  NSDictionary *userInfo = [NSDictionary dictionaryWithObjectsAndKeys:event, @"event", nil];
  [[NSNotificationCenter defaultCenter]
      postNotificationName:@"RCTNotifyEventDispatcherObserversOfEvent_DEPRECATED"
                    object:nil
                  userInfo:userInfo];
}

Class<RCTComponentViewProtocol> OneKeyboardControllerViewComponentViewCls(void)
{
  return OneKeyboardControllerViewComponentView.class;
}

@end
