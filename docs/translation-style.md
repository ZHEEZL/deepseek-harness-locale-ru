# Russian translation style guide

How the strings in [`translations/ru.json`](../translations/ru.json) are written.
Read this before adding or changing a key; the glossary below is what keeps the
interface consistent.

## Where a string lives

The file is `{ "<namespace>": { "<key>": "<russian text>" } }`. Namespaces and
keys are the ones the application itself uses, so **never add, drop, rename or
merge** one, and never translate a namespace or a key. `tools/extract-dictionaries.mjs`
prints the exact English and Chinese source for every key, and
`node tools/build.mjs` fails on any key the translation is missing.

## Hard rules

1. Every value must be Russian. Nothing may stay English except the terms listed
   under *Keep as-is*.
2. **Placeholders are sacred.** Copy `{name}`, `{count}`, `{path}`, `{model}`,
   `{seconds}`, `{total}` … byte for byte, including their count and order of
   first appearance. Never translate text inside braces.
3. **HTML/Markdown fragments** (`<b>`, `</b>`, `<code>`, `\n`, `**bold**`, backticks)
   keep their markup; translate only the words around them.
4. Keep the length close to the source. These are buttons, tabs, chips, badges and
   one-line hints; a value that is twice as long as the English breaks the layout.
   Prefer the shortest natural Russian wording, but never an ungrammatical
   telegram-style abbreviation.
5. Use the ellipsis character `…` (U+2026) wherever the source uses it, and the
   source's own trailing punctuation otherwise. Do not add a full stop that the
   English does not have, and do not drop one that it does.
6. Russian typography: sentence case for buttons, menu items, labels and hints
   ("Сохранить", "Отмена", "Удалить сессию"). No space before `,` `.` `:` `;` `!` `?`.
   Use `«текст»` for quoted UI names when the English uses quotes.
7. Do not add comments, explanations, notes or anything outside the JSON.
8. Output must be valid UTF-8 JSON (no trailing commas, no BOM).

## Disambiguation

The English string is authoritative for structure and for placeholders. The
Chinese string is a hint when a short English word is ambiguous
(e.g. "Turn" the noun vs. the verb, "Pin", "Retry", "Dock"). When the two
disagree about meaning, follow the Chinese gloss for meaning and the English for
structure.

## Keep as-is (do not translate)

Brands, products and identifiers: `DeepSeek`, `DeepSeek Harness`, `DSH`,
`Cordis`, `PTC`, `MCP`, `Markdown`, `MDX`, `JSON`, `JSONL`, `YAML`, `TOML`,
`SQL`, `SQLite`, `npm`, `pnpm`, `Git`, `GitHub`, `GitLab`, `VS Code`, `Zed`,
`React`, `TypeScript`, `JavaScript`, `Python`, `Rust`, `Go`, `API`, `URL`, `URI`,
`ID`, `UUID`, `HTTP`, `SSE`, `RPC`, `CSS`, `HTML`, `PNG`, `PDF`, `DOCX`, `XLSX`,
`PPTX`, `CSV`, `OTel`, `OpenTelemetry`, `PowerShell`, `pwsh`, `bash`, `zsh`,
`fish`, `WSL`, `SSH`, `tmux`, `ANSI`, `UTF-8`, `Base64`, `HMR`, `LLM`, `Token`
(only as a unit/credential name), file extensions, file paths, environment
variable names, command names and flags.

Keyboard keys stay in their Latin form: `Ctrl`, `Alt`, `Shift`, `Cmd`, `Meta`,
`Enter`, `Esc`, `Tab`, `Space`, `Backspace`, `Delete`, `Home`, `End`,
`Page Up`, `Page Down`, `F1`–`F12`, arrow glyphs `↑ ↓ ← →`.

## Glossary (use consistently)

| English | Russian |
|---|---|
| Agent | Агент |
| Subagent | Субагент |
| Session | Сессия |
| Workspace | Рабочая область |
| Tool | Инструмент |
| tool call | вызов инструмента |
| Turn | Ход |
| Step | Шаг |
| Goal | Цель |
| Plan / plan mode | План / режим планирования |
| Skill | Навык |
| Plugin | Плагин |
| Bundle | Пакет |
| Settings | Настройки |
| Preference | Предпочтение |
| Permission | Разрешение |
| Approval | Подтверждение |
| Sandbox | Песочница |
| Job | Задание |
| Terminal | Терминал |
| Sidebar | Боковая панель |
| Panel | Панель |
| Dock | Док-панель |
| Composer / input box | поле ввода |
| Attachment | Вложение |
| Deliverable | Результат |
| Reference | Ссылка |
| Trajectory | Траектория |
| Context | Контекст |
| Compaction | Сжатие |
| Model | Модель |
| Provider | Провайдер |
| Account | Аккаунт |
| Credential | Учётные данные |
| API key | API-ключ |
| Prompt (system) | Системная инструкция |
| Prompt (user) | Запрос |
| Reasoning | Рассуждение |
| Output | Вывод |
| Diff | Дифф |
| Patch | Патч |
| Command | Команда |
| Shortcut | Сочетание клавиш |
| Schedule | Расписание |
| Task | Задача |
| Voice input | Голосовой ввод |
| Theme | Тема |
| Language | Язык |
| Feedback | Отзыв |
| Question | Вопрос |
| Retry | Повторить |
| Cancel | Отмена |
| Save | Сохранить |
| Close | Закрыть |
| Copy | Копировать |
| Loading | Загрузка |
| Search | Поиск |
| Filter | Фильтр |
| Sort | Сортировка |
| Enable / Disable | Включить / Отключить |
| Enabled / Disabled | Включено / Отключено |
| Reset | Сбросить |
| Default | По умолчанию |
| Override / Overridden | Переопределение / Переопределено |
| Expand / Collapse | Развернуть / Свернуть |
| Show / Hide | Показать / Скрыть |
| File | Файл |
| Folder / Directory | Папка / Каталог |
| Project | Проект |
| Branch | Ветка |
| Commit | Коммит |
| Change | Изменение |
| Message | Сообщение |
| Conversation | Диалог |
| Chat | Чат |
| Response | Ответ |
| Request | Запрос |
| Error | Ошибка |
| Warning | Предупреждение |
| Hint | Подсказка |
| Usage | Использование |
| Token usage | Расход токенов |
| Version | Версия |
| Update | Обновление |
| Install | Установить |
| Remove | Удалить |
| Add | Добавить |
| Edit | Изменить |
| Create | Создать |
| Open | Открыть |
| Rename | Переименовать |
| Duplicate | Дублировать |
| Export | Экспорт |
| Import | Импорт |
| Download | Скачать |
| Upload | Загрузить |
| Refresh | Обновить |
| Apply | Применить |
| Discard | Отменить изменения |
| Continue | Продолжить |
| Pause | Приостановить |
| Stop | Остановить |
| Resume | Возобновить |
| Start | Запустить |
| Run | Запустить |
| Pending | В ожидании |
| Running | Выполняется |
| Completed | Завершено |
| Failed | Ошибка |
| Cancelled | Отменено |
| Queued | В очереди |
| Today | Сегодня |
| Yesterday | Вчера |
| Now | Сейчас |
| Never | Никогда |
| Always | Всегда |
| Optional | Необязательно |
| Required | Обязательно |
| None | Нет |
| All | Все |
| Other | Другое |
| More | Ещё |
| Less | Меньше |
| About | О программе |
