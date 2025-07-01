# Feature Specification: Progress Milestones

This document provides the detailed specification for the "Progress Milestones" feature in the KGC application. It serves as the single source of truth for its design, rules, and implementation.

## 1. Feature Overview

The Progress Milestones feature is a gamification system designed to motivate patients by recognizing and rewarding their consistent adherence to their doctor's Care Plan Directives (CPDs). Patients earn badges and financial incentives for maintaining good daily self-scores over time.

## 2. Core Mechanic: Achievement Badges

Patients earn badges in three core health categories. Each badge has four tiers: Bronze, Silver, Gold, and Platinum.

### Badge Categories & Visuals

The visual design of the badges is crucial for creating a sense of achievement.

*   **Base Image:** All badges will use the KGC logo as a base.
*   **Icon Size:** The badge icon should be rendered at a size appropriate for prominent display, interpreting the "5mm x 5mm" requirement as roughly 48x48 pixels in the UI.
*   **Category Color Filters:** The KGC logo will have a color overlay applied based on the badge category:
    *   **Healthy Eating Hero:** Green
    *   **Exercise Consistency Champion:** Purple
    *   **Medication Maverick:** Blue
*   **Tier Rings:** Each badge will be surrounded by a colored ring to indicate its tier:
    *   **Bronze:** Brown ring
    *   **Silver:** Grey ring
    *   **Gold:** Yellow ring
    *   **Platinum:** White/Luminescent ring

### Badge Achievement Rules

#### A. Healthy Eating Hero
*   **Description:** Awarded for consistent adherence to the healthy meal plan.
*   **Tiers:**
    | Level    | Requirement                               |
    |----------|-------------------------------------------|
    | Bronze   | Maintain a Self-Score of **5-10** for **2** consecutive weeks. |
    | Silver   | Maintain a Self-Score of **7-10** for **4** consecutive weeks. |
    | Gold     | Maintain a Self-Score of **8-10** for **16** consecutive weeks. |
    | Platinum | Maintain a Self-Score of **9-10** for **24** consecutive weeks. |

#### B. Exercise Consistency Champion
*   **Description:** Awarded for maintaining a regular exercise routine.
*   **Tiers:**
    | Level    | Requirement                               |
    |----------|-------------------------------------------|
    | Bronze   | Maintain a Self-Score of **5-10** for **2** consecutive weeks. |
    | Silver   | Maintain a Self-Score of **7-10** for **4** consecutive weeks. |
    | Gold     | Maintain a Self-Score of **8-10** for **16** consecutive weeks. |
    | Platinum | Maintain a Self-Score of **9-10** for **24** consecutive weeks. |

#### C. Medication Maverick
*   **Description:** Awarded for consistency with prescription medication adherence.
*   **Tiers:**
    | Level    | Requirement                               |
    |----------|-------------------------------------------|
    | Bronze   | Maintain a Self-Score of **5-10** for **2** consecutive weeks. |
    | Silver   | Maintain a Self-Score of **7-10** for **4** consecutive weeks. |
    | Gold     | Maintain a Self-Score of **8-10** for **16** consecutive weeks. |
    | Platinum | Maintain a Self-Score of **9-10** for **24** consecutive weeks. |

## 3. User Experience (UX)

### Badge Award Sequence
When a patient achieves a new badge, the following sequence should occur automatically:
1.  A prominent, celebratory pop-up (modal) appears, displaying the newly earned badge.
2.  The pop-up includes metadata about the award (e.g., "Congratulations! You've earned the Silver Healthy Eating Hero badge!").
3.  A "crowd cheering" sound effect plays for 3 seconds.
4.  The pop-up should be dismissible by the user.

### Information ("i") Button
The Progress Milestones page will feature a small "i" (info) button. When clicked, it will open a pop-up that explains the feature and begins with a short, engaging "badge award sequence" animation to demonstrate what happens when a badge is won.

## 4. Financial Incentives

### $100 Platinum Reward
*   **Rule:** A patient who achieves the **Platinum** badge level in **all three categories** receives a $100 voucher.
*   **Redemption:** The voucher can be used for healthy experiences and products at approved local vendors (gyms, health spas, yoga/pilates studios, health food stores, Coles, Woolworths).

### $250 Monthly Lottery
*   **Rule:** Any patient who has qualified for the $100 Platinum Reward is automatically entered into a monthly lottery for a $250 voucher.

## 5. Technical Implementation Notes

*   **Backend Logic:** The backend must track daily self-scores and calculate consecutive week streaks for each category.
*   **Offline Support:** Patient self-scores submitted while offline must be cached locally. When connectivity is restored, the cached scores must be synced to the backend to ensure streak calculations are accurate.
*   **Asset Management:** The KGC logo image and the crowd cheering sound file need to be added to the client-side assets.