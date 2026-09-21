#import "OneNativeNetwork.h"

@import Network;

// connection state matching expo-network: type plus connected and reachable
// flags, from a path monitor. Network.framework exposes no ObjC monitor
// class (NWPathMonitor is Swift-only), so this uses the C path api.
@implementation OneNativeNetwork {
  nw_path_monitor_t _monitor;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"oneNativeNetworkStateChanged" ];
}

+ (NSDictionary *)stateForPath:(nw_path_t)path
{
  // expo-network mapping: only a satisfied path is connected, anything
  // else is none, and reachability follows connected. ios never reports
  // the android-only other, vpn, or wimax types. enums are lowercase
  // string unions, so expo's screaming values become lowercase.
  BOOL connected = nw_path_get_status(path) == nw_path_status_satisfied;
  if (!connected) {
    return @{
      @"type" : @"none",
      @"isConnected" : @NO,
      @"isInternetReachable" : @NO,
    };
  }
  NSString *type = @"unknown";
  if (nw_path_uses_interface_type(path, nw_interface_type_cellular)) {
    type = @"cellular";
  } else if (nw_path_uses_interface_type(path, nw_interface_type_wifi)) {
    type = @"wifi";
  } else if (nw_path_uses_interface_type(path, nw_interface_type_wired)) {
    type = @"ethernet";
  }
  return @{
    @"type" : type,
    @"isConnected" : @YES,
    @"isInternetReachable" : @YES,
  };
}

RCT_EXPORT_METHOD(getState:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  nw_path_monitor_t monitor = nw_path_monitor_create();
  dispatch_queue_t queue = dispatch_queue_create("dev.onejs.network", DISPATCH_QUEUE_SERIAL);
  dispatch_semaphore_t ready = dispatch_semaphore_create(0);
  __block nw_path_t firstPath = NULL;
  nw_path_monitor_set_update_handler(monitor, ^(nw_path_t path) {
    if (firstPath == NULL) {
      firstPath = path;
      dispatch_semaphore_signal(ready);
    }
  });
  nw_path_monitor_set_queue(monitor, queue);
  nw_path_monitor_start(monitor);
  // bridge methods run off the main queue, so a bounded wait for the first
  // path keeps the read synchronous without blocking ui.
  if (dispatch_semaphore_wait(ready, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC)) != 0) {
    nw_path_monitor_cancel(monitor);
    reject(@"E_NETWORK_TIMEOUT", @"Network.getState: timed out waiting for the network path.", nil);
    return;
  }
  nw_path_monitor_cancel(monitor);
  NSDictionary *state = [OneNativeNetwork stateForPath:firstPath];
  resolve(state);
}

- (void)startObserving
{
  // the emitter calls this on the first listener, so the monitor starts
  // behind the subscription and its first path is never dropped.
  if (_monitor != NULL) {
    return;
  }
  nw_path_monitor_t monitor = nw_path_monitor_create();
  _monitor = monitor;
  __weak typeof(self) weakSelf = self;
  nw_path_monitor_set_update_handler(monitor, ^(nw_path_t path) {
    [weakSelf sendEventWithName:@"oneNativeNetworkStateChanged"
                           body:[OneNativeNetwork stateForPath:path]];
  });
  nw_path_monitor_set_queue(monitor, dispatch_get_main_queue());
  nw_path_monitor_start(monitor);
}

- (void)stopObserving
{
  if (_monitor != NULL) {
    nw_path_monitor_cancel(_monitor);
    _monitor = NULL;
  }
}

@end
