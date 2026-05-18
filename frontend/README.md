# Frontend de Alima

Aplicación móvil de Alima, hecha con Expo, React Native y TypeScript. Desde aquí el usuario puede registrarse, configurar su perfil nutricional, registrar comidas, crear plantillas, consultar progreso, escanear productos y pedir recomendaciones o análisis con IA.

## Estructura

- `app`: pantallas y navegación con Expo Router.
  - `(auth)`: login, registro, verificación de correo, recuperación de contraseña y onboarding.
  - `(tabs)`: pantallas principales: hoy, plantillas, progreso y perfil.
- `components`: componentes reutilizables, modal de escaneo y elementos de interfaz.
- `services`: llamadas a la API y gestión de sesión.
- `types`: tipos TypeScript de las respuestas y datos principales.
- `contexts`: contexto de tema claro/oscuro.
- `constants`: colores y valores compartidos.
- `assets`: imágenes, iconos y recursos de la app.
- `__tests__`: pruebas del frontend.

## Configuración

Instala dependencias:

```bash
npm install
```

Crea el fichero de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

Para trabajar en local con el backend:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

Las variables de Google OAuth solo hacen falta para probar el inicio de sesión con Google.

## Arranque

```bash
npm run start
```

Desde la terminal de Expo se puede abrir en Expo Go, emulador o navegador. También hay comandos directos:

```bash
npm run android
npm run ios
npm run web
```

## Comandos útiles

```bash
npm run test
npm run lint
```

Los tests usan Jest y React Native Testing Library. Cubren servicios, componentes reutilizables, pantallas principales y algunos comportamientos por plataforma.

## Conexión con la API

La comunicación con el backend se centraliza en `services/api.ts`. El resto de servicios (`auth`, `profile`, `dailyLog`, `templates`, `progress`, `recommendations` y `analysis`) usan esa base para mantener las rutas y tokens en un solo sitio.
