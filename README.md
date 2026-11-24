# ChronoShift: Interactive Time Travel Experience

A futuristic, fully client-side web app for travelling through the years 1900 to 2100, recording your own historical events, comparing years and keeping a personal time capsule. Built with **HTML5, CSS3 and vanilla JavaScript (ES6 modules)** only. No frameworks, no backend, no paid APIs, no sample data.

## Features
- **Admin login**: a single admin account created on first run (no demo credentials anywhere), password toggle, validation, "keep me signed in", logout.
- **Dashboard**: welcome, live clock and date, interactive time machine, summary counts, quick navigation, recent notes, activity-by-decade chart, empty states.
- **Time Machine**: 1900 to 2100 slider, previous/next, jump to any year, animated warp effect, difference from the current year, timeline markers for your saved items.
- **Historical Explorer**: add, edit, delete events (title, year, category, description, optional image URL), search, category filter, sort by year.
- **Past vs Future**: compare two different years, year difference, interactive comparison timeline, live updates.
- **Time Capsule**: notes for specific years with search, edit and delete.
- **Favourite Years**: save, remove, and travel to a year.
- **Settings**: theme and background, animation toggle and speed, optional sound effect, clear stored data (with confirmation), logout.
- **Search**: events, notes and saved years, with helpful empty states. Press `/` to focus the search bar.

## Technology stack
HTML5, CSS3 (custom properties, grid, flexbox, glassmorphism), vanilla JavaScript ES6 modules, LocalStorage, Web Crypto (PBKDF2) for password hashing, Web Audio for the optional sound. Fonts (Inter, Orbitron) load from Google Fonts when online and fall back to system fonts offline.

## Folder structure
```
ChronoShift/
  index.html          app shell (sidebar, top bar, main view)
  login.html          admin setup / sign in
  css/  style.css  login.css  responsive.css  animations.css
  js/
    app.js            guard, router, shared selected-year state
    auth.js           admin account, hashing, sessions
    login.js          login page logic
    dashboard.js  time-machine.js  explorer.js  comparison.js
    time-capsule.js  favourites.js  settings.js  search.js
    storage.js        LocalStorage wrapper
    utils.js          helpers, icons, toasts, dialogs
  assets/images/  assets/icons/
  README.md
```

## Setup and running (VS Code + Live Server)
1. Unzip `ChronoShift.zip`.
2. Open VS Code, choose **File > Open Folder…** and select the `ChronoShift` folder.
3. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`), search for **Live Server** (by Ritwick Dey) and click **Install**.
4. Right-click `login.html` in the Explorer and choose **Open with Live Server** (or click **Go Live** in the bottom-right status bar).
5. The browser opens `http://127.0.0.1:5500/login.html`. On first run, create your admin account. After that, sign in with it.

ES modules and password hashing need `http://` on localhost, so do not open the HTML files by double-clicking them.

## LocalStorage
All data is stored in your browser under keys beginning with `chronoshift:` (`admin`, `events`, `notes`, `favourites`, `settings`, `session`). Data is per browser and per address (`127.0.0.1:5500` and `localhost:5500` are separate stores). Clearing site data in your browser, or using **Settings > Clear stored data**, removes it.

## Frontend authentication: limitations (please read)
This login is a **convenience lock, not real security**.
- No credentials are hardcoded. The admin account is created by you on first run, and the password is stored as a salted PBKDF2 hash.
- Everything still lives in the browser. Anyone with access to your browser profile or DevTools can read, edit or delete the stored account and sessions, or skip the login page entirely.
- There is no server to rate-limit attempts, send password resets or audit access. "Forgot password" can only wipe this device's data.
- Do not store secrets in ChronoShift. For genuine authentication you need a backend that verifies credentials and issues sessions.
