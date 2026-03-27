# FunnelBuilder — Архитектурная документация

> Билдер воронок, объединяющий подходы FunnelFox + Heyflow с навигацией Miro.

**См. также:** [DOCS_BACKEND_TEAM.md](./DOCS_BACKEND_TEAM.md) — карта репозитория, зависимости, Docker/Podman, контракт API и пометки для бэкенд-команды.

---

## Навигация по документу

1. [Исследование платформ](#1-исследование-платформ-funnelfox--heyflow--miro)
2. [Три режима работы](#2-три-режима-работы)
3. [Система компонентов и ID](#3-система-компонентов-и-id)
4. [Парсинг HTML и стили](#4-парсинг-html--стилей)
5. [Горячие клавиши](#5-горячие-клавиши)
6. [Архитектура состояния](#6-архитектура-состояния)
7. [Карта экранов (Canvas)](#7-карта-экранов-canvas)
8. [Боковые панели](#8-боковые-панели)
9. [Система тегов и папок](#9-система-тегов-и-папок)
10. [Добавление новых компонентов](#10-добавление-новых-компонентов-через-html-файлы)
11. [Критические точки фронтенда](#11-критические-точки-фронтенда)
12. [Принятые решения](#12-принятые-решения)
13. [Контейнеризация: Podman / Docker Compose](#13-контейнеризация-podman--docker-compose)
14. [Ресурсы и библиотеки](#14-ресурсы-и-библиотеки)
15. [Файловая структура проекта](#15-файловая-структура-проекта-vite--react--typescript)
16. [Рекомендуемый порядок разработки](#16-рекомендуемый-порядок-разработки)

---

## 1. Исследование платформ: FunnelFox + Heyflow + Miro

### 1.1 FunnelFox — что берём

| Фича | Как работает | Что берём в наш билдер |
|-------|-------------|----------------------|
| **Fox API** | Глобальный объект `fox` доступен в Raw HTML. `fox.inputs.get/set()` — персистентное key-value хранилище между экранами. `fox.navigation.goToId()` — навигация. | Реализовать аналогичный API `funnel.*` для кастомного JS |
| **Canvas** | Визуальная карта связей экранов (добавлена Nov 2025) | Наш основной режим — "Режим карты" |
| **Экраны** | Каждый экран имеет: уникальный ID (для URL), auto-navigation, progress bar, back button, social preview, title | Идентичная система настроек экрана |
| **Элементы** | ID элемента, видимость (всегда/скрыт/условно), styling, backgrounds, borders, padding | Парсить из HTML и отображать в панели |
| **Условная видимость** | По input-values, geo-IP, device OS, browser, URL params с AND/OR логикой | Реализовать через data-атрибуты |
| **Темы** | Глобальные стили, применяемые ко всем воронкам | CSS-переменные как в IQ-US |
| **Горячие клавиши** | Ctrl+S сохранить, Ctrl+Z undo, Ctrl+D дубликат, Del удалить, A добавить секцию, T шаблоны, E расширения | Полный набор клавиш |
| **Grid snap** | Гибкая привязка экранов к сетке-карте, чтобы экраны визуально-умно распологались на одном уровне, разветвления-что создаёт выбор на экрана, на другом уровне - визульная ясность |

### 1.2 Heyflow — что берём

| Фича | Как работает | Что берём |
|-------|-------------|----------|
| **40+ блоков** | Drag-and-drop нативные блоки | Библиотека готовых блоков-шаблонов |
| **A/B тесты** | Встроенное A/B тестирование | Поддержка на уровне data-атрибутов |
| **Custom HTML** | Блок для произвольного HTML, ограничения: нет `<head>`, `<html>`, `<body>` | Raw HTML блок с валидацией |
| **Custom CSS/JS** | Отдельные поля для CSS и JS | Редактор кода (как в Cursor) в режиме разработчика |
| **Head Code** | Вставка скриптов в `<head>` (tracking, meta) | Глобальные настройки воронки |

### 1.3 Miro — что берём для навигации

| Фича | Реализация |
|-------|-----------|
| **Pan** | Средняя кнопка мыши / Space + drag / Два пальца на тачпаде |
| **Zoom** | Ctrl + колёсико - приближение карты колёсиком мыши строго к месту курсора / Pinch на тачпаде / Кнопки +/- |
| **Fit to screen** | Ctrl+Shift+1 — показать все экраны |
| **Zoom to selection** | Ctrl+Shift+0 — зум на выбранный экран |
| **Minimap** | Мини-карта в углу для быстрой навигации | (на мини карту можно кликать и быстро перемещаться таким образом на глобальной карте)
| **Grid snap** | Привязка к сетке при перемещении экранов |
| **Selection box** | Рамка выделения (Shift+drag) для групповых операций |
| **Infinite canvas** | Бесконечный холст во все стороны |
| **Notes** | Добавление заметок-листков на **Infinite canvas** для оставление комментов и примечаний. Реализовать **Infinite canvas** так, чтобы можно было добавлять картинки просто на карту |

### 1.4 IQ-US — текущий подход (что сохраняем)

Проект IQ-US показывает работающий паттерн воронки:

- **Отдельные HTML-файлы** для каждого экрана (`0-gender.html`, `1-age.html`, ...)
- **CSS-переменные в `:root`** для глобальных стилей (`--bg`, `--accent`, `--radius`, ...) - для них нужен отдельный блок на воронке что будет открывать настройку глобальных стилей.
- **data-screen** атрибут для идентификации экрана (над экранами на карте сделать кнопку, чтобы легко и быстро можно было подписывать самому экраны)
- **data-value** на опциях для сбора ответов
- **Query-параметры** для передачи данных между экранами
- **Классы-компоненты**: `funnel-screen`, `funnel-options`, `funnel-option`, `funnel-btn-primary`
- **Нумерация файлов** определяет порядок: `{номер}-{тип}.html`

---

## 2. Три режима работы

### 2.1 Режим карты (Map Mode)

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Zoom: 100%  │  Fit All  │  Grid  │  Minimap  │  Название  │
├──────────────────┴──────────────────────────────────────────────┤
│                                                                 │
│     ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐           │
│     │ 📱   │────▶│ 📱   │────▶│ 📱   │────▶│ 📱   │           │
│     │Gender│     │ Age  │     │Start │     │Brain │           │
│     └──────┘     └──────┘     └──────┘     └──────┘           │
│                                    │                           │
│                              ┌──────┐                          │
│                              │ 📱   │                          │
│                              │Split │                          │
│                              └──────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**При нажатии на различные экраны и элементы как в Funel Fox**

— появляется RightSidebar с:
- Настройкой СSS на выделеном экране - все css последовательно и красиво по блокам разбиты для быстрого поиска
- Настройкой СSS на выделеном элементе - все css последовательно и красиво по блокам разбиты для быстрого поиска
- Настройки платёжки (компонент paywall): планы, цены per-locale, провайдер per-гео (Stripe/Paddle/custom), checkout URL per-locale, скидки, таймер. Под каждое гео — свои платёжные реквизиты (см. секцию 12.3)
Другие настройки для разных компонентов компоненты:
- Ссылки: Terms, Privacy, Support
- Лого воронки (для хедера/футера экранов)
- Название воронки (для адресной строки `<title>`)
- Favicon (лого во вкладке)
- Прогресс-бар (процент, цвет, видимость)
- Auto-navigation, back button
- Social sharing preview (og:title, og:image, og:description)

— появляется Leftsidebar с:
- с папками - глобальные стили
            - компоненты
            - добавить ассеты - (можно быстро переместить множественное кол-во иконок или фото разных размеров и форматов и они подгрузятся в базу и их можно будет быстро использовать в текущей воронке) - save assets export - кнопка что позволит сохранять элементы в общую *базу.
            - добавить html - Позволяет вставить html код - что с помощью парсера должен вытягивать все имеющиеся плашки и стили, для быстрого выбора того или иного элемента html и его переноса на экраны. Импортированные блоки сохраняются в `block-library/imported/`. - save html export
            

### 2.2 Режим менеджера (Manager Mode)

```
┌──────────────┬──────────────────────────────────────────┬────────────────┐
│  Screens     │              Center Area                 │  Right Panel   │
│              │                                          │                │
│  [🇺🇸 en ▼]  │  ┌─ Tabs ──────────────────────────┐    │ Localization   │
│  ──────────  │  │ Preview │ Translations │ Payments │    │ Status         │
│ ● Gender     │  └────────┴──────────────┴──────────┘    │                │
│   Age        │                                          │ 🇺🇸 en: 100%   │
│   Start      │  ┌─────────────────────────────┐        │ 🇩🇪 de:  87%   │
│   Brain      │  │ Device: [iPhone 14 ▼]       │        │ 🇪🇸 es:  62%   │
│   Q1         │  │ ┌─────────────────────┐     │        │ 🇫🇷 fr:   0%   │
│   Q2         │  │ │                     │     │        │                │
│   ...        │  │ │  📱 Live Preview    │     │        │ ── Payment ──  │
│   Paywall    │  │ │  (текущая локаль)   │     │        │ 🇺🇸 $9.99 ✓    │
│              │  │ │                     │     │        │ 🇩🇪 €8.99 ✓    │
│              │  │ └─────────────────────┘     │        │ 🇪🇸 €8.99 ⚠    │
│ + Screen     │  └─────────────────────────────┘        │ 🇫🇷 —    ✗     │
└──────────────┴──────────────────────────────────────────┴────────────────┘
```

Режим для контент-менеджера: **центр управления контентом, локализацией и платёжками**.

- **Left Panel**: список экранов + **Locale Switcher** (дропдаун локали над списком)
- **Center Area**: три таба:
  - **Preview** — live-preview экрана в iframe с переключателем устройств и локалей. Непереведённые элементы обводятся красной пунктирной рамкой. Клик по элементу → inline-редактирование перевода.
  - **Translations** — таблица переводов: все editable-элементы × все локали. Inline-editing, batch AI-перевод, импорт/экспорт CSV.
  - **Payments** — таблица цен per-locale для paywall-экранов: цена, валюта, checkout URL, провайдер. Таб скрыт для экранов без payment.
- **Right Panel**: сводка Translation Status (% переведённых элементов per-locale) + Payment Status (цены + валидность URL)

Подробная спецификация табов, формулы процентов, AI-pipeline и workflow менеджера — см. **секцию 12.3**.

### 2.3 Режим разработчика (Developer Mode)

```
┌──────────┬──────────────────────────────────┬───────────────┐
│ Explorer │        Code Editor               │        │
│          │                                  │               │
│ 📁 screens│  <main class="funnel-screen"    │  ┌────────┐   │
│  ├ 01-gender │    data-screen="gender">        │  │  📱    │   │
│  ├ 02-age    │    <div class="funnel-contai... │  │        │   │
│  ├ 03-start  │      <h1>Choose gender</h1>     │  │  Live  │   │
│  └ ...    │      <div class="funnel-opt...  │  │Preview/AI AGENT CHAT │   │
│ 📁 css    │        <button class="funnel... │  │        │   │
│  └ global │      </div>                     │  └────────┘   │
│ 📁 js     │    </div>                       │               │
│  └ api    │  </main>                        │ Console:      │
│ 📁 assets │                                  │ > No errors   │
│           │  Terminal / Console              │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

Интерфейс как в Cursor/VSCode:
- Файловый обозреватель слева
- Редактор кода в центре (с подсветкой синтаксиса HTML/CSS/JS)
- Live Preview справа
- AI AGENT CHAT справа (релизовать кнопку переключения между режимами)
- Console/Terminal снизу
- Готовые HTML-сниппеты, автодополнение классов компонентов

---

## 3. Система компонентов и ID

### 3.1 Иерархия идентификаторов (с полной кастомизацией экранов)

```
Funnel (воронка)
├── schema-version: 1                          ← версия формата (для миграций сохранённых проектов)
├── meta
│   ├── funnel-id: "iq-us-v2"
│   ├── funnel-name: "IQ Test US"
│   ├── funnel-favicon: "/assets/favicon.ico"
│   ├── funnel-title: "Discover Your IQ"
│   ├── start-screen-id: "gender"              ← ID стартового экрана воронки
│   ├── funnel-domain: "quiz.example.com"
│   ├── funnel-lang: "en"                      ← язык по умолчанию
│   ├── funnel-locales: ["en", "de", "es"]     ← доступные локали (DeepL + GPT-5 API)
│   ├── funnel-api-version: 1                  ← версия funnel.* SDK (для обратной совместимости)
│   ├── terms-url: "/terms"
│   ├── privacy-url: "/privacy"
│   ├── support-url: "/support"
│   ├── payment-credentials: [                 ← наборы API-ключей для разных гео (см. секцию 12.3.2)
│   │     { id: "cred-us", label: "Stripe US", provider: "stripe", publicKey: "pk_live_..." },
│   │     { id: "cred-eu", label: "Stripe EU", provider: "stripe", publicKey: "pk_live_..." },
│   │     { id: "cred-ru", label: "Paddle RU", provider: "paddle", publicKey: "vnd_01H..." }
│   │   ]
│   └── analytics
│       ├── integrations:                      ← расширяемый список провайдеров
│       │   ├── { provider: "ga4", enabled: true, config: { id: "G-XXXXXXX" } }
│       │   ├── { provider: "meta-pixel", enabled: true, config: { id: "123456789" } }
│       │   └── { provider: "gtm", enabled: false, config: { id: "GTM-XXXXX" } }
│       └── head-code: "<script>...</script>"  ← произвольный код в <head>
│
├── global-styles (CSS-переменные — меняют ВСЮ воронку разом)
│   ├── --bg: "#f8f9fa"
│   ├── --card-bg: "#ffffff"
│   ├── --text: "#1a1a2e"
│   ├── --text-muted: "#6c757d"
│   ├── --accent: "#3b82f6"
│   ├── --accent-hover: "#2563eb"
│   ├── --border-tile: "#e5e7eb"
│   ├── --radius: "16px"
│   ├── --radius-sm: "12px"
│   ├── --shadow: "0 2px 8px rgba(0,0,0,0.08)"
│   ├── --transition: "all 0.2s ease"
│   ├── --pad-x: "20px"
│   ├── --pad-y: "16px"
│   ├── --container-max: "480px"
│   ├── --h1-size: "24px"
│   ├── --h2-size: "20px"
│   ├── --body-size: "16px"
│   ├── --option-font: "16px"
│   └── --font-family: "'Inter', sans-serif"
│
├── screens[]
│   ├── Screen
│   │   ├── screen-id: "gender"               ← уникальный, для URL и навигации
│   │   ├── screen-order: 0                   ← порядковый номер
│   │   ├── screen-type: "survey"             ← тип (survey, question, result, loader, form, paywall, custom)
│   │   ├── screen-file?: "0-gender.html"     ← optional: только для импортированных экранов
│   │   ├── screen-tags: ["onboarding", "demographics"]
│   │   │
│   │   ├── screen-settings                   ← настройки поведения
│   │   │   ├── progress-bar: true
│   │   │   ├── progress-value: "auto" | "33%"
│   │   │   ├── back-button: true
│   │   │   ├── auto-navigate: true
│   │   │   ├── navigation-delay: 300
│   │   │   ├── scroll-to-top: true
│   │   │   └── transition-animation: "fade" | "slide-left" | "slide-up" | "none"
│   │   │
│   │   ├── screen-custom-styles              ← КАСТОМИЗАЦИЯ: CSS только этого экрана
│   │   │   ├── overrides: {                  ← переопределение ЛЮБЫХ глобальных CSS-переменных
│   │   │   │     "--bg": "#000",
│   │   │   │     "--text": "#fff",
│   │   │   │     "--accent": "#ff6b00",
│   │   │   │     "--container-max": "600px",
│   │   │   │     "--pad-x": "32px"
│   │   │   │   }                             ← Partial<Record<CSSVariableName, string>>
│   │   │   ├── custom-css: "..."             ← произвольный CSS для этого экрана
│   │   │   └── custom-class: "dark-theme"    ← доп. класс на <main>
│   │   │
│   │   ├── screen-custom-js                  ← КАСТОМИЗАЦИЯ: JS только этого экрана
│   │   │   ├── on-enter: "..."               ← код при входе на экран
│   │   │   ├── on-leave: "..."               ← код при уходе с экрана
│   │   │   └── custom-script: "..."          ← произвольный JS
│   │   │
│   │   ├── screen-custom-head                ← КАСТОМИЗАЦИЯ: в <head> для этого экрана
│   │   │   ├── meta-tags: [...]              ← кастомные мета-теги
│   │   │   ├── og-title: "..."               ← Social Preview
│   │   │   ├── og-image: "..."
│   │   │   ├── og-description: "..."
│   │   │   ├── extra-head: "..."             ← произвольный HTML в head
│   │   │   └── i18n: { "de": { ogTitle: "...", ogDescription: "..." } }  ← OG per-locale
│   │   │
│   │   ├── screen-layout                     ← КАСТОМИЗАЦИЯ: макет экрана
│   │   │   ├── layout-type: "default" | "centered" | "split" | "fullscreen"
│   │   │   ├── header-visible: true
│   │   │   ├── footer-visible: true
│   │   │   ├── background-image: "/assets/bg.jpg"
│   │   │   ├── background-overlay: "rgba(0,0,0,0.5)"
│   │   │   ├── background-size: "cover"
│   │   │   └── background-position: "center"
│   │   │
│   │   ├── screen-payment (только для paywall)
│   │   │   ├── payment-provider: "stripe" | "paddle" | "custom"
│   │   │   ├── default-credentials-id: "cred-us"   ← дефолтные реквизиты (из meta.payment-credentials)
│   │   │   ├── plans: [{ id, name, price, currency, period, discount, features, localizedPricing }]
│   │   │   │   └── localizedPricing: {               ← цены per-locale (см. секцию 12.3.2)
│   │   │   │         "de": { currency: "EUR", price: 8.99, discount: 0, checkoutUrl: "..." },
│   │   │   │         "es": { currency: "EUR", price: 8.99, discount: 0, checkoutUrl: "..." }
│   │   │   │       }
│   │   │   ├── trial-days: 7
│   │   │   ├── money-back-days: 30
│   │   │   ├── timer-enabled: true
│   │   │   ├── timer-duration: 600
│   │   │   ├── checkout-urls: { "1-week": "...", "4-week": "..." }  ← legacy, вычисляется из localizedPricing
│   │   │   └── locale-providers: { "de": "stripe", "ru": "paddle" } ← провайдер per-locale
│   │   │
│   │   ├── screen-conditions                 ← условия показа экрана (СТРУКТУРИРОВАННЫЕ)
│   │   │   ├── show-if: { logic: "and", rules: [{ field: "inputs.age", operator: "eq", value: "18-24" }] }
│   │   │   ├── skip-if: { logic: "or", rules: [{ field: "inputs.gender", operator: "eq", value: "male" }] }
│   │   │   └── ab-test: { experimentId: "exp-1", variant: "A", weight: 50 } | null
│   │   │
│   │   │   (htmlCache НЕ хранится в Screen — это transient runtime-кэш, см. секцию 6.4)
│   │   │
│   │   └── elements (normalized — хранятся отдельно по ID, привязаны через screenId/parentId)
│   │       ├── FunnelElement
│   │       │   ├── element-id: "heading-gender"
│   │       │   ├── element-screen-id: "gender"              ← к какому экрану принадлежит
│   │       │   ├── element-parent-id: null | "container-gender"  ← ссылка на родителя (O(1))
│   │       │   ├── element-order: 0                         ← порядок среди сиблингов (для рендеринга и DnD)
│   │       │   ├── element-type: "heading"
│   │       │   ├── element-tag: "h1"
│   │       │   ├── element-classes: ["funnel-title"]
│   │       │   ├── element-styles: { fontSize, color, ... }
│   │       │   ├── element-content: "Choose your gender"          ← source text (язык meta.lang)
│   │       │   ├── element-i18n: { de: "Wähle dein Geschlecht", es: "Elige tu género" }
│   │       │   │                  ↑ переводы per-locale (source lang НЕ дублируется — берётся из content)
│   │       │   ├── element-visibility: "always" | "hidden" | { condition: ConditionGroup }
│   │       │   ├── element-animation: "fade-in" | "slide-up" | "none"
│   │       │   ├── element-locked: false       ← защита от случайного редактирования
│   │       │   └── element-custom-css: "..."   ← inline кастомные стили
│   │       └── ...
│   │
│   │   ВАЖНО: children[] и elementIds[] НЕ хранятся — вычисляются через индексы:
│   │   - elementIndexes.byScreen[screenId] → O(1) lookup массива ID элементов экрана
│   │   - elementIndexes.byParent[parentId] → O(1) lookup массива ID дочерних элементов
│   │   - Индексы пересчитываются при мутациях элементов (add/delete/move)
│   │   Порядок сиблингов определяется полем `order`. Одна связь (parentId/screenId), остальное computed.
│   └── ...
│
├── connections[]
│   ├── { from: "gender", to: "age", trigger: "option-click", condition: null, priority: 0, isDefault: true }
│   ├── { from: "age", to: "start-test", trigger: "option-click", condition: null, priority: 0, isDefault: true }
│   ├── { from: "q5", to: "result-high", trigger: "auto", priority: 0, isDefault: false,
│   │     condition: { logic: "and", rules: [{ field: "computed.score", operator: "gt", value: 80, valueType: "number" }] } }
│   ├── { from: "q5", to: "result-low", trigger: "auto", priority: 1, isDefault: true, condition: null }
│   └── ...
│
└── data-store (НЕ часть сохранённого проекта — только runtime воронки)
    │   Это данные ПОЛЬЗОВАТЕЛЯ воронки при прохождении, НЕ данные редактора.
    │   Существует только в runtime preview / экспортированной воронке.
    │   НЕ сериализуется в project JSON, НЕ участвует в Undo/Redo.
    ├── inputs: {}                            ← ответы пользователя воронки
    ├── computed: {}                          ← вычисленные значения (scores, results)
    ├── session-id: "..."                     ← ID сессии прохождения
    └── utm: { source, medium, campaign }     ← UTM-метки из URL
```

**Полная кастомизация гарантирована на каждом уровне:**

| Уровень | Что можно менять | Где настраивается |
|---------|-----------------|-------------------|
| **Воронка** | Глобальные CSS-переменные, шрифты, цвета, favicon, title, аналитика | Мета-панель воронки |
| **Экран** | Переопределить ЛЮБУЮ глобальную переменную, свой CSS/JS/HTML, layout, фон, анимации, условия показа, i18n | Правая панель при выборе экрана |
| **Элемент** | Все inline-стили, контент, видимость, анимация, свой CSS, i18n | Правая панель при выборе элемента |
| **Код** | Полный доступ к HTML/CSS/JS в режиме разработчика (Monaco) | Режим разработчика |

Приоритет стилей: `element inline > screen custom-css > screen overrides > global CSS vars > component defaults`

### 3.2 Система структурированных условий (ConditionGroup)

Все условия в системе (показ экрана, видимость элемента, условные связи) используют **типобезопасную структуру**, а не сырые JS-строки. Это даёт:
- Безопасность (не нужен `eval()` / `new Function()`)
- Визуальный билдер условий в UI (поле → оператор → значение)
- Валидация при вводе
- Простая миграция сохранённых проектов

```typescript
// Один оператор сравнения
type ConditionOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists' | 'not_exists';

// Одно условие: "поле [оператор] значение"
interface Condition {
  field: string;          // "inputs.age", "inputs.gender", "computed.score", "params.utm_source"
  operator: ConditionOperator;
  value: string | number | boolean;
  valueType: 'string' | 'number' | 'boolean';  // evaluator использует для корректного сравнения
}

// Группа условий с логикой AND/OR (рекурсивная — можно вкладывать)
interface ConditionGroup {
  logic: 'and' | 'or';
  rules: Array<Condition | ConditionGroup>;  // вложенные группы
}
```

**Примеры:**

```javascript
// Простое: показать экран если возраст = 18-24
{ logic: 'and', rules: [{ field: 'inputs.age', operator: 'eq', value: '18-24', valueType: 'string' }] }

// Составное: показать если (возраст 18-24 ИЛИ 25-34) И пол = female
{
  logic: 'and',
  rules: [
    {
      logic: 'or',
      rules: [
        { field: 'inputs.age', operator: 'eq', value: '18-24', valueType: 'string' },
        { field: 'inputs.age', operator: 'eq', value: '25-34', valueType: 'string' }
      ]
    },
    { field: 'inputs.gender', operator: 'eq', value: 'female', valueType: 'string' }
  ]
}

// При экспорте → генерируем JS-код из ConditionGroup:
// (inputs.age === "18-24" || inputs.age === "25-34") && inputs.gender === "female"
```

**Где используется:**
- `ScreenConditions.showIf` / `skipIf` — условия показа/пропуска экрана
- `ElementVisibility.condition` — условная видимость элемента
- `Connection.condition` — условный переход между экранами

### 3.3 Обязательные data-атрибуты HTML

```html
<!-- Экран -->
<main class="funnel-screen"
      data-screen="gender"
      data-screen-type="survey"
      data-screen-order="0"
      data-screen-tags="onboarding,demographics"
      data-progress="0"
      data-back-button="false"
      data-auto-navigate="true">

  <!-- Элемент -->
  <h1 class="funnel-title"
      data-element="heading-gender"
      data-element-type="heading"
      data-editable="true">
    Choose your gender
  </h1>

  <!-- Интерактивный элемент -->
  <button class="funnel-option"
          data-element="option-female"
          data-element-type="option"
          data-value="female"
          data-navigate-to="age"
          data-editable="true">
    Female
  </button>
</main>
```

### 3.4 Типы элементов (element-type)

| Тип | Описание | Парсимые стили |
|-----|----------|---------------|
| `heading` | h1-h6 | fontSize, fontWeight, color, textAlign, margin, padding |
| `paragraph` | p, span | fontSize, color, lineHeight, textAlign |
| `image` | img | width, height, borderRadius, objectFit, src, alt |
| `button` | button, a.btn | fontSize, color, bgColor, borderRadius, padding, border |
| `option` | Кнопка опции | всё от button + data-value |
| `option-tile` | Тайл с картинкой | width, height, borderRadius, gap, gridTemplate |
| `container` | div с children | display, flexDirection, gap, padding, margin, bgColor |
| `spacer` | Пустой div | height |
| `progress-bar` | Прогресс | height, bgColor, fillColor, borderRadius |
| `input` | input, textarea | fontSize, border, borderRadius, padding, placeholder |
| `card` | Карточка | padding, bgColor, borderRadius, shadow, border |
| `paywall` | Платёжный блок | Все стили + data-plan, data-price |
| `raw-html` | Произвольный HTML | Не парсится, редактируется как код |
| `survey-options` | Группа опций | gap, direction |
| `hero-image` | Фоновое изображение | src, height, objectFit, objectPosition |
| `footer` | Подвал | padding, bgColor, fontSize |

### 3.5 Система классов CSS (конвенция)

```
funnel-*           — корневые компоненты воронки
  funnel-screen    — экран (main контейнер)
  funnel-container — обёртка контента
  funnel-title     — заголовок
  funnel-subtitle  — подзаголовок
  funnel-options   — группа опций
  funnel-option    — одна опция
  funnel-btn-*     — кнопки (primary, secondary, ghost)
  funnel-card      — карточка
  funnel-input-*   — поля ввода
  funnel-progress  — прогресс-бар
  funnel-footer    — подвал
  funnel-paywall-* — элементы платёжной страницы
```

---

## 4. Парсинг HTML / Стилей

### 4.1 Алгоритм парсинга при импорте HTML

```
1. Загрузить HTML-файл → DOMParser().parseFromString()
2. Найти <main data-screen="..."> → определить screen
3. Парсить <style> блоки → CSSOM (document.styleSheets / CSSStyleSheet)
   a. Для каждого CSSStyleRule: selectorText → matchedElements → properties
   b. Группировать стили по элементам (selector matching через element.matches())
4. Парсить <link rel="stylesheet"> → fetch текст → new CSSStyleSheet().replaceSync()
   a. Аналогично: разобрать правила и замэтчить на элементы
5. Для каждого [data-element] или [data-editable]:
   a. Прочитать tagName, className, id
   b. Извлечь inline styles из element.style (style="...")
   c. Наложить стили из шагов 3-4 (matched CSS rules) с учётом специфичности
   d. Определить element-type по тегу/классам
   e. Собрать data-* атрибуты
   f. Собрать children рекурсивно
6. Собрать дерево: Screen → Elements[] → Styles{}
```

**Почему НЕ getComputedStyle():**
- `DOMParser` создаёт документ, который **не рендерится** — у него нет layout
- `getComputedStyle()` на элементе из нерендеренного документа вернёт дефолтные/пустые значения
- Вместо этого: разбираем `<style>` блоки через CSSOM, матчим селекторы на элементы через `element.matches(selector)`, и мёржим с inline styles вручную с учётом приоритета (inline > id > class > tag)

### 4.2 Стили, которые парсим и показываем в панели

**Layout:**
```
display, flexDirection, justifyContent, alignItems, gap,
gridTemplateColumns, gridTemplateRows,
position, top, right, bottom, left, zIndex
```

**Spacing:**
```
margin (top, right, bottom, left)
padding (top, right, bottom, left)
```

**Sizing:**
```
width, minWidth, maxWidth,
height, minHeight, maxHeight
```

**Typography:**
```
fontFamily, fontSize, fontWeight, fontStyle,
lineHeight, letterSpacing, textAlign, textDecoration,
color, textTransform
```

**Background:**
```
backgroundColor, backgroundImage, backgroundSize,
backgroundPosition, backgroundRepeat
gradient (linear, radial)
```

**Border:**
```
borderWidth, borderStyle, borderColor,
borderRadius (all corners independently)
```

**Effects:**
```
boxShadow, opacity, overflow, cursor,
transition, transform
```

### 4.3 Источник правды: Elements Tree → HTML генерируется

```
              ┌────────────────────────────────────┐
              │   Elements Tree (source of truth)   │
              └──────────┬───────────┬──────────────┘
                         │           │
                    ┌────▼───┐  ┌────▼────┐
                    │ Панель │  │  HTML    │
                    │свойств │  │ генера-  │
                    │  (GUI) │  │  тор     │
                    └────┬───┘  └────┬────┘
                         │           │
                    обновляет    генерирует
                    elements     htmlCache
                    tree         для preview
                         │        и экспорта
                         │           │
                    ┌────▼───────────▼────┐
                    │   Live Preview       │
                    │   (iframe)           │
                    └─────────────────────┘

  Режим разработчика (Monaco):
  ─ Редактируем HTML → при сохранении re-parse → обновляем elements tree
  ─ Это ЕДИНСТВЕННОЕ место, где HTML → Elements (обратный поток)
  ─ Пока редактируем в Monaco — elements tree НЕ обновляется (no live sync)
  ─ Нажал Ctrl+S → parse → обновился tree → обновилась панель
```

**Почему НЕ двунаправленная синхронизация:**
- Два источника правды = десинхронизация и баги
- Однонаправленный поток (elements → HTML) предсказуем и тестируем
- Developer mode — исключение с явным re-parse при сохранении

**Приоритет стилей (каскад):**
- Глобальные стили → CSS-переменные (`:root { --bg: ... }`)
- Per-экран стили → `[data-screen="gender"]` селекторы
- Per-элемент стили → inline styles (для кастомизации)
- Приоритет: `element inline > screen custom-css > screen overrides > global CSS vars > component defaults`

---

## 5. Горячие клавиши

### 5.1 Общие (все режимы)

| Клавиша | Действие |
|---------|----------|
| `Ctrl+S` | Сохранить проект |
| `Ctrl+Z` | Отменить (Undo) |
| `Ctrl+Shift+Z` | Повторить (Redo) |
| `Ctrl+C` | Копировать элемент/экран |
| `Ctrl+V` | Вставить |
| `Ctrl+D` | Дублировать |
| `Delete` / `Backspace` | Удалить выбранное |
| `Escape` | Снять выделение / закрыть панель |
| `Ctrl+P` | Live Preview |
| `Ctrl+E` | Экспорт HTML |
| `1` | Режим карты |
| `2` | Режим менеджера |
| `3` | Режим разработчика |

### 5.2 Режим карты

| Клавиша | Действие |
|---------|----------|
| `Space + Drag` | Панорама (pan) |
| `Ctrl + Scroll` | Масштаб (zoom) |
| `Scroll` | Вертикальная панорама |
| `Shift + Scroll` | Горизонтальная панорама |
| `Ctrl+Shift+1` | Показать все экраны (fit all) |
| `Ctrl+Shift+0` | Зум на выбранный экран |
| `Ctrl+A` | Выбрать все экраны |
| `Arrow keys` | Двигать выбранный экран |
| `+` / `-` | Zoom in/out |
| `A` | Добавить новый экран |
| `T` | Открыть шаблоны |

### 5.3 Режим разработчика

| Клавиша | Действие |
|---------|----------|
| `Ctrl+Space` | Автодополнение |
| `Ctrl+/` | Комментировать строку |
| `Ctrl+Shift+P` | Командная палитра |
| `Ctrl+F` | Поиск в файле |
| `Ctrl+Shift+F` | Глобальный поиск |
| `Ctrl+G` | Перейти к строке |
| `F2` | Переименовать |

---

## 6. Архитектура состояния

### 6.1 Структура State

```javascript
const initialState = {
  // Версия формата (для миграции сохранённых проектов при изменении структуры)
  schemaVersion: 1,

  // Мета-данные воронки
  funnel: {
    id: 'iq-us-v2',
    name: 'IQ Test US',
    favicon: '/assets/favicon.ico',
    title: 'Discover Your IQ',
    startScreenId: 'gender',           // ← ID стартового экрана (обязательное поле)
    domain: '',
    lang: 'en',
    locales: ['en'],
    funnelApiVersion: 1,                 // ← версия funnel.* SDK
    analytics: {
      integrations: [
        { provider: 'ga4', enabled: false, config: { id: '' } },
        { provider: 'meta-pixel', enabled: false, config: { id: '' } },
        { provider: 'gtm', enabled: false, config: { id: '' } },
      ],
      headCode: ''
    },
    termsUrl: '',
    privacyUrl: '',
    supportUrl: ''
  },

  // Глобальные CSS-переменные
  globalStyles: {
    '--bg': '#f8f9fa',
    '--card-bg': '#ffffff',
    '--text': '#1a1a2e',
    '--text-muted': '#6c757d',
    '--accent': '#3b82f6',
    '--accent-hover': '#2563eb',
    '--radius': '16px',
    '--radius-sm': '12px',
    '--h1-size': '24px',
    '--body-size': '16px',
    // ...
  },

  // Экраны — normalized (по ID)
  screens: {
    'gender': {
      id: 'gender',
      order: 0,
      name: 'Gender Selection',
      type: 'survey',
      // file: '0-gender.html',           // ← optional: только для импортированных
      tags: ['onboarding', 'demographics'],
      position: { x: 0, y: 0 },
      settings: {
        progressBar: false,
        progressValue: 'auto',
        backButton: false,
        autoNavigate: true,
        navigationDelay: 300,
        scrollToTop: true,
        transitionAnimation: 'fade'
      },
      conditions: {
        showIf: null,                  // ← ConditionGroup | null
        skipIf: null,                  // ← ConditionGroup | null
        abTest: null                   // ← ABTestConfig | null (experimentId, variant, weight)
      },
      // elementIds НЕ хранится — вычисляется: Object.values(elements).filter(e => e.screenId === 'gender').sort(by order)
      // htmlCache НЕ хранится в Screen — transient runtime-кэш (см. секцию 6.4)
    },
    // ...
  },

  // FunnelElement'ы — normalized (по ID), source of truth для структуры
  // В реальности ID = "{type}-{nanoid(8)}", здесь читаемые для примера
  elements: {
    'heading-xK9mPq2r': {
      id: 'heading-xK9mPq2r',
      screenId: 'gender',
      parentId: null,                  // ← null = корневой элемент экрана (O(1) поиск родителя)
      order: 0,                        // ← порядок среди сиблингов
      type: 'heading',
      tag: 'h1',
      classes: ['funnel-title'],
      content: 'Choose your gender',
      styles: {
        fontSize: '24px',
        fontWeight: '700',
        color: 'var(--text)',
        textAlign: 'center',
        marginBottom: '24px'
      },
      attributes: {},
      // children НЕ хранится — вычисляется и сортируется по order
      visibility: 'always',           // ← 'always' | 'hidden' | { condition: ConditionGroup }
      editable: true,
      locked: false
    },
    // ...
  },

  // Индексы элементов — computed, пересчитываются при мутациях, НЕ персистятся
  // Обеспечивают O(1) lookup вместо O(n) filter при каждом рендере
  elementIndexes: {
    byScreen: { 'gender': ['heading-xK9mPq2r', ...] },
    byParent: { 'container-Ab1c': ['heading-xK9mPq2r', ...] },
  },

  // Связи между экранами (priority определяет порядок проверки условий)
  connections: [
    { id: 'conn-1', from: 'gender', to: 'age', trigger: 'option-click', condition: null, label: '', priority: 0, isDefault: true },
    // ...
  ],

  // UI состояние
  ui: {
    mode: 'map',                       // 'map' | 'manager' | 'developer'
    selectedScreenIds: [],             // ← МАССИВ для multi-select (Ctrl+Click, Selection Box)
    selectedElementIds: [],            // ← МАССИВ для multi-select
    draggedItem: null,
    clipboard: null,
    leftPanelWidth: 280,
    rightPanelWidth: 320,
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    mapPan: { x: 0, y: 0 },
    mapScale: 1,
    gridSnap: true,
    showMinimap: true,
    showConnections: true,
    previewVisible: false,
    previewDevice: 'mobile'
  },

  // История для Undo/Redo — Immer patches (НЕ полные снапшоты!)
  history: {
    past: [],                          // ← HistoryEntry[] = { patches, inversePatches, description, timestamp }
    future: [],                        // ← HistoryEntry[]
    maxEntries: 100                    // ← лимит (patches занимают КБ, не МБ)
  }
};
```

**Хранилище данных:**
- **IndexedDB** (через **Dexie.js** v4.3) — основное хранилище для проектов, истории, ассетов. Без лимита в 5-10 MB (до сотен МБ). Multiple object stores (projects, assets, history), индексы для запросов, транзакции, blob storage. API асинхронный (Promise-based) — Zustand persist middleware поддерживает async storage из коробки.
- **localStorage** — только для мелких UI-настроек: размеры панелей, тема, последний открытый проект. Не для данных проекта.

**Автосохранение:** каждые 5 минут автоматический бэкап в IndexedDB. Debounce 2 секунды при активных изменениях.


### 6.2 Actions

```
FUNNEL_UPDATE          — обновить мета-данные воронки
GLOBAL_STYLES_UPDATE   — обновить CSS-переменную

SCREEN_ADD             — добавить экран
SCREEN_DELETE          — удалить экран
SCREEN_UPDATE          — обновить свойства экрана
SCREEN_RENAME          — переименовать slug (каскадное обновление всех ссылок, см. 6.7)
SCREEN_MOVE            — изменить позицию на карте
SCREEN_REORDER         — изменить порядок
SCREEN_DUPLICATE       — дублировать экран (авто-генерация slug, см. 6.7)
SCREEN_IMPORT_HTML     — импорт из HTML-файла

ELEMENT_ADD            — добавить элемент
ELEMENT_DELETE         — удалить элемент
ELEMENT_UPDATE         — обновить свойства/контент
ELEMENT_UPDATE_STYLE   — обновить один стиль
ELEMENT_MOVE           — изменить порядок в экране
ELEMENT_DUPLICATE      — дублировать

CONNECTION_ADD         — добавить связь
CONNECTION_DELETE      — удалить связь
CONNECTION_UPDATE      — обновить

UI_SET_MODE            — переключить режим
UI_SELECT_SCREEN       — выбрать экран
UI_SELECT_ELEMENT      — выбрать элемент
UI_UPDATE_PAN          — обновить pan
UI_UPDATE_SCALE        — обновить zoom
UI_TOGGLE_PANEL        — свернуть/развернуть панель
UI_RESIZE_PANEL        — изменить ширину панели

CLIPBOARD_COPY         — копировать
CLIPBOARD_PASTE        — вставить

UNDO                   — отменить
REDO                   — повторить

PROJECT_SAVE           — сохранить в IndexedDB / файл
PROJECT_LOAD           — загрузить
PROJECT_EXPORT_HTML    — экспорт всей воронки в HTML/zip:html global-css, js
```

### 6.3 Middleware для Undo/Redo (Immer Patches)

**Почему patches, а не снапшоты:**
- Полный снапшот стейта с 50 экранами и HTML = мегабайты на каждый шаг
- Immer patch = десятки байт (только diff), 100 шагов ≈ несколько КБ
- `applyPatches()` работает за O(patch-size), не O(state-size)

**ВАЖНО — htmlCache вынесен из persisted state:**
- `htmlCache` — полная HTML-строка экрана (5-10 KB) — это **transient runtime-кэш** (см. секцию 6.4).
- Не хранится в `Screen`, не участвует в Undo/Redo, не сериализуется в IndexedDB.
- Генерируется лениво из `elements[]` при запросе preview/экспорта.
- Инвалидируется при любом изменении элементов экрана.

```typescript
import { enablePatches, produceWithPatches, applyPatches, Patch } from 'immer';

enablePatches(); // вызвать один раз при старте приложения

interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
  description: string;
  timestamp: number;
}

// Zustand middleware: оборачивает мутации и сохраняет patches
// ВАЖНО: produceWithPatches работает ТОЛЬКО на project state,
// НЕ на всём AppState. Это гарантирует что Undo/Redo не откатывает
// UI-состояние (выделение, pan, zoom, режим).
const undoableMiddleware = (config) => (set, get, api) => {
  return config(
    (projectUpdater, actionType) => {
      const currentState = get();
      const [nextProject, patches, inversePatches] = produceWithPatches(
        currentState.project,   // ТОЛЬКО project, не весь state
        projectUpdater
      );

      if (patches.length === 0) return;

      const entry: HistoryEntry = {
        patches,
        inversePatches,
        description: actionType,
        timestamp: Date.now()
      };

      set({
        project: nextProject,
        history: {
          ...currentState.history,
          past: [...currentState.history.past, entry].slice(-currentState.history.maxEntries),
          future: []
        }
      });
    },
    get,
    api
  );
};

// Undo: применяем inversePatches к PROJECT state
function undo() {
  const state = get();
  const { past, future } = state.history;
  if (past.length === 0) return;

  const lastEntry = past[past.length - 1];
  const newProject = applyPatches(state.project, lastEntry.inversePatches);

  set({
    project: newProject,
    history: {
      ...state.history,
      past: past.slice(0, -1),
      future: [lastEntry, ...future]
    }
  });
}

// Redo: применяем patches к PROJECT state
function redo() {
  const state = get();
  const { past, future } = state.history;
  if (future.length === 0) return;

  const nextEntry = future[0];
  const newProject = applyPatches(state.project, nextEntry.patches);

  set({
    project: newProject,
    history: {
      ...state.history,
      past: [...past, nextEntry],
      future: future.slice(1)
    }
  });
}
```

### 6.4 Transient HTML Cache

`htmlCache` — сгенерированный HTML экрана — **не хранится** в `Screen` и не является частью persisted project JSON. Это runtime-кэш, который:

- Генерируется лениво из `elements[]` при запросе preview/экспорта
- Хранится в отдельном `Map<screenId, string>` (in-memory, не в Zustand)
- Инвалидируется при любом изменении элементов экрана
- **НЕ участвует** в Undo/Redo (иначе patches раздуваются до МБ)
- **НЕ сериализуется** в IndexedDB / JSON / export

```typescript
// Transient cache — НЕ часть стейта, НЕ часть ProjectDocument
const htmlCache = new Map<string, string>();

function getScreenHtml(screenId: string): string {
  if (htmlCache.has(screenId)) return htmlCache.get(screenId)!;
  const html = generateHtmlFromElements(screenId);
  htmlCache.set(screenId, html);
  return html;
}

function invalidateScreenCache(screenId: string) {
  htmlCache.delete(screenId);
}
```

**Почему не в стейте:**
- Полная HTML-строка экрана = 5-10 KB. При 30 экранах × 100 undo-шагов patches раздуваются до МБ
- Два источника правды (elements + htmlCache) = десинхронизация и баги
- Кэш вычисляем — нет смысла хранить в persisted-формате

### 6.5 ProjectDocument — обёртка проекта

Весь проект хранится как `ProjectDocument` — обёртка вокруг `Funnel` с метаданными:

```typescript
interface AssetReference {
  id: string;             // уникальный ID ассета
  filename: string;       // оригинальное имя файла
  mimeType: string;       // "image/png", "image/svg+xml"
  size: number;           // размер в байтах
  hash: string;           // SHA-256 для дедупликации
  storage: 'inline' | 'local' | 'remote';
  url: string;            // относительный путь или data URL
}

interface ProjectDocument {
  id: string;             // UUID проекта
  schemaVersion: number;  // версия формата (для миграций)
  createdAt: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
  thumbnail: string;      // base64 превью для списка проектов
  assets: {
    assets: Record<string, AssetReference>;
  };
  funnel: Funnel;         // данные воронки
}
```

**Стратегия ссылок на ассеты:**

| Этап | storage | url | Пример |
|------|---------|-----|--------|
| **Вставка** | `inline` | `data:image/png;base64,...` | Маленькие иконки < 50KB |
| **Сохранение (local)** | `local` | `assets/{hash}.{ext}` | IndexedDB blob store |
| **Сервер (будущее)** | `remote` | `https://cdn.../assets/{hash}.{ext}` | CDN |
| **Экспорт (ZIP)** | `local` | `assets/{filename}` | Относительный путь в ZIP |

Все ассеты ссылаются через `asset://{id}` в элементах. При экспорте/preview — резолвятся в реальные URL.

### 6.6 Стратегия генерации ID

| Сущность | Формат | Пример |
|----------|--------|--------|
| **Проект** | UUID v4 | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| **Экран** | slug (user-editable) | `gender`, `age`, `paywall` |
| **Элемент** | `{type}-{nanoid(8)}` | `heading-xK9mPq2r`, `button-Lm3nOp4s` |
| **Соединение** | `conn-{nanoid(8)}` | `conn-aB1cD2eF` |
| **Ассет** | SHA-256 hash (первые 16 символов) | `a1b2c3d4e5f6g7h8` |

Элементы используют nanoid (не semantic IDs как `heading-gender`) чтобы избежать конфликтов при дублировании экранов и импорте шаблонов.

### 6.7 Валидация Screen Slug

Screen ID — user-editable slug, он же ключ в `screens`, он же часть URL экспортированной воронки. Используется в: `connections[].from/to`, `funnel.meta.startScreenId`, `elements[].screenId`, `data-navigate-to` при экспорте.

**Формат slug:**
```
/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/
```
- Только строчные латинские буквы, цифры, дефис
- Длина: 2–50 символов
- Не начинается и не заканчивается дефисом
- Не допускаются двойные дефисы (`--`)

**Зарезервированные имена (нельзя использовать как slug):**
```
api, admin, assets, static, css, js, images, fonts, favicon,
index, login, signup, auth, callback, webhook, health,
null, undefined, new, edit, delete, settings, export, import
```

**Действие SCREEN_RENAME — каскадное обновление:**
```
SCREEN_RENAME (oldSlug, newSlug):
  1. Валидировать newSlug (формат, зарезервированные, уникальность)
  2. Обновить ключ в screens: screens[newSlug] = { ...screens[oldSlug], id: newSlug }
  3. Обновить elements[*].screenId: oldSlug → newSlug
  4. Обновить connections[*].from / .to: oldSlug → newSlug
  5. Обновить funnel.meta.startScreenId если === oldSlug
  6. Пересчитать elementIndexes.byScreen
  7. Инвалидировать htmlCache для этого экрана
```

**При дублировании экрана:**
```
Авто-генерация slug: "{originalSlug}-copy" → "{originalSlug}-copy-2" → ...
Если результат > 50 символов: "{type}-{nanoid(6)}" (fallback)
```

---

## 7. Карта экранов (Canvas)

### 7.1 Навигация (React Flow — встроенная)

React Flow (@xyflow/react) уже включает pan/zoom/minimap/controls из коробки.
**Кастомный код pan/zoom НЕ нужен** — это борьба с библиотекой.

```tsx
import { ReactFlow, MiniMap, Controls, Background, BackgroundVariant } from '@xyflow/react';

function MapCanvas() {
  return (
    <ReactFlow
      nodes={screenNodes}
      edges={connectionEdges}
      nodeTypes={customNodeTypes}
      edgeTypes={customEdgeTypes}
      // Pan & Zoom — встроено, настраивается через пропсы:
      panOnScroll                    // колёсико = pan (как в Miro)
      zoomOnPinch                    // pinch-to-zoom на тачпаде
      selectionOnDrag                // Shift+drag = selection box
      selectNodesOnDrag={false}
      minZoom={0.1}
      maxZoom={3}
      snapToGrid={gridSnap}
      snapGrid={[20, 20]}
      fitView                        // при загрузке — показать все экраны
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
    >
      <MiniMap />                     {/* мини-карта — встроена */}
      <Controls />                    {/* кнопки +/- / fit — встроены */}
      <Background variant={BackgroundVariant.Dots} gap={20} /> {/* сетка */}
    </ReactFlow>
  );
}
```

React Flow обрабатывает: pan (Space+Drag, средняя кнопка, два пальца), zoom (Ctrl+Scroll, pinch),
fit-to-view, selection box, keyboard navigation, minimap, snap-to-grid.
Документация: https://reactflow.dev/api-reference

### 7.2 Элементы канваса

- **Screen Nodes** — телефон-экраны (375×812 масштабированные) (убедится что это самый универсальный и лучший размер под мобильные экраны (как в Funel Fox ?))
- **Connection Lines** — SVG Bezier-кривые между экранами
- **Selection Box** — рамка выделения
- **Minimap** — мини-карта в правом нижнем углу
- **Grid** — фоновая сетка (radial-gradient)

### 7.3 Toolbar экрана (при наведении/выделении)

```
┌──────────────────────┐
│ 📋 Copy  📑 Duplicate  🗑️ Delete │
└──────────────────────┘
        ┌──────────┐
        │  📱      │
        │ Screen   │
        │          │
        └──────────┘
```

### 7.4 Связи между экранами

**Source of truth:** `connections[]` в стейте — единственный источник правды для навигации.
- Пользователь рисует связь на canvas → обновляется `connections[]`
- `data-navigate-to` **генерируется при экспорте** из `connections[]`, а не наоборот
- `buildConnections()` ниже используется **только при импорте HTML** (один раз) для извлечения навигации из существующих файлов

```javascript
// Используется ТОЛЬКО при импорте HTML-файлов (Import Service)
// После импорта связи хранятся в connections[], data-navigate-to больше не читается
function buildConnectionsFromImport(screens) {
  const connections = [];
  for (const screen of screens) {
    for (const element of screen.elements) {
      if (element.attributes['data-navigate-to']) {
        connections.push({
          from: screen.id,
          to: element.attributes['data-navigate-to'],
          trigger: element.type,
          label: element.content || ''
        });
      }
    }
  }
  return connections;
}
```

### 7.5 Алгоритм определения следующего экрана (Connection Resolution)

При навигации (клик по опции, автопереход, custom JS) система определяет следующий экран:

```
resolveNextScreen(currentScreenId):
  1. connections = getConnectionsFrom(currentScreenId)
                     .sort(by priority ASC)

  2. // Фаза 1: условные переходы (по приоритету)
     for conn in connections where conn.condition != null:
       if evaluateCondition(conn.condition, runtimeData):
         return conn.to  // первый match выигрывает

  3. // Фаза 2: fallback на default-соединение
     defaultConn = connections.find(c => c.isDefault && c.condition === null)
     if defaultConn:
       return defaultConn.to

  4. // Фаза 3: тупик — нет валидного перехода
     return null  // экран — конечная точка (result, paywall)
```

**Инварианты (валидация в редакторе):**
- На каждом экране **максимум одно** соединение с `isDefault: true` И `condition: null`
- Соединения с условиями (`condition != null`) **не являются** `isDefault`
- Экран без исходящих соединений — тупик. Редактор показывает иконку ⚠️, кроме `type: 'result'` и `type: 'paywall'`
- Попытка создать второй `isDefault` на том же экране → редактор снимает `isDefault` с предыдущего

### 7.6 Алгоритм автоматического прогресса (progressValue: 'auto')

Для нелинейных воронок с ветвлениями `'auto'` прогресс считается по **основному пути** (default path):

```
calculateAutoProgress(currentScreenId):
  1. // Построить основной путь: идём по isDefault-соединениям от startScreenId
     defaultPath = []
     current = startScreenId
     visited = new Set()
     while current && !visited.has(current):
       visited.add(current)
       defaultPath.push(current)
       defaultConn = connections.find(c => c.from === current && c.isDefault && !c.condition)
       current = defaultConn?.to ?? null

  2. // Экран НА основном пути
     index = defaultPath.indexOf(currentScreenId)
     if index >= 0:
       return Math.round(index / (defaultPath.length - 1) * 100)

  3. // Экран НА ВЕТКЕ (не на основном пути)
     // Найти ближайшего предка на основном пути — экран, откуда идёт ветка
     ancestor = findNearestAncestorOnDefaultPath(currentScreenId, defaultPath)
     ancestorProgress = indexOf(ancestor) / (defaultPath.length - 1) * 100
     branchDepth = stepsFromAncestor(ancestor, currentScreenId)
     // Добавить дробную часть, чтобы прогресс рос внутри ветки
     return Math.round(ancestorProgress + branchDepth)

  4. // Edge cases:
     //   - Одноэкранная воронка: return 100
     //   - Стартовый экран: return 0
     //   - Циклический путь: break при первом повторе (visited Set)
```

Этот подход совпадает с FunnelFox: пользователь видит стабильный, предсказуемый прогресс на основном потоке. Ветки не ломают шкалу
```

---

## 8. Боковые панели

### 8.1 Левая панель — контекстная

**В режиме карты:**
```
┌─────────────────────┐
│ 🔍 Search blocks    │
├─────────────────────┤
│ 📂 Screens          │
│   ├ New Screen      │
│   ├ Survey          │
│   ├ Question        │
│   ├ Result          │
│   ├ Loader          │
│   ├ Form            │
│   └ Paywall         │
│ 📂 Content          │
│   ├ Heading         │
│   ├ Paragraph       │
│   ├ Image           │
│   └ Spacer          │
│ 📂 Interactive      │
│   ├ Button          │
│   ├ Option List     │
│   ├ Option Tiles    │
│   ├ Input Field     │
│   └ Email Form      │
│ 📂 Layout           │
│   ├ Container       │
│   ├ Card            │
│   ├ Hero Section    │
│   └ Footer          │
│ 📂 Templates        │
│   ├ Full Screens    │
│   └ Imported        │
│ 📂 Custom HTML      │
│   └ Raw HTML Block  │
└─────────────────────┘
```

**В режиме менеджера:**
```
┌─────────────────────┐
│ Screens (12)        │
├─────────────────────┤
│ ● 0. Gender         │
│   1. Age            │
│   2. Start Test     │
│   3. Brain Type     │
│   ...               │
│  11. Paywall        │
├─────────────────────┤
│ + Add Screen        │
└─────────────────────┘
```

**В режиме разработчика:**
```
┌─────────────────────┐
│ Explorer            │
├─────────────────────┤
│ 📁 screens/         │
│   📄 0-gender.html  │
│   📄 1-age.html     │
│   ...               │
│ 📁 css/             │
│   📄 global.css     │
│ 📁 js/              │
│   📄 api.js         │
│ 📁 assets/          │
│   🖼️ logo.svg       │
│   🖼️ avatar-1.jpg   │
│ 📁 block-library/   │
│   📄 option-list.html│
│   📄 paywall.html   │
└─────────────────────┘
```

### 8.2 Правая панель — свойства

**Когда выбран экран (в режиме карты):**
```
┌──────────────────────────┐
│ Screen: Gender           │
├──────────────────────────┤
│ ▸ General                │
│   Name: [Gender        ] │
│   ID:   [gender        ] │
│   Type: [Survey      ▼ ] │
│   Tags: [onboarding, ..] │
│                          │
│ ▸ Navigation             │
│   Progress: [✓] Show     │
│   Value: [Auto       ▼ ] │
│   Back btn: [ ] Show     │
│   Auto-nav: [✓]          │
│   Delay: [300ms      ]   │
│                          │
│ ▸ Appearance             │
│   Background: [#f8f9fa]  │
│   Container: [480px   ]  │
│   Padding: [24] [24]     │
│                          │
│ ▸ Social Preview         │
│   OG Title: [........]   │
│   OG Image: [........]   │
│   OG Desc:  [........]   │
│                          │
│ ▸ Payment (if paywall)   │
│   Provider: [stripe  ▼ ] │
│   Plans: [Edit Plans]    │
│   Locales: 3/4 configured│
│   [Manage per-locale →]  │
│   (подробнее: Manager    │
│    Mode → Tab Payments)  │
└──────────────────────────┘
```

**Когда выбран элемент:**
```
┌──────────────────────────┐
│ Element: Heading         │
├──────────────────────────┤
│ ▸ Content                │
│   Text: [Choose gender ] │
│   Tag:  [h1          ▼ ] │
│                          │
│ ▸ Typography             │
│   Font: [Inter       ▼ ] │
│   Size: [24px         ]  │
│   Weight: [700      ▼ ]  │
│   Color: [■ var(--text)] │
│   Align: [L] [C] [R] [J]│
│   Line-h: [1.4       ]  │
│                          │
│ ▸ Spacing                │
│   Margin:  [0] [0]       │
│            [0] [24]      │
│   Padding: [0] [0]       │
│            [0] [0]       │
│                          │
│ ▸ Background             │
│   Color: [transparent ]  │
│                          │
│ ▸ Border                 │
│   Width: [0]             │
│   Radius: [0]            │
│   Color: [#000]          │
│                          │
│ ▸ Effects                │
│   Shadow: [none]         │
│   Opacity: [1.0]         │
│                          │
│ ▸ Visibility             │
│   Show: [Always      ▼ ] │
│   Condition: [........]  │
└──────────────────────────┘
```

### 8.3 Кастомизация панелей

```javascript
// Ресайз панелей — drag ручки
// Collapse — двойной клик на ручку или кнопка
// Минимальная ширина: 200px
// Максимальная ширина: 50% viewport
// Сохранение размеров в localStorage (UI prefs — малый объём, синхронный доступ)

const panelConfig = {
  left: {
    minWidth: 200,
    maxWidth: '50vw',
    defaultWidth: 280,
    collapsible: true,
    resizable: true,
    position: 'left'
  },
  right: {
    minWidth: 240,
    maxWidth: '50vw',
    defaultWidth: 320,
    collapsible: true,
    resizable: true,
    position: 'right'
  }
};
```

---

## 9. Система тегов и папок

### 9.1 Теги экранов

```javascript
const SCREEN_TAGS = {
  // По назначению
  'onboarding': { color: '#3b82f6', icon: 'user-plus' },
  'quiz': { color: '#8b5cf6', icon: 'brain' },
  'result': { color: '#10b981', icon: 'chart' },
  'payment': { color: '#f59e0b', icon: 'credit-card' },
  'form': { color: '#6366f1', icon: 'form-input' },
  'legal': { color: '#6b7280', icon: 'file-text' },

  // По статусу
  'draft': { color: '#9ca3af', icon: 'pencil' },
  'ready': { color: '#10b981', icon: 'check' },
  'testing': { color: '#f59e0b', icon: 'flask' },
};
```

### 9.2 Теги компонентов (для библиотеки блоков)

```javascript
const COMPONENT_TAGS = {
  'content': ['heading', 'paragraph', 'image', 'spacer', 'divider'],
  'interactive': ['button', 'option-list', 'option-tiles', 'input', 'checkbox', 'radio'],
  'layout': ['container', 'card', 'hero', 'footer', 'grid', 'flex'],
  'form': ['email-input', 'phone-input', 'text-input', 'select', 'textarea'],
  'payment': ['paywall', 'plan-card', 'price-tag', 'timer', 'guarantee'],
  'feedback': ['review', 'stars', 'testimonial', 'social-proof'],
  'navigation': ['progress-bar', 'back-button', 'breadcrumb'],
  'media': ['video', 'animation', 'icon', 'avatar'],
  'custom': ['raw-html', 'imported']
};
```

### 9.3 Полный каталог компонентов

Компоненты хранятся как HTML-файлы в `/block-library/`. Каждый компонент — самодостаточный HTML с встроенными стилями и мета-комментарием.

**Стратегия загрузки в браузере:**

Vite-приложение не имеет доступа к файловой системе. Компоненты загружаются через двухуровневую систему:

1. **`component-manifest.json`** — генерируется при сборке (Vite plugin или pnpm script). Содержит мета-данные всех компонентов (имя, категория, теги, описание, путь к thumbnail). Загружается один раз при старте — для отображения каталога в BlockLibrary.

2. **HTML загружается лениво** — когда пользователь перетаскивает компонент на экран или открывает его превью, `ComponentRegistry` делает `fetch('/block-library/interactive/button-primary.html')` и парсит через `ComponentParser`.

```javascript
// Генерируется при сборке: pnpm run build:manifest
// component-manifest.json
[
  {
    "id": "button-primary",
    "category": "interactive",
    "tags": ["button", "cta"],
    "description": "Основная CTA-кнопка",
    "thumbnail": "/thumbnails/button-primary.png",
    "path": "/block-library/interactive/button-primary.html"
  },
  // ...170+ записей
]

// В dev-режиме: Vite обслуживает /block-library/ как статику (publicDir или static middleware)
// В production: файлы копируются в dist/block-library/ при сборке
```

**Альтернатива для бандлинга:** `import.meta.glob('/block-library/**/*.html', { query: '?raw', eager: false })` — Vite lazy imports, не увеличивает начальный bundle, загружает по требованию через dynamic import.

```
block-library/
│
├── content/                              ── КОНТЕНТ ──
│   ├── heading-h1.html                   Заголовок H1 (крупный, основной)
│   ├── heading-h2.html                   Заголовок H2 (секционный)
│   ├── heading-h3.html                   Заголовок H3 (подзаголовок)
│   ├── heading-with-emoji.html           Заголовок с эмодзи слева
│   ├── heading-gradient.html             Заголовок с градиентным текстом
│   ├── paragraph.html                    Абзац текста
│   ├── paragraph-muted.html              Текст второстепенный (muted)
│   ├── paragraph-small.html              Мелкий текст (disclaimer, legal)
│   ├── text-highlight.html               Текст с выделением (маркер)
│   ├── text-animated-typing.html         Текст с анимацией набора
│   ├── blockquote.html                   Цитата
│   ├── list-ordered.html                 Нумерованный список
│   ├── list-unordered.html               Маркированный список
│   ├── list-checkmarks.html              Список с галочками (benefits)
│   ├── divider.html                      Разделительная линия
│   ├── divider-with-text.html            Разделитель с текстом ("or")
│   ├── spacer.html                       Вертикальный отступ (настраиваемый)
│   ├── label-badge.html                  Бейдж/метка (NEW, HOT, -50%)
│   ├── chip.html                         Чип/тег (категория)
│   └── tooltip.html                      Текст с тултипом при наведении
│
├── media/                                ── МЕДИА ──
│   ├── image-full.html                   Полноширинное изображение
│   ├── image-rounded.html                Изображение со скруглением
│   ├── image-circle.html                 Круглое изображение (аватар)
│   ├── image-with-caption.html           Изображение с подписью
│   ├── image-before-after.html           До/После слайдер
│   ├── image-gallery.html                Галерея изображений (свайп)
│   ├── image-zoom.html                   Изображение с зумом по клику
│   ├── icon-block.html                   SVG/Lucide иконка
│   ├── icon-with-text.html               Иконка + текст горизонтально
│   ├── avatar.html                       Аватар пользователя
│   ├── avatar-group.html                 Группа аватаров (social proof)
│   ├── video-embed.html                  Встроенное видео (YouTube, Vimeo)
│   ├── video-autoplay.html               Автоплей видео (mp4, webm)
│   ├── lottie-animation.html             Lottie анимация
│   ├── gif-block.html                    GIF изображение
│   └── logo.html                         Логотип (SVG/PNG, настраиваемый размер)
│
├── interactive/                          ── ИНТЕРАКТИВНЫЕ ──
│   ├── button-primary.html               Основная CTA-кнопка
│   ├── button-secondary.html             Второстепенная кнопка
│   ├── button-outline.html               Кнопка с обводкой
│   ├── button-ghost.html                 Прозрачная кнопка
│   ├── button-icon.html                  Кнопка с иконкой
│   ├── button-loading.html               Кнопка с анимацией загрузки
│   ├── button-gradient.html              Кнопка с градиентом
│   ├── button-floating.html              Фиксированная кнопка (sticky bottom)
│   ├── button-group.html                 Группа кнопок (2-3 горизонтально)
│   ├── option-list-vertical.html         Список опций (вертикальный)
│   ├── option-list-horizontal.html       Список опций (горизонтальный)
│   ├── option-list-with-icons.html       Список опций с иконками
│   ├── option-list-with-images.html      Список опций с аватарками
│   ├── option-list-with-description.html Опции с описанием
│   ├── option-list-multi-select.html     Мультивыбор (чекбоксы)
│   ├── option-tiles-2x2.html             Тайлы 2×2 с картинками
│   ├── option-tiles-3x1.html             Тайлы 3×1 горизонтально
│   ├── option-tiles-2x1.html             Тайлы 2×1 (большие)
│   ├── option-tiles-image-only.html      Тайлы только картинки (квиз)
│   ├── option-slider.html                Ползунок (slider) с значением
│   ├── option-range.html                 Диапазон (от-до)
│   ├── option-rating-stars.html          Рейтинг звёздами
│   ├── option-rating-emoji.html          Рейтинг эмодзи (😡😐😊)
│   ├── option-nps.html                   NPS-шкала (0-10)
│   ├── toggle-switch.html                Переключатель (вкл/выкл)
│   ├── accordion-item.html               Аккордеон (разворачиваемый)
│   ├── tab-group.html                    Табы (переключение контента)
│   ├── swipeable-cards.html              Карточки со свайпом (Tinder-стиль)
│   ├── countdown-timer.html              Обратный отсчёт (HH:MM:SS)
│   ├── progress-steps.html               Шаги прогресса (1/5, 2/5...)
│   └── link-text.html                    Текстовая ссылка
│
├── layout/                               ── МАКЕТ ──
│   ├── container.html                    Контейнер (max-width, центровка)
│   ├── container-narrow.html             Узкий контейнер (360px)
│   ├── container-wide.html               Широкий контейнер (640px)
│   ├── flex-row.html                     Flex строка (горизонтальный)
│   ├── flex-column.html                  Flex колонка (вертикальный)
│   ├── grid-2col.html                    CSS Grid 2 колонки
│   ├── grid-3col.html                    CSS Grid 3 колонки
│   ├── grid-auto.html                    CSS Grid авто-fill
│   ├── card.html                         Карточка (с тенью и скруглением)
│   ├── card-bordered.html                Карточка с рамкой
│   ├── card-gradient.html                Карточка с градиентным фоном
│   ├── card-image-top.html               Карточка с картинкой сверху
│   ├── card-horizontal.html              Горизонтальная карточка
│   ├── hero-image-bg.html                Hero с фоновым изображением
│   ├── hero-split.html                   Hero split (текст + картинка)
│   ├── hero-centered.html                Hero центрированный
│   ├── hero-video-bg.html                Hero с видео-фоном
│   ├── section-colored.html              Секция с цветным фоном
│   ├── section-gradient.html             Секция с градиентом
│   ├── sticky-bottom.html                Липкий блок снизу (CTA)
│   ├── sticky-top.html                   Липкий блок сверху (header)
│   ├── modal-popup.html                  Модальное окно
│   ├── bottom-sheet.html                 Нижний выдвижной лист (мобильный)
│   ├── overlay.html                      Оверлей (полупрозрачный фон)
│   └── collapsible-section.html          Сворачиваемая секция
│
├── form/                                 ── ФОРМЫ ──
│   ├── input-text.html                   Текстовое поле
│   ├── input-text-floating-label.html    Текстовое поле с всплывающей подписью
│   ├── input-email.html                  Поле email с валидацией
│   ├── input-email-with-chips.html       Email с чипами доменов (@gmail...)
│   ├── input-phone.html                  Телефон с маской и флагом
│   ├── input-phone-international.html    Телефон с выбором страны
│   ├── input-password.html               Пароль (show/hide)
│   ├── input-number.html                 Числовое поле
│   ├── input-date.html                   Дата (date picker)
│   ├── input-time.html                   Время
│   ├── input-url.html                    URL
│   ├── textarea.html                     Многострочное поле
│   ├── select-dropdown.html              Выпадающий список
│   ├── select-searchable.html            Поиск + выпадающий список
│   ├── select-country.html               Выбор страны (с флагами)
│   ├── checkbox.html                     Чекбокс
│   ├── checkbox-group.html               Группа чекбоксов
│   ├── radio-group.html                  Радио-кнопки
│   ├── file-upload.html                  Загрузка файла
│   ├── image-upload.html                 Загрузка изображения с превью
│   ├── consent-checkbox.html             Чекбокс согласия (Terms, Privacy)
│   ├── form-group.html                   Группа полей (label + input + error)
│   ├── form-2col.html                    Форма в 2 колонки
│   └── form-validation-message.html      Сообщение об ошибке валидации
│
├── payment/                              ── ПЛАТЕЖИ ──
│   ├── paywall-3plans.html               Пэйвол с 3 планами
│   ├── paywall-2plans.html               Пэйвол с 2 планами
│   ├── paywall-single.html               Пэйвол с 1 планом
│   ├── paywall-comparison.html           Сравнительная таблица планов
│   ├── plan-card-vertical.html           Карточка плана (вертикальная)
│   ├── plan-card-horizontal.html         Карточка плана (горизонтальная)
│   ├── plan-card-featured.html           Выделенный план (POPULAR)
│   ├── price-tag.html                    Ценник (старая цена / новая)
│   ├── price-tag-per-day.html            Цена за день ($0.33/day)
│   ├── discount-banner.html              Баннер скидки (sticky)
│   ├── discount-timer.html               Таймер скидки (обратный отсчёт)
│   ├── guarantee-badge.html              Бейдж гарантии (money-back)
│   ├── secure-payment-icons.html         Иконки безопасности (Visa, MC, SSL)
│   ├── trial-info.html                   Информация о триале
│   ├── subscription-terms.html           Условия подписки (мелкий шрифт)
│   └── checkout-button.html              Кнопка оплаты
│
├── social-proof/                         ── СОЦИАЛЬНОЕ ДОКАЗАТЕЛЬСТВО ──
│   ├── review-card.html                  Карточка отзыва (текст + звёзды)
│   ├── review-card-with-photo.html       Отзыв с фото автора
│   ├── review-carousel.html              Карусель отзывов (свайп)
│   ├── review-list.html                  Список отзывов
│   ├── rating-summary.html               Сводка рейтинга (4.8 из 5)
│   ├── rating-stars.html                 Звёзды рейтинга (настраиваемые)
│   ├── testimonial-quote.html            Цитата-отзыв
│   ├── testimonial-video.html            Видео-отзыв
│   ├── social-proof-counter.html         Счётчик ("12,453 users joined")
│   ├── social-proof-live.html            Live-уведомления ("John just signed up")
│   ├── trust-badges.html                 Бейджи доверия (As seen in...)
│   ├── partner-logos.html                Логотипы партнёров/СМИ
│   ├── before-after-result.html          Результат До/После
│   └── stats-counter.html                Статистика в цифрах (3 колонки)
│
├── navigation/                           ── НАВИГАЦИЯ ──
│   ├── progress-bar.html                 Прогресс-бар (горизонтальный)
│   ├── progress-bar-stepped.html         Пошаговый прогресс (1/5, 2/5)
│   ├── progress-circle.html              Круговой прогресс
│   ├── back-button.html                  Кнопка "Назад"
│   ├── breadcrumb.html                   Хлебные крошки
│   ├── step-indicator.html               Индикатор шагов (точки)
│   ├── header-simple.html                Простой хедер (лого + назад)
│   ├── header-with-progress.html         Хедер с прогресс-баром
│   └── footer-links.html                 Футер со ссылками (Terms, Privacy)
│
├── feedback/                             ── ОБРАТНАЯ СВЯЗЬ / СОСТОЯНИЯ ──
│   ├── loader-spinner.html               Спиннер загрузки
│   ├── loader-progress.html              Прогресс-бар загрузки (с процентами)
│   ├── loader-dots.html                  Точки загрузки (bouncing)
│   ├── loader-skeleton.html              Скелетон контента
│   ├── loader-analyzing.html             "Analyzing your results..." (шаги)
│   ├── success-checkmark.html            Галочка успеха (анимированная)
│   ├── error-message.html                Сообщение об ошибке
│   ├── empty-state.html                  Пустое состояние (иллюстрация)
│   ├── notification-toast.html           Тост-уведомление
│   ├── notification-banner.html          Баннер-уведомление (сверху)
│   ├── popup-modal.html                  Попап с контентом
│   ├── popup-confirm.html                Попап подтверждения (Да/Нет)
│   ├── popup-bottom-sheet.html           Нижний лист с опциями
│   └── confetti.html                     Конфетти (анимация успеха)
│
├── result/                               ── РЕЗУЛЬТАТЫ / ИТОГИ ──
│   ├── result-score.html                 Результат с числом/процентом
│   ├── result-chart-bar.html             Результат с bar-chart
│   ├── result-chart-pie.html             Результат с pie-chart
│   ├── result-chart-radar.html           Результат с radar-chart
│   ├── result-personality.html           Тип личности (карточка)
│   ├── result-comparison.html            Сравнение с другими (процентиль)
│   ├── result-category.html              Категория результата (+ описание)
│   ├── result-badge.html                 Бейдж достижения
│   └── result-share.html                 Поделиться результатом (соцсети)
│
├── legal/                                ── ЮРИДИЧЕСКИЕ ──
│   ├── terms-link.html                   Ссылка на Terms of Service
│   ├── privacy-link.html                 Ссылка на Privacy Policy
│   ├── cookie-consent.html               Баннер Cookie Consent
│   ├── gdpr-consent.html                 GDPR согласие
│   ├── age-verification.html             Подтверждение возраста (18+)
│   ├── disclaimer-text.html              Текст дисклеймера
│   └── unsubscribe-link.html             Ссылка на отписку
│
├── templates/                            ── ГОТОВЫЕ ЭКРАНЫ (полные) ──
│   ├── screen-welcome.html               Экран приветствия
│   ├── screen-gender-selection.html       Выбор пола
│   ├── screen-age-selection.html          Выбор возраста
│   ├── screen-quiz-text.html              Текстовый вопрос квиза
│   ├── screen-quiz-image-2x2.html         Вопрос с картинками 2x2
│   ├── screen-quiz-image-grid.html        Вопрос с сеткой картинок
│   ├── screen-quiz-slider.html            Вопрос со слайдером
│   ├── screen-result-score.html           Экран результата (процент)
│   ├── screen-result-type.html            Экран результата (тип)
│   ├── screen-loader-analysis.html        Loader с анализом
│   ├── screen-loader-popups.html          Loader с попапами
│   ├── screen-email-capture.html          Сбор email
│   ├── screen-phone-capture.html          Сбор телефона
│   ├── screen-name-capture.html           Сбор имени
│   ├── screen-paywall-3plans.html         Пэйвол с 3 планами
│   ├── screen-paywall-timer.html          Пэйвол с таймером скидки
│   ├── screen-paywall-trial.html          Пэйвол с триалом
│   ├── screen-success-purchase.html       Успешная покупка
│   ├── screen-upsell.html                 Допродажа
│   ├── screen-onboarding-progress.html    Онбординг с прогрессом
│   └── screen-404.html                    Страница не найдена
│
└── imported/                             ── ПОЛЬЗОВАТЕЛЬСКИЕ ──
    └── (сюда падают загруженные пользователем .html файлы)
```

**Итого: ~170+ компонентов** в 10 категориях. Каждый компонент — отдельный `.html` файл с мета-комментарием, встроенными стилями и data-атрибутами для парсера.

> **Важно:** Корневая папка `block-library/` — это библиотека HTML-блоков воронок. Не путать с `src/components/` — это React-компоненты UI самого редактора.

---

## 10. Добавление новых компонентов через HTML-файлы

### 10.1 Формат файла компонента

```html
<!--
  @component: option-list
  @category: interactive
  @tags: survey, options, selection
  @description: Vertical list of selectable options
  @thumbnail: /thumbnails/option-list.png
  @version: 1.0
-->
<div class="funnel-options"
     data-component="option-list"
     data-component-category="interactive"
     data-component-tags="survey,options">

  <button class="funnel-option"
          data-element-type="option"
          data-value=""
          data-navigate-to=""
          data-editable="true">
    Option text
  </button>

  <button class="funnel-option"
          data-element-type="option"
          data-value=""
          data-navigate-to=""
          data-editable="true">
    Option text
  </button>
</div>

<style>
  /* Стили компонента — будут парситься */
  .funnel-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  .funnel-option {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    background: var(--card-bg, #fff);
    border: 2px solid var(--border-tile, #e5e7eb);
    border-radius: var(--radius-sm, 12px);
    cursor: pointer;
    font-size: var(--option-font, 16px);
    transition: var(--transition, all 0.2s ease);
  }
</style>
```

### 10.2 Парсер компонентов

```javascript
class ComponentParser {
  /**
   * Парсит HTML-файл компонента и возвращает ComponentDefinition
   */
  static parse(htmlString) {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');

    // 1. Извлечь мета-данные из HTML-комментария
    const meta = this.parseMetaComment(htmlString);

    // 2. Извлечь основной HTML (без <style> и <script>)
    const mainElement = doc.body.firstElementChild;

    // 3. Извлечь стили
    const styles = this.parseStyles(doc);

    // 4. Извлечь скрипты
    const scripts = this.parseScripts(doc);

    // 5. Рекурсивно построить дерево элементов
    const elementTree = this.buildElementTree(mainElement);

    return {
      meta,
      html: mainElement.outerHTML,
      styles,
      scripts,
      elementTree
    };
  }

  static parseMetaComment(html) {
    const commentMatch = html.match(/<!--\s*([\s\S]*?)-->/);
    if (!commentMatch) return {};
    const lines = commentMatch[1].split('\n');
    const meta = {};
    for (const line of lines) {
      const match = line.match(/@(\w+):\s*(.+)/);
      if (match) meta[match[1]] = match[2].trim();
    }
    return meta;
  }

  static buildElementTree(node) {
    return {
      tag: node.tagName.toLowerCase(),
      id: node.id || null,
      classes: [...node.classList],
      attributes: this.getDataAttributes(node),
      styles: this.getInlineStyles(node),
      content: node.childNodes.length === 1 &&
               node.childNodes[0].nodeType === 3
                 ? node.textContent.trim() : null,
      children: [...node.children].map(child =>
        this.buildElementTree(child)
      )
    };
  }
}
```

### 10.3 Drag & Drop компонентов из файла

```
1. Пользователь перетаскивает .html файл в область билдера
2. File API читает содержимое
3. ComponentParser.parse() создаёт ComponentDefinition
4. Компонент добавляется в /block-library/imported/
5. Появляется в библиотеке блоков (левая панель)
6. Можно перетащить на экран
```

---

## 11. Критические точки фронтенда

### 11.1 Performance

| Проблема | Решение |
|----------|---------|
| Много экранов на карте (50+) | Виртуализация: рендерить только видимые экраны |
| Тяжёлые CSS-вычисления | Throttle/debounce при изменении стилей |
| Большие HTML-файлы | Lazy parsing — парсить только при открытии |
| Undo/Redo стэк | Ограничить до 100 шагов, хранить только diff |
| SVG-связи | Пересчитывать только при изменении позиций |

### 11.2 Data Flow (однонаправленный)

```
Elements Tree (source of truth)
      │
      ├──► UI Panel (читает styles/content, записывает обратно в tree)
      ├──► HTML Generator (генерирует HTML в transient cache для preview и экспорта)
      └──► Live Preview (рендерит сгенерированный HTML в sandboxed iframe)

Developer Mode (обратный поток — ТОЛЬКО при Ctrl+S):
  Monaco HTML → Parser → Elements Tree → обновляются панели и preview

Приоритет стилей (каскад):
  1. inline (element-level) — ВЫСШИЙ приоритет
  2. [data-screen="X"] правила — per-screen
  3. :root CSS-переменные — глобальные
  4. Компонентные классы (.funnel-option) — дефолты
```

### 11.3 Контейнеры и вложенность

```html
<!-- Максимально 4 уровня вложенности для простоты -->
<main data-screen>                    <!-- L0: Screen -->
  <div class="funnel-container">      <!-- L1: Container -->
    <div class="funnel-card">         <!-- L2: Card -->
      <h1>Title</h1>                  <!-- L3: Element -->
      <div class="funnel-options">    <!-- L3: Group -->
        <button>Option</button>       <!-- L4: Element (max) -->
      </div>
    </div>
  </div>
</main>
```

### 11.4 Responsive Preview

```javascript
const PREVIEW_SIZES = {
  mobile: { width: 375, height: 812, label: 'iPhone' },
  tablet: { width: 768, height: 1024, label: 'iPad' },
  desktop: { width: 1440, height: 900, label: 'Desktop' }
};
```

### 11.5 Экспорт

```
Два формата экспорта:
1. Single-file (Heyflow-стиль) — один HTML со всеми экранами
   - Все экраны как <section>, навигация через JS
   - Встроенные CSS и JS
   
2. Multi-file (IQ-US-стиль) — отдельные HTML для каждого экрана
   - Общий global.css
   - Общий api.js
   - Данные через URL query params

Безопасность экспорта:
- CSP (Content-Security-Policy) генерируется автоматически на основе используемых интеграций
  (Stripe → js.stripe.com, GA4 → googletagmanager.com, Meta Pixel → connect.facebook.net и т.д.)
- Мета-комментарий с ID проекта для отслеживания копий:
  <!-- Built with FunnelBuilder | Project: {projectId} -->
- Secret keys платёжных провайдеров (PAYMENT_SECRET_*) никогда не попадают в экспортированный HTML — только public keys из meta.paymentCredentials[].publicKey
```

### 11.6 На что обратить внимание

1. **z-index management** — панели, модалки, тулбары, контекстные меню, dropdown'ы
2. **Focus management** — Tab navigation внутри панелей, Escape для закрытия
3. **Responsive панели** — на маленьких экранах панели должны становиться overlay
4. **Color picker** — нужен кастомный или библиотечный (для стилей) + пипетка в панель инструментов (*КАК В МИРО)
5. **Undo/Redo границы** — какие действия undoable, а какие нет
6. **Auto-save** — IndexedDB + debounce 2 секунды
7. **Copy/Paste** — между экранами, между воронками, между элементами-компонентами
8. **Drag preview** — при перетаскивании блока показывать ghost-элемент
9. **Drop zones** — подсветка допустимых зон при drag
10. **Collision detection** — экраны не должны накладываться на карте 
11. **Multi-select** — выбор нескольких экранов/элементов для групповых операций
12. **Context menu** — правая кнопка на экране/элементе

### 11.7 Политика безопасности: пользовательский код и HTML

Поля `customScript`, `onEnter`, `onLeave` (ScreenCustomJs), `extraHead` (ScreenCustomHead), `headCode` (analytics), элемент `raw-html` — точки ввода произвольного кода. Это осознанный выбор (билдер воронок без custom JS бесполезен), но требует формализованных правил.

**Модель угроз по стадиям проекта:**

```
v1 (локальный редактор, один пользователь):
  Угроза:  Импорт вредоносного HTML-файла (шаблон от третьего лица)
  Защита:  Sandboxed iframe для preview (достаточно)

v2 (шаринг проектов / шаблонов между пользователями):
  Угроза:  XSS через чужой проект/шаблон, кража данных из редактора
  Защита:  Sandbox + отдельный origin для preview + санитизация при импорте

v3 (хостинг + публикация воронок):
  Угроза:  XSS на опубликованных страницах, обход CSP, атака на посетителей воронки
  Защита:  Строгий CSP при экспорте + SRI для CDN-скриптов + серверная валидация
```

**Preview iframe (все версии):**
```html
<iframe
  sandbox="allow-scripts allow-forms allow-popups"
  src="about:srcdoc"
  referrerpolicy="no-referrer"
/>
```
- `allow-same-origin` **НЕ включён** — iframe не имеет доступа к localStorage/IndexedDB редактора
- Контент передаётся через `srcdoc` или Blob URL с уникальным origin
- Preview никогда не шарит origin с основным приложением

**Санитизация при импорте HTML (v2+):**
```
Разрешено:                          Блокируется при импорте шаблона:
─ inline styles                     ─ <script> с внешним src (fetch/XHR)
─ <style> блоки                     ─ javascript: в href/src/action
─ data-* атрибуты                   ─ on* event handlers (onclick, onerror...)
─ классы и id                       ─ <meta http-equiv="refresh">
─ <script> с inline кодом           ─ <base> тег
  (переносится в customScript,      ─ <form action="..."> с внешним URL
   пользователь видит и решает)
```
Импортированный `<script>` не выполняется молча — он извлекается в поле `customScript` экрана и показывается пользователю в редакторе кода для ревью.

**CSP при экспорте (автоматическая генерация):**
```
Базовый CSP:
  default-src 'self';
  script-src  'self' 'unsafe-inline';
  style-src   'self' 'unsafe-inline';
  img-src     'self' data: blob:;
  connect-src 'self';
  frame-src   'none';

Расширения по интеграциям (добавляются автоматически):
  GA4         → script-src googletagmanager.com; connect-src google-analytics.com
  Meta Pixel  → script-src connect.facebook.net; img-src facebook.com
  Stripe      → script-src js.stripe.com; frame-src js.stripe.com
  GTM         → script-src googletagmanager.com
```

**SRI (Subresource Integrity) при экспорте:**
Для всех внешних `<script src="...">` в экспортированном HTML генерируется `integrity` атрибут с SHA-384 хешем ресурса — защита от подмены CDN.

---

## 12. Принятые решения

### Архитектура

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Single-file vs Multi-file | **Multi-file**: React + Vite + TypeScript. Модульная архитектура, каждый компонент/хук/сервис в отдельном файле. |
| 2 | Бэкенд | **Сначала фронтенд** на локальной файловой системе, затем переносим на бэкенд. Формат хранения — подготовлен к серверной миграции. |
| 3 | Шаблоны экранов | Готовые HTML-файлы в папке `/block-library/templates/`. Пользователь присылает HTML от нейросетей — парсер подхватывает. |
| 4 | Формат проекта | **Dual-format**: JSON с `schemaVersion` (state для редактора) + экспорт в ZIP (HTML-файлы для площадок пролива трафика). ZIP содержит: HTML-файлы, CSS, JS, assets — готовый к деплою. |
| 5 | Live Preview | **Inline** (split-view) с кнопкой "Открыть в браузере" (генерация Blob URL или localhost). |
| 6 | Редактор кода | **Monaco Editor** (ядро VSCode) — полная подсветка, IntelliSense, автодополнение. |
| 7 | Drag & Drop | **`@dnd-kit/core` + `@dnd-kit/sortable`** (stable API, 8.7M downloads/week). Новый API (`@dnd-kit/react` v0.3) — pre-1.0 с багами keyboard nav и type exports. Переоценить при выходе v1.0. |
| 8 | Коллаборация | Один пользователь сейчас. **Примечание**: Immer patches и CRDT (Yjs/Automerge) — фундаментально разные подходы. Переход на CRDT потребует замены persistence-слоя, а не надстройки. Для v1 достаточно нормализованного стейта — он упростит будущую миграцию на CRDT, но не обеспечит её автоматически. |
| 9 | Передача данных | **Гибридный подход** (см. раздел 12.1 ниже). |
| 10 | Аналитика | **Встроенная базовая** + интеграция с внешними (см. раздел 12.2 ниже). |
| 11 | Платежи | Несколько провайдеров. Фронтенд — только UI/UX + абстрактный интерфейс подключения. Реализация на бэкенде. **Локализация цен**: `PaymentPlan.localizedPricing[locale]` — маркетинговая цена + checkout URL + валюта per-locale. Провайдер per-locale: `ScreenPayment.localeProviders`. |
| 12 | Библиотека блоков | **Расширяемая**: фильтрация по дате/имени/тегам, создание папок, импорт из URL и npm. Ленивая загрузка из внешних источников. |
| 13 | Анимации | **Да, базовые**: fade, slide-left, slide-up, slide-down, zoom-in. CSS-only, без тяжёлых библиотек. |
| 14 | Платформа | **Только desktop**. Минимальное разрешение: 1280×720. |
| 15 | i18n | **Да** — два уровня: `locales/` для UI билдера (react-i18next), `element.i18n` + `localizedPricing` для контента воронки. Manager Mode = Localization Hub с табами Preview/Translations/Payments. AI-перевод через DeepL + GPT-5. (см. раздел 12.3). |
| 16 | Source of truth | **Elements tree** — единственный источник правды. HTML генерируется из дерева. В developer mode HTML парсится обратно при сохранении (Ctrl+S). |
| 17 | Undo/Redo | **Immer patches** (`produceWithPatches`). Хранятся diff'ы (КБ), не снапшоты (МБ). Лимит 100 шагов. |
| 18 | Условия (conditions) | **Структурированные ConditionGroup** с AND/OR логикой. Не сырые JS-строки. Безопасно, валидируемо, UI-билдер условий. |
| 19 | A/B тесты | **ABTestConfig** — `{ experimentId, variant, weight }`. Произвольное кол-во вариантов и экспериментов, весовое распределение трафика. |
| 20 | Canvas (карта экранов) | **React Flow** (@xyflow/react). Встроенный pan/zoom/minimap/controls. Без кастомного кода навигации. |
| 21 | Вдохновение (Style Manager) | Подход из **GrapesJS** Style Manager: парсит HTML → GUI стили → обновляет при изменении. Адаптируем архитектуру, не используем как зависимость. |
| 22 | HTML Cache | **Transient** — не хранится в `Screen`, не участвует в undo/redo. Генерируется лениво в runtime `Map<screenId, string>`. |
| 23 | Формат проекта (persistence) | **ProjectDocument** — обёртка: `{ id, schemaVersion, createdAt, updatedAt, thumbnail, assets, funnel }`. Канонический формат для IndexedDB, API, миграций. |
| 24 | Ассеты | **Asset manifest** с дедупликацией по SHA-256 hash. Ссылки через `asset://{id}`. Три storage-стратегии: inline (data URL), local (IndexedDB blob), remote (CDN). |
| 25 | ID элементов | **`{type}-{nanoid(8)}`** — уникальные, не semantic. Экраны — user-editable slug с валидацией и каскадным SCREEN_RENAME. Детали: секция 6.7. |
| 26 | Аналитика (формат) | **Расширяемый**: `analytics.integrations[]` вместо хардкод-полей ga4Id/pixelId. Добавление провайдера не требует миграции схемы. |
| 27 | funnel.* API | **Версионированный**: `funnelApiVersion` в FunnelMeta. SDK эволюционирует, старые воронки подключают совместимую версию. |
| 28 | Preview sandbox | **Sandboxed iframe** без `allow-same-origin` — отдельный origin, нет доступа к storage редактора. Детали: секция 11.7. |
| 29 | Каталоги | `src/components/` = React UI редактора. `block-library/` = HTML-компоненты воронок. Чёткое разделение, нет конфликта имён. |
| 30 | Package manager | **pnpm** — lock-файл `pnpm-lock.yaml`, Dockerfile через `corepack enable`. |
| 31 | Типы элементов | **`FunnelElement`** (не `Element`) — избегаем конфликта с DOM-типом TypeScript. |
| 32 | Element Indexes | **`elementIndexes.byScreen` / `.byParent`** — O(1) lookup, пересчитываются при мутациях. Не персистятся. |
| 33 | Connection priority | **`priority` + `isDefault`** на каждом Connection. Определяет порядок проверки условий и fallback при ветвлениях. |
| 34 | CSS Variables | **Типизированные** через `CSSVariableName` union type. `--custom-*` для пользовательских переменных. |
| 35 | Серверная безопасность | **helmet** + **express-rate-limit** + **CORS с origin**. Secret keys платёжных провайдеров (PAYMENT_SECRET_*) — только на бэкенде, маппинг по `credentialsId`. Public keys — в стейте воронки (`meta.paymentCredentials`). |
| 36 | CSP при экспорте | Автоматическая генерация CSP + SRI для внешних скриптов. Базовый CSP + расширения по интеграциям. Детали: секция 11.7. |
| 37 | CSS билдера | **CSS Modules** — zero runtime cost, scoped классы, нативная поддержка Vite. `Component.module.css` рядом с каждым `.tsx`. Не конфликтует с `funnel-*` классами воронок. |
| 38 | Тестирование | **Vitest** v4.1 (34.6M downloads/week) + **happy-dom** (default) / jsdom (CSS-парсер). Конфиг в `vite.config.ts`. |
| 39 | IndexedDB | **Dexie.js** v4.3 (multiple object stores, индексы, blob storage, транзакции). Не `idb-keyval` (примитивный get/set без структуры). |
| 40 | ID генерация | **nanoid** v5.1 (118B, 103M downloads/week). Формат: `{type}-{nanoid(8)}`. Для проектов — UUID v4 (`crypto.randomUUID()`). |
| 41 | Screen overrides | **`Partial<Record<CSSVariableName, string>>`** — переопределение ЛЮБОЙ глобальной CSS-переменной per-screen через GUI, не 5 фиксированных полей. |
| 42 | Connection resolution | Условные → по priority ASC, first match wins → fallback на единственный isDefault → null (тупик). Детали: секция 7.5. |
| 43 | Auto progress | По **default path** (isDefault connections от start до end). Ветки — от прогресса ближайшего предка. Детали: секция 7.6. |
| 44 | Root state | **`AppState`** = `{ project: ProjectDocument, ui: UIState, history: HistoryState, elementIndexes: ElementIndexes }`. Тип + actions в `src/types/store.ts`. |

### 12.1 Передача данных между экранами — гибридный подход

Лучшее решение на рынке — комбинация трёх механизмов:

```
┌────────────────────────────────────────────────────────────┐
│  Уровень 1: sessionStorage (основное хранилище)            │
│  ─ Все ответы пользователя                                │
│  ─ Персистентность в рамках вкладки                       │
│  ─ Автоматически очищается при закрытии                    │
│  ─ Не ограничен длиной URL                                │
│  ─ Безопаснее URL params (не виден в логах/аналитике)     │
├────────────────────────────────────────────────────────────┤
│  Уровень 2: URL params (для навигации и шаринга)          │
│  ─ Текущий экран: ?screen=age                              │
│  ─ UTM-метки: &utm_source=facebook                         │
│  ─ Deep-linking: воспроизводимые ссылки                   │
│  ─ Только несенситивные данные                            │
├────────────────────────────────────────────────────────────┤
│  Уровень 3: In-memory store (Zustand) — runtime           │
│  ─ UI-состояние (выбранный план, открытый попап)           │
│  ─ Computed значения (scores, conditions)                  │
│  ─ Синхронизируется с sessionStorage при переходах        │
└────────────────────────────────────────────────────────────┘
```

API для пользовательского JS (аналог Fox API):

```javascript
// funnel.inputs — чтение/запись ответов (sessionStorage)
funnel.inputs.get('age')           // "25-34"
funnel.inputs.set('score', 85)
funnel.inputs.getAll()             // { age: "25-34", gender: "female", ... }

// funnel.navigation — управление навигацией
funnel.navigation.goNext()
funnel.navigation.goBack()
funnel.navigation.goToId('paywall')

// funnel.params — URL параметры (read-only)
funnel.params.get('utm_source')    // "facebook"

// funnel.session — сессия
funnel.session.id                  // uuid
funnel.session.startedAt           // timestamp
```

### 12.2 Аналитика — как у конкурентов и что нужно нам

**Как работает у FunnelFox и Heyflow:**
- Встроенная аналитика: dashboard с просмотрами, конверсиями, drop-off по экранам
- A/B тесты со статистической значимостью
- Server-to-server webhooks для событий (purchases, sign-ups)
- Интеграции: GA4, Amplitude, Mixpanel, Meta Pixel, GTM
- Собственные события через API (`fox.trackCustom()`)

**Для площадок пролива трафика:**
Площадки (Facebook, Google, TikTok, Unity, ironSource и т.д.) предоставляют СВОЮ аналитику по трафику (показы, клики, установки, CPI). НО:
- Аналитика **внутри воронки** (какой экран, какой ответ, где drop-off) — это наша задача
- Мы **отдаём конверсии** площадкам через их пиксели/постбэки (server-to-server)
- Своя аналитика **имеет огромный смысл** — площадки не видят поведение внутри воронки

**Наш подход:**

```
Фронтенд (встроенный):
├── Автоматический трекинг screen_view при каждом переходе
├── Трекинг кликов (option-click, button-click)
├── Трекинг времени на экране
├── Drop-off по экранам (последний просмотренный экран)
└── Custom events через funnel.track()

Интеграции (пиксели площадок):
├── Meta Pixel (fbq) — через head code или config
├── Google Ads (gtag) — через head code
├── TikTok Pixel — через head code
├── GTM — контейнер через config
└── Custom webhooks — для postback к площадкам

Отправка данных:
├── Сейчас: в IndexedDB/console (для разработки)
├── Потом: на наш бэкенд (POST /api/events)
└── Потом: dashboard с визуализацией
```

### 12.3 Локализация контента воронки + локализация платежей

> **Узкая боль билдеров воронок:** ни один конкурент (FunnelFox, Heyflow, ClickFunnels) не даёт
> удобного способа локализовать воронку на другие языки **вместе с ценами и checkout-ссылками**.
> Менеджер вынужден вручную дублировать воронки под каждое гео — это O(N) работы и O(N) ошибок.
> Наше решение — **одна воронка, много локалей**, с единой точкой управления в Manager Mode.

---

#### 12.3.1 Два уровня i18n (НЕ пересекаются)

1. **`locales/`** — переводы **UI самого билдера** (react-i18next). Кнопки, лейблы, меню редактора.
2. **`element.i18n` + `localizedPricing`** — переводы и цены **контента воронки**. Хранятся в стейте проекта.

```
locales/                             ← UI билдера (НЕ контент воронки)
├── en/
│   └── common.json                  ← "Save", "Export", "Add Screen"...
├── de/
│   └── common.json
└── es/
    └── common.json
```

Переводы контента НЕ дублируются на уровне экрана — только `element.i18n`.
Для экранных мета-строк (title для SEO) используется `screen.customHead.ogTitle` + `screen.customHead.i18n`.

---

#### 12.3.2 Расширение модели данных для локализации платежей

**Проблема текущей модели:** `PaymentPlan.currency` — одна строка, `checkoutUrls` — плоский словарь.
Нет привязки цен и checkout-ссылок к локали. На практике одна воронка работает на несколько гео:
- **Своя маркетинговая цена** (не конвертация — $9.99 / €8.99 / 749₽)
- **Свой checkout URL** (разные продукты в Stripe/Paddle для разных валют)
- **Свой провайдер** (Stripe для US/EU, Paddle для других гео)
- **Свои платёжные реквизиты** — под каждое гео может быть **отдельный Stripe/Paddle аккаунт** с другими API-ключами (например: US-аккаунт Stripe для долларовых платежей, EU-аккаунт для евро, отдельный Paddle-аккаунт для стран без Stripe). Менеджер должен быстро назначать нужный набор API-ключей под каждое гео
- **Несколько видов платёжных реквизитов (под каждое гео может быть разное), которые мы настраиваем**

```typescript
// ── Локализованная цена для конкретного гео ──

interface LocalizedPricing {
  currency: string;           // "USD", "EUR", "RUB"
  price: number;              // 9.99 (маркетинговая цена для этого гео)
  discount: number;           // 0-100 (может отличаться от дефолтной — другой маркетинг)
  checkoutUrl: string;        // полный URL чекаута для этой валюты/продукта
  paymentCredentialsId: string;  // ← ссылка на набор API-ключей (см. PaymentCredentials ниже)
                                 //   Под каждое гео может быть отдельный аккаунт Stripe/Paddle
}

// ── Обновлённый PaymentPlan ──

interface PaymentPlan {
  id: string;
  name: string;
  price: number;              // ← дефолтная цена (для lang из meta)
  currency: string;           // ← дефолтная валюта
  period: string;
  discount: number;
  features: string[];
  localizedPricing: Record<string, LocalizedPricing>;
  //                         ↑ ключ = locale code ("de", "es", "ru")
  //                         Если для локали нет записи — используются дефолтные price/currency
}
```

**Обратная совместимость:** старые проекты просто не имеют `localizedPricing` (пустой объект `{}`). Дефолтные `price`/`currency` работают как раньше.

**Платёжные реквизиты (API-ключи) per-гео:**

```typescript
// ── Набор API-ключей для одного платёжного аккаунта ──

interface PaymentCredentials {
  id: string;                 // "cred-us-stripe", "cred-eu-stripe", "cred-ru-paddle"
  label: string;              // "Stripe US", "Stripe EU", "Paddle RU" — человекочитаемое
  provider: 'stripe' | 'paddle' | 'custom';
  publicKey: string;          // публичный ключ (безопасно хранить на фронтенде)
  secretKeyRef: string;       // ID секрета на бэкенде (НЕ сам ключ — см. безопасность ниже)
  webhookUrl: string;         // URL для вебхуков этого аккаунта
}
```

> **Безопасность:** `secretKeyRef` — это **НЕ секретный ключ**, а ссылка на него на бэкенде.
> Фронтенд никогда не видит secret key. Бэкенд хранит маппинг `secretKeyRef → actual secret`
> в env-переменных или vault. Фронтенд передаёт `secretKeyRef` в API-запросах,
> бэкенд подставляет реальный ключ при обращении к Stripe/Paddle.

**Хранение реквизитов** — на уровне `FunnelMeta` (глобально для воронки):

```typescript
interface FunnelMeta {
  // ... существующие поля
  paymentCredentials: PaymentCredentials[];
  //                  ↑ все доступные наборы API-ключей для этой воронки
  //                  Менеджер создаёт набор: "Stripe US" → publicKey + secretKeyRef
  //                  Затем привязывает набор к локали через localizedPricing.paymentCredentialsId
}
```

**Провайдер per-locale** — на уровне `ScreenPayment`:

```typescript
interface ScreenPayment {
  paymentProvider: 'stripe' | 'paddle' | 'custom';  // ← дефолтный провайдер
  defaultCredentialsId: string;                      // ← дефолтный набор API-ключей
  plans: PaymentPlan[];
  trialDays: number;
  moneyBackDays: number;
  timerEnabled: boolean;
  timerDuration: number;
  checkoutUrls: Record<string, string>;              // ← legacy, вычисляется из localizedPricing
  localeProviders: Record<string, 'stripe' | 'paddle' | 'custom'>;
  //               ↑ переопределение провайдера per-locale
  //               Если для локали нет записи — используется дефолтный paymentProvider
}
```

**Как это работает в runtime:**

```
1. Определить locale пользователя (navigator.language / geo-IP / URL param)
2. Найти localizedPricing[locale] для каждого плана
3. Из localizedPricing достать paymentCredentialsId
4. По paymentCredentialsId найти PaymentCredentials в meta.paymentCredentials[]
5. Использовать publicKey для инициализации Stripe.js / Paddle.js на фронтенде
6. При создании чекаута — бэкенд подставляет secret key по secretKeyRef
```

**Локализация мета-строк экрана** (OG-теги для SEO):

```typescript
interface ScreenCustomHead {
  metaTags: Array<{ name: string; content: string }>;
  ogTitle: string;
  ogImage: string;
  ogDescription: string;
  extraHead: string;
  i18n: Record<string, { ogTitle: string; ogDescription: string }>;
  //    ↑ ключ = locale code. ogImage обычно не меняется по локалям.
}
```

---

#### 12.3.3 Manager Mode — Localization Hub (центр локализации)

Manager Mode трансформируется из плейсхолдера в **основной инструмент менеджера** для работы с контентом, переводами и платёжками. Три таба в центральной области:

```
┌──────────────┬──────────────────────────────────────────┬────────────────┐
│  Screens     │              Center Area                 │  Right Panel   │
│              │                                          │                │
│  [🇺🇸 en ▼]  │  ┌─ Tabs ──────────────────────────┐    │  Translation   │
│              │  │ Preview │ Translations │ Payments │    │  Status        │
│ ● Gender     │  └────────┴──────────────┴──────────┘    │                │
│   Age        │                                          │  🇺🇸 en: 100%  │
│   Start      │  (содержимое зависит от активного таба)  │  🇩🇪 de:  87%  │
│   Brain      │                                          │  🇪🇸 es:  62%  │
│   Paywall    │                                          │  🇫🇷 fr:   0%  │
│              │                                          │                │
│              │                                          │ ── Payment ──  │
│              │                                          │  🇺🇸 $9.99 ✓   │
│              │                                          │  🇩🇪 €8.99 ✓   │
│              │                                          │  🇪🇸 €8.99 ✓   │
│              │                                          │  🇫🇷 —    ✗    │
└──────────────┴──────────────────────────────────────────┴────────────────┘
```

**Left Panel — Screen List + Locale Switcher:**

Над списком экранов — дропдаун текущей просматриваемой локали. Это **UI-only** состояние (`UIState.previewLocale`), НЕ данные воронки. Переключение локали мгновенно обновляет Preview и подсвечивает пропущенные переводы.

```typescript
// В UIState добавить:
interface UIState {
  // ... существующие поля
  previewLocale: string;       // текущая просматриваемая локаль в manager mode
  managerTab: 'preview' | 'translations' | 'payments';  // активный таб
}
```

---

#### 12.3.4 Tab «Preview» — live-preview с переключением локали

Экран воронки рендерится в sandboxed iframe (см. секцию 11.7). При смене `previewLocale`:

1. Для каждого элемента: если `element.i18n[previewLocale]` есть — подставляется вместо `element.content`
2. Цены на paywall: `plan.localizedPricing[previewLocale]` → подставляются `price` + `currency`
3. Если перевода нет — элемент обводится **красной пунктирной рамкой** в preview (визуальный QA)
4. Если цены нет для локали — paywall показывает плейсхолдер «Price not configured for [locale]»

```
┌─ Preview ──────────────────────────────────┐
│  Device: [iPhone 14 ▼]  Locale: [🇩🇪 de ▼] │
│  ┌─────────────────────────────┐           │
│  │                             │           │
│  │  ┌─────────────────────┐   │           │
│  │  │  📱 Wähle dein      │   │           │
│  │  │     Geschlecht      │   │           │
│  │  │                     │   │           │
│  │  │  ┌───────────────┐  │   │           │
│  │  │  │   Weiblich    │  │   │           │
│  │  │  └───────────────┘  │   │           │
│  │  │  ┌───────────────┐  │   │           │
│  │  │  │   Männlich    │  │   │           │
│  │  │  └───────────────┘  │   │           │
│  │  └─────────────────────┘   │           │
│  └─────────────────────────────┘           │
└────────────────────────────────────────────┘
```

Менеджер может **кликать по элементам** в preview — это открывает inline-редактор перевода для этого элемента (попап рядом с элементом или фокус в правой панели).

---

#### 12.3.5 Tab «Translations» — таблица переводов экрана

Табличный вид всех переводимых элементов выбранного экрана:

```
┌──────────────────┬─────────────────────┬─────────────────────┬──────────────┐
│ Element          │ 🇺🇸 en (source)     │ 🇩🇪 de              │ 🇪🇸 es        │
├──────────────────┼─────────────────────┼─────────────────────┼──────────────┤
│ heading-xK9m     │ Choose your gender  │ Wähle dein Geschl.  │ ┈┈ empty ┈┈  │
│ button-Lm3n      │ Female              │ Weiblich            │ ┈┈ empty ┈┈  │
│ button-Qr5t      │ Male                │ Männlich            │ ┈┈ empty ┈┈  │
│ paragraph-Ab2c   │ Select to continue  │ Wählen zum Fortf.   │ ┈┈ empty ┈┈  │
└──────────────────┴─────────────────────┴─────────────────────┴──────────────┘
│ [🤖 AI Translate Missing]  [📥 Import CSV]  [📤 Export CSV]  [All Screens ▼]│
└─────────────────────────────────────────────────────────────────────────────┘
```

**Ключевые возможности:**

- **Inline-editing**: клик по ячейке → редактирование перевода прямо в таблице → сохранение в `element.i18n`
- **AI Translate Missing**: батч-перевод всех пустых ячеек через бэкенд API (см. 12.3.8)
- **Import/Export CSV**: для передачи переводчикам. Формат: `element_id | source_text | translation`
- **All Screens**: переключатель scope — один экран или все экраны воронки в одной таблице
- **Пустые ячейки** подсвечены жёлтым — визуальный сигнал «тут не переведено»
- **Фильтры**: показать только пустые / только изменённые после последнего AI-перевода

**Откуда берутся переводимые элементы:**

Все `FunnelElement` с `editable: true` и непустым `content` (или `attributes.placeholder`, `attributes.alt`). Элементы типа `spacer`, `divider`, `progress-bar` — исключаются автоматически.

---

#### 12.3.6 Tab «Payments» — локализация цен и checkout

Отображается **только** для экранов с `type: 'paywall'` или `payment !== null`. Для остальных экранов таб скрыт или показывает "No payment configured on this screen".

```
┌─────────────┬────────┬─────────┬──────────┬───────────────────────────────┬──────────────┐
│ Plan        │ Period │ Locale  │ Price    │ Checkout URL                  │ Credentials  │
├─────────────┼────────┼─────────┼──────────┼───────────────────────────────┼──────────────┤
│ Basic       │ 1 week │ 🇺🇸 en  │ $ 4.99   │ https://buy.stripe.com/aB1c.. │ Stripe US ▼  │
│             │        │ 🇩🇪 de  │ € 4.49   │ https://buy.stripe.com/xK9m.. │ Stripe EU ▼  │
│             │        │ 🇪🇸 es  │ € 4.49   │ ← same as DE                  │ Stripe EU ▼  │
│             │        │ 🇫🇷 fr  │ ┈ —  ┈   │ [Set up]                      │ [Select] ▼   │
├─────────────┼────────┼─────────┼──────────┼───────────────────────────────┼──────────────┤
│ Premium     │ 4 week │ 🇺🇸 en  │ $ 9.99   │ https://buy.stripe.com/Qr5t.. │ Stripe US ▼  │
│             │        │ 🇩🇪 de  │ € 8.99   │ https://buy.stripe.com/Lm3n.. │ Stripe EU ▼  │
│             │        │ 🇪🇸 es  │ € 8.99   │ https://buy.stripe.com/Lm3n.. │ Stripe EU ▼  │
│             │        │ 🇫🇷 fr  │ ┈ —  ┈   │ [Set up]                      │ [Select] ▼   │
└─────────────┴────────┴─────────┴──────────┴───────────────────────────────┴──────────────┘
│ [+ Add Locale Pricing]  [Copy from plan...]  [Validate All URLs]  [⚙ Manage Credentials] │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

**Кнопка «⚙ Manage Credentials»** — открывает модал/панель управления платёжными реквизитами:

```
┌──────────────────────────────────────────────────────┐
│ Payment Credentials                    [+ Add New]   │
├──────────────────────────────────────────────────────┤
│ 🔑 Stripe US     stripe   pk_live_51N...   ✓ active │
│ 🔑 Stripe EU     stripe   pk_live_82K...   ✓ active │
│ 🔑 Paddle RU     paddle   vnd_01H...       ✓ active │
│ 🔑 Paddle LATAM  paddle   vnd_03G...       ○ draft  │
└──────────────────────────────────────────────────────┘
```

Менеджер заводит набор реквизитов один раз, потом быстро назначает нужный из дропдауна в колонке Credentials.

**Workflow менеджера:**

1. **Завести реквизиты** — «⚙ Manage Credentials» → «+ Add New» → ввести label, выбрать provider, вставить public key → сохраняется в `meta.paymentCredentials[]`. Делается один раз, потом переиспользуется.
2. **Добавить локаль** — кнопка «+ Add Locale Pricing» → выбор из `meta.locales` → добавляет строку с пустыми полями
3. **Заполнить цену** — inline-edit ячейки Price → сохраняется в `plan.localizedPricing[locale].price`
4. **Вставить checkout URL** — менеджер копирует URL из Stripe/Paddle dashboard → вставляет в ячейку
5. **Назначить реквизиты** — дропдаун в колонке Credentials → выбрать нужный набор API-ключей → сохраняется в `plan.localizedPricing[locale].paymentCredentialsId`
6. **Validate All URLs** — проверка: HTTP HEAD-запрос на каждый URL → зелёная/красная иконка статуса
7. **Copy from plan** — копирует цены/URL/credentials из другого плана (часто одинаковые для Basic/Premium в одном гео)

**Визуальные сигналы:**
- ✓ зелёная — значение заполнено и валидно (цена / URL отвечает / credentials назначены)
- ✗ красная — значение пустое или невалидное
- ⚠ жёлтая — частично заполнено (например: цена есть, но URL пустой, или credentials не назначены)

---

#### 12.3.7 Right Panel — Translation & Payment Status

Правая панель в Manager Mode показывает **сводку по текущему экрану**:

```
┌──────────────────────────┐
│ 📊 Localization Status   │
├──────────────────────────┤
│                          │
│ ▸ Translations           │
│   🇺🇸 en: ████████ 100%  │
│   🇩🇪 de: ██████░░  87%  │
│   🇪🇸 es: ████░░░░  62%  │
│   🇫🇷 fr: ░░░░░░░░   0%  │
│                          │
│ ▸ Payment (Paywall only) │
│   🇺🇸 en: $9.99  ✓ ✓ ✓   │
│   🇩🇪 de: €8.99  ✓ ✓ ✓   │
│   🇪🇸 es: €8.99  ✓ ⚠ ✓   │
│   🇫🇷 fr: —      ✗ ✗ ✗   │
│        price url cred    │
│                          │
│ ▸ Overall Funnel         │
│   Total screens: 11      │
│   Fully translated: 7    │
│   Payment configured: 3/4│
│                          │
│ [🔍 Show Missing Only]   │
└──────────────────────────┘
```

**Формула процента:**
```
translationPercent[locale] = countOf(elements where i18n[locale] exists && i18n[locale] !== "")
                             / countOf(elements where editable === true && content !== "")
                             × 100
```

Клик по конкретной строке локали → переключает `previewLocale` и активирует таб Preview.

---

#### 12.3.8 AI Translation Pipeline (бэкенд API)

```
POST /api/translate
Content-Type: application/json

{
  "texts": [
    {
      "key": "heading-xK9m",
      "source": "Choose your gender",
      "context": "survey screen, onboarding quiz, casual tone"
    },
    {
      "key": "button-Lm3n",
      "source": "Female",
      "context": "gender selection button"
    }
  ],
  "sourceLang": "en",
  "targetLang": "de",
  "provider": "deepl",
  "funnelContext": {
    "type": "quiz",
    "audience": "US adults 18-45",
    "tone": "casual friendly"
  }
}

Response 200:
{
  "translations": [
    { "key": "heading-xK9m", "translation": "Wähle dein Geschlecht" },
    { "key": "button-Lm3n", "translation": "Weiblich" }
  ],
  "provider": "deepl",
  "tokensUsed": 42
}
```

**Маршрутизация провайдеров (на бэкенде):**

```
targetLang ∈ {de, fr, es, it, nl, pl, sv, pt} → DeepL API (лучшее качество для EU)
targetLang ∈ {ja, ko, zh, ar, hi, th, vi, id} → OpenAI GPT-5 (лучший контекст для азиатских)
targetLang ∈ {ru, tr}                          → DeepL (хорошее качество) или GPT-5 (по настройке)
```

**Batch-режим:** менеджер нажимает «AI Translate Missing» → фронтенд собирает все элементы без перевода для целевой локали → один POST-запрос → бэкенд разбивает на chunks по 50 строк → параллельные запросы к API → ответ записывается в `element.i18n[locale]`.

**Пост-обработка (на фронтенде после получения):**
- Проверка длины: если перевод >150% длины оригинала — ⚠ предупреждение (может не влезть в UI)
- HTML-entities: корректное сохранение `&amp;`, `&quot;`
- Placeholder-теги: если в оригинале `{name}` — проверить наличие в переводе

---

#### 12.3.9 Процесс работы менеджера (workflow)

```
1. Открыть воронку → Manager Mode (клавиша 2)

2. Настроить локали воронки:
   Правая панель → Meta → Locales: [en, de, es, fr] (мультиселект из SUPPORTED_LOCALES)
   → Добавленные локали появляются в Locale Switcher и таблице переводов

3. Перевести контент:
   a) Tab «Translations» → «AI Translate Missing» → выбрать целевой язык → перевести всё батчем
   b) Ручная корректировка: клик по ячейке → правка → Enter
   c) Или: Tab «Preview» → выбрать локаль → кликнуть по элементу с красной рамкой → ввести перевод

4. Настроить платёжные реквизиты:
   a) Tab «Payments» → «⚙ Manage Credentials»
   b) Завести наборы API-ключей: «Stripe US» (pk_live_...), «Stripe EU» (pk_live_...), «Paddle RU» (vnd_...)
   c) Делается один раз на воронку — потом переиспользуется для всех локалей

5. Настроить цены per-locale:
   a) Выбрать paywall-экран → Tab «Payments»
   b) «+ Add Locale Pricing» → выбрать de → ввести €8.99 → вставить Stripe EU checkout URL → выбрать «Stripe EU» credentials
   c) Повторить для каждой локали
   d) «Validate All URLs» → убедиться что все зелёные

6. Проверить результат:
   a) Tab «Preview» → переключать локали → визуально проверить тексты + цены + правильный провайдер
   b) Правая панель → «Show Missing Only» → убедиться что 100% для всех локалей
   c) Красные рамки в Preview = непереведённые элементы → исправить
   d) Payment Status в правой панели → все локали ✓ (цена + URL + credentials)

7. Экспорт:
   a) Экспорт ZIP: отдельные HTML per-locale (каждый файл — одна локаль, свои checkout URL и publicKey)
   b) Или single-file: runtime определение языка по navigator.language / geo-IP
```

---

#### 12.3.10 Экспорт локализованной воронки

**Multi-locale ZIP:**

```

export/
├── en/                              ← английская версия
│   ├── index.html
│   ├── gender.html
│   ├── paywall.html                 ← цены в USD, Stripe US checkout URLs
│   └── ...
├── de/                              ← немецкая версия
│   ├── index.html
│   ├── gender.html                  ← тексты на немецком
│   ├── paywall.html                 ← цены в EUR, Stripe EU checkout URLs
│   └── ...
├── css/
│   └── global.css
├── js/
│   ├── funnel-runtime.js
│   └── locale-router.js            ← определение языка + редирект
└── assets/
```

**`locale-router.js`** — лёгкий скрипт на входной `index.html`:

```javascript
// Определение локали (приоритет):
// 1. URL param: ?lang=de
// 2. Поддомен: de.quiz.example.com
// 3. navigator.language
// 4. geo-IP (через бэкенд, опционально)
// 5. Fallback: meta.lang (дефолт воронки)

const locale = detectLocale(supportedLocales);
window.location.replace(`./${locale}/index.html`);
```

**Single-file режим** (альтернатива): все переводы inline в HTML через `data-i18n` атрибуты, runtime JS переключает тексты. Подходит для простых воронок без платежей.

---

#### 12.3.11 Лучшие AI-переводчики для воронок

| Решение | Качество | Контекст | Цена | Рекомендация |
|---------|----------|----------|------|-------------|
| **DeepL API** | Отличное для EU-языков | Средний | $25/1M символов | DE, FR, ES, IT, NL, PL, SV, PT |
| **OpenAI GPT-5** | Отличное для всех | Высокий (funnelContext) | ~$10/1M tokens | Сложные/креативные тексты, азиатские языки |
| **Google Cloud Translation** | Хорошее | Низкий | $20/1M символов | Fallback для редких языков |

**Рекомендация:** DeepL для европейских языков + GPT-5 для остальных + ручная проверка ключевых экранов (paywall, CTA).

---

#### 12.3.12 Runtime: как воронка определяет локаль при прохождении

```
funnel.locale.current          // "de" — текущая локаль
funnel.locale.supported        // ["en", "de", "es"] — из meta.locales
funnel.locale.switch("es")     // переключить язык (перерендер текстов + цен)
funnel.locale.getCurrency()    // "EUR" — валюта текущей локали

// Элементы подставляют текст по приоритету:
// 1. element.i18n[currentLocale]  — если есть перевод
// 2. element.i18n[meta.lang]      — fallback на дефолтный язык
// 3. element.content              — последний fallback (source text)

// Цены подставляются по приоритету:
// 1. plan.localizedPricing[currentLocale]  — если есть
// 2. plan.price + plan.currency            — fallback на дефолт

// Платёжные реквизиты по приоритету:
// 1. plan.localizedPricing[currentLocale].paymentCredentialsId → meta.paymentCredentials[]
// 2. payment.defaultCredentialsId → meta.paymentCredentials[]
// 3. Нет credentials → ошибка (paywall не работает для этой локали)
```

---

## 13. Контейнеризация: Podman / Docker Compose

### 13.1 Почему Docker Compose как стандарт

- `docker-compose.yml` — универсальный формат, работает и в Docker, и в Podman
- Коллеги на Windows: `docker-compose up` — и всё работает
- Коллеги на Linux (CachyOS): `podman-compose up` — тоже работает
- CI/CD (GitHub Actions, GitLab CI): нативная поддержка

### 13.2 Структура файлов контейнеризации

```
FunnelBuilder/
├── docker-compose.yml            ← точка входа
├── Dockerfile                    ← сборка фронтенда (pnpm)
├── .dockerignore                 ← исключения
├── .env.example                  ← шаблон переменных
├── nginx.conf                    ← конфиг для продакшн-сервера
├── eslint.config.js              ← ESLint 9 flat config
├── pnpm-lock.yaml                ← lock-файл зависимостей
└── src/                          ← исходники (см. раздел 15)
```

### 13.3 Dockerfile

```dockerfile
# ─── Stage 1: Build ───
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# ─── Stage 2: Serve ───
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ─── Development (альтернативный target) ───
FROM node:20-alpine AS development
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 5173
CMD ["pnpm", "run", "dev"]
```

### 13.4 docker-compose.yml

```yaml
# version: не нужен — deprecated в Docker Compose v2+

services:
  # ─── Development server ───
  app-dev:
    build:
      context: .
      target: development
    ports:
      - "5173:5173"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
      - ./block-library:/app/block-library
      - ./locales:/app/locales
    environment:
      - NODE_ENV=development
      - VITE_API_URL=${API_URL:-http://localhost:3001}
    profiles:
      - dev

  # ─── Production build + nginx ───
  app-prod:
    build:
      context: .
      target: production
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
    profiles:
      - prod

  # ─── Backend (заглушка — заменит бэкенд-команда) ───
  api:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./server:/app
    ports:
      - "3001:3001"
    command: ["node", "index.js"]
    environment:
      - PORT=3001
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:5173}
      - DATABASE_URL=${DATABASE_URL:-sqlite:./data/funnel.db}
    profiles:
      - dev
      - prod
```

### 13.5 Команды для разных ОС

```bash
# ─── Linux (CachyOS / Podman) ───
podman-compose --profile dev up --build
podman-compose --profile prod up --build -d

# ─── Windows / macOS (Docker Desktop) ───
docker-compose --profile dev up --build
docker-compose --profile prod up --build -d

# ─── Остановка ───
docker-compose down        # или podman-compose down

# ─── Только фронтенд без контейнера (для быстрой разработки) ───
pnpm dev
```

### 13.6 nginx.conf (продакшн)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
```

### 13.7 .env.example

```env
# API
API_URL=http://localhost:3001

# CORS
CORS_ORIGIN=http://localhost:5173

# Database (для бэкенда)
DATABASE_URL=sqlite:./data/funnel.db

# AI Translation
DEEPL_API_KEY=
OPENAI_API_KEY=

# Analytics
GA4_ID=
META_PIXEL_ID=

# Payment: Backend ONLY (NEVER expose in frontend or exported HTML)
# Public keys хранятся в meta.paymentCredentials[] (в стейте воронки)
# Secret keys — только на бэкенде, по credentialsId:
PAYMENT_SECRET_CRED_US=
PAYMENT_SECRET_CRED_EU=
PAYMENT_SECRET_CRED_RU=
```

### 13.8 .dockerignore

```
node_modules
dist
.git
*.md
!README.md
.env
.vscode
.cursor
projects
```

---

## 14. Ресурсы и библиотеки

### 14.1 Canvas / Pan / Zoom

| Ресурс | Описание | Звёзды | Для нас |
|--------|----------|--------|---------|
| [**@xyflow/react** (React Flow)](https://github.com/xyflow/xyflow) | Node-based UI (Stripe, Typeform используют). Minimap, controls, zoom, pan, ноды, edges — из коробки | 35.7K | **ИСПОЛЬЗУЕМ** |
| [tldraw](https://tldraw.dev/) | Infinite canvas SDK для React. Идеален для whiteboarding (Miro-клон). Мощный, но overkill для node-based flow | 38K+ | Overkill |
| [Flowscape Core SDK](https://github.com/Flowscape-UI/core-sdk) | Framework-agnostic 2D canvas (Konva.js), 1000+ нод без FPS drops | Новый | Альтернатива |

**Выбор: React Flow** — идеально подходит для нашего node-based интерфейса (экраны = ноды, связи = edges). Включает всё необходимое: pan/zoom (к точке курсора), minimap, snap-to-grid, selection box, keyboard navigation. **Кастомный код pan/zoom не нужен.** tldraw — для полноценного whiteboarding (рисование, произвольные фигуры), что для нас избыточно.

### 14.2 Визуальные HTML-билдеры (для вдохновения и заимствования)

| Ресурс | Описание | Звёзды | Для нас |
|--------|----------|--------|---------|
| [**GrapesJS**](https://github.com/GrapesJS/grapesjs) | Зрелый web builder (8+ лет). Style Manager, Layer Manager, Asset Manager, HTML парсер. React wrapper: `@grapesjs/react` | 25K+ | **Берём подход Style Manager** |
| [**VvvebJs**](https://github.com/givanz/VvvebJs) | Vanilla JS page builder, 0 зависимостей, 150+ Bootstrap сниппетов, undo/redo, export ZIP, media gallery, theme editor | 8.4K+ | **Берём идеи + ВИЗУАЛ**: media gallery с Unsplash, theme editor UX, export ZIP flow |
| [Puck](https://github.com/puckeditor/puck) | React-first visual editor, MIT, JSON model, AI-генерация. Проблемы производительности на 230+ компонентах (18s blocking) | Растёт | Изучить AI page generation API |
| [Craft.js](https://craft.js.org/) | React page editor framework, модульный, кастомизируемый. Слабая документация. | 7K+ | Изучить модульную архитектуру |
| [composify-js/composify](https://github.com/composify-js/composify) | Visual builder для React, JSX-based storage. Очень молодой (август 2025) | Новый | Слишком молодой для продакшна |

**Стратегия:** мы НЕ используем GrapesJS/VvvebJs как зависимость (они opinionated). Мы **адаптируем лучшие идеи**:
- GrapesJS → архитектура Style Manager (парсинг CSS → GUI → обновление), Layer Manager (дерево элементов)
- VvvebJs → UX паттерны: media gallery с Unsplash integration, theme editor, export ZIP с ассетами
- Puck → AI-генерация страниц как фича будущего

### 14.3 Редактор кода (Monaco Editor)

| Ресурс | Описание | Звёзды |
|--------|----------|--------|
| [Monaco Editor](https://github.com/microsoft/monaco-editor) | Ядро VSCode — IntelliSense, мульти-курсор, подсветка синтаксиса | 42K+ |
| [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) | React-обёртка для Monaco | 4K+ |

**Необходимые расширения / настройки Monaco:**
- HTML Language Service — автодополнение тегов, атрибутов
- CSS Language Service — автодополнение свойств, переменных
- Emmet — быстрое создание HTML (div.class>span)
- Prettier integration — форматирование по Ctrl+Shift+F
- Custom autocomplete — наши `funnel-*` классы и `data-*` атрибуты
- Custom snippets — готовые шаблоны компонентов
- Minimap — мини-карта кода
- Bracket pair colorization — подсветка скобок
- Error markers — подсветка ошибок парсера

### 14.4 Библиотеки готовых HTML-компонентов

| Ресурс | Описание | Компонентов |
|--------|----------|-------------|
| [David UI](https://creative-tim.com/david-ui) | AI-powered Tailwind компоненты, light/dark mode | 300+ компонентов, 290+ блоков |
| [TailGrids](https://tailgrids.com/) | Tailwind UI kit — HTML, React, Vue | 600+ |
| [PrebuiltUI](https://github.com/prebuiltui/prebuiltui) | Copy-paste Tailwind компоненты | — |
| [Tailblocks](https://tailblocks.cc/) | 60+ responsive Tailwind-блоков | 60+ |
| [shadcn/ui](https://ui.shadcn.com/) | Radix + Tailwind компоненты (copy-paste) | 50+ |
| [HyperUI](https://hyperui.dev/) | Бесплатные Tailwind-компоненты для маркетинга | 100+ |
| [Flowbite](https://flowbite.com/) | Tailwind component library | 400+ |
| [daisyUI](https://daisyui.com/) | Tailwind plugin с готовыми компонентами | 100+ |
| [UIverse](https://uiverse.io/) | Community-driven CSS UI elements | 5000+ |
| [CSS Buttons](https://cssbuttons.app/) | Коллекция красивых CSS-кнопок | 1000+ |

Не надо грузить всё сразу, сделай кнопки что будут подружать из этого и других источников компоненты - с возможность быстро их просмотреть и удалить не нужные.

### 14.5 Drag & Drop

| Ресурс | Описание | Статус |
|--------|----------|--------|
| [**@dnd-kit/core** + **@dnd-kit/sortable**](https://dndkit.com/) | Proven stable API (8.7M downloads/week), TypeScript, accessibility, 60fps | **ИСПОЛЬЗУЕМ** |
| [@dnd-kit/react](https://next.dndkit.com/) | Новый API (v0.3, pre-1.0). Баги: keyboard nav, type exports, drag state. | Ожидаем v1.0 |
| [@atlaskit/pragmatic-drag-and-drop](https://github.com/atlassian/pragmatic-drag-and-drop) | Ultra-lightweight (~3.5KB), для production-scale (Jira/Trello). Слабая документация. | Альтернатива |
| ~~[react-beautiful-dnd](https://github.com/atlassian/react-beautiful-dnd)~~ | ~~Deprecated Октябрь 2024, archived Апрель 2025~~ | **DEPRECATED** |

**Выбор: `@dnd-kit/core` v6.3.1 + `@dnd-kit/sortable` v10.0.0** — проверенный stable API (8.7M downloads/week). Новый `@dnd-kit/react` v0.3 имеет критические баги (keyboard navigation сломана с v0.2.0, типы не экспортируются, проблемы с drag state при удалении элементов). Когда новый API достигнет v1.0 — переоценить миграцию. На текущей версии stable API — 0 известных блокирующих багов.

### 14.6 Тестирование

| Ресурс | Для чего |
|--------|----------|
| [**Vitest**](https://vitest.dev/) v4.1.0 | Тест-раннер (34.6M downloads/week). Нативный ESM, Vite-конфиг, 3-5x быстрее Jest | **ИСПОЛЬЗУЕМ** |
| [**happy-dom**](https://github.com/capricorn86/happy-dom) | DOM-среда для тестов (2-4x быстрее jsdom, 4.6M downloads/week). HTML parsing 10x быстрее jsdom | **ИСПОЛЬЗУЕМ** |

Vitest переиспользует `vite.config.ts` — нулевая дополнительная конфигурация. happy-dom как default environment; для тестов CSS-парсера (CSSOM, computed styles) — per-file `// @vitest-environment jsdom`. Конфиг уже в `vite.config.ts`.

### 14.7 Полезные утилиты

| Ресурс | Для чего |
|--------|----------|
| [Zustand](https://github.com/pmndrs/zustand) | State manager (35K+ звёзд, лёгкий, TypeScript-first) |
| [Dexie.js](https://dexie.org/) | IndexedDB wrapper (4.3M downloads/week). Multiple object stores, индексы, blob storage, транзакции |
| [nanoid](https://github.com/ai/nanoid) | Генератор ID (118B, 103M downloads/week). `{type}-{nanoid(8)}` для элементов |
| [Immer](https://github.com/immerjs/immer) | Иммутабельные обновления state + `produceWithPatches` для Undo/Redo |
| [Lucide Icons](https://lucide.dev/) | Иконки (уже используются) |
| [Color.js](https://colorjs.io/) | Работа с цветами, Color Picker API |
| [html2canvas](https://html2canvas.hertzen.com/) | Screenshot экранов для thumbnail/preview |
| [Prettier](https://prettier.io/) | Форматирование HTML/CSS/JS кода |
| [JSZip](https://stuk.github.io/jszip/) | Генерация ZIP-архивов в браузере |
| [FileSaver.js](https://github.com/nickersoft/FileSaver.js) | Сохранение файлов из браузера |
| [Yjs](https://github.com/yjs/yjs) | CRDT для будущей коллаборации |
| [nuqs](https://github.com/47ng/nuqs) | Type-safe URL query state для React |

### 14.8 Локализация и AI-перевод

| Ресурс | Для чего |
|--------|----------|
| [react-i18next](https://react.i18next.com/) | i18n фреймворк для React (60K+) |
| [i18nexus](https://i18nexus.com/) | AI-перевод + management platform |
| [DeepL API](https://www.deepl.com/pro-api) | Лучший ML-перевод для европейских языков |
| [OpenAI API](https://platform.openai.com/) | GPT-5 для контекстного перевода |
| [Crowdin](https://crowdin.com/) | Платформа управления переводами |
| [i18next-cli](https://github.com/i18next/i18next-parser) | Автоматическое извлечение строк |

---

## 15. Файловая структура проекта (Vite + React + TypeScript)

```
FunnelBuilder/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── .env.example
├── .env                              ← git-ignored
├── nginx.conf
├── package.json
├── pnpm-lock.yaml
├── eslint.config.js
├── tsconfig.json
├── vite.config.ts
├── index.html                        ← Vite entry point
├── DOCS_ARCHITECTURE.md
│
├── public/
│   ├── favicon.ico
│   └── og-image.png
│
├── src/
│   ├── main.tsx                      ← React entry
│   ├── App.tsx                       ← Root component + router
│   ├── vite-env.d.ts
│   │
│   ├── types/                        ── TypeScript типы ──
│   │   ├── funnel.ts                 Funnel, Screen, FunnelElement, Connection, ConditionGroup, ABTestConfig
│   │   ├── project.ts               ProjectDocument, AssetReference, AssetManifest
│   │   ├── ui.ts                     UIState, Mode, PanelConfig, HistoryEntry, ClipboardData
│   │   ├── store.ts                  AppState, FunnelStore, Actions, ConnectionResolution, AutoProgress
│   │   ├── component.ts             ComponentDefinition, ComponentMeta
│   │   └── i18n.ts                   Locale, Translation
│   │
│   ├── store/                        ── State management (Zustand) ──
│   │   ├── funnel-store.ts           Основной store воронки
│   │   ├── ui-store.ts               UI state (mode, selection, panels)
│   │   ├── history-store.ts          Undo/Redo (Immer patches)
│   │   └── middleware/
│   │       ├── persist.ts            IndexedDB persistence (Dexie.js), localStorage только для UI prefs
│   │       ├── undo.ts               Undo/Redo middleware (produceWithPatches)
│   │       ├── migration.ts          Миграция проектов по schemaVersion
│   │       └── collab-notes.ts       Заметки по будущей миграции на CRDT (Yjs) — НЕ реализация
│   │
│   ├── components/                   ── React компоненты ──
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          Основной layout (header + panels + canvas)
│   │   │   ├── Header.tsx            Верхняя панель
│   │   │   ├── LeftPanel.tsx         Левая панель (обёртка)
│   │   │   ├── RightPanel.tsx        Правая панель (обёртка)
│   │   │   ├── PanelResizer.tsx      Ручка ресайза панели
│   │   │   └── StatusBar.tsx         Нижняя строка состояния
│   │   │
│   │   ├── map-mode/                 ── Режим карты ──
│   │   │   ├── MapCanvas.tsx         Основной canvas (React Flow)
│   │   │   ├── ScreenNode.tsx        Нода-экран (телефон)
│   │   │   ├── ScreenEdge.tsx        Связь между экранами
│   │   │   ├── ScreenToolbar.tsx     Тулбар над экраном
│   │   │   ├── MiniMap.tsx           Мини-карта
│   │   │   ├── CanvasControls.tsx    Zoom +/- / Fit All
│   │   │   └── SelectionBox.tsx      Рамка выделения
│   │   │
│   │   ├── manager-mode/             ── Режим менеджера ──
│   │   │   ├── ManagerView.tsx       Основной view
│   │   │   ├── ScreenList.tsx        Список экранов
│   │   │   ├── ScreenPreview.tsx     Live-превью экрана
│   │   │   └── ElementTree.tsx       Дерево элементов
│   │   │
│   │   ├── developer-mode/           ── Режим разработчика ──
│   │   │   ├── DeveloperView.tsx     Основной view
│   │   │   ├── FileExplorer.tsx      Файловый обозреватель
│   │   │   ├── CodeEditor.tsx        Monaco Editor обёртка
│   │   │   ├── LivePreview.tsx       Превью справа
│   │   │   ├── Console.tsx           Консоль ошибок/логов
│   │   │   └── SnippetPalette.tsx    Палитра сниппетов
│   │   │
│   │   ├── panels/                   ── Содержимое панелей ──
│   │   │   ├── BlockLibrary.tsx      Библиотека блоков (левая)
│   │   │   ├── BlockCategory.tsx     Категория блоков
│   │   │   ├── BlockItem.tsx         Один блок (drag source)
│   │   │   ├── ScreenProperties.tsx  Свойства экрана (правая)
│   │   │   ├── ElementProperties.tsx Свойства элемента (правая)
│   │   │   ├── StyleEditor.tsx       Редактор стилей
│   │   │   ├── TypographyEditor.tsx  Типографика
│   │   │   ├── SpacingEditor.tsx     Margin/Padding (visual box)
│   │   │   ├── BackgroundEditor.tsx  Фон (цвет, градиент, картинка)
│   │   │   ├── BorderEditor.tsx      Рамки и скругления
│   │   │   ├── EffectsEditor.tsx     Тени, прозрачность
│   │   │   ├── LayoutEditor.tsx      Display, flex, grid
│   │   │   ├── GlobalStylesPanel.tsx Глобальные CSS-переменные
│   │   │   ├── FunnelSettings.tsx    Настройки воронки (meta)
│   │   │   ├── PaymentSettings.tsx   Настройки платежей
│   │   │   ├── AnalyticsSettings.tsx Настройки аналитики
│   │   │   └── I18nPanel.tsx         Панель локализации
│   │   │
│   │   ├── preview/                  ── Live Preview ──
│   │   │   ├── PreviewFrame.tsx      iframe-контейнер превью
│   │   │   ├── PreviewToolbar.tsx    Тулбар (mobile/tablet/desktop)
│   │   │   └── PreviewGenerator.ts   Генератор HTML для превью
│   │   │
│   │   ├── shared/                   ── Переиспользуемые UI ──
│   │   │   ├── ColorPicker.tsx       Пикер цвета
│   │   │   ├── NumberInput.tsx       Числовой инпут (с drag)
│   │   │   ├── SelectInput.tsx       Выпадающий список
│   │   │   ├── TextInput.tsx         Текстовый инпут
│   │   │   ├── ToggleSwitch.tsx      Переключатель
│   │   │   ├── Accordion.tsx         Аккордеон (секции панели)
│   │   │   ├── ContextMenu.tsx       Контекстное меню
│   │   │   ├── Modal.tsx             Модальное окно
│   │   │   ├── Tooltip.tsx           Тултип
│   │   │   ├── SearchInput.tsx       Поиск с фильтрацией
│   │   │   ├── TagInput.tsx          Ввод тегов
│   │   │   ├── FileDropZone.tsx      Зона для drag файлов
│   │   │   └── KeyboardShortcut.tsx  Отображение shortcut hint
│   │   │
│   │   └── export/                   ── Экспорт ──
│   │       ├── ExportDialog.tsx      Диалог экспорта
│   │       ├── ExportZip.ts          Генерация ZIP для площадок
│   │       └── ExportSingleFile.ts   Генерация single-file HTML
│   │
│   ├── hooks/                        ── React Hooks ──
│   │   ├── useKeyboardShortcuts.ts   Горячие клавиши
│   │   ├── useDragAndDrop.ts         DnD обёртка (@dnd-kit/core + sortable)
│   │   ├── useResizablePanel.ts      Ресайз панелей
│   │   ├── useAutoSave.ts            Автосохранение (debounce)
│   │   ├── useClipboard.ts           Copy/Paste элементов
│   │   ├── useContextMenu.ts         Контекстное меню
│   │   ├── useUndoRedo.ts            Undo/Redo
│   │   └── useTheme.ts               Тема билдера (dark/light)
│   │   (usePanZoom НЕ нужен — React Flow управляет pan/zoom из коробки)
│   │
│   ├── services/                     ── Сервисы ──
│   │   ├── html-parser.ts            Парсинг HTML → Elements Tree (обратный поток)
│   │   ├── html-generator.ts         Elements Tree → HTML (основной поток)
│   │   ├── css-parser.ts             Парсинг CSS → StyleMap
│   │   ├── style-resolver.ts         Разрешение каскада стилей
│   │   ├── condition-evaluator.ts    ConditionGroup → boolean (runtime eval для preview)
│   │   ├── condition-compiler.ts     ConditionGroup → JS-строка (для экспорта)
│   │   ├── component-registry.ts     Реестр компонентов
│   │   ├── export-service.ts         Экспорт воронки (ZIP/HTML) + автогенерация CSP
│   │   ├── import-service.ts         Импорт HTML-файлов
│   │   ├── preview-service.ts        Генерация Preview HTML
│   │   ├── analytics-service.ts      Встроенная аналитика
│   │   ├── i18n-service.ts           Локализация (react-i18next)
│   │   ├── ai-translate.ts           AI-перевод (DeepL / OpenAI)
│   │   ├── migration-service.ts      Миграция проектов по schemaVersion
│   │   └── storage-service.ts        IndexedDB (проекты, история) + localStorage (UI prefs) / будущий API
│   │
│   ├── utils/                        ── Утилиты ──
│   │   ├── id-generator.ts           Генератор уникальных ID
│   │   ├── color-utils.ts            Работа с цветами
│   │   ├── css-utils.ts              CSS helpers
│   │   ├── html-utils.ts             HTML sanitization
│   │   ├── zip-utils.ts              Генерация ZIP (JSZip)
│   │   ├── url-utils.ts              URL params helpers
│   │   ├── dom-utils.ts              DOM helpers
│   │   └── validation.ts             Валидация данных
│   │
│   ├── styles/                       ── Стили билдера (CSS Modules) ──
│   │   └── global.css                Reset + CSS-переменные темы (единственный глобальный файл)
│   │   Все остальные стили — CSS Modules рядом с компонентами:
│   │     AppShell.module.css, Header.module.css, MapCanvas.module.css и т.д.
│   │   CSS Modules: zero runtime cost, scoped классы, нативная поддержка Vite.
│   │   НЕ конфликтует с funnel-* классами воронок (разные scope).
│   │
│   └── assets/                       ── Статические ассеты билдера ──
│       ├── icons/
│       └── thumbnails/               Превью компонентов для библиотеки
│
├── block-library/                    ── HTML-компоненты воронок (НЕ путать с src/components/) ──
│   ├── content/                      (все файлы из раздела 9.3)
│   ├── media/
│   ├── interactive/
│   ├── layout/
│   ├── form/
│   ├── payment/
│   ├── social-proof/
│   ├── navigation/
│   ├── feedback/
│   ├── result/
│   ├── legal/
│   ├── templates/
│   └── imported/
│
├── locales/                          ── Локализации ──
│   ├── en/
│   │   └── common.json
│   ├── de/
│   ├── es/
│   └── ...
│
├── server/                           ── Заглушка бэкенда ──
│   ├── index.js                      Express/Fastify минимальный сервер
│   ├── package.json
│   └── data/                         SQLite хранилище (dev)
│
└── projects/                         ── Сохранённые проекты (dev) ──
    └── example-iq-us/
        ├── funnel.json               State воронки
        ├── screens/
        │   ├── 0-gender.html
        │   └── ...
        ├── css/
        │   └── global.css
        └── assets/
```

---

## 16. Рекомендуемый порядок разработки

```
Phase 1 — Фундамент (неделя 1-2)
  ├── Инициализация: Vite + React + TypeScript + Zustand
  ├── Docker Compose + Dockerfile (pnpm)
  ├── Типы: ProjectDocument, Funnel, Screen, FunnelElement, Connection, ABTestConfig
  ├── AppShell: Header + LeftPanel + Canvas + RightPanel
  ├── Canvas с pan/zoom (React Flow)
  ├── Screen Nodes на карте (телефоны)
  ├── Базовый Undo/Redo (history store)
  ├── Transient HTML cache (Map, не в стейте)
  ├── IndexedDB persistence (Dexie.js v4.3) для ProjectDocument
  └── localStorage только для UI prefs (размеры панелей, тема)

Phase 2 — Панели и DnD (неделя 3-4)
  ├── Left Sidebar: BlockLibrary с категориями и поиском
  ├── Right Sidebar: ScreenProperties + ElementProperties
  ├── PanelResizer + collapse
  ├── Drag & Drop: из библиотеки → на экран (dnd-kit)
  ├── Drag & Drop: между экранами
  ├── Реордер элементов внутри экрана
  ├── Горячие клавиши
  └── Context menu

Phase 3 — Парсер и стили (неделя 5-6)
  ├── HTML Parser (файл → Screen + Elements)
  ├── CSS Parser (стили → StyleMap)
  ├── Style Editor GUI (Typography, Spacing, Border, Effects)
  ├── Global Styles Panel (CSS-переменные)
  ├── Синхронизация: Panel → Elements Tree → HTML (+ обратный парсинг при Ctrl+S в Monaco)
  ├── Per-screen CSS overrides
  ├── ComponentRegistry (загрузка /block-library/)
  └── component-manifest.json + lazy loading (fetch по требованию)

Phase 4 — Режимы + Localization Hub (неделя 7-9)
  ├── Live Preview (sandboxed iframe + PreviewGenerator + locale switcher)
  ├── Режим менеджера — Localization Hub:
  │   ├── Left Panel: ScreenListPanel + Locale Switcher дропдаун
  │   ├── Center: Tab «Preview» — live-preview с переключением локали и устройства
  │   ├── Center: Tab «Translations» — таблица переводов (inline-edit, фильтры, CSV import/export)
  │   ├── Center: Tab «Payments» — таблица локализованных цен/checkout URL/провайдеров per-locale
  │   ├── Right Panel: Translation Status (% per-locale) + Payment Status (✓/✗ per-locale)
  │   └── UIState: previewLocale + managerTab
  ├── Режим разработчика (Monaco Editor + FileExplorer)
  ├── Console для режима разработчика
  └── Snippet Palette

Phase 5 — Export, i18n pipeline, платёжки (неделя 10-11)
  ├── i18n: react-i18next для UI билдера (locales/*.json)
  ├── AI Translation Pipeline: POST /api/translate (DeepL + GPT-5 маршрутизация)
  ├── Batch AI-перевод: фронтенд собирает missing → бэкенд переводит → запись в element.i18n
  ├── Пост-обработка переводов: проверка длины, placeholder-теги, HTML-entities
  ├── PaymentPlan.localizedPricing: UI настройки цен per-locale в Tab «Payments»
  ├── ScreenPayment.localeProviders: выбор провайдера per-locale
  ├── Validate checkout URLs: HEAD-запрос + визуальный статус (✓/✗/⚠)
  ├── Экспорт multi-locale ZIP: отдельные HTML per-locale + locale-router.js
  ├── Экспорт single-file с data-i18n атрибутами + runtime переключение языка
  ├── Import HTML-файлов (парсинг + добавление)
  └── ScreenCustomHead.i18n: OG-теги per-locale для SEO

Phase 6 — Аналитика и подготовка к бэкенду (неделя 12-13)
  ├── Встроенная аналитика (screen_view, clicks, drop-off)
  ├── Интеграция пикселей (Meta, Google, TikTok, GTM)
  ├── funnel.locale.* runtime API (current, supported, switch, getCurrency)
  ├── Базовые анимации переходов (fade, slide)
  ├── Подготовка API-интерфейсов для бэкенда (включая /api/translate)
  └── Документация для бэкенд-команды
```
