# Simulación de phishing — experimento educativo

Aplicación web para un **experimento educativo de concientización sobre phishing**.
Los participantes acceden desde su celular mediante un código QR (generado
externamente con el enlace a `/participante`), interactúan con un portal de inicio de
sesión **simulado y genérico** (no imita ninguna marca real), y al final reciben un
mensaje educativo sobre cómo reconocer el phishing.

> ⚠️ **Uso responsable.** Esta herramienta es solo para fines educativos, con
> participantes que saben que forman parte de un ejercicio. El portal es deliberadamente
> genérico para no suplantar a ninguna organización real.

## Tecnologías

- **Frontend:** React + Vite + React Router
- **Backend:** Node.js + Express
- **Base de datos:** Supabase (PostgreSQL)

## Estructura

```
PoyectPishing/
├── database/
│   └── schema.sql          # Tablas: participantes, eventos, configuracion
├── backend/                # API Express
│   ├── server.js
│   ├── .env.example
│   └── src/
│       ├── supabase.js
│       ├── middleware/adminAuth.js
│       └── routes/{public,admin}.js
└── frontend/               # React (admin + participante)
    ├── .env.example
    └── src/
        ├── pages/{Admin,Participante}.jsx
        ├── components/BarChart.jsx
        ├── api.js
        └── styles.css
```

## Rutas

- `/participante` — vista para los participantes (enlace del QR).
- `/admin` — panel del administrador (sin login; protegido por clave en el servidor).

---

## Puesta en marcha

### 1. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta el contenido de [`database/schema.sql`](database/schema.sql).
3. En **Settings → API** copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (¡secreta, solo backend!)

### 2. Backend

```bash
cd backend
cp .env.example .env     # (Windows: copy .env.example .env)
# edita .env con tus valores de Supabase y define ADMIN_KEY
npm install
npm run dev              # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env     # (Windows: copy .env.example .env)
# VITE_ADMIN_KEY debe ser IGUAL a ADMIN_KEY del backend.
# Deja VITE_API_URL vacío en local (usa el proxy de Vite).
npm install
npm run dev              # http://localhost:5173
```

Abre:
- Participante: <http://localhost:5173/participante>
- Admin: <http://localhost:5173/admin>

---

## Seguridad (importante)

- La **service_role key** de Supabase vive **solo en el backend**, nunca en React.
- Las tablas tienen **RLS activado sin políticas públicas**: no se pueden leer/escribir
  con la clave anónima; todo pasa por el backend.
- Las operaciones del panel exigen la cabecera `x-admin-key` (= `ADMIN_KEY`).
- Como el panel no tiene login, úsalo en un **entorno local o privado**. Si lo publicas
  en internet, cambia la clave por una larga y considera restringir el acceso por red.

## Flujo del experimento

1. El administrador abre `/admin` y habilita la actividad (pestaña **Control**).
2. Los participantes escanean el QR → `/participante`.
3. Introducción → portal de inicio de sesión simulado → verificación → mensaje educativo.
4. El backend registra en Supabase: participación, credenciales y eventos
   (`acceso`, `credenciales`, `continuacion`, `finalizacion`).
5. El administrador consulta resumen, registros, estadísticas e historial, y puede
   exportar los registros a CSV o cerrar la actividad.

## API (resumen)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET  | `/api/config/estado` | público | ¿Actividad habilitada? |
| POST | `/api/participaciones` | público | Inicia participación (`acceso`) |
| POST | `/api/participaciones/:id/credenciales` | público | Guarda correo + contraseña |
| POST | `/api/participaciones/:id/evento` | público | Registra `continuacion`/`finalizacion` |
| GET  | `/api/admin/resumen` | clave | Tarjetas del dashboard |
| GET  | `/api/admin/registros` | clave | Tabla de credenciales |
| GET  | `/api/admin/estadisticas` | clave | Datos de gráficas |
| GET  | `/api/admin/eventos` | clave | Historial |
| GET  | `/api/admin/export` | clave | Exportar CSV |
| GET/PUT | `/api/admin/config` | clave | Consultar/cambiar estado |
