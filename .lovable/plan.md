

# CRM as a Standalone App Section

## Overview
Transform the CRM module into its own self-contained sub-application with a dedicated layout, separate from the main app. CRM pages will have their own sidebar showing only CRM navigation items, while all other pages (Dashboard, Sales Analytics, Chatbot, Admin, etc.) keep the current layout unchanged.

## What Changes

### 1. New CRM Layout (`src/layouts/CrmLayout.tsx`)
- A dedicated layout component used exclusively for `/crm/*` routes
- Its own sidebar with only CRM-specific navigation: CRM Home, Customers, Bookings, Services, Timeline, Work Orders, Leads, Follow-ups, Inbox
- A "Back to Main" link at the top of the sidebar to return to the main app (e.g., Dashboard)
- Same header style as AppLayout for visual consistency, but the sidebar content is CRM-only
- Emerald color theme throughout (matching the existing CRM group color)

### 2. New CRM Sidebar (`src/components/layout/crm-sidebar-nav.tsx`)
- Renders only CRM navigation items (filtered from `appSections` where `group === "crm"`)
- Includes a prominent back button/link to exit CRM and return to Dashboard
- Collapsible mini-mode support (same as current sidebar)
- Emerald-themed active states and indicators

### 3. Updated Main Sidebar (`src/components/layout/sidebar-nav.tsx`)
- Remove individual CRM sub-items (Customers, Bookings, Services, etc.) from the main sidebar
- Keep only a single "CRM" entry that links to `/crm` as an entry point into the CRM sub-app
- All other groups (Overview, Messaging, Settings) remain exactly as they are

### 4. Updated Routing (`src/App.tsx`)
- Move all `/crm/*` routes under a new parent route that uses `CrmLayout` instead of `AppLayout`
- Non-CRM routes continue using `AppLayout` as before

### 5. Navigation Config (`src/config/navigation.ts`)
- Add a new export `crmSections` filtered for CRM items, used by the CRM sidebar
- Update `navGroups` for the main sidebar to only include the CRM hub link (not sub-pages)

## Visual Flow

```text
Main App (AppLayout)              CRM Sub-App (CrmLayout)
+--------------------------+      +--------------------------+
| Header                   |      | Header                   |
|--------------------------|      |--------------------------|
| Sidebar    | Content     |      | CRM        | Content     |
| - Dashboard|             |      | Sidebar    |             |
| - Analytics|             |  ->  | <- Back    |             |
| - CRM -----+-- click -->|      | - Home     |             |
| - Chatbot  |             |      | - Customers|             |
| - Admin    |             |      | - Bookings |             |
| - ...      |             |      | - Services |             |
+--------------------------+      | - ...      |             |
                                  +--------------------------+
```

## Technical Details

### Files to Create
- `src/layouts/CrmLayout.tsx` -- mirrors AppLayout structure but uses CRM sidebar
- `src/components/layout/crm-sidebar-nav.tsx` -- CRM-only sidebar navigation

### Files to Modify
- `src/App.tsx` -- split CRM routes into their own layout group
- `src/config/navigation.ts` -- export `crmSections` and adjust main sidebar items
- `src/components/layout/sidebar-nav.tsx` -- remove CRM sub-items from main nav (keep only CRM hub link)

### No Changes To
- All page components (CRM.tsx, Customers.tsx, etc.) remain untouched
- Header component stays the same
- Auth, providers, and business gate remain unchanged
- All non-CRM routes and layouts stay exactly as they are

