# Phase 2 Progression

## Как читать этот документ

`PROGRESSION.md` — живой журнал второй фазы. Он фиксирует:

1. **Текущий статус каждого шага** (🔄 В работе / ✅ Готово / ⏳ Не начато)
2. **Что реально сделано** — конкретные файлы, решения, отклонения от плана
3. **Карту событий** — какие store actions, UI-события и хуки живут в каких файлах
4. **Карту связей между документами**

В начале каждой сессии читаем этот файл. В конце шага обновляем.

---

## Карта документов

```
DOCS_ARCHITECTURE.md          ← Полная архитектура, source of truth дизайна
        │
        │  раздел 16 → Phase 2 описан как "Панели и DnD"
        │  раздел 8  → LeftPanel / RightPanel спецификации
        │  раздел 7  → Canvas / React Flow
        │  раздел 6  → Store actions (ELEMENT_UPDATE, SCREEN_RENAME, etc.)
        ↓
PHASE_2_PANELS_DND.md         ← Детальный план Phase 2 (шаги 1–7)
        │
        │  определяет: файлы, критерии готовности, порядок шагов
        │  ссылается на: DOCS_ARCHITECTURE.md §8, §6.2, §7.3
        ↓
PROGRESSION.md                ← Этот файл: что сделано, где живёт, как связано
```

**Отношение между документами:**

| Вопрос | Документ |
|--------|---------|
| Почему делаем именно так? | `DOCS_ARCHITECTURE.md` |
| Что делать на этом шаге? | `PHASE_2_PANELS_DND.md` |
| Что уже сделано? Как реализовано? | `PROGRESSION.md` (этот файл) |

---

## Карта событий и actions Phase 2

### Store Actions (где определены → кто вызывает)

| Action | Файл определения | Вызывается из |
|--------|-----------------|---------------|
| `addScreen` | `store/slices/funnel-slice.ts` | `CanvasDropZone` (DnD drop), ContextMenu |
| `updateScreen` | `store/slices/funnel-slice.ts` | `ScreenGeneralSection`, `ScreenNavigationSection`, `ScreenAppearanceSection` |
| `SCREEN_RENAME` (через `updateScreen`) | `store/slices/funnel-slice.ts` | `ScreenGeneralSection` (ID field) |
| `deleteScreen` | `store/slices/funnel-slice.ts` | ContextMenu, `Del` key |
| `duplicateScreen` | `store/slices/funnel-slice.ts` | ContextMenu, `Ctrl+D` |
| `ELEMENT_UPDATE` (через `updateElement`) | `store/slices/funnel-slice.ts` | `ElementProperties` секции |
| `reorderElements` | `store/slices/funnel-slice.ts` | `useDragAndDrop` (onDragEnd, element type) |
| `setSelectedScreenIds` | `store/slices/ui-slice.ts` | `ScreenNode` (onClick), `useKeyboardShortcuts` (Escape, Ctrl+A) |
| `setSelectedElementIds` | `store/slices/ui-slice.ts` | клик по элементу в ScreenNode |
| `copyToClipboard` | `store/slices/history-slice.ts` | `Ctrl+C`, ContextMenu |
| `cutToClipboard` | `store/slices/history-slice.ts` | `Ctrl+X`, ContextMenu |
| `pasteFromClipboard` | `store/slices/history-slice.ts` | `Ctrl+V`, ContextMenu |

### UI Events (где происходят → что вызывают)

| Событие | Компонент | Store action | Хук |
|---------|-----------|-------------|-----|
| Клик на ScreenNode | `ScreenNode.tsx` | `setSelectedScreenIds([id])` | — |
| ПКМ на ScreenNode | `ScreenNode.tsx` | — | `useContextMenu` → открыть ContextMenu |
| ПКМ на холсте | `MapCanvas.tsx` | — | `useContextMenu` → открыть ContextMenu |
| Drag карточки из BlockLibrary | `BlockLibraryItem.tsx` | — (dnd-kit drag start) | `useDragAndDrop` |
| Drop на холст | `CanvasDropZone.tsx` | `addScreen` | `useDragAndDrop` |
| Drag строки элемента | `SortableElementRow.tsx` | — (dnd-kit drag start) | `@dnd-kit/sortable` |
| Drop строки элемента | `ScreenNode.tsx` (SortableContext) | `reorderElements` | `@dnd-kit/sortable` |
| Изменение Name в панели | `ScreenGeneralSection.tsx` | `updateScreen({ name })` | — |
| Изменение ID в панели | `ScreenGeneralSection.tsx` | `updateScreen({ id })` + cascade | — |
| `F2` | `useKeyboardShortcuts.ts` | `triggerRename(screenId)` → `ScreenGeneralSection` focus | — |
| `F3` | `useKeyboardShortcuts.ts` | `triggerIdFocus(targetId)` → focus ID/Slug input | — |
| `Ctrl+D` | `useKeyboardShortcuts.ts` | `duplicateScreen` | — |
| `Ctrl+C` | `useKeyboardShortcuts.ts` | `copyToClipboard` | — |
| `Ctrl+V` | `useKeyboardShortcuts.ts` | `pasteFromClipboard` | — |
| `Ctrl+N` | `useKeyboardShortcuts.ts` | `addScreen` + `selectScreen` + `triggerRename` | — |
| `Ctrl+B` | `useKeyboardShortcuts.ts` | dispatch `funnel:group-block` → `MapToolbar` | — |
| `Ctrl+Enter` | `useKeyboardShortcuts.ts` | `selectScreen(target)` + `funnel:focus-node` | — |
| `Tab` / `Shift+Tab` | `useKeyboardShortcuts.ts` | `selectScreen(next/prev)` + `funnel:focus-node` | — |
| `Space` | `useKeyboardShortcuts.ts` | `setPreviewVisible(!previewVisible)` | — |
| `Ctrl+Shift+F` | `useKeyboardShortcuts.ts` | dispatch `funnel:search-open` → `QuickSearch` | — |
| `Home` / `End` | `useKeyboardShortcuts.ts` | `selectScreen(start/end)` + `funnel:focus-node` | — |
| `Ctrl+Shift+L` | `useKeyboardShortcuts.ts` | dispatch `funnel:auto-layout` → `MapCanvas` BFS | — |
| `Ctrl+A` (Map Mode) | `useKeyboardShortcuts.ts` | `setSelectedScreenIds(all)` | — |
| `Escape` | `useKeyboardShortcuts.ts` | `setSelectedScreenIds([])` + закрыть меню | — |

### Какой компонент показывает правую панель

```
ui.selectedElementIds.length > 0
    └─► ElementProperties.tsx

ui.selectedElementIds.length === 0 && ui.selectedScreenIds.length === 1
    └─► ScreenProperties.tsx

ui.selectedScreenIds.length === 0
    └─► (пустая правая панель — placeholder "Select a screen")

ui.selectedScreenIds.length > 1
    └─► MultiSelectProperties.tsx (Phase 2: заглушка "N screens selected")
```

---

## Текущее состояние

### ✅ Шаг 1 — BlockLibrary (Left Sidebar, Map Mode)

**Что реально сделано:**

- `block-library/component-manifest.json` — создан, 41 запись по 12 категориям
- `src/types/component.ts` — добавлены `ManifestEntry` и `ComponentManifest`
- `src/services/component-registry.ts` — добавлены `loadFromManifest()`, `search()`, `getManifestEntries()`, `getManifestByCategory()`, `getManifestCategories()` + singleton `componentRegistry`
- `src/App.tsx` — `componentRegistry.loadFromManifest(manifestJson)` при старте приложения (статический import, bundled Vite)
- `src/components/panels/BlockLibraryItem.tsx` + `BlockLibraryItem.module.css` — карточка одного блока (cursor: grab, hover highlight)
- `src/components/panels/BlockLibrary.tsx` — полностью переписан:
  - accordion по категориям (expand/collapse, `ChevronRight` анимация)
  - `Content` и `Interactive` открыты по умолчанию
  - поиск с debounce 200ms — flat list при запросе, accordion при пустом
  - кнопка Clear (×) в поиске
  - реальные данные из `componentRegistry`
- `src/components/panels/BlockLibrary.module.css` — полностью переписан (scrollable content, accordion, items)

**Отклонения от плана:**

- manifest загружается как статический bundled import, не через `fetch()` — упрощение для Phase 2 (fetch с lazy-load HTML — Phase 4)
- `block-library/` HTML-файлы не созданы (только manifest) — нужны Phase 3 (парсинг) и Phase 4 (DnD drop)

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm lint` — 0 ошибок
- `pnpm test --run` — 21/21 зелёных

---

### ✅ Связи между экранами — система валидации (Phase 1 долг)

**Что сделано вне плана шагов, но критично:**

- `src/utils/connection-validator.ts` — полный engine диагностики:
  - **Connection statuses:** `default-path` / `conditional` / `plain` / `self-loop` / `in-cycle` / `error`
  - **Screen statuses:** `ok` / `start` / `dead-end` / `unreachable` / `in-cycle` / `duplicate-default`
  - `detectDefaultPathCycles()` — DFS по isDefault-цепочкам, маркирует циклические экраны и связи
  - `findReachableScreens()` — BFS от startScreenId, выявляет недостижимые экраны
  - `validateConnections(screens, connections, startScreenId)` → `ConnectionDiagnostics`
  - Guards: `shouldBeDefault()`, `isDuplicateConnection()`

- `src/components/map-mode/ScreenEdge.tsx` — переписан:
  - **Цвета:** базовый синий `#3b82f6`; conditional — amber `#f59e0b`; error — soft red `#f87171`
  - **Прозрачность:** plain `opacity: 0.40` (фоновые), error `0.75`
  - **Широкая прозрачная зона** `strokeWidth=24` для удобного клика/выделения
  - **Кнопка ×** только при `selected === true` (нет hover race-condition)
  - **Красный тултип** `errorReason` над кнопкой ×
  - `ScreenEdge.module.css` создан

- `src/components/map-mode/MapCanvas.tsx` — обновлён:
  - `validateConnections` через `useMemo` на каждое изменение
  - Диагностика передаётся в `data`-пропсы нод и рёбер
  - **Guard: self-loop** — `source === target` → отклоняется при создании
  - **Guard: duplicate** — одинаковый `from+to` → отклоняется
  - **Авто-isDefault:** первое исходящее становится `isDefault: true` автоматически

- `src/components/map-mode/ScreenNode.tsx` — обновлён:
  - **Зелёный бейдж START** на стартовом экране
  - **⚠ красный бейдж** на dead-end (нет исходящих + не terminal-тип)
  - **CopyX amber бейдж** при duplicate-default
  - Красная / amber рамка телефона соответственно

**pnpm type-check** — 0 ошибок
**pnpm lint** — 0 ошибок
**pnpm test --run** — 21/21 зелёных

---

### ✅ Диагностика связей — self-loop визуал и новые статусы нод

**Что исправлено (поверх предыдущего блока):**

- `ScreenEdge.tsx`
  - `STATUS_STROKE` и `STATUS_OPACITY` дополнены `'self-loop'` (`#ef4444`) и `'in-cycle'` (`#f97316`) — раньше TypeScript-ошибка + `stroke = undefined` → невидимое ребро
  - Self-loop теперь рисует **арку над нодой** (`M sx,sy C sx,sy-90 tx,ty-90 tx,ty`) вместо `getBezierPath`, который коллапсировал в backward-кривую сквозь тело ноды
  - Дашированные паттерны: `in-cycle` → `5 3`, `self-loop` → `4 2` (визуально отличаются от `conditional` `6 3`)

- `ScreenNode.tsx` + `ScreenNode.module.css`
  - Интерфейс `ScreenNodeData` дополнен `isInCycle` и `isUnreachable`
  - Единый бейдж показывает самый тяжёлый статус (приоритет: in-cycle > duplicate-default > dead-end > unreachable):
    - `RefreshCw` оранжевый — пользователь зациклится на default-пути навсегда
    - `Unlink` серый — экран недостижим со стартового экрана
  - Новые CSS-классы `.inCycle` (оранжевая рамка) и `.unreachable` (серая рамка)

- `MapCanvas.tsx` — `screensToNodes` передаёт `isInCycle` и `isUnreachable` в `data` ноды

**Почему self-loop некликабелен без этого фикса:**
Source handle — правая сторона ноды, target handle — левая. `getBezierPath(Right→Left)` для одного и того же узла рисует обратную S-кривую сквозь тело ноды. Hit-area `strokeWidth=24` на такой кривой не работала. Арка выходит над нодой — видима, кликаема, удаляема кнопкой ×.

---

### ✅ Шаг 2 — ScreenProperties (Right Sidebar)

**Что реально сделано:**

- `src/components/panels/sections/section.module.css` — создан, общие стили для всех секций: `.fields`, `.field`, `.label`, `.input`, `.select`, `.textarea`, `.row`, `.rowLabel`, `.subField`, `.twoCol`, `.inputError`, `.error`

- `src/components/panels/sections/ScreenGeneralSection.tsx` — создан:
  - **Name** — controlled input, commit on blur / Enter → `updateScreen({ name })`
  - **ID / Slug** — controlled input, валидация `/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/` + проверка уникальности, commit on blur → `renameScreen(oldId, newId)`, ошибка показывается inline, при невалидном значении откатывается к текущему id
  - **Type** — select из 7 типов, immediate update → `updateScreen({ type })`
  - **Tags** — comma-separated input, commit on blur → `updateScreen({ tags })`
  - `useEffect` синхронизирует локальный стейт при внешних изменениях (undo/redo)

- `src/components/panels/sections/ScreenNavigationSection.tsx` — создан:
  - **Progress bar** toggle → `updateScreen({ settings: { ...progressBar } })`
  - При включении: sub-field выбора Auto / Manual % + NumberInput если Manual
  - **Back button** toggle
  - **Auto-navigate** toggle + при включении: NumberInput для delay (ms, 0–30000, step 100)
  - **Transition animation** select (none / fade / slide-left / slide-up / slide-down / zoom-in)
  - Все изменения immediate (undoable через store)

- `src/components/panels/sections/ScreenAppearanceSection.tsx` — создан:
  - **Container max-width** `NumberInput` (280–1200px, step 8) → `--container-max`
  - **Background color** `ColorPicker` → `--bg`
  - **Padding X / Y** в двух колонках `NumberInput` (0–120px, step 4) → `--pad-x`, `--pad-y`
  - Все через `updateScreen({ customStyles: { ...overrides } })`

- `src/components/panels/sections/ScreenSocialSection.tsx` — создан:
  - **OG Title**, **OG Image URL**, **OG Description** (textarea) — controlled inputs с `useEffect` для undo-sync
  - Commit on blur → `updateScreen({ customHead: { ...patch } })`

- `src/components/panels/ScreenProperties.tsx` — переписан:
  - 4 аккордеона: General (defaultOpen), Navigation, Appearance, Social Preview
  - `key={screen.id}` на General и Social — сброс локального стейта при переключении экрана
  - `RightPanel.tsx` не тронут — уже правильно рендерит `ScreenProperties` при `selectedScreenIds.length === 1`

**Отклонения от плана:**

- Секции размещены в `sections/` директории прямо внутри `panels/` (а не как отдельный уровень) — упрощение структуры
- Slug-поле откатывается к текущему `screen.id` при невалидном вводе (вместо удержания ошибочного значения)

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — 21/21 зелёных

---

### ✅ Шаг 3 — ElementProperties (Right Sidebar)

**Что реально сделано:**

- `src/components/panels/sections/section.module.css` — дополнен:
  - `.fourCol` — 4-колоночная сетка (для margin/padding)
  - `.alignGroup`, `.alignBtn`, `.alignBtnActive` — icon-кнопки text-align

- `src/components/panels/sections/ElementContentSection.tsx` — создан:
  - **Content** — textarea, commit on blur / Ctrl+Enter → `updateElement({ content })`
  - **HTML Tag** — select (p / h1–h6 / button / div / span / a / label) → `updateElement({ tag })`
  - **Locked** — toggle → `updateElement({ locked })`
  - `useEffect` синхронизирует content при undo/redo

- `src/components/panels/sections/ElementTypographySection.tsx` — создан:
  - **Font Family** — select (inherit / sans-serif / serif / mono / Inter / Roboto / Georgia)
  - **Size** + **Weight** — NumberInput + select в двух колонках
  - **Text Color** — ColorPicker → `updateElementStyle('color', ...)`
  - **Text Align** — 4 icon-кнопки (left / center / right / justify)
  - **Line Height** + **Letter Spacing** — NumberInput в двух колонках

- `src/components/panels/sections/ElementSpacingSection.tsx` — создан:
  - **Margin** — 4 NumberInput (T/R/B/L) в `.fourCol` → `updateElementStyle('margin-top', ...)`
  - **Padding** — 4 NumberInput (T/R/B/L)

- `src/components/panels/sections/ElementBackgroundSection.tsx` — создан:
  - **Background Color** — ColorPicker → `updateElementStyle('background-color', ...)`
  - **Background Image URL** — controlled input, commit on blur

- `src/components/panels/sections/ElementBorderSection.tsx` — создан:
  - **Width** + **Style** — NumberInput + select (none / solid / dashed / dotted / double) в двух колонках
  - **Border Color** — ColorPicker
  - **Border Radius** — 4 NumberInput (TL / TR / BR / BL) в `.fourCol`

- `src/components/panels/sections/ElementEffectsSection.tsx` — создан:
  - **Box Shadow** — preset select (None / SM / MD / LG / Custom) + при Custom: controlled input
  - **Opacity** — NumberInput (0–1, step 0.05)
  - **Overflow** — select (visible / hidden / scroll / auto)
  - **Cursor** — select (default / pointer / text / crosshair / not-allowed / grab)

- `src/components/panels/sections/ElementVisibilitySection.tsx` — создан:
  - **Show** — select (Always / Hidden / Conditional)
  - При Conditional: однорулевой condition builder:
    - `field` (text input)
    - `operator` (eq / neq / gt / lt)
    - `value` (text input)
  - Пишет в `element.visibility` как `'always'` / `'hidden'` / `{ condition: ConditionGroup }`

- `src/components/panels/ElementProperties.tsx` — переписан:
  - Сам подписывается на `selectedElementIds` и `elements` из стора
  - 7 аккордеонов: Content (defaultOpen), Typography, Spacing, Background, Border, Effects, Visibility
  - `key={element.id}` на Content, Background, Effects — сброс локального стейта при переключении элемента
  - Показывает placeholder если элемент не выбран

**Отклонения от плана:**

- `RightPanel.tsx` не тронут — `ElementProperties` сам читает стор (нет prop drilling)
- `BoxModelEditor` не выделен в отдельный shared компонент — достаточно inline fourCol в одной секции

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — 21/21 зелёных

---

### ✅ Шаг 4 — Drag & Drop: BlockLibrary → Canvas

**Что реально сделано:**

- `src/store/defaults.ts` — добавлен `createSeedElements()`:
  - 4 `FunnelElement` на экране `welcome` (heading / paragraph / button / hero-image)
  - Подключены в `createDefaultProject()` → `elements: seedElements`
  - Комментарий: удалить после завершения Phase 3 (HTML parser)

- `src/components/map-mode/ScreenNode.tsx` — обновлён:
  - `EMPTY_IDS: string[]` — стабильный константный референс (предотвращает infinite re-render когда `byScreen[id] === undefined`)
  - Читает `elementIndexes.byScreen[id]`, `elements`, `selectedElementIds` из стора
  - При наличии элементов заменяет заглушку (Smartphone + label) на scrollable список:
    - каждая строка: `ELEMENT_TYPE_ABBR` + `content` preview
    - клик → `selectElement(id, multiKey)` + `e.stopPropagation()`
    - `.elementRowSelected` — подсветка активного элемента
  - CSS: `.elementList`, `.elementRow`, `.elementRowSelected`, `.elementAbbr`, `.elementContent`

- `src/components/layout/RightPanel.tsx` — исправлен приоритет:
  - `selectedElementIds.length > 0` проверяется **первым** → `ElementProperties`
  - только потом `selectedScreenIds.length === 1` → `ScreenProperties`

- `src/components/panels/BlockLibraryItem.tsx` — стал draggable:
  - `useDraggable({ id: entry.id, data: { componentId, componentCategory } })`
  - `CSS.Translate.toString(transform)` + `opacity: 0.4` когда `isDragging`

- `src/components/map-mode/CanvasDropZone.tsx` + `CanvasDropZone.module.css` — новый:
  - `useDroppable({ id: 'canvas' })` — полноразмерный абсолютный overlay
  - Рендерится только когда `isActive` (drag идёт)
  - При `isOver` — синяя рамка + hint "Drop to add screen"

- `src/hooks/useDragAndDrop.ts` — новый хук:
  - `onDragEnd`: если `over.id === 'canvas'` → auto-position (maxX + 350) → `addScreen` + `selectScreen`
  - `data.componentId` становится именем нового экрана

- `src/components/layout/AppShell.tsx` — обновлён:
  - Обёрнут в `<DndContext sensors={sensors} onDragEnd={handleDragEnd}>`
  - `PointerSensor` с `activationConstraint: { distance: 6 }` (предотвращает случайный drag при клике)
  - `<DragOverlay dropAnimation={null}>` для корректного завершения анимации

- `src/components/map-mode/MapCanvas.tsx` — обновлён:
  - `useDndContext()` → `isDraggingBlock` флаг
  - `<CanvasDropZone isActive={isDraggingBlock} />` за пределами `ReactFlow` но внутри `canvasWrap`

- `src/components/map-mode/MapCanvas.test.tsx` — обновлён:
  - `WrappedMapCanvas` — вспомогательный компонент оборачивает `<MapCanvas />` в `<DndContext>`
  - Все 4 теста переведены на `WrappedMapCanvas`

**Отклонения от плана:**

- Позиция нового экрана вычисляется автоматически (`maxX + 350`) вместо точных координат мыши через `useReactFlow().screenToFlowPosition` — точное позиционирование в Phase 4 когда добавим preview
- `DragOverlay` пустой (ghost создаётся через opacity на самом элементе, не отдельной карточкой)

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — 21/21 зелёных

---

### ✅ Шаг 5 — Реордер элементов внутри экрана

**Что реально сделано:**

- `src/types/store.ts` — добавлен в `FunnelActions`:
  - `reorderElements(screenId: string, orderedIds: string[]) => void`

- `src/store/slices/funnel-slice.ts` — реализован `reorderElements`:
  - `undoableUpdate('ELEMENT_REORDER', ...)` — перезаписывает `element.order = index` для каждого элемента в `orderedIds`
  - `buildElementIndexes` пересчитывается автоматически через `undoableUpdate`

- `src/components/map-mode/SortableElementRow.tsx` — новый компонент:
  - `useSortable({ id: elementId, data: { type: 'element', screenId } })`
  - `CSS.Transform.toString(transform)` + `opacity: 0.4` когда `isDragging`
  - Слева — `GripVertical` drag handle (`listeners` + `attributes` только на handle, не на весь ряд)
  - Клик на ряд → `selectElement(id, multiKey)` + `e.stopPropagation()`

- `src/components/map-mode/SortableElementRow.module.css` — новый

- `src/components/map-mode/ScreenNode.tsx` — обновлён:
  - Список элементов обёрнут в `<SortableContext items={elementIds} strategy={verticalListSortingStrategy}>`
  - Каждый ряд рендерится через `<SortableElementRow>` вместо inline `<div>`
  - Убран ручной `handleElementClick` — клик инкапсулирован внутри `SortableElementRow`

- `src/hooks/useDragAndDrop.ts` — обновлён:
  - `isElementDrag()` guard: `data.type === 'element'`
  - При element drag: `arrayMove(currentIds, oldIndex, newIndex)` → `reorderElements(screenId, reordered)`
  - При block drag: прежняя логика `over.id === 'canvas'` → `addScreen`
  - Импорт `arrayMove` из `@dnd-kit/sortable`

- `src/components/map-mode/MapCanvas.tsx` — исправлен:
  - `isDraggingBlock = dndActive !== null && dndActive.data?.current?.type !== 'element'`
  - `CanvasDropZone` больше не появляется при drag строки элемента

**Отклонения от плана:**

- Drag handle вынесен только на иконку `GripVertical` (не на весь ряд) — чтобы клик на ряд работал как выбор элемента без случайного начала drag
- Оба типа drag (block и element) обрабатываются в одном `onDragEnd` в `useDragAndDrop.ts` через type guard — вместо отдельных DndContext

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — 21/21 зелёных

---

### ✅ Шаг 6 — Контекстное меню

**Что реально сделано:**

- `src/types/ui.ts` — добавлен `renameFocusId: string | null` в `UIState`
- `src/types/store.ts` — добавлен `triggerRename(screenId: string | null): void` в `UIActions`
- `src/store/slices/ui-slice.ts` — реализован `triggerRename`, добавлен `renameFocusId: null` в `baseUI`

- `src/hooks/useContextMenu.ts` — переписан:
  - `ContextMenuTarget` — union type: `{ kind: 'screen'; screenId; x; y }` / `{ kind: 'edge'; connectionId; x; y }` / `{ kind: 'canvas'; x; y }`
  - Простой `useState<ContextMenuTarget | null>` + `open(target)` / `close()`

- `src/components/shared/ContextMenu.tsx` — новый:
  - `ContextMenuEntry` — union: `{ type: 'item' }` / `{ type: 'separator' }` / `{ type: 'submenu' }`
  - Рендерится через `createPortal(document.body)` — нет z-index конфликтов с ReactFlow
  - Позиция зажимается в viewport после mount
  - Закрытие: `mousedown` за пределами меню + `keydown Escape`
  - Sub-menu: открывается при `onMouseEnter` родительского item, позиционируется справа (или слева если не влезает)

- `src/components/shared/ContextMenu.module.css` — новый

- `src/components/shared/index.ts` — добавлен экспорт `ContextMenu` + `ContextMenuEntry`

- `src/components/map-mode/MapCanvas.tsx` — обновлён:
  - Обёртка экспорта `<MapCanvas>` переведена на `<ReactFlowProvider>` → `<MapCanvasInner>` (позволяет `useReactFlow()` внутри `MapCanvasInner`)
  - `useReactFlow()` → `fitView` для пункта «Fit View»
  - `useContextMenu()` → `ctxTarget`, `openCtx`, `closeCtx`
  - `onNodeContextMenu` → `openCtx({ kind: 'screen', screenId: node.id, x, y })`
  - `onEdgeContextMenu` → `openCtx({ kind: 'edge', connectionId: edge.id, x, y })`
  - `onPaneContextMenu` → `openCtx({ kind: 'canvas', x, y })`
  - `ctxEntries` — `useMemo` строит массив entries по типу target:
    - **screen**: Duplicate / Rename / separator / Copy / Cut / Paste / separator / Add Connection→ (submenu со списком других экранов) / separator / Delete
    - **edge**: Set as Default / Add Condition… (disabled) / separator / Delete
    - **canvas**: Paste / Add Screen→ (submenu из 7 типов) / separator / Fit View
  - `<ContextMenu>` рендерится когда `ctxTarget !== null`
  - `SCREEN_TYPES` массив выделен на уровень модуля (переиспользуется в submenu)
  - `createDefaultScreen` импортирован для «Add Screen»

- `src/components/panels/sections/ScreenGeneralSection.tsx` — обновлён:
  - `useRef<HTMLInputElement>` на Name input
  - `useFunnelStore` подписан на `ui.renameFocusId`
  - `useEffect`: при совпадении `renameFocusId === screen.id` → `focus()` + `select()` + `triggerRename(null)`

**Отклонения от плана:**

- `ReactFlowProvider` обёрнут в экспорте `MapCanvas` вместо вынесения в отдельный компонент — минимально инвазивно, тесты проходят без изменений
- «Add Condition…» на edge — `disabled: true` (Phase 3+: нет UI для condition builder на уровне связей)
- Подменю реализовано через hover (без стрелок клавиатуры) — навигация по клавишам Phase 7

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — 21/21 зелёных

---

### ✅ Шаг 7 — Горячие клавиши Phase 2

**Что реально сделано:**

- `src/hooks/useKeyboardShortcuts.ts` — расширен:
  - `ShortcutActions` — добавлены `rename: () => void` и `fitView: () => void`
  - Новые шорткаты в `SHORTCUTS`:
    - `F2` → `a.rename()` — не работает в editable полях (нет `allowInEditable`)
    - `Ctrl+Shift+1` → `a.fitView()` — по `mod(e) && e.shiftKey && (e.key === '1' || e.code === 'Digit1')`
  - `rename` в `useKeyboardShortcuts()` — проверяет `ui.mode === 'map'` и `ui.selectedScreenIds[0]`, вызывает `triggerRename(screenId)`
  - `fitView` в `useKeyboardShortcuts()` — диспатчит `new CustomEvent('funnel:fit-view')` на `window`

- `src/components/map-mode/MapCanvas.tsx` — обновлён:
  - `useEffect` подписывается на `window` событие `funnel:fit-view` → вызывает `fitView({ padding: 0.3, duration: 300 })`
  - Слушатель отписывается при unmount (через return cleanup)

- `src/hooks/useKeyboardShortcuts.test.ts` — расширен:
  - `createActions()` добавлены `rename: vi.fn()` и `fitView: vi.fn()`
  - Тест «F2 triggers rename» — F2 вызывает `rename`
  - Тест «F2 does not trigger rename inside editable fields» — F2 с input target не вызывает `rename`
  - Тест «Ctrl+Shift+1 triggers fitView» — вызывает `fitView`

**Уже было из Phase 1 (не требовало изменений):**
- `Ctrl+D` (duplicate), `Ctrl+C` (copy), `Ctrl+X` (cut), `Ctrl+V` (paste) — работали
- `Ctrl+A` (select all screens), `Escape` (clear selection) — работали
- `Alt+Drag` — нативный React Flow selection box (altPressed state в MapCanvas)

**Отклонения от плана:**

- `Ctrl+Shift+1` добавлен как клавиатурный шорткат несмотря на то, что в таблице плана он не был явно указан — он упоминается в контекстном меню холста (Шаг 6), поэтому логично иметь и горячую клавишу
- `fitView` передаётся через `CustomEvent('funnel:fit-view')` а не через props/context — изолирует хук от React иерархии; без coupling с MapCanvas

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — 24/24 зелёных (21 старых + 3 новых)

---

### ✅ Шаг 7b — F3 (Edit ID) + F2 без ограничения по режиму

**Что реально сделано:**

- `src/types/ui.ts` — добавлен `idFocusId: string | null` в `UIState`
- `src/types/store.ts` — добавлен `triggerIdFocus(id: string | null): void` в `UIActions`
- `src/store/slices/ui-slice.ts` — реализован `triggerIdFocus`, добавлен `idFocusId: null` в `baseUI`

- `src/hooks/useKeyboardShortcuts.ts` — расширен:
  - `ShortcutActions` — добавлен `editId: () => void`
  - `F3` → `a.editId()` — фокус на ID/Slug выбранного элемента или экрана
  - Guard `if (state.ui.mode !== 'map')` убран из `rename` — F2/F3 работают в любом режиме
  - `editId` wiring: приоритет element → screen, вызывает `triggerIdFocus(targetId)`

- `src/components/panels/sections/ScreenGeneralSection.tsx` — обновлён:
  - `slugRef = useRef<HTMLInputElement>()` на поле ID/Slug
  - `useEffect` следит за `idFocusId` — при совпадении с `screen.id` фокусирует и выделяет поле

- `src/components/panels/sections/ElementContentSection.tsx` — обновлён:
  - Добавлено read-only поле **Element ID** с `idRef = useRef<HTMLInputElement>()`
  - `useEffect` следит за `idFocusId` — при совпадении с `element.id` фокусирует и выделяет поле

- `src/hooks/useKeyboardShortcuts.test.ts` — добавлены тесты:
  - `F3` → вызывает `editId`
  - `F3` в editable → не вызывает `editId`

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — 27/27 зелёных

---

### ✅ Шаг 7c — Авто-раскладка (Auto Layout)

**Что реально сделано:**

- `src/types/store.ts` — добавлен `batchMoveScreens(positions: Record<string, { x: number; y: number }>) => void` в `FunnelActions`

- `src/store/slices/funnel-slice.ts` — реализован `batchMoveScreens`:
  - `undoableUpdate('SCREENS_BATCH_MOVE', ...)` — перезаписывает `screen.position` для каждого экрана из `positions`

- `src/components/map-mode/MapCanvas.tsx` — расширен:
  - `computeAutoLayoutPositions(screens, connections, startScreenId)` — BFS от стартового экрана:
    - Группирует экраны по глубине (layer)
    - X = `layer * 350`, Y = `(indexInLayer - layerSize/2) * 250 - layer * 30` (смещение вверх по глубине)
    - Экраны без связей не перемещаются
    - Fallback: если `startScreenId` пустой или невалидный → находит экран без входящих связей → или экран с минимальным `order`
  - `useEffect` подписан на `funnel:auto-layout` → вычисляет позиции → `batchMoveScreens` → `fitView`

- `src/components/map-mode/MapToolbar.tsx` — расширен:
  - Кнопка **Layout** с иконкой `Wand2` → dispatch `funnel:auto-layout`

- `src/hooks/useKeyboardShortcuts.ts` — расширен:
  - `Ctrl+Shift+L` → dispatch `funnel:auto-layout`

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — 27/27 зелёных

---

### ✅ Шаг 7d — Навигация и быстрые действия (8 новых шорткатов)

**Что реально сделано:**

- `src/hooks/useKeyboardShortcuts.ts` — крупное расширение:
  - **Архитектурное изменение:** `run()` может вернуть `false` → `preventDefault()` не вызывается, событие проходит нативно. Позволяет Tab/Space/Home/End не ломать стандартное поведение браузера при отсутствии контекста (нет выделенного экрана, не map-режим)
  - `ShortcutActions` — 8 новых: `newScreen`, `nextInChain`, `prevInChain`, `followDefault`, `groupIntoBlock`, `togglePreview`, `openSearch`, `goToStart`, `goToEnd`
  - Новые записи в `SHORTCUTS`:

| Клавиша | ID | Поведение |
|---------|----|-----------|
| `Ctrl+N` | `new-screen` | Создаёт экран рядом с выделенным (maxX+350 / selected.x+350), auto-select + triggerRename |
| `Tab` | `next-in-chain` | default-outgoing → any outgoing. Возвращает `false` если нет выделения или не map-режим |
| `Shift+Tab` | `prev-in-chain` | default-incoming → any incoming. Аналогичный guard |
| `Ctrl+Enter` | `follow-default` | То же, что Tab, но работает из любого режима |
| `Ctrl+B` | `group-block` | dispatch `funnel:group-block` → MapToolbar создаёт block |
| `Space` | `toggle-preview` | `setPreviewVisible(!previewVisible)`. Только в map-режиме |
| `Ctrl+Shift+F` | `search-screens` | dispatch `funnel:search-open` → QuickSearch. `allowInEditable: true` |
| `Home` | `go-start` | Выбирает startScreenId (или min order) + dispatch `funnel:focus-node` |
| `End` | `go-end` | BFS по default-цепочке до конца + select + focus |

  - Вспомогательная функция `focusNode(nodeId)` — dispatch `funnel:focus-node`

- `src/components/map-mode/MapCanvas.tsx` — расширен:
  - `panActivationKeyCode={null}` — отключает Space-panning React Flow (конфликт с Space шорткатом)
  - `useEffect` для `funnel:focus-node` → `fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 300 })` — центрирует камеру на целевой ноде

- `src/components/map-mode/MapToolbar.tsx` — расширен:
  - `handleCreateBlock` обёрнут в `useCallback`
  - `useEffect` для `funnel:group-block` → вызывает `handleCreateBlock()`

- `src/components/shared/QuickSearch.tsx` + `QuickSearch.module.css` — **новый компонент**:
  - Модальный оверлей (z-index 9999, backdrop)
  - Открывается по event `funnel:search-open`, закрывается по Escape / клик вне
  - Поиск по имени экрана (`screen.name`, `screen.id`) и содержимому элементов (`element.content`)
  - Навигация стрелками ↑↓, выбор Enter — select + focus-node
  - Без запроса показывает все экраны отсортированные по order
  - Лимит отображения: 20 результатов
  - Стилизация через CSS-переменные `--builder-*`

- `src/components/layout/AppShell.tsx` — обновлён:
  - `<QuickSearch />` подключён рядом с `<DragOverlay>`

- `src/hooks/useKeyboardShortcuts.test.ts` — 12 новых тестов:
  - `Ctrl+N` → `newScreen`
  - `Tab` → `nextInChain`
  - `Shift+Tab` → `prevInChain`
  - `Ctrl+Enter` → `followDefault`
  - `Ctrl+B` → `groupIntoBlock`
  - `Space` → `togglePreview`
  - `Ctrl+Shift+F` → `openSearch`
  - `Ctrl+Shift+F` в editable → `openSearch` (allowInEditable)
  - `Home` → `goToStart`
  - `End` → `goToEnd`
  - Tab/Space/Home/End в editable → **не** вызывают
  - `run` returning `false` → `preventDefault` **не** вызывается

**Проверено:**

- `pnpm type-check` — 0 ошибок
- `pnpm test --run` — 39/39 зелёных

---

### ✅ Fix — duplicateScreen: порядок вставки

**Что исправлено:**

- `src/store/slices/funnel-slice.ts` — `duplicateScreen`:
  - Позиция: `source.position.x + 300` вместо `maxX + 350` — дубликат появляется рядом с оригиналом
  - Order: `source.order + 1` вместо `Object.keys(screens).length` — дубликат встаёт сразу после оригинала в цепочке
  - Существующие экраны с `order >= newOrder` сдвигаются на +1

---

## Итоговые критерии Phase 2

| # | Критерий | Статус |
|---|---------|--------|
| 1 | `pnpm dev` без ошибок | ⏳ |
| 2 | `pnpm tsc --noEmit` без ошибок | ✅ |
| 3 | `pnpm test` все зелёные (39/39) | ✅ |
| 4 | BlockLibrary с поиском | ✅ |
| 5 | ScreenProperties в правой панели | ✅ |
| 6 | Изменение имени экрана через панель | ✅ |
| 6b | ElementProperties в правой панели | ✅ |
| 7 | Drag блока из библиотеки на карту | ✅ |
| 8 | Реордер элементов внутри экрана | ✅ |
| 9 | Контекстное меню (ПКМ) | ✅ |
| 10 | F2, F3, Ctrl+D, Ctrl+C/X/V | ✅ |
| 10b | Авто-раскладка (Ctrl+Shift+L, кнопка Layout) | ✅ |
| 10c | Навигация Tab/Shift+Tab, Home/End, Ctrl+Enter | ✅ |
| 10d | Quick-add экрана Ctrl+N | ✅ |
| 10e | Группировка в блок Ctrl+B | ✅ |
| 10f | Глобальный поиск экранов Ctrl+Shift+F | ✅ |
| 10g | Превью Space | ✅ |
| 11 | Undo/Redo для всех операций | ⏳ |

---

## Правило обновления этого файла

После завершения каждого шага:

1. Меняем статус `⏳` → `🔄` (в работе) → `✅` (готово)
2. Добавляем под заголовок шага раздел **«Что реально сделано»** с:
   - Список реальных файлов (мог отличаться от плана)
   - Решения, которые отличаются от `PHASE_2_PANELS_DND.md` + почему
   - Команды проверки (`pnpm test ...`, `pnpm type-check`)
3. Обновляем «Карту событий» если добавились новые actions/компоненты
4. Делаем коммит: `feat(phase2): step-N ...`
