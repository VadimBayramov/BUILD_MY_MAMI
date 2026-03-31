# Processing after Phase 3 — Категория Titles и inline-редактирование

## Переименование: Content → Titles

Категория `content` переименована в `titles` во всех местах:

- `component-manifest.json` — все записи категории `content` заменены на `titles`
- `BlockLibrary.tsx` — `CATEGORY_META.content` → `CATEGORY_META.titles`, иконка `Type` → `Heading`
- `block-library/titles/` — создана новая директория, файлы heading/paragraph/icon-text перенесены из `content/`
- Тесты (`component-parser.test.ts`, `element-factory.test.ts`) — фикстуры обновлены

## Перенос элементов: Image, Spacer, Divider → Layout

Элементы image, spacer, divider перенесены в категорию `layout`:
- `component-manifest.json` — записи обновлены (category: layout, file: layout/*.html)
- HTML-файлы скопированы в `block-library/layout/`, метаданные обновлены

## Новые элементы в Titles

| Элемент | ID | HTML-файл | ElementType |
|---------|-----|-----------|-------------|
| **Subtitle** | `subtitle` | `titles/subtitle.html` | `subtitle` |
| **List** | `text-list` | `titles/text-list.html` | `text-list` |
| **Side Title** | `side-title` | `titles/side-title.html` | `side-title` |
| **Terms Title** | `terms-title` | `titles/terms-title.html` | `terms-title` |

## Обновления типов

`src/types/funnel.ts` — `ElementType` расширен: `subtitle`, `text-list`, `side-title`, `terms-title`

## Обновления element-factory.ts

- `DATA_TYPE_MAP` — добавлены маппинги для subtitle, text-list, side-title, terms-title и их -block контейнеров
- `CLASS_MAP` — добавлены маппинги `funnel-subtitle`, `funnel-text-list`, `funnel-side-title`, `funnel-terms-title`

## Inline-редактирование текста (подход FunnelFox)

Описано в DOCS_ARCHITECTURE секции 10.4 и 16.6:

- Вместо textarea используется `contenteditable` для нативного rich-text
- Floating toolbar при выделении текста (B/I/U/Link/Color)
- Toolbar привязан к selection range
- Содержимое сохраняется как innerHTML в `element.content`
- Для list: переключатель стиля маркера (bullet/dash/icon) через `data-list-style`
- Для terms-title: inline-ссылки с `data-link-type` и редактируемым URL в правой панели
- Для side-title: вертикальный текст (`writing-mode: vertical-lr; text-orientation: upright`)

## Floating Toolbar для Rich Text форматирования

Реализован компонент `TextFormatToolbar`:
- Появляется при выделении текста в contenteditable-области
- Кнопки: **Bold**, **Italic**, **Underline**, **Strikethrough**, **Link**, **Color**
- Привязан к позиции selection range (следует за выделением)
- Использует `document.execCommand` для форматирования
- Стейт кнопок обновляется через `selectionchange` (active/inactive)

## Замена textarea → contenteditable в менеджере

`ManagerScreenCanvas.tsx`:
- `textarea` заменён на `contenteditable div` для inline-редактирования
- Вход в режим правки: второй клик по overlay (`event.detail >= 2`) для типов из `EDITABLE_TYPES` (см. конфликт с dnd выше)
- Floating toolbar появляется при выделении текста
- Content сохраняется как innerHTML (с тегами `<b>`, `<i>`, `<u>`, `<s>`, `<a>`)
- Расширен список EDITABLE_TYPES: + subtitle, text-list, side-title, terms-title

## Inline-редактирование текста прямо на карте (в iframe) + Floating Toolbar

`ScreenNode.tsx`:
- В iframe инжектируются CSS + JS целиком (toolbar рендерится внутри iframe)
- Toolbar содержит: **B** (Bold), **I** (Italic), **U** (Underline), **S** (Strikethrough), **Link** (🔗), **Color** (input[color])
- Стиль toolbar: тёмная тема (#1e293b), border-radius: 8px, кнопки 26×26 с hover/active состояниями
- Toolbar появляется над selection range при выделении текста в contenteditable элементе
- Кнопки используют `document.execCommand` для форматирования (bold, italic, underline, strikeThrough, createLink, foreColor)
- Состояние кнопок (active/on) обновляется через `queryCommandState` при `selectionchange`
- Link — через `prompt('URL:')`, Color — через `<input type="color">`
- Двойной клик по `[data-editable="true"]` → contenteditable на элементе
- Ctrl+Enter / клик вне → завершение правки, Escape → отмена
- `postMessage('funnel:inline-edit')` → store.updateElement
- iframe sandbox: `allow-same-origin allow-scripts`
- CSS hover-outline на editable элементах, active-outline при редактировании

## Менеджер — onBlur fix

- `handleBlur` проверяет `relatedTarget?.closest('[data-fb-toolbar]')` — клик по toolbar не закрывает редактирование
- `TextFormatToolbar` — добавлен `data-fb-toolbar` атрибут, `tabIndex={-1}` на всех кнопках
- `onMouseDown: preventDefault` предотвращает потерю фокуса при клике по toolbar

## Менеджер — конфликт overlay с dnd-kit (выделение и вход в редактирование)

- **Проблема:** прозрачный overlay над iframe одновременно был drag-handle (`useSortable` + `listeners`) и имел `touch-action: none`, из‑за чего жесты перехватывались до нормального входа в режим правки; текст «не выделялся» и редактирование казалось сломанным.
- **Решение:** для типов из `EDITABLE_TYPES` на overlay **не** пробрасываются drag-`listeners` (перетаскивание таких блоков в менеджере отключено в пользу текста); вход в редактирование — в `onClick` при `event.detail >= 2` (второй клик по уже выбранному блоку), без отдельной зависимости от `onDoubleClick`.
- **CSS:** класс `.overlayEditable` — `cursor: text`, `touch-action: auto`.

## Карта — почему панель форматирования внутри iframe

- `document.execCommand` и `Selection` относятся к **документу iframe**; React-toolbar в родительском окне не видит выделение внутри iframe. Поэтому на карте плашка B/I/U/S/Link/Color реализована **внутри** превью (инжектируемый HTML/CSS/JS), а не только как внешний React-компонент.

## Фикс бага: нижний угол телефона выпадает при зуме

`ScreenNode.module.css`:
- `.phone` — добавлен `isolation: isolate` для создания нового stacking context
- `.screen` — добавлены `will-change: transform` и `-webkit-mask-image` для принудительного GPU-композитинга (устраняет субпиксельные артефакты border-radius при трансформациях)
- `.screenContent` — добавлен `border-radius: 0 0 30px 30px` для гарантии обрезки нижних углов

---

## Панель инструментов карты (Map Tool Panel)

### Новый тип: MapTool

`src/types/ui.ts` — добавлен тип `MapTool = 'cursor' | 'container' | 'text'` и поле `mapTool: MapTool` в `UIState`.

`src/types/store.ts` — добавлен экшен `setMapTool: (tool: MapTool) => void` в `UIActions`.

`src/store/slices/ui-slice.ts` — реализация `setMapTool`, дефолтное значение `'cursor'`.

### Вертикальная панель инструментов (MapToolPanel)

**Новые файлы:**
- `src/components/map-mode/MapToolPanel.tsx`
- `src/components/map-mode/MapToolPanel.module.css`

Вертикальная панель слева на карте с тремя инструментами:

| Инструмент | Иконка | Шоткат | Назначение |
|------------|--------|--------|-----------|
| **Курсор** | MousePointer2 | Alt+E | Выделение и перемещение элементов на экране |
| **Контейнер** | Square | Alt+R | Рисование контейнера с фоном на экране |
| **Текст** | Type | Alt+T | Клик по тексту → сразу редактирование |

Стиль: тёмная тема, `border-radius: 10px`, кнопки 34×34, буква шортката в правом нижнем углу каждой кнопки.

### Интеграция в MapCanvas

`src/components/map-mode/MapCanvas.tsx`:
- Импортирован `MapToolPanel`, рендерится внутри `canvasWrap` (абсолютное позиционирование слева по центру)
- `mapTool` прокидывается в `screensToNodes()` → `data.mapTool` каждого узла → `ScreenNode` знает активный инструмент
- `index.ts` — добавлен реэкспорт `MapToolPanel`

### Горячие клавиши инструментов

`src/hooks/useKeyboardShortcuts.ts`:
- Добавлены три шортката: `Alt+E` (cursor), `Alt+R` (container), `Alt+T` (text)
- Добавлен `setMapTool` в `ShortcutActions` и обработчик

### Фикс: Alt + scroll зумит канвас, а не браузер

`src/components/map-mode/MapCanvas.tsx`:
- Добавлен `ref` на `canvasWrap` и `wheel` event listener с `{ passive: false }`
- При зажатом Alt: `e.preventDefault()` блокирует браузерный зум, вызывает `zoomIn()` / `zoomOut()` из React Flow

### Cursor tool — выделение и перетаскивание элементов в iframe

`src/components/map-mode/ScreenNode.tsx`:
- Функция `buildToolScript(tool)` генерирует JavaScript для инжекции в iframe в зависимости от активного инструмента
- **Cursor**: клик на `[data-element]` → `postMessage('funnel:element-select')` → `store.selectElement()`
- **Cursor drag (flow-элементы)**: mousedown → clone + placeholder → mousemove → перемещение placeholder → mouseup → `postMessage('funnel:element-reorder')` → `store.reorderElements()`
- **Cursor drag (absolute-элементы, контейнеры)**: прямое перемещение `left`/`top` с двумя режимами:
  - **Snap** (по умолчанию): привязка к сетке 8px
  - **Free** (зажат Alt): плавное перемещение без привязки
  - На mouseup: `postMessage('funnel:element-move')` → `store.updateElement({ styles: { left, top } })`
- Вспомогательная функция `recomputeOrder()` пересчитывает порядок элементов при drag-reorder

### Container tool — рисование контейнера на экране

- При зажатии мыши на пустом месте экрана → рисуется dashed-прямоугольник (`border: 2px dashed #3b82f6`)
- При отпускании (если > 10×10px): `postMessage('funnel:container-create')` → создаётся `FunnelElement` с типом `'container'`:
  - `position: absolute`, `left`, `top`, `width`, `height` по координатам рисования
  - `background: rgba(59,130,246,0.1)`, `borderRadius: 8px`
  - `classes: ['funnel-container-box']`
  - `type: 'container'` (уже существует в `ElementType`)
- Контейнер может вмещать дочерние элементы через `parentId`
- Все операции идут через `undoableUpdate` (Ctrl+Z поддерживается автоматически)

### Text tool — редактирование по одному клику

- При активном Text tool: клик на `[data-editable="true"]` → сразу `contenteditable = 'true'` + выделение текста + фокус
- Не требуется двойной клик как в стандартном режиме
- Floating toolbar (B/I/U/S/Link/Color) работает как обычно

### Стили курсора в iframe по инструменту

`buildToolScript()` инжектирует `<style>` тег в iframe:
- **Cursor**: `[data-element] { cursor: grab }`, `:active { cursor: grabbing }`
- **Text**: `[data-editable] { cursor: text }`
- **Container**: `body { cursor: crosshair }`, `[data-element] { cursor: default }`

### PostMessage протокол (новые типы)

| Тип | Направление | Данные | Действие |
|-----|-------------|--------|----------|
| `funnel:element-select` | iframe → parent | `{ elementId }` | `store.selectElement()` |
| `funnel:element-reorder` | iframe → parent | `{ elementId, targetIndex }` | `store.reorderElements()` |
| `funnel:element-move` | iframe → parent | `{ elementId, left, top }` | `store.updateElement({ styles })` |
| `funnel:container-create` | iframe → parent | `{ x, y, width, height }` | `store.addElement()` |

## Список изменённых файлов

- `DOCS_ARCHITECTURE.md` — секции 8.1, 10.4, 16.6
- `block-library/component-manifest.json`
- `block-library/titles/` — heading.html, subtitle.html, paragraph.html, icon-text.html, text-list.html, side-title.html, terms-title.html
- `block-library/layout/` — image.html, spacer.html, divider.html (перенесены из content/)
- `src/types/funnel.ts` — ElementType
- `src/services/element-factory.ts` — DATA_TYPE_MAP, CLASS_MAP
- `src/components/panels/BlockLibrary.tsx` — CATEGORY_META, default expanded
- `src/components/panels/sections/ElementContentSection.tsx` — label "Content" → "Text"
- `src/components/shared/TextFormatToolbar.tsx` — **новый** компонент floating toolbar
- `src/components/shared/TextFormatToolbar.module.css` — **новый** стили toolbar
- `src/components/manager-mode/ManagerScreenCanvas.tsx` — contenteditable + toolbar
- `src/components/manager-mode/ManagerScreenCanvas.module.css` — стили contenteditable
- `src/components/map-mode/ScreenNode.tsx` — inline-edit в iframe + postMessage
- `src/components/map-mode/ScreenNode.module.css` — фикс субпиксельного бага
- `src/services/component-parser.test.ts` — фикстуры
- `src/services/element-factory.test.ts` — фикстуры
- `src/types/ui.ts` — MapTool тип, mapTool поле
- `src/types/store.ts` — setMapTool экшен
- `src/store/slices/ui-slice.ts` — setMapTool реализация
- `src/components/map-mode/MapToolPanel.tsx` — **новый** вертикальная панель инструментов
- `src/components/map-mode/MapToolPanel.module.css` — **новый** стили панели
- `src/components/map-mode/MapCanvas.tsx` — MapToolPanel интеграция, Alt+scroll zoom fix, mapTool проброс
- `src/components/map-mode/ScreenNode.tsx` — tool scripts (cursor/container/text), новые postMessage обработчики
- `src/components/map-mode/index.ts` — реэкспорт MapToolPanel
- `src/hooks/useKeyboardShortcuts.ts` — Alt+E/R/T шортката для инструментов

---

## Фиксы панели инструментов и режимов (итерация 2)

### Fix 1: Alt+scroll зум на экране телефона (iframe)

**Проблема:** При наведении мыши на экран телефона (iframe), Alt+scroll зумил браузер, а не канвас — wheel event уходил в iframe, не всплывая к родителю.

**Решение:**
- В iframe инжектируется `wheel` handler с `{ passive: false }`, который при `e.altKey` делает `preventDefault()` и отправляет `postMessage('funnel:alt-wheel', { deltaY })` родителю
- В `MapCanvas.tsx` добавлен обработчик кастомного события `funnel:alt-zoom`, который вызывает `zoomIn()` / `zoomOut()` из React Flow
- Цепочка: iframe wheel → postMessage → ScreenNode → window event → MapCanvas → zoomIn/zoomOut

### Fix 2: Floating toolbar не выходит за границы экрана

**Проблема:** Панель форматирования текста (B/I/U/S/Link/Color) могла уходить за пределы экрана телефона.

**Решение:**
- Toolbar теперь `position: fixed` (вместо `absolute`) — позиция относительно viewport
- `showToolbar()` зажимает координаты: `top = max(4, min(top, vh - tbH - 4))`, `left = max(4, min(left, vw - tbW - 4))`
- Если над выделением нет места — toolbar показывается под ним

### Fix 3: Режим E (cursor) — заблокировано редактирование текста

**Проблема:** В режиме курсора (E) по-прежнему можно было выделять и редактировать текст.

**Решение:**
- `INLINE_EDIT_SCRIPT` объединён с `buildToolScript` в единую функцию `buildInlineEditScript(tool)`
- `dblclick` обработчик для contenteditable включён только когда `TOOL !== 'cursor'`
- Одинарный клик для редактирования работает только при `TOOL === 'text'`
- В режиме cursor: iframe получает `pointer-events: none`, вся интерактивность через overlay

### Fix 4: Режим R (container) — resize контейнеров

**Проблема:** Созданные контейнеры нельзя было изменить по размеру.

**Решение:**
- CSS `.funnel-container-box`: `resize: both; overflow: auto;` + dashed border для визуальной обратной связи
- `ResizeObserver` отслеживает изменение размеров контейнеров
- При resize: `postMessage('funnel:container-resize', { elementId, width, height })` → `store.updateElement()`
- Работает и в cursor, и в container режимах

### Fix 5: Перемещение элементов — как в менеджере

**Проблема:** Перетаскивание элементов было реализовано через скрипты внутри iframe, а не через overlay-кнопки как в менеджере.

**Решение — полный рефактор подхода:**

Теперь в режиме cursor (E) используется **overlay-система, идентичная менеджеру**:

1. **iframe ref** + `recomputeLayout()` — читает позиции `[data-element]` из iframe DOM, создаёт `OverlayBox[]`
2. **Overlay layer** — `div.overlayLayer` поверх iframe, `pointer-events: none` (кнопки — `auto`)
3. **MapElementOverlay** — компонент с `useSortable()` от dnd-kit, аналог `RootElementOverlay` из менеджера
4. **SortableContext** — оборачивает overlay кнопки, использует `rectSortingStrategy`
5. **DndContext** — из `AppShell` (общий), `handleDragEnd` из `useDragAndDrop` обрабатывает reorder
6. **Масштабирование** — позиции из iframe умножаются на `SCALE = 0.618` для точного позиционирования overlay
7. **pointer-events** — при cursor tool iframe получает `pointer-events: none`, при text/container — `auto`

Стили overlay кнопок в `ScreenNode.module.css` (`.elemOverlay`, `.elemOverlaySelected`, `.elemOverlayDragging`) — 1:1 как в менеджере.

### PostMessage протокол (новые типы)

| Тип | Направление | Данные | Действие |
|-----|-------------|--------|----------|
| `funnel:alt-wheel` | iframe → parent | `{ deltaY }` | Zoom canvas |
| `funnel:container-resize` | iframe → parent | `{ elementId, width, height }` | updateElement styles |

### Изменённые файлы

- `src/components/map-mode/ScreenNode.tsx` — полный рефактор: overlay система, buildInlineEditScript, tool-aware поведение
- `src/components/map-mode/ScreenNode.module.css` — overlay стили (.overlayLayer, .elemOverlay, .elemOverlaySelected, .elemOverlayDragging)
- `src/components/map-mode/MapCanvas.tsx` — обработчик funnel:alt-zoom для проброса зума из iframe

---

## Phase 3.5 — Архитектурная переработка (запланировано)

Полный план: `DOCS-WAYS-BUILD/PHASE-3.5-BIG-CHANGE.md`

Ключевые блоки:
1. Правая панель — индивидуальные секции настроек для каждого ElementType
2. Визуальные превью компонентов + Save Styles
3. Визуальная иерархия категорий (3 tier'а + цветовые акценты)
4. Custom HTML Block (CodeMirror + live preview + CSS scoping)
5. HTML Parser Block (drop zone → splitter → parsed draggable blocks)
6. Drag & Drop без ограничений (insertion indicator, cross-screen drag)
7. Фикс бага textarea → contenteditable (RichTextEditor / PlainTextInput)
