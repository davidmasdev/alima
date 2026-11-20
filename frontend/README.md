# Alima app

The Alima mobile app, built with Expo, React Native and TypeScript. Users sign up, set up their nutrition profile,
log meals, create templates, follow their progress, scan products and ask for AI recommendations or analysis.

## Structure

- `app`: screens and navigation with Expo Router.
  - `(auth)`: login, sign-up, email verification, password recovery and onboarding.
  - `(tabs)`: the main screens: today, templates, progress and profile.
- `components`: reusable components, the scanner modal and UI elements.
- `services`: API calls and session handling.
- `types`: TypeScript types for the main responses and data.
- `contexts`: light and dark theme context.
- `constants`: shared colours and values.
- `assets`: images, icons and app resources.
- `__tests__`: app tests.

## Setup

```bash
npm install
cp .env.example .env
```

To work locally against the backend:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

The Google OAuth variables are only needed to try Google sign-in.

## Running

```bash
npm run start
```

From the Expo terminal you can open the app in Expo Go, an emulator or the browser. There are also direct commands:

```bash
npm run android
npm run ios
npm run web
```

## Useful commands

```bash
npm run test
npm run lint
```

The tests use Jest and React Native Testing Library. They cover the services, reusable components, the main screens
and some platform-specific behaviour.

## Talking to the API

All backend calls go through `services/api.ts`. The other services (`auth`, `profile`, `dailyLog`, `templates`,
`progress`, `recommendations` and `analysis`) build on it, so routes and tokens are handled in one place.
