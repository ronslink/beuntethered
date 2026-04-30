$ErrorActionPreference = "Stop"

$port = 3200
$root = Split-Path -Parent $PSScriptRoot
$outLog = Join-Path $root ".next-e2e-out.log"
$errLog = Join-Path $root ".next-e2e-err.log"

function Stop-PortListeners {
  param([int]$TargetPort)

  $listeners = netstat -ano |
    Select-String ":$TargetPort" |
    Where-Object { $_ -match "LISTENING" } |
    ForEach-Object { ($_ -split "\s+")[-1] } |
    Sort-Object -Unique

  foreach ($listener in $listeners) {
    if ($listener -match "^\d+$" -and [int]$listener -ne 0) {
      Stop-Process -Id ([int]$listener) -Force -ErrorAction SilentlyContinue
    }
  }
}

Stop-PortListeners -TargetPort $port
Remove-Item -LiteralPath $outLog, $errLog -Force -ErrorAction SilentlyContinue

$env:STRIPE_SECRET_KEY = if ($env:STRIPE_SECRET_KEY) { $env:STRIPE_SECRET_KEY } else { "sk_test_playwright_e2e" }
$env:STRIPE_WEBHOOK_SECRET = if ($env:STRIPE_WEBHOOK_SECRET) { $env:STRIPE_WEBHOOK_SECRET } else { "whsec_playwright_test_secret" }
$env:RESEND_API_KEY = ""

$server = Start-Process `
  -FilePath "node" `
  -ArgumentList "./node_modules/next/dist/bin/next", "dev", "-p", "$port" `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -PassThru

try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/login" -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $ready) {
    Get-Content $outLog -Tail 80 -ErrorAction SilentlyContinue
    Get-Content $errLog -Tail 80 -ErrorAction SilentlyContinue
    throw "Next dev server did not become ready on port $port."
  }

  $env:PLAYWRIGHT_REUSE_SERVER = "1"
  $playwright = Join-Path $root "node_modules\.bin\playwright.cmd"
  $playwrightArgs = @("test", "--workers=1", "--reporter=line") + $args
  & $playwright @playwrightArgs
  exit $LASTEXITCODE
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
  Stop-PortListeners -TargetPort $port
}
