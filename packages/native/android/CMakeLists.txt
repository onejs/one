cmake_minimum_required(VERSION 3.22)
project(OneNativeSync CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(PACKAGE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/..)
set(CPP_DIR ${PACKAGE_DIR}/cpp)
set(JNI_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src/main/cpp)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(react-native-worklets REQUIRED CONFIG)

# the JSI host object is shared with iOS; only the registry trampolines differ
# (Swift there, JNI here).
add_library(
  onenativesync SHARED
  ${JNI_DIR}/OneNativeSyncJni.cpp
  ${CPP_DIR}/OneNativeSyncHost.cpp)

target_include_directories(onenativesync PRIVATE ${CPP_DIR} ${JNI_DIR})

target_link_libraries(
  onenativesync
  fbjni::fbjni
  ReactAndroid::jsi
  react-native-worklets::worklets
  android
  log)
