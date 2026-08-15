# Wintool Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Next.js сайт Wintool: одна страница с левыми якорными ссылками, форма настроек, API генерации `autounattend.xml`, UI как у соседних проектов, без footer.

**Architecture:** App Router; клиентская форма + sticky left nav (anchors); `POST /api/generate` → TypeScript XML builder; тема light/dark; OverlayScrollbar.

**Tech Stack:** Next.js 15+, React 19, TypeScript, lucide-react, CSS (паттерн lokach), IBM Plex Sans + Literata.

## Global Constraints

- Бренд: **Wintool**; без footer
- Левая навигация = якоря на блоки одной страницы
- UI-токены/шрифты/анимации как mikat/lokach; акцент teal
- Дефолты: ru-RU, Pro, wipe disk0 C=150/D rest, Admin/, whitelist apps
- Не хранить ключи/пароли на сервере
- Язык UI: русский

---

## File map

- `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- `src/components/Header.tsx` + css
- `src/components/OverlayScrollbar.tsx` + css (как у lokach)
- `src/components/SideNav.tsx` + css — якоря
- `src/components/Generator.tsx` + css — форма/секции
- `src/lib/theme.ts`
- `src/lib/defaults.ts` — дефолтный конфиг
- `src/lib/types.ts` — UnattendConfig
- `src/lib/buildUnattendXml.ts` — генератор XML
- `src/lib/buildUnattendXml.test.ts`
- `app/api/generate/route.ts`
- `README.md`
- `public/favicon-light.svg`, `favicon-dark.svg`

---

### Task 1: Scaffold Next.js + shell UI

- [ ] `create-next-app` / ручной package.json (без footer)
- [ ] layout: fonts, theme script, Header, OverlayScrollbar
- [ ] globals.css с teal-акцентом
- [ ] пустая page с app-shell

### Task 2: SideNav + секции-якоря

- [ ] SideNav со ссылками `#language` … `#download`
- [ ] Generator layout: left sticky nav + sections
- [ ] active section по scroll
- [ ] mobile: нав сверху

### Task 3: Форма + state

- [ ] controlled state от defaults
- [ ] все блоки полей по спеке
- [ ] валидация имени ПК / размера C

### Task 4: XML builder + API + download

- [ ] тест на минимальный XML
- [ ] `buildUnattendXml`
- [ ] `POST /api/generate`
- [ ] кнопка скачивания в `#download`

### Task 5: Polish + README

- [ ] анимации `in`, reduced-motion
- [ ] README (запуск, флешка, MIT notice)
- [ ] `npm run build`
