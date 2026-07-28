$Repo = "filiks265/filiks"
$InstallDir = "$HOME\.filiks\bin"
$FiliksBin = "$InstallDir\filiks.exe"

$Arch = (Get-CimInstance Win32_ComputerSystem).SystemType
if ($Arch -match "ARM64") {
  $Target = "windows-arm64"
} else {
  $Target = "windows-x64"
}

Write-Host "Downloading filiks for $Target..." -ForegroundColor Cyan
$Url = "https://github.com/$Repo/releases/latest/download/filiks-$Target.tar.gz"
$Tarball = "$env:TEMP\filiks.tar.gz"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Invoke-WebRequest -Uri $Url -OutFile $Tarball

tar -xzf $Tarball -C $InstallDir
Remove-Item $Tarball

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
  $NewPath = "$UserPath;$InstallDir"
  [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
  Write-Host "Added $InstallDir to user PATH" -ForegroundColor Green
  Write-Host "Restart your terminal or start a new one." -ForegroundColor Yellow
}

Write-Host "filiks installed to $FiliksBin" -ForegroundColor Green
Write-Host "Run: filiks" -ForegroundColor Cyan
