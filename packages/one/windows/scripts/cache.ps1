# the user cache the Windows build keeps per react-native version
$Cache = if ($env:ONE_WINDOWS_CACHE) { $env:ONE_WINDOWS_CACHE } else { "$env:LOCALAPPDATA/one/windows" }

function RnVersion {
  (Get-Content "$env:RN_ROOT/package.json" -Raw | ConvertFrom-Json).version
}

function HermesVersion {
  foreach ($line in Get-Content "$env:RN_ROOT/sdks/hermes-engine/version.properties") {
    if ($line -match '^HERMES_VERSION_NAME=(.*)$') { return $Matches[1] }
  }
  throw 'no HERMES_VERSION_NAME in version.properties'
}

# runs a native command and fails the script when it fails
function Run {
  & $args[0] @($args | Select-Object -Skip 1)
  if ($LASTEXITCODE) { throw "$($args[0]) exited with $LASTEXITCODE" }
}
