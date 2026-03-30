# Guía de Estilo - App de nutrición

## Reglas Fundamentales

### 1. NUNCA usar emoticonos
- No se permiten emojis en ningún texto de la interfaz
- Usar texto plano o iconos de FontAwesome en su lugar
- Mantener la interfaz profesional y limpia

### 2. NUNCA usar gradientes
- Usar SIEMPRE colores sólidos
- NO usar LinearGradient en ningún componente
- Todos los fondos, botones y elementos deben usar colores sólidos de la paleta

### 3. NUNCA usar animaciones de transición de página
- NO usar animaciones de entrada (fade, slide, scale) al cargar pantallas
- NO usar Animated.Value, Animated.timing, Animated.spring para transiciones
- Las animaciones de feedback (press/touch) en inputs sí están permitidas

## Paleta de Colores

### Colores Primarios
- **Primary**: `#2DD4BF` (Verde turquesa)
- **Primary Dark**: `#0D9488` (Verde oscuro)
- **Primary Light**: `#5EEAD4` (Verde claro)
- **Primary Muted**: `rgba(45, 212, 191, 0.1)` (Verde muy transparente)

### Colores Secundarios
- **Secondary**: `#FB7185` (Coral)
- **Secondary Light**: `#FDA4AF` (Coral claro)

### Colores de Fondo
- **Background**: `#FAFAFA` (Gris muy claro)
- **Background Secondary**: `#F3F4F6` (Gris claro)
- **Background Card**: `#FFFFFF` (Blanco)

### Colores de Texto
- **Text**: `#1F2937` (Gris oscuro - texto principal)
- **Text Secondary**: `#6B7280` (Gris medio)
- **Text Light**: `#9CA3AF` (Gris claro)
- **Text White**: `#FFFFFF` (Blanco)
- **Text Muted**: `rgba(31, 41, 55, 0.6)` (Texto semitransparente)

### Colores de Estado
- **Error**: `#EF4444` (Rojo)
- **Error Light**: `rgba(239, 68, 68, 0.08)` (Rojo muy transparente)
- **Success**: `#10B981` (Verde éxito)
- **Success Light**: `rgba(16, 185, 129, 0.08)` (Verde éxito transparente)

### Colores de Bordes
- **Border**: `#E5E7EB` (Borde estándar)
- **Border Light**: `#F3F4F6` (Borde muy claro)
- **Border Focus**: `#2DD4BF` (Borde enfocado - usa primary)

### Colores de Redes Sociales
- **Facebook**: `#1877F2`
- **Google**: `#EA4335`
- **Apple**: `#000000`

### Sombras
- **Shadow**: `rgba(0, 0, 0, 0.05)` (Sombra ligera)
- **Shadow Dark**: `rgba(0, 0, 0, 0.1)` (Sombra estándar)
- **Primary Shadow**: `rgba(45, 212, 191, 0.3)` (Sombra con color primario)

## Tipografía

### Estilos de Texto
- **Títulos grandes**: 32-36px, fontWeight: '800', letterSpacing: -0.5
- **Títulos medianos**: 24-28px, fontWeight: '700'
- **Subtítulos**: 16px, fontWeight: '500', color: textSecondary
- **Texto body**: 14-16px, fontWeight: '400-500'
- **Texto pequeño**: 12-13px, fontWeight: '500-600'
- **Links**: 14-15px, fontWeight: '600-700', color: primaryDark

### Jerarquía
1. **H1** (Pantalla principal): 36px, weight 800
2. **H2** (Títulos de sección): 28px, weight 700
3. **H3** (Subtítulos): 18-20px, weight 600
4. **Body**: 14-16px, weight 400-500
5. **Caption**: 12-13px, weight 500

## Componentes UI

### Botón (Button)
**Variantes:**
1. **Primary**: Fondo primary (#2DD4BF), texto blanco, sombra colored
2. **Secondary**: Fondo secondary, texto blanco
3. **Outline**: Fondo transparente, borde gris, texto gris oscuro
4. **Ghost**: Fondo transparente, texto primary

**Tamaños:**
- **Small**: paddingVertical: 10, paddingHorizontal: 20
- **Medium**: paddingVertical: 16, paddingHorizontal: 28
- **Large**: paddingVertical: 18, paddingHorizontal: 32

**Estilos base:**
- Border radius: 16px
- Sombra en primary: offset {0, 4}, opacity 0.3, radius 8
- Font weight: 600-700
- Letter spacing: 0.3

### Input
**Características:**
- Altura: 56px
- Border radius: 16px
- Border width: 1.5px (normal), 2px (focused)
- Padding horizontal: 16px
- Icono a la izquierda: 18px, color cambia al enfocar
- Label opcional arriba: 14px, weight 600
- Placeholder: color placeholder, 16px

**Estados:**
- **Normal**: borderColor: border, background: white
- **Focused**: borderColor: primary, sombra colored
- **Error**: borderColor: error, background: errorLight

**Animaciones:**
- Scale de 1.02 al enfocar (spring animation)

### SocialButton
- Tamaño: 60x60px
- Border radius: 20px
- Background: color específico de marca (muy claro)
- Sombra sutil: offset {0, 2}, opacity 0.1
- Icono: 24px

### Cards/Contenedores
- Background: white
- Border radius: 16-20px
- Sombra suave: offset {0, 2}, opacity 0.05-0.1
- Padding: 20-24px

## Diseño Visual

### Fondos
- **Pantallas**: background (#FAFAFA) - no usar blanco puro
- **Elementos decorativos**: Usar círculos flotantes con colores muy transparentes (primaryMuted)
- **Header**: Usar color sólido primaryMuted

### Sombras
**Estándar:**
```javascript
shadowColor: Colors.shadow,
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 3,
```

**Elevada:**
```javascript
shadowColor: Colors.shadowDark,
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.15,
shadowRadius: 8,
elevation: 5,
```

**Colored (para botones primary):**
```javascript
shadowColor: Colors.primary,
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.3,
shadowRadius: 8,
elevation: 5,
```

## Animaciones

### Principios
- SOLO animaciones de feedback (press/touch) permitidas
- NO usar animaciones de entrada (fade, slide, scale) al cargar pantallas
- NO usar Animated.Value, Animated.timing, Animated.spring para transiciones
- Animaciones de feedback en inputs (scale al enfocar) sí están permitidas

### Patrones Permitidos
- **Focus**: scale (1.02) + border color (solo en Input, Select, NumberInput)
- **Loading**: ActivityIndicator con color primary

## Iconografía

### Fuente
Usar **FontAwesome** (@expo/vector-icons)

### Tamaños
- **Pequeño**: 16px (feature icons, inline)
- **Mediano**: 18-20px (input icons, buttons)
- **Grande**: 24-28px (social buttons, standalone)
- **Extra grande**: 50px (logo principal)

### Iconos comunes
- **Email**: envelope-o
- **Password**: lock
- **User**: user
- **Back**: arrow-left
- **Logo**: leaf
- **Health**: heart
- **Progress**: line-chart
- **Community**: users
- **Eye**: eye / eye-slash
- **Error**: exclamation-circle

## Layout

### Espaciado
- **Pantalla padding**: 24-30px horizontal
- **Entre secciones**: 32-40px
- **Entre elementos**: 16-20px
- **Elementos compactos**: 8-12px

### Estructura
- Usar SafeAreaView siempre
- KeyboardAvoidingView en pantallas con formularios
- ScrollView cuando el contenido puede exceder la pantalla
- Evitar magins negativos

### Responsive
- Usar flex: 1 para ocupar espacio disponible
- maxWidth en botones grandes: 320px
- width: 100% en contenedores flexibles
- Evitar dimensiones fijas cuando sea posible

## Accesibilidad

### Contraste
- Asegurar ratio mínimo 4.5:1 para texto
- Usar textSecondary para texto menos importante
- No usar solo color para transmitir información

### Touch Targets
- Mínimo 44x44px para elementos interactivos
- Espaciado adecuado entre botones
- Feedback visual en press/touch

### Formularios
- Labels claros sobre cada input
- Mensajes de error descriptivos
- Validación en tiempo real con feedback visual
- Auto-capitalize y keyboardType apropiados

## Mejores Prácticas

1. **Siempre importar Colors desde '@/constants/Colors'**
2. **Nunca hardcodear colores** - siempre usar la constante
3. **Mantener consistencia** en espaciado y tipografía
4. **Usar componentes reutilizables** (Button, Input, SocialButton)
5. **Validar formularios** antes de enviar
6. **Mostrar estados de carga** con ActivityIndicator
7. **Manejar errores** con mensajes claros al usuario
8. **Mantener código limpio** - pasar linting antes de commit
