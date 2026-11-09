# usage: python3 -I apply.py <app dir holding AppDelegate.swift> ; adds the startup marks
# (the helper is appended to AppDelegate.swift so the xcode project needs no new file; app_delegate_init in AppDelegate.init, first_content on the shell appearance; routed_content from the page layout effect).
import os, sys
d = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(d, 'AppDelegate.swift')
s = open(path).read()
if 'startupMark' not in s:
    s = s.replace(
        '  var reactNativeFactory: RCTReactNativeFactory?\n',
        '''  var reactNativeFactory: RCTReactNativeFactory?

  override init() {
    super.init()
    startupMark("app_delegate_init")
    var seen = false
    NotificationCenter.default.addObserver(
      forName: NSNotification.Name("RCTContentDidAppearNotification"), object: nil, queue: nil
    ) { _ in
      if seen { return }
      seen = true
      startupMark("first_content")
    }
  }
''', 1)
    s += '\n' + open(os.path.join(here, 'StartupMarks.swift')).read()
    open(path, 'w').write(s)

# optionally instrument the page that represents routed content, rather than the router shell
if len(sys.argv) > 2:
    page = sys.argv[2]
    source = open(page).read()
    if 'oneStartupRoutedEpoch' not in source:
        source = "import { Settings as StartupSettings } from 'react-native'\nimport { useLayoutEffect as startupLayoutEffect } from 'react'\n" + source
        source = source.replace('  return (', '  startupLayoutEffect(() => { StartupSettings.set({ oneStartupRoutedEpoch: Date.now() }) }, [])\n  return (', 1)
        open(page, 'w').write(source)
