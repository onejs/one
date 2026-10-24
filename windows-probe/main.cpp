// one windows host probe: how much does a native view tree cost on windows when each
// mounted react native view is (a) a winui 3 xaml element, or (b) a lifted composition
// visual inside a content island (the react-native-windows fabric model).
//
// usage: OneWindowsProbe.exe --mode xaml|xaml-grid|comp|comp-shape --nodes N --out results.jsonl
//                            [--controls K] [--updates U] [--hold MS] [--tag TEXT]
// every time is milliseconds since the kernel created this process.

#include "pch.h"

using namespace winrt;
namespace wf = winrt::Windows::Foundation;
namespace mux = winrt::Microsoft::UI::Xaml;
namespace muxc = winrt::Microsoft::UI::Xaml::Controls;
namespace muxm = winrt::Microsoft::UI::Xaml::Media;
namespace mucomp = winrt::Microsoft::UI::Composition;
namespace mucontent = winrt::Microsoft::UI::Content;
namespace mudisp = winrt::Microsoft::UI::Dispatching;
namespace muwin = winrt::Microsoft::UI::Windowing;

namespace {

struct Options {
  std::wstring mode = L"xaml";
  int nodes = 300;
  int controls = 0;
  int updates = 20;
  int holdMs = 0;
  std::wstring out = L"results.jsonl";
  std::wstring tag;
};

struct Node {
  int parent;
  float x, y, w, h;
  winrt::Windows::UI::Color color;
};

Options g_options;
ULONGLONG g_creation100ns = 0;
std::vector<std::pair<std::string, double>> g_marks;
std::vector<double> g_updateMs;
double g_mountMs = 0;
SIZE_T g_privateBeforeMount = 0;
SIZE_T g_privateAfterFrame = 0;
SIZE_T g_workingSetAfterFrame = 0;

std::string narrow(const std::wstring& s);

double nowMs() {
  FILETIME ft;
  GetSystemTimePreciseAsFileTime(&ft);
  ULONGLONG t = (static_cast<ULONGLONG>(ft.dwHighDateTime) << 32) | ft.dwLowDateTime;
  return static_cast<double>(t - g_creation100ns) / 10000.0;
}

// appends one line per mark to <out>.trace as it happens, so a hung or crashed run
// still shows how far it got
void trace(const std::string& line) {
  FILE* file = nullptr;
  if (_wfopen_s(&file, (g_options.out + L".trace").c_str(), L"ab") == 0 && file) {
    std::string text = narrow(g_options.mode) + " " + std::to_string(g_options.nodes) + " " + narrow(g_options.tag) + " " + line + "\n";
    fwrite(text.data(), 1, text.size(), file);
    fclose(file);
  }
}

void mark(const char* name) {
  g_marks.emplace_back(name, nowMs());
  char buffer[96];
  snprintf(buffer, sizeof(buffer), "%s %.1f", name, g_marks.back().second);
  trace(buffer);
}

LONG WINAPI onCrash(EXCEPTION_POINTERS* info) {
  char buffer[96];
  snprintf(buffer, sizeof(buffer), "crash 0x%08lx", info->ExceptionRecord->ExceptionCode);
  trace(buffer);
  ExitProcess(3);
}

void readMemory(SIZE_T& privateBytes, SIZE_T* workingSet = nullptr) {
  PROCESS_MEMORY_COUNTERS_EX counters{};
  counters.cb = sizeof(counters);
  GetProcessMemoryInfo(GetCurrentProcess(), reinterpret_cast<PROCESS_MEMORY_COUNTERS*>(&counters), sizeof(counters));
  privateBytes = counters.PrivateUsage;
  if (workingSet) *workingSet = counters.WorkingSetSize;
}

std::vector<Node> buildTree(int count) {
  std::vector<Node> nodes;
  nodes.reserve(count);
  for (int i = 0; i < count; ++i) {
    winrt::Windows::UI::Color color{255, static_cast<uint8_t>((i * 37) % 200 + 40), static_cast<uint8_t>((i * 71) % 200 + 40),
                                    static_cast<uint8_t>((i * 113) % 200 + 40)};
    if (i == 0) {
      nodes.push_back({-1, 0, 0, 1000, 700, color});
      continue;
    }
    int parent = (i - 1) / 4;
    int k = (i - 1) % 4;
    const Node& p = nodes[parent];
    float w = std::max(4.0f, p.w / 2 - 6);
    float h = std::max(4.0f, p.h / 2 - 6);
    float x = 4 + (k % 2) * (p.w / 2);
    float y = 4 + (k / 2) * (p.h / 2);
    nodes.push_back({parent, x, y, w, h, color});
  }
  return nodes;
}

std::string narrow(const std::wstring& s) {
  if (s.empty()) return {};
  int size = WideCharToMultiByte(CP_UTF8, 0, s.c_str(), static_cast<int>(s.size()), nullptr, 0, nullptr, nullptr);
  std::string out(size, '\0');
  WideCharToMultiByte(CP_UTF8, 0, s.c_str(), static_cast<int>(s.size()), out.data(), size, nullptr, nullptr);
  return out;
}

std::string jsonEscape(const std::string& s) {
  std::string out;
  for (char c : s) {
    if (c == '\\' || c == '"') out.push_back('\\');
    out.push_back(c);
  }
  return out;
}

// sums the on-disk size of every module loaded in this process, so each mode reports
// what it actually pulls in (for example whether Microsoft.UI.Xaml.dll was loaded)
std::string loadedModulesJson() {
  HMODULE modules[1024];
  DWORD needed = 0;
  EnumProcessModules(GetCurrentProcess(), modules, sizeof(modules), &needed);
  size_t count = needed / sizeof(HMODULE);
  ULONGLONG total = 0;
  ULONGLONG windowsAppSdk = 0;
  bool xaml = false;
  std::string list;
  for (size_t i = 0; i < count; ++i) {
    wchar_t path[MAX_PATH];
    if (!GetModuleFileNameExW(GetCurrentProcess(), modules[i], path, MAX_PATH)) continue;
    WIN32_FILE_ATTRIBUTE_DATA data{};
    ULONGLONG size = 0;
    if (GetFileAttributesExW(path, GetFileExInfoStandard, &data)) {
      size = (static_cast<ULONGLONG>(data.nFileSizeHigh) << 32) | data.nFileSizeLow;
    }
    total += size;
    std::wstring p(path);
    std::wstring name = p.substr(p.find_last_of(L'\\') + 1);
    bool appLocal = p.find(L"\\System32\\") == std::wstring::npos && p.find(L"\\system32\\") == std::wstring::npos &&
                    p.find(L"\\SYSTEM32\\") == std::wstring::npos && p.find(L"\\WinSxS\\") == std::wstring::npos;
    if (name == L"Microsoft.UI.Xaml.dll") xaml = true;
    if (appLocal) {
      windowsAppSdk += size;
      if (!list.empty()) list += ",";
      list += "{\"name\":\"" + jsonEscape(narrow(name)) + "\",\"bytes\":" + std::to_string(size) + "}";
    }
  }
  return "\"modules\":" + std::to_string(count) + ",\"moduleBytes\":" + std::to_string(total) +
         ",\"appLocalModuleBytes\":" + std::to_string(windowsAppSdk) + ",\"xamlLoaded\":" + (xaml ? "true" : "false") +
         ",\"appLocalModules\":[" + list + "]";
}

void writeResultsAndExit() {
  std::string json = "{\"mode\":\"" + narrow(g_options.mode) + "\",\"nodes\":" + std::to_string(g_options.nodes) +
                     ",\"controls\":" + std::to_string(g_options.controls) + ",\"tag\":\"" + jsonEscape(narrow(g_options.tag)) +
                     "\",\"marks\":{";
  for (size_t i = 0; i < g_marks.size(); ++i) {
    if (i) json += ",";
    char buffer[64];
    snprintf(buffer, sizeof(buffer), "%.3f", g_marks[i].second);
    json += "\"" + g_marks[i].first + "\":" + buffer;
  }
  char buffer[256];
  snprintf(buffer, sizeof(buffer), "},\"mountMs\":%.3f,\"privateBeforeMount\":%zu,\"privateAfterFrame\":%zu,\"workingSetAfterFrame\":%zu,",
           g_mountMs, g_privateBeforeMount, g_privateAfterFrame, g_workingSetAfterFrame);
  json += buffer;
  json += "\"updateMs\":[";
  for (size_t i = 0; i < g_updateMs.size(); ++i) {
    if (i) json += ",";
    snprintf(buffer, sizeof(buffer), "%.3f", g_updateMs[i]);
    json += buffer;
  }
  json += "]," + loadedModulesJson() + "}\n";
  FILE* file = nullptr;
  if (_wfopen_s(&file, g_options.out.c_str(), L"ab") == 0 && file) {
    fwrite(json.data(), 1, json.size(), file);
    fclose(file);
  }
  // skip teardown: the probe measures startup and mounting, not shutdown
  ExitProcess(0);
}

void afterFirstFrame(std::function<void(std::function<void()>)> nextFrame, std::function<void(int)> move) {
  mark("first_frame");
  readMemory(g_privateAfterFrame, &g_workingSetAfterFrame);
  DwmFlush();
  mark("dwm_flushed");
  auto remaining = std::make_shared<int>(g_options.updates);
  auto step = std::make_shared<std::function<void()>>();
  *step = [=]() {
    if (*remaining <= 0) {
      if (g_options.holdMs > 0) Sleep(static_cast<DWORD>(g_options.holdMs));
      writeResultsAndExit();
      return;
    }
    int k = g_options.updates - *remaining;
    --*remaining;
    double start = nowMs();
    move(k + 1);
    nextFrame([=]() {
      g_updateMs.push_back(nowMs() - start);
      (*step)();
    });
  };
  (*step)();
}

// ---- xaml: one winui 3 element per react native view ----

struct App : mux::ApplicationT<App, mux::Markup::IXamlMetadataProvider> {
  mux::XamlTypeInfo::XamlControlsXamlMetaDataProvider m_provider;

  App() {
    mark("app");
    UnhandledException([](auto&&, mux::UnhandledExceptionEventArgs const& e) {
      trace("xaml unhandled 0x" + std::to_string(static_cast<uint32_t>(e.Exception())) + " " + narrow(std::wstring(e.Message())));
      ExitProcess(4);
    });
  }
  mux::Window m_window{nullptr};
  std::vector<mux::FrameworkElement> m_elements;
  std::vector<Node> m_nodes;
  event_token m_rendered{};
  event_token m_rendering{};
  std::function<void()> m_onFrame;

  mux::Markup::IXamlType GetXamlType(winrt::Windows::UI::Xaml::Interop::TypeName const& type) {
    return m_provider.GetXamlType(type);
  }
  mux::Markup::IXamlType GetXamlType(hstring const& fullName) { return m_provider.GetXamlType(fullName); }
  com_array<mux::Markup::XmlnsDefinition> GetXmlnsDefinitions() { return m_provider.GetXmlnsDefinitions(); }

  void place(size_t i, int shift) {
    const Node& n = m_nodes[i];
    if (g_options.mode == L"xaml-grid") {
      m_elements[i].Margin({n.x + shift, n.y, 0, 0});
    } else {
      muxc::Canvas::SetLeft(m_elements[i], n.x + shift);
      muxc::Canvas::SetTop(m_elements[i], n.y);
    }
  }

  void OnLaunched(mux::LaunchActivatedEventArgs const&) {
    mark("launched");
    Resources().MergedDictionaries().Append(muxc::XamlControlsResources());
    m_window = mux::Window();
    m_window.AppWindow().Resize({1100, 800});
    muxc::Canvas root;
    root.Background(muxm::SolidColorBrush(winrt::Windows::UI::Color{255, 255, 255, 255}));
    m_window.Content(root);
    m_window.Activate();
    mark("shown");

    readMemory(g_privateBeforeMount);
    LARGE_INTEGER f, a, b;
    QueryPerformanceFrequency(&f);
    QueryPerformanceCounter(&a);
    mark("mount_start");
    m_nodes = buildTree(g_options.nodes);
    m_elements.reserve(m_nodes.size());
    bool grid = g_options.mode == L"xaml-grid";
    for (size_t i = 0; i < m_nodes.size(); ++i) {
      const Node& n = m_nodes[i];
      mux::FrameworkElement element{nullptr};
      if (grid) {
        muxc::Grid g;
        g.Background(muxm::SolidColorBrush(n.color));
        g.BorderBrush(muxm::SolidColorBrush(winrt::Windows::UI::Color{255, 30, 30, 30}));
        g.BorderThickness({1, 1, 1, 1});
        g.CornerRadius({6, 6, 6, 6});
        g.HorizontalAlignment(mux::HorizontalAlignment::Left);
        g.VerticalAlignment(mux::VerticalAlignment::Top);
        element = g;
      } else {
        muxc::Canvas c;
        c.Background(muxm::SolidColorBrush(n.color));
        element = c;
      }
      element.Width(n.w);
      element.Height(n.h);
      m_elements.push_back(element);
      place(i, 0);
      auto parentChildren = n.parent < 0 ? root.Children()
                            : grid       ? m_elements[n.parent].as<muxc::Grid>().Children()
                                         : m_elements[n.parent].as<muxc::Canvas>().Children();
      parentChildren.Append(element);
    }
    for (int k = 0; k < g_options.controls; ++k) {
      mux::FrameworkElement control{nullptr};
      if (k % 5 == 4) {
        muxc::TextBox box;
        box.PlaceholderText(L"text input");
        box.Width(160);
        control = box;
      } else {
        muxc::ToggleSwitch toggle;
        toggle.IsOn(k % 2 == 0);
        control = toggle;
      }
      muxc::Canvas::SetLeft(control, 20 + (k % 5) * 170);
      muxc::Canvas::SetTop(control, 720 + (k / 5) * 44);
      root.Children().Append(control);
    }
    QueryPerformanceCounter(&b);
    g_mountMs = static_cast<double>(b.QuadPart - a.QuadPart) * 1000.0 / static_cast<double>(f.QuadPart);
    mark("mount_end");

    // the first frame is the first Rendered; after that Rendered stops when nothing is dirty,
    // so updates are paced by Rendering, which xaml raises every frame while subscribed
    m_rendered = muxm::CompositionTarget::Rendered([this](auto&&, auto&&) {
      muxm::CompositionTarget::Rendered(m_rendered);
      m_rendering = muxm::CompositionTarget::Rendering([this](auto&&, auto&&) {
        if (m_onFrame) {
          auto callback = std::move(m_onFrame);
          m_onFrame = nullptr;
          callback();
        }
      });
      auto callback = std::move(m_onFrame);
      m_onFrame = nullptr;
      callback();
    });
    m_onFrame = [this]() {
      afterFirstFrame([this](std::function<void()> next) { m_onFrame = std::move(next); },
                      [this](int shift) {
                        for (size_t i = 1; i < m_elements.size(); ++i) place(i, shift);
                      });
    };
  }
};

int runXaml() {
  mark("xaml_start");
  try {
    mux::Application::Start([](auto&&) { make<App>(); });
  } catch (hresult_error const& e) {
    char buffer[32];
    snprintf(buffer, sizeof(buffer), "0x%08x ", static_cast<uint32_t>(e.code()));
    trace(std::string("start threw ") + buffer + narrow(std::wstring(e.message())));
    ExitProcess(5);
  }
  trace("start returned");
  return 0;
}

// ---- composition: one lifted composition visual per react native view ----

int runComposition() {
  auto controller = mudisp::DispatcherQueueController::CreateOnCurrentThread();
  auto queue = controller.DispatcherQueue();
  mucomp::Compositor compositor;
  mark("launched");
  auto root = compositor.CreateSpriteVisual();
  root.Brush(compositor.CreateColorBrush(winrt::Windows::UI::Color{255, 255, 255, 255}));
  root.RelativeSizeAdjustment({1, 1});
  auto island = mucontent::ContentIsland::Create(root);
  auto appWindow = muwin::AppWindow::Create();
  appWindow.Resize({1100, 800});
  auto bridge = mucontent::DesktopChildSiteBridge::Create(compositor, appWindow.Id());
  bridge.ResizePolicy(mucontent::ContentSizePolicy::ResizeContentToParentWindow);
  bridge.Connect(island);
  bridge.Show();
  appWindow.Show();
  mark("shown");

  readMemory(g_privateBeforeMount);
  LARGE_INTEGER f, a, b;
  QueryPerformanceFrequency(&f);
  QueryPerformanceCounter(&a);
  mark("mount_start");
  auto nodes = std::make_shared<std::vector<Node>>(buildTree(g_options.nodes));
  // comp-shape draws what xaml-grid draws: a filled, 1px stroked, 6px rounded rectangle per view
  bool shape = g_options.mode == L"comp-shape";
  auto stroke = compositor.CreateColorBrush(winrt::Windows::UI::Color{255, 30, 30, 30});
  auto visuals = std::make_shared<std::vector<mucomp::ContainerVisual>>();
  visuals->reserve(nodes->size());
  for (size_t i = 0; i < nodes->size(); ++i) {
    const Node& n = (*nodes)[i];
    mucomp::ContainerVisual v{nullptr};
    if (shape) {
      auto geometry = compositor.CreateRoundedRectangleGeometry();
      geometry.Offset({0.5f, 0.5f});
      geometry.Size({n.w - 1, n.h - 1});
      geometry.CornerRadius({6, 6});
      auto sprite = compositor.CreateSpriteShape(geometry);
      sprite.FillBrush(compositor.CreateColorBrush(n.color));
      sprite.StrokeBrush(stroke);
      sprite.StrokeThickness(1);
      auto shapeVisual = compositor.CreateShapeVisual();
      shapeVisual.Shapes().Append(sprite);
      v = shapeVisual;
    } else {
      auto sprite = compositor.CreateSpriteVisual();
      sprite.Brush(compositor.CreateColorBrush(n.color));
      v = sprite;
    }
    v.Size({n.w, n.h});
    v.Offset({n.x, n.y, 0});
    visuals->push_back(v);
    mucomp::ContainerVisual parent = n.parent < 0 ? root.as<mucomp::ContainerVisual>() : (*visuals)[n.parent];
    parent.Children().InsertAtTop(v);
  }
  QueryPerformanceCounter(&b);
  g_mountMs = static_cast<double>(b.QuadPart - a.QuadPart) * 1000.0 / static_cast<double>(f.QuadPart);
  mark("mount_end");

  auto nextFrame = [compositor, queue](std::function<void()> next) {
    compositor.RequestCommitAsync().Completed([queue, next](auto&&, auto&&) { queue.TryEnqueue([next]() { next(); }); });
  };
  nextFrame([=]() {
    afterFirstFrame(nextFrame, [=](int shift) {
      for (size_t i = 1; i < visuals->size(); ++i) {
        const Node& n = (*nodes)[i];
        (*visuals)[i].Offset({n.x + shift, n.y, 0});
      }
    });
  });

  MSG msg;
  while (GetMessageW(&msg, nullptr, 0, 0)) {
    TranslateMessage(&msg);
    DispatchMessageW(&msg);
  }
  return 0;
}

void parseArgs() {
  int argc = 0;
  LPWSTR* argv = CommandLineToArgvW(GetCommandLineW(), &argc);
  for (int i = 1; i + 1 < argc; i += 2) {
    std::wstring key = argv[i];
    std::wstring value = argv[i + 1];
    if (key == L"--mode") g_options.mode = value;
    else if (key == L"--nodes") g_options.nodes = _wtoi(value.c_str());
    else if (key == L"--controls") g_options.controls = _wtoi(value.c_str());
    else if (key == L"--updates") g_options.updates = _wtoi(value.c_str());
    else if (key == L"--hold") g_options.holdMs = _wtoi(value.c_str());
    else if (key == L"--out") g_options.out = value;
    else if (key == L"--tag") g_options.tag = value;
  }
  LocalFree(argv);
}

} // namespace

int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
  FILETIME creation, exitTime, kernel, user;
  GetProcessTimes(GetCurrentProcess(), &creation, &exitTime, &kernel, &user);
  g_creation100ns = (static_cast<ULONGLONG>(creation.dwHighDateTime) << 32) | creation.dwLowDateTime;
  parseArgs();
  SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX);
  SetUnhandledExceptionFilter(onCrash);
  mark("main");
  init_apartment(apartment_type::single_threaded);
  if (g_options.mode == L"comp" || g_options.mode == L"comp-shape") return runComposition();
  return runXaml();
}
