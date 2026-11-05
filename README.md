# Centro de Mando — CRM de interpretación

Panel operativo para la gestión de servicios de interpretación de idiomas:
eventos, clientes, estatus (prospecto → confirmado → facturado) y finanzas
(cartera, anticipos, saldos) en un solo lugar.

Construido con Next.js 16, Tailwind CSS 4 y Prisma sobre PostgreSQL.

## Mapa del local

| Carpeta | Qué vive ahí |
| --- | --- |
| `src/app` | El comedor: la página principal y las ventanillas de la API (`/api/eventos`, `/api/exportar`). |
| `src/components` | El mobiliario: tarjetas de eventos, formularios, análisis y la galería de temas. |
| `src/components/ui` | El menaje básico reutilizable (botones, diálogos, campos de formulario). |
| `src/lib` | Las recetas puras: formato de estatus, fechas, temas visuales y la conexión a la base de datos. |
| `src/hooks` | Los reflejos del comedor (reloj del cliente, notificaciones). |
| `prisma` | El plano de la alacena: la tabla `Evento`. |
| `public` | El letrero y las indicaciones para buscadores. |

## Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | La llave de la bodega PostgreSQL. **En Vercel se inyecta automáticamente** al conectar la base de datos desde la pestaña *Storage*. |

Ver `.env.example`.

## Desarrollo local (el taller)

```bash
v0.5
bun install
bunx prisma generate
bun run dev
```

La base de datos local se configura en `.env` con `DATABASE_URL`.

## Despliegue en Vercel

1. Importar este repositorio como proyecto nuevo.
2. Conectar la base de datos PostgreSQL (pestaña *Storage* → *Neon*).
3. En *Settings → Build & Output Settings*, activar **Override** del *Build Command* y pegar:

```bash
npx prisma generate && npx prisma db push --accept-data-loss && next build
```

Ese comando prepara la alacena (crea la tabla `Evento`) y luego cocina la app.
4. Desplegar. La ruta `/api` responde un saludo JSON para verificar que el
   local está abierto.

## Los datos

El botón de exportación descarga todos los eventos como CSV — respaldo
disponible en cualquier momento, sin depender de nada más.
