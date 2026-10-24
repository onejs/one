# Drives the window island host with real input, the way a person would, and
# checks each step against its trace: a click on the WinUI switch, Tab out of
# its island and back in, Space on the parent and on the switch, a window
# resize, an unmount and a remount from the React app, and closing the window.
# Each step captures the window at native density into -Out. Exits 1 when any
# check fails; drive.txt in -Out lists every check.
#   drive.ps1 -Exe <OneWindowsIsland.exe> -Bundle <island.hbc> -Out <dir>
param(
  [Parameter(Mandatory)] [string] $Exe,
  [Parameter(Mandatory)] [string] $Bundle,
  [Parameter(Mandatory)] [string] $Out
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $Out | Out-Null
$Out = (Resolve-Path $Out).Path
$tracePath = Join-Path $Out 'trace.txt'
$report = Join-Path $Out 'drive.txt'
Remove-Item $tracePath, $report -ErrorAction SilentlyContinue

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class Desktop {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort wVk, wScan; public uint dwFlags, time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] struct INPUTUNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public INPUTUNION u; }

  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint count, INPUT[] inputs, int size);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int index);
  [StructLayout(LayoutKind.Sequential)] struct POINT { public int X, Y; }
  [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr hwnd, ref POINT point);

  public static int[] ToScreen(IntPtr hwnd, int x, int y) {
    var point = new POINT { X = x, Y = y };
    if (!ClientToScreen(hwnd, ref point)) throw new Exception("ClientToScreen failed");
    return new[] { point.X, point.Y };
  }
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int attribute, out RECT rect, int size);

  public static void PerMonitorAware() { SetProcessDpiAwarenessContext(new IntPtr(-4)); }

  // the window's visible bounds in physical pixels, without the resize border
  public static RECT Bounds(IntPtr hwnd) {
    RECT rect;
    Marshal.ThrowExceptionForHR(DwmGetWindowAttribute(hwnd, 9, out rect, Marshal.SizeOf(typeof(RECT))));
    return rect;
  }

  static void Send(INPUT[] inputs) {
    if (SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT))) != inputs.Length)
      throw new Exception("SendInput failed with error " + Marshal.GetLastWin32Error());
  }

  public static void Click(int x, int y) {
    SetCursorPos(x, y);
    var inputs = new INPUT[2];
    inputs[0].u.mi.dwFlags = 0x0002;
    inputs[1].u.mi.dwFlags = 0x0004;
    Send(inputs);
  }

  public static void Key(ushort vk) {
    var inputs = new INPUT[2];
    inputs[0].type = 1; inputs[0].u.ki.wVk = vk;
    inputs[1].type = 1; inputs[1].u.ki.wVk = vk; inputs[1].u.ki.dwFlags = 0x0002;
    Send(inputs);
  }
}
'@
[Desktop]::PerMonitorAware() | Out-Null

$failures = 0
function Note($line) { $line | Tee-Object -Append -FilePath $report | Out-Host }

function TraceLines {
  if (-not (Test-Path $tracePath)) { return @() }
  $stream = [IO.File]::Open($tracePath, 'Open', 'Read', 'ReadWrite')
  try { $text = (New-Object IO.StreamReader $stream).ReadToEnd() } finally { $stream.Dispose() }
  return @($text -split "`r?`n" | Where-Object { $_ })
}

# trace lines are numbered from 0; a step looks only at lines after its mark
$script:mark = 0
function Mark { $script:mark = (TraceLines).Count }

# waits for a trace line after the mark that matches, records the check and
# returns the match
function Expect($what, $pattern, $timeout = 15000) {
  $deadline = (Get-Date).AddMilliseconds($timeout)
  do {
    $lines = TraceLines
    for ($i = $script:mark; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match $pattern) {
        Note "PASS $what :: $($lines[$i].Trim())"
        return $Matches
      }
    }
    if ($process.HasExited) { break }
    Start-Sleep -Milliseconds 50
  } while ((Get-Date) -lt $deadline)
  $script:failures++
  Note "FAIL $what :: no trace line matching /$pattern/"
  return $null
}

# checks that no trace line after the mark matches for a while
function Absent($what, $pattern, $wait = 1000) {
  Start-Sleep -Milliseconds $wait
  $hit = (TraceLines | Select-Object -Skip $script:mark) -match $pattern | Select-Object -First 1
  if ($hit) {
    $script:failures++
    Note "FAIL $what :: $($hit.Trim())"
  } else {
    Note "PASS $what :: nothing matched /$pattern/ in $wait ms"
  }
}

function Shot($name) {
  # the composition commit after the transaction reaches the screen
  Start-Sleep -Milliseconds 600
  $r = [Desktop]::Bounds($script:hwnd)
  $bitmap = New-Object Drawing.Bitmap ($r.Right - $r.Left), ($r.Bottom - $r.Top)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($r.Left, $r.Top, 0, 0, $bitmap.Size)
  $bitmap.Save((Join-Path $Out "$name.png"), [Drawing.Imaging.ImageFormat]::Png)
  $size = "$($bitmap.Width)x$($bitmap.Height) at $($r.Left) $($r.Top)"
  $graphics.Dispose()
  $bitmap.Dispose()
  Note "shot $name.png $size px at dpi $([Desktop]::GetDpiForWindow($script:hwnd)), foreground $([Desktop]::GetForegroundWindow() -eq $script:hwnd)"
}

# the switch track's latest center, on screen where the window is now
function Track($tag) {
  $hit = (TraceLines) -match "toggle $tag track at client (-?\d+) (-?\d+)$" | Select-Object -Last 1
  if ($hit -notmatch 'at client (-?\d+) (-?\d+)$') { throw "no track position for toggle $tag" }
  return [Desktop]::ToScreen($script:bridge, [int]$Matches[1], [int]$Matches[2])
}

function Acknowledged($what, $tag, $event, $isOn, $label) {
  $state = if ($isOn) { 'on' } else { 'off' }
  Expect "$what native input" "native toggle $tag toggled $state by input, event $event$"
  Expect "$what reaches React" "react onIsOnChange isOn=$($isOn.ToString().ToLower()) eventCount=$event "
  Expect "$what comes back acknowledged" "toggle $tag event $event came back from React acknowledged after"
  Expect "$what mounts React's label" ([regex]::Escape("toggle $tag props isOn=$($isOn.ToString().ToLower()) ") + ".*acknowledgedEvent=$event label=`"$([regex]::Escape($label))`"")
}

$start = New-Object Diagnostics.ProcessStartInfo $Exe
$start.ArgumentList.Add($Bundle)
$start.ArgumentList.Add($tracePath)
$start.UseShellExecute = $false
$start.RedirectStandardInput = $true
$start.WorkingDirectory = Split-Path $Exe
$process = [Diagnostics.Process]::Start($start)
Note "host pid $($process.Id)"

try {
  # launch: the React tree mounts with the switch in its own island
  $shown = Expect 'window shown' 'window shown: app hwnd 0x([0-9a-f]+), bridge hwnd 0x([0-9a-f]+)'
  if (-not $shown) { throw 'the window never showed' }
  $script:hwnd = [IntPtr][Convert]::ToInt64($shown[1], 16)
  $script:bridge = [IntPtr][Convert]::ToInt64($shown[2], 16)
  # the screen's origin, so the whole window is on screen for its captures;
  # no size or z-order change, no activation
  [Desktop]::SetWindowPos($script:hwnd, [IntPtr]::Zero, 0, 0, 0, 0, 0x0015) | Out-Null
  Expect 'bytecode bundle' 'bytes of Hermes bytecode'
  Expect 'surface started' 'surface \d+ started for OneWindowsIsland'
  Expect 'xaml loads lazily' 'Microsoft.UI.Xaml.dll loaded before: false'
  $connected = Expect 'child island' 'toggle (\d+) island connected through a ChildSiteLink'
  if (-not $connected) { throw 'the switch island never connected' }
  $tag = $connected[1]
  Expect 'initial props' "toggle $tag props isOn=false revision=1 acknowledgedEvent=0 label=`"React: off, 0 changes, switch 1`""
  Expect 'track position' "toggle $tag track at client"
  Shot '1-launch'

  # a click on the track toggles the native switch and takes pointer focus
  Mark
  $x, $y = Track $tag
  Note "click toggle $tag at $x $y"
  [Desktop]::Click($x, $y)
  Acknowledged 'click' $tag 1 $true 'React: on, 1 changes, switch 1'
  Expect 'click focus' "toggle $tag got focus \(Pointer\)"
  Expect 'focus reaches React' 'react onFocusChange focused=true'
  Expect 'React mounts a square' 'transaction \d+ mounted: [1-9]\d* create'
  Shot '2-click'

  # Tab past the switch, its island's only stop, departs to the parent island
  Mark
  [Desktop]::Key(0x09)
  Expect 'focus departs' "focus departs toggle $tag island, reason \d+; parent island took focus: true"
  Expect 'switch loses focus' "toggle $tag lost focus"
  Expect 'blur reaches React' 'react onFocusChange focused=false'
  Shot '3-tab-out'

  # with the parent focused, Space reaches the parent and not the switch
  Mark
  [Desktop]::Key(0x20)
  Expect 'parent gets Space' 'parent island key 32'
  Absent 'Space leaves the switch alone' 'native toggle \d+ toggled'

  # Tab on the parent navigates into the switch's island
  Mark
  [Desktop]::Key(0x09)
  Expect 'parent gets Tab' 'parent island key 9'
  Expect 'focus navigates in' "Tab navigates focus into toggle $tag island: moved"
  Expect 'keyboard focus' "toggle $tag got focus \(Keyboard\)"
  Expect 'focus reaches React again' 'react onFocusChange focused=true'
  Shot '4-tab-in'

  # Space on the focused switch is native keyboard input
  Mark
  [Desktop]::Key(0x20)
  Acknowledged 'Space' $tag 2 $false 'React: off, 2 changes, switch 1'
  Shot '5-space'

  # a larger window, still on screen, lays the surface out again and moves
  # the island with it
  Mark
  $before = (TraceLines) -match "toggle $tag track at client" | Select-Object -Last 1
  $before = $before.Substring($before.IndexOf('track at client'))
  $bounds = [Desktop]::Bounds($script:hwnd)
  $width = [Math]::Min($bounds.Right - $bounds.Left + 320, [Desktop]::GetSystemMetrics(0))
  $height = [Math]::Min($bounds.Bottom - $bounds.Top + 200, [Desktop]::GetSystemMetrics(1) - 60)
  Note "resize from $($bounds.Right - $bounds.Left)x$($bounds.Bottom - $bounds.Top) to ${width}x$height at 0 0"
  # no z-order change, no activation
  [Desktop]::SetWindowPos($script:hwnd, [IntPtr]::Zero, 0, 0, $width, $height, 0x0014) | Out-Null
  Expect 'surface resized' 'surface \d+(\.\d+)?x\d+(\.\d+)? DIPs'
  Expect 'layout transaction' 'transaction \d+ mounted: 0 create, 0 delete, 0 insert, 0 remove, [1-9]\d* update'
  Expect 'island moved' "toggle $tag (?!$([regex]::Escape($before))$)track at client"
  $x, $y = Track $tag
  Shot '6-resize'
  Mark
  Note "click toggle $tag at $x $y"
  [Desktop]::Click($x, $y)
  Acknowledged 'click after resize' $tag 3 $true 'React: on, 3 changes, switch 1'
  Shot '7-resize-click'

  # React unmounts the switch, closing its island, and mounts a new one
  Mark
  $process.StandardInput.WriteLine('unmount')
  $process.StandardInput.Flush()
  Expect 'unmount reaches React' 'react command unmount'
  Expect 'island closes' "toggle $tag island closed; 0 islands open"
  Shot '8-unmount'
  Mark
  $process.StandardInput.WriteLine('mount')
  $process.StandardInput.Flush()
  Expect 'mount reaches React' 'react command mount'
  $remounted = Expect 'new child island' 'toggle (\d+) island connected through a ChildSiteLink'
  if (-not $remounted) { throw 'the new switch island never connected' }
  $next = $remounted[1]
  if ($next -eq $tag) { $script:failures++; Note "FAIL remount reused tag $tag" }
  Expect 'new switch props' "toggle $next props isOn=true revision=2 acknowledgedEvent=0 label=`"React: on, 3 changes, switch 2`""
  Expect 'new track position' "toggle $next track at client"
  Shot '9-remount'
  Mark
  $x, $y = Track $next
  Note "click toggle $next at $x $y"
  [Desktop]::Click($x, $y)
  Acknowledged 'click on the new switch' $next 1 $false 'React: off, 4 changes, switch 2'
  Shot '10-remount-click'

  # closing the window stops the surface, unmounts the tree and its island,
  # and destroys the runtime before the window goes
  Mark
  [Desktop]::PostMessage($script:hwnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
  Expect 'close stops the surface' 'close requested: stopping the surface'
  Expect 'teardown closes the island' "toggle $next island closed; 0 islands open"
  Expect 'teardown completes' 'teardown complete: runtime destroyed, 0 views and 0 islands remain'
  Expect 'clean exit' 'exit 0$'
} catch {
  $script:failures++
  Note "FAIL $($_.Exception.Message)"
  if ($script:hwnd) {
    try { Shot 'failure' } catch { Note "no failure shot: $($_.Exception.Message)" }
  }
} finally {
  if (-not $process.WaitForExit(15000)) {
    $script:failures++
    Note "FAIL host still running; stopping pid $($process.Id)"
    $process.Kill()
    $process.WaitForExit()
  }
  Note "host exited $($process.ExitCode)"
  if ($process.ExitCode -ne 0) { $script:failures++ }
}
Note "$failures failures"
exit ([int]($failures -gt 0))
