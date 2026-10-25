# Claude Code RU Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Русский плагин для доступных поверхностей терминального интерфейса Claude Code.
**Architecture:** Статический словарь и обработчики command.describe/config.describe/ui.render; неизвестные строки остаются исходными. Установка через штатный плагин, без изменения бинарника.
**Tech Stack:** TypeScript, JSON, встроенные claude plugin validate/test, PowerShell для установки.
**Spec:** design.md

## Global Constraints
- Базовая проверяемая версия: Claude Code 2.1.310 на Windows.
- Никаких вызовов модели/сети ради перевода интерфейса.
- Не менять команды, ключи, пользовательский вывод и решения о разрешениях.
- Непокрытые окна документировать; не называть перевод полным.

## Review Focus
- Изменившиеся после обновления английские строки: оставить оригинал.
- Кириллица, ANSI, эмодзи: не портить неизвестный текст.
- Динамические значения модели/путей: сохранять буквально.
- Установка поверх других плагинов: сохранять существующие настройки.
- Удаление: отключать только cc-ru.

### Task 1: Перевод и тесты
Files: mods/cc-ru/hooks/register.ts, mods/cc-ru/dict.json, mods/cc-ru/tests/register.test.tsx.
Interfaces: translate(dictionary,text) -> string; register(on) -> void.
- [ ] Тесты точного перевода, неизменности неизвестного текста, динамического имени модели и настоящих command.describe/config.describe.
- [ ] Запустить и увидеть ошибки отсутствующей реализации.
- [ ] Реализовать словарь и разрешённые обработчики UI.
- [ ] claude plugin validate/test: проходят, изменения разрешений/сети отсутствуют.

### Task 2: Установка, реальный терминал
Files: scripts/Install.ps1, scripts/Uninstall.ps1, README.md, .claude-plugin/marketplace.json.
Interfaces: install adds local marketplace and installs cc-ru at user scope; uninstall removes only cc-ru.
- [ ] Проверить манифест и ошибки некорректных путей.
- [ ] Установить проверенный плагин штатным CLI.
- [ ] Открыть меню / в настоящем терминале и проверить русский текст, собрать непокрытые описания.
- [ ] Зафиксировать покрытие и ограничения.

### Task 3: Публикация
Files: LICENSE, README.md, Git history.
- [ ] Проверить файлы на токены и личные данные, не включать снимки пользовательских журналов.
- [ ] Создать GitHub-репозиторий invinby/claude-code-ru и отправить проверенные исходники.
- [ ] Проверить доступность репозитория и сообщить фактический результат.

