#import "OneNativeNetwork.h"

@import Network;

// connection state matching expo-network: type plus connected and reachable
// flags, from a path monitor. Network.framework exposes no ObjC monitor
// class (NWPathMonitor is Swift-only), so this uses the C path api.
@implementation OneNativeNetwork {
  nw_path_monitor_t _monitor;
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
  // super keeps the emitter's listener count; without it every event warns
  // and never reaches js. the monitor lifecycle flows through
  // startMonitoring instead.
  [super addListener:eventName];
}

RCT_EXPORT_METHOD(removeListeners:(double)count)
{
  [super removeListeners:count];
}

+ (NSDictionary *)stateForPath:(nw_path_t)path
{
  // expo-network mapping: only a satisfied path is connected, anything
  // else is none, and reachability follows connected. ios never reports
  // the android-only other, vpn, or wimax types.
  BOOL connected = nw_path_get_status(path) == nw_path_status_satisfied;
  if (!connected) {
    return @{
      @"type" : @"NONE",
      @"isConnected" : @NO,
      @"isInternetReachable" : @NO,
    };
  }
  NSString *type = @"UNKNOWN";
  if (nw_path_uses_interface_type(path, nw_interface_type_cellular)) {
    type = @"CELLULAR";
  } else if (nw_path_uses_interface_type(path, nw_interface_type_wifi)) {
    type = @"WIFI";
  } else if (nw_path_uses_interface_type(path, nw_interface_type_wired)) {
    type = @"ETHERNET";
  }
  return @{
    @"type" : type,
    @"isConnected" : @YES,
    @"isInternetReachable" : @YES,
  };
}

RCT_EXPORT_METHOD(getNetworkState:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
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
    reject(@"ERR_NETWORK_TIMEOUT", @"Timed out waiting for the network path.", nil);
    return;
  }
  nw_path_monitor_cancel(monitor);
  NSDictionary *state = [OneNativeNetwork stateForPath:firstPath];
  resolve(state);
}

RCT_EXPORT_METHOD(startMonitoring)
{
  @synchronized(self) {
    _listenerCount += 1;
    if (_listenerCount > 1 || _monitor != NULL) {
      return;
    }
    nw_path_monitor_t monitor = nw_path_monitor_create();
    _monitor = monitor;
    __weak typeof(self) weakSelf = self;
    nw_path_monitor_set_update_handler(monitor, ^(nw_path_t path) {
      [weakSelf sendEventWithName:@"OneNativeNetworkStateChanged"
                             body:[OneNativeNetwork stateForPath:path]];
    });
    nw_path_monitor_set_queue(monitor, dispatch_get_main_queue());
    nw_path_monitor_start(monitor);
  }
}

RCT_EXPORT_METHOD(stopMonitoring)
{
  @synchronized(self) {
    if (_listenerCount == 0) {
      return;
    }
    _listenerCount -= 1;
    if (_listenerCount == 0 && _monitor != NULL) {
      nw_path_monitor_cancel(_monitor);
      _monitor = NULL;
    }
  }
}

@end
