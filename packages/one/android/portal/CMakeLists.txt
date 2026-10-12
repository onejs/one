cmake_minimum_required(VERSION 3.13)
add_subdirectory(${CMAKE_CURRENT_LIST_DIR}/../build/generated/source/codegen/jni ${CMAKE_CURRENT_BINARY_DIR}/generated)
target_sources(react_codegen_OneNativeSpec PRIVATE ${CMAKE_CURRENT_LIST_DIR}/../../cpp/OneNativePortalShadowNode.cpp)
target_include_directories(react_codegen_OneNativeSpec BEFORE PUBLIC
  ${CMAKE_CURRENT_LIST_DIR}
  ${CMAKE_CURRENT_LIST_DIR}/../../cpp)
