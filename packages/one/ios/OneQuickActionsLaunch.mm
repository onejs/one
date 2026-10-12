#import <UIKit/UIKit.h>
#import <objc/runtime.h>

#import "One-Swift.h"

@interface OneQuickActionsLaunch : NSObject
@end

static NSMutableSet<Class> *OneQuickActionsHookedScenes;

static void OneQuickActionsHookScene(Class cls)
{
  if (!cls || [OneQuickActionsHookedScenes containsObject:cls]) return;
  [OneQuickActionsHookedScenes addObject:cls];

  SEL connect = @selector(scene:willConnectToSession:options:);
  Method connectMethod = class_getInstanceMethod(cls, connect);
  IMP originalConnect = connectMethod ? method_getImplementation(connectMethod) : NULL;
  IMP hookedConnect = imp_implementationWithBlock(^(id delegate, UIScene *scene,
                                                     UISceneSession *session,
                                                     UISceneConnectionOptions *options) {
    if (options.shortcutItem) {
      [OneQuickActionsCoordinator recordInitialAction:options.shortcutItem.type];
    }
    if (originalConnect) {
      ((void (*)(id, SEL, UIScene *, UISceneSession *, UISceneConnectionOptions *))originalConnect)(
          delegate, connect, scene, session, options);
    }
  });
  class_replaceMethod(cls, connect, hookedConnect,
                      connectMethod ? method_getTypeEncoding(connectMethod) : "v@:@@@");

  SEL action = @selector(windowScene:performActionForShortcutItem:completionHandler:);
  Method actionMethod = class_getInstanceMethod(cls, action);
  IMP originalAction = actionMethod ? method_getImplementation(actionMethod) : NULL;
  IMP hookedAction = imp_implementationWithBlock(^(id delegate, UIWindowScene *scene,
                                                    UIApplicationShortcutItem *item,
                                                    void (^completion)(BOOL)) {
    [OneQuickActionsCoordinator recordWarmAction:item.type];
    if (originalAction) {
      ((void (*)(id, SEL, UIWindowScene *, UIApplicationShortcutItem *, void (^)(BOOL)))originalAction)(
          delegate, action, scene, item, completion);
    } else {
      completion(YES);
    }
  });
  class_replaceMethod(cls, action, hookedAction,
                      actionMethod ? method_getTypeEncoding(actionMethod) : "v@:@@@?");
}

static void OneQuickActionsHookAppDelegate(Class cls)
{
  if (!cls) return;
  SEL action = @selector(application:performActionForShortcutItem:completionHandler:);
  Method method = class_getInstanceMethod(cls, action);
  IMP original = method ? method_getImplementation(method) : NULL;
  IMP hooked = imp_implementationWithBlock(^(id delegate, UIApplication *application,
                                              UIApplicationShortcutItem *item,
                                              void (^completion)(BOOL)) {
    [OneQuickActionsCoordinator recordWarmAction:item.type];
    if (original) {
      ((void (*)(id, SEL, UIApplication *, UIApplicationShortcutItem *, void (^)(BOOL)))original)(
          delegate, action, application, item, completion);
    } else {
      completion(YES);
    }
  });
  class_replaceMethod(cls, action, hooked, method ? method_getTypeEncoding(method) : "v@:@@@?");
}

@implementation OneQuickActionsLaunch

+ (void)load
{
  OneQuickActionsHookedScenes = [NSMutableSet new];
  [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidFinishLaunchingNotification
                                                    object:nil
                                                     queue:nil
                                                usingBlock:^(NSNotification *note) {
    NSDictionary *manifest = [NSBundle.mainBundle objectForInfoDictionaryKey:@"UIApplicationSceneManifest"];
    NSDictionary *configurations = manifest[@"UISceneConfigurations"];
    NSArray *applicationScenes = configurations[@"UIWindowSceneSessionRoleApplication"];
    if (manifest) {
      for (NSDictionary *configuration in applicationScenes) {
        NSString *name = configuration[@"UISceneDelegateClassName"];
        if (name) OneQuickActionsHookScene(NSClassFromString(name));
      }

      // hosts may return a scene delegate class from their app delegate instead
      // of declaring it in the manifest. install its hook before UIKit connects it.
      Class appClass = [[UIApplication sharedApplication].delegate class];
      SEL selector = @selector(application:configurationForConnectingSceneSession:options:);
      Method method = appClass ? class_getInstanceMethod(appClass, selector) : NULL;
      if (method) {
        IMP original = method_getImplementation(method);
        IMP hooked = imp_implementationWithBlock(^(id delegate, UIApplication *application,
                                                   UISceneSession *session,
                                                   UISceneConnectionOptions *options) {
          UISceneConfiguration *configuration =
              ((UISceneConfiguration *(*)(id, SEL, UIApplication *, UISceneSession *, UISceneConnectionOptions *))original)(
                  delegate, selector, application, session, options);
          OneQuickActionsHookScene(configuration.delegateClass);
          return configuration;
        });
        class_replaceMethod(appClass, selector, hooked, method_getTypeEncoding(method));
      }
      return;
    }

    UIApplicationShortcutItem *item = note.userInfo[UIApplicationLaunchOptionsShortcutItemKey];
    if (item) [OneQuickActionsCoordinator recordInitialAction:item.type];
    OneQuickActionsHookAppDelegate([[UIApplication sharedApplication].delegate class]);
  }];
}

@end
