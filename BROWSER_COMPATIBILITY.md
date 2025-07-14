# KGC Application - Browser Compatibility Checklist

This document outlines the browsers and devices to be tested to ensure a consistent user experience for all users.

## 1. Target Browsers

The KGC application should be fully functional and visually consistent on the latest two versions of the following desktop browsers:

-   [ ] **Google Chrome** (Windows, macOS)
-   [ ] **Mozilla Firefox** (Windows, macOS)
-   [ ] **Apple Safari** (macOS)
-   [ ] **Microsoft Edge** (Windows)

## 2. Mobile Device Support

The application is a Progressive Web App (PWA) and must be fully responsive and functional on the following mobile platforms:

-   [ ] **iOS (Safari):** Latest two major iOS versions.
-   [ ] **Android (Chrome):** Latest two major Android OS versions.

## 3. Testing Checklist for Each Browser/Device

For each target platform, the following aspects should be verified:

### Layout & Styling
-   [ ] All pages render correctly without visual bugs or broken layouts.
-   [ ] Fonts and images are displayed correctly.
-   [ ] Tailwind CSS utility classes are applied as expected.
-   [ ] `shadcn/ui` components are rendered correctly.
-   [ ] Responsive design breakpoints function as intended.

### Core Functionality
-   [ ] User authentication (login/logout) works correctly.
-   [ ] All forms can be submitted successfully.
-   [ ] TanStack Query data fetching and caching works as expected.
-   [ ] The AI Supervisor chat is fully functional.
-   [ ] Daily Self-Scores can be submitted.
-   [ ] The "Keep Going" sequence plays correctly.
-   [ ] The Motivational Image Processor (MIP) allows image uploads.

### PWA & Offline Capabilities
-   [ ] The application can be installed to the home screen.
-   [ ] The app loads correctly when offline (if offline support is enabled).
-   [ ] Data entered offline is queued and synced when connectivity is restored.

### Accessibility
-   [ ] All interactive elements are accessible via keyboard.
-   [ ] ARIA attributes are used correctly.
-   [ ] Color contrast ratios meet WCAG AA standards.
-   [ ] Focus indicators are visible and clear.
