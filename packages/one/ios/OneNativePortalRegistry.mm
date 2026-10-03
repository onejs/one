#import "OneNativePortalRegistry.h"
@implementation OneNativePortalRegistry {
  NSMapTable<NSString *, OneNativePortalHostViewComponentView *> *_hosts;
  NSPointerArray *_portals;
}
+ (instancetype)shared {
  static OneNativePortalRegistry *registry;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ registry = [self new]; });
  return registry;
}
- (instancetype)init {
  if (self = [super init]) {
    _hosts = [NSMapTable strongToWeakObjectsMapTable];
    _portals = [NSPointerArray weakObjectsPointerArray];
  }
  return self;
}
- (void)addPortal:(OneNativePortalViewComponentView *)portal {
  [_portals addPointer:(__bridge void *)portal];
  [self refresh];
}
- (void)removePortal:(OneNativePortalViewComponentView *)portal {
  for (NSUInteger i = 0; i < _portals.count; i++) {
    if ([_portals pointerAtIndex:i] == (__bridge void *)portal) {
      [_portals removePointerAtIndex:i]; break;
    }
  }
  [self refresh];
}
- (void)addHost:(OneNativePortalHostViewComponentView *)host {
  if (host.hostName) [_hosts setObject:host forKey:host.hostName];
  [self refresh];
}
- (void)removeHost:(OneNativePortalHostViewComponentView *)host {
  if (host.hostName && [_hosts objectForKey:host.hostName] == host)
    [_hosts removeObjectForKey:host.hostName];
  [self refresh];
}
- (BOOL)isReplaced:(OneNativePortalViewComponentView *)portal {
  if (!portal.portalName.length) return NO;
  BOOL seen = NO;
  for (NSUInteger i = 0; i < _portals.count; i++) {
    OneNativePortalViewComponentView *other = (__bridge id)[_portals pointerAtIndex:i];
    if (other == portal) { seen = YES; continue; }
    if (seen && [other.portalName isEqual:portal.portalName]) return YES;
  }
  return NO;
}
- (OneNativePortalHostViewComponentView *)hostForPortal:(OneNativePortalViewComponentView *)portal {
  OneNativePortalHostViewComponentView *host = portal.hostName ? [_hosts objectForKey:portal.hostName] : nil;
  return host.window ? host : nil;
}
- (void)publishLayouts {
  for (NSUInteger i = 0; i < _portals.count; i++)
    [(__bridge OneNativePortalViewComponentView *)[_portals pointerAtIndex:i] publishLayout];
}
- (void)refresh {
  [_portals compact];
  for (NSUInteger i = 0; i < _portals.count; i++) {
    OneNativePortalViewComponentView *portal = (__bridge id)[_portals pointerAtIndex:i];
    [portal refreshTarget];
  }
}
@end
