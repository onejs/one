#pragma once
#import <AppKit/AppKit.h>

@interface OneMacosTextInputHostView : NSView
@property(nonatomic, copy) void (^onEvent)(NSString* name, NSDictionary* payload);
@property(nonatomic) NSEdgeInsets contentInsets;
@property(nonatomic, readonly) NSString* text;
@property(nonatomic, readonly) NSInteger eventCount;
- (void)configure:(NSDictionary*)props attributes:(NSDictionary*)attributes;
- (void)applyText:(NSString*)text eventCount:(NSInteger)eventCount;
- (void)command:(NSString*)name args:(NSArray*)args;
@end
