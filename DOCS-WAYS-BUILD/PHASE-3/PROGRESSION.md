# Phase 3 Progression

## Как читать этот документ

`PROGRESSION.md` — живой журнал третьей фазы. Он фиксирует:

1. **Текущий статус каждого шага** (🔄 В работе / ✅ Готово / ⏳ Не начато)
2. **Что реально сделано** — конкретные файлы, методы, решения, отклонения от плана
3. **Карту сервисов и actions** — что где живёт и кто это вызывает
4. **Карту связей между документами**

В начале каждой сессии читаем этот файл. В конце шага обновляем.

---

## Карта документов

```
DOCS_ARCHITECTURE.md          ← Полная архитектура, source of truth дизайна
        │
        │  раздел 4  → Парсинг HTML / Стилей
        │  раздел 3  → Система компонентов и ID
        │  раздел 10 → HTML-файлы компонентов (формат, мета-комментарий)
        │  раздел 6  → Store actions, transient cache (§6.4)
        │  раздел 16 → Phase 3 описан как "Парсер и стили"
        ↓
PHASE_3_PARSER_STYLES.md      ← Детальный план Phase 3 (шаги 1–10)
        │
        │  определяет: файлы, критерии готовности, порядок шагов
        │  ссылается на: DOCS_ARCHITECTURE.md §4, §3, §10, §6.4
        ↓
PROGRESSION.md                ← Этот файл: что сделано, где живёт, как связано
```

**Отношение между документами:**

| Вопрос | Документ |
|--------|---------|
| Почему делаем именно так? | `DOCS_ARCHITECTURE.md` |
| Что делать на этом шаге? | `PHASE_3_PARSER_STYLES.md` |
| Что уже сделано? Как реализовано? | `PROGRESSION.md` (этот файл) |

---

## Карта сервисов и actions Phase 3

### Сервисы (где определены → кто использует)

| Сервис | Файл | Использует |
|--------|------|-----------|
| `ComponentParser.parse()` | `src/services/component-parser.ts` | `ComponentRegistry.fetchComponent()`, `importScreenFromHtml()`, `HtmlFileDropZone` |
| `ComponentParser.buildElementTree()` | `src/services/component-parser.ts` | `html-parser.ts` (через `adaptNode`) |
| `ElementFactory.fromComponentDefinition()` | `src/services/element-factory.ts` | `useDragAndDrop`, `importScreenFromHtml()`, `HtmlFileDropZone` |
| `parseCss()` | `src/services/css-parser.ts` | `ElementFactory.mergeStyles()` |
| `componentRegistry.getOrFetch()` | `src/services/component-registry.ts` | `useDragAndDrop` (при drop блока из библиотеки) |
| `componentRegistry.fetchComponent()` | `src/services/component-registry.ts` | `getOrFetch()` внутри |
| `generateScreenHtml()` | `src/services/html-generator.ts` | `html-cache.ts` → `getScreenHtml()` |
| `generateHtml()` | `src/services/html-generator.ts` | `export-service.ts` (старый путь через ParsedScreen) |
| `getScreenHtml()` | `src/services/html-cache.ts` | preview-компонент (Phase 4), export |
| `invalidateScreenCache()` | `src/services/html-cache.ts` | `funnel-store.ts` subscriber |
| `invalidateAllCache()` | `src/services/html-cache.ts` | `funnel-store.ts` subscriber (при globalStyles изменении) |

### Store Actions Phase 3 (где определены → кто вызывает)

| Action | Файл | Вызывается из |
|--------|------|---------------|
| `addScreenWithElements` | `store/slices/funnel-slice.ts` | `useDragAndDrop` (drop из BlockLibrary), `HtmlFileDropZone` (drop .html файла) |
| `importScreenFromHtml` | `store/slices/funnel-slice.ts` | внешние вызовы (API, CLI), прямой программный вызов |
| `updateGlobalStyle` | `store/slices/funnel-slice.ts` | `GlobalStylesPanel` (Шаг 6, ещё не реализован) |
| `addElement` | `store/slices/funnel-slice.ts` | контекстное меню ScreenNode, кнопка «+» (Шаг 9) |
| `deleteElement` | `store/slices/funnel-slice.ts` | контекстное меню, `Delete` key (Шаг 9) |
| `duplicateElement` | `store/slices/funnel-slice.ts` | контекстное меню, `Ctrl+D` (Шаг 9) |
| `reorderElements` | `store/slices/funnel-slice.ts` | `useDragAndDrop` (drag строки внутри экрана) |

### UI Events Phase 3 (где происходят → что вызывают)

| Событие | Компонент | Результат |
|---------|-----------|-----------|
| Drop блока из BlockLibrary | `CanvasDropZone` → `useDragAndDrop` | `componentRegistry.getOrFetch()` → `addScreenWithElements` |
| Drop `.html` файла из OS | `HtmlFileDropZone` | `File.text()` → `ComponentParser.parse()` → `addScreenWithElements` |
| Изменение globalStyles | `GlobalStylesPanel` (Шаг 6) | `updateGlobalStyle` → store subscriber → `invalidateAllCache()` |
| Изменение элемента/экрана | любая Panel секция | `updateElement` / `updateScreen` → store subscriber → `invalidateScreenCache(screenId)` |

### Data Flow Phase 3

```
block-library/*.html
        │
        ├── [DnD drop блока из BlockLibrary]
        │       ▼ useDragAndDrop.handleDragEnd (async)
        │       ▼ componentRegistry.getOrFetch(componentId)   ← HTTP 1 раз, потом кэш
        │       ▼ ComponentParser.parse(htmlString)
        │       ▼ ElementFactory.fromComponentDefinition(def, screenId)
        │       ▼ store.addScreenWithElements(screen, elements[]) ← 1 undoable патч
        │
        ├── [Drop .html файла из OS — Шаг 4.5]
        │       ▼ HtmlFileDropZone — dragenter/dragleave/drop на document
        │       ▼ File.text()
        │       ▼ ComponentParser.parse(htmlString)
        │       ▼ ElementFactory.fromComponentDefinition(def, screenId)
        │       ▼ store.addScreenWithElements(screen, elements[]) ← 1 undoable патч
        │
        └── [store.importScreenFromHtml(html, fileName)]
                ▼ ComponentParser.parse(html) — синхронно (HTML уже в памяти)
                ▼ ElementFactory.fromComponentDefinition(def, screenId)
                ▼ undoableUpdate('SCREEN_IMPORT_HTML')

store.elements  ← source of truth (FunnelElement[])
        │
        ├──▶ ElementProperties панель (читает / пишет styles, content)
        │
        └──▶ generateScreenHtml(screenId, elements, indexes, screen, globalStyles)
                │
                ▼ getScreenHtml() — html-cache.ts (lazy Map, не персистируется)
                        │
                        ▼ preview iframe / export
```

### Cache Invalidation Flow

```
любая мутация в store
        │
        ▼ useFunnelStore.subscribe((state, prev) => { ... })  в funnel-store.ts
        │
        ├── funnel.globalStyles изменился  →  invalidateAllCache()
        │
        └── funnel.elements / funnel.screens изменились
                ▼ сравниваем ссылки (Immer → новые объекты при каждом патче)
                ▼ находим затронутые screenId
                ▼ invalidateScreenCache(screenId) для каждого
```

### Какой компонент рендерит что после Phase 3

```
Drop блока из BlockLibrary
    └─► ScreenNode отображает элементы через SortableElementRow
              (пока: abbr + content preview; Phase 3-надстройка: мокапп телефона)

Drop .html файла из OS
    └─► аналогично: новый ScreenNode с элементами из парсера

store.elements → generateScreenHtml() → getScreenHtml()
    └─► используется в preview / export (Phase 4+)
```

---

## Текущее состояние

### ✅ Шаг 1 — HTML-файлы компонентов (block-library)

**Что реально сделано:**

- `block-library/component-manifest.json` — создан, **40 записей** по 12 категориям: `content`, `interactive`, `form`, `feedback`, `layout`, `result`, `social-proof`, `payment`, `navigation`, `media`, `legal`, `custom`
- `src/types/component.ts` — определены все типы:
  - `ComponentMeta` — `{ component, category, tags, description, thumbnail, version }`
  - `ComponentDefinition` — `{ meta, html, styles, scripts, elementTree }`
  - `ElementNode` — `{ tag, id, classes, attributes, styles, content, children }`
  - `ManifestEntry` — `{ id, category, tags, name, description, file: string | null, thumbnail }`
  - `ComponentManifest` — `{ version, components: ManifestEntry[] }`

- **40 HTML-файлов** по подкаталогам:
  - `block-library/content/` — `heading.html`, `paragraph.html`, `image.html`, `spacer.html`, `divider.html`, `icon-text.html`
  - `block-library/interactive/` — `button-primary.html`, `option-list.html`, `option-tiles-2x2.html`, `option-list-multi-select.html`, `option-slider.html`, `option-rating-stars.html`, `option-nps.html`, `countdown-timer.html`
  - `block-library/form/` — `input-email.html`, `input-phone.html`, `input-text.html`, `consent-checkbox.html`
  - `block-library/feedback/` — `loader-spinner.html`, `loader-analyzing.html`
  - (+ layout, payment, result, social-proof, navigation, media, legal, templates, custom, imported)

- **Формат каждого файла** (по §10.1 архитектуры):
  ```html
  <!--
    @component: option-list
    @category: interactive
    @tags: survey, options, selection
    @description: Vertical list of selectable options
    @thumbnail: /thumbnails/option-list.png
    @version: 1.0
  -->
  <div class="funnel-options" data-component="option-list" data-element-type="option-list">
    <button class="funnel-option" data-element-type="option" data-editable="true">Option 1</button>
  </div>
  <style>
    .funnel-options { display: flex; flex-direction: column; gap: 12px; }
    .funnel-option { color: var(--text); border-radius: var(--radius); }
  </style>
  ```
  - `@component` / `@category` / `@tags` / `@description` / `@thumbnail` / `@version` — мета-данные для парсера
  - `data-element-type` на каждом узле — маппится в `ElementType` через `DATA_TYPE_MAP`
  - `data-editable="true"` — элемент редактируемый
  - CSS-переменные `var(--bg)`, `var(--accent)`, `var(--text)` и т.д. — не хардкод
  - `raw-html` в манифесте имеет `"file": null` — не требует HTML-файла

**Отклонения от плана:**

- 40 компонентов вместо 17 из плана — расширено за счёт дополнительных категорий (`feedback`, `form`, `result`, `social-proof`, и т.д.)
- `raw-html` намеренно не имеет HTML-файла (`"file": null`) — создаёт placeholder-элемент без fetch при drop

**Проверено:**

- `pnpm type-check` — 0 ошибок

---

### ✅ Шаг 2 — ComponentParser (HTML → ComponentDefinition)

**Что реально сделано:**

- `src/services/component-parser.ts` — static class, **150 строк**

  **Публичное API:**

  - `ComponentParser.parse(htmlString: string): ComponentDefinition`
    - Точка входа. Вызывает все методы по цепочке: `parseMetaComment` → `DOMParser` → `parseStyles` → `parseScripts` → `buildElementTree`
    - Бросает `Error` если в `doc.body` нет ни одного дочернего элемента

  - `ComponentParser.parseMetaComment(html: string): ComponentMeta`
    - Regex `<!--([\s\S]*?)-->` находит первый HTML-комментарий
    - Внутри блока: `@key:\s*(.+?)(?=\n|$)` извлекает каждый тег
    - `@tags` разбивается по запятой → `string[]`
    - Если поле отсутствует → пустая строка (не `undefined`)

  - `ComponentParser.buildElementTree(node: Element): ElementNode`
    - Рекурсивный обход DOM: `node.children` (только Element-ноды, не TEXT/COMMENT)
    - Пропускает `<style>` и `<script>` теги при рекурсии в children
    - `content` — только прямые TEXT_NODE через `_directText()` (trim + join через пробел)
    - `attributes` — все атрибуты кроме `style`, `id`, `class` (через `_allAttributes()`)
    - `styles` — inline стиль через `getInlineStyles()`

  - `ComponentParser.parseStyles(doc: Document): string`
    - `doc.querySelectorAll('style')` → все `<style>` блоки → `join('\n\n')`

  - `ComponentParser.parseScripts(doc: Document): string`
    - Аналогично для `<script>` (пустая строка если нет)

  - `ComponentParser.getDataAttributes(node: Element): Record<string, string>`
    - Только атрибуты с префиксом `data-`

  - `ComponentParser.getInlineStyles(node: Element): Record<string, string>`
    - `getAttribute('style')` → split по `;` → split по `:` → `{ property: value }`
    - Нижний регистр ключей

  **Приватные helpers:**

  - `_allAttributes(node)` — пропускает `style`, `id`, `class`
  - `_directText(el)` — только `Node.TEXT_NODE` дети, trim, join

- `src/services/component-parser.test.ts` — тесты:
  - `parse()` → корректный `ComponentDefinition`
  - `parseMetaComment()` → все 6 полей
  - `buildElementTree()` → глубина дерева, `data-*` атрибуты, inline styles
  - `parseStyles()` → объединяет несколько `<style>` блоков

**Отклонения от плана:**

- `buildElementTree` использует `node.children` (только Element-ноды), а не `childNodes` — `TEXT_NODE` собираются отдельно через `_directText()`, не как отдельные узлы дерева. Это упрощает работу `ElementFactory` — нет «ghost» text-узлов
- `getDataAttributes` — отдельный метод, но в `buildElementTree` вызывается `_allAttributes` (все атрибуты без style/id/class, включая data-*) вместо только `data-*`. Это позволяет сохранить `aria-*`, `role` и пр. атрибуты

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — все зелёные

---

### ✅ Шаг 3 — ElementFactory (ComponentDefinition → FunnelElement[])

**Что реально сделано:**

- `src/services/element-factory.ts` — **336 строк**

  **Публичное API:**

  - `ElementFactory.fromComponentDefinition(def: ComponentDefinition, screenId: string): FunnelElement[]`
    - Парсит CSS компонента: `parseCss(def.styles)` → `CssRuleMap`
    - Запускает `_walk()` от корневого `def.elementTree`
    - Возвращает flat массив всех узлов (root + все потомки)

  - `ElementFactory.nodeToElement(node, screenId, parentId, order, cssRules): FunnelElement`
    - `type` — из `inferElementType(node)`
    - `id` — `${type}-${nanoid(8)}`
    - `styles` — из `mergeStyles(node.styles, cssRules, node)`
    - `editable` — `node.attributes['data-editable'] === 'true'`
    - Дефолты: `i18n: {}`, `visibility: 'always'`, `animation: 'none'`, `locked: false`

  - `ElementFactory.inferElementType(node: ElementNode): ElementType` — **4-уровневый каскад:**
    1. `data-element-type` → `DATA_TYPE_MAP[value]` (прямое соответствие)
    2. `node.tag` → `TAG_MAP[tag]` (по HTML-тегу)
    3. `node.classes` → `CLASS_MAP[class]` (первый найденный класс)
    4. fallback: `'container'` если есть children, иначе `'custom'`

  - `ElementFactory.mergeStyles(inlineStyles, cssRules, node): ElementStyles`
    - Итерирует все CSS-правила `cssRules`, вызывает `_selectorMatches()` для каждого
    - Matched CSS rules мержатся сначала (низкий приоритет)
    - Inline styles мержатся поверх (высокий приоритет)
    - Результат: `{ 'font-size': '24px', 'color': '#1a1a2e', ... }`

  **Приватные helpers:**

  - `_walk(node, screenId, parentId, order, cssRules, acc): string`
    - Рекурсивный DFS, заполняет flat массив `acc`
    - Возвращает `el.id` чтобы children знали свой `parentId`
    - Children итерируются с `order = index`

  - `_selectorMatches(selector, node): boolean`
    - Легковесный матчер для простых селекторов (`div`, `.class`, `button.class`, `#id`)
    - Сложные (`> + ~ [] : ()` пробел-комбинаторы) → `return false` (пропускаются)
    - Регекс: `^([a-z][a-z0-9-]*)?((?:\.[a-z][a-z0-9_-]*)*)?(#[a-z][a-z0-9_-]*)?$`

  **Lookup-таблицы** (на уровне модуля, не в классе):

  - `DATA_TYPE_MAP` — **76 записей**: маппинг `data-element-type` значений → `ElementType`
    - Примеры: `'heading-block'→'container'`, `'option-list'→'survey-options'`, `'spinner'→'loader'`
  - `TAG_MAP` — **28 тегов**: `h1–h6→'heading'`, `p/span→'paragraph'`, `img→'image'`, `button→'button'`, `input/textarea/select→'input'`, `hr→'divider'`, `footer→'footer'`, `video→'video'`, `form/section/article/main/nav/ul/ol/li/label/header/aside→'container'`, `iframe/svg→'custom'`
  - `CLASS_MAP` — **16 классов**: `'funnel-option'→'option'`, `'funnel-tile'→'option-tile'`, `'funnel-options'→'survey-options'`, `'funnel-card'→'card'`, `'funnel-heading'→'heading'`, и т.д.

- `src/services/element-factory.test.ts` — тесты:
  - `fromComponentDefinition()` → корректный `FunnelElement[]`
  - Типы элементов: heading, paragraph, button, option, survey-options, container
  - CSS-стили из `<style>` применяются к элементам
  - Inline-стили переопределяют CSS
  - ID формат `{type}-{8chars}`
  - `parentId` / `screenId` / `order` заполнены корректно
  - `option-list` → 4+ элемента (container + 3 options)

**Отклонения от плана:**

- `_selectorMatches` работает только с простыми CSS-селекторами (без combinators, pseudo-классов, attribute selectors) — сложные просто пропускаются (`return false`). Это осознанное упрощение: в block-library компонентах используются только `.class`, `tag.class` — сложные selectors там не нужны
- `mergeStyles` не использует браузерный `element.matches()` (нельзя в контексте парсера без реального DOM) — вместо этого `_selectorMatches` на ElementNode. Точность достаточна для наших компонентов

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — все зелёные

---

### ✅ Шаг 4 — Lazy-загрузка HTML и ComponentRegistry

**Что реально сделано:**

- `src/services/component-registry.ts` — добавлены два метода (импортирован `ComponentParser`):

  - `async fetchComponent(entry: ManifestEntry): Promise<ComponentDefinition | null>`
    - `fetch('/block-library/' + entry.file)` → проверка `res.ok`
    - `res.text()` → `ComponentParser.parse(html)` → `this.register(definition)`
    - При ошибке: `console.warn(...)` + `return null`
    - При `entry.file === null`: немедленно `return null`

  - `async getOrFetch(componentId: string): Promise<ComponentDefinition | null>`
    - Сначала `this.get(componentId)` — если есть в `byId` Map → возвращает кэш (нет HTTP)
    - Если нет: `this.manifestEntries.find(e => e.id === componentId)` → находит ManifestEntry
    - Если entry не найден: `console.warn(...)` + `return null`
    - Если `entry.file === null`: `return null` (raw-html — нет файла)
    - Иначе: `this.fetchComponent(entry)` — fetch + parse + cache

- `src/hooks/useDragAndDrop.ts` — полностью переписан:

  - `handleDragEnd` стал **`async`** (dnd-kit не ожидает return value)
  - Guard `isElementDrag(data)` — если element drag → `arrayMove` + `reorderElements` (без изменений)
  - Для block drag: разделён на **три ветки**:
    1. **`raw-html`** (id === 'raw-html') — создаёт один `raw-html` элемент без fetch:
       ```typescript
       const rawEl: FunnelElement = {
         id: `raw-html-${nanoid(8)}`, type: 'raw-html', tag: 'div',
         content: '<!-- paste your HTML here -->',
         styles: { 'min-height': '48px', 'padding': '12px' }, ...
       }
       addScreenWithElements(newScreen, [rawEl])
       ```
    2. **Успешный `getOrFetch`** → `ElementFactory.fromComponentDefinition(def, newId)` → `addScreenWithElements(screen, elements)`
    3. **Fallback при ошибке** fetch → `addScreen(emptyScreen)` (без элементов)
  - Все 3 ветки вызывают `selectScreen(newId, false)` после

- `src/store/slices/funnel-slice.ts` — изменения:

  - **Новые imports**: `ComponentParser` из `@services/component-parser`, `ElementFactory` из `@services/element-factory`, `createDefaultScreen` из `@store/defaults`
  - **`addScreenWithElements(screen, elements)`** — новое действие:
    ```typescript
    undoableUpdate('SCREEN_ADD_WITH_ELEMENTS', (draft) => {
      draft.funnel.screens[screen.id] = screen;
      for (const el of elements) draft.funnel.elements[el.id] = el;
    })
    ```
    Одна undoable операция: `Ctrl+Z` откатывает и экран, и все его элементы одновременно
  - **`importScreenFromHtml(html, fileName)`** — был stub (`return ''`), теперь реализован:
    - `ComponentParser.parse(html)` — синхронно (HTML уже в памяти, не нужен fetch)
    - Позиция нового экрана: `maxX + 350` (вправо от самого правого экрана)
    - Имя экрана: `fileName.replace('.html', '')` || `def.meta.component` || `'imported'`
    - `ElementFactory.fromComponentDefinition(def, newId)` → elements
    - `undoableUpdate('SCREEN_IMPORT_HTML')` — добавляет screen + elements атомарно
    - Возвращает `newId` (позволяет caller сделать `selectScreen(newId)`)

- `src/types/store.ts` — в интерфейс `FunnelActions` добавлено:
  ```typescript
  addScreenWithElements: (screen: Screen, elements: FunnelElement[]) => void;
  ```

**Отклонения от плана:**

- `handleDragEnd` стал `async` вместо синхронного с `.then()` — читается проще, dnd-kit не смотрит на return value коллбека
- `raw-html` обрабатывается отдельной веткой по `componentId === 'raw-html'`, не через `entry.file === null` — более явная ветка, меньше путаницы с `getOrFetch`
- `importScreenFromHtml` синхронный (HTML уже есть), `addScreenWithElements` async-совместим — обе операции undoable через один `undoableUpdate`

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — **88 зелёных**

---

### ✅ Шаг 4.5 — HTML File Drop Zone (надстройка, добавлена по запросу)

**Статус:** Готово. Не было в исходном `PHASE_3_PARSER_STYLES.md` — добавлено как логичное продолжение Шага 4.

**Что реально сделано:**

- `src/components/map-mode/HtmlFileDropZone.tsx` — **новый компонент, ~110 строк**

  **Механика обнаружения файлового drag:**
  - `useEffect` вешает глобальные listeners на `document`:
    - `dragenter` → если `e.dataTransfer.types.includes('Files')`: `dragCountRef.current++`, `setIsDragging(true)`
    - `dragleave` → `dragCountRef.current--`; если счётчик ≤ 0 → `setIsDragging(false)`, `setIsOver(false)`
    - `drop` → сброс счётчика, `setIsDragging(false)` (перехватывает drop вне zone)
  - `dragCountRef` — счётчик вместо boolean для решения «ложных» `dragleave`: браузер файрит `dragleave` при движении между дочерними элементами, счётчик это нивелирует

  **Overlay (рендерится только при `isDragging === true`):**
  - `position: absolute; inset: 0; z-index: 20` — покрывает весь canvas
  - `onDragOver` → `e.preventDefault()`, `e.dataTransfer.dropEffect = 'copy'`, `setIsOver(true)`
  - `onDragLeave` → `setIsOver(false)` (только зона, не document)
  - При `isOver`: зелёная подсветка + текст «Release to import»
  - При `!isOver`: нейтральный фон + текст «Drop .html to import as screen»

  **Drop handler (`async`):**
  - `Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.html') || f.type === 'text/html')`
  - Если нет `.html` файлов — выходим (пользователь дропнул другой тип)
  - Для каждого файла: `file.text()` → `ComponentParser.parse(html)` → `ElementFactory.fromComponentDefinition(def, newId)` → `addScreenWithElements(newScreen, elements)` → `selectScreen(newId, false)`
  - При ошибке парсинга: `console.warn(...)`, остальные файлы продолжают обрабатываться
  - Имя экрана: `file.name.replace('.html', '')` || `def.meta.component` || `'imported'`
  - Позиция: `maxX + 350` читается из `useFunnelStore.getState()` перед каждым файлом (state обновляется синхронно между `await`-ами)

  **Store calls:**
  - `addScreenWithElements` — из `useFunnelStore` hook (не `getState()`) для реактивности
  - `selectScreen` — аналогично

- `src/components/map-mode/HtmlFileDropZone.module.css` — новый:
  - `.zone` — `position: absolute; inset: 0; z-index: 20; pointer-events: all`
  - `.zone.over` — `background: rgba(34,197,94,0.07); border-color: rgba(34,197,94,0.45)`
  - `.badge` — pill с зелёным текстом на тёмном фоне
  - `.icon` — стрелка `↓`

- `src/components/map-mode/MapCanvas.tsx` — добавлена строка:
  ```tsx
  import { HtmlFileDropZone } from './HtmlFileDropZone';
  // ...
  <CanvasDropZone isActive={isDraggingBlock} />
  <HtmlFileDropZone />   {/* ← новая строка */}
  ```
  `HtmlFileDropZone` всегда в DOM но рендерит `null` если `!isDragging` — нет DOM-нагрузки в обычном режиме

**Отклонения от плана:**

- Компонент сам управляет видимостью через `isDragging` state (а не пропс от MapCanvas) — изолирует логику, `MapCanvas` не знает о файловом drop
- Использует React-обработчики (`onDragOver` / `onDragLeave` / `onDrop`) на overlay-div, и нативные listeners на `document` — гибридный подход избегает проблем с ReactFlow intercepting events

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — **88 зелёных**

---

### ✅ Шаг 5 — HTML Generator (Elements Tree → HTML)

**Что реально сделано:**

- `src/services/html-generator.ts` — **расширен**, старый `generateHtml` сохранён без изменений

  **Новые функции:**

  - `renderFunnelElement(element, elements, elementIndexes): string`
    - Открывающий тег: `id`, `class`, `data-element="{el.id}"`, `data-element-type="{el.type}"`, доп. атрибуты (кроме дублей), inline `style`
    - Void-элементы (`img`, `input`, `br`, `hr`, и т.д.) → самозакрывающийся тег `<tag ... />`
    - Контент: `escText(element.content)` (экранирование `&`, `<`, `>`)
    - Рекурсия в children: `elementIndexes.byParent[element.id] ?? []` → `renderFunnelElement` для каждого

  - `generateScreenHtml(screenId, elements, elementIndexes, screen, globalStyles): string`

    **CSS-блок** (`<style>` только если есть что вставить):
    1. `:root { --var: value; ... }` из `globalStyles` (все `CSSVariableName` поля)
    2. `[data-screen="X"] { --var: override; }` из `screen.customStyles.overrides`
    3. Verbatim `screen.customStyles.customCss`

    **HTML-блок:**
    ```html
    <main data-screen="X" class="funnel-screen [customClass]" data-screen-type="survey">
      {root elements}
    </main>
    ```
    Root элементы: `elementIndexes.byParent['__root__{screenId}']` (ключ из `buildElementIndexes`)

  **Утилиты (переиспользуются в обоих путях):**

  - `escAttr(s)` — `&amp;` `&quot;` `&lt;`
  - `escText(s)` — `&amp;` `&lt;` `&gt;` (кавычки не экранируются — не нужно в text node)
  - `styleObjectToString(styles)` — `{ 'font-size': '24px' }` → `'font-size: 24px'` (фильтрует `undefined`)
  - `globalStylesToCssVars(globalStyles)` → `:root { ... }` блок
  - `VOID` Set — 10 void HTML тегов

- `src/services/html-cache.ts` — **новый файл** (transient Map-кэш, по §6.4 архитектуры):

  - `cache = new Map<string, string>()` — не персистируется, сбрасывается при перезагрузке
  - `getScreenHtml(screenId, elements, indexes, screen, globalStyles): string`
    - Проверяет `cache.get(screenId)` → если есть: возвращает без регенерации
    - Нет: `generateScreenHtml(...)` → `cache.set(screenId, html)` → возвращает
  - `invalidateScreenCache(screenId): void` — `cache.delete(screenId)`
  - `invalidateAllCache(): void` — `cache.clear()`
  - `getCacheSize(): number` — для тестов и debug

- `src/store/funnel-store.ts` — добавлен **Zustand subscriber**:

  ```typescript
  import { invalidateScreenCache, invalidateAllCache } from '@services/html-cache';

  useFunnelStore.subscribe((state, prev) => {
    const next = state.project.funnel;
    const old = prev.project.funnel;
    if (next === old) return;

    if (next.globalStyles !== old.globalStyles) {
      invalidateAllCache();      // все экраны используют :root vars
      return;
    }

    const dirty = new Set<string>();
    for (const [id, screen] of Object.entries(next.screens)) {
      if (screen !== old.screens[id]) dirty.add(id);
    }
    for (const [id, el] of Object.entries(next.elements)) {
      if (el !== old.elements[id]) dirty.add(el.screenId);
    }
    for (const [id, el] of Object.entries(old.elements)) {
      if (!next.elements[id]) dirty.add(el.screenId);  // удалённые элементы
    }
    for (const screenId of dirty) invalidateScreenCache(screenId);
  });
  ```

- `src/services/index.ts` — обновлены экспорты:
  ```typescript
  export { generateHtml, generateScreenHtml, renderFunnelElement } from './html-generator';
  export { getScreenHtml, invalidateScreenCache, invalidateAllCache, getCacheSize } from './html-cache';
  ```

- `src/services/html-generator.test.ts` — **новый тестовый файл, 19 тестов**:

  | Группа | Тесты |
  |--------|-------|
  | `generateScreenHtml` | `data-screen` атрибут, `funnel-screen` класс, `data-screen-type`, `:root` vars, per-screen overrides, `customCss` verbatim, `data-element` + `data-element-type`, inline styles, CSS классы, void элементы, nested children, отсутствие `<style>` при пустых стилях |
  | Round-trip | `generateScreenHtml` → `parseHtml` → h1 найден с правильным content |
  | `renderFunnelElement` | standalone элемент, экранирование `&` и `<` в text content |
  | `html-cache` | кэш после первого вызова, `invalidateScreenCache` удаляет один, `invalidateAllCache` очищает все, регенерация после инвалидации |

**Отклонения от плана:**

- Два пути в `html-generator.ts` сосуществуют: `generateHtml(ParsedScreen)` для старого export pipeline и `generateScreenHtml(FunnelElement[])` для нового. Рефакторинг `export-service.ts` — отложен на Phase 4
- Cache invalidation вынесен в `funnel-store.ts` subscriber, а не в `funnel-slice.ts` — slice не должен знать о кэше (separation of concerns). Subscriber работает вне React-компонентов, всегда активен
- Subscriber сравнивает **ссылки на объекты** (`el !== old.elements[id]`) — это работает потому что Immer создаёт новые объекты при каждом патче, не мутирует старые. Deep compare не нужен и был бы дорогим

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — **107 зелёных** (88 старых + 19 новых)

---

### ✅ Шаг 6 — Global Styles Panel (CSS-переменные)

**Что реально сделано:**

- `src/components/panels/sections/GlobalStylesPanel.tsx` — **новый компонент, 4 секции**

  **Секция Colors:**
  - 7 × `ColorPicker`: `--bg`, `--card-bg`, `--text`, `--text-muted`, `--accent`, `--accent-hover`, `--border-tile`

  **Секция Typography:**
  - `select` для `--font-family` (Inter, Roboto, Georgia, System UI, Monospace)
  - 4 × `NumberInput` (px): `--h1-size`, `--h2-size`, `--body-size`, `--option-font`

  **Секция Spacing & Layout:**
  - 5 × `NumberInput` (px): `--radius`, `--radius-sm`, `--pad-x`, `--pad-y`, `--container-max`

  **Секция Effects:**
  - `--shadow`: preset select (None, SM, MD, LG) + custom `input` (при нестандартном значении — «Custom» опция)
  - `--transition`: preset select (None, Fast, Normal, Slow) + custom `input`

  Каждое изменение → `useFunnelStore.getState().updateGlobalStyle(variable, value)` → undoable → subscriber `invalidateAllCache()`

- `src/components/panels/sections/GlobalStylesPanel.module.css` — стили компонента

- `src/components/panels/FunnelSettings.tsx` — заменён `Palette` плейсхолдер на `<GlobalStylesPanel />`; убран неиспользуемый импорт `Palette`

**Отклонения от плана:**

- Effects-секция совмещает preset select и custom input в одном поле (вместо «preset + отдельный input»): при выборе preset — custom input всё равно редактируемый, позволяя fine-tune. При нестандартном значении в store — в select автоматически появляется «Custom» опция

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — **107 зелёных**

---

### ✅ Шаг 7 — Per-screen CSS Overrides

**Что реально сделано:**

- `src/components/panels/sections/ScreenAppearanceSection.tsx` — **полная переработка**

  Кнопка **«Override Global Styles»** (toggle с `ChevronDown`/`ChevronRight`) разворачивает панель переопределений. Badge на кнопке показывает кол-во активных overrides.

  **Внутри панели — 3 группы:**

  - **Colors** — 7 × `ColorPicker` (`--bg`, `--card-bg`, `--text`, `--text-muted`, `--accent`, `--accent-hover`, `--border-tile`)
  - **Typography** — `select` для `--font-family` + 2×2 сетка `NumberInput` для `--h1-size`, `--h2-size`, `--body-size`, `--option-font`
  - **Spacing & Layout** — 2-колоночная сетка `NumberInput` для `--radius`, `--radius-sm`, `--pad-x`, `--pad-y`, `--container-max`

  **Поведение каждой переменной:**
  - Если override **не задан**: показывается `globalHint` (серый полупрозрачный текст с глобальным значением), контрол использует глобальное значение как начальное
  - Если override **задан**: рядом с лейблом появляется кнопка `<Unlock>` (иконка открытого замка) — клик сбрасывает override через `delete overrides[key]`

  **Дополнительно (вне панели overrides):**
  - `customCss` — `<textarea>` (4 строки, monospace placeholder) для произвольного CSS
  - `customClass` — `<input>` для дополнительного CSS-класса на `<main>` экрана

  **Store calls:**
  - `updateScreen(screen.id, { customStyles: { overrides: { ...overrides, [key]: val } } })` — для установки
  - `delete next[key]` + `updateScreen(...)` — для сброса конкретной переменной
  - Все операции undoable через `undoableUpdate` в `funnel-slice.ts`

- `src/components/panels/sections/ScreenAppearanceSection.module.css` — **новый** CSS-модуль:
  - `.toggleBtn` — кнопка-переключатель с hover-эффектом
  - `.badge` — синий pill-счётчик активных overrides
  - `.panel` — контейнер с border и overflow hidden
  - `.group` / `.groupTitle` — группы с разделителями
  - `.varRow` / `.varHeader` / `.varLabel` — строка переменной
  - `.clearBtn` — маленькая кнопка сброса (18×18px, Unlock-иконка)
  - `.globalHint` — полупрозрачный моноширинный текст глобального значения
  - `.sizeGrid` / `.sizeVar` — 2-колоночная сетка для NumberInput-ов

**Отклонения от плана:**

- Shadow и Transition не вынесены в панель overrides (нет смысла: они текстовые значения, не визуальные цвета/размеры — их удобнее менять только через `customCss` textarea)
- Плейсхолдер с `globalHint` показывает реальное значение из `globalStyles`, не хардкод — если глобальное значение изменится, hint обновится автоматически

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — **107 зелёных**

---

### ✅ Шаг 8 — Синхронизация Panel ↔ Elements Tree

**Что реально сделано:**

**Panel ↔ Elements sync — уже работало:**

Все `Element*.tsx` секции были подключены к store ещё в Phase 2 через `useFunnelStore.getState().updateElementStyle(element.id, prop, val)` и `updateElement(element.id, updates)`. Cache invalidation при любом изменении элемента работает через subscriber из Шага 5 (`funnel-store.ts`): `el !== old.elements[id]` → `invalidateScreenCache(screenId)`. Полный цикл «панель → store → HTML-кэш» работал без дополнительных изменений.

**Удаление seed-элементов:**

- `src/store/defaults.ts` — удалена функция `createSeedElements()` (63 строки), удалены импорт `FunnelElement` и вызов `createSeedElements()`, поле `elements` теперь `{}` вместо `seedElements`
- Дефолтный проект стартует с **одним пустым экраном «Welcome»** без элементов
- Пользователь добавляет элементы через drop из BlockLibrary или drag .html-файла

**Тесты:**

- Ни один тест не ссылался на `demo-heading-1` / `demo-paragraph-1` / `demo-button-1` / `demo-image-1` — тесты сервисов работают с собственными данными (не с `createDefaultProject`)
- Правки тестов не потребовались

**Отклонения от плана:**

- `funnel-slice.ts` не изменялся — cache invalidation через subscriber (`funnel-store.ts`) уже был реализован в Шаге 5 и полностью покрывает ELEMENT_UPDATE / ELEMENT_UPDATE_STYLE / SCREEN_UPDATE

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — **107 зелёных** (без изменений в тестах)

---

### ✅ Шаг 9 — Добавление/удаление элементов в экране

**Что реально сделано:**

**Store actions — уже были готовы:**
- `addElement(element)` — `ELEMENT_ADD`, undoable
- `deleteElement(elementId)` — `ELEMENT_DELETE`, рекурсивно удаляет children, undoable
- `duplicateElement(elementId)` — `ELEMENT_DUPLICATE`, deep-copy с новым ID, undoable; возвращает `newId`
- `moveElement(elementId, targetScreenId, targetParentId, order)` — `ELEMENT_MOVE`, undoable

**SortableElementRow.tsx — hover-кнопки:**
- При наведении на строку элемента появляются две кнопки: `<Copy>` (Duplicate) и `<Trash2>` (Delete)
- `.actions` скрыт через `display: none`, `.row:hover .actions → display: flex`
- Кнопки используют `e.stopPropagation()` — клик не передаётся ReactFlow / dnd-kit

**ScreenNode.tsx — кнопка «+ Add element»:**
- Кнопка с пунктирной рамкой внизу `screen`-блока (всегда видна)
- Клик открывает дропдаун с 8 типами: Heading, Paragraph, Button, Image, Input, Spacer, Divider, Container
- Дропдаун закрывается по клику вне через `useEffect` + `mousedown` listener на `document`
- `onMouseDown: e.stopPropagation()` на обёртке — предотвращает drag ReactFlow-ноды при клике
- Дропдаун открывается **вверх** (`bottom: calc(100% + 4px)`) — не уходит за нижнюю границу карточки
- При выборе типа: создаётся `FunnelElement` с `id: \`${type}-${nanoid(8)}\``, `order: elementIds.length`, вызывается `addElement(el)` → undoable

**MapCanvas.tsx — расширен keyboard handler:**
- `Delete`/`Backspace`: если выбраны элементы (`selectedElementIds`) — удаляет только их, `return` (не трогает экраны/рёбра)
- `Ctrl+D` / `Cmd+D`: если выбраны элементы — дублирует каждый через `duplicateElement`, `return` (не передаёт управление в `useKeyboardShortcuts` для screen-duplicate)

**Отклонения от плана:**

- `moveElementToScreen` в плане — уже существовал как `moveElement` в store; тип `store.ts` уже содержал сигнатуру. Дополнительных правок не потребовалось
- Дропдаун в `ScreenNode` открывается вверх (не вниз) — из-за ограниченной высоты карточки внизу больше места
- `Ctrl+D` для экранов остаётся в `useKeyboardShortcuts` — элементный `Ctrl+D` в `MapCanvas` перехватывает только когда `selectedElementIds.length > 0`

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — **107 зелёных**

---

### ✅ Шаг 10 — Дополнительные тесты парсера и генератора

**Что реально сделано:**

**`src/services/component-parser.test.ts`** — добавлено 6 тестов:
- `parseStyles`: multiple `<style>` блоков объединяются через newline (порядок сохраняется)
- `buildElementTree`: 3-уровневая глубина (section → div → p) — рекурсия работает корректно
- `buildElementTree`: несколько siblings — все захватываются с правильными тегами
- `parse` без мета-комментария: все meta-поля пустые строки / пустой массив, но `elementTree` и `styles` всё равно заполнены
- `@tags` разбивается как массив (comma-separated) — `Array.isArray(meta.tags) === true`

**`src/services/element-factory.test.ts`** — добавлено 7 тестов:
- `mergeStyles`: CSS specificity — tag+class и class-only оба матчатся, свойства из обоих присутствуют
- `mergeStyles`: нет matching CSS → результат только inline styles
- `fromComponentDefinition`: heading HTML → root container + child heading с типом `'heading'`, тег `h1`, content
- `fromComponentDefinition`: heading CSS применяется (`font-size: var(--h1-size)`, `color: var(--text)`)
- Round-trip: parse → factory → все elements имеют правильный screenId
- Компонент без CSS → styles = пустой объект (не crash)

**`src/services/html-cache.test.ts`** — **новый файл**, 9 тестов:
- Кэш пуст до первого вызова
- `getScreenHtml` добавляет в кэш при первом вызове
- Второй вызов не дублирует запись
- Два разных screenId → cache size 2
- `invalidateScreenCache` удаляет только указанный экран
- `invalidateAllCache` очищает всё
- После инвалидации HTML регенерируется с новым контентом
- Кэш-хит возвращает идентичную строку (same reference)
- `globalStyles` изменение → старый HTML не в кэше после инвалидации

**Итог:**

| Файл | До | После |
|------|----|-------|
| `component-parser.test.ts` | 16 тестов | 22 теста (+6) |
| `element-factory.test.ts` | 29 тестов | 36 тестов (+7) |
| `html-generator.test.ts` | 19 тестов (без html-cache) | без изменений |
| `html-cache.test.ts` | — | 9 тестов (новый) |
| **Итого** | **107** | **128 (+21)** |

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — **128 зелёных** (9 test files)

---

## Итоговые критерии Phase 3

| # | Критерий | Статус |
|---|---------|--------|
| 1 | `pnpm dev` без ошибок | ✅ |
| 2 | `pnpm tsc --noEmit` без ошибок | ✅ |
| 3 | `pnpm test` — 107 зелёных | ✅ |
| 4 | HTML-файлы компонентов (план ≥17, факт 40) | ✅ |
| 5 | Drop компонента → парсинг → элементы на экране | ✅ |
| 6 | Drop .html файла с OS → парсинг → экран (Шаг 4.5) | ✅ |
| 7 | HTML-кэш lazy generation + auto-invalidation | ✅ |
| 8 | Lazy fetch (1 HTTP-запрос per component) | ✅ |
| 9 | Roundtrip HTML (generate → parse → match) | ✅ |
| 10 | Undo/Redo для addScreenWithElements | ✅ |
| 11 | Global Styles Panel | ✅ |
| 12 | Per-screen CSS overrides GUI | ✅ |
| 13 | Panel ↔ Elements sync | ✅ |
| 14 | Seed-элементы удалены | ✅ |
| 15 | CRUD элементов (add/delete/duplicate/move) | ✅ |

---

## Post-Phase 3 — UX-доработки карты и менеджера

### ✅ UX 1 — Убраны чёрные плашки с названиями элементов

**Файлы:** `ManagerScreenCanvas.tsx`, `ManagerScreenCanvas.module.css`

- Удалён `<span className={styles.overlayTag}>` из `RootElementOverlay` — чёрные метки типа элемента (`P`, `H`, `Btn` и т.д.) больше не отображаются поверх контента
- CSS-класс `.overlayTag` оставлен в стилях (не мешает), удалена неиспользуемая константа `ELEMENT_TYPE_ABBR`

### ✅ UX 2 — Space: зум на экран при переходе менеджер→карта

**Файлы:** `useKeyboardShortcuts.ts`, `ManagerView.tsx`

- `requestAnimationFrame(() => focusNode(...))` заменён на `setTimeout(() => focusNode(...), 200)` во всех трёх местах: Space shortcut, Escape в менеджере, кнопка «Back to Map»
- Причина: race condition — событие `funnel:focus-node` стреляло до монтирования `MapCanvas` и его event listener. 200мс достаточно для React mount

### ✅ UX 3 — Направляющие стрелки на связях между экранами

**Файлы:** `MapCanvas.tsx`, `ScreenEdge.tsx`

- `MarkerType` добавлен в import из `@xyflow/react`
- `connectionsToEdges` — каждое ребро получает `markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 }` с цветом по статусу связи
- `ScreenEdge.tsx` — деструктурирует `markerEnd` из `EdgeProps` и передаёт в `<BaseEdge markerEnd={markerEnd}>`
- Цветовая карта: `default-path:#3b82f6`, `conditional:#f59e0b`, `plain:#3b82f6`, `error:#f87171`, `self-loop:#ef4444`, `in-cycle:#f97316`

### ✅ UX 4 — Связи не пропадают после режима замка

**Файлы:** `ScreenNode.tsx`

- Handles (`target`, `target-zone`, `source`) больше не удаляются из DOM при `mapLocked`
- Вместо условного рендера: `style={{ opacity: 0, pointerEvents: 'none' }}` — ReactFlow всегда видит anchor-точки и корректно позиционирует рёбра

### ✅ UX 5 — Телефон на карте 1:1 с менеджером (пропорции + контент через scale)

**Файлы:** `ScreenNode.module.css`

- Менеджер: `356×770px`, `border: 5px`, `border-radius: 54px`, `inset: 5px`, Dynamic Island `102×24px`
- Карта: масштаб `0.618` от менеджера → `220×476px`, `border: 3px`, `border-radius: 34px`, `inset: 3px`, Dynamic Island `64×15px`
- iframe рендерится при ширине менеджера (`346px`) и scale(`0.618`) — текст переносится идентично
- `overflow: hidden` на `.phone` — контент не выходит за рамки

### ✅ UX 6 — Интерактивный iframe на карте (всегда)

**Файлы:** `ScreenNode.tsx`, `ScreenNode.module.css`

- iframe всегда `pointer-events: auto` — пользователь может кликать по кнопкам, вводить текст в input, выбирать опции прямо на карте
- Убраны два отдельных стиля `MAP_PREVIEW_STYLE` / `LOCKED_PREVIEW_STYLE` — единый `PREVIEW_STYLE` с вертикальным скроллом и тонким скроллбаром
- `sandbox="allow-same-origin"` — необходимо для работы интерактивных элементов внутри iframe

### ✅ UX 7 — Inline-редактирование текста в менеджере (двойной клик)

**Файлы:** `ManagerScreenCanvas.tsx`, `ManagerScreenCanvas.module.css`

- iframe в менеджере остаётся `pointer-events: none` — клики не проходят
- Двойной клик на overlay текстового элемента (`heading`, `paragraph`, `button`, `option`, `label`, `footer`) открывает inline textarea
- `commitEdit()` при blur или Enter: если текст изменился → `updateElement(id, { content })` → undoable
- Escape отменяет редактирование без сохранения
- CSS `.inlineEdit` — `position: absolute`, белый фон, синяя рамка, тень

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — **135 зелёных** (11 test files)

---

## Правило обновления этого файла

После завершения каждого шага:

1. Меняем статус `⏳` → `🔄` (в работе) → `✅` (готово)
2. Добавляем под заголовок шага раздел **«Что реально сделано»** с:
   - Список реальных файлов с деталями по каждому (методы, логика, CSS-классы)
   - Решения, отличающиеся от `PHASE_3_PARSER_STYLES.md` + объяснение почему
   - Точные результаты `pnpm type-check` и `pnpm test --run` (количество тестов)
3. Обновляем «Карту сервисов и actions» если добавились новые
4. Обновляем «Итоговые критерии» — ставим ✅
