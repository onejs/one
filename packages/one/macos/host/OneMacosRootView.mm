#import <os/log.h>
#import "OneMacosRootView.h"

#include <ReactCommon/RuntimeExecutor.h>
#include <ReactCommon/TurboModuleBinding.h>
#include <cxxreact/JSBigString.h>
#include <react/runtime/hermes/HermesInstance.h>
#include <jsi/jsi.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/componentregistry/native/NativeComponentRegistryBinding.h>
#include <react/renderer/core/ReactRootViewTagGenerator.h>
#include <react/renderer/runtimescheduler/RuntimeScheduler.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/scheduler/SchedulerDelegate.h>
#include <react/renderer/scheduler/SchedulerToolbox.h>
#include <react/renderer/scheduler/SurfaceHandler.h>
#include <react/runtime/JSRuntimeBindings.h>
#include <react/runtime/JSRuntimeFactory.h>
#include <react/runtime/ReactInstance.h>
#include <react/runtime/TimerManager.h>
#include <react/utils/ContextContainer.h>

#include <mutex>
#include <unordered_map>
#include <unordered_set>

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

  std::shared_ptr<OneMacosMessageQueueThread> _jsThread;
  std::shared_ptr<ReactInstance> _instance;
  std::shared_ptr<ComponentDescriptorProviderRegistry> _providerRegistry;
  std::unique_ptr<Scheduler> _scheduler;
  std::unique_ptr<OneMacosSchedulerDelegate> _schedulerDelegate;
  std::optional<SurfaceHandler> _surface;
  // the current runtime's modules. only its js thread touches the map, so a
  // late call from a stopped runtime can never hand its modules to the next one
  std::shared_ptr<std::unordered_map<std::string, std::shared_ptr<TurboModule>>> _turboModules;

  std::mutex _mergeMutex;
  std::unordered_set<SurfaceId> _pendingMerges;
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

  _jsThread = std::make_shared<OneMacosMessageQueueThread>();
  auto timerRegistry = std::make_unique<OneMacosTimerRegistry>();
  auto *timerRegistryPtr = timerRegistry.get();
  auto timerManager = std::make_shared<TimerManager>(std::move(timerRegistry));
  timerRegistryPtr->setTimerManager(timerManager);

  auto onJsError = [](jsi::Runtime &, const JsErrorHandler::ProcessedError &error) {
    os_log(OS_LOG_DEFAULT, "[one-macos] js error: " ONE_MACOS_JS_TEXT, error.message.c_str());
  };

  _instance = std::make_shared<ReactInstance>(
      HermesInstance::createJSRuntime(nullptr, _jsThread, false), _jsThread, timerManager, onJsError);
  timerManager->setRuntimeExecutor(_instance->getBufferedRuntimeExecutor());

  std::weak_ptr<ReactInstance> weakInstance = _instance;
  __weak OneMacosHost *weakSelf = self;

  OneMacosModuleContext moduleContext;
  moduleContext.scriptURL = _bundleURL.absoluteString.UTF8String;
  moduleContext.windowMetrics = [weakSelf]() {
    OneMacosHost *strongSelf = weakSelf;
    return OneMacosWindowMetrics{strongSelf->_size.width, strongSelf->_size.height, strongSelf->_scale};
  };
  moduleContext.emitDeviceEvent = [weakInstance](const std::string &name, folly::dynamic payload) {
    if (auto instance = weakInstance.lock()) {
      instance->callFunctionOnModule("RCTDeviceEventEmitter", "emit", folly::dynamic::array(name, std::move(payload)));
    }
  };
  std::weak_ptr<OneMacosMessageQueueThread> weakJsThread = _jsThread;
  moduleContext.isJavaScriptQueue = [weakJsThread]() {
    auto jsThread = weakJsThread.lock();
    return jsThread && jsThread->isOnThread();
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

  auto jsCallInvoker = _instance->createJSCallInvoker();

  auto contextContainer = std::make_shared<ContextContainer>();
  contextContainer->insert(RuntimeSchedulerKey, std::weak_ptr<RuntimeScheduler>(_instance->getRuntimeScheduler()));
  [_mountingManager setContextContainer:contextContainer];

  [self createSchedulerWithContextContainer:contextContainer];

  auto turboModules = std::make_shared<std::unordered_map<std::string, std::shared_ptr<TurboModule>>>();
  _turboModules = turboModules;
  _instance->initializeRuntime({}, [=](jsi::Runtime &runtime) {
    TurboModuleBinding::install(
        runtime,
        [turboModules, jsCallInvoker, moduleContext](
            jsi::Runtime &moduleRuntime, const std::string &name) -> std::shared_ptr<TurboModule> {
          auto found = turboModules->find(name);
          if (found != turboModules->end()) {
            return found->second;
          }
          auto module = OneMacosCreateTurboModule(moduleRuntime, name, jsCallInvoker, moduleContext);
          (*turboModules)[name] = module;
          return module;
        });
    bindNativeLogger(runtime, [](const std::string &message, unsigned int logLevel) {
      os_log(OS_LOG_DEFAULT, "[one-macos] js log(%u): " ONE_MACOS_JS_TEXT, logLevel, message.c_str());
    });
    // hermes has no console of its own, so route it through the native logger
    // before the bundle's own empty console stubs can claim the names
    runtime.evaluateJavaScript(
        std::make_shared<jsi::StringBuffer>(
            "globalThis.console = {};"
            "['log', 'info', 'warn', 'error', 'debug', 'trace'].forEach(function (name, level) {"
            "  console[name] = function () {"
            "    nativeLoggingHook(Array.prototype.map.call(arguments, function (value) {"
            "      return typeof value === 'string' ? value : (value && value.stack) || String(value);"
            "    }).join(' '), level);"
            "  };"
            "});"),
        "one-macos-console");
    bindHasComponentProvider(runtime, [](const std::string &name) {
      return [OneMacosMountingManager hasComponentNamed:name] == YES;
    });
  });

  [self startSurface];
  [self loadBundleForGeneration:generation];
}

- (void)createSchedulerWithContextContainer:(std::shared_ptr<ContextContainer>)contextContainer
{
  auto registry = _providerRegistry;
  OneMacosMountingManager *mountingManager = _mountingManager;
  auto runtimeScheduler = _instance->getRuntimeScheduler();

  SchedulerToolbox toolbox;
  toolbox.contextContainer = contextContainer;
  toolbox.componentRegistryFactory = [registry, mountingManager](
                                         const EventDispatcher::Weak &eventDispatcher,
                                         const std::shared_ptr<const ContextContainer> &container) {
    auto descriptors = registry->createComponentDescriptorRegistry({.eventDispatcher = eventDispatcher, .contextContainer = container});
    [mountingManager setComponentDescriptorRegistry:descriptors];
    return descriptors;
  };
  // buffered so surface start waits for the bundle that installs RN$AppRegistry
  toolbox.runtimeExecutor = _instance->getBufferedRuntimeExecutor();
  toolbox.bridgelessBindingsExecutor = _instance->getUnbufferedRuntimeExecutor();
  toolbox.eventBeatFactory = [runtimeScheduler](std::shared_ptr<EventBeat::OwnerBox> ownerBox) -> std::unique_ptr<EventBeat> {
    auto observer = std::make_unique<const MainRunLoopObserver>(RunLoopObserver::Activity::BeforeWaiting, ownerBox->owner);
    return std::make_unique<AppleEventBeat>(std::move(ownerBox), std::move(observer), *runtimeScheduler);
  };

  _schedulerDelegate = std::make_unique<OneMacosSchedulerDelegate>(self);
  _scheduler = std::make_unique<Scheduler>(toolbox, nullptr, _schedulerDelegate.get());
}

- (void)startSurface
{
  _surface.emplace(_moduleName.UTF8String, getNextRootViewTag());
  _surface->setProps(folly::dynamic::object());
  _scheduler->registerSurface(*_surface);
  [_mountingManager attachSurface:_surface->getSurfaceId() toView:_view];
  [self applyLayout];
  _surface->start();
}

- (void)applyLayout
{
  if (!_surface) {
    return;
  }
  LayoutConstraints constraints = _surface->getLayoutConstraints();
  LayoutContext context = _surface->getLayoutContext();
  facebook::react::Size size{static_cast<Float>(_size.width), static_cast<Float>(_size.height)};
  constraints.minimumSize = size;
  constraints.maximumSize = size;
  constraints.layoutDirection = LayoutDirection::LeftToRight;
  context.pointScaleFactor = static_cast<Float>(_scale);
  context.fontSizeMultiplier = 1;
  context.viewportSize = size;
  _surface->constraintLayout(constraints, context);
}

- (void)loadBundleForGeneration:(NSInteger)generation
{
  std::weak_ptr<ReactInstance> weakInstance = _instance;
  NSURL *url = _bundleURL;
  if (url.isFileURL) {
    // the embedded bundle is mapped in place; loadScript only queues the eval on the js thread
    std::unique_ptr<const JSBigString> script;
    try {
      script = JSBigFileString::fromPath(url.path.UTF8String);
    } catch (const std::exception &error) {
      NSLog(@"[one-macos] bundle load failed: %s", error.what());
      return;
    }
    _instance->loadScript(std::move(script), url.absoluteString.UTF8String);
    return;
  }
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
        auto instance = weakInstance.lock();
        if (!strongSelf || !instance || strongSelf->_generation != generation) {
          return;
        }
        std::string source(static_cast<const char *>(data.bytes), data.length);
        instance->loadScript(std::make_unique<JSBigStdString>(std::move(source)), url.absoluteString.UTF8String);
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
  if (_surface) {
    _surface->stop();
    _scheduler->unregisterSurface(*_surface);
    [_mountingManager detachSurface:_surface->getSurfaceId() fromView:_view];
    _surface.reset();
  }
  _scheduler.reset();

  auto instance = std::move(_instance);
  auto thread = std::move(_jsThread);
  auto modules = std::move(_turboModules);
  // the instance and its modules must die on the js thread
  thread->runOnQueueSync([&] {
    modules->clear();
    instance.reset();
  });
  thread->quitSynchronous();
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
  BOOL changed = !CGSizeEqualToSize(_size, size) || _scale != scale;
  _size = size;
  _scale = scale;
  if (!changed) {
    return;
  }
  [self applyLayout];
  if (_instance) {
    folly::dynamic dims = folly::dynamic::object("width", size.width)("height", size.height)("scale", scale)(
        "fontScale", 1);
    _instance->callFunctionOnModule(
        "RCTDeviceEventEmitter",
        "emit",
        folly::dynamic::array(
            "didUpdateDimensions", folly::dynamic::object("window", dims)("screen", dims)));
  }
}

- (void)appearanceDidChange:(NSAppearance *)appearance
{
  if (_instance) {
    _instance->callFunctionOnModule(
        "RCTDeviceEventEmitter",
        "emit",
        folly::dynamic::array(
            "appearanceChanged", folly::dynamic::object("colorScheme", OneMacosColorSchemeName(appearance).UTF8String)));
  }
}

- (OneMacosAppCommandConfig *)appCommandConfig
{
  return _appCommandConfig;
}

- (BOOL)canPerformAppCommand:(NSString *)commandId
{
  return _instance && _appCommandsListening && [_appCommandConfig.commandIds containsObject:commandId];
}

- (void)performAppCommand:(NSString *)commandId
{
  if ([self canPerformAppCommand:commandId]) {
    _instance->callFunctionOnModule(
        "RCTDeviceEventEmitter", "emit", folly::dynamic::array("oneMacAppCommand", commandId.UTF8String));
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
  bool needsDispatch = false;
  {
    std::lock_guard<std::mutex> lock(_mergeMutex);
    needsDispatch = _pendingMerges.empty();
    _pendingMerges.insert(surfaceId);
  }
  if (!needsDispatch) {
    return;
  }
  dispatch_async(dispatch_get_main_queue(), ^{
    std::unordered_set<SurfaceId> pending;
    {
      std::lock_guard<std::mutex> lock(self->_mergeMutex);
      pending.swap(self->_pendingMerges);
    }
    if (!self->_scheduler) {
      return;
    }
    auto uiManager = self->_scheduler->getUIManager();
    for (auto id : pending) {
      uiManager->getShadowTreeRegistry().visit(id, [](const ShadowTree &tree) { tree.mergeReactRevision(); });
    }
  });
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
#if DEBUG
  NSString *server = [NSBundle.mainBundle objectForInfoDictionaryKey:@"OneDevServerURL"] ?: @"http://localhost:8081";
  return [NSURL URLWithString:[server stringByAppendingString:@"/index.bundle?platform=macos&dev=true"]];
#else
  return [NSBundle.mainBundle.resourceURL URLByAppendingPathComponent:@"main.jsbundle"];
#endif
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
