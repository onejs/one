// The window island prototype: a Windows App SDK window whose content is one
// ContentIsland of Composition visuals, one per mounted React Native view, and
// a WinUI ToggleSwitch in a child XamlIsland, connected through a ChildSiteLink
// wherever React mounts a OneWindowsToggle. XAML loads when the first toggle
// mounts. The React Native runtime is OneWindowsIslandRuntime.dll; this file
// owns the window, the visuals, the islands and their input.
//
// usage: OneWindowsIsland.exe <bundle.hbc> <trace.txt>
// Each line on stdin is a command for the React app (mount, unmount). Each step
// goes to the trace file, in milliseconds since the process was created.

#include "pch.h"

#include <format>

#include "OneWindowsIslandRuntime.h"

using namespace winrt;
namespace wfn = winrt::Windows::Foundation::Numerics;
namespace mux = winrt::Microsoft::UI::Xaml;
namespace muxc = winrt::Microsoft::UI::Xaml::Controls;
namespace muxm = winrt::Microsoft::UI::Xaml::Media;
namespace mucomp = winrt::Microsoft::UI::Composition;
namespace mucontent = winrt::Microsoft::UI::Content;
namespace mudisp = winrt::Microsoft::UI::Dispatching;
namespace muinput = winrt::Microsoft::UI::Input;
namespace muwin = winrt::Microsoft::UI::Windowing;
using one::windows::IslandMutation;
using one::windows::IslandView;

namespace {

ULONGLONG g_creation100ns = 0;
std::mutex g_traceMutex;
FILE *g_trace = nullptr;

double nowMs()
{
  FILETIME ft;
  GetSystemTimePreciseAsFileTime(&ft);
  ULONGLONG t = (static_cast<ULONGLONG>(ft.dwHighDateTime) << 32) | ft.dwLowDateTime;
  return static_cast<double>(t - g_creation100ns) / 10000.0;
}

// one line per step, flushed, so a hung or crashed run still shows how far it got
void trace(const std::string &line)
{
  std::lock_guard<std::mutex> lock(g_traceMutex);
  if (g_trace) {
    std::fprintf(g_trace, "%10.1f %s\n", nowMs(), line.c_str());
    std::fflush(g_trace);
  }
}

std::string narrow(std::wstring_view s)
{
  if (s.empty()) {
    return {};
  }
  int size = WideCharToMultiByte(CP_UTF8, 0, s.data(), static_cast<int>(s.size()), nullptr, 0, nullptr, nullptr);
  std::string out(size, '\0');
  WideCharToMultiByte(CP_UTF8, 0, s.data(), static_cast<int>(s.size()), out.data(), size, nullptr, nullptr);
  return out;
}

std::wstring widen(const std::string &s)
{
  if (s.empty()) {
    return {};
  }
  int size = MultiByteToWideChar(CP_UTF8, 0, s.data(), static_cast<int>(s.size()), nullptr, 0);
  std::wstring out(size, L'\0');
  MultiByteToWideChar(CP_UTF8, 0, s.data(), static_cast<int>(s.size()), out.data(), size);
  return out;
}

LONG WINAPI onCrash(EXCEPTION_POINTERS *info)
{
  trace(std::format("crash 0x{:08x}", static_cast<uint32_t>(info->ExceptionRecord->ExceptionCode)));
  ExitProcess(3);
}

// the XAML application islands need for the WinUI control resources and types
struct IslandApp : mux::ApplicationT<IslandApp, mux::Markup::IXamlMetadataProvider> {
  mux::XamlTypeInfo::XamlControlsXamlMetaDataProvider provider;

  mux::Markup::IXamlType GetXamlType(winrt::Windows::UI::Xaml::Interop::TypeName const &type)
  {
    return provider.GetXamlType(type);
  }
  mux::Markup::IXamlType GetXamlType(hstring const &fullName)
  {
    return provider.GetXamlType(fullName);
  }
  com_array<mux::Markup::XmlnsDefinition> GetXmlnsDefinitions()
  {
    return provider.GetXmlnsDefinitions();
  }
};

// a mounted OneWindowsToggle: the placement visual React's layout moves, the
// ChildSiteLink that places a child island there, and the XamlIsland with the
// switch. The switch follows the controlled protocol: a toggle by input is an
// event, and React's isOn applies once React acknowledged every event.
struct Toggle {
  mucomp::ContainerVisual placement{nullptr};
  mucontent::ChildSiteLink link{nullptr};
  mux::XamlIsland island{nullptr};
  muxc::ToggleSwitch control{nullptr};
  muinput::InputFocusNavigationHost navigation{nullptr};
  int eventCount{0};
  int revision{0};
  bool applying{false};
  // when the last input toggle happened, until React acknowledges it
  double toggledAt{0};
  std::string track;
};

struct View {
  int parent{-1};
  std::vector<int> children;
  // a SpriteVisual for a view, a ContainerVisual placing a toggle's island
  mucomp::ContainerVisual visual{nullptr};
  mucomp::SpriteVisual sprite{nullptr};
  IslandView props;
  std::unique_ptr<Toggle> toggle;
};

mux::FrameworkElement findNamed(mux::DependencyObject const &root, std::wstring_view name)
{
  int count = muxm::VisualTreeHelper::GetChildrenCount(root);
  for (int i = 0; i < count; ++i) {
    auto child = muxm::VisualTreeHelper::GetChild(root, i);
    if (auto element = child.try_as<mux::FrameworkElement>(); element && element.Name() == name) {
      return element;
    }
    if (auto found = findNamed(child, name)) {
      return found;
    }
  }
  return nullptr;
}

const char *focusStateName(mux::FocusState state)
{
  switch (state) {
    case mux::FocusState::Unfocused:
      return "Unfocused";
    case mux::FocusState::Pointer:
      return "Pointer";
    case mux::FocusState::Keyboard:
      return "Keyboard";
    case mux::FocusState::Programmatic:
      return "Programmatic";
  }
  return "?";
}

class Host {
 public:
  int run(const std::string &bundlePath)
  {
    auto controller = mudisp::DispatcherQueueController::CreateOnCurrentThread();
    queue_ = controller.DispatcherQueue();
    compositor_ = mucomp::Compositor();
    islandRoot_ = compositor_.CreateContainerVisual();
    island_ = mucontent::ContentIsland::Create(islandRoot_);

    appWindow_ = muwin::AppWindow::Create();
    appWindow_.Title(L"One window island");
    appWindow_.Resize({960, 640});
    appWindow_.AssociateWithDispatcherQueue(queue_);
    bridge_ = mucontent::DesktopChildSiteBridge::Create(compositor_, appWindow_.Id());
    bridge_.ResizePolicy(mucontent::ContentSizePolicy::ResizeContentToParentWindow);
    bridge_.Connect(island_);
    bridge_.Show();
    appWindow_.Show();
    appHwnd_ = winrt::Microsoft::UI::GetWindowFromWindowId(appWindow_.Id());
    bridgeHwnd_ = winrt::Microsoft::UI::GetWindowFromWindowId(bridge_.WindowId());
    trace(std::format(
        "window shown: app hwnd 0x{:x}, bridge hwnd 0x{:x}, dpi {}",
        reinterpret_cast<uintptr_t>(appHwnd_),
        reinterpret_cast<uintptr_t>(bridgeHwnd_),
        GetDpiForWindow(appHwnd_)));

    // the parent island's keyboard: Tab moves focus into the first toggle's island
    keyboard_ = muinput::InputKeyboardSource::GetForIsland(island_);
    keyboard_.KeyDown([this](auto &&, auto const &args) {
      trace(std::format("parent island key {}", static_cast<int>(args.VirtualKey())));
      if (args.VirtualKey() == winrt::Windows::System::VirtualKey::Tab) {
        args.Handled(focusFirstToggle());
      }
    });
    island_.StateChanged([this](auto &&, auto const &args) {
      if (args.DidActualSizeChange() || args.DidRasterizationScaleChange()) {
        layoutSurface();
      }
    });
    appWindow_.Closing([this](auto &&, muwin::AppWindowClosingEventArgs const &args) {
      if (!tornDown_) {
        args.Cancel(true);
        beginTeardown();
      }
    });
    appWindow_.Destroying([this](auto &&, auto &&) { queue_.EnqueueEventLoopExit(); });

    measureSurface();
    one::windows::IslandHost host;
    host.bundlePath = bundlePath;
    host.appKey = "OneWindowsIsland";
    host.width = width_;
    host.height = height_;
    host.scale = scale_;
    host.postToUi = [queue = queue_](std::function<void()> work) {
      queue.TryEnqueue([work = std::move(work)] { work(); });
    };
    host.mount = [this](int surfaceId, int transaction, const std::vector<IslandMutation> &mutations) {
      mount(surfaceId, transaction, mutations);
    };
    host.log = trace;
    runtime_ = one::windows::createIslandRuntime(std::move(host));
    if (!runtime_) {
      return 1;
    }
    readCommands();

    queue_.RunEventLoop();

    bridge_.Close();
    island_.Close();
    if (xamlManager_) {
      xamlManager_.Close();
    }
    controller.ShutdownQueue();
    trace(std::format("exit {}", failed_ ? 1 : 0));
    return failed_ ? 1 : 0;
  }

 private:
  // the island's size in DIPs: the bridge's client area over the island's scale
  void measureSurface()
  {
    RECT rect{};
    GetClientRect(bridgeHwnd_, &rect);
    scale_ = island_.RasterizationScale();
    width_ = (rect.right - rect.left) / scale_;
    height_ = (rect.bottom - rect.top) / scale_;
    auto actual = island_.ActualSize();
    trace(std::format(
        "surface {}x{} DIPs at scale {} ({}x{} px client, island ActualSize {}x{})",
        width_,
        height_,
        scale_,
        rect.right - rect.left,
        rect.bottom - rect.top,
        actual.x,
        actual.y));
  }

  void layoutSurface()
  {
    measureSurface();
    if (runtime_ && !closing_) {
      runtime_->resize(width_, height_, scale_);
    }
  }

  // stdin lines, posted to the UI thread as commands for the React app
  void readCommands()
  {
    HANDLE input = GetStdHandle(STD_INPUT_HANDLE);
    if (!input || input == INVALID_HANDLE_VALUE) {
      return;
    }
    std::thread([this, input, queue = queue_] {
      std::string pending;
      char buffer[256];
      DWORD read = 0;
      while (ReadFile(input, buffer, sizeof(buffer), &read, nullptr) && read > 0) {
        pending.append(buffer, read);
        for (size_t end; (end = pending.find('\n')) != std::string::npos;) {
          std::string line = pending.substr(0, end);
          pending.erase(0, end + 1);
          while (!line.empty() && (line.back() == '\r' || line.back() == ' ')) {
            line.pop_back();
          }
          if (!line.empty()) {
            queue.TryEnqueue([this, line] {
              trace("command " + line);
              if (runtime_ && !closing_) {
                runtime_->command(line);
              }
            });
          }
        }
      }
    }).detach();
  }

  void ensureXaml()
  {
    if (xamlManager_) {
      return;
    }
    trace(std::format(
        "xaml loads for the first toggle; Microsoft.UI.Xaml.dll loaded before: {}",
        GetModuleHandleW(L"Microsoft.UI.Xaml.dll") != nullptr));
    xamlApp_ = make<IslandApp>();
    xamlApp_.UnhandledException([](auto &&, mux::UnhandledExceptionEventArgs const &e) {
      trace(std::format(
          "xaml unhandled 0x{:08x} {}", static_cast<uint32_t>(e.Exception()), narrow(std::wstring_view(e.Message()))));
    });
    xamlManager_ = mux::Hosting::WindowsXamlManager::InitializeForCurrentThread();
    xamlApp_.Resources().MergedDictionaries().Append(muxc::XamlControlsResources());
    trace("xaml ready");
  }

  std::unique_ptr<Toggle> makeToggle(int tag)
  {
    ensureXaml();
    auto toggle = std::make_unique<Toggle>();
    toggle->placement = compositor_.CreateContainerVisual();
    toggle->island = mux::XamlIsland();
    muxc::Grid root;
    root.RequestedTheme(mux::ElementTheme::Light);
    root.Background(muxm::SolidColorBrush(winrt::Windows::UI::Color{255, 255, 255, 255}));
    muxc::ToggleSwitch control;
    control.HorizontalAlignment(mux::HorizontalAlignment::Left);
    control.VerticalAlignment(mux::VerticalAlignment::Center);
    control.Margin({12, 0, 12, 0});
    root.Children().Append(control);
    toggle->island.Content(root);
    toggle->control = control;
    control.Toggled([this, tag](auto &&, auto &&) { onToggled(tag); });
    control.GotFocus([this, tag](auto &&, auto &&) { onFocus(tag, true); });
    control.LostFocus([this, tag](auto &&, auto &&) { onFocus(tag, false); });
    control.LayoutUpdated([this, tag](auto &&, auto &&) { traceTrack(tag); });
    return toggle;
  }

  // the link needs its placement visual in the parent island's tree
  void connect(int tag, Toggle &toggle)
  {
    toggle.link = mucontent::ChildSiteLink::Create(island_, toggle.placement);
    toggle.navigation = muinput::InputFocusNavigationHost::GetForSiteLink(toggle.link);
    toggle.navigation.DepartFocusRequested([this, tag](auto &&, auto const &args) {
      bool moved = muinput::InputFocusController::GetForIsland(island_).TrySetFocus();
      trace(std::format(
          "focus departs toggle {} island, reason {}; parent island took focus: {}",
          tag,
          static_cast<int>(args.Request().Reason()),
          moved));
      args.Result(moved ? muinput::FocusNavigationResult::Moved : muinput::FocusNavigationResult::NotMoved);
    });
    placeToggle(tag);
    toggle.link.Connect(toggle.island.ContentIsland());
    liveIslands_++;
    trace(std::format(
        "toggle {} island connected through a ChildSiteLink; xaml island content island {}",
        tag,
        toggle.island.ContentIsland().Id()));
  }

  void closeToggle(int tag, Toggle &toggle)
  {
    if (toggle.link) {
      toggle.link.Close();
      liveIslands_--;
    }
    toggle.island.Close();
    trace(std::format("toggle {} island closed; {} islands open", tag, liveIslands_));
  }

  void onToggled(int tag)
  {
    auto found = views_.find(tag);
    if (found == views_.end() || !found->second.toggle || found->second.toggle->applying) {
      return;
    }
    auto &toggle = *found->second.toggle;
    bool isOn = toggle.control.IsOn();
    toggle.eventCount++;
    toggle.toggledAt = nowMs();
    trace(std::format("native toggle {} toggled {} by input, event {}", tag, isOn ? "on" : "off", toggle.eventCount));
    runtime_->toggleChanged(tag, isOn, toggle.eventCount, toggle.revision);
  }

  void onFocus(int tag, bool focused)
  {
    auto found = views_.find(tag);
    if (found == views_.end() || !found->second.toggle) {
      return;
    }
    trace(std::format(
        "toggle {} {} focus ({})",
        tag,
        focused ? "got" : "lost",
        focusStateName(found->second.toggle->control.FocusState())));
    if (runtime_ && !closing_) {
      runtime_->focusChanged(tag, focused);
    }
  }

  bool focusFirstToggle()
  {
    for (auto &[tag, view] : views_) {
      if (view.toggle && view.toggle->navigation) {
        auto result = view.toggle->navigation.NavigateFocus(
            muinput::FocusNavigationRequest::Create(muinput::FocusNavigationReason::First));
        trace(std::format(
            "Tab navigates focus into toggle {} island: {}",
            tag,
            result == muinput::FocusNavigationResult::Moved ? "moved" : "not moved"));
        return true;
      }
    }
    return false;
  }

  // the switch track's center on screen, from XAML's own layout, for input
  void traceTrack(int tag)
  {
    auto found = views_.find(tag);
    if (found == views_.end() || !found->second.toggle || !found->second.toggle->link) {
      return;
    }
    auto &toggle = *found->second.toggle;
    auto track = findNamed(toggle.control, L"OuterBorder");
    if (!track) {
      return;
    }
    auto origin = track.TransformToVisual(nullptr).TransformPoint({0, 0});
    auto [x, y] = absoluteOrigin(tag);
    POINT client{0, 0};
    ClientToScreen(bridgeHwnd_, &client);
    int screenX = client.x + static_cast<int>(std::lround((x + origin.X + track.ActualWidth() / 2) * scale_));
    int screenY = client.y + static_cast<int>(std::lround((y + origin.Y + track.ActualHeight() / 2) * scale_));
    auto line = std::format("toggle {} track at screen {} {}", tag, screenX, screenY);
    if (line != toggle.track) {
      toggle.track = line;
      trace(line);
    }
  }

  std::pair<float, float> absoluteOrigin(int tag)
  {
    float x = 0;
    float y = 0;
    for (int current = tag; current != -1;) {
      auto &view = views_.at(current);
      x += view.props.x;
      y += view.props.y;
      current = view.parent;
    }
    return {x, y};
  }

  // the link's size and its transform to the parent island, both in DIPs
  void placeToggle(int tag)
  {
    auto &view = views_.at(tag);
    auto [x, y] = absoluteOrigin(tag);
    view.toggle->link.ActualSize({view.props.width, view.props.height});
    view.toggle->link.LocalToParentTransformMatrix(wfn::make_float4x4_translation(x, y, 0));
    traceTrack(tag);
  }

  View &ensureRoot(int surfaceId)
  {
    auto found = views_.find(surfaceId);
    if (found != views_.end()) {
      return found->second;
    }
    View root;
    root.sprite = compositor_.CreateSpriteVisual();
    root.visual = root.sprite;
    root.props.tag = surfaceId;
    root.props.component = "RootView";
    islandRoot_.Children().InsertAtTop(root.visual);
    surfaceId_ = surfaceId;
    return views_.emplace(surfaceId, std::move(root)).first->second;
  }

  void apply(int tag, View &view, const IslandView &props)
  {
    float scale = static_cast<float>(scale_);
    view.visual.Offset({props.x * scale, props.y * scale, 0});
    view.visual.Size({props.width * scale, props.height * scale});
    view.visual.Opacity(props.opacity);
    if (view.sprite && (!view.sprite.Brush() || props.backgroundColor != view.props.backgroundColor)) {
      uint32_t c = props.backgroundColor;
      view.sprite.Brush(
          c >> 24 ? compositor_.CreateColorBrush(
                        {static_cast<uint8_t>(c >> 24), static_cast<uint8_t>(c >> 16), static_cast<uint8_t>(c >> 8), static_cast<uint8_t>(c)})
                  : nullptr);
    }
    if (auto *toggle = view.toggle.get()) {
      toggle->revision = props.revision;
      auto label = box_value(widen(props.label));
      toggle->control.OnContent(label);
      toggle->control.OffContent(label);
      if (props.acknowledgedEvent >= toggle->eventCount && toggle->control.IsOn() != props.isOn) {
        toggle->applying = true;
        toggle->control.IsOn(props.isOn);
        toggle->applying = false;
      }
      if (toggle->toggledAt > 0 && props.acknowledgedEvent >= toggle->eventCount) {
        trace(std::format(
            "toggle {} event {} came back from React acknowledged after {:.1f} ms",
            tag,
            toggle->eventCount,
            nowMs() - toggle->toggledAt));
        toggle->toggledAt = 0;
      }
      if (props.label != view.props.label || props.isOn != view.props.isOn ||
          props.acknowledgedEvent != view.props.acknowledgedEvent) {
        trace(std::format(
            "toggle {} props isOn={} revision={} acknowledgedEvent={} label=\"{}\"",
            tag,
            props.isOn,
            props.revision,
            props.acknowledgedEvent,
            props.label));
      }
    }
    view.props = props;
  }

  void mount(int surfaceId, int transaction, const std::vector<IslandMutation> &mutations)
  {
    ensureRoot(surfaceId);
    int counts[5]{};
    for (const auto &mutation : mutations) {
      const auto &props = mutation.view;
      counts[static_cast<int>(mutation.type)]++;
      switch (mutation.type) {
        case IslandMutation::Type::Create: {
          if (views_.contains(props.tag)) {
            break;
          }
          View view;
          if (props.component == "OneWindowsToggle") {
            view.toggle = makeToggle(props.tag);
            view.visual = view.toggle->placement;
          } else {
            view.sprite = compositor_.CreateSpriteVisual();
            view.visual = view.sprite;
          }
          auto &created = views_.emplace(props.tag, std::move(view)).first->second;
          apply(props.tag, created, props);
          break;
        }
        case IslandMutation::Type::Delete: {
          auto found = views_.find(props.tag);
          if (found != views_.end()) {
            if (found->second.toggle) {
              closeToggle(props.tag, *found->second.toggle);
            }
            views_.erase(found);
          }
          break;
        }
        case IslandMutation::Type::Insert: {
          auto &parent = views_.at(mutation.parentTag);
          auto &child = views_.at(props.tag);
          child.parent = mutation.parentTag;
          size_t index = std::min(static_cast<size_t>(std::max(mutation.index, 0)), parent.children.size());
          auto children = parent.visual.Children();
          if (index == 0) {
            children.InsertAtBottom(child.visual);
          } else {
            children.InsertAbove(child.visual, views_.at(parent.children[index - 1]).visual);
          }
          parent.children.insert(parent.children.begin() + index, props.tag);
          apply(props.tag, child, props);
          if (child.toggle && !child.toggle->link) {
            connect(props.tag, *child.toggle);
          }
          break;
        }
        case IslandMutation::Type::Remove: {
          auto &parent = views_.at(mutation.parentTag);
          auto &child = views_.at(props.tag);
          std::erase(parent.children, props.tag);
          parent.visual.Children().Remove(child.visual);
          child.parent = -1;
          break;
        }
        case IslandMutation::Type::Update: {
          auto found = views_.find(props.tag);
          if (found != views_.end()) {
            apply(props.tag, found->second, props);
          }
          break;
        }
      }
    }
    trace(std::format(
        "transaction {} mounted: {} create, {} delete, {} insert, {} remove, {} update; {} views",
        transaction,
        counts[0],
        counts[1],
        counts[2],
        counts[3],
        counts[4],
        views_.size() - 1));
    for (auto &[tag, view] : views_) {
      if (view.toggle && view.toggle->link) {
        placeToggle(tag);
      }
    }
    // the runtime that called this goes after the call returns
    if (closing_ && views_.size() <= 1) {
      queue_.TryEnqueue([this] { finishTeardown(); });
    }
  }

  void beginTeardown()
  {
    if (closing_) {
      return;
    }
    closing_ = true;
    trace("close requested: stopping the surface");
    runtime_->stopSurface();
    teardownTimer_ = queue_.CreateTimer();
    teardownTimer_.Interval(std::chrono::seconds(10));
    teardownTimer_.IsRepeating(false);
    teardownTimer_.Tick([this](auto &&, auto &&) {
      if (!tornDown_) {
        trace(std::format("FAIL the empty tree did not unmount within 10 s; {} views remain", views_.size() - 1));
        failed_ = true;
        finishTeardown();
      }
    });
    teardownTimer_.Start();
  }

  void finishTeardown()
  {
    if (tornDown_) {
      return;
    }
    tornDown_ = true;
    teardownTimer_.Stop();
    runtime_.reset();
    trace(std::format("teardown complete: runtime destroyed, {} views and {} islands remain", views_.size() - 1, liveIslands_));
    if (liveIslands_ != 0) {
      failed_ = true;
    }
    appWindow_.Destroy();
  }

  mudisp::DispatcherQueue queue_{nullptr};
  mucomp::Compositor compositor_{nullptr};
  mucomp::ContainerVisual islandRoot_{nullptr};
  mucontent::ContentIsland island_{nullptr};
  muwin::AppWindow appWindow_{nullptr};
  mucontent::DesktopChildSiteBridge bridge_{nullptr};
  muinput::InputKeyboardSource keyboard_{nullptr};
  mux::Application xamlApp_{nullptr};
  mux::Hosting::WindowsXamlManager xamlManager_{nullptr};
  mudisp::DispatcherQueueTimer teardownTimer_{nullptr};
  HWND appHwnd_{nullptr};
  HWND bridgeHwnd_{nullptr};
  double width_{0};
  double height_{0};
  double scale_{1};
  int surfaceId_{-1};
  std::map<int, View> views_;
  int liveIslands_{0};
  bool closing_{false};
  bool tornDown_{false};
  bool failed_{false};
  std::unique_ptr<one::windows::IslandRuntime> runtime_;
};

} // namespace

int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int)
{
  FILETIME creation, exitTime, kernel, user;
  GetProcessTimes(GetCurrentProcess(), &creation, &exitTime, &kernel, &user);
  g_creation100ns = (static_cast<ULONGLONG>(creation.dwHighDateTime) << 32) | creation.dwLowDateTime;
  int argc = 0;
  LPWSTR *argv = CommandLineToArgvW(GetCommandLineW(), &argc);
  if (argc != 3) {
    return 2;
  }
  std::string bundle = narrow(argv[1]);
  _wfopen_s(&g_trace, argv[2], L"ab");
  LocalFree(argv);
  SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX);
  SetUnhandledExceptionFilter(onCrash);
  trace("main");
  init_apartment(apartment_type::single_threaded);
  try {
    Host host;
    return host.run(bundle);
  } catch (hresult_error const &e) {
    trace(std::format("FAIL 0x{:08x} {}", static_cast<uint32_t>(e.code()), narrow(std::wstring_view(e.message()))));
    return 4;
  }
}
