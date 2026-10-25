import type { Register } from 'claude-code'

type Dictionary = { exact: Record<string, string>; spinner: Record<string, string> }
const EMPTY: Dictionary = { exact: {}, spinner: {} }
let dictionary: Promise<Dictionary> | undefined
const missingCommands = new Map<string, string>()
const missingConfig = new Set<string>()

export function parseDictionary(text: string): Dictionary {
  try {
    const value = JSON.parse(text)
    if (!value || !value.exact || typeof value.exact !== 'object' || Array.isArray(value.exact)) return EMPTY
    const strings = (obj: unknown): Record<string, string> => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
      return Object.fromEntries(Object.entries(obj).filter(([, v]) => typeof v === 'string' && v.trim().length > 0))
    }
    return { exact: strings(value.exact), spinner: strings(value.spinner) }
  } catch { return EMPTY }
}

/** Only complete UI strings match. Unknown bytes, ANSI and user values survive intact. */
export function translate(d: Dictionary, text: string): string {
  if (typeof text !== 'string') return text
  const bare = text.replace(/\x1b\[[0-9;]*m/g, '')
  if (Object.hasOwn(d.exact, bare)) return d.exact[bare]
  const model = /^Set the AI model for Claude Code \(currently (.+)\)$/.exec(text)
  if (model) return `Выбрать модель Claude Code (сейчас: ${model[1]})`
  const background = /^\(([^()\n]+) to run in background\)$/.exec(text)
  if (background) return `(${background[1]} — запустить в фоне)`
  return text
}

export function duration(ms: number): string {
  const seconds = Number.isFinite(ms) ? Math.max(0, Math.round(ms / 1000)) : 0
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  const rest = seconds % 60
  return hours ? `${hours} ч ${minutes} мин ${rest} с` : minutes ? `${minutes} мин ${rest} с` : `${rest} с`
}

export function groupLine(calls: ReadonlyArray<{ tool: string }>, active: boolean): string | undefined {
  const categories: Record<string, string> = { Read: 'Файлов прочитано', Grep: 'Поисков выполнено', Glob: 'Поисков файлов', LS: 'Каталогов просмотрено', Bash: 'Команд выполнено', PowerShell: 'Команд выполнено' }
  const count: Record<string, number> = {}
  for (const call of calls) {
    const label = categories[call.tool]
    if (!label) return undefined
    count[label] = (count[label] ?? 0) + 1
  }
  const entries = Object.entries(count)
  if (!entries.length) return undefined
  return (active ? 'В работе: ' : '') + entries.map(([label, n]) => `${label}: ${n}`).join(' · ')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    dictionary ??= $.fs.read(`${$.plugin.root}/dict.json`).then(parseDictionary).catch(() => EMPTY)
    await dictionary
    await $.command.register({ name: 'ru-status', description: 'Покрытие русского перевода и ограничения интерфейса' })
    return next(e)
  })

  on('command.run', { command: 'ru-status' }, async () => {
    const d = await dictionary ?? EMPTY
    return { text: [
      `Русский интерфейс cc-ru: ${Object.keys(d.exact).length} словарных записей.`,
      'Перевод выполняется локально, без запросов к модели.',
      `Непереведённых описаний команд: ${missingCommands.size}; настроек: ${missingConfig.size}.`,
      ...[...missingCommands].map(([name, text]) => `/${name}: ${text}`),
      'Это счётчики только увиденных строк, а не доказательство полного покрытия.',
      'Окна разрешений, стартовый экран, часть вложенных меню и --help остаются у движка.',
    ].join('\n') }
  })

  on('command.describe', async ($, e, next) => {
    dictionary ??= $.fs.read(`${$.plugin.root}/dict.json`).then(parseDictionary).catch(() => EMPTY)
    const d = await dictionary
    const original = await next(e)
    const description = translate(d, original.description ?? '')
    if (description === original.description && !/[А-Яа-яЁё]/.test(description) && /[a-z]{3}/i.test(description)) missingCommands.set(e.command, original.description)
    return { ...original, description, argumentHint: original.argumentHint ? translate(d, original.argumentHint) : original.argumentHint }
  })

  on('config.describe', async ($, e, next) => {
    dictionary ??= $.fs.read(`${$.plugin.root}/dict.json`).then(parseDictionary).catch(() => EMPTY)
    const d = await dictionary
    const original = await next(e)
    const label = translate(d, original.label ?? '')
    const description = original.description === undefined ? undefined : translate(d, original.description)
    if ((label === original.label && /[a-z]{3}/i.test(label)) ||
        (description === original.description && /[a-z]{3}/i.test(description ?? ''))) missingConfig.add(e.key)
    return { ...original, label, description }
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const d = await dictionary ?? EMPTY
    const p = e.props
    const word = p.word === undefined ? d.spinner[p.mode] : translate(d, p.word)
    return next({ ...e, props: { ...p, word, message: p.message == null ? p.message : translate(d, p.message) } })
  })
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const d = await dictionary ?? EMPTY
    return next({ ...e, props: { ...e.props, hint: translate(d, e.props.hint ?? '') } })
  })
  on('ui.render', { component: 'InfoNotice' }, async ($, e, next) => {
    const d = await dictionary ?? EMPTY
    return next({ ...e, props: { ...e.props, text: translate(d, e.props.text ?? '') } })
  })
  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => {
    const d = await dictionary ?? EMPTY
    return next({ ...e, props: { ...e.props, hint: translate(d, e.props.hint ?? '') } })
  })
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const d = await dictionary ?? EMPTY
    return next({ ...e, props: { ...e.props, modes: e.props.modes.map((mode: string) => translate(d, mode)) } })
  })
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (e.props.isExpanded) return next(e)
    const line = groupLine(e.props.calls, e.props.isActive)
    if (!line) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return <Box flexDirection="row"><Text dimColor>● {line} (ctrl+o — развернуть)</Text></Box>
  })
  on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>✻ Затрачено: {duration(e.props.durationMs)}</Text>
  })
}
