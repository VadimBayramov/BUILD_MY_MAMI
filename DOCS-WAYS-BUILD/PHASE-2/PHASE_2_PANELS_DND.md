# Фаза 2 — Панели и Drag & Drop

## Что мы строим

Живые боковые панели + drag & drop взаимодействие. Пользователь должен
уметь видеть библиотеку блоков, выбирать элемент, перетаскивать его на
карту или внутрь экрана, настраивать свойства экрана и элемента в правой
панели.

**Результат Фазы 2:**

- Левая панель показывает BlockLibrary с категориями и поиском
- Правая панель показывает свойства выбранного экрана или элемента
- Из библиотеки можно перетащить блок на карту → создаётся новый экран
- Элементы внутри экрана можно реордерить drag & drop
- Контекстное меню (ПКМ) работает на экранах и связях
- Горячие клавиши Phase 2 зарегистрированы и работают

**На чём опираемся:**

- `@dnd-kit/core` + `@dnd-kit/sortable` (уже в `package.json` согласно арх.)
- Существующий `AppShell` с `LeftPanel` / `RightPanel` из Phase 1
- Store actions: `addScreen`, `updateScreen`, `addConnection` из Phase 1
- Zustand store slices: `funnel-slice`, `ui-slice`, `history-slice`

---

## Шаги Фазы 2

### Шаг 1 — BlockLibrary (Left Sidebar, Map Mode)

**Файлы:**

- `src/components/panels/BlockLibrary.tsx` — дерево категорий + поиск
- `src/components/panels/BlockLibraryItem.tsx` — одна карточка блока (превью + drag handle)
- `src/services/component-registry.ts` — загрузка/кэш манифеста блоков
- `block-library/component-manifest.json` — каталог всех компонентов (создаём файл)

**Что реализуем:**

- Структура левой панели в Map Mode: аккордеон категорий (Screens / Content / Interactive / Layout / Templates / Custom HTML)
- Поиск по имени/тегам с debounce 200ms
- `ComponentRegistry` читает `component-manifest.json`, кэширует в памяти
- Карточка блока: thumbnail (если есть в `src/assets/thumbnails/`) или placeholder + название
- Drag source (`useDraggable` из `@dnd-kit/core`) на каждой карточке — передаёт `{ type: 'block', componentId }`
- Секция «Screens» показывает шаблоны экранов из `block-library/templates/`

**`component-manifest.json` (минимальная схема):**

```json
{
  "version": 1,
  "components": [
    {
      "id": "option-list",
      "category": "interactive",
      "tags": ["survey", "options"],
      "name": "Option List",
      "description": "Vertical list of selectable options",
      "file": "interactive/option-list.html",
      "thumbnail": null
    }
  ]
}
```

**Критерий готовности:**

- Открываем левую панель в Map Mode → видим аккордеон категорий
- Вводим «option» → фильтрация срабатывает, список сужается
- Карточка перетаскивается (ghost следует за курсором)

---

### Шаг 2 — ScreenProperties (Right Sidebar)

**Файлы:**

- `src/components/panels/ScreenProperties.tsx`
- `src/components/panels/sections/ScreenGeneralSection.tsx`
- `src/components/panels/sections/ScreenNavigationSection.tsx`
- `src/components/panels/sections/ScreenAppearanceSection.tsx`
- `src/components/panels/sections/ScreenSocialSection.tsx`

**Что реализуем:**

Правая панель рендерит `ScreenProperties` когда `ui.selectedScreenIds.length === 1`
и `ui.selectedElementIds.length === 0`.

Четыре секции-аккордеона (как в `DOCS_ARCHITECTURE.md`, раздел 8.2):

**General:**
- Name (text input) → `updateScreen({ name })`
- ID/slug (text input с валидацией по regex `/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/`) → `SCREEN_RENAME`
- Type (select: survey / question / result / loader / form / paywall / custom)
- Tags (text input через запятую)

**Navigation:**
- Progress bar (checkbox) + value (auto / manual %)
- Back button (checkbox)
- Auto-navigate (checkbox) + delay (number ms)
- Transition animation (select: fade / slide-left / slide-up / none)

**Appearance:**
- Container max-width (number input, default 480px) → `screen.customStyles.overrides["--container-max"]`
- Background color (ColorPicker) → `screen.customStyles.overrides["--bg"]`
- Padding X/Y (number inputs)

**Social Preview:**
- OG Title, OG Image URL, OG Description (text inputs) → `screen.customHead`

Все изменения — undoable через `undoable()` middleware.

**Критерий готовности:**

- Кликаем на экран в карте → правая панель показывает его имя и тип
- Меняем Name → нода на карте обновляет заголовок без перезагрузки
- Меняем ID → `SCREEN_RENAME` отрабатывает, связи каскадно обновляются
- Undo (Ctrl+Z) откатывает изменение имени

---

### Шаг 3 — ElementProperties (Right Sidebar)

**Файлы:**

- `src/components/panels/ElementProperties.tsx`
- `src/components/panels/sections/ElementContentSection.tsx`
- `src/components/panels/sections/ElementTypographySection.tsx`
- `src/components/panels/sections/ElementSpacingSection.tsx`
- `src/components/panels/sections/ElementBackgroundSection.tsx`
- `src/components/panels/sections/ElementBorderSection.tsx`
- `src/components/panels/sections/ElementEffectsSection.tsx`
- `src/components/panels/sections/ElementVisibilitySection.tsx`
- `src/components/shared/ColorPicker.tsx` — если не готов из Phase 1

**Что реализуем:**

Панель рендерится когда `ui.selectedElementIds.length === 1`.

Семь секций (как в `DOCS_ARCHITECTURE.md`, раздел 8.2):

**Content:** text content (textarea), tag (h1–h6 / p / button / div), locked (checkbox)

**Typography:** fontFamily, fontSize, fontWeight, color (ColorPicker), textAlign (icon group), lineHeight, letterSpacing

**Spacing:** margin (4 поля) + padding (4 поля) — компонент `BoxModelEditor`

**Background:** backgroundColor (ColorPicker), backgroundImage (URL input)

**Border:** borderWidth, borderStyle, borderColor (ColorPicker), borderRadius (4 углла)

**Effects:** boxShadow (preset + custom), opacity (0–1), overflow, cursor

**Visibility:** show (always / hidden / conditional). При conditional — простой condition builder:
`field` (text) + `operator` (eq/neq/gt/lt) + `value` (text) — только один rule, вложенность Phase 4.

Все изменения → `ELEMENT_UPDATE` (undoable).

**Критерий готовности:**

- Кликаем на элемент в `ScreenNode` (заглушка клика) → правая панель переключается на ElementProperties
- Меняем fontSize → значение визуально отражается (через стейт, preview Phase 4)
- Undo (Ctrl+Z) откатывает изменение стиля

---

### Шаг 4 — Drag & Drop: BlockLibrary → Canvas

**Файлы:**

- `src/components/map-mode/MapCanvas.tsx` — добавляем `DndContext` + `useDroppable`
- `src/components/map-mode/CanvasDropZone.tsx` — drop-зона поверх канваса
- `src/hooks/useDragAndDrop.ts` — логика onDragEnd

**Что реализуем:**

Два сценария:

**Сценарий A — блок на карту (создаёт экран):**
1. Пользователь начинает drag карточки из BlockLibrary (тип `block`)
2. Поверх `MapCanvas` появляется `CanvasDropZone` с подсветкой
3. `onDragEnd`: если `over.id === 'canvas'` → `addScreen({ type: componentId, position: canvasCoord })`
4. Если компонент из `block-library/templates/` → добавляется как шаблонный экран
5. Позиция экрана = координаты drop в системе координат React Flow (через `useReactFlow().screenToFlowPosition`)

**Сценарий B — шаблонный экран на карту:**
1. Drag из секции «Screens» (templates) в BlockLibrary
2. То же, но `addScreen` получает базовый HTML шаблона (сохраняется в `screen.sourceHtml` для Phase 3 парсинга)

**Ghost-элемент при drag:** стандартный dnd-kit overlay (`DragOverlay`) — карточка компонента уменьшенная.

**Критерий готовности:**

- Перетаскиваем блок из библиотеки на карту → создаётся новая нода
- Новая нода видна на карте, имеет правильный тип
- Undo отменяет создание экрана

---

### Шаг 5 — Реордер элементов внутри экрана

**Файлы:**

- `src/components/map-mode/ScreenNode.tsx` — список элементов с `SortableContext`
- `src/components/map-mode/SortableElementRow.tsx` — одна строка элемента (drag handle)
- `src/store/slices/funnel-slice.ts` — action `reorderElements`

**Что реализуем:**

- Внутри `ScreenNode` (при клике "expand" или в отдельном режиме) показывается список элементов экрана
- Каждая строка — `useSortable` из `@dnd-kit/sortable`
- `onDragEnd` вычисляет новый порядок (arrayMove) → `reorderElements({ screenId, elementId, newOrder })`
- `reorderElements` обновляет `element.order` для всех затронутых элементов и пересчитывает `elementIndexes`
- Операция undoable

**В Phase 2 drag между экранами — только в пределах одного экрана.** Drag между экранами — Phase 3+.

**Критерий готовности:**

- Открываем список элементов экрана (расширенный вид ноды)
- Тянем строку вверх/вниз → порядок меняется
- Undo (Ctrl+Z) возвращает предыдущий порядок

---

### Шаг 6 — Контекстное меню

**Файлы:**

- `src/components/shared/ContextMenu.tsx` — позиционируемый popover
- `src/hooks/useContextMenu.ts` — уже создан в Phase 1, наполняем логикой

**Контекстное меню на ноде (экране):**

```
Duplicate         Ctrl+D
Rename            F2
─────────────────────
Copy              Ctrl+C
Cut               Ctrl+X
Paste             Ctrl+V
─────────────────────
Add Connection →  (sub-menu: список других экранов)
─────────────────────
Delete            Del
```

**Контекстное меню на связи (edge):**

```
Set as Default
Add Condition...
─────────────────
Delete            Del
```

**Контекстное меню на пустом холсте:**

```
Paste             Ctrl+V
Add Screen →      (sub-menu: типы экранов)
─────────────────
Fit View          Ctrl+Shift+1
```

**Закрытие:** клик вне меню, Escape, любой пункт меню.

**Критерий готовности:**

- ПКМ на ноде → меню появляется у курсора
- «Duplicate» → экран дублируется, новый slug = `{original}-copy`
- ПКМ на пустом холсте → «Add Screen» → экран добавляется
- Escape закрывает меню

---

### Шаг 7 — Горячие клавиши Phase 2

**Файлы:**

- `src/hooks/useKeyboardShortcuts.ts` — расширяем из Phase 1

**Новые клавиши (добавляем к уже реализованным в Phase 1):**

| Клавиша | Действие | Где работает |
|---------|----------|-------------|
| `F2` | Переименовать выбранный экран (фокус на Name input в правой панели) | Map Mode |
| `Ctrl+D` | Дублировать выбранный экран | Map Mode |
| `Ctrl+C` | Копировать выбранный экран / элемент | Везде |
| `Ctrl+X` | Вырезать выбранный экран / элемент | Везде |
| `Ctrl+V` | Вставить из clipboard | Везде |
| `Ctrl+A` | Выбрать все экраны на карте | Map Mode |
| `Escape` | Снять выделение / закрыть контекстное меню | Везде |
| `Alt+Drag` | Selection Box (групповое выделение) | Map Mode (уже в React Flow) |

**Правила перехвата:**

- В `<input>` / `<textarea>` / `contenteditable` шорткаты НЕ перехватываются
  (исключение: `Ctrl+S`, `Ctrl+K` — они явно разрешены везде)
- Реализовано через проверку `event.target instanceof HTMLInputElement`

**Критерий готовности:**

- `F2` на выбранном экране → фокус прыгает в поле Name в правой панели
- `Ctrl+D` → экран дублируется
- `Ctrl+C` + `Ctrl+V` → экран вставляется рядом с оригиналом
- `Ctrl+A` → все экраны выделяются (multiple selection)

---

## Критерии готовности всей Фазы 2

1. `pnpm dev` запускается без ошибок
2. `pnpm tsc --noEmit` проходит без ошибок
3. `pnpm test` — все тесты Phase 1 и 2 зелёные
4. BlockLibrary отображает категории с поиском
5. Клик на экран → ScreenProperties в правой панели
6. Изменение имени экрана через ScreenProperties отражается на ноде
7. Drag блока из библиотеки на карту → создаётся экран
8. Реордер элементов внутри экрана через drag & drop работает
9. Контекстное меню (ПКМ) работает на нодах и холсте
10. `F2`, `Ctrl+D`, `Ctrl+C/X/V` работают в Map Mode
11. Все операции Undo/Redo работают корректно

---

## Файлы по шагам

| Шаг | Новые файлы | Изменяемые файлы |
|-----|------------|-----------------|
| 1 | `BlockLibrary.tsx`, `BlockLibraryItem.tsx`, `component-registry.ts`, `component-manifest.json` | `LeftPanel.tsx` |
| 2 | `ScreenProperties.tsx`, `sections/ScreenGeneralSection.tsx`, `sections/ScreenNavigationSection.tsx`, `sections/ScreenAppearanceSection.tsx`, `sections/ScreenSocialSection.tsx` | `RightPanel.tsx`, `funnel-slice.ts` |
| 3 | `ElementProperties.tsx`, `sections/Element*.tsx`, `shared/ColorPicker.tsx` | `RightPanel.tsx` |
| 4 | `CanvasDropZone.tsx`, `useDragAndDrop.ts` | `MapCanvas.tsx`, `funnel-slice.ts` |
| 5 | `SortableElementRow.tsx` | `ScreenNode.tsx`, `funnel-slice.ts` |
| 6 | `ContextMenu.tsx` | `useContextMenu.ts`, `MapCanvas.tsx`, `ScreenNode.tsx` |
| 7 | — | `useKeyboardShortcuts.ts` |

---

## Зависимости между шагами

```
Шаг 1 (BlockLibrary)       →  Шаг 4 (DnD на Canvas)
Шаг 2 (ScreenProperties)   →  независим от 3, 4, 5
Шаг 3 (ElementProperties)  →  требует Шаг 2 (общий RightPanel context)
Шаг 4 (DnD Canvas)         →  требует Шаг 1 (drag source)
Шаг 5 (Element Reorder)    →  независим от 1–4
Шаг 6 (Context Menu)       →  требует Шаг 2 (Rename открывает панель)
Шаг 7 (Shortcuts)          →  расширяет Phase 1, добавляет к шагам 2 и 6
```

**Рекомендуемый порядок:** 1 → 2 → 4 → 5 → 3 → 6 → 7

---

## Правило коммитов

Один завершённый шаг = один коммит.

Формат:

- `feat(phase2): step-1 block-library with categories and search`
- `feat(phase2): step-2 screen-properties right panel`
- `feat(phase2): step-3 element-properties right panel`
- `feat(phase2): step-4 dnd block-library to canvas`
- `feat(phase2): step-5 element reorder within screen`
- `feat(phase2): step-6 context menu`
- `feat(phase2): step-7 keyboard shortcuts phase2`

---

## Документирование

Рабочий набор документов Фазы 2:

- `DOCS_ARCHITECTURE.md` → полная архитектура (раздел 16, Phase 2)
- `PHASE_2_PANELS_DND.md` → этот файл — зафиксированный план
- `PROGRESSION.md` → текущее состояние шагов + карта событий

Правило сессий:

- в начале сессии читаем `PROGRESSION.md`
- в конце шага обновляем `PROGRESSION.md`
- после подтверждения шага делаем коммит
