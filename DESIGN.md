---
name: E-Farmers Purwodadi
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#414844'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#0e6c4a'
  on-secondary: '#ffffff'
  secondary-container: '#a0f4c8'
  on-secondary-container: '#19724f'
  tertiary: '#002d1a'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a432e'
  on-tertiary-container: '#84b095'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#a0f4c8'
  secondary-fixed-dim: '#85d7ad'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#c0edd0'
  tertiary-fixed-dim: '#a4d1b4'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#264f39'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Public Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  label-lg:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.05em
  button-text:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target-min: 56px
  gutter: 16px
  margin-mobile: 20px
  stack-space: 24px
  container-padding: 24px
---

## Brand & Style

The design system is built on a foundation of **Trustworthy Professionalism** and **High Accessibility**. It is specifically tailored for agricultural financial management, where clarity and reliability are paramount. The visual language avoids decorative clutter to focus entirely on task completion and data legibility for farmers who may be using the device in outdoor or high-glare environments.

The style is **Modern Corporate** with an emphasis on **Functional Clarity**. By utilizing high-contrast surfaces and generous interactive targets, it ensures that users of all technical proficiencies—and those with age-related visual or motor declines—can navigate their finances with confidence. The atmosphere is calm, grounded, and rooted in the agricultural identity through a deliberate, natural color palette.

## Colors

The palette is derived from botanical life cycles, moving from deep, stable forest greens to vibrant, optimistic leaf greens.

- **Primary (Forest Green):** Used for critical actions, headers, and primary branding. It provides the highest contrast against white backgrounds for maximum legibility.
- **Secondary (Leaf Green):** Used for success states, growth indicators (positive cash flow), and secondary buttons.
- **Tertiary (Sage/Mint):** Used for subtle backgrounds, row striping, and non-critical status chips.
- **Neutral:** A range of very light grays and off-whites to prevent screen glare while maintaining a clean, high-contrast environment for data entry.

**Functional Colors:** 
- **Error:** High-visibility Crimson (#D00000) for negative balances or input errors.
- **Surface:** Pure White (#FFFFFF) is the standard for cards and input areas to ensure 7:1 contrast ratios for text.

## Typography

This design system uses **Public Sans** exclusively. Originally designed for government systems, it offers exceptional legibility, neutral personality, and strong glyph distinction—essential for financial figures.

- **Scale:** All font sizes are intentionally oversized. The "Small" text in this system is equivalent to "Medium" in standard consumer apps.
- **Hierarchy:** Use Bold (700) for all monetary values and primary headers to ensure they are the first thing a user sees.
- **Numbers:** Ensure tabular lining is used for financial data so that columns of numbers align perfectly for easy comparison.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a "Big Target" philosophy. 

- **Touch Targets:** No interactive element (button, checkbox, link) should be smaller than 56px in height. This accommodates users with less precision or those using the app with soiled or gloved hands.
- **Vertical Rhythm:** A generous 8px base grid is used. Sections should be separated by at least 24px (stack-space) to prevent visual crowding.
- **Mobile First:** On Android, the layout uses a single-column approach for financial lists. Multi-column layouts are avoided to ensure text can remain large and readable without horizontal scrolling.

## Elevation & Depth

To maintain high contrast and simplicity, this design system avoids complex shadows or translucency.

- **Tonal Layering:** Hierarchy is created by placing White (#FFFFFF) cards on a Very Light Gray (#F8F9FA) background. 
- **Outlines:** Use subtle, 1px solid borders (#DEE2E6) for input fields instead of heavy shadows. This keeps the UI feeling "flat" and easy to parse.
- **Active State:** When a card or button is pressed, it should use a subtle inner-shadow or a color shift to the secondary green, providing immediate tactile feedback.

## Shapes

The shape language uses **Rounded (0.5rem)** corners to create a friendly, approachable feel while maintaining a sense of structural integrity. 

- **Cards:** Use `rounded-lg` (1rem) for main financial summary cards to make them feel like distinct physical objects.
- **Buttons:** Use `rounded-lg` for primary actions. Avoid fully pill-shaped buttons as they can reduce the available area for large-text labels.
- **Inputs:** Use standard `rounded` (0.5rem) to signify a familiar area for data entry.

## Components

### Buttons
- **Primary:** Forest Green background with White text. Minimum height 56px.
- **Secondary:** White background with 2px Forest Green border.
- **Labels:** Always use Bold weight and 20px font size.

### Input Fields
- **Design:** Large text areas with a persistent 16px label above the field (not floating). 
- **Validation:** Use thick 3px borders for focus states (Leaf Green) or error states (Crimson).

### Financial Cards
- **Structure:** A white container with a 1px border. The "Total Balance" or "Profit/Loss" should be the largest text element (Headline-LG) at the top of the card.
- **Action:** If the card is tappable, include a "chevron-right" icon to provide a visual cue for navigation.

### List Items
- **Spacing:** Each row in a ledger or expense list must have a minimum height of 72px.
- **Visuals:** Use icons (e.g., a tractor, a seed bag, a coin) in a 40px Sage Green circle to help users quickly categorize expenses without reading.

### Data Chips
- **Usage:** Used for status (e.g., "Paid", "Pending"). 
- **Style:** High-saturation background with dark text to ensure the status is legible at a glance.