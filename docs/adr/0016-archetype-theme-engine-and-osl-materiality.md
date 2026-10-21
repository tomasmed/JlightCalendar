# ADR 0016: Material Archetype Theme Engine, OSL Light-Spill & Hue-Preserving Member Colors

- **Status**: Accepted
- **Date**: 2026-10-20
- **Reference**: [Visual Aesthetic & Interface Design Reference](https://docs.tomasmed.dev/docs/visual-aesthetic.md)

## Context

Previously, `JlightCalendar` supported only two hardcoded themes (`milky-way` and `halloween`). The legacy `halloween` theme relied on full-screen animated SVG spiders/webs (`HalloweenWhimsy`), novelty `Creepster` display typography, and uncoordinated neon borders. Additionally, several UI surfaces suffered from visual noise identified in our Visual Aesthetic Reference:
1. Header utility buttons (Weather, Theme, Info, Sleep) were boxed inside pill borders, competing with primary view switcher tabs.
2. Active states mixed disparate pill styles across views.
3. Selected calendar cells stacked an outer ring *and* an inner circular badge ("double-hatting").
4. Mobile month cells used blurry circular glowing dots instead of crisp architectural indicators.
5. Family member colors were applied as raw saturated hex values, which clashed when switching between warm matte themes, daylight themes, and high-contrast OSL dark themes—yet families are attached to their personal semantic colors (e.g., "Green", "Pink", "Purple").

## Decision

1. **Two Material Archetypes & 9 Curated Palettes (`src/lib/theme.ts`, `src/app/globals.css`)**:
   - **Archetype A ("Super Creamy" — Matte PBT Keycaps, `data-archetype="creamy"`)**:
     - `mocha` (Default — Warm Cocoa & Espresso, aliases legacy `milky-way`)
     - `matcha` (Earthy Botanical Slate & Roasted Matcha)
     - `oat` (Nordic Warm Stone & Terracotta Clay)
     - `latte` (Daylight Alabaster & Espresso Ink)
   - **Archetype B ("Cyberpunk & Seasonal OSL" — Object Source Lighting, `data-archetype="osl"`)**:
     - `over-volt-blue` (Abyssal Navy & Electric Cyan)
     - `yakuza-purple` (Obsidian Violet & Neon Magenta)
     - `red-dragon` (Carbon Crimson & Laser Red)
     - `neon-green` (Deep Matrix Slate & Acid Phosphor Green)
     - `halloween` ("All Hallows" — Reworked Obsidian Violet-Black, Pumpkin Phosphor `#ff7518`, & Witchcraft Violet `#b026ff`, replacing `<HalloweenWhimsy />` and `Creepster`).
   - **Mother-Color Rule**: Every palette mixes 5–8% of its primary ambient hue into its void, deep, surface, card, and border tokens. Zero pure `#000000` or `#FFFFFF` values are permitted.
   - **Per-Device Persistence**: Active theme selection remains stored per-device in `localStorage` (`jlight_app_theme`).

2. **Hue-Preserving Member Color Adaptation (`adaptMemberColor`)**:
   - Inhabitant hex colors remain untouched in SQLite (`inhabitants.color`).
   - At render time, `adaptMemberColor(rawHex, activeTheme)` converts the member's color to HSL, strictly locks the semantic Hue ($H$), and adapts Saturation ($S$), Lightness ($L$), and a subtle 8–10% RGB undertone blend of the active theme's Mother-Color:
     - **Creamy Dark**: Desaturates harsh neons into chalky pastel keycap pigments ($S \in [48\%, 65\%], L \in [66\%, 76\%]$).
     - **Creamy Daylight (`latte`)**: Deepens lightness for crisp contrast on warm alabaster paper ($S \in [50\%, 68\%], L \in [36\%, 46\%]$).
     - **Cyberpunk / Seasonal OSL**: Boosts phosphor vibrancy ($S \in [82\%, 95\%], L \in [60\%, 70\%]$).

3. **OSL Left-Lip Cards & Single-Anchor Focus States**:
   - Event pills, Chore cards, Meal cards, and List items use a `3px solid` left border in the adapted member color with a directional horizontal glaze (`22%` opacity at the left lip fading to `4%` across the card body).
   - `.theme-focus-pill` automatically switches between a raised matte PBT keycap (`1px solid` top highlight + `2px` bottom lip) in `creamy` themes and a 3-layer fluorescent OSL light-spill (`inset` source + ambient drop shadow) in `osl` themes.

## Consequences

- Switching between any of the 9 themes immediately transforms surface materiality, focus physics, and member color harmony without altering any database records or confusing users about which color belongs to which family member.
- Removing `HalloweenWhimsy` and `Creepster` reduces DOM/animation overhead on low-power wall kiosks while keeping "All Hallows" as a cohesive seasonal OSL palette.
