# Design Guidelines for Gaming Submission Platform

## Design Approach
**Reference-Based Approach**: Drawing inspiration from Fortnite's UI aesthetic and modern gaming platforms like Discord, Steam, and Epic Games Store. The design emphasizes dark themes, minimal visual clutter, and gaming-focused visual elements.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary:**
- Background: 220 15% 8% (deep dark blue-gray)
- Surface: 220 12% 12% (elevated dark surface)
- Primary: 250 85% 65% (vibrant purple - Epic Games inspired)
- Secondary: 195 85% 55% (cyan accent for gaming feel)
- Success: 145 70% 50% (bright green for approvals)
- Warning: 35 85% 60% (orange for pending states)
- Text Primary: 0 0% 95% (near white)
- Text Secondary: 220 10% 70% (muted gray)

### B. Typography
- **Primary Font**: "Inter" or "Segoe UI" for clean readability
- **Headers**: Bold weights (600-700) for strong hierarchy
- **Body**: Regular (400) and medium (500) weights
- **Gaming Elements**: Consider "Rajdhani" for UI labels and numbers

### C. Layout System
**Tailwind Spacing**: Use units of 2, 4, 6, 8, and 12 for consistent spacing
- Containers: max-width with generous padding
- Cards: p-6 with rounded-lg borders
- Buttons: px-6 py-3 for comfortable touch targets
- Form elements: mb-6 for consistent vertical rhythm

### D. Component Library

**Navigation**: 
- Fixed top navigation with glassmorphism effect
- User avatar and balance display in top-right
- Subtle glow effects on active states

**Buttons**:
- Primary: Solid purple with subtle glow on hover
- Secondary: Outline style with transparent background and blurred backdrop when over images
- Destructive: Red variants for reject actions

**Cards**:
- Dark background with subtle border
- Glassmorphism effect with backdrop-blur
- Soft shadow and rounded corners (8-12px radius)

**Forms**:
- Dark input fields with focused purple borders
- Drag & drop zones with dashed borders and hover states
- Toggle switches for category selection with gaming-style indicators

**Tables** (Admin):
- Striped rows with subtle background variations
- Sortable headers with gaming-inspired icons
- Action buttons grouped in final column

### E. Animations
**Minimal & Purposeful**:
- Fade-in transitions for page loads (300ms)
- Scale transforms on button hovers (1.02 scale)
- Smooth color transitions on state changes
- Subtle pulse effect on primary CTA buttons

## Page-Specific Design

### Landing Page
- **Hero Section**: Large Epic Games login button as primary focus
- **Information Sections**: 2-3 cards below explaining the platform
- **Visual Elements**: Gaming-themed illustrations or abstract geometric patterns
- **Background**: Dark gradient with subtle particle effects

### Submission Form
- **File Upload**: Large drag & drop zone with preview area
- **Category Selection**: Card-based selection with gaming icons
- **Live Preview**: Prominent media preview with file details
- **Progress Indicators**: Gaming-style progress bars

### Admin Dashboard
- **Data Tables**: Clean, scannable layouts with status badges
- **Filters**: Sidebar or top-bar filters with gaming-style toggles
- **Media Previews**: Modal overlays for viewing submissions
- **Action Panels**: Grouped controls for bulk operations

## Gaming Theme Integration
- **Visual Hierarchy**: Bold, high-contrast elements
- **Status Indicators**: Gaming-style badges and progress bars
- **Interactive Elements**: Subtle glow effects and state changes
- **Color Usage**: Strategic use of bright accents against dark backgrounds
- **Typography**: Strong, readable fonts with clear information hierarchy

## Images
No large hero images required. Focus on:
- Gaming icons for categories
- User avatars and profile images
- Submission thumbnails and previews
- Abstract geometric patterns as background elements
- Epic Games branding elements where appropriate