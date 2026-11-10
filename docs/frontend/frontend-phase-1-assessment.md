# GANTAVYA — FRONTEND PHASE 1
# ARCHITECTURE, DESIGN SYSTEM & UI FOUNDATION ASSESSMENT

**Date:** November 10, 2026  
**Document Version:** 1.0.0  
**Status:** Completed & Approved for Implementation  
**Current Frontend Test Baseline:** 12/12 passing (3 test files)

---

## 1. Executive Summary

This assessment evaluates the existing frontend codebase of Gantavya, identifies its architectural strengths and limitations, and outlines the implementation plan for **Frontend Phase 1: Architecture, Design System & UI Foundation**.

Gantavya currently has functional trip management, group collaboration, multimodal transit timelines, and authentication workflows. However, the UI currently relies on hardcoded dark Tailwind palette classes (`slate-900`, `slate-800`), lacks a theme system (light/dark/system mode), lacks reusable primitive UI components, lacks layout abstractions, and lacks consistent typography hierarchy.

The goal of Phase 1 is to elevate Gantavya into a **premium travel-tech SaaS experience** with clean semantic design tokens, light/dark themes, standardized UI components, and responsive application layouts, while preserving 100% backward compatibility and test stability.

---

## 2. Current Architecture & Component Inventory

### 2.1 Technology Stack & Dependencies
- **Core Framework**: React 18.3.1 (`react`, `react-dom`)
- **Build Tool**: Vite 5.4.11 (`@vitejs/plugin-react`)
- **Styling**: Tailwind CSS 3.4.17 with PostCSS 8.4.49 and Autoprefixer 10.4.20
- **Iconography**: Lucide React 0.460.0
- **Routing**: React Router DOM 6.28.0 (installed, but routing currently managed via state in `App.jsx`)
- **HTTP Client**: Axios 1.7.9 with `withCredentials: true` and refresh-token interceptors
- **Testing**: Vitest 3.0.7 with `@testing-library/react` 16.2.0, `@testing-library/jest-dom` 6.6.3, and `jsdom` 26.0.0

### 2.2 Existing Source Structure (`frontend/src/`)
```
frontend/src/
├── App.jsx                  # Main application component with tab switcher and service cards
├── main.jsx                 # Entry point mounting <App /> in StrictMode
├── index.css                # Standard @tailwind directives (base, components, utilities)
├── components/
│   ├── AcceptInvitationModal.jsx # Modal to accept/decline trip invites
│   ├── AuthModal.jsx             # Modal for login and registration
│   ├── CreateTripModal.jsx       # Modal for creating trips with destinations & dates
│   ├── ItineraryTimeline.jsx     # Chronological multimodal transit and activity timeline
│   ├── TripsDashboard.jsx        # Trips listing, search, status filters, and action bar
│   └── TripWorkspace.jsx         # Full trip editor (itinerary days, activities, participants)
├── context/
│   └── AuthContext.jsx           # Session management, login, register, logout, getMe
└── services/
    ├── api.js                    # Axios instance with refresh interceptor and health check
    ├── auth.service.js           # Auth REST endpoints
    └── trip.service.js           # Trip, itinerary, activity, and transit endpoints
```

### 2.3 Existing Test Suite (`frontend/tests/`)
- `setup.js`: `@testing-library/jest-dom` import.
- `App.test.jsx`: 4 tests (brand heading, 3 service cards, "Zero Redis" badge, sign-in button).
- `TripsDashboard.test.jsx`: 4 tests (trips rendering, search filtering, empty states).
- `ItineraryTimeline.test.jsx`: 4 tests (timeline rendering, conflict diagnostic banner, alternative route switching, recalculation action).

---

## 3. Key Findings & Gaps Analysis

| Dimension | Current State | Target State (Phase 1) |
| :--- | :--- | :--- |
| **Color System** | Hardcoded slate colors (`bg-slate-900`, `bg-slate-800`, `text-slate-100`). No semantic tokens. | Semantic design tokens defined via CSS variables with light and dark palette mappings in `tailwind.config.js`. |
| **Theme System** | Single hardcoded dark mode; no light mode, no system preference detection, no persistence. | `ThemeContext` supporting `light`, `dark`, and `system` modes with `localStorage` persistence and flash-free loading. |
| **Typography** | Default browser sans-serif stack (`Inter`/`system-ui`). Inconsistent heading scales. | Google Fonts: **Inter** for clean UI, **Outfit** for distinctive headings and brand marks. Defined typographic scales. |
| **UI Components** | Ad-hoc inline button, input, dialog, and card markup repeated across components with varying styles. | Standardized UI component primitives in `components/ui/` (`Button`, `Input`, `Select`, `Dialog`, `Card`, `Badge`, `Avatar`, `Toast`, etc.). |
| **Layouts** | Monolithic header and footer directly embedded inside `App.jsx`. | Dedicated layout wrappers: `AuthenticatedLayout` (collapsible sidebar, top header, user menu) and `PublicLayout`. |
| **Responsiveness** | Basic utility classes (`md:flex`, `hidden sm:block`) without a responsive mobile navigation drawer. | Responsive layouts with desktop sidebar, tablet collapse, and mobile off-canvas drawer. |

---

## 4. Proposed Design Tokens

### 4.1 Color Palettes

#### Light Theme
- **Background**: `#F7F9FC` (`--color-bg`)
- **Surface**: `#FFFFFF` (`--color-surface`)
- **Card**: `#FFFFFF` (`--color-card`)
- **Card Muted**: `#F1F5F9` (`--color-card-muted`)
- **Primary**: `#2563EB` (`--color-primary`)
- **Primary Hover**: `#1D4ED8` (`--color-primary-hover`)
- **Primary Foreground**: `#FFFFFF` (`--color-primary-fg`)
- **Main Text**: `#111827` (`--color-text-main`)
- **Secondary Text**: `#64748B` (`--color-text-muted`)
- **Border**: `#E2E8F0` (`--color-border`)
- **Accent**: `#38BDF8` (`--color-accent`)

#### Dark Theme
- **Background**: `#090D16` (`--color-bg`)
- **Surface**: `#0F172A` (`--color-surface`)
- **Card**: `#162035` (`--color-card`)
- **Card Muted**: `#1E293B` (`--color-card-muted`)
- **Primary**: `#6366F1` (`--color-primary`)
- **Primary Hover**: `#4F46E5` (`--color-primary-hover`)
- **Primary Foreground**: `#FFFFFF` (`--color-primary-fg`)
- **Main Text**: `#F8FAFC` (`--color-text-main`)
- **Secondary Text**: `#94A3B8` (`--color-text-muted`)
- **Border**: `#263247` (`--color-border`)
- **Accent**: `#818CF8` (`--color-accent`)

### 4.2 Typography Configuration
- `font-sans`: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- `font-heading`: `'Outfit', 'Inter', -apple-system, sans-serif`

---

## 5. Implementation Roadmap

1. **Tokens & Base CSS**:
   - Update `frontend/src/index.css` with CSS custom properties for light and dark themes.
   - Update `frontend/tailwind.config.js` to expose semantic tokens (`bg-bg`, `bg-surface`, `bg-card`, `text-main`, `text-muted`, `border-border`, `bg-primary`, etc.).
   - Update `frontend/index.html` to preload Inter and Outfit fonts and execute an inline flash-free theme script.
2. **Theme Management**:
   - Create `frontend/src/context/ThemeContext.jsx` with `useTheme` hook (`theme`, `setTheme`, `resolvedTheme`).
   - Support `localStorage` key `'gantavya_theme'` without `localStorage.clear()`.
   - Create `frontend/src/components/ui/ThemeToggle.jsx` for one-click switching.
3. **Reusable UI Component Library (`frontend/src/components/ui/`)**:
   - `Button.jsx`: Primary, secondary, outline, ghost, danger variants; sizes (sm, md, lg); loading state.
   - `Input.jsx`: Semantic styling, label, error helper, icons.
   - `Textarea.jsx`: Auto-sizing, accessible label.
   - `Select.jsx`: Styled native dropdown.
   - `Dialog.jsx`: Accessible modal dialog with backdrop, transition, header, footer.
   - `Dropdown.jsx`: Custom floating menu with click-outside listener.
   - `Card.jsx`: Composable card container with header, content, and footer.
   - `Badge.jsx`: Color-coded semantic tags (primary, success, warning, danger, neutral).
   - `Avatar.jsx`: Image with fallback to user initials and size options.
   - `Tooltip.jsx`: Hover tooltips.
   - `Tabs.jsx`: Accessible tab navigation.
   - `Skeleton.jsx`: Shimmering placeholder loaders.
   - `Spinner.jsx`: Clean animated spinner.
   - `EmptyState.jsx`: Premium travel-themed empty illustrations.
   - `ErrorState.jsx`: User-friendly error display with retry action.
   - `ConfirmDialog.jsx`: Confirmation modal for destructive actions.
   - `Toast.jsx`: Ephemeral toast notifications with `ToastContext`.
4. **Application Layouts (`frontend/src/layouts/`)**:
   - `AuthenticatedLayout.jsx`: Role-aware sidebar, top navigation bar, user avatar menu, theme toggle, mobile drawer.
   - `PublicLayout.jsx`: Top navigation, content container, travel-tech footer.
5. **App Integration & Testing**:
   - Connect `ThemeProvider` and `ToastProvider` at top level.
   - Integrate layouts into `App.jsx` while maintaining 100% test compatibility with `App.test.jsx`.
   - Add new tests in `frontend/tests/` covering theme switching, UI components, and layouts.
   - Ensure all 236 tests pass.

---

## 6. Verification & Acceptance Criteria
- All 12 existing frontend tests pass without regression.
- New tests for theme switching, UI components, and layouts pass.
- Theme switching works smoothly without page reloads or theme flashing.
- UI components render identically in light and dark modes with proper contrast.

