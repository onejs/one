param(
  [Parameter(Mandatory = $true)][string]$Exe,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [int]$Reps = 8
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$results = Join-Path $OutDir 'results.jsonl'
Remove-Item $results -ErrorAction SilentlyContinue

function Invoke-Probe([string]$mode, [int]$nodes, [int]$controls, [string]$tag, [string]$out, [int]$updates = 20, [int]$hold = 0) {
  $probeArgs = @('--mode', $mode, '--nodes', $nodes, '--controls', $controls, '--updates', $updates, '--hold', $hold, '--out', $out, '--tag', $tag)
  $p = Start-Process -FilePath $Exe -ArgumentList $probeArgs -PassThru
  return $p
}

$cases = @(
  @{ mode = 'comp'; nodes = 0; controls = 0 },
  @{ mode = 'xaml'; nodes = 0; controls = 0 },
  @{ mode = 'comp'; nodes = 300; controls = 0 },
  @{ mode = 'xaml'; nodes = 300; controls = 0 },
  @{ mode = 'xaml-grid'; nodes = 300; controls = 0 },
  @{ mode = 'xaml'; nodes = 300; controls = 25 },
  @{ mode = 'comp'; nodes = 3000; controls = 0 },
  @{ mode = 'xaml'; nodes = 3000; controls = 0 },
  @{ mode = 'xaml-grid'; nodes = 3000; controls = 0 }
)

# interleaved repetitions; rep0 is the cold warmup and is dropped by the summary
for ($r = 0; $r -lt $Reps; $r++) {
  foreach ($c in $cases) {
    $p = Invoke-Probe $c.mode $c.nodes $c.controls "rep$r" $results
    if (-not $p.WaitForExit(60000)) {
      $p.Kill()
      Write-Host "timeout: $($c.mode) nodes=$($c.nodes) controls=$($c.controls) rep=$r"
    }
  }
}

# screenshots prove each mode actually drew its tree in a real desktop session
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$shots = @(
  @{ mode = 'comp'; nodes = 300; controls = 0 },
  @{ mode = 'xaml'; nodes = 300; controls = 0 },
  @{ mode = 'xaml-grid'; nodes = 300; controls = 0 },
  @{ mode = 'xaml'; nodes = 300; controls = 25 }
)
foreach ($s in $shots) {
  $p = Invoke-Probe $s.mode $s.nodes $s.controls 'shot' (Join-Path $OutDir 'shots.jsonl') 0 5000
  Start-Sleep -Milliseconds 3000
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $bitmap.Save((Join-Path $OutDir "shot-$($s.mode)-$($s.nodes)-c$($s.controls).png"))
  $graphics.Dispose()
  $bitmap.Dispose()
  $p.WaitForExit(20000) | Out-Null
}
