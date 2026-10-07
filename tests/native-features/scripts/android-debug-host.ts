// point the debug host at this run's metro: the stock emulator reaches the
// host loopback as 10.0.2.2. pm clear wipes both preferences and the
// local-network grant, so restore them before launching after every clear.
export function stampAndroidDebugHost(
  packageId: string,
  metroPort: number,
  adb: (args: string[]) => string
) {
  // android 17 gates metro behind local-network permission, including on
  // fresh installs and after pm clear. grant only this dev-tooling permission;
  // the module-under-test permissions remain untouched.
  const sdk = Number(adb(['shell', 'getprop', 'ro.build.version.sdk']).trim())
  if (sdk >= 37) {
    adb(['shell', 'pm', 'grant', packageId, 'android.permission.ACCESS_LOCAL_NETWORK'])
  }
  // adb shell joins argv with spaces and re-parses on device, so the -c
  // script travels inside its own double quotes; the xml attribute quotes
  // are backslash-escaped for the device shell.
  const script = `mkdir -p shared_prefs && echo '<map><string name=\\"debug_http_host\\">10.0.2.2:${metroPort}</string></map>' > shared_prefs/${packageId}_preferences.xml`
  adb(['shell', 'run-as', packageId, 'sh', '-c', `"${script}"`])
}
