#import "OneNativeNetwork.h"

@import Network;

// connection state matching expo-network: type plus connected and reachable
// flags, from NWPathMonitor.
@implementation OneNativeNetwork {
  NWPathMonitor *_monitor;
  NSUInteger _listenerCount;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"OneNativeNetworkStateChanged" ];
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName)
{
  // the emitter requires this; the monitor lifecycle flows through
  // startMonitoring instead.
}

RCT_EXPORT_METHOD(removeListeners:(double)count)
{
}

+ (NSDictionary *)stateForPath:(NWPath *)path
{
  NSString *type = @"UNKNOWN";
  BOOL connected = path.status != NWPathStatusUnsatisfied;
  if (path.status == NWPathStatusUnsatisfied) {
    type = @"NONE";
  } else if ([path usesInterfaceType:nw_interface_type_cellular]) {
    type = @"CELLULAR";
  } else if ([path usesInterfaceType:nw_interface_type_wifi]) {
    type = @"WIFI";
  } else if ([path usesInterfaceType:nw_interface_type_wired]) {
    type = @"ETHERNET";
  } else if ([path usesInterfaceType:nw_interface_type_other]) {
    type = @"OTHER";
  }
  return @{
    @"type" : type,
    @"isConnected" : @(connected),
    // satisfied means a usable route exists; satisfiable (captive portal)
    // is connected without proven reachability.
    @"isInternetReachable" : @(path.status == NWPathStatusSatisfied),
  };
}

RCT_EXPORT_METHOD(getNetworkState:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  NWPathMonitor *monitor = [[NWPathMonitor alloc] init];
  dispatch_queue_t queue = dispatch_queue_create("dev.onejs.network", DISPATCH_QUEUE_SERIAL);
  dispatch_semaphore_t ready = dispatch_semaphore_create(0);
  __block NWPath *firstPath = nil;
  [monitor setPathUpdateHandler:^(NWPath *path) {
    if (firstPath == nil) {
      firstPath = path;
      dispatch_semaphore_signal(ready);
    }
  }];
  [monitor startWithQueue:queue];
  // bridge methods run off the main queue, so a bounded wait for the first
  // path keeps the read synchronous without blocking ui.
  if (dispatch_semaphore_wait(ready, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC)) != 0) {
    [monitor cancel];
    reject(@"ERR_NETWORK_TIMEOUT", @"Timed out waiting for the network path.", nil);
    return;
  }
  [monitor cancel];
  resolve([OneNativeNetwork stateForPath:firstPath]);
}

RCT_EXPORT_METHOD(startMonitoring)
{
  @synchronized(self) {
    _listenerCount += 1;
    if (_listenerCount > 1 || _monitor != nil) {
      return;
    }
    NWPathMonitor *monitor = [[NWPathMonitor alloc] init];
    _monitor = monitor;
    __weak typeof(self) weakSelf = self;
    [monitor setPathUpdateHandler:^(NWPath *path) {
      [weakSelf sendEventWithName:@"OneNativeNetworkStateChanged"
                             body:[OneNativeNetwork stateForPath:path]];
    }];
    [monitor startWithQueue:dispatch_get_main_queue()];
  }
}

RCT_EXPORT_METHOD(stopMonitoring)
{
  @synchronized(self) {
    if (_listenerCount == 0) {
      return;
    }
    _listenerCount -= 1;
    if (_listenerCount == 0) {
      [_monitor cancel];
      _monitor = nil;
    }
  }
}

@end
