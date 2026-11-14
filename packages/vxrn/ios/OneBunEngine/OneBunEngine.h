#pragma once

#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// whether the app's main.jsbundle stands for the program compiled into Bun.framework
bool one_bun_engine_has_compiled_program(void);

// a JSRuntimeFactoryRef that runs the app's bun-compiled program
void *jsrt_create_bun_factory(void);

#ifdef __cplusplus
}
#endif
