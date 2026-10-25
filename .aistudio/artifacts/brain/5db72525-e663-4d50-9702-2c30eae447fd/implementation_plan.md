# Comprehensive 16-Theme Visual Contrast & Border Visibility Fix

Enforce high contrast, sharp theme-accented borders, crisp card outlines, and guaranteed text visibility across all 16 light, dark, and vibrant theme modes in the application.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your confirmed choices in Phase 1:
> - **Contrast & Text Legibility**: All 16 themes will enforce high-contrast WCAG-compliant text styling so headings, body text, sub-labels, and icons are 100% visible on all background surfaces.
> - **Borders & Outlines**: Every card, container, modal, tab, input, and list row will feature sharp theme-accented borders (`var(--border-color)` derived from `var(--accent)`) to ensure distinct visual boundaries in both light and dark themes.

- **Confirmed Choice 1**: High-contrast text & borders across all 16 light and dark modes.
- **Confirmed Choice 2**: Sharp theme-accented borders and visible card outlines on every component.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades the global CSS custom properties and component theme rules so that when a user switches between any of the 16 themes (Original Blue, Day Mode, Night Mode, Cyberpunk, Emerald Green, Sunset Orange, Royal Purple, Crimson Red, Ocean Teal, Rose Pink, Midnight Gold, Forest Lime, Slate Steel, Coffee Brown, Mint Light, Lavender Light), every visible UI surface, card, modal, list, tab, input, badge, and text string updates cleanly with high legibility and sharp outlines.
- **Target Audience**: Mobile esports players and tournament participants using diverse light/dark display environments.
- **Key Value**: Guarantees zero invisible text, zero washed-out cards, and uniform theme compliance across the entire app.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. User opens Profile page or Theme Drawer and selects any theme.
  2. The application dynamically re-paints all CSS custom variables across `document.documentElement` and `document.body`.
  3. Every header, tournament card, game card, status item, tab bar, modal sheet, wallet box, and text element updates instantly with distinct contrast and accent borders.
- **Visual Identity & Theme Tokens**:
  - *Light Modes (Day Mode, Mint Light, Lavender Light)*: Deep dark text (`--text: #1E293B`, `--sub: #64748B`), white cards (`--card: #FFFFFF`, `--bg2: #F8FAFC`), crisp accent borders (`color-mix(in srgb, var(--accent) 35%, transparent)`).
  - *Dark & AMOLED Modes (Original Blue, Night, Cyber, Emerald, Sunset, Royal, Crimson, Ocean, Rose, Gold, Lime, Steel, Coffee)*: High-luminance white/light text (`--text: #F8FAFC`, `--sub: #94A3B8`), rich themed card surfaces, bright theme-accented borders.
- **Interactive Feedback & Motion**:
  - Instant theme transition ($\le 100\text{ms}$) when tapping a theme option in the drawer or profile.
  - Hover and active states reflect the accent color (`var(--accent)`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: CSS Custom Variables on `document.documentElement` & `body`**
  - *Chosen Approach*: Bind all theme custom properties (`--bg`, `--card`, `--bg2`, `--text`, `--sub`, `--accent`, `--border-color`) to both `document.documentElement` and `document.body`.
  - *Why*: Ensures CSS variable inheritance reaches all portal modals, bottom sheets, and nested elements without falling back to hardcoded dark hex colors.
- **Decision 2: Universal `var(--text)` and `var(--border-color)` Overrides**
  - *Chosen Approach*: Replace remaining hardcoded `#FFFFFF`, `#000000`, and `#181B38` color declarations in component stylesheets with `var(--text-primary)`, `var(--text-secondary)`, `var(--card-bg)`, and `var(--border-color)`.
  - *Why*: Eliminates invisible white-on-white text in light themes and missing borders in dark themes.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────┐
│                   Theme Engine (theme.ts)                 │
│  - THEMES Definition (16 Themes: Light & Dark)           │
│  - applyTheme(themeId) -> document.documentElement       │
└─────────────────────────────┬────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                 Global CSS (src/index.css)               │
│  --bg, --bg2, --card, --text, --sub, --accent           │
│  --text-primary, --text-secondary, --border-color        │
└─────────────────────────────┬────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │  Headers  │   │   Cards   │   │  Modals   │
        │ & Nav Bar │   │ & Lists   │   │ & Sheets  │
        └───────────┘   └───────────┘   └───────────┘
```

- **State Store**: `currentThemeId` in `AuthContext` + `localStorage` persistence under key `'gz'`.
- **Component Modifications**:
  - `src/utils/theme.ts`: Ensure all 16 theme definitions provide high contrast `--text`, `--sub`, `--card`, `--bg2`, and `--accent` tokens for both light and dark posture.
  - `src/index.css`: Audit and update all card, badge, modal, input, and text selectors to use theme custom properties with sharp border outlines.
