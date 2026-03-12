# Frontend Skills Index

These skills are task-specific checklists for building the frontend of the
WhatsApp Marketing Platform. They sit on top of the context documents — do not
repeat the context docs, reference them.

## When to Use Which Skill

| You are about to... | Read this skill first |
|---------------------|-----------------------|
| Build ANY UI (component, page, layout) | `no-ai-defaults.md` — always |
| Create a new component | `build-react-component.md` |
| Create a new page | `build-react-page.md` |
| Add data fetching or a new hook | `react-query-hooks.md` |
| Build a form | `react-forms.md` |

## Reading Order for a New Frontend Feature

1. `no-ai-defaults.md` — design constraints
2. `build-react-component.md` or `build-react-page.md` — structure
3. `react-query-hooks.md` — if the feature fetches data
4. `react-forms.md` — if the feature has a form

## Context Documents (in `.claude/context/`)

These are the full reference docs. Skills summarise and enforce them:

- `REACT_PATTERNS.md` — complete code patterns for API client, hooks, forms, state
- `UX_DESIGN_SYSTEM.md` — complete design tokens, components, spacing, layout
