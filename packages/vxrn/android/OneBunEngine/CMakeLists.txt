cmake_minimum_required(VERSION 3.22.1)

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
  return()
endif()
if(NOT ANDROID_ABI STREQUAL "arm64-v8a")
  message(FATAL_ERROR "One's Bun engine requires arm64-v8a")
endif()

set(BUN_RUNTIME "${CMAKE_CURRENT_LIST_DIR}/../../ios/OneBunEngine")
add_library(onebunengine SHARED BunInstance.cpp "${BUN_RUNTIME}/BunRuntime.cpp")
target_compile_features(onebunengine PRIVATE cxx_std_20)
target_compile_reactnative_options(onebunengine PRIVATE)
target_include_directories(onebunengine PRIVATE
  "${BUN_RUNTIME}"
  "${ONE_BUN_ENGINE_DIR}/android/include"
  "${REACT_ANDROID_DIR}/src/main/jni")
target_link_directories(onebunengine PRIVATE "${ONE_BUN_ENGINE_DIR}/android/${ANDROID_ABI}")
target_link_libraries(onebunengine PRIVATE ReactAndroid::reactnative ReactAndroid::jsi fbjni::fbjni common_flags bun log)
target_link_options(onebunengine PRIVATE "-Wl,-z,max-page-size=16384")
