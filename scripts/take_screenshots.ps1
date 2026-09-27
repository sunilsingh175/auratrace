# AuraTrace Automated Screenshot Capture Script

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
}

$outputDir = Join-Path $PSScriptRoot "..\docs\screenshots"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$targets = @(
    @{ Name = "01-dashboard.png"; Url = "http://localhost:3000"; Width = 1440; Height = 900 },
    @{ Name = "02-incident-diagnosis.png"; Url = "http://localhost:3000/incidents/b626c341-8601-47cd-acc7-b5d3ee629229"; Width = 1440; Height = 1050 },
    @{ Name = "03-similar-incidents.png"; Url = "http://localhost:3000/incidents"; Width = 1440; Height = 900 },
    @{ Name = "04-settings.png"; Url = "http://localhost:3000/projects/02069d82-c01e-433a-9882-031512cd45f9/settings"; Width = 1440; Height = 900 },
    @{ Name = "05-setup-guide.png"; Url = "http://localhost:3000/projects/02069d82-c01e-433a-9882-031512cd45f9/setup"; Width = 1440; Height = 950 },
    @{ Name = "06-api-docs.png"; Url = "http://localhost:8000/docs"; Width = 1440; Height = 900 }
)

Write-Host "Starting AuraTrace Screenshot Capture..."

foreach ($target in $targets) {
    $outPath = Join-Path $outputDir $target.Name
    $windowSize = $target.Width.ToString() + "," + $target.Height.ToString()
    $screenArg = "--screenshot=" + $outPath
    $sizeArg = "--window-size=" + $windowSize
    
    Write-Host ("Capturing " + $target.Name + " from " + $target.Url)
    
    $proc = Start-Process -FilePath $edgePath -ArgumentList @(
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        $sizeArg,
        $screenArg,
        $target.Url
    ) -PassThru -NoNewWindow
    
    $proc.WaitForExit(8000)
    
    if (Test-Path $outPath) {
        $kb = [math]::Round(((Get-Item $outPath).Length / 1024), 1)
        Write-Host ("  -> Saved: " + $outPath + " (" + $kb + " KB)")
    } else {
        Write-Host ("  -> Failed to capture: " + $outPath)
    }
}

# Also save fresh container status snapshot
docker compose ps | Out-File -FilePath (Join-Path $outputDir "06-containers.txt") -Encoding utf8
Write-Host "All screenshots and container status saved to docs/screenshots/"
