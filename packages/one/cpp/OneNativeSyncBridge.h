#pragma once

// C++-only: the pod module map also compiles this header in C, where the
// includes below do not exist. every consumer is .cpp/.mm.
#ifdef __cplusplus
#include <cstdint>
#include <jsi/jsi.h>

// trampolines into the Swift registry, implemented in ios/OneNativeSyncModule.mm.
int32_t OneNativeSyncCreate(facebook::jsi::Runtime &runtime, const facebook::jsi::Value &initial);
void OneNativeSyncRelease(int32_t stateId);
facebook::jsi::Value OneNativeSyncGet(facebook::jsi::Runtime &runtime, int32_t stateId);
void OneNativeSyncSet(
    facebook::jsi::Runtime &runtime,
    int32_t stateId,
    const facebook::jsi::Value &value);
// a write that bypassed every host object (user typing in a bound view): the
// generated component view calls this so the JSI listener still fires.
void OneNativeSyncDidSetExternally(int32_t stateId);
#endif
