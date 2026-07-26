---
version: 0.1.0
name: FDC Agent
description: A warm-canvas editorial design system for FDC Agent, a conversational AI product. Anchors on a tinted cream canvas with serif display headlines, warm coral CTAs, and dark navy surfaces reserved for code mockups and footers. Brand voltage comes from the cream/coral pairing — deliberately warm and humanist where most AI brands use cool blue + slate. Extends the original marketing surface with a chat interface layer (message bubbles, input chrome, streaming cursor, typing indicator) that follows the same trinity, coral for the user's voice, cream-card for the agent's voice, no fourth surface tone. Display headlines run Cormorant Garamond (substitute for the licensed Copernicus / Tiempos Headline); body runs Inter (substitute for StyreneB); code runs JetBrains Mono.

colors:
  primary: "#cc785c"
  primary-active: "#a9583e"
  primary-disabled: "#e6dfd8"
  ink: "#141413"
  body: "#3d3d3a"
  body-strong: "#252523"
  muted: "#6c6a64"
  muted-soft: "#8e8b82"
  hairline: "#e6dfd8"
  hairline-soft: "#ebe6df"
  canvas: "#faf9f5"
  surface-soft: "#f5f0e8"
  surface-card: "#efe9de"
  surface-cream-strong: "#e8e0d2"
  surface-dark: "#181715"
  surface-dark-elevated: "#252320"
  surface-dark-soft: "#1f1e1b"
  on-primary: "#ffffff"
  on-dark: "#faf9f5"
  on-dark-soft: "#a09d96"
  accent-teal: "#5db8a6"
  accent-amber: "#e8a55a"
  success: "#5db872"
  warning: "#d4a017"
  error: "#c64545"
  primary-translucent-15: "rgba(204, 120, 92, 0.15)"
  error-soft: "rgba(198, 69, 69, 0.10)"
  ink-translucent-04: "rgba(20, 20, 19, 0.04)"

typography:
  display-xl:
    fontFamily: "Copernicus, Tiempos Headline, Noto Serif KR, serif"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -1.5px
  display-lg:
    fontFamily: "Copernicus, Tiempos Headline, Noto Serif KR, serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -1px
  display-md:
    fontFamily: "Copernicus, Tiempos Headline, Noto Serif KR, serif"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.5px
  display-sm:
    fontFamily: "Copernicus, Tiempos Headline, Noto Serif KR, serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.3px
  title-lg:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  title-md:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  caption:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 1.5px
  code:
    fontFamily: "JetBrains Mono, Noto Sans Mono CJK KR, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  button:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  nav-link:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  chat-message-body:
    fontFamily: "StyreneB, Inter, Noto Sans KR, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0
  inline-code:
    fontFamily: "JetBrains Mono, Noto Sans Mono CJK KR, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

container:
  marketing: 1200px
  chat-narrow: 768px

bubble:
  max-width-desktop: "85%"
  max-width-mobile: "92%"

motion:
  cursor-blink: "800ms ease-in-out infinite"
  typing-bounce: "600ms ease-in-out infinite"
  typing-stagger: 150ms
  message-fade-in: "200ms ease-out"
  scroll-smooth: "300ms ease-out"
  press-feedback: "80ms ease-out"

easing:
  standard: "cubic-bezier(0.2, 0, 0.2, 1)"
  decelerate: "cubic-bezier(0.0, 0, 0.2, 1)"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-secondary-on-dark:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
  button-text-link:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.button}"
  button-icon-circular:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 36px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: 64px
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    padding: 96px
  hero-illustration-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  feature-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  product-mockup-card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  code-window-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
    padding: 24px
  model-comparison-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  pricing-tier-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  pricing-tier-card-featured:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  callout-card-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  connector-tile:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.lg}"
    padding: 20px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    height: 40px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  cookie-consent-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 24px
  category-tab:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography: "{typography.nav-link}"
    padding: 8px 14px
    rounded: "{rounded.md}"
  category-tab-active:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.md}"
  badge-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-uppercase}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  cta-band-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
  cta-band-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
  footer:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark-soft}"
    typography: "{typography.body-sm}"
    padding: 64px
  chat-bubble-user:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.chat-message-body}"
    rounded: "{rounded.lg}"
    padding: 12px 16px
    maxWidth: "{bubble.max-width-desktop}"
    align: end
  chat-bubble-assistant:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.chat-message-body}"
    rounded: "{rounded.lg}"
    padding: 12px 16px
    maxWidth: "{bubble.max-width-desktop}"
    align: start
  chat-bubble-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error}"
    typography: "{typography.chat-message-body}"
    rounded: "{rounded.lg}"
    padding: 12px 16px
    align: start
  chat-input-textarea:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    minHeight: 44px
    maxHeight: 200px
    border: "1px solid {colors.hairline}"
    placeholderColor: "{colors.muted-soft}"
  chat-input-textarea-focused:
    borderColor: "{colors.primary}"
    ring: "3px {colors.primary-translucent-15}"
  chat-input-textarea-disabled:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
  chat-send-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 16px
  chat-streaming-cursor:
    backgroundColor: "{colors.primary}"
    width: 2px
    height: 1.1em
    animation: "{motion.cursor-blink}"
  chat-typing-dots:
    dotColor: "{colors.muted-soft}"
    dotSize: 6px
    animation: "{motion.typing-bounce}"
    stagger: "{motion.typing-stagger}"
  chat-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-lg}"
    height: 64px
    borderBottom: "1px solid {colors.hairline}"
  chat-empty-state:
    backgroundColor: "{colors.canvas}"
    headlineTypography: "{typography.display-md}"
    bodyTypography: "{typography.body-md}"
    textColor: "{colors.ink}"
    align: center
  inline-code:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.inline-code}"
    rounded: "{rounded.xs}"
    padding: 2px 6px
  # v2 Roadmap (이름만 등록, 상세 사양은 v2 작업 시 정의)
  chat-stop-button:
    status: v2-roadmap
  chat-attachment-chip:
    status: v2-roadmap
  code-block-in-message:
    status: v2-roadmap
---

## Overview

Claude.com is the warmest, most editorial interface in the AI-product category. The base atmosphere is a **tinted cream canvas** (`{colors.canvas}` — #faf9f5) — distinctly warm, deliberately not the cool gray-white that every other AI brand uses. Headlines run a **slab-serif display** ("Copernicus" / Tiempos Headline) at weight 400 with negative letter-spacing, paired with **StyreneB / Inter** body sans. The combination feels like a literary publication, not a SaaS marketing page.

Brand voltage comes from the **cream + coral pairing** — coral (`{colors.primary}` — #cc785c) is the signature Anthropic accent, used on every primary CTA, on the brand wordmark, and on full-bleed callout cards. The coral is warm, slightly muted, never cyan/blue — a deliberate counter-positioning against OpenAI's cool slate, Google's saturated blue, and Microsoft's corporate cyan.

The system has three surface modes that alternate page-by-page:
1. **Cream canvas** (`{colors.canvas}`) — default body floor
2. **Light cream cards** (`{colors.surface-card}`) — feature card backgrounds
3. **Dark navy product surfaces** (`{colors.surface-dark}`) — code editor mockups, model showcase cards, pre-footer CTAs, footer itself

The dark surfaces are where Claude shows its product chrome — code blocks, terminal output, model comparison tables, agentic-flow diagrams. The cream-to-dark contrast is the page's pacing rhythm.

**Key Characteristics:**
- Warm cream canvas (`{colors.canvas}` — #faf9f5) with dark warm-ink text (`{colors.ink}` — #141413). The brand's defining color choice.
- Coral primary CTA (`{colors.primary}` — #cc785c). Used scarcely on individual buttons, generously on full-bleed coral callout cards.
- Slab-serif display headlines via Copernicus / Tiempos Headline at weight 400 with negative letter-spacing. Pairs with humanist sans body for a literary editorial voice.
- Dark navy product mockup cards (`{colors.surface-dark}` — #181715) carrying code blocks, terminal panels, model comparison data — the brand shows the product chrome at scale rather than abstract marketing illustrations.
- Light cream feature cards (`{colors.surface-card}` — #efe9de) — slightly darker than canvas, used for content-driven feature explanations.
- Anthropic radial-spike mark — a small black asterisk-like glyph (4-spoke radial) — appears as the brand wordmark prefix and as a content marker.
- Border radius is hierarchical: `{rounded.md}` (8px) for buttons + inputs, `{rounded.lg}` (12px) for content + product cards, `{rounded.xl}` (16px) for the hero illustration container, `{rounded.pill}` for badges.
- Section rhythm `{spacing.section}` (96px) — modern-SaaS standard. Internal card padding stays generous at `{spacing.xl}` (32px).

## Colors

### Brand & Accent
- **Coral / Primary** (`{colors.primary}` — #cc785c): The signature Anthropic warm coral. Used on every primary CTA background, on full-bleed coral callout cards, on the brand wordmark accent. The most-recognized Anthropic color outside of the spike-mark logo.
- **Coral Active** (`{colors.primary-active}` — #a9583e): The press / hover-darker variant.
- **Coral Disabled** (`{colors.primary-disabled}` — #e6dfd8): A desaturated cream-tinted disabled state.
- **Accent Teal** (`{colors.accent-teal}` — #5db8a6): Used sparingly on secondary product surfaces (terminal status indicators, "active connection" dots in connectors page).
- **Accent Amber** (`{colors.accent-amber}` — #e8a55a): A small companion warm-tone used on category badges and inline highlights.

### Surface
- **Canvas** (`{colors.canvas}` — #faf9f5): The default page floor. Tinted cream — warm, deliberately not pure white.
- **Surface Soft** (`{colors.surface-soft}` — #f5f0e8): Section dividers, very-soft band backgrounds.
- **Surface Card** (`{colors.surface-card}` — #efe9de): Feature cards, content cards. One step darker than canvas.
- **Surface Cream Strong** (`{colors.surface-cream-strong}` — #e8e0d2): A strongest-cream variant used on selected category tabs and emphasized section bands.
- **Surface Dark** (`{colors.surface-dark}` — #181715): Code editor mockups, model showcase cards, footer. The dominant dark surface.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #252320): Elevated cards inside dark bands (settings panels in mockups).
- **Surface Dark Soft** (`{colors.surface-dark-soft}` — #1f1e1b): Slightly lighter dark, used for code block backgrounds inside larger dark cards.
- **Hairline** (`{colors.hairline}` — #e6dfd8): The 1px border tone on cream surfaces. Same hex as `{colors.primary-disabled}` — borders feel like one elevation step rather than ink lines.
- **Hairline Soft** (`{colors.hairline-soft}` — #ebe6df): Barely-visible divider used inside the same band.

### Text
- **Ink** (`{colors.ink}` — #141413): All headlines and primary text. Warm dark, slightly off-pure-black.
- **Body Strong** (`{colors.body-strong}` — #252523): Emphasized paragraphs, lead text.
- **Body** (`{colors.body}` — #3d3d3a): Default running-text color.
- **Muted** (`{colors.muted}` — #6c6a64): Sub-headings, breadcrumbs, footer-adjacent secondary text.
- **Muted Soft** (`{colors.muted-soft}` — #8e8b82): Captions, fine-print, copyright lines.
- **On Primary** (`{colors.on-primary}` — #ffffff): Text on coral buttons.
- **On Dark** (`{colors.on-dark}` — #faf9f5): Cream-tinted white used on dark surfaces (echoes the canvas tone).
- **On Dark Soft** (`{colors.on-dark-soft}` — #a09d96): Footer body text, secondary labels in dark mockups.

### Semantic
- **Success** (`{colors.success}` — #5db872): Green status dots, "available" indicators.
- **Warning** (`{colors.warning}` — #d4a017): Warning callouts (rare on marketing surfaces).
- **Error** (`{colors.error}` — #c64545): Validation errors.

## Typography

### Font Family
The system runs **Copernicus** (or **Tiempos Headline** as substitute) as the slab-serif display face for headlines, and **StyreneB** (or **Inter** as substitute) as the humanist sans for body, navigation, and UI labels. **JetBrains Mono** handles code blocks. The fallback stack walks `Tiempos Headline, Garamond, "Times New Roman", serif` for display and `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` for body.

The display/body split is editorial:
- Copernicus serif (weight 400, negative tracking) → h1, h2, h3, hero display
- StyreneB sans (weight 400-500) → body, navigation, buttons, captions, labels
- JetBrains Mono → all code blocks and terminal text

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 64px | 400 | 1.05 | -1.5px | Homepage h1 ("Meet your thinking partner") — Copernicus serif |
| `{typography.display-lg}` | 48px | 400 | 1.1 | -1px | Section heads — Copernicus |
| `{typography.display-md}` | 36px | 400 | 1.15 | -0.5px | Sub-section heads, model names — Copernicus |
| `{typography.display-sm}` | 28px | 400 | 1.2 | -0.3px | Pricing tier names, callout headlines — Copernicus |
| `{typography.title-lg}` | 22px | 500 | 1.3 | 0 | Pricing plan size labels — StyreneB |
| `{typography.title-md}` | 18px | 500 | 1.4 | 0 | Feature card titles, intro paragraphs |
| `{typography.title-sm}` | 16px | 500 | 1.4 | 0 | Connector tile titles, list labels |
| `{typography.body-md}` | 16px | 400 | 1.55 | 0 | Default running-text — StyreneB |
| `{typography.body-sm}` | 14px | 400 | 1.55 | 0 | Footer body, fine-print |
| `{typography.caption}` | 13px | 500 | 1.4 | 0 | Badge labels, captions |
| `{typography.caption-uppercase}` | 12px | 500 | 1.4 | 1.5px | Category tags, "NEW" badges |
| `{typography.code}` | 14px | 400 | 1.6 | 0 | Code blocks — JetBrains Mono |
| `{typography.button}` | 14px | 500 | 1.0 | 0 | Standard button labels |
| `{typography.nav-link}` | 14px | 500 | 1.4 | 0 | Top-nav menu items |

### Principles
Display sizes use weight 400 (regular), never bold. Negative letter-spacing (-0.3 to -1.5px) is essential — Copernicus without it reads as off-brand. The serif character is what gives Anthropic its literary, considered voice; switching to a sans-serif display would make Claude feel like every other AI tool.

Body type stays at weight 400 for paragraphs, weight 500 for labels and emphasized phrases. The sans body is humanist (StyreneB) — never geometric. Inter is an acceptable substitute because of its similar humanist proportions; Helvetica or Arial would be too neutral and break the warm-editorial feel.

### Note on Font Substitutes
If Copernicus / Tiempos Headline is unavailable, **Cormorant Garamond** at weight 500 with -0.02em letter-spacing is the closest open-source approximation. **EB Garamond** is a fallback. For StyreneB, **Inter** is the closest match — both are humanist sans designed for screen reading. **Söhne** is another close alternative if licensed.

For Korean (Hangul) coverage, the system pairs each Latin face with a Noto counterpart: **Noto Serif KR** for display tokens, **Noto Sans KR** for body / nav / button tokens, and **Noto Sans Mono CJK KR** for code. All three are distributed via Google Fonts under the **SIL Open Font License 1.1** — free for commercial and non-commercial embedding, with no attribution requirement. The Latin substitutes (Cormorant Garamond, Inter, JetBrains Mono) are likewise OFL 1.1 on Google Fonts.

### Multilingual / Korean

The Latin substitutes alone do not cover Hangul; without a Korean fallback in the stack, browsers drop into OS defaults (Apple SD Gothic Neo on macOS, Malgun Gothic on Windows, Noto Sans CJK on Android), producing inconsistent rendering across platforms. The system solves this by extending each `fontFamily` stack with a Noto Korean fallback:

- Display tokens (`{typography.display-xl}` ~ `{typography.display-sm}`) → `Cormorant Garamond, Noto Serif KR, serif`
- Sans tokens (`{typography.title-*}`, `{typography.body-*}`, `{typography.caption*}`, `{typography.button}`, `{typography.nav-link}`, `{typography.chat-message-body}`) → `Inter, Noto Sans KR, sans-serif`
- Mono tokens (`{typography.code}`, `{typography.inline-code}`) → `JetBrains Mono, Noto Sans Mono CJK KR, monospace`

CSS font-family fallback resolves per-glyph: Latin characters render in the Latin face (Cormorant Garamond, Inter, JetBrains Mono), Hangul characters fall through to the Noto KR face. The two faces appear side by side in mixed sentences and should look like one coordinated voice — both Cormorant Garamond + Noto Serif KR and Inter + Noto Sans KR are humanist, share comparable x-height, and read editorial.

**Letter-spacing for Hangul.** The display tokens use negative tracking (-1.5px to -0.3px) tuned for Cormorant Garamond. Hangul glyphs are visually denser and break at much smaller negative tracking — they look strangled below -0.02em. When a display headline is rendered in Hangul (or mixes Hangul with Latin), override the tracking to **0 or -0.02em**, never the Latin display values. This rule applies only to display tokens; body sizes already track at 0.

**Line-height for Hangul.** Hangul rendering benefits from slightly looser leading than Latin. The body tokens at 1.55–1.65 already accommodate Hangul comfortably; do not tighten below 1.45 for any token that will carry Hangul.

**Loading.** In implementation, `next/font/google` loads each Latin face and its Noto counterpart in parallel. Use the variable-font versions where available (Noto Sans KR variable, Noto Serif KR variable) to avoid loading multiple weight files.

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** `{spacing.section}` (96px) — modern-SaaS rhythm.
- **Card internal padding:** `{spacing.xl}` (32px) for feature cards, pricing tier cards, model comparison cards; `{spacing.lg}` (24px) for code-window cards and connector tiles.
- **Callout / CTA bands:** `{spacing.xxl}` (48px) inside coral callout cards; 64px inside the larger dark CTA band.

### Grid & Container
- **Max content width:** ~1200px centered.
- **Editorial body:** Single 12-column grid; hero often uses 6/6 split (h1 left, illustration right).
- **Feature card grids:** 3-up at desktop, 2-up at tablet, 1-up at mobile.
- **Connector tile grids:** 4-up or 6-up at desktop, 2-up at tablet, 1-up at mobile.
- **Pricing grid:** 3-up at desktop (Free / Pro / Team / Enterprise often), 1-up at mobile.

### Whitespace Philosophy
The cream canvas + serif display + generous internal padding create an editorial pacing — Claude reads like a long-form magazine column rather than a marketing template. Whitespace between bands stays uniform at 96px; whitespace inside cards is generous (32px), letting type breathe.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Body sections, top nav, hero bands |
| Soft hairline | 1px `{colors.hairline}` border | Inputs, sub-nav, occasionally on cards |
| Cream card | `{colors.surface-card}` background — no shadow | Feature cards, content cards |
| Dark surface card | `{colors.surface-dark}` background — no shadow | Code editor mockups, model showcase cards |
| Subtle drop shadow | Faint shadow at low alpha | Hover-elevated states (the system uses `0 1px 3px rgba(20,20,19,0.08)` rarely) |

The elevation philosophy is **color-block first, shadow rare**. Most depth comes from the cream-vs-dark surface contrast. Shadows are minimal. The dark surface mockups have their own internal product chrome (code editor scrollbars, line numbers, syntax highlighting) which adds detail without needing external shadows.

### Decorative Depth
- The Anthropic spike-mark glyph (4-spoke radial asterisk) appears as a small black mark in the brand wordmark and inline as a content marker.
- Code editor mockups carry their own internal depth: syntax-highlighted text in muted blues / oranges / grays, line numbers in `{colors.muted-soft}`, status bars at the bottom in `{colors.surface-dark-elevated}`.
- Some hero illustrations use simple line-art with coral and dark-navy strokes on cream — minimal, hand-drawn-feeling, never photorealistic.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Reserved for badge accents and tiny dropdowns |
| `{rounded.sm}` | 6px | Small inline buttons, dropdown items |
| `{rounded.md}` | 8px | Standard CTA buttons, text inputs, category tabs |
| `{rounded.lg}` | 12px | Content cards (feature, pricing, code-window, model-comparison) |
| `{rounded.xl}` | 16px | Hero illustration container, the larger marquee components |
| `{rounded.pill}` | 9999px | Badge pills, "NEW" tags |
| `{rounded.full}` | 9999px / 50% | Avatar substitutes, icon buttons |

### Photography & Illustrations
Claude's hero rarely uses photography. Instead it uses:
- Simple line-art illustrations with coral + dark-navy strokes on the cream canvas
- Code editor mockups (the dominant "hero" treatment on developer-focused pages)
- Terminal output mockups with monospace text on dark
- Model comparison cards (Opus / Sonnet / Haiku) with abstract geometric thumbnails

When photography is used (rare — mostly testimonials), avatars crop to perfect circles at 40px diameter.

## Components

### Top Navigation

**`top-nav`** — Cream nav bar pinned to the top of every page. 64px tall, `{colors.canvas}` background. Carries the Anthropic spike-mark + "Claude" wordmark at left, primary horizontal menu (Product, Solutions, Use Cases, Pricing, Research, Company) center-left, right-side cluster with "Sign in" text-link, "Try Claude" `{component.button-primary}` (coral). Menu items in `{typography.nav-link}` (StyreneB 14px / 500).

### Buttons

**`button-primary`** — The signature coral CTA. Background `{colors.primary}` (#cc785c), text `{colors.on-primary}` (white), type `{typography.button}` (StyreneB 14px / 500), padding 12px × 20px, height 40px, rounded `{rounded.md}` (8px). Active state `button-primary-active` darkens to `{colors.primary-active}` (#a9583e).

**`button-secondary`** — Cream button with hairline outline. Background `{colors.canvas}`, text `{colors.ink}`, 1px hairline border, same padding + height + radius as primary.

**`button-secondary-on-dark`** — Used over `{colors.surface-dark}` cards. Background `{colors.surface-dark-elevated}` (#252320), text `{colors.on-dark}`. Stays dark — the system never inverts to a light secondary on dark surfaces.

**`button-text-link`** — Inline text button, no background. Used for "Sign in" in the top nav and inline CTA links.

**`button-icon-circular`** — 36px circular icon button. Background `{colors.canvas}`, hairline border, ink-color icon. Used for carousel arrows, share, "view more".

**`text-link`** — Inline body links in `{colors.primary}` (the coral). Underlined on press; the coral inline link is one of the system's most distinctive small details.

### Cards & Containers

**`hero-band`** — Cream-canvas hero with a 6-6 grid: h1 + sub-headline + button row on the left, hero illustration card or product mockup card on the right. Vertical padding `{spacing.section}` (96px).

**`hero-illustration-card`** — A larger card holding the hero's right-side artifact — sometimes a coral-stroke line illustration on cream background, sometimes a dark code editor mockup. Background `{colors.canvas}` or `{colors.surface-dark}` depending on context, rounded `{rounded.xl}` (16px).

**`feature-card`** — Used in 3-up feature grids. Background `{colors.surface-card}` (#efe9de — slightly darker cream), rounded `{rounded.lg}` (12px), internal padding `{spacing.xl}` (32px). Carries a small icon at top, an `{typography.title-md}` headline, and a body description in `{typography.body-md}`.

**`product-mockup-card-dark`** — Dark navy card showing actual Claude product chrome (chat interface, code editor, agent controls). Background `{colors.surface-dark}`, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries text labels in `{colors.on-dark}` and product UI fragments below.

**`code-window-card`** — A specialized dark card showing a code editor with line numbers, syntax-highlighted code in `{typography.code}` (JetBrains Mono), and sometimes a "Run" button or terminal output panel below. Background `{colors.surface-dark}` with `{colors.surface-dark-soft}` for the inner code block, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). The signature visual element of Claude Code product pages.

**`model-comparison-card`** — Used on the homepage's "Which problem are you up against?" section comparing Opus / Sonnet / Haiku. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries the model name, a short capability blurb, and a `{component.text-link}` to learn more.

**`pricing-tier-card`** — Standard tier card. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding `{spacing.xl}` (32px). Carries the plan name in `{typography.title-lg}` (StyreneB), price in `{typography.display-sm}` (Copernicus serif!), feature checklist in `{typography.body-md}`, and a `{component.button-primary}` at the bottom.

**`pricing-tier-card-featured`** — The featured tier (typically "Pro" or "Team"). Background flips to `{colors.surface-dark}`, text inverts to `{colors.on-dark}`. The dark surface IS the featured-tier signal.

**`callout-card-coral`** — A full-bleed coral card carrying a major call-to-action. Background `{colors.primary}` (#cc785c), text `{colors.on-primary}` (white), rounded `{rounded.lg}`, padding `{spacing.xxl}` (48px). The coral surface IS the voltage; the CTA inside uses an inverted button style (cream/canvas button on coral).

**`connector-tile`** — Used on the connectors page's integration grid. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding 20px. Each tile carries a logo at top, a `{typography.title-sm}` connector name, and a short description.

### Inputs & Forms

**`text-input`** — Standard text input. Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}` (8px), padding 10px × 14px, height 40px. 1px hairline border in `{colors.hairline}`.

**`text-input-focused`** — Focus state. Border thickens or shifts to `{colors.primary}` (coral) for emphasis. Carries a 3px coral-at-15%-alpha outer ring.

**`cookie-consent-card`** — Bottom-right floating dark cookie banner. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). One of the few places dark surface appears at small scale on cream pages.

### Tags / Badges

**`badge-pill`** — Small pill label used for category tags. Background `{colors.surface-card}`, text `{colors.ink}`, type `{typography.caption}` (13px / 500), rounded `{rounded.pill}`, padding 4px × 12px.

**`badge-coral`** — Coral-fill badge for "NEW", "BETA", featured highlights. Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.caption-uppercase}` (12px / 500 / 1.5px tracking), rounded `{rounded.pill}`, padding 4px × 12px.

### Tab / Filter

**`category-tab`** + **`category-tab-active`** — Used in sub-nav rows on solutions / connectors pages. Inactive: transparent background, `{colors.muted}` text. Active: `{colors.surface-card}` background, `{colors.ink}` text. Padding 8px × 14px, rounded `{rounded.md}`.

### CTA / Footer

**`cta-band-coral`** — A pre-footer "Try Claude" CTA card. Full-width coral fill, white type, rounded `{rounded.lg}`, padding 64px. Carries an h2 in `{typography.display-sm}` (still serif!), a sub-line, and a cream-button CTA.

**`cta-band-dark`** — Alternative pre-footer band on developer-focused pages. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding 64px. Often pairs with a code-window card.

**`footer`** — Dark navy footer that closes every page. Background `{colors.surface-dark}` (#181715), text `{colors.on-dark-soft}`. 4-column link list at desktop covering Product / Company / Resources / Legal. Vertical padding 64px. The Anthropic spike-mark + "Anthropic" wordmark sits at the top in `{colors.on-dark}`. The footer never inverts.

## Do's and Don'ts

### Do
- Anchor every page on the cream canvas. Pure white reads as "any other AI tool"; the warm tint is the brand differentiator.
- Use Copernicus serif for every display headline. Pair with StyreneB sans body. Negative letter-spacing on display sizes is non-negotiable.
- Reserve `{colors.primary}` (coral) for primary CTAs and full-bleed `{component.callout-card-coral}` moments. Don't paint accent moments coral elsewhere.
- Use `{component.product-mockup-card-dark}` and `{component.code-window-card}` to show actual Claude product chrome. Don't paint marketing illustrations of code when you can show real code.
- Pair `{component.feature-card}` (cream) with `{component.product-mockup-card-dark}` (navy) in alternating bands. The cream-to-dark rhythm is the brand's pacing mechanism.
- Use the Anthropic spike-mark glyph as the brand wordmark prefix. Never invert the mark to white-on-dark within the wordmark itself.
- Apply `{spacing.section}` (96px) between major bands.

### Don't
- Don't use cool grays or pure white for canvas. Cream is the brand.
- Don't bold serif display weight. Copernicus at 700 reads as bombastic; the system stays at 400.
- Don't use cool blue or saturated cyan as a brand accent. The coral is the brand voltage.
- Don't put coral everywhere. The coral is scarce on individual elements and generous only on full-bleed coral callout cards.
- Don't use Inter for display headlines. The serif character is the brand voice.
- Don't repeat the same surface mode in two consecutive bands. The pacing alternates: cream → cream-card → dark-mockup → cream → coral-callout → dark-footer.
- Don't add hover state styling beyond what the system already encodes — primary darkens on press; nothing else changes.

## Chat Interface

The chat interface extends the cream + coral + dark-navy trinity into Claude's conversational product surface. Where the marketing site stages product chrome inside dark mockup cards, the chat surface IS the product chrome — message bubbles, an input chrome, a streaming cursor — all rendered directly on the cream canvas. Coral remains scarce: it appears on user message bubbles (the user's voice) and on the send CTA. Assistant messages take the cream `{colors.surface-card}` tone — visually adjacent to the canvas, calm, never inverted to dark. The trinity rule is preserved: no fourth surface tone, no surprise accent.

### Overview

A chat page is a single-column conversation centered at `{container.chat-narrow}` (768px) on the `{colors.canvas}` floor. A `{component.chat-header}` pins the top, a `{component.chat-input-textarea}` pins the bottom, and the message list scrolls between them. Messages alternate between right-aligned user bubbles and left-aligned assistant bubbles, separated by `{spacing.md}` (16px). Streaming responses materialize one token at a time, with a coral `{component.chat-streaming-cursor}` blinking at the trailing edge until the response completes.

### Components

**`chat-bubble-user`** — The user's voice, rendered as a coral fill bubble. Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.chat-message-body}`, rounded `{rounded.lg}` (12px — content radius, not button radius), padding 12px × 16px, max-width `{bubble.max-width-desktop}` (85%), right-aligned. Coral here is deliberate brand voltage: the user's contributions stand out against the cream canvas. Never add an outline border — the coral fill is the bubble.

**`chat-bubble-assistant`** — The agent's voice, rendered on `{colors.surface-card}` (#efe9de — the same cream-card tone as feature cards). Text `{colors.ink}`, type `{typography.chat-message-body}`, rounded `{rounded.lg}`, padding 12px × 16px, max-width `{bubble.max-width-desktop}`, left-aligned. The assistant bubble visually echoes the marketing site's `{component.feature-card}` surface — the editorial cream voice continues into the conversation.

**`chat-bubble-error`** — Reserved for failed or rejected responses. Background `{colors.error-soft}` (a 10% alpha of `{colors.error}`), text `{colors.error}`, rounded `{rounded.lg}`. Pairs with an inline `{component.text-link}` (coral) for retry. Error styling stays muted — soft tint, not a saturated red flag — to match the system's calm voice.

**`chat-input-textarea`** — A multi-line input pinned to the bottom of the chat. Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}` (8px — input radius, not content radius), 1px hairline border in `{colors.hairline}`, padding 10px × 14px. Min-height 44px (single line), max-height 200px (auto-grows then scrolls internally). Placeholder text `{colors.muted-soft}`. Focus state shifts the border to `{colors.primary}` and adds a 3px outer ring at `{colors.primary-translucent-15}` — the same focus signature as `{component.text-input-focused}`. Disabled state (during streaming) flips to `{colors.surface-soft}` background + `{colors.muted}` text.

**`chat-send-button`** — A `{component.button-primary}` variant for sending messages. Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}`, rounded `{rounded.md}`, height 40px, padding 0 × 16px. Sits to the right of `{component.chat-input-textarea}` in the input row, vertically aligned to its bottom. Inherits the active darkening to `{colors.primary-active}` on press.

**`chat-typing-dots`** — Three 6px circles in `{colors.muted-soft}` that bounce in sequence before the first token arrives. Animation `{motion.typing-bounce}` (600ms infinite), staggered by `{motion.typing-stagger}` (150ms between dots). Muted-soft (not coral) is intentional — the system reserves coral for completed actions, not anticipation. Streaming itself uses progressive token rendering inside `{component.chat-bubble-assistant}` with no trailing cursor — a distinct cursor was tested and felt distracting against Markdown that grows as it arrives.

**`chat-header`** — Replaces `{component.top-nav}` for chat pages. Height 64px, background `{colors.canvas}`, 1px hairline bottom border in `{colors.hairline}`. Carries the wordmark left-aligned in `{typography.title-lg}` (StyreneB / Inter 22px / 500). The chat header strips the marketing nav menu — chat is a focused workspace, not a marketing surface.

**`chat-empty-state`** — Shown when the conversation has no messages yet. A centered `{typography.display-md}` Copernicus serif headline (e.g., "How can I help?") with a `{typography.body-md}` sub-line in `{colors.muted}`. No illustrations, no photos — the cream canvas + serif headline carries the editorial voice on its own.

**`inline-code`** — In-message code reference (e.g., a function name inside a sentence). Background `{colors.surface-card}`, text `{colors.ink}`, type `{typography.inline-code}` (JetBrains Mono 14px), rounded `{rounded.xs}`, padding 2px × 6px. Distinct from multi-line `{component.code-block-in-message}`.

**`code-block-in-message`** — Multi-line code fence inside an assistant message. Dark navy surface `{colors.surface-dark}` with `{colors.on-dark}` text and Prism syntax highlighting (vsDark theme). Header strip with language label (mono, muted) on the left and inline `{component.button-icon-circular}`-style `[복사]` on the right; transient `[복사됨]` confirmation for ~1.5s. Renders inside `{typography.chat-message-body}` flow at `{rounded.md}` (the only place dark navy crosses into the chat surface — kept tight to code only).

**`markdown-rendering-policy`** — Assistant message bodies render as Markdown via `react-markdown` + `remark-gfm` + `rehype-sanitize`. Allowed: headings, lists (ordered / unordered), GFM tables, blockquote, links (whitelisted schemes only — `https:` / `http:` / `mailto:` / relative; everything else is stripped to plain text), inline code, code blocks (see above), strong / em / strikethrough, horizontal rule. Raw HTML is sanitized away. A `MarkdownErrorBoundary` wraps each assistant body so a parser throw degrades that bubble to plain `whitespace-pre-wrap` text without breaking neighbors.

**`chat-message-action-group`** — Small action row that surfaces under each non-streaming message bubble. Per `{component.button-icon-circular}` styling at the smaller end (text-caption, `{colors.muted}` resting → `{colors.ink}` on hover, opacity 0.6 → 1.0 on hover/focus-within). User messages: `[복사]`. Assistant messages: `[복사] [👍] [👎]` plus, when paired panels are present, `[패널 접기/펼치기]` (header-only fold) and `[패널 비활성화/활성화]` (full hide/show). Feedback toggles are local-state (휘발) until a backend endpoint exists.

**`chat-attachment-chip`** — Pill chip rendered above `{component.chat-input-textarea}` for each pasted/dropped image (`Ctrl+V` or drag&drop). Background `{colors.canvas}`, hairline border, rounded `{rounded.md}`, with a 40×40 thumbnail (`object-cover`) + filename (truncated) + `[×]` remove button. Allowed MIME `image/png · image/jpeg · image/webp · image/gif`, single-file 5MB cap, max 4 per message; violations show an inline `role="alert"` caption in `{colors.error}`. Once sent, the image renders on the user bubble as a 2-up grid (`max-h-40` per item).

**`chat-suggested-question-chip`** — Pill chip stack above `{component.chat-input-textarea}`, `{rounded.pill}`, 1px `{colors.primary}` outline at rest, fills to `{colors.primary}` on hover. Two modes: (1) empty-state example questions before the first message, (2) backend-supplied follow-up suggestions after a streamed response. In the demo mode only the first chip — the one that exactly matches the next scripted user message — is enabled (gold border carrier); the rest render disabled with a hairline `{colors.primary-disabled}` outline + `cursor-not-allowed` and a tooltip explaining the demo constraint.

**`chat-paired-table`** — Optional companion table for an assistant message, placed in the left or right gutter (`{container.chat-narrow}` 좌·우 `1fr` columns at `xl+`, stacked under the bubble below). Card has a top action bar (title button — toggles fold — plus `[펼치기]` height-cap removal, `[확장]` overlay for wide tables, `[CSV 복사]`). Body is a `{rounded.md}` card with `{colors.hairline}` border, internal vertical scroll capped at ~280px (≈10 rows) with sticky header.

**`chat-paired-chart`** — Companion chart card on the same gutter system. Title bar with chevron toggle, body is a recharts `ResponsiveContainer` (line / bar / area) rendered against `{colors.canvas}`. Reference lines (vertical / horizontal) and reference areas (range bands) are tokens from the message payload — used for STEP boundaries and threshold levels.

**`chat-paired-timeline`** — Custom-SVG Gantt-style timeline (process / step tracks, sub-row stacking via greedy interval scheduling). Same gutter card pattern with header chevron + `[전체 보기]` overlay. Step bars use a per-track color cycle (`accent-teal`, `accent-amber`, `success`, `warning`, `primary`) with thin `{colors.hairline}` dividers between tracks; process bars span the full row in `{colors.muted}`.

**`chat-conversation-history-sidebar`** — Left 320px push-layout sidebar (mirror of right-side context panel — `w-0 ↔ w-[320px]` transition, no overlay). Persistent conversation list grouped by relative time (`방금` / `N분 전` / `N시간 전` / `N일 전` / absolute date), each item showing title + context summary (e.g., `ETCH-01 · 2026-05-02 13:00~14:00`). Tap loads that conversation into the chat. Persistence is client-side `localStorage` only (no backend).

**`chat-summary-panel`** — Right 320px panel for ops handover. Sections: 설비 정보 (key:value rows carried by the conversation), 발생 시간, 요약 (Phase-1 placeholder until backend). `[복사]` flattens everything into a single Markdown payload for paste into mail/messenger.

**`help-fab`** — Bottom-right fixed circular button (44×44, `{colors.primary}` fill, `{rounded.pill}`) with a `?` glyph. Click opens a centered modal whose body is rendered from `src/content/help.md` through `{component.markdown-rendering-policy}`. Close on `[×]` / `Esc` / backdrop click.

**`settings-modal`** — Header `[⚙]` opens a centered modal with theme / font-size / language / model settings. Theme switching applies live (see §Theme Variants). Font size / language / model are placeholder selects until backend or i18n lands.

### Tokens

**Alpha colors** — `{colors.primary-translucent-15}`, `{colors.error-soft}`, `{colors.ink-translucent-04}` are alpha variants of existing trinity colors. They are not new surface tones — they are existing colors at reduced opacity for focus rings, soft error backgrounds, and hover states. Using them does NOT violate §Iteration Guide §6 ("Don't introduce a fourth surface tone").

**Container** — `{container.chat-narrow}` (768px) is the chat-specific max-width, narrower than `{container.marketing}` (1200px) because reading dense conversation text benefits from a tighter measure. The container is centered on the page.

**Bubble** — `{bubble.max-width-desktop}` (85%) and `{bubble.max-width-mobile}` (92%) cap how wide a single message bubble can grow. The remaining gutter on the opposite side is what gives the visual cue of "user vs assistant." On `xl+` viewports the chat layout switches to a 3-column grid `[1fr | 768 | 1fr]` so paired tables/charts/timelines flow into the gutters without shifting the bubble out of center.

**Motion** — All chat motion tokens are short and deliberate. `{motion.typing-bounce}` is the only continuous animation visible on a quiet chat (and only briefly, before the first token). `{motion.message-fade-in}` (200ms) softens new message arrival. `{motion.scroll-smooth}` (300ms) governs auto-scroll to bottom on new content.

**Easing** — `{easing.standard}` for press / state transitions, `{easing.decelerate}` for new content arrivals.

### Typography

| Token | Use |
|---|---|
| `{typography.chat-message-body}` | Default body for both user and assistant bubbles — 16px / line-height 1.65 / sans. Slightly looser leading than `{typography.body-md}` for sustained reading of conversational text. |
| `{typography.inline-code}` | Inline `code` references inside `{typography.chat-message-body}` runs — 14px JetBrains Mono. |

### Do's and Don'ts (Chat-specific)

#### Chat Do's
- Always use `{component.chat-bubble-user}` (coral) for the user's voice. Coral remains a scarce signal — never paint the assistant or system messages coral.
- Always use `{component.chat-bubble-assistant}` (cream-card) for the agent's voice. Never invert assistant bubbles to `{colors.surface-dark}`.
- Keep message-to-message spacing at exactly `{spacing.md}` (16px). If grouping is needed, add a visual divider, not extra padding.
- Pair the streaming state with two signals: input `disabled` and progressive token rendering inside `{component.chat-bubble-assistant}`. No standalone trailing cursor.
- Use `{component.chat-header}` on chat pages, not the marketing `{component.top-nav}`.
- Show `{component.chat-typing-dots}` (muted-soft, not coral) before the first streamed token arrives.

#### Chat Don'ts
- Don't use the marketing `{component.top-nav}` on chat pages — its menu is for marketing surfaces, not the chat workspace.
- Don't paint message areas with `{colors.surface-dark}`. Dark surfaces are reserved for code mockups and the footer; they break the calm conversation tone.
- Don't add box shadows to message bubbles. Chat preserves the §Elevation principle of "color-block first, shadow rare."
- Don't add an outline border to `{component.chat-bubble-user}`. The coral fill alone is the bubble — an outline reads as a button.
- Don't decorate the empty state with illustrations, photos, or icons. The cream canvas + a Copernicus serif headline is the editorial voice; anything more is noise.
- Don't animate beyond what the `{motion.*}` tokens prescribe — adding bouncing avatars, sliding bubbles, or rainbow gradients breaks the calm voice.

### States

| State | Component | Visual |
|---|---|---|
| `default` | all chat components | base styling per spec |
| `streaming` | `{component.chat-bubble-assistant}` | progressive Markdown token rendering, no trailing cursor |
| `pending` | `{component.chat-bubble-user}` | opacity 0.6 until server acknowledges |
| `failed` | `{component.chat-bubble-user}` | hairline border `{colors.error}`, trailing `!` icon, retry link |
| `loading-initial` | `{component.chat-bubble-assistant}` | content replaced by `{component.chat-typing-dots}` until first token |
| `disabled` | `{component.chat-input-textarea}` | bg `{colors.surface-soft}`, text `{colors.muted}` (active during streaming) |
| `focused` | `{component.chat-input-textarea}` | border `{colors.primary}` + 3px ring `{colors.primary-translucent-15}` |

### Accessibility

- The message list region uses `role="log"` and `aria-live="polite"` so assistive tech announces new messages without interrupting the user.
- A streaming assistant message is marked `aria-busy="true"` until the stream ends — screen readers wait for completion before announcing.
- Keyboard contract:
  - **Enter** submits the message.
  - **Shift + Enter** inserts a line break inside the textarea.
  - Focus returns to `{component.chat-input-textarea}` immediately after submit.
- Touch targets stay at minimum 40 × 40px (`{component.chat-send-button}` and `{component.chat-input-textarea}` collapsed height 44px).

### Responsive

- The chat container collapses from `{container.chat-narrow}` (768px) at desktop to full-width with `{spacing.lg}` outer padding at mobile.
- `{component.chat-input-textarea}` uses `position: sticky` + `bottom: env(safe-area-inset-bottom)` on mobile to clear iOS notches and the on-screen keyboard.
- The page height anchors on `100dvh` (dynamic viewport height) instead of `100vh` so the layout doesn't break when the mobile keyboard appears.
- Bubble max-width relaxes from 85% (desktop) to 92% (mobile) to recover horizontal breathing room.
- `{component.chat-header}` does NOT collapse to a hamburger — it's already minimal (wordmark only). Mobile uses the same header at the same height.

### Theme Variants

Five color themes selectable from `{component.settings-modal}`. Cool-Gray is the default — picked for the industrial / cleanroom-adjacent feel of the FDC domain, which sits closer to slate than to warm coral. Themes apply at runtime via a `data-theme` attribute on `<html>`; a small inline boot script reads the persisted choice from `localStorage` before hydration to avoid FOUC. Tailwind v4 utilities are emitted as `var(--color-*)` so each theme just overrides the same set of tokens.

| Theme | Canvas | Ink | Primary | Notes |
|---|---|---|---|---|
| `light` | cream `#faf9f5` | near-black `#141413` | coral `#cc785c` | Original brand voltage. Matches the marketing surface. |
| `dark` | warm-black `#1a1814` | warm off-white `#f5f1e8` | brighter coral `#d68870` | Dark inversion that preserves the cream/coral mood — not cold-blue dark. |
| `sepia` | warm beige `#f5ebd6` | espresso `#3a2e1f` | deep coral `#b8624a` | Reading-tuned. Useful for long analysis sessions. |
| `cool-gray` (default) | cool gray `#f4f5f7` | navy-ink `#1c1f24` | slate-blue `#4f6d8a` | Industrial / cleanroom register. The default for FDC. |
| `high-contrast` | pure white `#ffffff` | pure black `#000000` | strong red `#b00020` | Accessibility-first. Hairlines harden to black; semantic colors saturate. |

`system` is exposed in the settings UI but currently falls back to `light` until OS-level detection is wired up. Theme switching never alters layout — only token values change — so the chat / panels / charts all reflow into the new palette without shifting position.

### Image Attachments (chat-side)

Image paste / drag&drop into `{component.chat-input-textarea}` produces `{component.chat-attachment-chip}` previews. Constraints (client-side first line of defense): MIME whitelist `image/png · image/jpeg · image/webp · image/gif` (no SVG / HTML), 5MB single-file cap, max 4 chips per message; pasted screenshots are auto-named `pasted-{ts}.{ext}`. On send, attachments live on the user `Message` as `attachments[]` (base64 `dataUrl` for now; a future upload endpoint will switch to URL refs). Backend must duplicate validation and add magic-byte checks before any future server-side scan / sandbox.

### v2 Roadmap

The following are still deferred. Names and one-line intent are recorded so the surface stays focused; full token specs land when each item is built.

- **`chat-stop-button`** — a `{component.button-secondary}` variant placed adjacent to `{component.chat-send-button}` during streaming, bound to Esc key, that interrupts an in-progress response.
- **`chat-message-timestamp-meta`** — small caption under each message for timestamp / "Edited" markers / token usage info.
- **`shadow.*` tokens** — formal elevation scale (none / hairline / raise / modal). Currently the modal stack uses ad-hoc `shadow-md` / `shadow-xl`; promote to tokens once dialog count grows.
- **`z-index.*` tokens** — a layering hierarchy (base / sticky-input / toast / modal / tooltip). Currently uses ad-hoc 30 / 40 / 50; same — promote when conflicts surface.
- **`container.chat-medium`** (1024px) — wider chat layout for a future side-by-side artifact pane.
- **Toast notifications** — replace inline `role="alert"` / `role="status"` strings (clipboard success, attach errors, etc.) with a unified bottom-right toast stack.
- **Onboarding & login** — first-touch flow + auth surfaces. Will pull `{colors.primary}` for the auth CTA and reuse the editorial empty-state voice.
- **Equipment compare v3** — multi-equipment 1:N comparison + non-single baseline modes (avg / reference / user-defined).
- **Theme: `system` auto-detection** — currently `system` falls back to `light`; wire `prefers-color-scheme` once the dark variant has shipped to production.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Hamburger nav; hero h1 64→32px; hero-illustration-card stacks below content; feature grids 1-up; connector tiles 2-up; pricing 1-up; footer 4 cols → 1 |
| Tablet | 768–1024px | Top nav stays horizontal but tightens; feature cards 2-up; connector tiles 3-up; pricing 2-up |
| Desktop | 1024–1440px | Full top-nav with all menu items; 3-up feature cards; 4-up or 6-up connector tiles; 3-up pricing tiers |
| Wide | > 1440px | Same as desktop with more outer breathing room; max content width caps at 1200px |

### Touch Targets
- `{component.button-primary}` at minimum 40 × 40px.
- `{component.button-icon-circular}` at exactly 36 × 36 — slightly under WCAG 44 but visually centered.
- `{component.text-input}` height is 40px.
- Connector tile entire card area is tappable; effective tap area >> 44px.

### Collapsing Strategy
- Top nav collapses to hamburger at < 768px; menu opens as a full-screen cream sheet.
- Hero band's 6-6 grid collapses to single-column on mobile — h1 + sub-head + buttons first, then the illustration / mockup card below.
- Feature grids reduce columns rather than scaling cards down.
- Pricing tier cards collapse 4 → 2 → 1; featured-tier dark surface stays visually distinct at every breakpoint.
- Code-window cards retain code legibility at every breakpoint by allowing horizontal scroll within the card rather than wrapping code lines.

### Image Behavior
- Code blocks inside dark mockups stay at fixed font-size; horizontal scroll on mobile rather than wrapping.
- Hero illustrations scale proportionally; line-art strokes thin slightly on mobile.
- Avatar photos in testimonials crop to circles at every breakpoint.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key (`{component.feature-card}`, `{component.code-window-card}`).
2. Variants of an existing component (`-active`, `-disabled`, `-focused`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Never document hover. Default and Active/Pressed states only.
5. Display headlines stay Copernicus serif 400 with negative tracking. Body stays StyreneB / Inter 400. The split is unbreakable.
6. Cream + coral + dark navy is the trinity. Don't introduce a fourth surface tone (no purple cards, no green sections).
7. When in doubt about emphasis: bigger Copernicus serif before bolder weight.

## Known Gaps

- Copernicus and StyreneB are licensed Anthropic typefaces and not available as public web fonts. Substitutes (Tiempos Headline / Cormorant Garamond / EB Garamond for serif; Inter / Söhne for sans) are documented in the typography section.
- The Anthropic radial-spike-mark is a brand glyph rendered as inline SVG; it's not formalized as a system token here. Treat it as a logo asset.
- Animation and transition timings (chat message reveal, code block typewriter effect on the homepage, agentic-flow diagram animations) are not in scope.
- Form validation states beyond `{component.text-input-focused}` are not extracted — error / success states would need a sign-up or feedback flow to confirm.
- Chat product components (message bubbles, input chrome, typing indicator, empty state, inline code, code blocks, paired tables/charts/timelines, history sidebar, equipment detail panel, summary panel, help FAB, settings modal, attachment chips) are now defined in §Chat Interface. The originally-planned `chat-streaming-cursor` was removed in v1 — progressive Markdown rendering covers the streaming signal without a trailing cursor. Items still out of scope are listed under §Chat Interface > v2 Roadmap.
- The "agent" / "computer use" demo cards on certain pages display animated Claude controlling a browser — the static screenshot doesn't fully capture the animation chrome.
