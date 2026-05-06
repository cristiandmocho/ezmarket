---
name: Scandinavian Fintech
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#404943'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#707973'
  outline-variant: '#bfc9c1'
  surface-tint: '#2c694e'
  primary: '#0f5238'
  on-primary: '#ffffff'
  primary-container: '#2d6a4f'
  on-primary-container: '#a8e7c5'
  inverse-primary: '#95d4b3'
  secondary: '#1261a3'
  on-secondary: '#ffffff'
  secondary-container: '#7ab7ff'
  on-secondary-container: '#00477d'
  tertiary: '#723800'
  on-tertiary: '#ffffff'
  tertiary-container: '#954b00'
  on-tertiary-container: '#ffd0b2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b1f0ce'
  primary-fixed-dim: '#95d4b3'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#0e5138'
  secondary-fixed: '#d2e4ff'
  secondary-fixed-dim: '#a1c9ff'
  on-secondary-fixed: '#001c37'
  on-secondary-fixed-variant: '#00487f'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.04em
  price-display:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 16px
  margin-mobile: 20px
---

## Brand & Style

The design system is rooted in Scandinavian minimalism, prioritizing utility, clarity, and a sense of financial calm. It rejects the chaotic, high-energy aesthetic of traditional retail flyers in favor of a sophisticated fintech approach. The visual language conveys reliability and intelligence, positioning the app as a professional tool for household financial management rather than a simple coupon aggregator.

The style is defined by **Minimalism** with subtle **Corporate Modern** influences. It utilizes heavy whitespace to reduce cognitive load, allowing price data and product imagery to remain the focal point. The atmosphere is intentional and disciplined, fostering a habit-forming experience through a clean, predictable interface that respects the user's time and focus.

## Colors

The palette is restricted to maintain a lightweight, professional feel. The primary "Savings Green" (#2D6A4F) is used to highlight value, successful comparisons, and primary actions. "Portugal Blue" (#005A9C) serves as a secondary accent for informative elements and subtle trust indicators. 

A "Tertiary Alert" color is included sparingly for price drops or urgent savings. Backgrounds are strictly off-white (#FAFAFA) or pure white (#FFFFFF) to ensure the UI feels airy. Neutral greys are utilized for structural borders and secondary surface areas, ensuring high contrast for typography while maintaining a soft overall appearance.

## Typography

This design system uses a dual-font strategy to balance character with functionality. **Manrope** is used for headlines and price displays, offering a modern, geometric feel that aligns with fintech aesthetics. **Inter** is used for all body copy and UI labels to ensure maximum legibility at small sizes and across various screen densities.

Line heights are intentionally generous (1.6x for body text) to create an open, readable flow. Price displays feature a tighter letter-spacing and heavier weight to stand out as primary data points. Numerical data should always use tabular lining figures if available to ensure price columns align perfectly in comparison views.

## Layout & Spacing

The layout follows a strictly defined 8px grid system to ensure vertical rhythm and visual harmony. On mobile, a fluid grid with 20px outer margins and 16px gutters is used. For tablet and desktop views, the content conforms to a fixed-width central column to prevent line lengths from becoming unreadable.

Generous padding is applied to all touch targets, exceeding minimum accessibility standards to ensure ease of use in fast-paced supermarket environments. Vertical spacing between logical sections is typically 32px or 48px to clearly demarcate different groups of information without the need for heavy visual dividers.

## Elevation & Depth

Depth is communicated through **Tonal Layers** and **Ambient Shadows**. The design system avoids high-contrast shadows, opting instead for extra-diffused, low-opacity (#000000 at 4-8%) elevation markers that make components appear to float slightly above the #FAFAFA background.

Surface levels are defined as follows:
1.  **Level 0 (Base):** The main background (#FAFAFA).
2.  **Level 1 (Cards):** Pure white (#FFFFFF) surfaces with a subtle 1px border (#E0E0E0) or a very soft shadow.
3.  **Level 2 (Modals/Popovers):** Pure white with a more pronounced ambient shadow to indicate high priority and interaction.

Interactions do not use "glow" effects; instead, they use subtle shifts in background color or slight depth increases to signal state changes.

## Shapes

The shape language is consistently "Rounded" to evoke a sense of approachability and modernism. All primary UI containers, including buttons and product cards, utilize a base radius of 8px. Larger containers like bottom sheets or modals use a 1.5rem (24px) radius on top corners to create a soft, welcoming transition.

Product imagery is always housed in centered, square containers with an 8px radius. These containers use a subtle #F5F5F5 fill to provide a consistent frame for items with varying background colors in their original photography.

## Components

**Buttons**
Primary buttons are solid "Savings Green" with white text, featuring 16px vertical padding and 24px horizontal padding. Secondary buttons use a ghost style with a #E0E0E0 border and "Neutral" text.

**Product Cards**
Cards are the core component. They feature a white background, a 1px border (#E0E0E0), and centered imagery. The price is anchored to the bottom right in "Savings Green," while the product name uses "Headline-MD" styling.

**Chips & Tags**
Used for categories and filters. They feature a "Surface Muted" background (#F5F5F5) and "Body-SM" text. Active states transition to "Primary Green" with white text.

**Input Fields**
Fields are large (48px-56px height) with a subtle #E0E0E0 border that turns "Portugal Blue" on focus. Labels sit clearly above the input area using "Label-MD."

**Price Comparison List**
A specialized component showing a vertical stack of stores. Each row includes the store logo, the specific price, and a "trend" icon (outlined arrow) indicating if the price is higher or lower than the weekly average.

**Icons**
Icons are strictly 24px outlined stroke (1.5px width), utilizing simple geometric forms. They are never filled unless in an "active" bottom navigation state.