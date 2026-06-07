# Table of Contents Sidebar - Toggle Feature

## Overview

All 52 documentation pages now feature a **responsive Table of Contents sidebar** that works on all screen sizes with a toggle button on mobile/tablet.

## Features

### Desktop (1280px+)
- **Sidebar always visible** on the right side
- Fixed position, scrolls independently
- Shows all page headings
- No toggle button (not needed)

### Tablet & Mobile (< 1280px)
- **Sidebar hidden by default** (off-screen)
- **Toggle button** appears in bottom-right corner (green circular button)
- Click button to slide sidebar in from right
- Overlay appears behind sidebar
- Click overlay or X button to close

## How to Use

### Desktop Users
Simply scroll right side to see all headings on the page. Click any heading to jump to that section.

### Mobile/Tablet Users

1. **Open the TOC**
   - Look for the green circular button in the bottom-right corner
   - It has a list icon (<i data-lucide="list-ordered"></i>)
   - Click it to open the sidebar

2. **Browse Headings**
   - Sidebar slides in from the right
   - Shows all page sections
   - Scroll through to find what you need

3. **Jump to Section**
   - Click any heading to jump to that section
   - Page scrolls smoothly to that location

4. **Close the TOC**
   - Click the X button in the top-right of sidebar, OR
   - Click the dark overlay behind it
   - Sidebar slides back out
   - Content area expands

## Technical Details

### CSS Classes Used

```css
/* Sidebar positioning and animation */
fixed right-0 top-16           /* Fixed to right side, below header */
transform transition-transform /* Smooth slide animation */
duration-300 ease-in-out       /* 300ms transition */
translate-x-full               /* Off-screen by default */
xl:translate-x-0               /* Visible on desktop (1280px+) */

/* Toggle button */
xl:hidden                       /* Hide on desktop */
fixed bottom-6 right-6          /* Sticky to bottom-right */
rounded-full                    /* Circular button */
bg-emerald-500 hover:bg-emerald-600  /* Green color */
z-40                           /* Above most content */
hover:scale-110                /* Grow on hover */

/* Overlay */
hidden xl:hidden                /* Not visible (and stays hidden on desktop) */
fixed inset-0                   /* Full screen coverage */
bg-slate-900/30 backdrop-blur-sm /* Semi-transparent dark */
z-20                           /* Behind sidebar, in front of content */
```

### JavaScript Functions

```javascript
openToc()        // Slide sidebar in, show overlay
closeToc()       // Slide sidebar out, hide overlay
tocToggleBtn     // Click to open/close
closeTocBtn      // X button to close
tocOverlay       // Click to close
```

## Breakpoints

- **< 768px (Mobile)**: Toggle button and overlay
- **768px - 1279px (Tablet)**: Toggle button and overlay
- **1280px+ (Desktop)**: Sidebar always visible, no toggle button

## Responsive Behavior

When you **resize your browser window**:
- Drag window from large to small: Toggle button appears
- Drag window from small to large: Toggle button disappears, sidebar becomes always-visible
- If sidebar was open on mobile, it auto-closes when resizing to desktop

## Animation

The sidebar uses a smooth **300ms CSS transition** for:
- Sliding in from the right
- Sliding out to the right
- Overlay fade in/out

No jarring movements or instant changes.

## Accessibility

✅ Keyboard friendly (click-based)
✅ Clear visual feedback (hover states)
✅ X button for explicit close
✅ Overlay for context (hints to click to close)
✅ Works with screen readers

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile, Firefox Mobile, etc.)

## File Changes

All 52 HTML documentation pages include:
1. **TOC Sidebar** - Collapsible right sidebar
2. **Toggle Button** - Green button on mobile/tablet
3. **Overlay** - Dark overlay for mobile/tablet
4. **JavaScript** - All toggle functionality

The conversion script (`convert_md_to_html.py`) generates these automatically for any new pages.

## Customization

### To change button color:
Edit in template: `bg-emerald-500 hover:bg-emerald-600`
Change to: `bg-blue-500 hover:bg-blue-600` (or any color)

### To change sidebar width:
Edit in template: `w-64` (16rem = 256px)
Change to: `w-72` (18rem = 288px) or `w-80` (20rem = 320px)

### To change animation speed:
Edit in template: `duration-300` 
Change to: `duration-150` (faster) or `duration-500` (slower)

### To remove on mobile (desktop-only):
Remove the toggle button and overlay, add `hidden lg:block` instead of toggle logic

---

**All pages updated**: May 23, 2026
**Total interactive pages**: 52 documentation pages + 1 index
**Responsive breakpoint**: 1280px (XL)
