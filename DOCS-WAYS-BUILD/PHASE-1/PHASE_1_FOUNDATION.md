# Фаза 1 — Фундамент

## Что мы строим

Рабочий скелет приложения: `AppShell` + карта с нодами + persistence.

Результат Фазы 1:

- приложение открывается в браузере
- карта отображает экраны как ноды
- экраны можно перетаскивать
- связи между экранами видны на карте
- после перезагрузки страницы данные сохраняются

## Шаги Фазы 1

### Шаг 1 — Инициализация проекта

Что делаем:

- `pnpm create vite` -> React + TypeScript (`strict`)
- базовые зависимости: `zustand`, `immer`, `@xyflow/react`, `dexie`, `nanoid`
- `eslint` + `prettier`
- алиас `@/` -> `src/` в `vite.config.ts`

Критерий готовности:

- `pnpm dev` запускается без ошибок
- приложение открывается в браузере

### Шаг 2 — TypeScript типы

Файлы:

- `src/types/funnel.ts` -> `Funnel`, `Screen`, `FunnelElement`, `Connection`
- `src/types/ui.ts` -> `UIState`, `Mode`
- `src/types/store.ts` -> `AppState`

Критерий готовности:

- `TypeScript` компилируется без `any`-хаков
- типы используются во всех store-файлах

### Шаг 3 — Zustand stores

Файлы:

- `src/store/funnel-store.ts` -> проект, воронка, экраны, элементы
- `src/store/ui-store.ts` -> режим, выделение, размеры панелей
- `src/store/history-store.ts` -> undo/redo через `produceWithPatches`

Минимальные actions:

- `addScreen`
- `removeScreen`
- `updateScreen`
- `addConnection`

Критерий готовности:

- из браузерной консоли через `window.__store` можно вызвать `addScreen()`
- изменение видно в state

### Шаг 4 — IndexedDB persistence

Файлы:

- `src/store/middleware/persist.ts` -> схема `Dexie`, `saveProject()`, `loadProject()`
- `src/hooks/useAutoSave.ts` -> debounce 1s

Ограничения:

- `localStorage` используем только для UI prefs
- состояние проекта пишем в `IndexedDB`

Критерий готовности:

- добавляем экран
- перезагружаем страницу
- экран остаётся на месте

### Шаг 5 — AppShell layout

Файлы:

- `src/components/layout/AppShell.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/LeftPanel.tsx`
- `src/components/layout/RightPanel.tsx`
- `src/components/layout/PanelResizer.tsx`

Что должно быть:

- `CSS Grid`: `Header / LeftPanel / Canvas / RightPanel`
- переключатель режимов: `Map / Manager / Developer`
- кнопки `Undo / Redo`
- resize боковых панелей

Критерий готовности:

- layout виден в браузере
- панели ресайзятся
- переключение режимов меняет `UIState.mode`

### Шаг 6 — MapCanvas + React Flow

Файлы:

- `src/components/map-mode/MapCanvas.tsx`
- `src/components/map-mode/ScreenNode.tsx`
- `src/components/map-mode/ScreenEdge.tsx`
- `src/components/map-mode/CanvasControls.tsx`

Что должно быть:

- `ReactFlow Provider`
- `pan / zoom`
- `snap-to-grid` (`16px`)
- `minimap`
- удаление по `Del`
- `Ctrl+Shift+1` -> `fitView`

Критерий готовности:

- карта открывается
- работает `pan / zoom`
- ноды отображаются и перетаскиваются
- связи создаются drag от handle
- minimap кликабельна
- `Del` удаляет выделенный экран или связь

### Шаг 7 — Undo/Redo + горячие клавиши

Файлы (ключевые):

- `src/hooks/useKeyboardShortcuts.ts` — глобальный реестр шорткатов
- `src/store/slices/history-slice.ts` — undo/redo, сохранение, буфер обмена
- `src/store/slices/funnel-slice.ts` — undoable-мутации проекта (в т.ч. экраны и связи)
- `src/App.tsx` — подключение хука шорткатов

**Полный перечень клавиш, карта зависимостей store и ссылки на документы** — в `PROGRESS.md`, раздел «✅ Шаг 7 — Undo/Redo + горячие клавиши (и расширения)» и блок «Файлы По Шагам» для шага 7. Доменная модель и связи экранов — в `DOCS_ARCHITECTURE.md`.

Минимально по плану:

- `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`, `Ctrl+S`

Критерий готовности:

- добавляем экран
- `Ctrl+Z` удаляет последнее действие
- `Ctrl+Shift+Z` возвращает его

## Критерии готовности всей Фазы 1

1. `pnpm dev` запускается без ошибок
2. `pnpm tsc --noEmit` проходит без ошибок
3. Карта с нодами и связями отображается
4. `Pan / Zoom` работает к позиции курсора
5. Экран перетаскивается и привязывается к сетке
6. Экран можно добавить и удалить через UI
7. Undo/Redo работает с клавиатуры
8. Данные сохраняются после перезагрузки
9. Панели ресайзятся
10. Переключение режимов меняет UI

## Правило коммитов

Один завершённый шаг = один коммит.

Формат:

- `feat(phase1): step-1 validate scaffold and tooling`
- `feat(phase1): step-2 define core types`
- `feat(phase1): step-3 wire funnel ui and history stores`

## Документирование без лишних токенов

Рабочий набор документов:

- `DOCS_ARCHITECTURE.md` -> полная архитектура
- `PHASE_1_FOUNDATION.md` -> зафиксированный план первой фазы
- `PROGRESS.md` -> текущее состояние шагов

Правило сессий:

- в начале сессии читаем `PROGRESS.md`
- в конце шага обновляем `PROGRESS.md`
- после подтверждения шага делаем коммит
