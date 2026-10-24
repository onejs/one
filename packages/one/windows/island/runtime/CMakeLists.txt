# OneWindowsIslandRuntime.dll: the window island prototype's React Native side,
# compiled with clang-cl like the core it links. The host executable links its
# import library and sees only OneWindowsIslandRuntime.h.
add_library(OneWindowsIslandRuntime SHARED
  OneWindowsIslandRuntime.cpp
  OneWindowsToggle.cpp
)
target_compile_definitions(OneWindowsIslandRuntime PRIVATE ONE_WINDOWS_ISLAND_RUNTIME_EXPORTS)
target_include_directories(OneWindowsIslandRuntime PUBLIC ${CMAKE_CURRENT_LIST_DIR})
target_link_libraries(OneWindowsIslandRuntime PRIVATE OneWindowsCore)
add_custom_command(TARGET OneWindowsIslandRuntime POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_if_different ${HERMES_ROOT}/bin/hermesvm.dll $<TARGET_FILE_DIR:OneWindowsIslandRuntime>)
