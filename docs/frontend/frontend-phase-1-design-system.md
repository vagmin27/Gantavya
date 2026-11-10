# GANTAVYA — FRONTEND PHASE 1
# ARCHITECTURE, DESIGN SYSTEM & UI FOUNDATION SPECIFICATION

**Date:** November 10, 2026  
**Document Version:** 1.0.0  
**Status:** Completed & Verified  
**Automated Test Suite Status:** **260/260 Passing** (179 Backend Vitest, 45 Intelligence Pytest, 36 Frontend Vitest)

---

## 1. Executive Summary

Frontend Phase 1 establishes a production-quality frontend architecture and design system for **Gantavya**, elevating it to a modern, premium travel-tech SaaS experience.

Key achievements:
1. **Semantic Design Tokens**: Abstracted color and spacing into CSS variables supporting instant theme switching with consistent contrast ratios.
2. **Robust Theme Engine**: Implemented `ThemeContext` supporting light mode, dark mode, and system preference with persistent `localStorage` storage and flash-free initial render scripts.
3. **Typography Hierarchy**: Integrated Google Fonts (**Inter** for high-legibility UI text and **Outfit** for distinctive headings and branding).
4. **Reusable UI Component Suite**: Built 16 accessible UI primitives (`Button`, `Input`, `Select`, `Textarea`, `Dialog`, `Dropdown`, `Card`, `Badge`, `Avatar`, `Tooltip`, `Tabs`, `Skeleton`, `Spinner`, `EmptyState`, `ErrorState`, `ConfirmDialog`) in `components/ui/`.
5. **Standardized Application Layouts**: Created `AuthenticatedLayout` (responsive collapsible sidebar, role badges, top header, user profile menu, theme toggle) and `PublicLayout` (public navigation, hero section, footer).
6. **Toast System**: Built `ToastContext` and floating viewport for non-intrusive feedback.
7. **Zero Regressions & Comprehensive Testing**: Expanded the frontend test suite from 12 to 36 tests with zero regressions across backend and intelligence suites.

---

## 2. Target Folder Architecture

```
frontend/src/
├── assets/                 # Static imagery, SVG travel illustrations, and icons
├── components/
│   ├── common/             # Shared cross-cutting components
│   ├── layout/             # Layout building blocks (Header, Sidebar, Navigation)
│   ├── ui/                 # Reusable UI component library (Button, Dialog, Card, etc.)
│   ├── travel/             # Travel-specific cards and badges
│   ├── itinerary/          # Itinerary timeline items and transfer cards
│   ├── AcceptInvitationModal.jsx
│   ├── AuthModal.jsx
│   ├── CreateTripModal.jsx
│   ├── ItineraryTimeline.jsx
│   ├── TripsDashboard.jsx
│   └── TripWorkspace.jsx
├── context/
│   ├── AuthContext.jsx     # Authentication session state & token rotation
│   ├── ThemeContext.jsx    # Light / Dark / System theme management
│   └── ToastContext.jsx    # Ephemeral notification toasts
├── layouts/
│   ├── AuthenticatedLayout.jsx # Collapsible sidebar, header, theme toggle, mobile drawer
│   ├── PublicLayout.jsx        # Public nav, hero container, travel SaaS footer
│   └── index.js
├── services/
│   ├── api.js              # Axios HTTP client with automatic refresh interceptor
│   ├── auth.service.js     # Auth REST endpoints
│   └── trip.service.js     # Trip, itinerary, activity, and transit endpoints
├── App.jsx                 # Main application root integrating Theme, Toast, and Layouts
├── main.jsx                # DOM mounting with StrictMode
└── index.css               # Google Fonts, semantic CSS variables, Tailwind directives
```

---

## 3. Design Tokens & Color System

All colors are controlled through CSS variables defined in [`frontend/src/index.css`](file:///c:/Users/Dell/Desktop/Gantavya/frontend/src/index.css) and exposed to Tailwind in [`frontend/tailwind.config.js`](file:///c:/Users/Dell/Desktop/Gantavya/frontend/tailwind.config.js):

| Design Token | CSS Variable | Light Theme | Dark Theme | Purpose |
| :--- | :--- | :---: | :---: | :--- |
| `bg` | `--color-bg` | `#F7F9FC` | `#090D16` | Application background |
| `surface` | `--color-surface` | `#FFFFFF` | `#0F172A` | Elevated containers, headers, sidebars |
| `card` | `--color-card` | `#FFFFFF` | `#162035` | Card containers and interactive surfaces |
| `card-muted` | `--color-card-muted` | `#F1F5F9` | `#1E293B` | Inactive tab backgrounds, pill inputs |
| `primary` | `--color-primary` | `#2563EB` | `#6366F1` | Brand actions, primary buttons, highlights |
| `primary-hover`| `--color-primary-hover`| `#1D4ED8` | `#4F46E5` | Active / hover button states |
| `primary-fg` | `--color-primary-fg` | `#FFFFFF` | `#FFFFFF` | High-contrast text on primary buttons |
| `main` | `--color-text-main` | `#111827` | `#F8FAFC` | Primary text and headings |
| `muted` | `--color-text-muted` | `#64748B` | `#94A3B8` | Secondary labels, timestamps, helpers |
| `border` | `--color-border` | `#E2E8F0` | `#263247` | Subtle card borders and dividers |
| `accent` | `--color-accent` | `#38BDF8` | `#818CF8` | Feature tags and special highlights |

---

## 4. Typography

Loaded directly via Google Fonts in [`frontend/index.html`](file:///c:/Users/Dell/Desktop/Gantavya/frontend/index.html) and configured in Tailwind:

- **Primary Interface Font (`font-sans`)**:  
  `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`  
  Weights: `300` (Light), `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold).
- **Headings & Branding (`font-heading`)**:  
  `'Outfit', 'Inter', -apple-system, sans-serif`  
  Weights: `500` (Medium), `600` (SemiBold), `700` (Bold), `800` (ExtraBold).

---

## 5. Theme System Architecture

The theme engine is encapsulated in [`frontend/src/context/ThemeContext.jsx`](file:///c:/Users/Dell/Desktop/Gantavya/frontend/src/context/ThemeContext.jsx):

```javascript
const { theme, resolvedTheme, setTheme } = useTheme();
```

### Characteristics:
1. **Modes**: Supports `'light'`, `'dark'`, and `'system'` (tracks system OS preference via `prefers-color-scheme`).
2. **Flash-Free Initial Load**: An inline `<script>` in `<head>` inspects `localStorage.getItem('gantavya_theme')` and adds/removes the `.dark` class to `document.documentElement` before the DOM renders.
3. **Session Persistence**: Stored under key `'gantavya_theme'`. Does not use `localStorage.clear()` so user theme preference survives user logout.
4. **One-Click Switcher**: Provided by [`ThemeToggle.jsx`](file:///c:/Users/Dell/Desktop/Gantavya/frontend/src/components/ui/ThemeToggle.jsx) with Sun, Moon, and Laptop (System) controls.

---

## 6. Reusable UI Component Inventory

All components are located in [`frontend/src/components/ui/`](file:///c:/Users/Dell/Desktop/Gantavya/frontend/src/components/ui/) and exported via `index.js`:

| Component | Props & Variants | Description |
| :--- | :--- | :--- |
| `Button` | `variant` (`primary`, `secondary`, `outline`, `ghost`, `danger`, `subtle`), `size` (`sm`, `md`, `lg`, `icon`), `loading`, `disabled`, `leftIcon`, `rightIcon` | Accessible button with loading spinner slot and scale transitions. |
| `Input` | `label`, `error`, `helperText`, `leftIcon`, `rightIcon`, standard input props | Floating input with validation borders and icon attachments. |
| `Textarea` | `label`, `error`, `helperText`, `rows`, standard textarea props | Multi-line text field with border validation. |
| `Select` | `label`, `options` (array or children), `error`, standard select props | Native styled select dropdown with Chevron indicator. |
| `Card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `hover` | Composable card container with subtle shadow and border. |
| `Badge` | `variant` (`default`, `primary`, `success`, `warning`, `danger`, `accent`, `outline`), `size` (`xs`, `sm`, `md`) | Semantic status pill. |
| `Avatar` | `name`, `src`, `size` (`xs`, `sm`, `md`, `lg`), `status` (`online`, `busy`, `offline`) | Image with fallback initials calculation from user name. |
| `Dialog` | `isOpen`, `onClose`, `title`, `description`, `maxWidth`, `children` | Modal dialog with background blur, focus trap, and escape key listener. |
| `Dropdown` | `trigger`, `children` (or render function), `align` (`left`, `right`) | Floating action menu with click-outside auto-dismiss. |
| `Tooltip` | `content`, `position` (`top`, `bottom`, `left`, `right`), `children` | Micro-interaction hover tooltip. |
| `Tabs` | `Tabs`, `TabList`, `TabTrigger`, `TabContent`, `defaultValue`, `value`, `onValueChange` | Accessible tab switcher. |
| `Skeleton` | `variant` (`rect`, `circle`, `text`), standard div props | Shimmer loading placeholder. |
| `Spinner` | `size` (`xs`, `sm`, `md`, `lg`), `className` | Lightweight animated SVG spinner. |
| `EmptyState` | `icon`, `title`, `description`, `action` | Visual placeholder for zero-data states. |
| `ErrorState` | `title`, `message`, `onRetry` | Diagnostic error box with retry button. |
| `ConfirmDialog` | `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmText`, `confirmVariant`, `loading` | Destruction confirmation modal. |
| `ThemeToggle` | `showLabel`, `className` | Three-way toggle button group. |

---

## 7. Application Layouts

### 7.1 `AuthenticatedLayout`
- **Sidebar**:
  - Sticky desktop sidebar with collapsible toggle.
  - Role-aware navigation links (`My Trips`, `Architecture`).
  - Active user card with Avatar and Logout shortcut.
  - Mobile off-canvas drawer with backdrop overlay.
- **Top Header**:
  - Mobile hamburger menu trigger.
  - Page title or active trip breadcrumb (`Trips > Jaipur Tour`).
  - Theme toggle.
  - User profile dropdown menu with role badge and logout action.
- **Main Viewport**:
  - Max-w-7xl centered container with generous padding.

### 7.2 `PublicLayout`
- **Header**: Brand logo (`G`), title (`Gantavya`), subtitle, Theme toggle, and "Sign In" button.
- **Hero/Content Slot**: Welcome callout and foundational architecture cards.
- **Footer**: Brand mark, platform description, and reliability badge (`Zero Redis • Stateless FastAPI`).

---

## 8. Automated Testing & Verification

### Test Suite Execution Summary

```
Test Files  5 passed (5)
     Tests  36 passed (36)
  Duration  5.01s
```

#### Detailed Test Coverage:
1. `tests/DesignSystemUI.test.jsx` (17 tests):
   - Button click handling, loading spinner, and variant styling.
   - Input label, placeholder, user text entry, and error rendering.
   - Select dropdown change events and Textarea user inputs.
   - Composed Card header, content, and footer hierarchy.
   - Badge color variants.
   - Avatar initials calculation.
   - Dialog modal rendering, escape key listener, and hidden states.
   - ConfirmDialog confirmation and cancelation flows.
   - Tabs trigger selection and content switching.
   - EmptyState title, icon, and action button.
   - ErrorState message and retry handler.
2. `tests/ThemeAndLayout.test.jsx` (7 tests):
   - Theme initialization with system preference.
   - DocumentElement `.dark` class application.
   - `localStorage` persistence under `'gantavya_theme'`.
   - ThemeToggle button click interactions.
   - Theme restoration on initial page load.
   - PublicLayout header, children, and footer rendering.
   - AuthenticatedLayout sidebar, mobile drawer, and trip breadcrumb rendering.
3. `tests/App.test.jsx` (4 tests):
   - Application heading.
   - Three architectural service cards.
   - "Zero Redis" architecture badge.
   - Sign In / Register button.
4. `tests/TripsDashboard.test.jsx` (4 tests):
   - Trips listing, search filtering, and actions.
5. `tests/ItineraryTimeline.test.jsx` (4 tests):
   - Timeline items, conflict alert banner, alternative route switching, and dynamic recalculation.

---

## 9. Dependencies Added
- **Zero new npm runtime dependencies added**. The design system and UI foundation leverage existing packages (`react`, `react-dom`, `lucide-react`, `tailwindcss`, `axios`).

