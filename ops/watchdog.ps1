$ErrorActionPreference='Stop'
$ProjectRoot=Split-Path -Parent $PSScriptRoot
$log=Join-Path $PSScriptRoot 'watchdog.log'
$stateFile=Join-Path $PSScriptRoot 'watchdog-state.json'
function Log([string]$m){Add-Content -LiteralPath $log -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+' '+$m) -Encoding UTF8}
function Get-State(){try{Get-Content -LiteralPath $stateFile -Raw|ConvertFrom-Json}catch{[pscustomobject]@{lastRestart=0;failures=0}}}
function Save-State($s){$s|ConvertTo-Json|Set-Content -LiteralPath $stateFile -Encoding UTF8}
function Start-GameServer([string]$reason){
  $state=Get-State;$now=[DateTimeOffset]::Now.ToUnixTimeSeconds();if(($now-[int64]$state.lastRestart)-lt 45){Log "cooldown reason=$reason";return}
  Log "RESTART reason=$reason"
  Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'node.exe' -and $_.CommandLine -match 'backend/server.js'} | ForEach-Object {Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue}
  Start-Sleep -Seconds 1
  Start-Process -FilePath 'node.exe' -ArgumentList 'backend/server.js' -WorkingDirectory $ProjectRoot -WindowStyle Hidden | Out-Null
  $state.lastRestart=$now;$state.failures=0;Save-State $state
}
try{
  $health=Invoke-RestMethod 'http://127.0.0.1:3000/api/competition/health' -TimeoutSec 5
  $state=Get-State;$state.failures=0;Save-State $state
  $reasons=@($health.tiktok.activity.reasons)
  if($reasons -contains 'RECONNECT_STUCK'){Start-GameServer 'tiktok_reconnect_stuck';exit}
  if($reasons -contains 'TRANSPORT_STALE'){Start-GameServer 'tiktok_transport_stale';exit}
  if($reasons -contains 'FAILURE_GROWTH'){Start-GameServer 'tiktok_failure_growth';exit}
  if((-not $health.tiktok.connected) -and (-not $health.tiktok.retrying)){Start-GameServer 'tiktok_disconnected_not_retrying';exit}
  Log ("OK active={0} queue={1} tiktokConnected={2} retrying={3}" -f $health.active,$health.queue,$health.tiktok.connected,$health.tiktok.retrying)
}catch{
  $state=Get-State;$state.failures=[int]$state.failures+1;Save-State $state
  Log ("ERROR failures={0} message={1}" -f $state.failures,$_.Exception.Message)
  if($state.failures -ge 2){Start-GameServer 'health_unreachable'}
}