# Search Filters Accessibility Notes

## Semantic structure
- Each logical group of controls (search query, special badges, rating, price, near-me) is wrapped in a `<fieldset>` with a descriptive `<legend>` so assistive tech exposes the relationship between labels and controls.
- The top-level filter toggle button now has an `aria-live="polite"` companion region that announces how many filters are active. Screen reader users immediately hear when filters change without moving focus.
- Toggle buttons use `aria-pressed` and the near-me slider exposes `aria-valuenow`/`aria-valuetext` to describe its numeric value and friendly distance copy.

## Keyboard interaction example
1. Press <kbd>Tab</kbd> to focus the Filters button, then press <kbd>Space</kbd> to open the panel.
2. Continue pressing <kbd>Tab</kbd> to enter each `<fieldset>`. Legends are announced, so users know which group of options they are in.
3. Within a toggle group, use <kbd>Space</kbd> to toggle the current button, or <kbd>Shift</kbd> + <kbd>Tab</kbd> to move back to the legend and skip to other groups.
4. When "Near Me" is enabled, tabbing lands on the radius slider. Use the arrow keys to fine tune the radius; the screen reader announces the formatted distance because of `aria-valuetext`.
5. As filters are applied or cleared, the live region near the Filters button announces "No filters applied" or "N active filters" so users always know the current state.

> These notes serve as a lightweight documentation alternative until a full Storybook story is available.
