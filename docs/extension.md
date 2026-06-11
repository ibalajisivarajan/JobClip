# JobClip Chrome Extension

The extension is a Manifest V3 unpacked extension for development.

## Local setup

1. Copy `extension/config.example.js` to `extension/config.js`.
2. Add your Supabase Project URL and anon public key.
3. In Supabase Auth URL configuration, add the Chrome redirect URL shown by `chrome.identity.getRedirectURL('auth')`. It has this shape: `https://<extension-id>.chromiumapp.org/auth`.
4. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the `extension/` folder.

The extension only captures the active tab after you click the popup. It does not crawl in the background.
