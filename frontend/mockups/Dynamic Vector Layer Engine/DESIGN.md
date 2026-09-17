---
name: VayuSense SIH26082 Design Reference
colors:
  surface: '#0e1511'
  surface-dim: '#0e1511'
  surface-bright: '#343b36'
  surface-container-lowest: '#09100c'
  surface-container-low: '#161d19'
  surface-container: '#1a211d'
  surface-container-high: '#242c27'
  surface-container-highest: '#2f3632'
  on-surface: '#dde4dd'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dde4dd'
  inverse-on-surface: '#2b322d'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#ffb3af'
  on-tertiary: '#650911'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#0e1511'
  on-background: '#dde4dd'
  surface-variant: '#2f3632'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1440px
  gutter: 16px
---

## SIH26082 Scope (2026-09-14)

Historical visual reference, not implementation evidence. The current [project design](../../../Design.md), [requirements](../../../Prd.md) and [priority phases](../../../Phases.md) take precedence over the legacy guidance below, including older branding, spacing and card conventions.

Required forecast map (Phases 1 and 6): use verified NCR boundaries and data-backed forecast layers. Show native model spacing separately from H3/display resolution. Fixed shapes and mock sensor markers cannot represent measured source attribution.

All scientific values require source/run provenance. Distinguish observations, forecasts, archived replay and synthetic fixtures. No mockup completion closes a scientific acceptance gate.

## Brand & Style (Legacy Reference)
The design system is engineered for high-stakes urban monitoring and industrial AI oversight. It targets city administrators, environmental engineers, and emergency response teams who require immediate, unambiguous data interpretation.

The aesthetic follows a **Modern Industrial** movement—merging the precision of developer tools with the scale of enterprise infrastructure. It prioritizes high information density and technical authority. The UI should evoke a sense of "Mission Control": calm under normal operations, but capable of projecting extreme urgency through high-contrast chromatic shifts during environmental crises.

Key visual principles:
- **Functional Density:** Maximum data visibility with minimal decorative chrome.
- **Technical Precision:** Strict adherence to grid lines and micro-borders.
- **Urgency Mapping:** Using neon accents against an obsidian backdrop to direct ocular focus instantly to anomalies.

## Colors
This design system utilizes a "Deep Industrial" palette optimized for long-duration monitoring in low-light environments.

- **Deep Slate Obsidian (#0f172a):** The primary void. Used for the lowest level of the UI to reduce eye strain and provide maximum contrast for data layers.
- **Dark Steel Grey (#1e293b):** The secondary surface. Used for cards, sidebars, and nested containers to create structural hierarchy.
- **Neon Emerald Green (#10b981):** The signal for "Active," "Safe," and "Optimized." It serves as the primary action color.
- **Vivid Electric Red (#ef4444):** Reserved exclusively for critical alerts, high-pollution hotspots, and system failures. Use sparingly to maintain its psychological impact.
- **Micro-Border Steel (#334155):** Defines the skeleton of the UI without introducing the visual weight of heavy shadows.

## Typography
Inter is the sole typeface for this design system, chosen for its exceptional legibility in data-heavy contexts and its neutral, systematic tone.

- **Numerical Data:** For telemetry and air quality indices, always enable tabular figures (`tnum`) to ensure columns of numbers align perfectly for rapid scanning.
- **Labels:** Use `label-md` with uppercase styling and slight letter spacing for category headers and table columns to distinguish them from interactive data.
- **Hierarchy:** Use weight (600+) to indicate importance rather than just size. In industrial dashboards, maintaining a compact vertical footprint is often more critical than large display type.

## Layout & Spacing
The layout follows a strict 4px base grid to ensure mathematical alignment of complex data visualization components.

- **Grid Model:** Use a 12-column fluid grid for main content areas with fixed 16px gutters.
- **Density:** This is a high-density system. Use `sm` (8px) and `md` (16px) for internal component padding to maximize the amount of information visible on a single fold.
- **Responsiveness:**
    - **Desktop:** Sidebar-heavy layout for navigation and global filters.
    - **Tablet:** Collapsed sidebar, modular cards reflow to 2-column.
    - **Mobile:** Single column stack. Typography scales down (e.g., `display-lg` becomes `headline-lg`). Margins reduce to `md` (16px).

## Elevation & Depth
In this design system, depth is communicated through **Tonal Layering** and **Sharp Micro-Borders** rather than traditional shadows.

- **Level 0 (Base):** #0f172a (Obsidian) - Used for the main application background.
- **Level 1 (Surface):** #1e293b (Dark Steel) - Used for cards, panels, and header sections.
- **Dividers:** Use 1px solid #334155. Avoid soft blurs.
- **Interaction Overlay:** When an element is hovered, use a 5% white overlay to subtly lift the surface.
- **Critical Focus:** Use a subtle outer glow of the primary color (#10b981) only for active input focus or critical status indicators.

## Shapes
The shape language is "Soft-Industrial." Components use a minimal 4px (`0.25rem`) corner radius to maintain a rigid, engineered feel while avoiding the harshness of raw 90-degree angles.

- **Standard Elements:** 4px radius (Buttons, Input Fields, Cards).
- **Status Pills:** 9999px (fully rounded) for status badges to differentiate them from interactive buttons.
- **Data Markers:** Sharp squares or diamonds for map data points to imply mathematical precision.

## Components
- **Buttons:** Primary buttons are solid Neon Emerald (#10b981) with black text for maximum contrast. Secondary buttons use a ghost style with the Steel Grey border and white text.
- **Input Fields:** Background matches the base Obsidian (#0f172a) with a 1px Steel Grey border. On focus, the border transitions to Neon Emerald.
- **Cards:** No shadows. Use the Dark Steel (#1e293b) background and a 1px #334155 border. Headers within cards should have a bottom divider.
- **Status Badges:** Small, condensed text. "Safe" uses a subtle Emerald tint (10% opacity background, 100% text). "Danger" uses 100% Red background with white text to demand attention.
- **Data Tables:** Zebra striping is discouraged. Use thin 1px horizontal dividers. Highlight hovered rows with a #334155 background shift.
- **Telemetry Charts:** Line charts should use 2px strokes. Fill areas under the lines with a 5% opacity gradient of the line color.
