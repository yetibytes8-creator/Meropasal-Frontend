# Mero Pasal Frontend

An all-in-one business management platform for restaurants and inventory businesses.

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **shadcn/ui** + **Tailwind CSS**
- **React Router**, **React Query**, **Recharts**

## Getting Started

```sh
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available on desktop at `http://127.0.0.1:5176`.

## Mobile Preview With Fixed LAN IP

Use this when testing from a phone on the same Wi-Fi network.

```sh
npm run dev:mobile:fixed
```

Open this URL on the phone:

```text
http://192.168.18.8:5176
```

Keep `192.168.18.8` fixed by reserving this IP for the development PC in the Wi-Fi router DHCP settings. If the router changes the PC IP, update `dev:mobile:fixed` in `package.json`.

Backend must also be running:

```sh
cd ../backend
python manage.py runserver 127.0.0.1:8000 --noreload
```

## Build

```sh
npm run build
```
