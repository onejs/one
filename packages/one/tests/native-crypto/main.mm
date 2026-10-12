#import <UIKit/UIKit.h>
#include <hermes/hermes.h>
#include <NitroModules/InstallNitro.hpp>
#include <NitroModules/Dispatcher.hpp>
#include <NitroModules/HybridObjectRegistry.hpp>
#include "HybridOneCrypto.hpp"

using namespace facebook;
using namespace margelo::nitro;
static std::unique_ptr<facebook::hermes::HermesRuntime> runtime;
class MainDispatcher : public Dispatcher {
 public:
  void runSync(std::function<void()>&& fn) override { fn(); }
  void runAsync(std::function<void()>&& fn) override {
    auto task = std::make_shared<std::function<void()>>(std::move(fn));
    dispatch_async(dispatch_get_main_queue(), ^{
      try { (*task)(); runtime->drainMicrotasks(); }
      catch (const std::exception& e) { NSLog(@"CRYPTO_PROBE callback failed: %s", e.what()); }
    });
  }
};
@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>
@property(nonatomic,strong) UIWindow *window;
@end
@implementation SceneDelegate
- (void)scene:(UIScene*)scene willConnectToSession:(UISceneSession*)session options:(UISceneConnectionOptions*)options {
  self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene*)scene];
  self.window.rootViewController = [UIViewController new];
  [self.window makeKeyAndVisible];
}
@end
@interface AppDelegate : UIResponder <UIApplicationDelegate>
@property(nonatomic,strong) UIWindow *window;
@end
@implementation AppDelegate
- (BOOL)application:(UIApplication*)app didFinishLaunchingWithOptions:(NSDictionary*)options {
  [[NSFileManager defaultManager] removeItemAtPath:[NSHomeDirectory() stringByAppendingPathComponent:@"Documents/result.json"] error:nil];
  runtime = facebook::hermes::makeHermesRuntime(::hermes::vm::RuntimeConfig::Builder().withMicrotaskQueue(true).build());
  runtime->global().setProperty(*runtime, "global", runtime->global());
  HybridObjectRegistry::registerHybridObjectConstructor("OneCrypto", []{ return std::make_shared<margelo::nitro::one::HybridOneCrypto>(); });
  install(*runtime, std::make_shared<MainDispatcher>());
  runtime->global().setProperty(*runtime, "report", jsi::Function::createFromHostFunction(*runtime, jsi::PropNameID::forAscii(*runtime,"report"),1,[](jsi::Runtime& rt,const jsi::Value&,const jsi::Value* args,size_t){
    auto str = args[0].asString(rt).utf8(rt);
    NSString* path = [NSHomeDirectory() stringByAppendingPathComponent:@"Documents/result.json"];
    [@(str.c_str()) writeToFile:path atomically:YES encoding:NSUTF8StringEncoding error:nil];
    NSLog(@"CRYPTO_PROBE %s", str.c_str());
    return jsi::Value::undefined();
  }));
  NSString* source = [NSString stringWithContentsOfFile:[[NSBundle mainBundle] pathForResource:@"probe" ofType:@"js"] encoding:NSUTF8StringEncoding error:nil];
  try {
    runtime->evaluateJavaScript(std::make_shared<jsi::StringBuffer>(source.UTF8String),"probe.js");
    runtime->drainMicrotasks();
  } catch (const std::exception& e) { NSLog(@"CRYPTO_PROBE failed: %s",e.what()); }
  return YES;
}
@end
int main(int argc,char** argv) { @autoreleasepool { return UIApplicationMain(argc,argv,nil,NSStringFromClass(AppDelegate.class)); } }
