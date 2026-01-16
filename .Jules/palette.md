# Palette's Journal

## 2026-01-16 - [CSS Order Criticality]
**Learning:** CSS `@import` rules must strictly precede all other rules in a file. Violating this caused a build crash in Next.js 16/Turbopack.
**Action:** Always check `globals.css` or main stylesheet for correct import ordering when environment issues arise.

## 2026-01-16 - [Grouped Inputs Accessibility]
**Learning:** When multiple inputs share a single visual label (like "Price Level: Min - Max"), using `aria-label` on individual inputs is a clean, non-disruptive way to ensure accessibility without refactoring layout into a `fieldset`.
**Action:** Use `aria-label` for inputs in "split" or grouped fields where visual labels are shared.
