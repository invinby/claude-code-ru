import { describe, expect, test, tier } from 'claude-code/testing'
import { translate, duration, register, parseDictionary, groupLine } from '../hooks/register.tsx'

tier('user')
const dict = { exact: { 'Exit the CLI': 'Выйти из CLI', 'Theme': 'Тема', 'Thinking': 'Думаю' }, spinner: { thinking: 'Думаю' } }

describe('cc-ru', () => {
  test('exact translations and lossless unknown text', () => {
    expect(translate(dict, 'Exit the CLI')).toBe('Выйти из CLI')
    const unknown = '\x1b[31mC:\\Users\\Имя\\Error.ts: unknown\x1b[0m'
    expect(translate(dict, unknown)).toBe(unknown)
  })
  test('dynamic model identifiers remain unchanged', () => {
    expect(translate(dict, 'Set the AI model for Claude Code (currently kimi-k3[1m])'))
      .toBe('Выбрать модель Claude Code (сейчас: kimi-k3[1m])')
  })
  test('unknown sentences containing a known word remain unchanged', () => {
    expect(translate(dict, 'Theme is a class in my program')).toBe('Theme is a class in my program')
  })
  test('duration accepts invalid values without throwing', () => {
    expect(duration(90000)).toBe('1 мин 30 с')
    expect(duration(-1)).toBe('0 с')
    expect(duration(Number.NaN)).toBe('0 с')
  })
  test('real command.describe preserves identity and permission metadata', async ($, on) => {
    on('fs.read', () => ({ value: JSON.stringify(dict) }))
    on('command.describe', () => ({ description: 'Exit the CLI', argumentHint: '<path>', isHidden: false }))
    const result = await $.command.describe({ command: 'exit', description: 'Exit the CLI', argumentHint: '<path>', isHidden: false, immediate: false, provider: { plugin: 'engine', tier: 'core' } })
    expect(result.description).toBe('Выйти из CLI')
    expect(result.argumentHint).toBe('<path>')
    expect(result.isHidden).toBe(false)
  })
  test('register export loads in the native runtime', () => {
    expect(typeof register).toBe('function')
  })
  test('bad or non-string dictionary entries fail open', () => {
    for (const text of ['null', '[]', '{bad', '{"exact":null}', '{"exact":{"Exit the CLI":42}}']) {
      expect(translate(parseDictionary(text), 'Exit the CLI')).toBe('Exit the CLI')
    }
  })
  test('config descriptions keep hidden status and other fields', async ($, on) => {
    on('fs.read', () => ({ value: JSON.stringify(dict) }))
    on('config.describe', () => ({ label: 'Theme', description: undefined, isHidden: false }))
    const value = await $.config.describe({ key: 'theme', label: 'Theme', isHidden: false, provider: { plugin: 'engine', tier: 'core' } })
    expect(value.label).toBe('Тема')
    expect(value.description).toBeUndefined()
    expect(value.isHidden).toBe(false)
  })
  test('known tool counts translate, unknown tools retain engine rendering', () => {
    expect(groupLine([{ tool: 'Read' }, { tool: 'Read' }], false)).toBe('Файлов прочитано: 2')
    expect(groupLine([{ tool: 'MyCustomTool' }], true)).toBeUndefined()
  })
  test('dynamic identifiers keep their literal ANSI bytes', () => {
    expect(translate(dict, 'Set the AI model for Claude Code (currently \x1b[31mkimi-k3\x1b[0m)'))
      .toBe('Выбрать модель Claude Code (сейчас: \x1b[31mkimi-k3\x1b[0m)')
  })
  test('real Spinner rendering preserves custom text and translates known text', async ($, on) => {
    on('fs.read', () => ({ value: JSON.stringify(dict) }))
    on('command.describe', () => ({ description: 'Exit the CLI', isHidden: false }))
    let observed = ''
    on('ui.render', { component: 'Spinner' }, ($, e) => {
      observed = e.props.word
      const { Text } = $.ui.resolve(e)
      return <Text>{e.props.word}</Text>
    })
    await $.command.describe({ command: 'exit', description: 'Exit the CLI', isHidden: false, immediate: false, provider: { plugin: 'engine', tier: 'core' } })
    for (const [word, expected] of [['My custom verb', 'My custom verb'], ['思考中', '思考中'], ['Thinking', 'Думаю']]) {
      const ui = await $.ui.mount({ plugin: 'cc-ru', surface: 'terminal', component: 'Spinner', props: { word, message: null, suffix: '…', mode: 'thinking' } })
      expect(observed).toBe(expected)
      await ui.unmount()
    }
  })
})
