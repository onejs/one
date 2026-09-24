cmake_minimum_required(VERSION 3.22)
project(VxrnNative CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(PACKAGE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/..)
set(CPP_DIR ${PACKAGE_DIR}/cpp)
set(JNI_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src/main/cpp)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(react-native-worklets REQUIRED CONFIG)

# one library for the package's C++: the sync-state JSI host object (shared
# with iOS; only the registry trampolines differ, Swift there, JNI here) and
# the nitrogen-generated Nitro hybrid objects. JNI_OnLoad in
# OneNativeSyncJni.cpp registers both.
add_library(
  VxrnNative SHARED
  ${JNI_DIR}/OneNativeSyncJni.cpp
  ${CPP_DIR}/OneNativeSyncHost.cpp)

target_include_directories(VxrnNative PRIVATE ${CPP_DIR} ${JNI_DIR})

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/VxrnNative+autolinking.cmake)

target_link_libraries(
  VxrnNative
  fbjni::fbjni
  ReactAndroid::jsi
  ReactAndroid::reactnative
  react-native-worklets::worklets
  android
  log)
