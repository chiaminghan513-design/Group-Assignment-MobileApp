param(
    [switch]$ReconnectPhone,
    [string]$DeviceSerial,
    [int]$MobilePort = 8101,
    [int]$PosPort = 8100,
    [int]$WebPort = 5056,
    [int]$AdminPort = 7017
)
$ErrorActionPreference = 'Stop'

function Test-ServicePort([string]$Label, [int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new([System.Net.Sockets.AddressFamily]::InterNetworkV6)
    $client.Client.DualMode = $true
    try {
        $task = $client.ConnectAsync('localhost', $Port)
        if (-not $task.Wait(2000)) { throw 'Connection timed out' }
        [void]$task.GetAwaiter().GetResult()
        [pscustomobject]@{ Check = $Label; Result = 'Ready'; Detail = "localhost:$Port accepts connections" }
    } catch {
        [pscustomobject]@{ Check = $Label; Result = 'Not ready'; Detail = "Nothing reachable on localhost:$Port; start this project explicitly on its fixed port" }
    } finally { $client.Dispose() }
}

$results = @()
try {
    $health = Invoke-RestMethod -Uri 'http://localhost:3000/health' -TimeoutSec 5
    if ($health.status -ne 'ok') { throw 'Unexpected backend health response' }
    $results += [pscustomobject]@{ Check = 'Shared backend'; Result = 'Ready'; Detail = 'Health check passed on port 3000; this does not authenticate to the upstream API' }
} catch {
    $results += [pscustomobject]@{ Check = 'Shared backend'; Result = 'Not ready'; Detail = 'Start C:\IonicExercise\EduvoBackend before signing in' }
}
$results += Test-ServicePort 'Mobile browser' $MobilePort
$results += Test-ServicePort 'POS browser' $PosPort
$results += Test-ServicePort 'Member webpage' $WebPort
$results += Test-ServicePort 'Admin portal' $AdminPort

$adbPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $adbPath)) {
    $results += [pscustomobject]@{ Check = 'Android USB'; Result = 'Not ready'; Detail = 'Android SDK platform-tools/adb.exe is missing' }
} else {
    $devicesOutput = @(& $adbPath devices)
    if ($LASTEXITCODE -ne 0) { throw 'ADB could not list devices' }
    $connectedDevices = @($devicesOutput | Where-Object { $_ -match '^\S+\s+device$' } | ForEach-Object { ($_ -split '\s+')[0] })
    if ($DeviceSerial -and $connectedDevices -notcontains $DeviceSerial) { throw 'The selected device is not connected and authorized' }
    if (-not $DeviceSerial -and $connectedDevices.Count -eq 1) { $DeviceSerial = $connectedDevices[0] }
    if (-not $DeviceSerial) {
        $detail = if ($connectedDevices.Count -gt 1) { 'Several devices connected; pass -DeviceSerial to select one' } else { 'Connect the phone, enable USB debugging and accept its authorization prompt' }
        $results += [pscustomobject]@{ Check = 'Android USB'; Result = 'Needs attention'; Detail = $detail }
    } else {
        if ($ReconnectPhone) {
            & $adbPath -s $DeviceSerial reverse tcp:3000 tcp:3000
            if ($LASTEXITCODE -ne 0) { throw 'Could not restore backend USB forwarding' }
        }
        $forwardings = @(& $adbPath -s $DeviceSerial reverse --list)
        if ($LASTEXITCODE -ne 0) { throw 'Could not read USB forwarding' }
        $hasBackendForward = @($forwardings | Where-Object { $_ -match '\s+tcp:3000\s+tcp:3000\s*$' }).Count -gt 0
        $results += [pscustomobject]@{ Check = 'Android USB'; Result = if ($hasBackendForward) { 'Ready' } else { 'Needs attention' }; Detail = if ($hasBackendForward) { 'Phone localhost:3000 is forwarded to laptop backend' } else { 'Run this script with -ReconnectPhone after connecting the phone' } }
    }
}
$results | Format-Table -AutoSize -Wrap
Write-Output 'This checks service availability, not login, camera permission, QR decoding or upstream API behaviour. Native apps use the backend forwarding; their browser dev-server ports are not required on the phone.'
