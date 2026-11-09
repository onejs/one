# usage: python3 -I apply.py <app dir holding AppDelegate.swift> ; adds the startup marks
# (the helper is appended to AppDelegate.swift so the xcode project needs no new file; app_delegate_init in AppDelegate.init, routed_content on the first content appearance).
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
      startupMark("routed_content")
    }
  }
''', 1)
    s += '\n' + open(os.path.join(here, 'StartupMarks.swift')).read()
    open(path, 'w').write(s)
