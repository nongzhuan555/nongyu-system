# Nongyu Admin Design System (MASTER)

## 1. Core Vision
- **Concept**: Academic Tech (学院派科技感)
- **Vibe**: Warm, Healing yet Serious (温暖治愈且严谨)
- **Target**: Students, Student-Admin, Developers
- **Environment**: Standalone Browser & React Native WebView (High Responsiveness Required)

## 2. Visual Style
- **Pattern**: Bento Grid (便当盒布局)
- **Border Radius**: Large rounded corners (16px - 24px) for cards and interactive elements.
- **Glassmorphism**: Subtle use of backdrop-blur (10px) for modals and floating navs.
- **Shadows**: Soft, diffused shadows (e.g., `shadow-xl` with opacity 0.05).

## 3. Color Palette
| Token | Color (Hex) | Usage |
|-------|-------------|-------|
| **Primary** | `#10B981` (Emerald Green) | Main brand color, positive indicators. |
| **Secondary** | `#FBBF24` (Amber/Yellow) | Accents, warnings, "sunlight" highlights. |
| **Background** | `#F8FAFC` (Slate 50) | Main background, clean and soft. |
| **Card BG** | `#FFFFFF` | Bento grid card background. |
| **Text Primary** | `#1E293B` (Slate 800) | Headings and primary text. |
| **Text Secondary** | `#64748B` (Slate 500) | Descriptions and meta info. |

## 4. Typography
- **Heading**: `Inter` or `System Sans-Serif` (Bold, 600+)
- **Body**: `Inter` (Regular, 400)
- **Base Size**: 16px (Browser), scales to 14px for compact mobile views.

## 5. Technical Specifications

### React + Ant Design
- **Theme Customization**: Use `ConfigProvider` to override AntD tokens.
- **Border Radius**: `borderRadius: 16`.
- **Primary Color**: `#10B981`.

### Tailwind CSS
- Use `rounded-2xl` (16px) or `rounded-3xl` (24px).
- Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for Bento Grid responsiveness.
- Padding: `p-4 md:p-6`.

### ECharts (Data Viz)
- **Colors**: `['#10B981', '#FBBF24', '#34D399', '#FCD34D']`.
- **Line Style**: Smooth curves (smooth: true).
- **Tooltips**: Rounded corners, background blur.

### WebView Optimization
- Ensure `meta viewport` is correct.
- Avoid fixed heights; use flexbox/grid.
- Touch targets: Minimum 44x44px.

## 6. Anti-Patterns (Avoid)
- No harsh neon colors.
- No 0px border radius (too cold).
- No cluttered layouts on mobile (stack the Bento cards).
- No complex hover-only interactions (must work on touch).

---
*Created by UI/UX Pro Max for Nongyu System.*
