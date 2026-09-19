#pragma once

#include <cstdint>
#include <jsi/jsi.h>

// trampolines into the Swift registry, implemented in ios/OneNativeSyncModule.mm.
int32_t OneNativeSyncCreate(jsi::Runtime &runtime, const jsi::Value &initial);
void OneNativeSyncRelease(int32_t stateId);
jsi::Value OneNativeSyncGet(jsi::Runtime &runtime, int32_t stateId);
void OneNativeSyncSet(jsi::Runtime &runtime, int32_t stateId, const jsi::Value &value);
// a write that bypassed every host object (user typing in a bound view): the
// generated component view calls this so the JSI listener still fires.
void OneNativeSyncDidSetExternally(int32_t stateId);
