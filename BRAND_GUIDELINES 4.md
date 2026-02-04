# The Manual Company - Brand Guidelines

**Version:** 1.0  
**Date:** October 2025  
**Entity:** AVMLO LLC dba The Manual Company

---

## Brand Overview

The Manual Company is a digital media company that curates exceptional travel experiences for discerning travelers. Our flagship product, Urban Manual, embodies our commitment to quality, design excellence, and editorial independence.

### Brand Personality

- **Refined** - Sophisticated without being pretentious
- **Discerning** - Selective and quality-focused
- **Design-Forward** - Aesthetically conscious
- **Independent** - Editorially autonomous
- **Optimistic** - Forward-looking and positive

---

## Visual Identity

### Logo & Wordmark

**Primary Wordmark:**
```
THE URBAN MANUAL
```

**Specifications:**
- Font: Bold, uppercase, sans-serif
- Letter-spacing: Tight tracking
- Accent: Green underline on bottom edge
- Always uppercase
- Never italicized or outlined

**Usage:**
- Minimum clear space: Height of one letter on all sides
- Never stretch, compress, or rotate
- Maintain contrast with background

### Color Palette

**Primary Colors:**

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Black** | `#000000` | 0, 0, 0 | Text, borders, primary actions |
| **White** | `#FFFFFF` | 255, 255, 255 | Backgrounds, cards |
| **Neutral 50** | `#FAFAFA` | 250, 250, 250 | Light backgrounds |
| **Neutral 200** | `#E5E5E5` | 229, 229, 229 | Borders, dividers |
| **Neutral 600** | `#525252` | 82, 82, 82 | Secondary text |

**Accent Colors:**

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Green** | `#6BFFB8` | 107, 255, 184 | Primary accent, success |
| **Blue** | `#6B9FFF` | 107, 159, 255 | Links, info |
| **Pink** | `#FF6B9F` | 255, 107, 159 | Highlights, favorites |
| **Orange** | `#FFB86B` | 255, 184, 107 | Warnings, featured |
| **Purple** | `#9F6BFF` | 159, 107, 255 | Premium, special |

**Beige (Company Site):**

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Beige** | `#E8E4DC` | 232, 228, 220 | Background (company site) |

**Color Usage Rules:**
- Use black for primary text and actions
- Use white for backgrounds and negative space
- Use accent colors sparingly for emphasis
- Never use more than 2 accent colors in one component
- Maintain WCAG AA contrast ratios (4.5:1 for text)

### Typography

**Primary Typeface:** System Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
             Roboto, "Helvetica Neue", Arial, sans-serif;
```

**Type Scale:**

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| **Display** | 72px | Bold | 1.1 | Hero headlines |
| **H1** | 48px | Bold | 1.2 | Page titles |
| **H2** | 36px | Bold | 1.3 | Section headers |
| **H3** | 24px | Bold | 1.4 | Subsections |
| **Body Large** | 18px | Regular | 1.6 | Lead paragraphs |
| **Body** | 16px | Regular | 1.6 | Body text |
| **Small** | 14px | Regular | 1.5 | Captions, labels |
| **Tiny** | 12px | Medium | 1.4 | Tags, metadata |

**Font Weights:**
- Regular: 400
- Medium: 500
- Bold: 700

**Typography Rules:**
- Use bold for all headings
- Use regular for body text
- Use medium for labels and UI elements
- Never use light weights for text under 18px
- Maintain consistent line-height for readability

### Spacing System

**Base Unit:** 4px

**Scale:**
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px
- `3xl`: 64px
- `4xl`: 96px

**Application:**
- Use consistent spacing throughout
- Maintain vertical rhythm
- Group related elements with less space
- Separate sections with more space

### Border Radius

| Size | Value | Usage |
|------|-------|-------|
| **None** | 0px | Default, cards, images |
| **Small** | 4px | Buttons, tags |
| **Medium** | 8px | Cards (company site) |
| **Large** | 16px | Decorative elements |
| **XL** | 24px | Product cards |
| **Full** | 9999px | Pills, rounded buttons |

**Rules:**
- Urban Manual: Minimal rounding (0-4px)
- Company Site: More rounding (8-24px)
- Use full rounding for pill-shaped elements

---

## UI Components

### Buttons

**Primary Button:**
```css
background: #000000
color: #FFFFFF
padding: 12px 24px
border-radius: 4px (Urban Manual) or 9999px (Company Site)
font-size: 14px
font-weight: 500
```

**Secondary Button:**
```css
background: transparent
color: #000000
border: 2px solid [accent-color]
padding: 12px 24px
border-radius: 4px or 9999px
font-size: 14px
font-weight: 500
```

**Button States:**
- Hover: Scale 1.05 or opacity 0.8
- Active: Scale 0.95
- Disabled: Opacity 0.5

### Tags & Pills

**Style:**
```css
background: #FAFAFA or [accent-color-10%]
color: [accent-color] or #525252
border: 1px solid [accent-color] or #E5E5E5
padding: 4px 12px
border-radius: 9999px
font-size: 12px
font-weight: 500
```

**Usage:**
- Categories
- Filters
- Metadata
- Status indicators

### Cards

**Destination Card (Urban Manual):**
```css
background: #FFFFFF
border: 4px solid [accent-color]
border-radius: 8px
overflow: hidden
```

**Product Card (Company Site):**
```css
background: #FFFFFF
border-radius: 24px
padding: 48px
box-shadow: 0 4px 24px rgba(0,0,0,0.1) on hover
```

**Card Anatomy:**
- Image (16:9 aspect ratio)
- Title (H3)
- Location/Category (Small text)
- Description (Body text)
- Tags (Pills)
- CTA (Link or button)

### Forms

**Input Fields:**
```css
background: #FFFFFF
border: 1px solid #E5E5E5
border-radius: 4px
padding: 12px 16px
font-size: 16px
```

**Focus State:**
```css
border-color: [accent-color]
outline: 2px solid [accent-color-20%]
```

**Placeholder:**
```css
color: #A3A3A3
font-style: normal
```

---

## Photography & Imagery

### Image Guidelines

**Style:**
- High-quality, professional photography
- Natural lighting preferred
- Clean compositions
- Minimal post-processing
- Authentic, not staged

**Subject Matter:**
- Architecture and interiors
- Food and dining
- Cultural venues
- Hotels and hospitality
- Urban landscapes

**Technical Specs:**
- Minimum resolution: 2000px wide
- Format: WebP (primary), JPEG (fallback)
- Aspect ratios: 16:9 (cards), 4:3 (detail), 1:1 (grid)
- File size: Under 500KB after optimization

**Don'ts:**
- No stock photography clichés
- No heavy filters or effects
- No text overlays on images
- No watermarks
- No low-resolution images

### Image Treatment

**Borders:**
- Urban Manual: 4px colored border on cards
- Company Site: No borders, rounded corners

**Hover Effects:**
- Subtle scale (1.05)
- Smooth transition (300ms)
- No filters or overlays

---

## Iconography

### Icon Style

**Characteristics:**
- Emoji-based for personality (🗺️, ✨, ✦)
- Simple geometric shapes for UI
- 2px stroke weight for line icons
- Rounded corners matching brand
- Monochrome or accent colors

**Usage:**
- Use sparingly
- Maintain consistent size within context
- Align with text baseline
- Provide adequate spacing

### Decorative Elements

**Floating Shapes (Company Site):**
- Lines: 1px height, colored, rounded ends
- Squares: Rotated 12°, colored borders or fills
- Circles: Colored borders
- Purpose: Add playfulness and energy

**Rules:**
- Use subtly, don't overwhelm
- Maintain hierarchy
- Complement, don't distract

---

## Voice & Tone

### Brand Voice

**Characteristics:**
- **Knowledgeable** - Expert without being condescending
- **Refined** - Sophisticated language, not flowery
- **Confident** - Assured in recommendations
- **Warm** - Approachable, not cold or distant
- **Concise** - Clear and direct

### Writing Guidelines

**Do:**
- Use active voice
- Write in complete sentences
- Be specific and descriptive
- Use proper grammar and punctuation
- Maintain consistent tense

**Don't:**
- Use jargon or buzzwords
- Write in all caps (except brand name)
- Use excessive exclamation points
- Be overly casual or formal
- Use clichés or superlatives

### Content Types

**Destination Descriptions:**
```
[Venue Name] embodies [key characteristic]. [Specific detail about design/experience]. 
[What makes it exceptional]. [Practical information].
```

**Example:**
"Aman Kyoto embodies tranquil luxury in the heart of Japan's ancient capital. The resort's minimalist pavilions blend seamlessly with the surrounding forest, offering views of moss-covered gardens and traditional temples. Each room features floor-to-ceiling windows, natural materials, and private onsen baths. Located in a secluded garden setting, yet minutes from Kyoto's cultural landmarks."

**Headlines:**
- Clear and descriptive
- No clickbait
- Title case
- Under 60 characters

**Body Copy:**
- Lead with the most important information
- Use short paragraphs (2-3 sentences)
- Include specific details
- End with actionable information

---

## Digital Guidelines

### Web Design Principles

**Layout:**
- Maximum content width: 1280px
- Generous white space
- Clear visual hierarchy
- Grid-based layouts
- Responsive breakpoints: 640px, 768px, 1024px, 1280px

**Navigation:**
- Fixed header on scroll
- Clear, labeled sections
- Breadcrumbs for deep pages
- Search prominently placed
- Mobile-friendly hamburger menu

**Interactions:**
- Smooth transitions (200-300ms)
- Hover states on all interactive elements
- Loading states for async actions
- Clear focus indicators
- Accessible keyboard navigation

### Accessibility

**Requirements:**
- WCAG 2.1 AA compliance minimum
- Color contrast ratios: 4.5:1 (text), 3:1 (UI)
- Keyboard navigation support
- Screen reader compatibility
- Alt text for all images
- Semantic HTML structure

**Best Practices:**
- Use proper heading hierarchy
- Provide skip links
- Label all form inputs
- Include ARIA labels where needed
- Test with assistive technologies

### Performance

**Targets:**
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

**Optimization:**
- Lazy load images
- Use WebP format
- Minimize JavaScript
- Compress assets
- Use CDN for static files

---

## Brand Applications

### Urban Manual (Product)

**Design System:**
- White background
- Colorful bordered elements
- Bold uppercase title with green underline
- Functional, minimal aesthetic
- Grid-based layouts
- Pill-shaped tags

**Key Screens:**
- Homepage: Greeting, search, filters, destination grid
- Destination Detail: Large image, description, map, related
- City Page: Overview, categories, destinations
- Search: Filters, results, map view

### The Manual Company (Corporate)

**Design System:**
- Beige background (#E8E4DC)
- Playful floating elements
- Rounded corners (24px)
- Centered layouts
- Emoji icons
- Warm, optimistic tone

**Key Sections:**
- Hero: Large headline, CTAs
- Products: Card grid with colored accents
- Values: Icon + text blocks
- Stats: Large numbers with labels
- Footer: Comprehensive navigation

---

## Brand Extensions

### Social Media

**Profile Images:**
- Use simplified logo mark
- Maintain brand colors
- Square format (1:1)
- High contrast

**Post Templates:**
- Destination images with minimal text
- Quote cards with brand colors
- Behind-the-scenes content
- User-generated content (with permission)

**Hashtags:**
- #UrbanManual
- #TheManualCompany
- #CuratedTravel
- #DesignTravel

### Email

**Header:**
- Logo
- Navigation links
- Unsubscribe link

**Body:**
- Single column layout
- Maximum width: 600px
- Web-safe fonts
- Inline CSS
- Alt text for images

**Footer:**
- Company info
- Social links
- Legal links
- Contact information

### Print (Future)

**Specifications:**
- CMYK color mode
- 300 DPI minimum
- Bleed: 3mm
- Safe area: 5mm from edge

**Applications:**
- City guides
- Coffee table books
- Business cards
- Stationery

---

## Brand Protection

### Trademark Usage

**Proper:**
- The Manual Company™
- Urban Manual™

**Usage:**
- Always use ™ symbol on first mention
- Never modify or abbreviate
- Maintain capitalization
- Use as adjective, not noun

### Legal

**Copyright:**
```
© 2025 AVMLO LLC dba The Manual Company. All rights reserved.
```

**Attribution:**
- Required for user-generated content
- Credit photographers
- Link to original sources
- Respect licensing terms

### Don'ts

**Never:**
- Use brand assets without permission
- Modify logo or wordmark
- Use unapproved colors
- Imply endorsement without authorization
- Violate trademark guidelines

---

## Resources

### Design Assets

**Available:**
- Logo files (SVG, PNG)
- Color swatches (Figma, Sketch, Adobe)
- Typography specimens
- Component library
- Icon set

**Request Access:**
- Email: brand@themanualcompany.com
- Slack: #brand-resources

### Tools

**Design:**
- Figma (primary)
- Adobe Creative Suite
- Sketch

**Development:**
- Next.js
- Tailwind CSS
- TypeScript

**Photography:**
- Adobe Lightroom
- Capture One

---

## Approval Process

### Review Required

**Major Changes:**
- New products or features
- Marketing campaigns
- Partnership materials
- Press releases
- Website redesigns

**Approval Chain:**
1. Designer/Writer
2. Brand Manager
3. Creative Director
4. CEO (for major initiatives)

### Timeline

- Minor updates: 2-3 business days
- Major campaigns: 1-2 weeks
- New products: 2-4 weeks

---

## Contact

**Brand Inquiries:**
- Email: brand@themanualcompany.com
- Slack: #brand

**Partnership Requests:**
- Email: partnerships@themanualcompany.com

**Press:**
- Email: press@themanualcompany.com

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Oct 2025 | Initial guidelines | Brand Team |

---

**Document Owner:** Brand Team  
**Last Updated:** October 30, 2025  
**Next Review:** January 2026

