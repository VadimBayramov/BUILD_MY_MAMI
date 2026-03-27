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
| `reorderElements` | `store/slices/funnel-slice.ts` | `SortableElementRow` (DnD end) |
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
| `F2` | `useKeyboardShortcuts.ts` | — | фокус на Name input |
| `Ctrl+D` | `useKeyboardShortcuts.ts` | `duplicateScreen` | — |
| `Ctrl+C` | `useKeyboardShortcuts.ts` | `copyToClipboard` | — |
| `Ctrl+V` | `useKeyboardShortcuts.ts` | `pasteFromClipboard` | — |
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

### ⏳ Шаг 1 — BlockLibrary (Left Sidebar, Map Mode)

Не начат.

**Что нужно проверить перед стартом:**
- `src/components/panels/BlockLibrary.tsx` — существует ли как заглушка?
- `src/services/component-registry.ts` — существует ли?
- `block-library/` папки — созданы ли из Phase 1?

---

### ⏳ Шаг 2 — ScreenProperties (Right Sidebar)

Не начат.

**Что нужно проверить перед стартом:**
- `src/components/panels/ScreenProperties.tsx` — текущее состояние заглушки
- `src/components/layout/RightPanel.tsx` — как сейчас рендерит содержимое?

---

### ⏳ Шаг 3 — ElementProperties (Right Sidebar)

Не начат.

Зависит от: Шаг 2 (общий RightPanel контекст определён).

---

### ⏳ Шаг 4 — Drag & Drop: BlockLibrary → Canvas

Не начат.

Зависит от: Шаг 1 (drag source в BlockLibraryItem).

**Что нужно установить / проверить:**
- `@dnd-kit/core` и `@dnd-kit/sortable` в `package.json`?

---

### ⏳ Шаг 5 — Реордер элементов внутри экрана

Не начат.

Независим от шагов 1–4 — можно параллелить.

---

### ⏳ Шаг 6 — Контекстное меню

Не начат.

Зависит от: Шаг 2 (Rename открывает ScreenProperties).

---

### ⏳ Шаг 7 — Горячие клавиши Phase 2

Не начат.

Расширяет `useKeyboardShortcuts.ts` из Phase 1.

---

## Итоговые критерии Phase 2

| # | Критерий | Статус |
|---|---------|--------|
| 1 | `pnpm dev` без ошибок | ⏳ |
| 2 | `pnpm tsc --noEmit` без ошибок | ⏳ |
| 3 | `pnpm test` все зелёные | ⏳ |
| 4 | BlockLibrary с поиском | ⏳ |
| 5 | ScreenProperties в правой панели | ⏳ |
| 6 | Изменение имени экрана через панель | ⏳ |
| 7 | Drag блока из библиотеки на карту | ⏳ |
| 8 | Реордер элементов внутри экрана | ⏳ |
| 9 | Контекстное меню (ПКМ) | ⏳ |
| 10 | F2, Ctrl+D, Ctrl+C/X/V в Map Mode | ⏳ |
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
