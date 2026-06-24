# WicakTani (E-Farmers) 🌾

WicakTani is an offline-first React Native Expo application designed to help local farmers manage their crop cycles, track expenses, and calculate projected profit margins. It provides a visual dashboard, granular expense ledgers, local notifications, backup/restore sharing capabilities, and harvest calculations with margin insights.

---

## Key Features

1.  **Authentication**: Secure local authentication and session management using AsyncStorage, with a forgot password recovery mechanism.
2.  **Beranda (Dashboard)**:
    *   Horizontal slider for active crops showing real-time operational expenses.
    *   Cash flow summary widgets and visual monthly expense trend graphs.
    *   **Crop Details Sub-page**: Includes a harvest calculator, dynamic SVG margin progress circle, locked total expense input derived from transactions, and categorized transactions list.
    *   **Settings/Profile**: Update user profile details, store profile avatars permanently using `expo-file-system`, set push notifications reminder frequencies, and export/import `.json` database backups.
3.  **Catatan (Buku Kas)**:
    *   Date-grouped ledger list with collapsible/expandable daily headers.
    *   Multi-criteria filter options (Period, Category, Crop Cycle) and text search.
    *   **Ledger Addition**: Add multiple expense rows in a single batch, assign distinct cycles per row, or create new crop cycles inline.

---

## Tech Stack

*   **Framework**: React Native with Expo SDK (v54.0.0)
*   **Navigation**: React Navigation (Native Stack, Bottom Tabs)
*   **Storage**: `@react-native-async-storage/async-storage` for offline database persistence.
*   **Native Modules**:
    *   `expo-image-picker` for profile avatar camera/gallery integration.
    *   `expo-file-system` for permanent image caching and backup/restore directories.
    *   `expo-sharing` & `expo-document-picker` for `.json` file backup/restore capabilities.
    *   `expo-notifications` for scheduling harian, 3x seminggu, and weekly push alerts.
    *   `react-native-svg` for drawing circular margin charts dynamically.

---

## Getting Started

### Prerequisites

*   Node.js (v18 or newer recommended)
*   npm or yarn
*   Expo Go app installed on your physical mobile device (iOS/Android) or simulator/emulator.

### Installation

1.  Clone the repository and navigate to the project directory:
    ```bash
    git clone <repository-url>
    cd WicakTani
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally (Development)

Start the Expo development server:
```bash
npm start
```
*   Press **`i`** to open the iOS simulator.
*   Press **`a`** to open the Android emulator/device.
*   Scan the QR code displayed in the terminal with your phone camera (iOS) or via the Expo Go app (Android) to test on a physical device.
*   Press **`r`** in the terminal running Metro bundler to trigger a clean reload of the application cache.

---

## Project Structure

```text
WicakTani/
├── assets/                  # App icon, splash, and font assets
├── src/
│   ├── components/          # Reusable UI components (InputField, BottomNavBar, etc.)
│   ├── navigation/          # React Navigation Navigators (Stack, Tab routing)
│   ├── screens/             # Screen components (Login, Beranda, Catatan, Profile, etc.)
│   ├── utils/               # Storage, auth, notifications, and calculation helpers
│   └── theme.js             # Styling themes and layout constants
├── App.js                   # Application root entrypoint
├── app.json                 # Expo configurations
└── package.json             # Dependencies and build scripts
```
