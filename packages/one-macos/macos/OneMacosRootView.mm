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
#import "OneMacosDebug.h"
#import "OneMacosModules.h"
#import "OneMacosMountingManager.h"
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
  void schedulerDidDispatchCommand(const ShadowView &, const std::string &, const folly::dynamic &) override {}
  void schedulerDidSendAccessibilityEvent(const ShadowView &, const std::string &) override {}
  void schedulerDidSetIsJSResponder(const ShadowView &, bool, bool) override {}
  void schedulerShouldSynchronouslyUpdateViewOnUIThread(Tag, const folly::dynamic &) override {}
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
@end

void OneMacosSchedulerDelegate::schedulerShouldRenderTransactions(
    const std::shared_ptr<const MountingCoordinator> &coordinator)
{
  [host_ scheduleTransaction:coordinator];
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
  std::unordered_map<std::string, std::shared_ptr<TurboModule>> _turboModules;

  std::mutex _mergeMutex;
  std::unordered_set<SurfaceId> _pendingMerges;
  CGSize _size;
  CGFloat _scale;
  NSInteger _generation;
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
    NSLog(@"[one-macos] js error: %s", error.message.c_str());
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

  _instance->initializeRuntime({}, [=](jsi::Runtime &runtime) {
    TurboModuleBinding::install(
        runtime,
        [weakSelf, jsCallInvoker, moduleContext](
            jsi::Runtime &moduleRuntime, const std::string &name) -> std::shared_ptr<TurboModule> {
          OneMacosHost *strongSelf = weakSelf;
          if (!strongSelf) {
            return nullptr;
          }
          auto &modules = strongSelf->_turboModules;
          auto found = modules.find(name);
          if (found != modules.end()) {
            return found->second;
          }
          auto module = OneMacosCreateTurboModule(moduleRuntime, name, jsCallInvoker, moduleContext);
          modules[name] = module;
          return module;
        });
    bindNativeLogger(runtime, [](const std::string &message, unsigned int logLevel) {
      NSLog(@"[one-macos] js log(%u): %s", logLevel, message.c_str());
    });
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
  auto runtimeScheduler = _instance->getRuntimeScheduler();

  SchedulerToolbox toolbox;
  toolbox.contextContainer = contextContainer;
  toolbox.componentRegistryFactory = [registry](
                                         const EventDispatcher::Weak &eventDispatcher,
                                         const std::shared_ptr<const ContextContainer> &container) {
    return registry->createComponentDescriptorRegistry({.eventDispatcher = eventDispatcher, .contextContainer = container});
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
  if (_surface) {
    _surface->stop();
    _scheduler->unregisterSurface(*_surface);
    [_mountingManager detachSurface:_surface->getSurfaceId() fromView:_view];
    _surface.reset();
  }
  _scheduler.reset();
  _schedulerDelegate.reset();

  auto instance = std::move(_instance);
  auto thread = std::move(_jsThread);
  auto modules = std::move(_turboModules);
  _turboModules.clear();
  // the instance and its modules must die on the js thread
  thread->runOnQueueSync([&] {
    modules.clear();
    instance.reset();
  });
  thread->quitSynchronous();
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

@implementation OneMacosRootView {
  OneMacosHost *_host;
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
    _host = [[OneMacosHost alloc] initWithBundleURL:bundleURL moduleName:moduleName view:self];
    [_host updateLayoutWithSize:self.bounds.size scale:NSScreen.mainScreen.backingScaleFactor];
    [_host start];
    OneMacosInstallDebugHooks(self);
  }
  return self;
}

- (void)dealloc
{
  [_host stop];
}

- (BOOL)isFlipped
{
  return YES;
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
