#import <os/log.h>
#import "OneMacosRootView.h"

#include <cxxreact/JSBigString.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/runtimescheduler/RuntimeScheduler.h>
#include <react/renderer/scheduler/SchedulerDelegate.h>

#import "AppleEventBeat.h"
#import "OneMacosAppCommands.h"
#import "OneMacosDebug.h"
#import "OneMacosModules.h"
#import "OneMacosMountingManager.h"
#import "OneMacosPointerHandler.h"
#import "OneMacosRuntime.h"
#import "PlatformRunLoopObserver.h"

using namespace facebook;
using namespace facebook::react;

@class OneMacosHost;

namespace {

class OneMacosSchedulerDelegate final : public SchedulerDelegate {
 public:
  explicit OneMacosSchedulerDelegate(OneMacosHost *host) : host_(host) {}

  void schedulerDidFinishTransaction(const std::shared_ptr<const MountingCoordinator> &) override {}
  void schedulerShouldRenderTransactions(const std::shared_ptr<const MountingCoordinator> &coordinator) override;
  void schedulerShouldMergeReactRevision(SurfaceId surfaceId) override;
  void schedulerDidRequestPreliminaryViewAllocation(const ShadowNode &) override {}
  void schedulerDidDispatchCommand(
      const ShadowView &shadowView, const std::string &commandName, const folly::dynamic &args) override;
  void schedulerDidSendAccessibilityEvent(const ShadowView &, const std::string &) override {}
  void schedulerDidSetIsJSResponder(const ShadowView &, bool, bool) override {}
  void schedulerShouldSynchronouslyUpdateViewOnUIThread(Tag tag, const folly::dynamic &props) override;
  // uimanager commits these props to the shadow tree itself, as on iOS.
  void schedulerDidUpdateShadowTree(const std::unordered_map<Tag, folly::dynamic> &) override {}
  void schedulerDidCaptureViewSnapshot(Tag, SurfaceId) override {}
  void schedulerDidSetViewSnapshot(Tag, Tag, SurfaceId) override {}
  void schedulerDidClearPendingSnapshots() override {}

 private:
  __weak OneMacosHost *host_;
};

} // namespace

// One React instance and surface. Everything is created on the main thread and
// torn down with `stop`, which `reload` pairs with a fresh `start`.
@interface OneMacosHost : NSObject
- (instancetype)initWithBundleURL:(NSURL *)bundleURL moduleName:(NSString *)moduleName view:(NSView *)view;
- (void)start;
- (void)stop;
- (void)reload;
- (void)updateLayoutWithSize:(CGSize)size scale:(CGFloat)scale;
- (void)scheduleTransaction:(std::shared_ptr<const MountingCoordinator>)coordinator;
- (void)mergeReactRevision:(SurfaceId)surfaceId;
- (void)dispatchCommandOnTag:(Tag)tag name:(const std::string &)name args:(const folly::dynamic &)args;
- (void)appearanceDidChange:(NSAppearance *)appearance;
- (void)synchronouslyUpdateViewOnTag:(Tag)tag props:(const folly::dynamic &)props;
- (OneMacosAppCommandConfig *)appCommandConfig;
- (BOOL)canPerformAppCommand:(NSString *)commandId;
- (void)performAppCommand:(NSString *)commandId;
@end

void OneMacosSchedulerDelegate::schedulerDidDispatchCommand(
    const ShadowView &shadowView, const std::string &commandName, const folly::dynamic &args)
{
  [host_ dispatchCommandOnTag:shadowView.tag name:commandName args:args];
}

void OneMacosSchedulerDelegate::schedulerShouldRenderTransactions(
    const std::shared_ptr<const MountingCoordinator> &coordinator)
{
  [host_ scheduleTransaction:coordinator];
}

void OneMacosSchedulerDelegate::schedulerShouldSynchronouslyUpdateViewOnUIThread(Tag tag, const folly::dynamic &props)
{
  [host_ synchronouslyUpdateViewOnTag:tag props:props];
}

void OneMacosSchedulerDelegate::schedulerShouldMergeReactRevision(SurfaceId surfaceId)
{
  [host_ mergeReactRevision:surfaceId];
}

@implementation OneMacosHost {
  NSURL *_bundleURL;
  NSString *_moduleName;
  __weak NSView *_view;
  OneMacosMountingManager *_mountingManager;

  std::shared_ptr<ComponentDescriptorProviderRegistry> _providerRegistry;
  std::shared_ptr<OneHostRuntime> _runtime;
  std::unique_ptr<OneMacosSchedulerDelegate> _schedulerDelegate;

  CGSize _size;
  CGFloat _scale;
  NSInteger _generation;
  // what the current runtime configured, reset with it
  OneMacosAppCommandConfig *_appCommandConfig;
  BOOL _appCommandsListening;
}

- (instancetype)initWithBundleURL:(NSURL *)bundleURL moduleName:(NSString *)moduleName view:(NSView *)view
{
  if (self = [super init]) {
    _bundleURL = bundleURL;
    _moduleName = moduleName;
    _view = view;
    _scale = 1;
  }
  return self;
}

- (void)start
{
  NSAssert([NSThread isMainThread], @"start on the main thread");
  _generation++;
  NSInteger generation = _generation;

  _mountingManager = [OneMacosMountingManager new];
  _providerRegistry = [OneMacosMountingManager componentDescriptorProviderRegistry];

  __weak OneMacosHost *weakSelf = self;

  OneHostRuntimeOptions options;
  options.jsThread = std::make_shared<OneMacosMessageQueueThread>();
  options.timerRegistry = std::make_unique<OneMacosTimerRegistry>();
  options.createTurboModule = OneMacosCreateTurboModule;
  options.hasComponentProvider = [](const std::string &name) {
    return [OneMacosMountingManager hasComponentNamed:name] == YES;
  };
  options.logJsError = [](const std::string &message) {
    os_log(OS_LOG_DEFAULT, "[one-macos] js error: " ONE_MACOS_JS_TEXT, message.c_str());
  };
  options.logJsMessage = [](const std::string &message, unsigned int logLevel) {
    os_log(OS_LOG_DEFAULT, "[one-macos] js log(%u): " ONE_MACOS_JS_TEXT, logLevel, message.c_str());
  };

  OneHostModuleContext &moduleContext = options.moduleContext;
  moduleContext.scriptURL = _bundleURL.absoluteString.UTF8String;
  NSOperatingSystemVersion os = NSProcessInfo.processInfo.operatingSystemVersion;
  moduleContext.osVersion = std::to_string(os.majorVersion) + "." + std::to_string(os.minorVersion) + "." +
      std::to_string(os.patchVersion);
  moduleContext.interfaceIdiom = "mac";
  moduleContext.localeIdentifier = NSLocale.currentLocale.localeIdentifier.UTF8String;
  moduleContext.cxxNativeAnimated = true;
  moduleContext.windowMetrics = [weakSelf]() {
    OneMacosHost *strongSelf = weakSelf;
    return OneHostWindowMetrics{strongSelf->_size.width, strongSelf->_size.height, strongSelf->_scale};
  };
  moduleContext.colorScheme = []() {
    __block std::string name = "light";
    void (^read)(void) = ^{
      name = OneMacosColorSchemeName(NSApp.effectiveAppearance).UTF8String;
    };
    if ([NSThread isMainThread]) {
      read();
    } else {
      dispatch_sync(dispatch_get_main_queue(), read);
    }
    return name;
  };
  moduleContext.log = [](const std::string &line) {
    os_log(OS_LOG_DEFAULT, "[one-macos] " ONE_MACOS_JS_TEXT, line.c_str());
  };
  moduleContext.configureAppCommands = [weakSelf, generation](const folly::dynamic &config) {
    std::string error;
    OneMacosAppCommandConfig *parsed = OneMacosParseAppCommands(config, error);
    if (parsed) {
      dispatch_async(dispatch_get_main_queue(), ^{
        OneMacosHost *strongSelf = weakSelf;
        if (strongSelf && strongSelf->_generation == generation) {
          strongSelf->_appCommandConfig = parsed;
          OneMacosUpdateAppCommands();
        }
      });
    }
    return error;
  };
  moduleContext.setAppCommandsListening = [weakSelf, generation](bool listening) {
    dispatch_async(dispatch_get_main_queue(), ^{
      OneMacosHost *strongSelf = weakSelf;
      if (strongSelf && strongSelf->_generation == generation) {
        strongSelf->_appCommandsListening = listening;
      }
    });
  };
  moduleContext.reload = [weakSelf]() {
    dispatch_async(dispatch_get_main_queue(), ^{
      [weakSelf reload];
    });
  };

  _runtime = std::make_shared<OneHostRuntime>(std::move(options));
  [_mountingManager setContextContainer:_runtime->contextContainer()];

  [self createScheduler];
  _runtime->initializeRuntime();

  [self startSurface];
  [self loadBundleForGeneration:generation];
}

- (void)createScheduler
{
  OneMacosMountingManager *mountingManager = _mountingManager;
  _schedulerDelegate = std::make_unique<OneMacosSchedulerDelegate>(self);
  _runtime->createScheduler(
      _providerRegistry,
      [mountingManager](SharedComponentDescriptorRegistry descriptors) {
        [mountingManager setComponentDescriptorRegistry:descriptors];
      },
      [](std::shared_ptr<EventBeat::OwnerBox> ownerBox, RuntimeScheduler &runtimeScheduler) -> std::unique_ptr<EventBeat> {
        auto observer = std::make_unique<const MainRunLoopObserver>(RunLoopObserver::Activity::BeforeWaiting, ownerBox->owner);
        return std::make_unique<AppleEventBeat>(std::move(ownerBox), std::move(observer), runtimeScheduler);
      },
      _schedulerDelegate.get());
}

- (void)startSurface
{
  OneMacosMountingManager *mountingManager = _mountingManager;
  __weak NSView *view = _view;
  _runtime->updateLayout(_size.width, _size.height, _scale);
  _runtime->startSurface(_moduleName.UTF8String, [mountingManager, view](SurfaceId surfaceId) {
    [mountingManager attachSurface:surfaceId toView:view];
  });
}

- (void)loadBundleForGeneration:(NSInteger)generation
{
  std::weak_ptr<OneHostRuntime> weakRuntime = _runtime;
  NSURL *url = _bundleURL;
  __weak OneMacosHost *weakSelf = self;
  NSURLSessionDataTask *task = [NSURLSession.sharedSession
      dataTaskWithURL:url
    completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
      NSInteger status = [response isKindOfClass:NSHTTPURLResponse.class] ? ((NSHTTPURLResponse *)response).statusCode : 200;
      if (error != nil || data == nil || status != 200) {
        NSLog(@"[one-macos] bundle load failed (%ld): %@", (long)status, error ?: [[NSString alloc] initWithData:data ?: NSData.data encoding:NSUTF8StringEncoding]);
        return;
      }
      dispatch_async(dispatch_get_main_queue(), ^{
        OneMacosHost *strongSelf = weakSelf;
        auto runtime = weakRuntime.lock();
        if (!strongSelf || !runtime || strongSelf->_generation != generation) {
          return;
        }
        std::string source(static_cast<const char *>(data.bytes), data.length);
        runtime->instance().loadScript(std::make_unique<JSBigStdString>(std::move(source)), url.absoluteString.UTF8String);
      });
    }];
  [task resume];
}

- (void)stop
{
  NSAssert([NSThread isMainThread], @"stop on the main thread");
  _generation++;
  _appCommandConfig = nil;
  _appCommandsListening = NO;
  OneMacosUpdateAppCommands();
  if (_runtime) {
    OneMacosMountingManager *mountingManager = _mountingManager;
    __weak NSView *view = _view;
    _runtime->stopSurface([mountingManager, view](SurfaceId surfaceId) {
      [mountingManager detachSurface:surfaceId fromView:view];
    });
    _runtime.reset();
  }
  // queued rendering updates capture the delegate directly; keep it alive until
  // the old runtime has finished dispatching commands.
  _schedulerDelegate.reset();
  _mountingManager = nil;
}

- (void)reload
{
  [self stop];
  [self start];
}

- (void)updateLayoutWithSize:(CGSize)size scale:(CGFloat)scale
{
  _size = size;
  _scale = scale;
  if (_runtime && _runtime->updateLayout(size.width, size.height, scale)) {
    _runtime->emitDimensions();
  }
}

- (void)appearanceDidChange:(NSAppearance *)appearance
{
  if (_runtime) {
    _runtime->emitDeviceEvent(
        "appearanceChanged", folly::dynamic::object("colorScheme", OneMacosColorSchemeName(appearance).UTF8String));
  }
}

- (OneMacosAppCommandConfig *)appCommandConfig
{
  return _appCommandConfig;
}

- (BOOL)canPerformAppCommand:(NSString *)commandId
{
  return _runtime && _appCommandsListening && [_appCommandConfig.commandIds containsObject:commandId];
}

- (void)performAppCommand:(NSString *)commandId
{
  if ([self canPerformAppCommand:commandId]) {
    _runtime->emitDeviceEvent("oneMacAppCommand", commandId.UTF8String);
  }
}

- (void)dispatchCommandOnTag:(Tag)tag name:(const std::string &)name args:(const folly::dynamic &)args
{
  [_mountingManager dispatchCommandOnTag:tag name:name args:args];
}

- (void)synchronouslyUpdateViewOnTag:(Tag)tag props:(const folly::dynamic &)props
{
  [_mountingManager synchronouslyUpdateViewOnTag:tag props:props];
}

- (void)scheduleTransaction:(std::shared_ptr<const MountingCoordinator>)coordinator
{
  [_mountingManager scheduleTransaction:coordinator];
}

- (void)mergeReactRevision:(SurfaceId)surfaceId
{
  if (_runtime) {
    _runtime->mergeReactRevision(surfaceId, [](std::function<void()> work) {
      dispatch_async(dispatch_get_main_queue(), ^{
        work();
      });
    });
  }
}

@end

@interface OneMacosRootView () <OneMacosPressTarget, OneMacosAppCommandTarget>
@end

@implementation OneMacosRootView {
  OneMacosHost *_host;
  OneMacosPointerHandler *_pointerHandler;
  NSTrackingArea *_trackingArea;
}

+ (NSURL *)defaultBundleURL
{
  NSString *override = NSProcessInfo.processInfo.environment[@"ONE_MACOS_BUNDLE_URL"];
  if (override.length > 0) {
    return [NSURL URLWithString:override];
  }
  NSString *server = [NSBundle.mainBundle objectForInfoDictionaryKey:@"OneDevServerURL"] ?: @"http://localhost:8081";
  return [NSURL URLWithString:[server stringByAppendingString:@"/index.bundle?platform=macos&dev=true"]];
}

- (instancetype)initWithBundleURL:(NSURL *)bundleURL moduleName:(NSString *)moduleName
{
  if (self = [super initWithFrame:NSMakeRect(0, 0, 800, 600)]) {
    _pointerHandler = [[OneMacosPointerHandler alloc] initWithRootView:self];
    _host = [[OneMacosHost alloc] initWithBundleURL:bundleURL moduleName:moduleName view:self];
    [_host updateLayoutWithSize:self.bounds.size scale:NSScreen.mainScreen.backingScaleFactor];
    [_host start];
    OneMacosInstallDebugHooks(self);
    OneMacosRegisterAppCommandTarget(self);
    [NSNotificationCenter.defaultCenter addObserver:self
                                           selector:@selector(systemColorsDidChange:)
                                               name:NSSystemColorsDidChangeNotification
                                             object:nil];
  }
  return self;
}

// an accent or system color change keeps the appearance, so PlatformColor
// paint needs an explicit redraw
- (void)systemColorsDidChange:(NSNotification *)notification
{
  NSMutableArray<NSView *> *views = [NSMutableArray arrayWithObject:self];
  while (NSView *view = views.lastObject) {
    [views removeLastObject];
    view.needsDisplay = YES;
    [views addObjectsFromArray:view.subviews];
  }
}

- (void)dealloc
{
  [_host stop];
}

- (BOOL)isFlipped
{
  return YES;
}

// a click on empty space lands here and takes focus from any text input
- (BOOL)acceptsFirstResponder
{
  return YES;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event
{
  return YES;
}

- (void)viewDidMoveToWindow
{
  [super viewDidMoveToWindow];
  // tab order follows the layout, top left to bottom right
  self.window.autorecalculatesKeyViewLoop = YES;
  self.window.acceptsMouseMovedEvents = YES;
}

- (void)viewDidChangeEffectiveAppearance
{
  [super viewDidChangeEffectiveAppearance];
  [_host appearanceDidChange:self.effectiveAppearance];
}

- (void)updateTrackingAreas
{
  [super updateTrackingAreas];
  if (_trackingArea) {
    [self removeTrackingArea:_trackingArea];
  }
  _trackingArea = [[NSTrackingArea alloc]
      initWithRect:NSZeroRect
           options:NSTrackingMouseMoved | NSTrackingMouseEnteredAndExited | NSTrackingActiveInKeyWindow |
                   NSTrackingInVisibleRect
             owner:self
          userInfo:nil];
  [self addTrackingArea:_trackingArea];
}

- (void)mouseDown:(NSEvent *)event
{
  [_pointerHandler mouseDown:event];
}

- (void)mouseDragged:(NSEvent *)event
{
  [_pointerHandler mouseDragged:event];
}

- (void)mouseUp:(NSEvent *)event
{
  [_pointerHandler mouseUp:event];
}

- (void)mouseMoved:(NSEvent *)event
{
  [_pointerHandler mouseMoved:event];
}

- (void)mouseExited:(NSEvent *)event
{
  [_pointerHandler mouseExited:event];
}

- (OneMacosAppCommandConfig *)oneMacosAppCommandConfig
{
  return [_host appCommandConfig];
}

- (BOOL)oneMacosCanPerformAppCommand:(NSString *)commandId
{
  return [_host canPerformAppCommand:commandId];
}

- (void)oneMacosPerformAppCommand:(NSString *)commandId
{
  [_host performAppCommand:commandId];
}

- (void)oneMacosPressView:(id)sender
{
  [_pointerHandler pressView:sender];
}

- (void)setFrameSize:(NSSize)newSize
{
  [super setFrameSize:newSize];
  [_host updateLayoutWithSize:newSize scale:self.window.backingScaleFactor ?: NSScreen.mainScreen.backingScaleFactor];
}

- (void)viewDidChangeBackingProperties
{
  [super viewDidChangeBackingProperties];
  [_host updateLayoutWithSize:self.bounds.size scale:self.window.backingScaleFactor ?: NSScreen.mainScreen.backingScaleFactor];
}

@end
