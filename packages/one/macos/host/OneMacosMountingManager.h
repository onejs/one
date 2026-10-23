#import <AppKit/AppKit.h>

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/componentregistry/ComponentDescriptorRegistry.h>
#include <react/renderer/mounting/MountingCoordinator.h>

#import "OneMacosComponentView.h"

NS_ASSUME_NONNULL_BEGIN

// Applies Fabric mutations to AppKit views on the main thread. Component
// descriptors and view classes register in one place so the two stay paired.
@interface OneMacosMountingManager : NSObject

- (void)setContextContainer:(std::shared_ptr<const facebook::react::ContextContainer>)contextContainer;

- (void)setComponentDescriptorRegistry:(facebook::react::SharedComponentDescriptorRegistry)registry;
- (void)synchronouslyUpdateViewOnTag:(facebook::react::Tag)tag props:(const folly::dynamic &)props;

+ (std::shared_ptr<facebook::react::ComponentDescriptorProviderRegistry>)componentDescriptorProviderRegistry;
+ (BOOL)hasComponentNamed:(const std::string &)name;

- (void)attachSurface:(facebook::react::SurfaceId)surfaceId toView:(NSView *)view;
- (void)detachSurface:(facebook::react::SurfaceId)surfaceId fromView:(NSView *)view;

// safe from any thread; the work happens on the main thread
- (void)scheduleTransaction:(std::shared_ptr<const facebook::react::MountingCoordinator>)mountingCoordinator;

// native commands from JS refs, delivered to the view on the main thread
- (void)dispatchCommandOnTag:(facebook::react::Tag)tag name:(const std::string &)name args:(const folly::dynamic &)args;

- (nullable NSView<OneMacosComponentView> *)findComponentViewWithTag:(facebook::react::Tag)tag;

@end

NS_ASSUME_NONNULL_END
