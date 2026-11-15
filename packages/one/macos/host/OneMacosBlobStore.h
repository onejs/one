#import <Foundation/Foundation.h>

// one store per JS runtime, shared by Networking, BlobModule and FileReaderModule.
@interface OneMacosBlobStore : NSObject
- (void)store:(NSData *)data identifier:(NSString *)identifier;
- (NSData *)resolve:(NSDictionary *)blob;
- (void)remove:(NSString *)identifier;
- (BOOL)createFromParts:(NSArray *)parts identifier:(NSString *)identifier;
@end
