param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ArgsForScript
)

$ErrorActionPreference = "Stop"

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  & $node.Source --version *> $null
  if ($LASTEXITCODE -eq 0) {
    & $node.Source "$PSScriptRoot\smart-shuffle-playlist.js" @ArgsForScript
    exit $LASTEXITCODE
  }
}

$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if (Test-Path $bundledNode) {
  & $bundledNode "$PSScriptRoot\smart-shuffle-playlist.js" @ArgsForScript
  exit $LASTEXITCODE
}

Write-Error "Node.js was not found. Install Node.js from https://nodejs.org/ or add node.exe to PATH."
exit 1
