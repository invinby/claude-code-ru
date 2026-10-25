[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Resolve-Claude.ps1')
$claudeExecutable = Resolve-ClaudeExecutable
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pluginRoot = Join-Path $repositoryRoot 'mods\cc-ru'
if (-not (Test-Path -LiteralPath (Join-Path $pluginRoot 'dict.json') -PathType Leaf)) {
    throw 'Словарь dict.json отсутствует. Скачайте полный выпуск проекта.'
}
& $claudeExecutable plugin validate $pluginRoot --strict
if ($LASTEXITCODE -ne 0) { throw 'Проверка плагина не прошла. Установка остановлена.' }
& $claudeExecutable plugin install cc-ru --marketplace $repositoryRoot --scope user
if ($LASTEXITCODE -ne 0) { throw 'Claude Code не подтвердил установку плагина.' }
Write-Output 'cc-ru установлен. Откройте новую сессию claude и проверьте меню /.'
