[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Resolve-Claude.ps1')
$claudeExecutable = Resolve-ClaudeExecutable
& $claudeExecutable plugin uninstall cc-ru@claude-code-ru --scope user --keep-data
if ($LASTEXITCODE -ne 0) { throw 'Claude Code не подтвердил удаление плагина.' }
Write-Output 'cc-ru удалён. Другие плагины и настройки не изменялись. Откройте новую сессию.'
