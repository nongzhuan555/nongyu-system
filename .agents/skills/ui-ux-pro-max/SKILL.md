---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples."
---

# UI/UX Pro Max - Design Intelligence

Comprehensive design guide for web and mobile applications. Contains 50+ styles, 161 color palettes, 57 font pairings, 161 product types with reasoning rules, 99 UX guidelines, and 25 chart types across 10 technology stacks. Searchable database with priority-based recommendations.

## When to Apply

This Skill should be used when the task involves **UI structure, visual design decisions, interaction patterns, or user experience quality control**.

### Must Use

This Skill must be invoked in the following situations:

- Designing new pages (Landing Page, Dashboard, Admin, SaaS, Mobile App)
- Creating or refactoring UI components (buttons, modals, forms, tables, charts, etc.)
- Choosing color schemes, typography systems, spacing standards, or layout systems
- Reviewing UI code for user experience, accessibility, or visual consistency
- Implementing navigation structures, animations, or responsive behavior
- Making product-level design decisions (style, information hierarchy, brand expression)
- Improving perceived quality, clarity, or usability of interfaces

### Recommended

This Skill is recommended in the following situations:

- UI looks "not professional enough" but the reason is unclear
- Receiving feedback on usability or experience
- Pre-launch UI quality optimization
- Aligning cross-platform design (Web / iOS / Android)
- Building design systems or reusable component libraries

### Skip

This Skill is not needed in the following situations:

- Pure backend logic development
- Only involving API or database design
- Performance optimization unrelated to the interface
- Infrastructure or DevOps work
- Non-visual scripts or automation tasks

**Decision criteria**: If the task will change how a feature **looks, feels, moves, or is interacted with**, this Skill should be used.

---

## How to Use This Skill

Follow this workflow:

### Step 1: Analyze User Requirements

Extract key information from user request:
- **Product type**: Entertainment, Tool, Productivity, Finance, E-commerce, etc.
- **Target audience**: Consumer users, Enterprise, Developers, etc.
- **Style keywords**: playful, vibrant, minimal, dark mode, immersive, etc.
- **Stack**: React, Next.js, Vue, SwiftUI, etc.

### Step 2: Generate Design System (REQUIRED)

**Always start with `--design-system`** to get comprehensive recommendations with reasoning:

```bash
python .agents/skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This command:
1. Searches domains in parallel (product, style, color, landing, typography)
2. Applies reasoning rules to select best matches
3. Returns complete design system: pattern, style, colors, typography, effects
4. Includes anti-patterns to avoid

### Step 3: Domain or Stack Search (Optional)

If you need specific details about a style, component, or stack:

```bash
# Search for a specific style or UX guideline
python .agents/skills/ui-ux-pro-max/scripts/search.py "glassmorphism" --domain style
python .agents/skills/ui-ux-pro-max/scripts/search.py "form accessibility" --domain ux

# Search for stack-specific best practices
python .agents/skills/ui-ux-pro-max/scripts/search.py "performance" --stack react
```

---

## Quick Reference (Top Priorities)

### 1. Accessibility (CRITICAL)

- `color-contrast` - Minimum 4.5:1 ratio for normal text (large text 3:1)
- `focus-states` - Visible focus rings on interactive elements (2–4px)
- `aria-labels` - aria-label for icon-only buttons
- `keyboard-nav` - Tab order matches visual order; full keyboard support

### 2. Touch & Interaction (CRITICAL)

- `touch-target-size` - Min 44×44pt (Apple) / 48×48dp (Material)
- `touch-spacing` - Minimum 8px/8dp gap between touch targets
- `loading-buttons` - Disable button during async operations; show spinner
- `cursor-pointer` - Add cursor-pointer to clickable elements (Web)

### 3. Layout & Responsive (HIGH)

- `mobile-first` - Design for smallest screens first, then scale up
- `safe-area` - Respect top/bottom safe areas (notch, gesture bar)
- `spacing-rhythm` - Use a consistent 4/8dp spacing system
- `text-measure` - Keep long-form text readable (no edge-to-edge paragraphs)
