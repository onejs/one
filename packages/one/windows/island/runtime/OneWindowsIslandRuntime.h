#pragma once

// The boundary between the window island host, compiled with MSVC against
// C++/WinRT, and the React Native runtime, compiled with clang-cl into
// OneWindowsIslandRuntime.dll. Only standard library types cross it; both
// compilers lay them out the same way against the MSVC STL and the /MD runtime.

#include <cstdint>
#include <functional>
#include <memory>
#include <string>
#include <vector>

#ifdef ONE_WINDOWS_ISLAND_RUNTIME_EXPORTS
#define ONE_WINDOWS_ISLAND_API __declspec(dllexport)
#else
#define ONE_WINDOWS_ISLAND_API __declspec(dllimport)
#endif

namespace one::windows {

// a mounted view after a mutation, read from its Fabric shadow view
struct IslandView {
  int tag{0};
  std::string component;
  // the layout frame in DIPs, relative to the parent view
  float x{0}, y{0}, width{0}, height{0};
  // ARGB; alpha 0 when the view paints no background
  uint32_t backgroundColor{0};
  float opacity{1};
  // OneWindowsToggle props
  bool isOn{false};
  int revision{0};
  int acknowledgedEvent{0};
  std::string label;
};

struct IslandMutation {
  enum class Type { Create, Delete, Insert, Remove, Update };
  Type type{Type::Create};
  int parentTag{-1};
  int index{-1};
  IslandView view;
};

struct IslandHost {
  std::string bundlePath;
  std::string appKey;
  double width{0}, height{0}, scale{1};
  // runs work on the UI thread, from any thread
  std::function<void(std::function<void()>)> postToUi;
  // one mounting transaction, on the UI thread; the root view's tag is the surface id
  std::function<void(int surfaceId, int transaction, const std::vector<IslandMutation> &mutations)> mount;
  // one line of diagnostics or console output, from any thread
  std::function<void(const std::string &line)> log;
};

// One React instance running a bundle on one surface. Create, call and destroy
// it on the UI thread.
class IslandRuntime {
 public:
  virtual ~IslandRuntime() = default;
  // the native control's input, delivered to its Fabric event emitter
  virtual void toggleChanged(int tag, bool isOn, int eventCount, int revision) = 0;
  virtual void focusChanged(int tag, bool focused) = 0;
  // the surface's size in DIPs and its scale
  virtual void resize(double width, double height, double scale) = 0;
  // emits `oneIslandCommand` on RCTDeviceEventEmitter
  virtual void command(const std::string &name) = 0;
  // stops the surface; the empty tree arrives through `mount`
  virtual void stopSurface() = 0;
};

ONE_WINDOWS_ISLAND_API std::unique_ptr<IslandRuntime> createIslandRuntime(IslandHost host);

} // namespace one::windows
