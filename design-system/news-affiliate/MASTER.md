# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** News Affiliate
**Updated:** 2026-05-11
**Theme:** Calm Blue + Soft White (Professional Editorial)

---

## Color Palette

Source: ui-ux-pro-max `--domain color "blue light calm professional editorial"` (Result 2: B2B Service) + Swiss Minimalism style.

| Role          | Hex       | Usage                                            |
| ------------- | --------- | ------------------------------------------------ |
| Primary       | `#0369A1` | Brand CTA, active nav, primary buttons (sky-700) |
| On Primary    | `#FFFFFF` | Text on primary                                  |
| Secondary     | `#7DD3FC` | Soft blue (sky-300)                              |
| Accent        | `#0891B2` | Links, secondary CTA (cyan-600)                  |
| Background    | `#F8FAFC` | Page bg (slate-50, soft white)                   |
| Surface       | `#FFFFFF` | Cards, modals                                    |
| Muted         | `#F1F5F9` | Subtle surface (slate-100)                       |
| Ink           | `#0F172A` | Body text (slate-900)                            |
| Foreground    | `#0C4A6E` | Headings (sky-900, deep blue)                    |
| Muted FG      | `#64748B` | Secondary text (slate-500)                       |
| Border        | `#E2E8F0` | Default border (slate-200)                       |
| Border Strong | `#7DD3FC` | Active/hover (sky-300)                           |
| Destructive   | `#DC2626` | Error                                            |
| Success       | `#16A34A` | Success                                          |
| Ring          | `#0369A1` | Focus rings                                      |

## Style: Swiss Minimalism

- Clean white space, grid-based layout
- Minimal/no shadows; rely on borders + bg contrast
- WCAG AAA contrast targeted
- Transitions 150–250ms ease
