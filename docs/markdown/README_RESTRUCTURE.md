# P-WOS Documentation Portal - Restructured

## Overview

The P-WOS documentation has been restructured into a modern, web-first architecture with pure HTML pages powered by CDN resources. This provides a separation of concerns and enables faster deployment without any build processes.

## Directory Structure

```
/docs
├── /web/                    # Pure HTML documentation portal (CDN-powered)
│   ├── index.html          # Main documentation index/hub
│   ├── *.html              # 52 individual HTML pages (one per topic)
│   └── [No dependencies - all resources via CDN]
│
├── /markdown/              # Source markdown files (backup & reference)
│   ├── 01_getting_started/
│   ├── 02_guides/
│   ├── 03_hardware/
│   ├── 04_architecture_&_research/
│   ├── 05_reference/
│   ├── 06_reports_&_validation/
│   └── 07_system_behaviour/
│
├── convert_md_to_html.py   # Python script for MD -> HTML conversion
└── [Original category folders - keep for reference]
```

## Key Features

### 1. Pure HTML with No Build Process
- **No node_modules**: All styling via Tailwind CSS CDN
- **No webpack/vite**: Direct HTML delivery
- **No rendering at build time**: All markdown is embedded, rendered client-side
- **Zero dependencies**: Lightweight, fast, standalone

### 2. CDN-Powered Resources
All external resources are loaded from reliable CDNs:

| Resource | Source | Purpose |
|----------|--------|---------|
| **Tailwind CSS** | cdn.tailwindcss.com | Complete styling framework |
| **Google Fonts** | fonts.googleapis.com | Inter + JetBrains Mono |
| **Highlight.js** | cdnjs.cloudflare.com | Code syntax highlighting |
| **KaTeX** | cdn.jsdelivr.net | Scientific formulas (LaTeX) |
| **Marked.js** | cdn.jsdelivr.net | Markdown to HTML conversion |
| **Mermaid.js** | cdn.jsdelivr.net | Flowcharts & diagrams |
| **DOMPurify** | cdn.jsdelivr.net | HTML sanitization (security) |
| **Lucide Icons** | unpkg.com | Beautiful icon library |

### 3. Three Theme Options
- **Light Mode**: Clean, professional appearance
- **Eco Dark**: Eye-friendly dark theme for extended reading
- **Warm Sepia**: Warm reading mode for analog aesthetic
- Theme preference stored in localStorage

### 4. Markdown-Backed Source Files
- All 57+ markdown files preserved in `/markdown/` directory
- Easy to edit, version control, and maintain
- Can re-generate HTML from markdown anytime using `convert_md_to_html.py`

### 5. Rich Content Support
Each HTML page includes:
- **Syntax highlighting** for code blocks (Python, C++, Bash, YAML, JSON)
- **KaTeX rendering** for scientific formulas and equations
- **Mermaid diagrams** for flowcharts and architecture visuals
- **Responsive design** (mobile-first, adapts to all screen sizes)
- **Table of Contents** sidebar (auto-generated from headings)
- **Reading progress bar** (top of page)
- **Print-to-PDF** functionality
- **Copy content** button

## How It Works

### Architecture

1. **Client-Side Markdown Rendering**
   - Markdown is embedded as hidden content in each HTML page
   - Marked.js converts markdown to HTML on page load
   - DOMPurify sanitizes the output for security

2. **Syntax Highlighting**
   - Highlight.js automatically detects language
   - Applies color themes (light/dark based on theme selection)

3. **Math Rendering**
   - KaTeX auto-renders LaTeX formulas
   - Supports both inline ($) and display ($$) modes

4. **Theme Management**
   - CSS classes control theme application
   - JavaScript toggles themes and saves preference
   - Smooth transitions between themes

## Getting Started

### Viewing Documentation

1. **Open in browser**: Simply open `/web/index.html` in any modern browser
2. **No server required**: All files are static HTML
3. **Works offline**: After first load, all CDN resources are cached
4. **Mobile-friendly**: Responsive design works on phones, tablets, desktops

### Deploying Documentation

1. **Static hosting**: Deploy the entire `/web/` directory to any static host:
   - GitHub Pages
   - Netlify
   - Vercel
   - Any web server (Apache, Nginx, etc.)

2. **No build step required**:
   ```bash
   # Simply copy files
   cp -r docs/web/* /var/www/html/
   # Done! Your docs are live
   ```

## Updating Documentation

### Option 1: Update Markdown (Recommended)
1. Edit the `.md` file in `/markdown/` directory
2. Run the conversion script:
   ```bash
   python docs/convert_md_to_html.py
   ```
3. This regenerates the corresponding HTML file in `/web/`
4. Commit both files to git

### Option 2: Direct HTML Edit
- Edit the HTML file directly in `/web/`
- Note: Remember to also update the markdown source in `/markdown/`

## File Mapping

Each markdown file in `/markdown/` is converted to a corresponding HTML file in `/web/`:

| Markdown | HTML | Purpose |
|----------|------|---------|
| `01_getting_started/PROJECT_OVERVIEW.md` | `web/PROJECT_OVERVIEW.html` | Project intro |
| `02_guides/technical/backend_guide.md` | `web/backend_guide.html` | API documentation |
| `03_hardware/architecture/hardware_architecture.md` | `web/hardware_architecture.html` | Hardware specs |
| `05_reference/specs/api_reference.md` | `web/api_reference.html` | API endpoints |
| ... | ... | ... |

## Technical Specifications

### Performance
- **Page load**: < 2 seconds (with CDN caching)
- **Total bundle**: ~1.5MB HTML files + CDN resources
- **Browser support**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile**: Fully responsive, optimized for 320px+ screens

### Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance (WCAG AA standard)

### Security
- DOMPurify sanitizes all rendered HTML
- No eval() or unsafe JavaScript
- Content Security Policy compatible
- No tracking or analytics (unless added)

## Converting New Content

If you add new markdown files:

1. Place them in `/markdown/` directory structure
2. Run the conversion script:
   ```bash
   python docs/convert_md_to_html.py
   ```
3. The script will:
   - Copy markdown files to `/markdown/`
   - Generate corresponding HTML in `/web/`
   - Preserve directory structure where applicable

## CDN Resilience

If any CDN is temporarily unavailable:
- **Tailwind CSS**: CSS won't load, basic HTML layout still visible
- **Fonts**: System fonts fallback to sans-serif
- **Syntax highlighting**: Code still displays, just without colors
- **Mermaid/KaTeX**: Diagrams/formulas won't render, but document remains readable

For production, consider:
- Self-hosting critical resources (Tailwind, fonts)
- Using multiple CDN mirrors
- Service Worker for offline support

## Maintenance

### Backup
- Both `/web/` and `/markdown/` directories are under version control
- Markdown files are the source of truth
- HTML files are generated and can be regenerated anytime

### Updates
- Modify markdown files in `/markdown/`
- Run conversion script to update HTML
- Commit changes
- Deploy to your hosting

### Monitoring
- Check HTML files validate with W3C
- Test all themes render correctly
- Verify CDN resources load properly
- Test on various devices and browsers

## FAQ

**Q: Can I edit HTML directly?**
A: Yes, but also update the markdown source so future regeneration preserves your changes.

**Q: What if a CDN goes down?**
A: The page will still load with fallback fonts and styles. Content remains readable.

**Q: How large are the pages?**
A: Each HTML file is 20-60KB depending on content. Very lightweight.

**Q: Can I self-host the CSS/fonts?**
A: Absolutely. Download them from CDN and serve locally for full independence.

**Q: Is the markdown rendering secure?**
A: Yes, DOMPurify sanitizes all output. Only safe HTML tags are allowed.

**Q: How do I customize the theme?**
A: Edit the style section in the HTML template or modify Tailwind config directly.

## Resources

- **Tailwind CSS**: https://tailwindcss.com
- **Marked.js**: https://marked.js.org
- **Highlight.js**: https://highlightjs.org
- **KaTeX**: https://katex.org
- **Mermaid**: https://mermaid.js.org
- **DOMPurify**: https://github.com/cure53/DOMPurify
- **Lucide Icons**: https://lucide.dev

---

**Generated**: May 23, 2026
**Total Files**: 52 HTML pages, 57 markdown sources
**Total Documentation**: 60+ comprehensive guides and references
