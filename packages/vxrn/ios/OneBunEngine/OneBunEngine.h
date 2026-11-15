#pragma once

#import <Foundation/Foundation.h>

#ifdef __cplusplus
extern "C" {
#endif

// whether the bundle the host boots stands for the program compiled into
// Bun.framework. an over-the-air update ships hermes bytecode and boots on hermes
BOOL one_bun_engine_runs_bundle(NSURL *_Nullable bundleURL);

// a JSRuntimeFactoryRef that runs the app's bun-compiled program
void *jsrt_create_bun_factory(void);

#ifdef __cplusplus
}
#endif
