

# Making SpendTracker a Progressive Web App (PWA)

This will allow users to install the app directly from their browser to their phone's home screen, making it feel like a native app with offline support and fast loading.

## What You'll Get
- An "Install" option when visiting the app on your phone or desktop browser
- The app will appear on your home screen with its own icon
- Faster loading after the first visit
- Works offline for previously loaded pages

## Technical Plan

### 1. Install the PWA plugin
- Add `vite-plugin-pwa` dependency to the project

### 2. Configure PWA in `vite.config.ts`
- Add the PWA plugin with app manifest settings (name, icons, theme color, display mode)
- Configure the service worker with `navigateFallbackDenylist` to exclude `/~oauth` from caching (required for authentication to work)
- Set up runtime caching strategies for API calls and static assets

### 3. Create PWA icons
- Add standard PWA icon sizes (192x192 and 512x512) to the `public` folder using the app's branding

### 4. Update `index.html`
- Add mobile-optimized meta tags (`theme-color`, `apple-mobile-web-app-capable`, Apple touch icon link)

### 5. Create an Install page (`/install`)
- A dedicated page at `/install` that detects the `beforeinstallprompt` event and provides a button to trigger the browser's install flow
- Includes instructions for iOS users (who need to use "Share > Add to Home Screen" manually)

### 6. Update routing in `App.tsx`
- Add the `/install` route

