# Microfrontend Architecture & Configuration Guide

This document explains the Microfrontend architecture implemented in this project, details the Vite configuration for Module Federation, and provides steps to run and build the applications.

## 🏗 Architecture Overview

This project implements a **Microfrontend Architecture** using **Vite** and **Module Federation**.

The system is split into two independent applications:

1.  **Remote App (Producer)**: Located in `packages/remote`.
    - This component owns specific UI features (e.g., `Button`, `MyProvider`) and exposes them.
    - It runs on **Port 5001**.
    - It serves a specialized entry file: `remoteEntry.js`.

2.  **Host App (Consumer)**: Located in `packages/host`.
    - This is the main shell application.
    - It consumes modules exposed by the Remote App at runtime.
    - It runs on **Port 5000**.

### 🔄 Module Federation Workflow

1.  The **Remote** app builds its code and generates a `remoteEntry.js` file (acting as an interface manifest).
2.  The **Host** app's configuration points to this `remoteEntry.js` URL.
3.  When the Host app loads, it dynamically fetches the `remoteEntry.js` from the Remote.
4.  The Host can then import components (like `Button`) as if they were local node modules (e.g., `import Button from 'remoteApp/Button'`).

---

## 🚀 How to Run the Applications

Since this project uses a standard folder structure without a root workspace manager, you must install dependencies in each package individually.

### 1. Prerequisites (Install Dependencies)

Open your terminal and run the following for both apps:

**For the Remote App:**

```bash
cd packages/remote
pnpm install
```

**For the Host App:**

```bash
# Open a new terminal tab/window
cd packages/host
pnpm install
```

### 2. Running for Development

The **Remote App** needs to provide the `remoteEntry.js` file to the Host. In this specific project setup, the `build` script in the remote package is customized to support a "Watch & Preview" mode, which mimics a dev server for Federation.

**Step 1: Start the Remote App**

```bash
# Inside packages/remote
pnpm run build
```

> **Note:** This command utilizes `vite build --watch` and `vite preview` concurrently. It will not exit; keep it running. It builds the artifacts and serves them on Port 5001.

**Step 2: Start the Host App**

```bash
# Inside packages/host (in a separate terminal)
pnpm run dev
```

> This starts the Host development server on Port 5000.

**Step 3: Access the App**
Open your browser to: **[http://localhost:5000](http://localhost:5000)**

---

## 🛠 How to Build for Production

To create static production artifacts for deployment:

**For the Host App:**

```bash
cd packages/host
pnpm run build
# The output will be in packages/host/dist
```

**For the Remote App:**
Because the default `npm run build` script is hijacked for the dev-watch workflow, you should run the vite build command directly for a pure production build:

```bash
cd packages/remote
pnpm vite build
# The output will be in packages/remote/dist
```

---

## ⚙️ Vite Configuration Breakdown

Both applications use the `@originjs/vite-plugin-federation` plugin. Below is the detailed explanation of the configuration.

### 1. Remote App Configuration (`packages/remote/vite.config.js`)

This config defines **what is shared** with the outside world.

```javascript
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "remote_app", // Unique internal name for the remote container
      filename: "remoteEntry.js", // The manifest file name the Host will request
      exposes: {
        "./Button": "./src/components/Button", // Exposes 'src/components/Button' as 'Button'
        "./MyProvider": "./src/MyContext", // Exposes 'src/MyContext' as 'MyProvider'
      },
      shared: ["react", "react-dom"], // Critical: Shares React to avoid "Two Reacts" error
    }),
    // ... custom plugin ...
  ],
  // ... build options ...
});
```

**Custom "Notify Host" Plugin:**
The config includes a custom plugin `vite-plugin-notify-host-on-rebuild`.

- **Purpose:** When you edit code in the Remote app, Vite rebuilds it (due to `--watch`). This plugin detects the end of that build and sends a `fetch` request to `http://localhost:5000/__fullReload`.
- **Effect:** This tells the Host app "I have updated my code, please reload to fetch the new logic."

### 2. Host App Configuration (`packages/host/vite.config.js`)

This config defines **what is consumed**.

```javascript
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "app",
      remotes: {
        // Maps the import scope 'remoteApp' to the remote entry URL
        remoteApp: "http://localhost:5001/assets/remoteEntry.js",
      },
      shared: ["react", "react-dom"], // Must match the remote's shared config!
    }),
    // ... custom plugin ...
  ],
  // ... build options ...
});
```

**Custom "Reload Endpoint" Plugin:**
The config includes `vite-plugin-reload-endpoint`.

- **Purpose:** It adds a middleware to the Host's dev server listening on `/__fullReload`.
- **Effect:** When it receives a request (from the Remote's plugin), it triggers `server.hot.send({ type: 'full-reload' })`, forcing the browser to refresh the Host app. This ensures you see changes made in the Remote app immediately.

### Build Implementation Details

Both configs set specific build targets:

- `modulePreload: false`: Disables preloading to prevent loading ordering issues.
- `target: 'esnext'`: Ensures the output assumes modern browser capabilities (Top-level await, etc.), which is often required for module federation.
- `cssCodeSplit: false`: (In this config) keeps CSS simplified, though often Federation works with split CSS too.

### Summary of Shared Dependencies

The `shared: ['react', 'react-dom']` configuration is critical. Without it, the Host would load its own React, and the loaded Remote component would load _its_ own React. This would cause the entire application to crash because React expects a singleton instance (especially for Hooks and Context).
