cmake_minimum_required(VERSION 3.22)
project(OneZero LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
add_library(one-zero STATIC Client.cpp)
target_include_directories(one-zero PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_compile_options(one-zero PRIVATE -Wall -Wextra -Werror)
if(OP_SQLITE_ROOT)
  add_library(one-zero-sqlite STATIC ${OP_SQLITE_ROOT}/cpp/sqlite3.c)
  target_include_directories(one-zero-sqlite PUBLIC ${OP_SQLITE_ROOT}/cpp)
  target_link_libraries(one-zero PUBLIC one-zero-sqlite)
else()
  find_package(SQLite3 REQUIRED)
  target_link_libraries(one-zero PUBLIC SQLite::SQLite3)
endif()
add_executable(one-zero-driver ../../tests/zero-native/driver.cpp)
target_link_libraries(one-zero-driver PRIVATE one-zero)

if(NITRO_ROOT AND RN_ROOT AND HERMES_ROOT)
  set(HERMES_FRAMEWORK "${HERMES_ROOT}/destroot/Library/Frameworks/macosx/hermesvm.framework" CACHE PATH "Hermes framework for the target platform")
  enable_language(OBJCXX)
  file(GLOB_RECURSE NITRO_SOURCES CONFIGURE_DEPENDS ${NITRO_ROOT}/cpp/*.cpp)
  list(FILTER NITRO_SOURCES EXCLUDE REGEX "/views/")
  file(GLOB_RECURSE NITRO_HEADERS ${NITRO_ROOT}/cpp/*.hpp ${NITRO_ROOT}/ios/*.hpp)
  file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/include/NitroModules)
  foreach(HEADER ${NITRO_HEADERS})
    get_filename_component(HEADER_NAME ${HEADER} NAME)
    file(CREATE_LINK ${HEADER} ${CMAKE_CURRENT_BINARY_DIR}/include/NitroModules/${HEADER_NAME} SYMBOLIC)
  endforeach()
  file(GLOB NITRO_DIRS LIST_DIRECTORIES true ${NITRO_ROOT}/cpp/* ${NITRO_ROOT}/ios/*)
  add_executable(one-zero-nitro
    ../../tests/zero-native/nitro-main.mm
    ../HybridOneZero.cpp
    ../../nitrogen/generated/shared/c++/HybridOneZeroSpec.cpp
    ${NITRO_SOURCES}
    ${NITRO_ROOT}/ios/platform/NitroLogger.cpp
    ${NITRO_ROOT}/ios/platform/ThreadUtils.cpp
    ${NITRO_ROOT}/ios/threading/UIThreadDispatcher.cpp
    ${RN_ROOT}/ReactCommon/jsi/jsi/jsi.cpp)
  target_include_directories(one-zero-nitro PRIVATE
    ${CMAKE_CURRENT_BINARY_DIR}/include ${CMAKE_CURRENT_BINARY_DIR}/include/NitroModules
    ${NITRO_DIRS} ${NITRO_ROOT}/cpp ${RN_ROOT}/ReactCommon ${RN_ROOT}/ReactCommon/jsi
    ${HERMES_ROOT}/destroot/include .. ../../nitrogen/generated/shared/c++)
  target_compile_options(one-zero-nitro PRIVATE -fblocks)
  target_link_libraries(one-zero-nitro PRIVATE one-zero
    "-framework Foundation" "${HERMES_FRAMEWORK}")
  if(CMAKE_SYSTEM_NAME STREQUAL "iOS")
    set_target_properties(one-zero-nitro PROPERTIES BUILD_RPATH "@executable_path/Frameworks")
    add_custom_command(TARGET one-zero-nitro POST_BUILD COMMAND ${CMAKE_COMMAND} -E copy_directory
      "${HERMES_FRAMEWORK}" "$<TARGET_BUNDLE_DIR:one-zero-nitro>/Frameworks/hermesvm.framework")
  else()
    get_filename_component(HERMES_FRAMEWORK_DIRECTORY "${HERMES_FRAMEWORK}" DIRECTORY)
    set_target_properties(one-zero-nitro PROPERTIES BUILD_RPATH "${HERMES_FRAMEWORK_DIRECTORY}")
  endif()
endif()
