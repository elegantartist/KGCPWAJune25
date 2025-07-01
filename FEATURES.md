# KGC Application - Feature Definitions

This document provides a high-level overview of the primary features within the Keep Going Care (KGC) application. It serves as a reference for development to ensure a clear understanding of each component's purpose.

## Core Patient-Facing Features

### 1. Dashboard (`dashboard.tsx`)
*   **Purpose**: The central landing page for patients after logging in. It provides a high-level overview and quick access to the most critical, high-frequency actions.
*   **Key Components**: Displays motivational imagery, welcome messages, and three prominent buttons for "Chat", "Daily Self-Scores", and the "Keep Going Sequence".

### 2. Enhanced Chatbot (`enhanced-chatbot.tsx`)
*   **Purpose**: A dedicated, focused interface for conversational interaction with the AI Supervisor Agent. It's designed for support, guidance, and answering patient questions.
*   **Key Components**: Chat interface, connectivity banner, and logout functionality.

### 3. Daily Self-Scores (`profile.tsx`)
*   **Purpose**: Allows patients to log their daily adherence to their care plan across three key areas: Diet, Exercise, and Medication.
*   **Key Components**: Sliders for scoring, a historical progress chart, and an option to discuss scores with the chatbot.

### 4. Motivational Image Processor (MIP) (`motivation.tsx`)
*   **Purpose**: Enables patients to upload and enhance a personal image that serves as their core motivation. This image is a key part of the "Keep Going Sequence".
*   **Key Components**: Image upload, a client-side image enhancement effect (e.g., adding stars), and saving the image for use in other features.

### 5. Inspiration Machine - Diet (`inspiration-d.tsx`)
*   **Purpose**: Helps patients find meal and recipe ideas that are aligned with their doctor's Care Plan Directives (CPDs).
*   **Key Components**: Search and filter options for recipes, display of video results, and the ability to save favorite recipes.

### 6. Inspiration Machine - Exercise & Wellness (`inspiration-ew.tsx`)
*   **Purpose**: Provides patients with guided exercise and wellness videos (e.g., yoga, meditation) that match their physical abilities and CPDs.
*   **Key Components**: Filtering by intensity and duration, video results display, and AI-powered analysis of fitness content.

### 7. E&W Support (`ew-support.tsx`)
*   **Purpose**: Helps patients find local, real-world support for their exercise and wellness goals, such as gyms, studios, and personal trainers.
*   **Key Components**: Location-based search for facilities and trainers, display of search results with contact info, and a "favorites" feature.

### 8. Diet Logistics (`diet-logistics.tsx`)
*   **Purpose**: Connects patients with third-party services for grocery delivery and meal kits to make adhering to their diet plan easier.
*   **Key Components**: Links to external services (Woolworths, Coles, HelloFresh), display of doctor's diet recommendations, and an integrated shopping list.

### 9. MBP Wiz (`mbp-wiz.tsx`)
*   **Purpose**: A tool to help patients find the best prices for their medications, particularly those not covered by PBS or insurance.
*   **Key Components**: Displays doctor's medication CPDs and provides a direct, sandboxed link to an external pharmacy website like Chemist Warehouse.

### 10. Journaling (`journaling.tsx`)
*   **Purpose**: A private space for patients to record their thoughts, feelings, and reflections related to their health journey.
*   **Key Components**: A text editor for writing entries and a calendar view to look back on past entries.

### 11. Progress Milestones (`progress-milestones.tsx`)
*   **Purpose**: A gamification system to motivate patients by awarding badges and financial rewards for consistent adherence to their care plan.
*   **Key Components**: A system of unlockable badges (Bronze, Silver, Gold, Platinum) for diet, exercise, and medication adherence. Includes a rewards program with vouchers and a lottery.
*   **Detailed Specification**: See PROGRESS_MILESTONES.md for full feature details.

### 12. Food Database (`food-database.tsx`)
*   **Purpose**: An educational tool that provides nutritional information for various foods, aligned with the patient's CPDs.
*   **Key Components**: Displays CPD-aligned food recommendations, nutritional data, and a "favorites" feature.