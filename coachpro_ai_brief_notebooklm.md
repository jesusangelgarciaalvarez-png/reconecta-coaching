# PRODUCT BRIEF: CoachPro AI – The Intelligent Coaching Management Ecosystem

## Executive Summary
CoachPro AI is a high-fidelity, end-to-end management platform designed specifically for elite coaches. Unlike standard booking tools, CoachPro AI integrates a **Promotion Intelligence Engine (InteliBrain)**, an automated revenue tracking system, and a smart scheduling core that understands natural language business rules.

---

## 1. Core Technological Innovations

### A. InteliBrain v39.0 (Promotion Intelligence Engine)
*   **Natural Language Interpretation**: The system parses monthly promotion text (e.g., "2nd session 25% off" or "1st session free") and automatically applies logic without manual configuration.
*   **User History Tracking**: It maintains a persistent record of client visits via phone number, automatically identifying if a user is on their 1st, 2nd, or 10th session.
*   **Dynamic Discount Logic**: 
    *   **Visit-Based Rewards**: Applies specific discounts based on the user's progress (e.g., Loyalty rewards for returning clients).
    *   **Viral Referral System**: Integrated "Bring-a-Friend" module that validates the friend’s existence in the database before applying a 20% viral rebate.
    *   **Automated "Free Trial" Handling**: Detects "diagnostic" or "gift" keywords to set price to $0.00 instantly.

### B. Smart Scheduling Core
*   **Variable Duration Blocking**: Intelligent slot management. If a promotion requires a 90-minute session, the system automatically blocks a 120-minute window (2 full slots) to ensure proper buffer time for the coach.
*   **Real-Time Availability Map**: Uses a "Days/Times" bridge architecture to ensure zero double-bookings, even under high traffic.
*   **Timezone-Aware UX**: Clients see availability in their local time, while the admin manages the master schedule.

---

## 2. High-Fidelity Checkout Experience

### A. The "Smart Checkout" Modal
*   **Dynamic Price Breakdown**: Displays Base Rate, Applied Discounts (InteliBrain calculated), and Final Total in a sleek, glassmorphism-styled interface.
*   **Simulated Payment Bridge**: A high-trust visual flow that mimics premium payment gateways (Stripe/PayPal style) with processing animations and encrypted-booking confirmation.
*   **Instant Confirmation**: Upon "payment," the system triggers a multi-action save:
    1. Updates the Appointment Record.
    2. Blocks the Availability Map.
    3. Increments the User’s Visit Count.
    4. Generates a unique "Appointment ID" (Meeting Key).

---

## 3. Administrative Intelligence Dashboard

### A. Advanced Analytics & Revenue Tracking
*   **Financial Insights**: Real-time cards showing "Monthly Revenue" based on actual prices paid (post-discount).
*   **Conversion Metrics**: Bar graphs and charts showing visit trends and top-attending clients.
*   **Detailed Transaction Logs**: A full table of appointments including Client ID, Session Date/Time, and the exact price charged per transaction.

### B. Business Management Tools
*   **Monthly Rate Management**: The coach can set the month's base rate and promotion text through a dedicated UI. Changes propagate instantly to the booking engine.
*   **PDF Report Export**: Integrated `html2pdf.js` engine that allows the coach to generate professional financial reports for accounting with a single click.
*   **PIN-Protected Access**: Secure administrative area guarded by a 6-digit credential system.

---

## 4. Architecture & Scalability

### A. Technical Stack
*   **Frontend**: Vanilla JS (Dynamic Engine) + Custom CSS (Premium Aesthetics).
*   **Backend**: Vercel Serverless Functions (Bridge Architecture).
*   **Database**: Google Firebase Firestore (Real-Time Document Store).
*   **Security**: API Key masking and PIN-based auth for administrative endpoints.

### B. White-Label "Demo Mode"
*   **Environment Isolation**: The platform includes a "Simulation Mode" where potential clients can test the full booking flow using a separate collection (`demo_appointments`).
*   **Branding Flexibility**: Easily switchable logos and text themes to adapt to different coaching brands.

---

## 5. User Journey Highlights
1.  **Selection**: Interactive calendar with real-time occupancy dots.
2.  **Recognition**: Returning users are greeted by name; their visit count is automatically retrieved.
3.  **Reward**: Discounts appear instantly based on the promotion of the month.
4.  **Checkout**: A premium payment summary ensures the user understands the value they are receiving.
5.  **Success**: Confetti-powered confirmation page with "Add to Google Calendar" and instant Google Meet link access.
