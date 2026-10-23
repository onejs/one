#pragma once

#import <AppKit/AppKit.h>

#include <folly/dynamic.h>

#include <string>

NS_ASSUME_NONNULL_BEGIN

// A validated `{ bindings, menus }` config from AppCommands.configure. Building
// one touches no AppKit state, so it may happen on the JS thread.
@interface OneMacosAppCommandConfig : NSObject
@property (nonatomic, readonly) NSSet<NSString *> *commandIds;
@end

// nil, with `error` set, for a config the menu bar cannot represent
OneMacosAppCommandConfig *_Nullable OneMacosParseAppCommands(const folly::dynamic &config, std::string &error);

// A root view runs the commands its window's runtime configured.
@protocol OneMacosAppCommandTarget <NSObject>
- (nullable OneMacosAppCommandConfig *)oneMacosAppCommandConfig;
- (BOOL)oneMacosCanPerformAppCommand:(NSString *)commandId;
- (void)oneMacosPerformAppCommand:(NSString *)commandId;
@end

// main thread. Shows the commands of the current root, the key window's or else
// the frontmost one's, in the menu bar. Call it when a root's config changes;
// window changes and SwiftUI menu rebuilds are followed on their own. Every
// other menu item, such as Edit, Window and Services, stays in place.
void OneMacosUpdateAppCommands(void);

// main thread; the registry holds views weakly
void OneMacosRegisterAppCommandTarget(NSView<OneMacosAppCommandTarget> *view);

NS_ASSUME_NONNULL_END
