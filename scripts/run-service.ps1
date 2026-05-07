param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("core", "notification", "workflow")]
    [string] $Service
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$services = @{
    core = @{
        Path = Join-Path $repoRoot "services/core-service"
        Port = "3000"
        VenvPython = "venv/Scripts/python.exe"
    }
    notification = @{
        Path = Join-Path $repoRoot "services/notification-service"
        Port = "3001"
        VenvPython = ".venv/Scripts/python.exe"
    }
    workflow = @{
        Path = Join-Path $repoRoot "services/workflow_service"
        Port = "3002"
        VenvPython = "venv/Scripts/python.exe"
    }
}

$config = $services[$Service]

function Test-PythonCandidate {
    param([string] $Command)

    try {
        $output = & $Command -c "import sys; print(sys.executable)" 2>$null
        return $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($output)
    } catch {
        return $false
    }
}

Set-Location $config.Path

$candidates = @(
    $config.VenvPython,
    "python",
    "py"
)

$python = $null
foreach ($candidate in $candidates) {
    if (Test-PythonCandidate $candidate) {
        $python = $candidate
        break
    }
}

if (-not $python) {
    Write-Error @"
Python is not available for $Service service.

Fix:
1. Install Python 3.12 from python.org, or disable the Windows Store Python app execution alias.
2. Recreate/install the service venv dependencies.
3. Run this command again.
"@
}

& $python -m uvicorn app.main:app --reload --host 0.0.0.0 --port $config.Port
