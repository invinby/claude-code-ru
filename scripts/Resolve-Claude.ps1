function Resolve-ClaudeExecutable {
    $command = Get-Command claude.exe, claude -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
    $candidate = Join-Path $env:APPDATA 'npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe'
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    throw 'Claude Code не найден. Установите официальный Claude Code и откройте новый терминал.'
}
