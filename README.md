# deepseek-harness-locale-ru
## Windows Version

Unofficial Russian (ru) language pack for the Windows Version DeepSeek Harness web GUI - https://github.com/ZHEEZL/deepseek-harness-locale-ru

Russian (`ru`) language pack for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web GUI.

> **Unofficial.** Not affiliated with or endorsed by DeepSeek. Nothing in the
> application is patched - this is an ordinary client plugin built on the locale
> extension point the shipped plugins already use.

DeepSeek Harness ships two locales, `zh` and `en`, and lets a client plugin add
more: register a language in the shared catalog and register one dictionary per
locale namespace. This pack does exactly that.

| | |
|---|---|
| Language | Русский (`ru`), fallback `en` |
| Coverage | 50 namespaces, 2526 strings |
| DSH version tested | 0.2.0-rc.2 |
| Application files changed | none |

Because `ru` falls back to `en`, any string this pack does not carry is shown in
English rather than as a raw key. A DSH update can never leave the interface
broken, only partially translated.

## Install

The pack is a Loader row, so it is mounted from a patch layer rather than by
editing the application.

### Automatic (Windows)

```powershell
git clone https://github.com/ZHEEZL/deepseek-harness-locale-ru
cd deepseek-harness-locale-ru
pwsh -File tools/install.ps1
```

The script copies the package to `%DSH_HOME%\plugins\dsh-client-locale-ru`,
mounts it from `%DSH_HOME%\cordis.patch.yml` and records the durable language
preference in the profile patch. It is idempotent, and it never overwrites an
existing home patch - it appends to it. Use `-NoPreference` to mount the pack
without switching the interface language, or `-HarnessHome` / `-Profile` for a
non-default layout.

### Manual

1. Copy this repository to `%DSH_HOME%\plugins\dsh-client-locale-ru`.
2. Add the mount row to `%DSH_HOME%\cordis.patch.yml` (create the file if it does not exist):

```yaml
- insert:
    - id: locale-ru
      name: ./plugins/dsh-client-locale-ru/lib/index.js
```

   Relative `name` values are anchored beside the patch file.
3. Reload - HMR picks the new row up without a restart.

## Switch the language

**Settings → General → Language → Русский.** The choice is stored durably, the
same way every other setting is.

To switch back, pick **English** in the same row. To remove the pack entirely,
delete `%DSH_HOME%\plugins\dsh-client-locale-ru`, the `insert` block above from
`%DSH_HOME%\cordis.patch.yml`, and the `- id: locale` block from
`%DSH_HOME%\profiles\<profile>\cordis.patch.yml`.

## How it works

```
Loader row  ->  dsh-client-modules  ->  window.__DSH_BOOT__  ->  /plugins  ->  browser
```

1. The row mounts a package whose `package.json` declares
   `dsh.client = { platform: "web" }`. Its node half (`lib/index.js`) is an empty
   `apply`; it exists only so the row can live in the Loader.
2. `dsh-client-modules` composes the browser boot graph and serves the bundle
   from `/plugins/@deepseek-ai/dsh-client-locale-ru/client.js`.
3. The bundle calls `ctx.locale.addLanguage({ id: "ru", label: "Русский",
   fallback: "en" })` and `ctx.locale.register(namespace, "ru", dictionary)` for
   every namespace. Both are owned effects, so unloading the pack removes them
   from the catalog and the language selector.

## Repository layout

| Path | Role |
|---|---|
| `translations/ru.json` | Source of truth: `namespace -> key -> Russian`. Edit this. |
| `lib/client.js` | Generated browser bundle, committed so the pack runs without a build step. |
| `lib/index.js` | Node half of the plugin. |
| `tools/build.mjs` | Renders `lib/client.js`, audits coverage, executes the bundle in a sandbox. |
| `tools/extract-dictionaries.mjs` | Rebuilds `dicts.json` from an installed `app.asar`. |
| `tools/install.ps1` | Installs the pack into a Harness home. |

## Contributing

Edit `translations/ru.json` and run:

```sh
node tools/build.mjs          # regenerate lib/client.js and validate it
node tools/build.mjs --check  # what CI runs: fail if lib/client.js is stale
```

To audit a translation against the exact English copy your installation ships:

```sh
node tools/extract-dictionaries.mjs "C:/path/to/resources/app.asar" dicts.json
node tools/build.mjs --dicts dicts.json
```

The audit fails on a missing namespace, a missing key, an unknown namespace, or a
mismatched `{placeholder}`. `dicts.json` is derived data and is not committed.

New strings follow [docs/translation-style.md](docs/translation-style.md): short
sentence-case wording, Latin keyboard keys and product names, and nothing
translated inside `{}`.

## Known limitations

* **Native desktop chrome.** The Electron shell (welcome window, update and crash
  dialogs, application menu, tray) has its own dictionary that only carries `zh`
  and `en`; this pack cannot affect it.
* **Plugin metadata.** Plugin titles and descriptions on the Plugins page come
  from each package manifest as `LocalizedText` with an `en` key; packages that
  declare no `ru` keep their English text.
* **Third-party commands.** The built-in slash commands are localized, but the
  descriptions of commands registered by other plugins arrive from the Host in
  English. Command tokens themselves stay Latin (`/goal`, `/plan`), because the
  client resolves a typed token through a `zh`/`en` alias table only.
* **New keys.** Strings added by a DSH update appear in English until they are
  added to `translations/ru.json`.

## License

MIT - see [LICENSE](LICENSE). The Russian strings are original translations of
user-interface copy from DeepSeek Harness, which is distributed under the MIT
license.

---

# dsh-locale-ru — русский язык для DeepSeek Harness

Русский языковой пакет (`ru`) для веб-интерфейса [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

> **Неофициальный.** Проект не связан с DeepSeek и не поддерживается компанией.
> Файлы приложения не изменяются — это обычный клиентский плагин, использующий
> ту же точку расширения локализации, что и встроенные плагины.

В DSH встроены только `zh` и `en`. Плагин добавляет в общий каталог локалей язык
`ru` и регистрирует по одному русскому словарю на каждое пространство имён
интерфейса.

| | |
|---|---|
| Язык | Русский (`ru`), резервный — `en` |
| Покрытие | 50 пространств имён, 2526 строк |
| Проверено на DSH | 0.2.0-rc.2 |
| Изменённых файлов приложения | нет |

Поиск строки идёт по цепочке `ru → en`, поэтому непереведённая строка
показывается по-английски, а не сырым ключом: обновление DSH не может сломать
интерфейс, он может лишь остаться частично непереведённым.

## Установка

Пакет монтируется через слой патчей, а не правкой приложения.

### Автоматически (Windows)

```powershell
git clone https://github.com/ZHEEZL/deepseek-harness-locale-ru
cd deepseek-harness-locale-ru
pwsh -File tools/install.ps1
```

Скрипт копирует пакет в `%DSH_HOME%\plugins\dsh-client-locale-ru`, монтирует его
из `%DSH_HOME%\cordis.patch.yml` и сохраняет выбор языка в патче профиля.
Скрипт идемпотентен и никогда не перезаписывает существующий домашний патч —
он дописывает в него. Флаг `-NoPreference` монтирует пакет без переключения
языка, `-HarnessHome` и `-Profile` задают другое расположение.

### Вручную

1. Скопируйте репозиторий в `%DSH_HOME%\plugins\dsh-client-locale-ru`.
2. Добавьте строку монтирования в `%DSH_HOME%\cordis.patch.yml` (создайте файл, если его нет):

```yaml
- insert:
    - id: locale-ru
      name: ./plugins/dsh-client-locale-ru/lib/index.js
```

   Относительный `name` отсчитывается от каталога самого патч-файла.
3. Обновите страницу — HMR подхватывает новую строку без перезапуска.

## Переключение языка

**Настройки → Общие → Язык → Русский.** Выбор сохраняется так же, как любая
другая настройка.

Чтобы вернуться к английскому, выберите **English** в той же строке. Чтобы
удалить пакет, удалите каталог `%DSH_HOME%\plugins\dsh-client-locale-ru`, блок
`insert` из `%DSH_HOME%\cordis.patch.yml` и блок `- id: locale` из
`%DSH_HOME%\profiles\<profile>\cordis.patch.yml`.

## Как это устроено

1. Строка Loader монтирует пакет, в `package.json` которого объявлено
   `dsh.client = { platform: "web" }`. Node-половина (`lib/index.js`) — пустой
   `apply`; она нужна только чтобы строка существовала в Loader.
2. `dsh-client-modules` собирает boot-граф браузера и отдаёт бандл по адресу
   `/plugins/@deepseek-ai/dsh-client-locale-ru/client.js`.
3. Бандл вызывает `ctx.locale.addLanguage({ id: "ru", label: "Русский",
   fallback: "en" })` и `ctx.locale.register(пространство, "ru", словарь)` для
   каждого пространства имён. Это owned-эффекты: выгрузка пакета убирает язык из
   каталога и из списка выбора.

## Структура репозитория

| Путь | Назначение |
|---|---|
| `translations/ru.json` | Источник истины: `пространство → ключ → русский текст`. Правится здесь. |
| `lib/client.js` | Сгенерированный браузерный бандл; лежит в репозитории, чтобы пакет работал без сборки. |
| `lib/index.js` | Node-половина плагина. |
| `tools/build.mjs` | Собирает `lib/client.js`, проверяет покрытие и исполняет бандл в песочнице. |
| `tools/extract-dictionaries.mjs` | Восстанавливает `dicts.json` из установленного `app.asar`. |
| `tools/install.ps1` | Устанавливает пакет в домашний каталог DSH. |

## Участие

Правьте `translations/ru.json` и запускайте:

```sh
node tools/build.mjs          # пересобрать lib/client.js и проверить его
node tools/build.mjs --check  # то же, что CI: падает, если lib/client.js устарел
```

Проверка покрытия по точной английской копии вашей установки:

```sh
node tools/extract-dictionaries.mjs "C:/путь/к/resources/app.asar" dicts.json
node tools/build.mjs --dicts dicts.json
```

Аудит падает на пропущенном пространстве имён, пропущенном ключе, неизвестном
пространстве имён или несовпадении `{placeholder}`. `dicts.json` — производные
данные, в репозиторий не попадают.

Правила перевода — терминология, типографика, что остаётся латиницей — описаны в
[docs/translation-style.md](docs/translation-style.md).

## Известные ограничения

* **Нативные окна Desktop.** У Electron-оболочки (окно приветствия, диалоги
  обновления и сбоя, меню приложения, трей) свой словарь только с `zh` и `en` —
  пакет на него не влияет.
* **Метаданные плагинов.** Названия и описания пакетов на странице «Плагины»
  берутся из их манифестов как `LocalizedText` с ключом `en`.
* **Сторонние команды.** Встроенные slash-команды локализованы, но описания
  команд других плагинов приходят с Host на английском. Сами токены команд
  остаются латиницей (`/goal`, `/plan`): клиент разрешает введённый токен только
  по таблице псевдонимов `zh`/`en`.
* **Новые ключи.** Строки, добавленные обновлением DSH, показываются
  по-английски, пока их не добавят в `translations/ru.json`.

## Лицензия

MIT — см. [LICENSE](LICENSE). Русские строки — оригинальный перевод текстов
интерфейса DeepSeek Harness, распространяемого по лицензии MIT.
