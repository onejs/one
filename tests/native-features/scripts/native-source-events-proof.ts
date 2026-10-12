import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// compile the actual bridge against a strict event-emitter boundary. this
// isolates dynamic channel registration from the full app and js runtime.
const root = resolve(import.meta.dirname, '../../..')
const scratch = mkdtempSync(join(tmpdir(), 'one-source-events-'))
try {
  mkdirSync(join(scratch, 'React'))
  writeFileSync(join(scratch, 'React/RCTEventEmitter.h'), `
#import <Foundation/Foundation.h>
#define RCT_EXPORT_MODULE(name)
#define RCT_EXPORT_METHOD(method) - (void)method
@interface RCTEventEmitter : NSObject
@property(nonatomic) NSUInteger listenerCount;
@property(nonatomic, strong) NSMutableArray *received;
- (NSArray<NSString *> *)supportedEvents;
- (void)addListener:(NSString *)name;
- (void)removeListeners:(double)count;
- (void)sendEventWithName:(NSString *)name body:(id)body;
@end
`)
  writeFileSync(join(scratch, 'probe.m'), `
#import <React/RCTEventEmitter.h>
#import "OneNativeSourceEventsBridge.h"
@implementation RCTEventEmitter
- (instancetype)init { if (self = [super init]) self.received = [NSMutableArray array]; return self; }
- (NSArray *)supportedEvents { return @[]; }
- (void)addListener:(NSString *)name {
  if (![[self supportedEvents] containsObject:name])
    [NSException raise:@"unsupported subscription" format:@"%@", name];
  self.listenerCount++;
}
- (void)removeListeners:(double)count { self.listenerCount -= (NSUInteger)count; }
- (void)sendEventWithName:(NSString *)name body:(id)body {
  if (![[self supportedEvents] containsObject:name])
    [NSException raise:@"unsupported send" format:@"%@", name];
  if (self.listenerCount) [self.received addObject:@[name, body]];
}
@end
int main(void) { @autoreleasepool {
  RCTEventEmitter *bridge = [NSClassFromString(@"OneNativeSourceEvents") new];
  if (!bridge) return 1;
  NSString *first = @"OneNativeSource.atlas.Clock.onTick";
  NSString *second = @"OneNativeSource.other.Clock.onTick";
  @try {
    [bridge addListener:first];
    [bridge addListener:second];
    if (bridge.listenerCount != 2) return 2;
    OneNativeSourceSendEvent(first, @"[1]");
    OneNativeSourceSendEvent(second, @"[2]");
    OneNativeSourceSendEvent(first, @"{}");
    if (![bridge.received isEqual:@[@[first, @[@1]], @[second, @[@2]]]]) return 3;
    [bridge removeListeners:2];
    OneNativeSourceSendEvent(first, @"[3]");
    if (bridge.received.count != 2 || bridge.listenerCount != 0) return 4;
    puts("PASS native source events: subscribe before send, isolated channels, invalid payload, unsubscribe");
  } @catch (NSException *error) {
    fprintf(stderr, "%s: %s\\n", error.name.UTF8String, error.reason.UTF8String);
    return 5;
  }
} return 0; }
`)
  const executable = join(scratch, 'probe')
  const bridge = join(root, 'packages/one/ios/OneNativeSourceEventsBridge.m')
  // compile the checked-in implementation, never a copied rewrite of it.
  execFileSync('clang', ['-fobjc-arc', '-framework', 'Foundation', '-I', scratch,
    '-I', join(root, 'packages/one/ios'), bridge, join(scratch, 'probe.m'), '-o', executable], { stdio: 'inherit' })
  execFileSync(executable, { stdio: 'inherit' })
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
