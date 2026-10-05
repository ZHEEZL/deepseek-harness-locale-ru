#Requires -Version 7
<#
.SYNOPSIS
    Install the Russian language pack for the DeepSeek Harness web GUI.

.DESCRIPTION
    Copies the package into <HarnessHome>/plugins/dsh-client-locale-ru, mounts it
    from the Harness-home patch layer, and records the durable locale preference in
    the profile patch - the same edit the Settings page makes when a language is
    picked. Every step is idempotent: re-running the script changes nothing.

.PARAMETER HarnessHome
    The Harness home. Defaults to $env:DSH_HOME, then to ~/.dsh.

.PARAMETER Profile
    The profile whose patch records the language preference. Defaults to desktop.

.PARAMETER NoPreference
    Mount the pack without switching the interface language.

.EXAMPLE
    pwsh -File tools/install.ps1

.EXAMPLE
    pwsh -File tools/install.ps1 -HarnessHome D:/dsh-home -Profile web
#>
param(
    [string] $HarnessHome,
    [string] $Profile = "desktop",
    [switch] $NoPreference
)

$ErrorActionPreference = "Stop"
$utf8 = [System.Text.UTF8Encoding]::new($false)
$newline = [string][char]10

function Write-Utf8([string] $Path, [string] $Text) {
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

$repo = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content (Join-Path $repo "package.json") -Raw | ConvertFrom-Json
$packDir = "dsh-client-locale-ru"

if (-not $HarnessHome) {
    $HarnessHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE ".dsh" }
}

# 1. the package itself
$destination = Join-Path $HarnessHome "plugins/$packDir"
New-Item -ItemType Directory -Force -Path (Join-Path $destination "lib") | Out-Null
foreach ($file in "package.json", "README.md", "LICENSE") {
    $from = Join-Path $repo $file
    if (Test-Path $from) { Copy-Item $from (Join-Path $destination $file) -Force }
}
foreach ($file in Get-ChildItem (Join-Path $repo "lib") -File) {
    Copy-Item $file.FullName (Join-Path $destination "lib") -Force
}

# 2. the Harness-home patch layer that mounts the row
$homePatch = Join-Path $HarnessHome "cordis.patch.yml"
$mount = @(
    "- insert:",
    "    - id: locale-ru",
    "      name: ./plugins/$packDir/lib/index.js"
) -join $newline
if (-not (Test-Path $homePatch)) {
    $header = @(
        "# Harness-home user patch layer, applied after every bundle and profile layer.",
        "# Mounts the Russian language pack: a client plugin that adds the ru language",
        "# to the web GUI locale catalog and registers its dictionaries."
    ) -join $newline
    Write-Utf8 $homePatch ($header + $newline + $mount + $newline)
} elseif ((Get-Content $homePatch -Raw) -notmatch [regex]::Escape($packDir)) {
    $current = (Get-Content $homePatch -Raw).TrimEnd()
    Write-Utf8 $homePatch ($current + $newline + $newline + $mount + $newline)
}

# 3. the durable locale preference, written the way the Settings page writes it
$profilePatch = Join-Path $HarnessHome "profiles/$Profile/cordis.patch.yml"
if (-not $NoPreference) {
    if (-not (Test-Path (Split-Path -Parent $profilePatch))) {
        Write-Warning "profile $Profile is not initialized; skipping the language preference"
    } else {
        if (-not (Test-Path $profilePatch)) { Write-Utf8 $profilePatch "[]$newline" }
        $current = Get-Content $profilePatch -Raw
        if ($current -notmatch "(?m)^\s+preference:\s*ru\s*$") {
            if ($current.Trim() -eq "[]") { $current = "" }
            $preference = @(
                "",
                "# Russian UI: the durable locale preference (Settings -> General -> Language).",
                "- id: locale",
                "  config:",
                "    preference: ru"
            ) -join $newline
            Write-Utf8 $profilePatch ($current.TrimEnd() + $preference + $newline)
        }
    }
}

Write-Output "package:   $destination"
Write-Output "mount:     $homePatch"
Write-Output "preference: $profilePatch"
Write-Output "Harness home: $HarnessHome"
