#import "OneMacosMountingManager.h"

#include <react/renderer/components/image/ImageComponentDescriptor.h>
#include <react/renderer/components/iostextinput/TextInputComponentDescriptor.h>
#include <react/renderer/components/root/RootComponentDescriptor.h>
#include <react/renderer/components/scrollview/ScrollViewComponentDescriptor.h>
#include <react/renderer/components/text/ParagraphComponentDescriptor.h>
#include <react/renderer/components/text/RawTextComponentDescriptor.h>
#include <react/renderer/components/text/TextComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/mounting/ShadowView.h>
#include <react/renderer/mounting/ShadowViewMutation.h>

#include <unordered_map>

#include <OneMacButton/OneMacButtonComponentDescriptor.h>
#include <OneMacSegmentedControl/OneMacSegmentedControlComponentDescriptor.h>
#include <OneMacToggle/OneMacToggleComponentDescriptor.h>

#import "OneMacosImageComponentView.h"
#import "OneMacosParagraphComponentView.h"
#import "OneMacosScrollViewComponentView.h"
#import "OneMacosTextInputComponentView.h"
#import "OneMacosButtonComponentView.h"
#import "OneMacosSegmentedControlComponentView.h"
#import "OneMacosToggleComponentView.h"

using namespace facebook::react;

namespace {

// component descriptor and the AppKit class that paints it; Text and RawText
// are virtual nodes with no view of their own
struct ComponentEntry {
  ComponentDescriptorProvider provider;
  Class viewClass;
};

std::vector<ComponentEntry> &componentEntries()
{
  static std::vector<ComponentEntry> entries = {
      {concreteComponentDescriptorProvider<RootComponentDescriptor>(), [OneMacosViewComponentView class]},
      {concreteComponentDescriptorProvider<ViewComponentDescriptor>(), [OneMacosViewComponentView class]},
      {concreteComponentDescriptorProvider<ImageComponentDescriptor>(), [OneMacosImageComponentView class]},
      {concreteComponentDescriptorProvider<TextInputComponentDescriptor>(), [OneMacosTextInputComponentView class]},
      {concreteComponentDescriptorProvider<ScrollViewComponentDescriptor>(),
       [OneMacosScrollViewComponentView class]},
      {concreteComponentDescriptorProvider<ParagraphComponentDescriptor>(),
       [OneMacosParagraphComponentView class]},
      {concreteComponentDescriptorProvider<TextComponentDescriptor>(), nil},
      {concreteComponentDescriptorProvider<RawTextComponentDescriptor>(), nil},
      {concreteComponentDescriptorProvider<OneMacButtonComponentDescriptor>(), [OneMacosButtonComponentView class]},
      {concreteComponentDescriptorProvider<OneMacSegmentedControlComponentDescriptor>(), [OneMacosSegmentedControlComponentView class]},
      {concreteComponentDescriptorProvider<OneMacToggleComponentDescriptor>(),
       [OneMacosToggleComponentView class]},
  };
  return entries;
}

} // namespace

@implementation OneMacosMountingManager {
  NSMutableDictionary<NSNumber *, NSView<OneMacosComponentView> *> *_views;
  std::shared_ptr<const ContextContainer> _contextContainer;
  SharedComponentDescriptorRegistry _componentDescriptorRegistry;
  std::unordered_map<Tag, ComponentHandle> _componentHandles;
  SurfaceId _surfaceId;
  BOOL _transactionInFlight;
  BOOL _followUpTransactionRequired;
}

+ (std::shared_ptr<ComponentDescriptorProviderRegistry>)componentDescriptorProviderRegistry
{
  auto registry = std::make_shared<ComponentDescriptorProviderRegistry>();
  for (const auto &entry : componentEntries()) {
    registry->add(entry.provider);
  }
  return registry;
}

+ (BOOL)hasComponentNamed:(const std::string &)name
{
  for (const auto &entry : componentEntries()) {
    if (name == entry.provider.name) {
      return YES;
    }
  }
  return NO;
}

- (instancetype)init
{
  if (self = [super init]) {
    _views = [NSMutableDictionary new];
  }
  return self;
}

- (void)setContextContainer:(std::shared_ptr<const ContextContainer>)contextContainer
{
  _contextContainer = contextContainer;
}

- (void)setComponentDescriptorRegistry:(SharedComponentDescriptorRegistry)registry
{
  _componentDescriptorRegistry = std::move(registry);
}

- (void)synchronouslyUpdateViewOnTag:(Tag)tag props:(const folly::dynamic &)props
{
  NSAssert([NSThread isMainThread], @"native props update on the main thread");
  OneMacosViewComponentView *view = (OneMacosViewComponentView *)_views[@(tag)];
  auto handle = _componentHandles.find(tag);
  if (!view || !view.props || handle == _componentHandles.end()) {
    return; // an animation can finish after its target was removed
  }
  auto descriptor = _componentDescriptorRegistry->findComponentDescriptorByHandle_DO_NOT_USE_THIS_IS_BROKEN(handle->second);
  if (!descriptor) {
    return;
  }
  auto oldProps = view.props;
  auto newProps = descriptor->cloneProps(PropsParserContext{_surfaceId, *_contextContainer}, oldProps, RawProps(props));
  [view updateProps:newProps oldProps:oldProps];
  [view finalizeUpdates:OneMacosUpdateMaskProps];
}

- (NSView<OneMacosComponentView> *)createViewForHandle:(ComponentHandle)handle tag:(Tag)tag
{
  Class viewClass = [OneMacosViewComponentView class];
  for (const auto &entry : componentEntries()) {
    if (entry.provider.handle == handle && entry.viewClass) {
      viewClass = entry.viewClass;
      break;
    }
  }
  NSView<OneMacosComponentView> *view = [[viewClass alloc] initWithFrame:NSZeroRect];
  view.reactTag = tag;
  _views[@(tag)] = view;
  _componentHandles[tag] = handle;
  return view;
}

- (NSView<OneMacosComponentView> *)findComponentViewWithTag:(Tag)tag
{
  return _views[@(tag)];
}

- (void)attachSurface:(SurfaceId)surfaceId toView:(NSView *)view
{
  _surfaceId = surfaceId;
  NSView *root = [self createViewForHandle:RootShadowNode::Handle() tag:surfaceId];
  root.autoresizingMask = NSViewNotSizable;
  [view addSubview:root];
}

- (void)detachSurface:(SurfaceId)surfaceId fromView:(NSView *)view
{
  NSView *root = _views[@(surfaceId)];
  [root removeFromSuperview];
  [_views removeObjectForKey:@(surfaceId)];
  _componentHandles.erase(surfaceId);
}

- (void)dispatchCommandOnTag:(Tag)tag name:(const std::string &)name args:(const folly::dynamic &)args
{
  // the command outlives the call: copy what the block needs
  std::string commandName = name;
  folly::dynamic commandArgs = args;
  dispatch_async(dispatch_get_main_queue(), ^{
    NSView<OneMacosComponentView> *view = self->_views[@(tag)];
    if ([view respondsToSelector:@selector(handleCommand:args:)]) {
      [view handleCommand:commandName args:commandArgs];
    }
  });
}

- (void)scheduleTransaction:(std::shared_ptr<const MountingCoordinator>)mountingCoordinator
{
  if ([NSThread isMainThread]) {
    [self initiateTransaction:*mountingCoordinator];
    return;
  }
  dispatch_async(dispatch_get_main_queue(), ^{
    [self initiateTransaction:*mountingCoordinator];
  });
}

- (void)initiateTransaction:(const MountingCoordinator &)mountingCoordinator
{
  if (_transactionInFlight) {
    _followUpTransactionRequired = YES;
    return;
  }
  do {
    _followUpTransactionRequired = NO;
    _transactionInFlight = YES;
    [self performTransaction:mountingCoordinator];
    _transactionInFlight = NO;
  } while (_followUpTransactionRequired);
}

- (void)performTransaction:(const MountingCoordinator &)mountingCoordinator
{
  mountingCoordinator.getTelemetryController().pullTransaction(
      [&](const MountingTransaction &, const SurfaceTelemetry &) {},
      [&](const MountingTransaction &transaction, const SurfaceTelemetry &) {
        [self performMutations:transaction.getMutations()];
      },
      [&](const MountingTransaction &, const SurfaceTelemetry &) {});
}

- (void)performMutations:(const ShadowViewMutationList &)mutations
{
  for (const auto &mutation : mutations) {
    switch (mutation.type) {
      case ShadowViewMutation::Create: {
        const auto &child = mutation.newChildShadowView;
        [self createViewForHandle:child.componentHandle tag:child.tag];
        break;
      }

      case ShadowViewMutation::Delete: {
        [_views removeObjectForKey:@(mutation.oldChildShadowView.tag)];
        _componentHandles.erase(mutation.oldChildShadowView.tag);
        break;
      }

      case ShadowViewMutation::Insert: {
        const auto &child = mutation.newChildShadowView;
        NSView<OneMacosComponentView> *childView = _views[@(child.tag)];
        NSView<OneMacosComponentView> *parentView = _views[@(mutation.parentTag)];
        [childView updateProps:child.props oldProps:nullptr];
        [childView updateEventEmitter:child.eventEmitter];
        [childView updateState:child.state oldState:nullptr];
        [childView updateLayoutMetrics:child.layoutMetrics oldLayoutMetrics:EmptyLayoutMetrics];
        [childView finalizeUpdates:OneMacosUpdateMaskAll];
        [parentView mountChildComponentView:childView index:mutation.index];
        break;
      }

      case ShadowViewMutation::Remove: {
        NSView<OneMacosComponentView> *childView = _views[@(mutation.oldChildShadowView.tag)];
        NSView<OneMacosComponentView> *parentView = _views[@(mutation.parentTag)];
        [parentView unmountChildComponentView:childView index:mutation.index];
        break;
      }

      case ShadowViewMutation::Update: {
        const auto &oldChild = mutation.oldChildShadowView;
        const auto &newChild = mutation.newChildShadowView;
        NSView<OneMacosComponentView> *childView = _views[@(newChild.tag)];
        OneMacosUpdateMask mask = OneMacosUpdateMaskNone;

        if (oldChild.props != newChild.props) {
          [childView updateProps:newChild.props oldProps:oldChild.props];
          mask |= OneMacosUpdateMaskProps;
        }
        if (oldChild.eventEmitter != newChild.eventEmitter) {
          [childView updateEventEmitter:newChild.eventEmitter];
          mask |= OneMacosUpdateMaskEventEmitter;
        }
        if (oldChild.state != newChild.state) {
          [childView updateState:newChild.state oldState:oldChild.state];
          mask |= OneMacosUpdateMaskState;
        }
        if (oldChild.layoutMetrics != newChild.layoutMetrics) {
          [childView updateLayoutMetrics:newChild.layoutMetrics oldLayoutMetrics:oldChild.layoutMetrics];
          mask |= OneMacosUpdateMaskLayoutMetrics;
        }
        if (mask != OneMacosUpdateMaskNone) {
          [childView finalizeUpdates:mask];
        }
        break;
      }
    }
  }
}

@end
