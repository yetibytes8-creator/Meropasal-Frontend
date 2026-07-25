# Frontend Security Notes

The production container uses `nginx.conf` to serve the React build and proxy `/api/` to Django.

## What Is Protected

- The SPA cannot be embedded in another site because `X-Frame-Options` and CSP `frame-ancestors` are set.
- Browser MIME sniffing is disabled.
- Referrer data is limited to origin-level information.
- Camera, microphone, and payment browser permissions are blocked by default.
- Static assets are cached, while the SPA route fallback still works.

## When To Change It

Only edit `nginx.conf` when adding a trusted external service such as:

- payment gateway
- analytics
- image CDN
- map/location service

Keep the CSP narrow. Do not add `*` to `script-src` or `connect-src` for production.
