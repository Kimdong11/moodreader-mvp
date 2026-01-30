# MoodReader MVP

**MoodReader** is a Chrome Extension that analyzes the sentiment of the webpage you are reading and plays matching background music (via YouTube) to enhance your immersion.

## Project Structure (Monorepo)

-   `/extension`: Chrome Extension (Manifest V3, TypeScript, Vite)
-   `/server`: Backend Proxy (Node.js, Express, Cloud Run ready)

## Features

-   **Context-Aware Music**: Suggests tracks based on text mood (e.g. Scary text -> Dark Ambience).
-   **Player Tab**: Dedicated YouTube player that stays out of your way but controllable.
-   **Cost Control**: Limits analysis to 20/day per user. Caches results.
-   **Privacy-First**: No text is stored on servers. Logs are scrubbed.

## Installation (Local Dev)

1.  **Clone & Setup**
    ```bash
    git clone <repo>
    cd MoodReader-MVP
    ```

2.  **Build Server**
    ```bash
    cd server
    npm install
    npm run build
    npm test
    npm start
    ```
    Server runs at `http://localhost:8080`.

3.  **Build Extension**
    ```bash
    cd extension
    npm install
    npm run build
    ```
    This generates `dist/` folder.
    
4.  **Load in Chrome**
    -   Go to `chrome://extensions/`
    -   Enable "Developer mode"
    -   Click "Load unpacked"
    -   Select `extension/dist` folder.

## Usage

1.  Open any article (e.g. Wikipedia).
2.  Scroll down to trigger the Control Bar (bottom right).
3.  Click **Analyze** -> **Enable** (Consent).
4.  Wait for Player Tab to open (Background).
5.  Click **Play** on the Control Bar.
6.  Enjoy! (Auto-stops after 15m inactivity).

## Privacy & Data
See `Options` page in the extension for details. We collect anonymous session stats (duration, mood) if enabled.

## License
MIT
