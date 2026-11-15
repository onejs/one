#import "OneMacosBlobStore.h"

@implementation OneMacosBlobStore {
  NSMutableDictionary<NSString *, NSData *> *_blobs;
}
- (instancetype)init
{
  if ((self = [super init])) _blobs = [NSMutableDictionary new];
  return self;
}
- (void)store:(NSData *)data identifier:(NSString *)identifier
{
  @synchronized(self) { _blobs[identifier] = [data copy]; }
}
- (NSData *)resolve:(NSDictionary *)blob
{
  if (![blob isKindOfClass:NSDictionary.class] || ![blob[@"blobId"] isKindOfClass:NSString.class]) return nil;
  @synchronized(self) {
    NSData *data = _blobs[blob[@"blobId"]];
    NSInteger offset = [blob[@"offset"] integerValue];
    NSInteger size = blob[@"size"] ? [blob[@"size"] integerValue] : -1;
    if (!data || offset < 0 || (NSUInteger)offset > data.length || size < -1) return nil;
    NSUInteger length = size == -1 ? data.length - offset : (NSUInteger)size;
    if (length > data.length - offset) return nil;
    return [data subdataWithRange:NSMakeRange(offset, length)];
  }
}
- (void)remove:(NSString *)identifier
{
  @synchronized(self) { [_blobs removeObjectForKey:identifier]; }
}
- (BOOL)createFromParts:(NSArray *)parts identifier:(NSString *)identifier
{
  NSMutableData *data = [NSMutableData new];
  for (NSDictionary *part in parts) {
    NSData *bytes;
    if ([part[@"type"] isEqual:@"string"]) {
      bytes = [part[@"data"] dataUsingEncoding:NSUTF8StringEncoding];
    } else if ([part[@"type"] isEqual:@"blob"]) {
      bytes = [self resolve:part[@"data"]];
    } else {
      return NO;
    }
    if (!bytes) return NO;
    [data appendData:bytes];
  }
  [self store:data identifier:identifier];
  return YES;
}
@end
