# Gantavya Frontend Phase 2 — Core Application Experience & Routing

## 1. Overview & Objective

Phase 2 builds upon the UI foundation and semantic design tokens established in Phase 1, delivering an end-to-end, production-grade application experience for **Gantavya** — an intelligent multimodal travel planning and group collaboration platform.

### Architectural Invariants Preserved
- **Persistence**: MongoDB Atlas remains the sole database of record (Zero Redis invariant).
- **Compute Engine**: Python FastAPI intelligence service remains stateless.
- **Backend**: Node.js/Express modular monolith owns persistence, validation, authorization, and East-West routing.
- **Frontend**: React 18, Vite 5, Tailwind CSS with semantic tokens (`bg-bg`, `bg-surface`, `bg-card`, `border-border`, `text-main`, `text-muted`, `text-primary`), React Router 6.

---

## 2. Routing Architecture (`frontend/src/routes/AppRoutes.jsx`)

All routes are declared declaratively with authentication-aware route guards, dynamic redirects, and consistent layouts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Gantavya Routing Matrix                               │
├─────────────────────┬─────────────────┬──────────────────┬──────────────────┤
│ Route Path          │ Access Level    │ Layout Applied   │ Primary View     │
├─────────────────────┼─────────────────┼──────────────────┼──────────────────┤
│ `/`                 │ Public          │ PublicLayout     │ Landing Page     │
│ `/login`            │ Public (Guest)  │ Standalone Hero  │ LoginPage        │
│ `/register`         │ Public (Guest)  │ Standalone Hero  │ RegisterPage     │
│ `/explore`          │ Public/Adaptive │ AdaptiveLayout   │ ExplorePage      │
│ `/destinations/:id` │ Public/Adaptive │ AdaptiveLayout   │ DestinationDetail│
│ `/dashboard`        │ Authenticated   │ Authenticated    │ DashboardPage    │
│ `/trips`            │ Authenticated   │ Authenticated    │ TripsDashboard   │
│ `/trips/:tripId`    │ Authenticated   │ Authenticated    │ TripWorkspace    │
│ `/profile`          │ Authenticated   │ Authenticated    │ ProfilePage      │
│ `/settings`         │ Authenticated   │ Authenticated    │ SettingsPage     │
│ `/architecture`     │ Authenticated   │ Authenticated    │ ArchitectureView │
│ `*` (Catch-all)     │ Adaptive        │ AdaptiveLayout   │ NotFoundPage     │
└─────────────────────┴─────────────────┴──────────────────┴──────────────────┘
```

### Route Guard Implementations
1. **`ProtectedRoute`**: Inspects `isAuthenticated` and `loading` from `AuthContext`. Shows full-screen branded spinner during initial session verification; redirects unauthenticated users to `/login` preserving target location in `state.from`.
2. **`AdaptiveLayout`**: Enables public exploration of `/explore` and `/destinations/:id`. When the user is logged in, renders full sidebar navigation (`AuthenticatedLayout`); when guest, renders top navigation with theme toggle and Sign-In action (`PublicLayout`).
3. **Guest Landing Page (`/`)**: Preserves all existing architectural service cards (`Frontend Client`, `Backend Monolith`, `Intelligence Engine`, `Zero Redis` badge) and provides direct entry points to `/explore` and `/login`. Authenticated visits automatically redirect to `/dashboard`.

---

## 3. Core Pages & Component Architecture

### 3.1. Personalized Travel Dashboard (`/dashboard`)
- **Welcome Banner**: Dynamic user greetings, current calendar date, and primary action buttons ("Create New Trip", "Explore Destinations").
- **Real-Time Travel Statistics**: Computed strictly from real user trips retrieved via `TripService.listTrips()`. Never fabricates figures:
  - `Total Trips`: Total trips owned or participated in.
  - `Upcoming Journeys`: Count of journeys where `startDate >= now` or `status in ['planning', 'confirmed']`.
  - `Travel Network`: Total unique collaborators across all user trips.
  - `Planned Budget`: Cumulative target budget summed from actual records, with primary currency formatting.
- **Upcoming Journeys List**: Soonest upcoming trips rendered with status badges, destination name, participant count, and one-click workspace button.
- **Suggested Destinations**: Live destinations retrieved from MongoDB via `TripService.getDestinations()`.
- **Quick Shortcuts**: Fast navigation to `/explore`, `/profile`, `/settings`.
- **Zero-Trip Empty State**: Clean fallback with call-to-action button when a new user has no trips.

### 3.2. Trips Dashboard (`/trips`)
- Upgraded with semantic design tokens, eliminating raw slate hardcoding.
- **Status Filter Tabs**: `All Trips`, `Upcoming`, `Completed`, `Drafts` with active count badges.
- **Search & Sort**: Real-time search by trip title/destination; sorting by "Soonest First", "Latest First", "Title A-Z", "Highest Budget".
- **Trip Cards**: Shows destination, start/end dates, target budget, member avatars, status badges (`success`, `primary`, `warning`, `default`), and delete action with `ConfirmDialog`.
- **Full Backward Compatibility**: Preserves exact test selectors (`Your Collaborative Trips`, `New Trip`, `Accept Invite`).

### 3.3. Trip Workspace (`/trips/:tripId`)
- Seamlessly integrates URL route parameter `tripId` while maintaining fallback prop support.
- **Two-Column Responsive Layout**:
  - **Left Column**: Day selector pills, day theme, view switcher between "Multimodal Timeline & Transit" and "Activity List". Integrates `ItineraryTimeline` with conflict diagnostics, time markers, lock/unlock actions, and route alternatives.
  - **Right Column**: Collaborator management with owner/editor/viewer role selector, member deletion, invite form with token generation, and pending invitation cancellation.
- **AI Itinerary Synthesis**: Triggers FastAPI itinerary generation with 409 conflict detection and confirmation modal.

### 3.4. Explore & Destination Discovery (`/explore` & `/destinations/:id`)
- **Search & Category Filters**: Search bar and category pills (`All`, `Nature & Trekking`, `Culture & Heritage`, `Adventure Sports`, `Urban & Cities`).
- **Destination Cards**: Visual gradient cards displaying country, city, description snippet, category tags, and "Plan Trip" button pre-opening trip creation.
- **Destination Detail View**: Deep-dive view listing registered places of interest (POIs) fetched via `TripService.getPlaces(destinationId)`, including estimated duration, costs, and geographic coordinates.

### 3.5. Authentication Pages (`/login` & `/register`)
- Full standalone authentication pages built with reusable `Card`, `Input`, `Button`, and `ThemeToggle`.
- Validates credentials, handles API errors gracefully, and redirects to dashboard upon session creation.
- Preserves existing modal authentication (`AuthModal.jsx`) for in-place actions.

### 3.6. Traveller Profile & Settings (`/profile` & `/settings`)
- **Profile**: Displays user identity, role, avatar, home city, travel interests, and routing preferences. Updates name and parameters via `AuthService.updateMe` with real-time toast feedback.
- **Settings**: 3-way visual theme selector (Light / Dark / System) with persistence in `localStorage` under `gantavya_theme`. Architecture parameters overview and session termination button.

---

## 4. Reusable Modal Upgrades

All modal components were refactored to consume Phase 1 UI primitives:
- `CreateTripModal.jsx`: Uses `Dialog`, `Input`, `Select`, `Button` with date and budget validation.
- `AcceptInvitationModal.jsx`: Uses `Dialog`, `Input`, `Button` supporting token-based trip joining.
- `AuthModal.jsx`: Uses `Dialog`, `Input`, `Button` with Sign In / Register switching.

---

## 5. Verification & Test Suite Results

All existing and newly authored test suites pass with 100% green across all three system tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Gantavya Test Execution Matrix                    │
├─────────────────────────┬────────────┬─────────────┬───────────────────┤
│ Tier                    │ Test Files │ Test Count  │ Result            │
├─────────────────────────┼────────────┼─────────────┼───────────────────┤
│ Frontend (Vitest)       │ 8 files    │ 52 tests    │ 52 / 52 Passed    │
│ Backend (Vitest)        │ 9 files    │ 179 tests   │ 179 / 179 Passed  │
│ Intelligence (Pytest)   │ 5 files    │ 45 tests    │ 45 / 45 Passed    │
├─────────────────────────┼────────────┼─────────────┼───────────────────┤
│ Full Stack Total        │ 22 files   │ 276 tests   │ 276 / 276 (100%)  │
└─────────────────────────┴────────────┴─────────────┴───────────────────┘
```

### Frontend Test Breakdown (8 files, 52 tests):
1. [App.test.jsx](file:///c:/Users/Dell/Desktop/Gantavya/frontend/tests/App.test.jsx) (4 tests): Application heading, architectural service cards, Zero Redis indicator, guest sign-in button.
2. [TripsDashboard.test.jsx](file:///c:/Users/Dell/Desktop/Gantavya/frontend/tests/TripsDashboard.test.jsx) (4 tests): Action buttons, user trips from backend, modal opening/closing.
3. [ItineraryTimeline.test.jsx](file:///c:/Users/Dell/Desktop/Gantavya/frontend/tests/ItineraryTimeline.test.jsx) (4 tests): Activity items, multimodal transit items, conflict warning banner, alternative transit selection.
4. [DesignSystemUI.test.jsx](file:///c:/Users/Dell/Desktop/Gantavya/frontend/tests/DesignSystemUI.test.jsx) (17 tests): All 16 reusable UI primitives.
5. [ThemeAndLayout.test.jsx](file:///c:/Users/Dell/Desktop/Gantavya/frontend/tests/ThemeAndLayout.test.jsx) (7 tests): Theme persistence, ThemeToggle, PublicLayout, AuthenticatedLayout.
6. [RoutingAndAuth.test.jsx](file:///c:/Users/Dell/Desktop/Gantavya/frontend/tests/RoutingAndAuth.test.jsx) (6 tests): Public root, protected route redirection, dashboard access, login redirects, explore access, 404 handler.
7. [DashboardAndExplore.test.jsx](file:///c:/Users/Dell/Desktop/Gantavya/frontend/tests/DashboardAndExplore.test.jsx) (5 tests): Real travel statistics computation, zero-trip empty states, explore category filtering, search filtering, destination details & places.
8. [ProfileAndSettings.test.jsx](file:///c:/Users/Dell/Desktop/Gantavya/frontend/tests/ProfileAndSettings.test.jsx) (5 tests): Profile details rendering, profile update submission, theme selector options, theme toggling, session termination.

### Production Build Verification
- Vite production bundle generated cleanly:
  - `dist/index.html`: `1.29 kB`
  - `dist/assets/index-*.css`: `32.95 kB`
  - `dist/assets/index-*.js`: `367.44 kB`
  - Zero chunk errors or missing asset references.

