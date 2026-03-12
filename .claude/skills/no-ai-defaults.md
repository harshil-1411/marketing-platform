# Skill: No AI Default UI (Anti-Purple-Problem)

**Read this before generating ANY frontend UI, component, page, or layout.**

This project has a defined design system in `.claude/context/UX_DESIGN_SYSTEM.md`.
This skill is a hard enforcement checklist on top of that document.

---

## The Problem This Skill Solves

AI models default to a recognisable "AI dashboard aesthetic":
- Purple/indigo/violet as the primary color
- Glassmorphism (frosted blur cards with opacity)
- Gradient backgrounds or gradient text
- Oversized hero sections
- 3-column card grids as the default layout for everything
- Heavy shadows and neon glows
- Animated particle or blob backgrounds
- Sidebar with purple active state fills

**This project does NOT look like that.** It looks like Stripe, Linear, or Resend — clean,
data-dense, professional, neutral.

---

## Hard Bans — Never Use These

```
❌ bg-purple-*        ❌ bg-violet-*       ❌ bg-indigo-* (as primary)
❌ backdrop-blur-*    ❌ bg-opacity-* on cards
❌ bg-gradient-*      ❌ text-gradient      ❌ from-* to-* on backgrounds
❌ shadow-2xl on cards ❌ shadow-colored (shadow-blue-500/50 etc.)
❌ rounded-3xl        ❌ rounded-2xl on cards (use rounded-xl max)
❌ animate-bounce     ❌ animate-ping       ❌ scale-* on hover
❌ grid-cols-3 as default page layout
❌ "hero" sections with large centered text on colored backgrounds
❌ dark background pages (bg-gray-900 on content areas — only sidebar)
```

---

## Required Color Usage

Primary color is **blue-500 (#3B82F6)**. Full palette in UX_DESIGN_SYSTEM.md Section 2.

| Element | Correct Class |
|---------|--------------|
| Page background | `bg-gray-50` |
| Card/panel | `bg-white border border-gray-200` |
| Sidebar only | `bg-gray-900` |
| Primary button | `bg-blue-500 hover:bg-blue-600` |
| Active nav item | `bg-blue-50 border-l-2 border-blue-500 text-blue-700` |
| Any badge/tag | semantic colors only (green/amber/red/gray) — see Section 5.2 |

---

## Layout Default: Table, Not Cards

For any list of data (campaigns, segments, templates, customers):

```
✅ Use a data table (see UX_DESIGN_SYSTEM.md Section 5.4)
❌ Do NOT default to a card grid
```

Cards are only used for:
- KPI metrics on the dashboard overview (4 in a row, not 3)
- Individual detail views where a single item needs visual grouping
- Empty states

---

## Sidebar Active State

```tsx
// ✅ CORRECT — left border indicator
className={cn(
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
  isActive
    ? 'bg-blue-50 border-l-2 border-blue-500 text-blue-700'
    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
)}

// ❌ WRONG — filled purple/indigo background
className={isActive ? 'bg-indigo-600 text-white' : '...'}
```

---

## Typography: No Oversizing

| Context | Max Size |
|---------|---------|
| Page title (H1) | `text-2xl` — never text-3xl or larger |
| Section title (H2) | `text-xl` |
| Card title (H3) | `text-base` |
| Everything else | `text-sm` |

The KPI value (`text-3xl font-bold`) is the ONLY place text-3xl is used.

---

## Shadows: Minimal

```
✅ shadow-sm   — cards, dropdowns
✅ shadow-md   — elevated modals, hover state on clickable cards
❌ shadow-lg   — do not use on cards
❌ shadow-xl   — do not use anywhere except modals
❌ shadow-2xl  — never
❌ Colored shadows (shadow-blue-500/20 etc.)
```

---

## Animation: Functional Only

```
✅ transition-colors  — buttons, links, hover states
✅ animate-pulse      — skeleton loaders ONLY
✅ animate-spin       — button loading spinner ONLY
❌ transition-transform, scale, translate on UI elements
❌ Any decorative animation
```

---

## Self-Check Before Submitting Any UI Code

Before outputting any component or page, run through this checklist mentally:

- [ ] No purple/violet/indigo in the output
- [ ] No glassmorphism or gradients
- [ ] Primary action color is blue-500
- [ ] Layout uses table for lists, not card grid
- [ ] No text larger than text-2xl (except KPI values)
- [ ] Shadows are shadow-sm or shadow-md only
- [ ] Active sidebar state uses left border, not background fill
- [ ] Design looks like it could be from Stripe's dashboard, not a hackathon project
