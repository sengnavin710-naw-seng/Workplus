---
version: alpha
name: Perplexity
website: "https://www.perplexity.ai"
description: >-
  Perplexity's answer-engine surface is a cream-canvas product chrome anchored on a single teal accent (#016a71) and a custom pplxSans typeface, where the brand wordmark is set as lowercase 64px display rather than a logo glyph. The chrome holds a 256px left sidebar of dark-ink rail icons, a pill search bar at the center of an off-white field (#fdfbfa), and a Final-Fantasy-themed token namespace — sylph, odin, phoenix, titan, shiva, leviathan, ramuh — that ladders 727 CSS variables across light and dark twins. Geometry runs on three radii — 9999px pill, 12px container, 6px chip — and an 8px spacing base. Two ink shades carry every text and border: warm near-black #27251e for primary text and very-dark cocoa #271a00 for all borders.
seo:
  title: "Perplexity Design System for React — pplxSans, teal #016a71, 20 components"
  metaDescription: "Perplexity AI's design system as a DESIGN.md file. Cream #fdfbfa canvas, teal #016a71 accent, pplxSans typeface, 20 components. For React, Next.js, and AI tools."
  highlights:
    - "Single teal accent #016a71 — the only brand-layer hex out of 118 extracted colors, carried by 29 CSS variables under the shiva summon"
    - "Mythological summon palette — sylph, odin, phoenix, titan, shiva, leviathan, ramuh, jenova, fenrir, garuda, ifrit each ladder 50 to 900 across light and dark twins"
    - "Pill-first geometry — 9999px appears 21 times in the radii sample versus 17 uses of 12px container radius, with 6px chip radius for inline filters"
    - "Wordmark as display type — lowercase pplxSans renders the brand at 64px instead of a logo glyph, the hero element of the search canvas"
    - "Two-ink chrome — every text node sits on #27251e and every border on #271a00, scoped over a #fdfbfa cream field rather than the cool slate convention"
  tags:
    - "AI & LLM Platforms"
  lastUpdated: "2026-05-13"
  author:
    name: "Dov Azencot"
    url: "https://x.com/dovazencot"
  opening: |
    Perplexity's interface inverts the AI-tool convention. Where most answer engines wrap a chat textarea in cool slate chrome and a saturated blue accent, Perplexity opens onto a warm cream canvas at #fdfbfa with a single teal voltage at #016a71 — the only color flagged as brand-layer across 118 extracted tokens. The wordmark itself is set lowercase in the proprietary pplxSans face at 64px, sitting above the search field as display copy rather than a separate logo glyph. A 256px dark-ink left rail carries the six product icons — New, Computer, Spaces, Artifacts, Customize, History — and pins a teal-tinted Sign In pill at the bottom corner, framing the central column as the focal canvas.

    This page packages all of that into a single DESIGN.md file. Inside: 19 color tokens distilled from a 727-variable CSS root, 10 type styles built entirely on pplxSans, 6 corner radii (9999px pill, 16px, 12px, 8px, 6px, 4px), 8 spacing values on a 4px base, and 20 components spanning the wordmark lockup, search composer, sidebar rail, suggestion-card carousel, sign-in modal, account chip, OAuth pill, model selector, and the dark Apple-style button at the heart of the sign-in flow. Internal CSS variables surface a Final Fantasy summon namespace — sylph, odin, phoenix, titan, shiva, leviathan, ramuh, jenova, fenrir, garuda, ifrit — and the mapping is documented inline.

    Feed the file to Claude, Cursor, or GitHub Copilot and the agent reproduces the search-canvas voice rather than a generic chat-box theme — cream field, lowercase wordmark, teal-only voltage, pill geometry, dark-ink rail. Every token is a quoted hex or px value ready to paste into Tailwind config, CSS custom properties, or your component library. The system is worth studying because it argues, against the category norm, that an answer engine is a place to read rather than a console to operate.
  related:
    - href: "/design"
      title: "Browse all design systems"
      description: "The full directory of DESIGN.md files on shadcn.io, with live mockups for each."
    - href: "https://www.perplexity.ai"
      title: "Perplexity — official site"
      description: "The live answer engine the spec was extracted from — search canvas, sign-in flow, Discover finance feed."
    - href: "https://github.com/google-labs-code/design.md"
      title: "The DESIGN.md specification"
      description: "Google Labs' open spec for machine-readable design system files."
  questions:
    - id: "primary-color"
      title: "What is Perplexity's primary brand color?"
      answer: "Perplexity's signature voltage is a deep teal at #016a71, the single hex flagged as brand-layer across 118 extracted tokens. It carries the Sign In pill in the lower-left corner of the sidebar, the focus ring on every input via --border-focus, every accent text link, and the active state on tonal accent surfaces. The system uses the same teal at desktop scale for product chrome and at icon scale for accent decoration. Companion shades #00a1ac and #01838c fill the brighter and slightly-darker steps of the same shiva ladder, but only #016a71 lives in --accent-fg-primary."
    - id: "typography"
      title: "What typography does Perplexity use, and what should I use if pplxSans is unavailable?"
      answer: "Perplexity ships a proprietary face named pplxSans that handles every text node — the lowercase 64px wordmark, the 16px search placeholder, the 14px sidebar labels, the 12px secondary captions. The fallback stack continues into ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial — plus a long CJK and emoji tail. If pplxSans is unavailable, Inter at the same weights (400 body, 500 label) is the closest open-source approximation because of its similar humanist proportions and matched 14px/20px UI grid. Söhne is another close substitute if licensed. Letter spacing across every token is normal — there is no negative tracking move."
    - id: "color-namespace"
      title: "Why are Perplexity's CSS variables named after Final Fantasy summons?"
      answer: "The 727 root variables are organized into 11 color summons — sylph, odin, phoenix, titan, shiva, leviathan, ramuh, jenova, fenrir, garuda, ifrit — each laddering -50 through -900 across light and dark twins with -a-5½ through -a-65 alpha siblings. The teal summon shiva carries the accent role through --accent-fg-primary, the warm-black summon odin carries every text and border tone, the cream summon also sits inside odin at -100 and -200. Mapping the namespace to functional tokens (--accent-*, --bg-*, --fg-*, --border-*) is how Perplexity unifies light and dark mode under one variable graph."
    - id: "pill-geometry"
      title: "Why does Perplexity lean so hard on pill shapes?"
      answer: "Pill (9999px) is the most-frequent radius in the captured DOM at 21 occurrences, versus 17 uses of the 12px container radius and 12 uses of 6px chip radius. The sign-in OAuth buttons, the bottom-corner Sign In CTA, the suggestion chips under Try Computer (Recruiting, Organize my life, Create a prototype, Build a business), and the Search dropdown all sit at full pill radius. Container surfaces — the search composer card, the suggestion panel, the sign-in modal — stay at 12px instead. The pill-first geometry signals that everything you press is a soft target, while everything you read is a contained surface."
    - id: "use-in-project"
      title: "Can I use this DESIGN.md to build my own React app?"
      answer: "Yes — the file is structured to feed Claude, Cursor, or any AI tool that reads design tokens, and to reference manually. The agent reproduces the search-canvas voice — cream field, lowercase wordmark, single teal accent, pill OAuth buttons, dark-ink rail — instead of a generic shadcn theme. Every color, type style, radius, and spacing value is a quoted token you can paste into Tailwind config, CSS custom properties, or your own component library. Pair button-primary (cream pill on cream) with button-apple (dark pill on cream) and you have the OAuth pattern; wrap a text-input at 8px radius inside a 12px composer-card and you have the search bar."
    - id: "known-gaps"
      title: "What's missing from this DESIGN.md spec?"
      answer: "A handful of items documented in the Known Gaps section. The proprietary pplxSans face has no public web font, and the closest substitute Inter only approximates the proportions. The captured screenshot is the sign-in-gated landing surface, so authenticated views — answer threads, citations, source cards, follow-up chains, Spaces, Artifacts — are not yet extracted. The mobile breakpoint is not documented because the capture was 1440px desktop only. Animation and transition timings (suggestion chip carousel, model selector dropdown, focus-ring bloom) are out of scope. The Discover, Finance, Health, Academic, Patents top-nav surfaces each carry their own internal chrome that is not captured here."

colors:
  primary: "#016a71"
  primary-soft: "#01838c"
  primary-bright: "#00a1ac"
  primary-deep: "#0f3639"
  ink: "#27251e"
  ink-strong: "#000000"
  ink-on-dark-cta: "#27251e"
  border-medium: "#271a00"
  canvas: "#fdfbfa"
  canvas-raised: "#fdfbfa"
  surface-soft: "#dedbd4"
  hairline-soft: "#dedbd4"
  accent-soft-teal: "#bdd9dd"
  accent-pale-teal: "#ddf6f8"
  on-primary: "#fdfbfa"
  warning: "#97431a"
  warning-soft: "#d57141"
  positive: "#539e55"
  negative: "#a23544"
  info: "#3053b3"

typography:
  wordmark-display:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 64px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.5px"
  heading-md:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  heading-sm:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-lg:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-md:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0
  label-md:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: 0
  button-md:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 2
    letterSpacing: 0
  caption:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0
  caption-label:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 2
    letterSpacing: 0
  placeholder:
    fontFamily: "pplxSans, ui-sans-serif, system-ui, -apple-system, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0

rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"

spacing:
  xxs: "2px"
  xs: "4px"
  sm: "6px"
  md: "8px"
  base: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"

components:
  wordmark-lockup:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.wordmark-display}"
    padding: "0"
  search-composer-card:
    backgroundColor: "{colors.canvas-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.placeholder}"
    rounded: "{rounded.lg}"
    padding: "16px"
    borderColor: "{colors.surface-soft}"
  search-input:
    backgroundColor: "{colors.canvas-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.placeholder}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "38px"
    borderColor: "{colors.border-medium}"
  search-trigger-pill:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "0px 12px 0px 8px"
    height: "32px"
  voice-orb-button:
    backgroundColor: "{colors.ink-strong}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    height: "32px"
    width: "32px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: "0px 16px"
    height: "40px"
  button-apple:
    backgroundColor: "{colors.border-medium}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "0px 16px"
    height: "40px"
  button-google:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "0px 16px"
    height: "40px"
    borderColor: "{colors.surface-soft}"
  button-disabled:
    backgroundColor: "{colors.border-medium}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    opacity: "0.4"
  sidebar-rail:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    padding: "8px"
    borderColor: "{colors.surface-soft}"
  sidebar-item:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "8px"
    height: "36px"
  sidebar-item-active:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
  sign-in-floating-cta:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "40px"
  top-nav-link:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    padding: "0px 12px"
  suggestion-panel:
    backgroundColor: "{colors.canvas-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: "14px 12px"
    borderColor: "{colors.surface-soft}"
  suggestion-chip:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "6px"
    height: "32px"
  suggestion-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    padding: "0px 12px"
    height: "28px"
  sign-in-modal:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "32px"
    borderColor: "{colors.surface-soft}"
  email-input:
    backgroundColor: "{colors.canvas-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "38px"
    borderColor: "{colors.border-medium}"
  divider-hairline:
    backgroundColor: "{colors.surface-soft}"
    height: "1px"
---

## Overview

Perplexity's product surface is a search canvas wearing the chrome of a quiet reading room. The base atmosphere is a **warm cream field** (`{colors.canvas}` — #fdfbfa) — distinctly not the cool slate or pure white that every other AI answer interface uses. The hero element is not a logo glyph but the brand name itself, set lowercase in **pplxSans** at 64px, centered above the search composer. Beneath the wordmark, a 12px-radius card holds an "Ask anything…" placeholder, a pill-shaped Search trigger, and a small dark voice-orb on the right.

**Teal scarcity**: of 118 extracted color tokens, exactly one is classified as brand-layer — `{colors.primary}` (#016a71). It carries the bottom-corner Sign In pill, the focus ring on every input, the inline accent link color, and the active state on tonal accent surfaces. Companion shades #00a1ac and #01838c live inside the same shiva summon ladder but never escape into brand-voltage roles. Where most AI answer engines paint a saturated blue gradient across half the chrome, Perplexity reserves teal for moments of action.

The system runs on three radii in declining frequency: 9999px pill (21 uses), 12px container (17 uses), 6px chip (12 uses), with 8px standard for buttons and inputs. **Pill-as-action**: every press target — OAuth row, sign-in CTA, search trigger, suggestion chip — is fully rounded; every readable surface — composer card, suggestion panel, sign-in modal — stops at 12px. The geometry is grammar.

**Key Characteristics:**
- Cream canvas (`{colors.canvas}` — #fdfbfa) with warm near-black text (`{colors.ink}` — #27251e). The brand's defining color pair.
- Single teal voltage (`{colors.primary}` — #016a71). The only brand-layer hex of 118 extracted tokens.
- pplxSans across every text node, from 64px wordmark down to 12px caption. No serif, no monospace, no display split.
- Lowercase wordmark as hero — the brand name renders as 64px display copy, not a logo glyph.
- Final Fantasy summon namespace (sylph, odin, phoenix, titan, shiva, leviathan, ramuh, jenova, fenrir, garuda, ifrit) ladders all 727 CSS variables across light + dark twins.
- 256px dark-ink left sidebar carrying six icon rows (New, Computer, Spaces, Artifacts, Customize, History) plus the teal Sign In pill at the bottom corner.
- Pill (9999px) is the most frequent radius (21 uses). 12px sits second (17 uses). The press / read distinction is encoded in geometry.
- Two-ink chrome — every text is `{colors.ink}` (#27251e), every border is `{colors.border-medium}` (#271a00), every body sits on `{colors.canvas}`. The cream + ink + teal trio is the brand.

## Colors

### Brand & Accent
- **Teal Primary** (`{colors.primary}` — #016a71): frequency 0 raw / 29 CSS variable assignments. Used as `--accent-fg-primary`, `--accent-bg-strong`, `--accent-border-strong`, `--link-accent-fg-idle`, `--border-focus`. The single brand-layer hex — reserved for the Sign In pill, every focus ring, every accent link.
- **Teal Soft** (`{colors.primary-soft}` — #01838c): frequency 0 raw / 1 variable. The 500-step of the shiva summon ladder — slightly brighter than primary, used for hover lifts on accent surfaces.
- **Teal Bright** (`{colors.primary-bright}` — #00a1ac): the 400-step of shiva. Reserved for the rare illustration accent or status pip, never carries a primary CTA.
- **Teal Deep** (`{colors.primary-deep}` — #0f3639): the active press state for accent links via `--link-accent-fg-active`. The teal goes deeper, not darker-gray.

### Ink & Border
- **Ink** (`{colors.ink}` — #27251e): frequency 81. Used as text 81 times, never as background, never as border. Sits in 18 CSS variables including `--bg-inverse`, `--fg-primary`, `--fg-secondary`, `--fg-tertiary`, `--border-heavy`, `--action-solid-neutral-bg-idle`. Warm near-black with a slight olive undertone — the workhorse text tone across every node.
- **Ink Strong** (`{colors.ink-strong}` — #000000): frequency 173. Used as text 170 times. Sits in 6 variables including `--odin-dark-0`, `--action-ghost-neutral-bg-idle`, `--shadow-overlay-border`. Pure black, scoped to the dark voice-orb fill and ghost-button backgrounds.
- **Border Medium** (`{colors.border-medium}` — #271a00): frequency 263. Used as border 255 times, almost never as text. Sits in 28 variables including `--border-medium`, `--border-soft`, `--bg-subtle`, `--bg-soft`, `--action-bg-disabled`. Very-dark cocoa — every hairline, every input outline, every disabled-button fill.

### Canvas & Surface
- **Canvas** (`{colors.canvas}` — #fdfbfa): frequency 11. Used as bg 4 times, text 6 times (where light type sits on dark surfaces). Sits in 19 variables including `--bg-base`, `--bg-raised`, `--fg-inverse`, `--odin-light-0`, `--border-inverse`. Tinted cream — warm, deliberately not pure white. Same hex covers all three of base, raised, and "ramuh-dark-50" — the canvas + raised distinction is conceptual, not chromatic.
- **Canvas Raised** (`{colors.canvas-raised}` — #fdfbfa): the search composer card and sign-in modal background. Identical hex to canvas; the elevation is achieved with a 1px hairline rather than color shift.
- **Surface Soft** (`{colors.surface-soft}` — #dedbd4): the active sidebar item background, the suggestion chip fill, the divider hairline. The first observable tonal step above canvas.
- **Hairline Soft** (`{colors.hairline-soft}` — #dedbd4): same hex as surface-soft. Borders and surface fills share one cream-stone tone.
- **Accent Soft Teal** (`{colors.accent-soft-teal}` — #bdd9dd): the shiva-100 tone, used for very-soft teal washes on hover lifts in dark mode.
- **Accent Pale Teal** (`{colors.accent-pale-teal}` — #ddf6f8): the shiva-50 tone, used for the lightest accent panel fills.

### Semantic
- **On Primary** (`{colors.on-primary}` — #fdfbfa): cream-tinted white sitting on teal and dark surfaces. Same hex as canvas — light type echoes the canvas tone rather than going pure white.
- **Warning** (`{colors.warning}` — #97431a): the phoenix-light-600 tone — burnt orange. Used in `--warning-fg-primary`, `--warning-border-strong`. Never appears in marketing chrome; reserved for inline alert states.
- **Warning Soft** (`{colors.warning-soft}` — #d57141): the phoenix-dark-400 — softer warm orange, used for warning-bg-soft fills.
- **Positive** (`{colors.positive}` — #539e55): the garuda-dark-400 — muted forest green for success states and "available" pips.
- **Negative** (`{colors.negative}` — #a23544): the ifrit-light-600 — clay red for error states and destructive confirmations.
- **Info** (`{colors.info}` — #3053b3): the fenrir-light-600 — indigo blue for informational callouts and link variants. Used scarcely; the teal accent dominates link affordance.

## Typography

### Font Family
The system runs a single proprietary face — **pplxSans** — across every text node. The declared fallback stack reads `pplxSans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial`, followed by a long CJK and emoji tail. There is no display / body split; no serif moment; no monospace block on the captured surface. The whole interface lives inside one humanist sans family, modulated only by size and weight.

Where most AI answer engines pair a sans body with a serif marketing display, Perplexity collapses the system into one face — and then makes the brand wordmark itself the only piece of display copy, set at 64px in pplxSans weight 500. The wordmark is the typeface's audition.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.wordmark-display}` | 64px | 500 | 1 | -0.5px | Hero "perplexity" lockup above the search composer |
| `{typography.heading-md}` | 22px | 500 | 1.3 | 0 | Modal headings ("Sign in or create an account") |
| `{typography.heading-sm}` | 18px | 500 | 1.4 | 0 | Section labels inside cards |
| `{typography.body-lg}` | 16px | 400 | 1.5 | 0 | Default reading copy |
| `{typography.body-md}` | 14px | 400 | 1.43 | 0 | Sidebar item labels, secondary copy |
| `{typography.label-md}` | 14px | 500 | 1.43 | 0 | Active sidebar item, button labels, top-nav links |
| `{typography.button-md}` | 16px | 500 | 2 | 0 | Sign In CTA, OAuth pills, Search trigger pill |
| `{typography.caption}` | 12px | 400 | 1.33 | 0 | "No recent threads", "Single sign-on (SSO)" |
| `{typography.caption-label}` | 12px | 500 | 2 | 0 | Uppercase chip labels and metadata |
| `{typography.placeholder}` | 16px | 400 | 1.5 | 0 | "Ask anything…" inside the search composer |

### Principles
Letter spacing across every token is **normal** — there is no tightening on display, no widening on caption. The wordmark gets a minor -0.5px move; everything else sits at 0. Weight choice does all the hierarchical work — 400 for body, 500 for emphasis and labels, never 600 or 700.

The 14px / 500 label and 14px / 400 body share the same line-height (20px) — labels and copy align on the same vertical grid. The system trusts pplxSans proportions over typographic flourish.

### Note on Font Substitutes
pplxSans is a proprietary Perplexity face with no public web font. **Inter** at the same weights is the closest open-source substitute — both are humanist sans designed for screen reading with a similar x-height and matched 14px/20px UI grid. **Söhne** is another close alternative if licensed. The system-ui fallback is acceptable on macOS (renders as San Francisco) and Windows (renders as Segoe UI) — both are similar enough in proportion that the brand wordmark survives the substitution.

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 6px · `{spacing.md}` 8px · `{spacing.base}` 12px · `{spacing.lg}` 16px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px.
- **Dominant gap:** 8px appears 25 times in the captured spacing array — every sidebar item gap, every composer-internal gap, every button-icon offset.
- **Secondary rhythms:** 4px (11 uses) and 6px (7 uses) carry inline chip and label spacings; 14px × 12px (7 uses) is the standard panel padding on the suggestion panel.

### Grid & Container
- **Outer chrome:** Two-column — 256px left sidebar, flex-1 content canvas. The sidebar pins; the canvas centers.
- **Canvas content:** Center-aligned column with max-width near 800px for the search composer + suggestion panel. The wordmark, composer, and suggestions all share the same horizontal axis.
- **Top nav:** Horizontal row of 5 text links (Discover, Finance, Health, Academic, Patents) at top center, sitting flush with the wordmark column.
- **Sign-in modal:** Fixed bottom-right at 304px wide, 12px from each edge, vertically stacked OAuth + email input + SSO link.

### Whitespace Philosophy
The cream canvas + single-typeface chrome + generous vertical breathing room between wordmark and composer (~120px) create a reading-room pacing rather than a console pacing. Nothing competes with the search input for visual weight except the wordmark itself; the suggestion chips and rows sit visually quieter, in surface-soft fills and 14px body type.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Sidebar rail, top nav, canvas body |
| Hairline 1px | `{colors.surface-soft}` 1px border | Composer card, suggestion panel, sign-in modal, OAuth buttons |
| Active fill | `{colors.surface-soft}` background fill | Active sidebar item, suggestion chips, hover lifts |
| Inverse dark | `{colors.ink-strong}` background, `{colors.on-primary}` text | Voice-orb button, dark-ink decorative icons |

The elevation philosophy is **hairline-only**. Where most product chromes lift cards with low-alpha shadow stacks, Perplexity uses 1px borders in the same cream-stone tone as surface-soft. No drop shadows are observable on the captured surface. Depth comes from typographic weight and the cream-vs-soft tonal step, not from blur.

### Decorative Depth
- The Apple-glyph button in the OAuth row uses `{colors.border-medium}` (#271a00) as fill — the system's only near-black surface beyond the small voice-orb. The dark fill is the visual anchor at the bottom of the sign-in modal.
- The voice-orb at the right edge of the composer is a 32px black pill with an inset audio-wave glyph — the only place pure `{colors.ink-strong}` (#000000) appears as a background fill on the canvas.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Reserved for tiny inline accents and 1-use chip rounded corners |
| `{rounded.sm}` | 6px | Search trigger pill internals, small inline chips (12 uses captured) |
| `{rounded.md}` | 8px | OAuth buttons, text inputs, sidebar items, voice-orb container (7 uses) |
| `{rounded.lg}` | 12px | Composer card, suggestion panel, sign-in modal, top-level containers (17 uses) |
| `{rounded.xl}` | 16px | Larger media containers and the rare oversized card (4 uses) |
| `{rounded.pill}` | 9999px | Sign In CTA, suggestion chips, Search trigger, OAuth row pills, voice orb (21 uses — the dominant radius) |

### Geometry Principle
**Pill as press, container as read.** Every fully-rounded element on the captured surface is a press target — Sign In CTA, OAuth row, Search trigger, suggestion chips. Every 12px container is a readable surface — composer card, suggestion panel, sign-in modal. The 8px radius lives between the two, claimed by inputs, voice-orb container, and OAuth confirm buttons. The shape grammar is consistent enough that radius is signal — a 9999px element is interactive on contact, a 12px element is a place to dwell.

## Components

### Wordmark Lockup

**`wordmark-lockup`** — Lowercase "perplexity" set in `{typography.wordmark-display}` (pplxSans 64px / 500 / -0.5px tracking) at the top of the canvas column, in `{colors.ink}` on `{colors.canvas}`. The brand glyph is the typeface — there is no separate logo mark in the lockup itself. The sidebar carries a small spike-mark glyph but the canvas wordmark is pure type.

### Search Composer

**`search-composer-card`** — The hero element. Cream-raised card at `{colors.canvas-raised}`, 12px radius, 1px `{colors.surface-soft}` hairline, 16px internal padding. Holds the placeholder input, an attach-files +, a `search-trigger-pill`, a `Model ↓` selector, a mic icon, and the `voice-orb-button` aligned right.

**`search-input`** — The "Ask anything…" placeholder field. Background `{colors.canvas-raised}`, text `{colors.ink}` (#27251e), placeholder type `{typography.placeholder}` (pplxSans 16px / 400), 8px radius, 8px × 16px padding, 38px height, 1px `{colors.border-medium}` outline. Focus state shifts the outline to `{colors.primary}` (teal) via `--border-focus`.

**`search-trigger-pill`** — The "Search ▾" affordance inside the composer. Cream pill at `{colors.canvas}`, `{typography.label-md}` text (14px / 500), 9999px radius, 32px height, 0px-12px-0px-8px padding (asymmetric for the leading icon). The pill lifts to `{colors.surface-soft}` on hover.

**`voice-orb-button`** — 32 × 32 pure-black pill button at the right edge of the composer. Background `{colors.ink-strong}` (#000000), `{colors.on-primary}` (#fdfbfa) audio-wave icon. The only #000000 surface fill on the canvas — the visual anchor of the composer's right side.

### Buttons

**`button-primary`** — The teal accent button used scarcely outside the bottom-corner Sign In CTA. Background `{colors.primary}` (#016a71), text `{colors.on-primary}` (#fdfbfa), `{typography.button-md}` (16px / 500), 9999px pill radius, 0px × 16px padding, 40px height.

**`button-apple`** — The dark OAuth "Continue with Apple" button. Background `{colors.border-medium}` (#271a00), text `{colors.on-primary}` (#fdfbfa), 8px radius, 40px height, white Apple-glyph leading icon. Sits as the visual anchor of the sign-in modal — the only dark-fill button in the OAuth stack.

**`button-google`** — Cream OAuth "Continue with Google" button. Background `{colors.canvas}`, text `{colors.ink}`, 1px `{colors.surface-soft}` hairline, 8px radius, 40px height, Google G icon leading. Inverts the Apple pattern — same geometry, opposite fill.

**`button-disabled`** — Disabled OAuth state ("Continue with email" before email entry). Background `{colors.border-medium}` (#271a00) at `0.4` opacity, text `{colors.ink}`, 8px radius. Reads as a "ghost" version of `button-apple`.

### Sidebar

**`sidebar-rail`** — 256px left rail. Background `{colors.canvas}`, 1px `{colors.surface-soft}` hairline on the right edge, 8px internal padding. Carries the spike-mark glyph + sidebar-toggle at top, then a vertical stack of sidebar items, then the floating Sign In CTA pinned at the bottom-left corner.

**`sidebar-item`** — A row in the sidebar (Computer, Spaces, Artifacts, Customize, History). Background `{colors.canvas}`, text `{colors.ink}` in `{typography.label-md}` (14px / 500), 8px radius, 36px height, 8px padding. Leading 16px icon + label in a single horizontal flex row.

**`sidebar-item-active`** — Active sidebar state (the "New" row at the top). Background `{colors.surface-soft}` (#dedbd4) — the same cream-stone tone used for chips. No teal accent; the active state is tonal, not chromatic.

**`sign-in-floating-cta`** — The bottom-left Sign In pill. Background `{colors.primary}` (#016a71), text `{colors.on-primary}` in `{typography.button-md}`, 9999px pill radius, 8px × 16px padding, 40px height. The teal voltage's most visible appearance in the chrome.

### Top Navigation

**`top-nav-link`** — Five horizontal text links across the top of the canvas (Discover, Finance, Health, Academic, Patents). Background `{colors.canvas}`, text `{colors.ink}` in `{typography.label-md}` (14px / 500), 0px × 12px horizontal padding, no underline, no background fill. The active route gets a subtle bottom border in `{colors.ink}` rather than a fill.

### Suggestions

**`suggestion-panel`** — The "Try Computer" card below the composer. Background `{colors.canvas-raised}`, 1px `{colors.surface-soft}` hairline, 12px radius, 14px × 12px internal padding. Holds a row of suggestion chips at top and a vertical list of suggestion rows below.

**`suggestion-chip`** — Horizontal pill chip (Recruiting, Organize my life, Create a prototype, Build a business). Background `{colors.surface-soft}` (#dedbd4), text `{colors.ink}` in `{typography.label-md}`, 9999px pill radius, 6px padding, 32px height, leading 14px icon.

**`suggestion-row`** — A click-through row inside the suggestion panel ("Find candidates for my open role", "Benchmark salary for a role", "Monitor job postings at target companies"). Background `{colors.canvas}` (transparent over the panel), text `{colors.ink}` in `{typography.body-md}` (14px / 400), 0px × 12px padding, 28px height. Hovers lift to `{colors.surface-soft}` fill.

### Sign-In Modal

**`sign-in-modal`** — Bottom-right floating modal, 304px wide. Background `{colors.canvas}`, 1px `{colors.surface-soft}` hairline, 12px radius, 32px internal padding. Carries the spike-mark glyph, an `{typography.heading-md}` headline ("Sign in or create an account"), a body sub-line, then the OAuth stack (`button-google`, `button-apple`), a `divider-hairline`, the email input + disabled confirm, and a "Single sign-on (SSO)" caption link at the bottom.

**`email-input`** — Text input inside the sign-in modal. Background `{colors.canvas-raised}`, text `{colors.ink}` in `{typography.body-md}` (14px / 400), 8px radius, 8px × 16px padding, 38px height, 1px `{colors.border-medium}` outline. The focus state shifts the outline to `{colors.primary}` teal via `--border-focus`.

**`divider-hairline`** — A 1px horizontal rule used inside the sign-in modal to separate OAuth from email entry. Background `{colors.surface-soft}` (#dedbd4), 1px height, full modal width minus padding.

## Do's and Don'ts

### Do
- Anchor every page on `{colors.canvas}` (#fdfbfa) cream. Pure white reads as "any other answer engine"; the warm tint is the brand differentiator.
- Use `{typography.wordmark-display}` (pplxSans 64px / 500 lowercase) above the search composer as the hero element. The wordmark IS the display moment — never replace it with a marketing headline.
- Reserve `{colors.primary}` teal #016a71 for the Sign In CTA and the focus ring on inputs. Don't paint accent moments teal elsewhere.
- Use `{rounded.pill}` (9999px) on every press target and `{rounded.lg}` (12px) on every readable surface. The shape grammar is the system's strongest legibility move.
- Use `{colors.surface-soft}` (#dedbd4) as the only tonal step above canvas — for active sidebar items, suggestion chips, hover lifts, and dividers. Don't introduce a second cream-stone tone.
- Pair `{component.button-apple}` (dark) with `{component.button-google}` (cream) in the OAuth row. The dark-then-cream stack is the brand's sign-in pattern.

### Don't
- Don't use cool grays or pure white for canvas. The #fdfbfa cream is the brand voltage.
- Don't add a second brand accent. The teal is alone by design; introducing a second voltage (orange, purple, blue) breaks the entire color philosophy.
- Don't use `{colors.border-medium}` (#271a00) as text or background fill outside the Apple OAuth button — it is a border-only token in 255 of 263 occurrences. For text, use `{colors.ink}` (#27251e); for surfaces, use `{colors.canvas}` or `{colors.surface-soft}`.
- Don't introduce a serif or monospace face. The whole system runs pplxSans; the absence of a typeface split is the brand's confidence signal.
- Don't bold weight beyond 500. Display, labels, and buttons all sit at 500; going to 600 or 700 breaks the chrome's hierarchy because nothing else compensates.
- Don't apply drop shadows. Elevation is hairline-only — borders in `{colors.surface-soft}` at 1px, never blur.
- Don't render the wordmark uppercase or in any face other than pplxSans. The lowercase 64px lockup is the brand mark.
- Don't paint a fourth surface tone. The cream + ink-medium + surface-soft + teal trio is exclusive.

## Known Gaps

- pplxSans is a proprietary Perplexity face with no public web font. Inter / Söhne / system-ui are documented substitutes; the lockup tracking may need a minor adjustment when substituted.
- The captured screenshot is the sign-in-gated landing surface at 1440px desktop. Authenticated answer views — threads, citations, source cards, follow-up chains, Spaces, Artifacts, the Computer agent panel — are not extracted in this version.
- Mobile breakpoint is not documented; the capture is desktop only.
- Animation and transition timings (suggestion chip carousel, model selector dropdown, focus-ring bloom on teal, chat streaming) are out of scope.
- The Discover, Finance, Health, Academic, Patents top-nav surfaces each carry their own internal chrome (article cards, ticker rows, source pills, research filters) that is not captured here.
- The summon namespace (sylph, odin, phoenix, titan, shiva, leviathan, ramuh, jenova, fenrir, garuda, ifrit) carries 727 root variables, but only the variables surfacing on the captured chrome are documented. The full color ladder for each summon (e.g. sylph-light-50 through sylph-dark-900) is available in the source CSS but not in this spec.
- Dark-mode twins exist for every variable, but the captured surface is light mode only. Dark-mode tokens would invert the ink + canvas pair and remap the shiva voltage toward `{colors.primary-bright}` (#00a1ac).
