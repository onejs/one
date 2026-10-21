#import <AppKit/AppKit.h>

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/mounting/MountingCoordinator.h>

#import "OneMacosComponentView.h"

NS_ASSUME_NONNULL_BEGIN

// Applies Fabric mutations to AppKit views on the main thread. Component
// descriptors and view classes register in one place so the two stay paired.
@interface OneMacosMountingManager : NSObject

- (void)setContextContainer:(std::shared_ptr<const facebook::react::ContextContainer>)contextContainer;

+ (std::shared_ptr<facebook::react::ComponentDescriptorProviderRegistry>)componentDescriptorProviderRegistry;
+ (BOOL)hasComponentNamed:(const std::string &)name;

- (void)attachSurface:(facebook::react::SurfaceId)surfaceId toView:(NSView *)view;
- (void)detachSurface:(facebook::react::SurfaceId)surfaceId fromView:(NSView *)view;

// safe from any thread; the work happens on the main thread
- (void)scheduleTransaction:(std::shared_ptr<const facebook::react::MountingCoordinator>)mountingCoordinator;

- (nullable NSView<OneMacosComponentView> *)findComponentViewWithTag:(facebook::react::Tag)tag;

@end

NS_ASSUME_NONNULL_END
