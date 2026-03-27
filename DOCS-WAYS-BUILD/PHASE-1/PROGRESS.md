# Phase 1 Progress

## Текущий режим работы

Идём по Фазе 1 пошагово.

Правило:

- один шаг = одна проверка
- после принятия шага обновляем этот файл
- после подтверждения шага делаем отдельный коммит

## Текущее состояние

### 🔄 Подготовка

- Зафиксирован план в `PHASE_1_FOUNDATION.md`
- Перед стартом реализации нужен короткий аудит текущего состояния проекта относительно шагов 1-7

### ✅ Шаг 1 — Инициализация проекта

- Корень проекта переведён на `pnpm`
- Установлен `pnpm` и сгенерирован корневой `pnpm-lock.yaml`
- Удалён старый `package-lock.json`
- В `package.json` зафиксирован `packageManager`
- Добавлен базовый `prettier`
- `eslint` настроен для `docs/serve.mjs`
- Проверено:
  - `pnpm type-check`
  - `pnpm lint`
  - `pnpm format:check`
  - `pnpm dev -- --port 4174`

### ✅ Шаг 2 — TypeScript типы

- Проведён аудит `src/types/funnel.ts`, `src/types/ui.ts`, `src/types/store.ts`
- Минимальный контракт Фазы 1 уже покрыт существующими типами
- Типы подключены в store-слое и проходят `pnpm type-check`
- `src/types/funnel.ts` содержит `Funnel`, `Screen`, `FunnelElement`, `Connection`
- `src/types/ui.ts` содержит `UIState`, `Mode`
- `src/types/store.ts` содержит `AppState` и store actions
- Дополнительные типы оставлены без удаления, так как они уже используются кодом и не мешают Фазе 1

### ✅ Шаг 3 — Zustand stores

- Store уже собран как единый Zustand store на slices: `funnel`, `ui`, `history`
- Минимальные actions для Фазы 1 присутствуют: `addScreen`, `deleteScreen`, `updateScreen`, `addConnection`
- В dev-режиме добавлен прямой доступ к store через `window.__store` из `src/main.tsx`
- Проверено:
  - `pnpm type-check`
  - `pnpm lint`
  - `pnpm format:check`
- Базовый store соответствует целям Фазы 1 без лишнего рефакторинга
- Нейминг удаления пока остаётся `deleteScreen`, так как он уже используется кодом
- Для консольной отладки в dev-режиме доступен `window.__store: FunnelStore`

### 🔄 Шаг 4 — В работе

- Проект переведён с `localStorage` на `IndexedDB` через `Dexie`
- `localStorage` оставлен только для UI prefs и `last opened project`
- `saveProject/loadProject` подключены к реальному persistence-слою
- `useAutoSave()` подключён в `App`
- При старте приложения загружается последний открытый проект
- При изменениях funnel-state обновляется `project.updatedAt`, чтобы autosave реально срабатывал
- Добавлены тесты:
  - `src/store/middleware/persist.test.ts`
  - `src/store/funnel-store.persistence.test.ts`
- Проверено:
  - `pnpm test src/store/middleware/persist.test.ts src/store/funnel-store.persistence.test.ts`
  - `pnpm type-check`
  - `pnpm lint`
  - `pnpm format:check`
  - браузерный сценарий: добавить экран -> дождаться autosave -> reload -> `Screens: 2`

### ✅ Шаг 4 — IndexedDB persistence

- `Dexie`-схема добавлена в `src/store/middleware/persist.ts`
- `storage-service.ts` теперь сохраняет `ProjectDocument` в `IndexedDB`
- UI prefs сохраняются отдельно в `localStorage`
- Загрузка последнего проекта и autosave работают в реальном приложении

### 🔄 Шаг 5 — В работе

- `AppShell` переведён на grid-layout для схемы `Header / LeftPanel / Canvas / RightPanel`
- `PanelResizer` и `useResizablePanel` подключены прямо в shell
- Resize боковых панелей работает
- Переключение режимов через header работает
- Collapse/show боковых панелей работает
- Добавлен тест `src/components/layout/AppShell.test.tsx`
- Проверено:
  - `pnpm test src/components/layout/AppShell.test.tsx`
  - `pnpm type-check`
  - `pnpm lint`
  - `pnpm format:check`
  - браузер: `Map -> Manager -> Developer -> Map`
  - браузер: hide/show left panel

### ✅ Шаг 5 — AppShell layout

- Layout соответствует целям Фазы 1
- Header, left panel, canvas и right panel связаны через рабочий shell
- Панели ресайзятся и корректно сворачиваются

### 🔄 Шаг 6 — В работе

- `MapCanvas` синхронизирован со store по нодам и связям
- Добавлены `CanvasControls.tsx` и `ScreenEdge.tsx` по структуре документации
- `snapGrid` приведён к `16px`
- Добавлен shortcut `Ctrl+Shift+1` -> `fitView`
- Добавлена обработка удаления выбранных screen/edge по `Delete`
- Добавлен тест `src/components/map-mode/MapCanvas.test.tsx`
- Проверено:
  - `pnpm test src/components/map-mode/MapCanvas.test.tsx`
  - `pnpm type-check`
  - `pnpm lint`
  - `pnpm format:check`
  - браузер: minimap виден
  - браузер: controls `Zoom In / Zoom Out / Fit View` доступны
  - браузер: `Fit View` выводит видимые ноды на экран

### ✅ Шаг 6 — MapCanvas

- Карта открывается и отображает ноды
- Ноды синхронизируются со store после изменений
- Minimap и controls работают в shell
- Основная структура шага 6 приведена к документации без лишних слоёв

### ✅ Шаг 7 — Undo/Redo + горячие клавиши (и расширения)

Критерий шага 7 из `PHASE_1_FOUNDATION.md` закрыт: история (undo/redo), глобальные шорткаты, сохранение. Ниже — **полная справка** по шагу 7: все клавиши, документы и архитектура.

---

#### Документы (роль каждого файла)

| Документ | Назначение |
|----------|------------|
| `PHASE_1_FOUNDATION.md` | План Фазы 1: критерии шагов 1–7; шаг 7 — undo/redo и keyboard shortcuts. |
| `PROGRESS.md` (этот файл) | Журнал выполнения и **операционная справка** по реализованному поведению. |
| `DOCS_ARCHITECTURE.md` | Доменная архитектура: `ProjectDocument`, `Funnel`, `Screen`, `Connection`, описание history-патчей (Immer), связи экранов, раздел про карту (React Flow). Шорткаты там описаны на уровне концепции, не как список клавиш. |

---

#### Все горячие клавиши (глобальный реестр)

Источник правды в коде: массив `SHORTCUTS` в `src/hooks/useKeyboardShortcuts.ts`. Обработчик вешается на `window` в **фазе capture** (`addEventListener('keydown', …, true)`), чтобы срабатывать до React Flow и вложенных обработчиков.

| Комбинация | Действие | Store / эффект |
|------------|----------|----------------|
| `Ctrl+Z` | Отменить | `history-slice` → `undo()` (Immer `applyPatches` по `inversePatches`) |
| `Ctrl+Shift+Z` | Повторить | `redo()` |
| `Ctrl+Y` | Повторить (дубликат в реестре `redo-y`) | `redo()` |
| `Ctrl+S` | Сохранить проект | `saveProject()` → IndexedDB через `storage-service` |
| `Ctrl+C` | Копировать выбранный экран | `copy()` → `ui.clipboard` (тип `screen` + элементы экрана) |
| `Ctrl+X` | Вырезать экран | `cut()` → clipboard + `deleteScreen` |
| `Ctrl+V` | Вставить | `paste()` → `duplicateScreen` или восстановление из clipboard после cut; при `linkMode` — вставка в цепочку после выделенного; после — выделение нового экрана |
| `Ctrl+D` | Дублировать выделенные экраны | `duplicate()` → цикл `duplicateScreen`; при `linkMode` — `insertIntoChain` / `addConnection`; после — выделение новых экранов |
| `Ctrl+A` | Выделить все экраны на карте | `selectAllScreens()` → `ui.selectedScreenIds` |
| `Ctrl+K` | Открыть/закрыть модалку шорткатов | локальный state хука + `ShortcutsModal` |
| `1` / `2` / `3` | Режимы Карта / Менеджер / Разработка | `setMode()` (без Ctrl/Alt) |
| `Escape` | Снять выделение | `clearSelection()` |

**Особые правила ввода:** в `INPUT` / `TEXTAREA` / `contentEditable` глобальные шорткаты **не перехватываются** (кроме помеченных `allowInEditable: true`). Сейчас так: **`Ctrl+S`**, **`Ctrl+K`**. Остальное отдаётся браузеру (копирование текста, выделение и т.д.).

**Раскладка и macOS:** сочетания с буквами матчатся по `event.code` (физическая клавиша) и по `event.key` (латинская буква); модификатор — `ctrlKey || metaKey` (`Cmd` на Mac).

---

#### Горячие клавиши только на карте (не в `SHORTCUTS`)

Реализованы отдельно, т.к. относятся к React Flow, а не к store напрямую:

| Комбинация | Действие | Файл |
|------------|----------|------|
| `Ctrl+Shift+1` | Fit view — масштаб и центр так, чтобы все ноды поместились в видимую область (`padding: 0.3`) | `CanvasControls.tsx` |
| `+` / `-` | Zoom in / out | `CanvasControls.tsx` |
| `Delete` / `Backspace` | Удалить выбранные экраны и выбранные рёбра | `MapCanvas.tsx` → `deleteScreens()` / `deleteConnection()` |

---

#### Архитектура: как это связано

1. **`useKeyboardShortcuts`** — единая точка глобальных шорткатов приложения: реестр `ShortcutDefinition`, фабрика `createKeyboardShortcutHandler` (удобно тестировать в Vitest без React), привязка к `useFunnelStore.getState()`.

2. **История проекта** — `funnel-slice`: мутации через `produceWithPatches` (Immer); каждая операция даёт одну запись в `history.past` с `patches` / `inversePatches`. **Пакетное удаление** экранов — `deleteScreens(ids)` одна транзакция (`SCREENS_BATCH_DELETE`), один шаг undo.

3. **Буфер и дублирование** — `history-slice`: `copy` / `cut` / `paste` / `duplicate`. **Автосвязи только при `ui.linkMode === true`:** `insertIntoChain` (вставка в цепочку: если у экрана один исходящий переход, он разрывается и новый экран встаёт между A и B) или `addLink` при дублировании нескольких экранов. После успешного `paste` / `duplicate` выделение `selectedScreenIds` переключается на созданный(е) экран(ы). Лимит шагов undo: `history.maxEntries`, `setMaxHistoryEntries`, локальный ключ `fb:maxHistoryEntries` в `localStorage`.

4. **Карта** — `MapCanvas`: ноды из `project.funnel.screens`, рёбра из `connections`; `selectedScreenIds` синхронизируется с `node.selected` React Flow для визуального выделения; `ConnectionMode.Loose` + расширенный target handle в `ScreenNode` для удобного соединения.

5. **UI шорткатов в интерфейсе** — `ShortcutsModal` строит список из `VISIBLE_SHORTCUTS` (из реестра скрыты дубликат `Ctrl+Y` в таблице и отдельная строка для `Ctrl+K`, т.к. модалка сама про шорткаты).

6. **Автосохранение** — `useAutoSave` в `App` не связано с `Ctrl+S` напрямую; `Ctrl+S` вызывает явный `saveProject`.

---

#### Проверки (шаг 7)

- `pnpm test` (в т.ч. `useKeyboardShortcuts.test.ts`)
- `pnpm type-check`, `pnpm lint`, `pnpm format:check`

---

### Post-Phase 1 — карта: копирование, история, визуал (актуальное поведение)

Зафиксировано в коде после закрытия шага 7; дублирует «источник правды» в `history-slice.ts`, `Header.tsx`, `ScreenNode.module.css`, `BlockNode.tsx`.

#### Fit View (`Ctrl+Shift+1`)

- Вызывает `fitView({ padding: 0.3 })` из React Flow: вписывает все ноды в текущий viewport (без обрезки сильного зума вручную — «показать всё на карте»).
- Реализация: `CanvasControls.tsx` (отдельный `keydown` на `window`, не в `SHORTCUTS`).

#### История Undo / Redo

- **Стек:** каждая мутация в `funnel-slice` через `undoableUpdate` добавляет запись в `history.past`; обрезка по `history.maxEntries` (`slice(-maxEntries)`).
- **Дефолт по умолчанию:** 50 шагов (если в `localStorage` нет значения); при загрузке читается `fb:maxHistoryEntries` (допустимый диапазон 10–500).
- **Настройка в UI:** в `Header` рядом с Undo/Redo — кнопка с иконкой часов; popup со слайдером **Undo steps** (10–200). Action: `setMaxHistoryEntries` — пишет в store и в `localStorage`, при уменьшении лимита старый хвост `past` обрезается.

#### Режим Link (`linkMode`, `MapToolbar`)

- **Автоматические связи** при дублировании и вставке создаются **только если** `ui.linkMode === true`. Если `linkMode` выключен — новый экран появляется без связей (как и ручное соединение ручками на карте — отдельно).

#### Дублирование и вставка (`duplicate`, `paste`)

- **`duplicate` (один экран):** `duplicateScreen` → при `linkMode` — `insertIntoChain(anchor, newSlug)` после исходного экрана (цепочка A → A' → B вместо A→B при одном исходящем ребре).
- **`duplicate` (несколько экранов):** для каждого выделенного — новый экран; при `linkMode` — цепочка `addLink` между предыдущим новым slug и следующим дубликатом.
- **`paste`:** если в буфере тот же экран, что в проекте — дубликат; якорь вставки: после **последнего** в `selectedScreenIds` (или `sourceId`, если ничего не выделено). При `linkMode` — `insertIntoChain` от якоря. Если в буфере «чужой» экран (после cut) — `addScreen` + элементы; при `linkMode` и выделенном якоре — вставка в цепочку после якоря.
- **Выделение после операции:** `selectedScreenIds` заменяется на id нового экрана (или список новых при множественном дублировании), чтобы фокус и тулбар были на созданном узле.

#### Ноды экрана и блоки на карте

- **Screen node (`ScreenNode.module.css`):** увеличены читаемость заголовка, бейджа типа (например SURVEY) и номера порядка — чтобы при отдалении карты подписи оставались заметнее.
- **Block node (`BlockNode.tsx`):** при выделении доступен **`NodeResizer`** (`@xyflow/react`) — изменение ширины/высоты блока; по `onResizeEnd` вызывается `updateBlock` с округлёнными размерами. Заголовок блока в шапке увеличен для читаемости.

## Файлы По Шагам

### Шаг 1 — Инициализация проекта

- `package.json`
  - Зафиксирован `packageManager`, добавлены `format` / `format:check`, позже подключены нужные dev-зависимости.
  - Связан с `pnpm-lock.yaml`, `eslint.config.js`, `.prettierrc.json`.
- `pnpm-lock.yaml`
  - Корневой lock-файл после перехода на `pnpm`.
  - Связан с `package.json` и всей воспроизводимой установкой зависимостей.
- `eslint.config.js`
  - Настроен lint для `src` и `docs/serve.mjs`.
  - Связан с `pnpm lint`.
- `.prettierrc.json`
  - Базовая конфигурация форматирования.
  - Связана с `package.json` (`format`, `format:check`).
- `.prettierignore`
  - Ограничивает форматирование служебных и тяжёлых файлов.
  - Связан с `prettier --check .`.
- `docs/serve.mjs`
  - Подправлен под текущий `eslint`.
  - Нужен для локального просмотра документации.
- `PHASE_1_FOUNDATION.md`
  - Зафиксирован рабочий план первой фазы.
  - Связан с `PROGRESS.md` как источник шагов.
- `PROGRESS.md`
  - Основной краткий журнал выполнения шагов.
  - Связан со всеми последующими шагами.
- `package-lock.json`
  - Удалён как артефакт старого `npm`-состояния.

### Шаг 2 — TypeScript типы

- `src/types/funnel.ts`
  - Основные доменные типы: `Funnel`, `Screen`, `FunnelElement`, `Connection`.
  - Связан с store, canvas, layout и persistence.
- `src/types/ui.ts`
  - Типы UI-состояния: `UIState`, `Mode`, history, clipboard.
  - Связан с `ui-slice.ts`, header, shell, shortcuts.
- `src/types/store.ts`
  - Корневой контракт store и actions.
  - Связан с `funnel-store.ts` и всеми slices.
- На шаге 2 структура уже была реализована, поэтому новых файлов не создавалось.

### Шаг 3 — Zustand stores

- `src/main.tsx`
  - Добавлен dev-доступ к `window.__store`.
  - Связан с `funnel-store.ts` и ручной отладкой в браузере.
- `src/vite-env.d.ts`
  - Добавлен тип `window.__store?: FunnelStore`.
  - Связан с `main.tsx` и dev-отладкой.
- `src/store/funnel-store.ts`
  - Уже был основным объединяющим store.
  - Связан с `funnel-slice.ts`, `ui-slice.ts`, `history-slice.ts`.
- `src/store/slices/funnel-slice.ts`
  - Основные действия данных воронки.
  - Связан с canvas, header и persistence.
- `src/store/slices/ui-slice.ts`
  - Состояние интерфейса.
  - Связан с shell, header, map controls.
- `src/store/slices/history-slice.ts`
  - Undo/redo и project actions.
  - Связан с persistence и shortcuts.

### Шаг 4 — IndexedDB persistence

- `src/store/middleware/persist.ts`
  - Добавлена реальная `Dexie`-схема, UI prefs, last opened project.
  - Связан с `storage-service.ts`, `App.tsx`, `ui-slice.ts`.
- `src/services/storage-service.ts`
  - Переведён с `localStorage` на `IndexedDB`.
  - Связан с `history-slice.ts`.
- `src/store/slices/history-slice.ts`
  - `saveProject/loadProject` подключены к persistence-слою.
  - Связан с `useAutoSave.ts`, `Header.tsx`, shortcuts.
- `src/store/slices/ui-slice.ts`
  - Сохраняет UI prefs в `localStorage`.
  - Связан с `AppShell.tsx`, `useResizablePanel.ts`.
- `src/store/slices/funnel-slice.ts`
  - Обновляет `project.updatedAt` при изменениях.
  - Связан с autosave.
- `src/App.tsx`
  - Подключены `useAutoSave()` и загрузка последнего проекта.
  - Связан с `persist.ts` и `history-slice.ts`.
- `src/store/middleware/persist.test.ts`
  - Проверяет UI prefs и `last opened project`.
  - Связан с `persist.ts`.
- `src/store/funnel-store.persistence.test.ts`
  - Проверяет сохранение/загрузку проекта и обновление timestamp.
  - Связан с `funnel-store.ts`, `history-slice.ts`, `persist.ts`.
- `package.json`
  - Добавлен `fake-indexeddb` для тестовой среды.

### Шаг 5 — AppShell layout

- `src/components/layout/AppShell.tsx`
  - Подключены `PanelResizer` и `useResizablePanel`.
  - Связан с `Header.tsx`, `LeftPanel.tsx`, `RightPanel.tsx`.
- `src/components/layout/AppShell.module.css`
  - Layout переведён на grid-схему shell.
  - Связан с `AppShell.tsx`.
- `src/components/layout/AppShell.test.tsx`
  - Проверяет наличие ресайзеров, resize и переключение режимов.
  - Связан с `AppShell.tsx`.

### Шаг 6 — MapCanvas

- `src/components/map-mode/MapCanvas.tsx`
  - Синхронизирован со store, добавлены edge handling, `16px` grid, `Ctrl+Shift+1`.
  - Связан с `CanvasControls.tsx`, `ScreenEdge.tsx`, `funnel-slice.ts`.
- `src/components/map-mode/CanvasControls.tsx`
  - Выделен отдельный слой controls и fit-view shortcuts.
  - Связан с `MapCanvas.tsx`.
- `src/components/map-mode/ScreenEdge.tsx`
  - Выделен отдельный edge-компонент по структуре документации.
  - Связан с `MapCanvas.tsx`.
- `src/components/map-mode/index.ts`
  - Обновлены публичные экспорты `map-mode`.
  - Связан с импортами map-компонентов.
- `src/components/map-mode/MapCanvas.test.tsx`
  - Проверяет sync нод, delete и minimap/handles.
  - Связан с `MapCanvas.tsx`.

### Шаг 7 — Горячие клавиши, карта, store (сводка файлов)

Детальная таблица клавиш и поток данных — в разделе **«✅ Шаг 7 — … (и расширения)»** выше.

- `src/hooks/useKeyboardShortcuts.ts` — реестр `SHORTCUTS`, capture phase, `createKeyboardShortcutHandler`.
- `src/hooks/useKeyboardShortcuts.test.ts` — юнит-тесты шорткатов.
- `src/App.tsx` — хук шорткатов, `ShortcutsModal`, autosave, загрузка проекта.
- `src/components/shared/Modal.tsx`, `ShortcutsModal.tsx`, стили — модалка справки (`Ctrl+K`).
- `src/components/shared/index.ts` — экспорт `ShortcutsModal`.
- `src/components/layout/Header.tsx` — Save → `saveProject`; Undo/Redo; popup **Undo steps** (`setMaxHistoryEntries`, слайдер).
- `src/components/map-mode/MapCanvas.tsx` — React Flow, выделение, `deleteScreens`, `ConnectionMode.Loose`, toolbar.
- `src/components/map-mode/CanvasControls.tsx` — zoom/fit и отдельные клавиши карты.
- `src/components/map-mode/MapToolbar.tsx` — `linkMode`.
- `src/components/map-mode/ScreenNode.tsx` — нода, handles, подсветка выделения; Duplicate вызывает `selectScreen` + `duplicate()` (цепочка и фокус как у Ctrl+D).
- `src/components/map-mode/ScreenNode.module.css` — типографика ноды (крупнее label, badge, order).
- `src/components/map-mode/BlockNode.tsx` + `BlockNode.module.css` — группа экранов, `NodeResizer`, крупный заголовок.
- `src/components/map-mode/ScreenEdge.tsx`, `MapCanvas.module.css`, `index.ts`.
- `src/types/ui.ts`, `src/types/store.ts` — состояние UI и контракт actions; `HistoryActions` включает `setMaxHistoryEntries`.
- `src/store/funnel-store.ts` — сборка slices.
- `src/store/slices/funnel-slice.ts` — undo/redo-патчи, `duplicateScreen`, `deleteScreens`, connections.
- `src/store/slices/ui-slice.ts` — выделение, `linkMode`.
- `src/store/slices/history-slice.ts` — undo/redo API, clipboard, save/load, `insertIntoChain` / `addLink` при `linkMode`, `setMaxHistoryEntries`, локальный ключ лимита истории.
- `src/services/storage-service.ts`, `src/store/middleware/persist.ts` — persistence.

См. также `DOCS_ARCHITECTURE.md` (домен и связи); перечень клавиш — только здесь и в `SHORTCUTS` в коде.

## План шагов

### Шаг 1 — Инициализация проекта

- Проверить текущий scaffold, зависимости, `eslint`, `vite`, алиасы
- Довести до минимального критерия готовности, если есть пробелы

### Шаг 2 — TypeScript типы

- Проверить `src/types/funnel.ts`
- Проверить `src/types/ui.ts`
- Проверить `src/types/store.ts`

### Шаг 3 — Zustand stores

- Проверить структуру store
- Сверить actions с планом Фазы 1

### Шаг 4 — IndexedDB persistence

- Проверить `Dexie` схему
- Проверить `useAutoSave`

### Шаг 5 — AppShell layout

- Проверить layout и resize панелей

### Шаг 6 — MapCanvas + React Flow

- Проверить карту, ноды, связи, minimap, fit view

### Шаг 7 — Undo/Redo + горячие клавиши

- Проверить history и keyboard shortcuts

## Следующее действие

Фаза 1 закрыта. Шаг 7+ (расширенные горячие клавиши, Link Mode, MapToolbar) реализован. Дополнительно зафиксированы: лимит undo с настройкой в header, цепочки при дублировании только в `linkMode`, фокус на новом экране после duplicate/paste, крупная типографика нод и resize блоков — см. раздел **«Post-Phase 1 — карта»** выше. Переход к Phase 2.
