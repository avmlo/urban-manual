# Untitled UI Icons Setup Guide

This project uses [Untitled UI Icons](https://www.untitledui.com/free-icons) for category icons.

## Quick Start

1. **Download Icons**
   - Visit https://www.untitledui.com/free-icons
   - Browse or search for the icons you need
   - Click on an icon to view it
   - Click "Copy SVG" or download the SVG file

2. **Add Icons to Project**
   - Save SVG files in `public/icons/untitled-ui/` directory
   - Name the file to match the icon name in `lib/icons/category-icons.ts`
   - Example: For the 'utensils' icon, save as `utensils.svg`

3. **Required Icons**
   Based on the category mapping, you'll need these icons:
   - `utensils.svg` - Dining/Restaurant
   - `coffee.svg` - Cafe
   - `wine.svg` - Bar/Nightlife
   - `building-02.svg` - Hotel
   - `shopping-bag.svg` - Shopping
   - `camera.svg` - Gallery/Art
   - `music.svg` - Music/Concert
   - `film.svg` - Theater/Cinema
   - `dumbbell.svg` - Fitness/Sports
   - `tree.svg` - Park/Outdoor
   - `waves.svg` - Beach
   - `landmark.svg` - Attractions
   - `sparkles.svg` - Other

## Icon Mapping

The category to icon mapping is defined in `lib/icons/category-icons.ts`. 

To add a new category icon:
1. Download the icon from Untitled UI
2. Save it in `public/icons/untitled-ui/`
3. Add the mapping in `lib/icons/category-icons.ts`

## Usage

Icons are automatically used in:
- Category filter buttons
- Destination cards
- Anywhere `getCategoryIcon()` is called

## Component

The `UntitledUIIcon` component in `components/icons/UntitledUIIcon.tsx` handles:
- Loading SVG files dynamically
- Applying size and className props
- Theming (stroke color follows currentColor)
- Fallback placeholder if icon not found

## License

Untitled UI free icons are available for personal and commercial use. See their [license](https://www.untitledui.com/legal/license) for details.

