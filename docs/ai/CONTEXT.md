# CONTEXT.md — Sol Admin
_Última actualización: 2026-07-17_

## Qué es esto
Sistema de gestión web para un salón de estética (Sol Cantero). Cubre agenda, clientes, servicios, empleadas, reportes financieros, depilación láser y un CMS para la landing pública. Está en producción en `admin.solcantero.com.ar` con una clienta activa.

## Stack
- **Backend:** Node.js + Express 5 (SSR con EJS)
- **Base de datos:** PostgreSQL — conexión via `pg` (pool), sesiones persistidas en tabla `session` (connect-pg-simple)
- **Vistas:** EJS con partials reutilizables (head, header, sidebar, footer)
- **Estilos:** CSS puro con variables custom, sin frameworks. Dark mode soportado via `theme.js`
- **UI select avanzado:** Tom Select (dark mode integrado)
- **Imágenes:** Cloudinary para subida/eliminación de assets del CMS landing
- **Excel:** ExcelJS para importar/exportar clientes y servicios en `.xlsx`
- **Logging:** Winston (estructurado, con niveles info/warn/error y contexto por operación)
- **Seguridad:** Helmet, express-rate-limit (en login), bcrypt, express-session (httpOnly, secure en prod, sameSite strict, 8h)
- **Deploy:** Render (backend + PostgreSQL). En prod usa `DATABASE_URL` con SSL.

## Arquitectura

```
back/
├── index.js                  ← entry point: middlewares, rutas, error handler
└── src/
    ├── api/
    │   ├── controllers/      ← lógica de request/response
    │   ├── models/           ← queries SQL puras (no ORM)
    │   ├── routes/           ← definición de rutas Express
    │   ├── middlewares/      ← requireAuth, requireAdmin
    │   ├── validators/       ← validaciones con funciones puras
    │   └── database/db.js    ← pool pg (auto-detecta local vs prod)
    ├── utils/
    │   ├── alertasHelper.js  ← alertas para agenda y dashboard
    │   ├── cloudinaryHelper.js ← subirImagen / eliminarImagen
    │   ├── dateHelpers.js
    │   ├── reporteHelpers.js ← calcularDatosDashboard, calcularDatosReportes
    │   ├── turnoHelpers.js
    │   └── logger.js
    ├── views/                ← plantillas EJS por módulo
    └── public/
        ├── css/styles.css
        └── js/
            ├── alertas.js    ← sistema de notificaciones con localStorage
            ├── theme.js
            └── toast.js
```

MVC clásico. No hay ORM: todos los modelos hacen SQL directo con el pool de `pg`. Las transacciones (BEGIN/COMMIT/ROLLBACK) se hacen con `pool.connect()` cuando la operación afecta múltiples tablas.

## Módulos principales

| Módulo | Ruta | Descripción |
|---|---|---|
| Dashboard | `/admin` | Solo admin. KPIs del negocio + alertas |
| Agenda | `/agenda` | Grilla diaria por empleada (8:00–20:00, bloques de 30min) |
| Clientes | `/clientes` | CRUD + historial de turnos + import/export Excel |
| Servicios | `/servicios` | Catálogo base con precio y duración sugerida |
| Empleados | `/empleados` | Perfil con % ganancia configurable |
| Turnos | `/turnos` | Creación/edición desde agenda |
| Reportes | `/reportes` | Financiero por rango de fechas + anual comparativo |
| Mi Panel | `/mi-panel` | Vista de empleada: sus turnos y métricas (semana/mes) |
| Láser | `/laser` | Módulo separado para depilación láser: clientas, días, zonas, combos, catálogo |
| Usuarios | `/usuarios` | Gestión de cuentas (solo admin) |
| Landing CMS | `/landing` | Gestión de popup, servicios, cursos, galería y testimonios para la web pública |
| Landing API | `/api/landing/*` | Endpoints GET públicos para que el frontend de solcantero.com.ar consuma el CMS |

## Estructura de la Base de Datos

Hay dos dominios claramente separados: el **salón** (clientes, turnos, servicios, empleados) y el **módulo láser** (clientas_laser, sesiones_laser, zonas, combos). Las tablas `landing_*` pertenecen al CMS público.

### Dominio: Salón

**clientes** — personas que sacan turno en el salón
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| nombre | varchar(255) | nullable |
| apellido | varchar(255) | nullable |
| telefono | varchar(255) | nullable |
| email | varchar(255) | nullable |
| dia_cumple | smallint | nullable, 1–31 |
| mes_cumple | smallint | nullable, 1–12 |

**empleados** — empleadas del salón (también se vinculan a usuarios del sistema)
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| nombre | varchar(255) | nullable |
| apellido | varchar(255) | nullable |
| telefono | varchar(255) | nullable |
| email | varchar(255) | nullable |
| porcentaje_ganancia | double precision | nullable |
| activa | boolean | NOT NULL, default true |

**servicios_base** — catálogo de servicios disponibles
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| nombre | varchar(255) | nullable |
| categoria | varchar(255) | nullable |
| descripcion | varchar(255) | NOT NULL |
| precio | double precision | nullable |
| duracion_sugerida | integer | NOT NULL, default 30 (minutos) |

**turnos** — cada turno agendado en el salón
| Columna | Tipo | Notas |
|---|---|---|
| id | bigint | PK |
| id_cliente | integer | FK → clientes(id) CASCADE |
| id_servicio | integer | FK → servicios_base(id) CASCADE |
| id_empleado | integer | FK → empleados(id) CASCADE |
| fecha | date | NOT NULL |
| hora | time | NOT NULL |
| costo | double precision | nullable |
| estado | varchar(255) | nullable |
| duracion | integer | nullable (minutos) |
| monto_abonado | double precision | nullable |
| propina | numeric(10,2) | default 0 |
| porcentaje_ganancia | numeric(5,2) | NOT NULL, default 0 |

**servicios** — registro de servicios prestados (distinto del catálogo)
| Columna | Tipo | Notas |
|---|---|---|
| id | bigint | PK |
| id_cliente | integer | FK → clientes(id) CASCADE |
| id_empleado | integer | FK → empleados(id) CASCADE |
| fecha | date | NOT NULL |
| descripcion | varchar(255) | NOT NULL |
| monto | double precision | nullable |
| estado | varchar(255) | nullable |

**gastos** — gastos generales del salón
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| fecha | date | NOT NULL |
| descripcion | varchar(255) | NOT NULL |
| monto | numeric(12,2) | NOT NULL |
| categoria | varchar(100) | nullable |
| observaciones | text | nullable |
| created_at | timestamp | default now() |

**gastos_personales** — anticipos o gastos por empleada
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| id_empleado | integer | FK → empleados(id) |
| fecha | date | NOT NULL |
| descripcion | varchar(255) | NOT NULL |
| monto | numeric(10,2) | NOT NULL |
| categoria | varchar(100) | nullable |
| observaciones | text | nullable |
| created_at | timestamp | default now() |

**usuarios** — cuentas de acceso al sistema
| Columna | Tipo | Notas |
|---|---|---|
| id | bigint | PK |
| email | varchar(255) | UNIQUE |
| password | varchar(255) | bcrypt |
| rol | varchar(255) | `admin` o `empleada` |
| id_empleado | integer | FK → empleados(id), nullable |

**session** — sesiones Express persistidas en BD
| Columna | Tipo | Notas |
|---|---|---|
| sid | varchar | PK |
| sess | json | NOT NULL |
| expire | timestamp | NOT NULL, indexado |

---

### Dominio: Láser

Las clientas de láser son entidades separadas de los clientes del salón.

**clientas_laser** — pacientes del módulo de depilación
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| nombre | varchar(100) | NOT NULL |
| apellido | varchar(100) | NOT NULL, UNIQUE(nombre, apellido) |
| telefono | varchar(30) | NOT NULL |
| genero | char(1) | NOT NULL, default `F` |
| notas | text | nullable |
| created_at | timestamp | default now() |
| activa | boolean | default true |

**zonas_laser** — zonas corporales tratables
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| nombre | varchar(100) | NOT NULL |
| precio | numeric(10,2) | NOT NULL, default 0 |
| genero | char(1) | NOT NULL, default `F` |

**combos_laser** — paquetes de zonas con precio combinado
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| nombre | varchar(100) | NOT NULL |
| precio | numeric(10,2) | NOT NULL, default 0 |
| genero | char(1) | NOT NULL, default `F` |

**combo_zonas** — tabla pivote que relaciona combos con zonas
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| id_combo | integer | FK → combos_laser(id) CASCADE |
| id_zona | integer | FK → zonas_laser(id) CASCADE |

**dias_laser** — días hábiles para sesiones de láser
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| fecha | date | NOT NULL, UNIQUE |
| notas | text | nullable |
| created_at | timestamp | default now() |

**sesiones_laser** — cada visita de una clienta en un día de láser
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| id_dia | integer | FK → dias_laser(id) CASCADE |
| id_clienta | integer | FK → clientas_laser(id) |
| hora | time | nullable |
| costo_total | numeric(10,2) | NOT NULL, default 0 |
| monto_abonado | numeric(10,2) | NOT NULL, default 0 |
| estado | varchar(20) | NOT NULL, default `Pendiente` |
| notas | text | nullable |

**sesion_items** — detalle de zonas/combos tratados en una sesión
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| id_sesion | integer | FK → sesiones_laser(id) CASCADE |
| id_zona | integer | FK → zonas_laser(id), nullable |
| id_combo | integer | FK → combos_laser(id), nullable |
| numero_sesion | integer | NOT NULL, default 1 (nro de sesión del tratamiento) |

**tratamientos_laser** — plan de sesiones pautadas por clienta y zona
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| id_clienta | integer | FK → clientas_laser(id) CASCADE, UNIQUE(id_clienta, id_zona) |
| id_zona | integer | FK → zonas_laser(id) CASCADE |
| sesiones_pautadas | integer | NOT NULL, default 1 |

**gastos_laser** — gastos asociados a un día de láser
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| id_dia | integer | FK → dias_laser(id) CASCADE |
| descripcion | varchar(200) | NOT NULL |
| monto | numeric(10,2) | NOT NULL, default 0 |

---

### Dominio: Landing CMS

Todas estas tablas alimentan la web pública `solcantero.com.ar` vía `/api/landing/*`. Todas tienen campo `orden` (int) para ordenamiento manual y `activo` (bool) para togglear visibilidad, salvo `landing_popup` que usa `activo` sin `orden`.

**landing_servicios** — servicios mostrados en la landing
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| titulo | varchar(100) | NOT NULL |
| descripcion | text | nullable |
| orden | integer | NOT NULL, default 0 |
| activo | boolean | NOT NULL, default true |
| created_at | timestamptz | default now() |

**landing_servicios_imagenes** — imágenes asociadas a un servicio (1 a N)
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| servicio_id | integer | FK → landing_servicios(id) CASCADE |
| imagen_url | text | NOT NULL |
| orden | integer | NOT NULL, default 0 |

**landing_cursos** — cursos o formaciones ofrecidas
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| titulo | varchar(100) | NOT NULL |
| descripcion | text | nullable |
| imagen_url | text | nullable |
| imagen_url_fallback | text | nullable |
| orden | integer | NOT NULL, default 0 |
| activo | boolean | NOT NULL, default true |

**landing_galeria** — fotos de la galería
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| imagen_url | text | NOT NULL |
| imagen_url_fallback | text | nullable |
| alt_texto | varchar(150) | nullable |
| orden | integer | NOT NULL, default 0 |
| created_at | timestamptz | default now() |

**landing_testimonios** — reseñas de clientas
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| nombre | varchar(100) | NOT NULL |
| texto | text | NOT NULL |
| estrellas | integer | NOT NULL, default 5, CHECK 1–5 |
| foto_url | text | nullable |
| foto_url_fallback | text | nullable |
| activo | boolean | NOT NULL, default true |
| orden | integer | NOT NULL, default 0 |

**landing_popup** — popup promocional (tabla singleton, 1 fila)
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| activo | boolean | NOT NULL, default false |
| imagen_url | text | nullable |
| imagen_url_fallback | text | nullable |
| texto | text | nullable |
| updated_at | timestamptz | default now() |

---

### Dominio: Automatizaciones

**mensajes_pendientes** — cola de mensajes de WhatsApp por enviar (procesados por n8n u otro worker)
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| numero | text | NOT NULL |
| mensaje | text | NOT NULL |
| creado_at | timestamp | default now() |

**n8n_chat_histories** — historial de conversaciones del chatbot n8n
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| session_id | varchar(255) | NOT NULL |
| message | jsonb | NOT NULL |

---

### Relaciones entre tablas (resumen)

```
clientes ──< turnos >── servicios_base
clientes ──< servicios
empleados ──< turnos
empleados ──< servicios
empleados ──< gastos_personales
empleados ──< usuarios

clientas_laser ──< sesiones_laser >── dias_laser
clientas_laser ──< tratamientos_laser >── zonas_laser
sesiones_laser ──< sesion_items >── zonas_laser
sesiones_laser ──< sesion_items >── combos_laser
combos_laser ──< combo_zonas >── zonas_laser
dias_laser ──< gastos_laser

landing_servicios ──< landing_servicios_imagenes
```

## Decisiones de diseño relevantes

- **Sin ORM:** queries SQL puras para tener control total y evitar magia. Los modelos son funciones que devuelven rows.
- **SSR full:** no hay SPA ni cliente React. Todo se renderiza en servidor con EJS. El único JS de cliente es para alertas, tema, toasts y selectores.
- **Roles simples:** `admin` ve todo, `empleada` solo ve `/mi-panel`. El middleware `requireAdmin` bloquea el resto. Las empleadas se vinculan a usuarios via `id_empleado` en sesión.
- **Flash messages via sesión:** `req.session.flash` se setea antes del redirect y se consume en la vista siguiente. Sin librería externa.
- **Sistema de alertas con expiración en localStorage:** las alertas (turnos pendientes, cumpleaños, deuda total) se generan en servidor y se renderizan en cliente con `alertas.js`. El usuario puede ignorarlas; la ignorancia expira según tipo (cumpleaños: 24h, deuda: 4h).
- **Landing API con CORS restringido:** `/api/landing/*` tiene CORS abierto en dev y solo permite `solcantero.com.ar` en producción. El resto del sistema no expone APIs — es SSR puro.
- **Cloudinary para imágenes CMS:** las imágenes de landing se suben como buffer desde Multer (memoria) a Cloudinary. Los campos `imagen_url_fallback` permiten URL alternativa sin subida.
- **Cache de assets estáticos:** en producción, `src/public` se sirve con `maxAge: 7d`. Los JS/CSS críticos usan cache busting manual en las vistas (v3).
- **Láser como módulo paralelo:** las clientas de láser no son las mismas entidades que los clientes del salón. Tienen su propia tabla y flujo (días de trabajo, zonas, combos).

## Variables de entorno requeridas

```
PORT=3000
DATABASE_URL=           ← producción (Render)
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD  ← desarrollo local
SESSION_SECRET=
NODE_ENV=development|production
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Estado actual

**En producción y funcionando:**
- Agenda, clientes, servicios, empleados, turnos
- Reportes financieros (mensual, por rango, anual comparativo)
- Mi Panel (vista empleada con métricas semanales y mensuales)
- Sistema de alertas en header (turnos pendientes, deudas, cumpleaños)
- Módulo Láser completo (días, clientas, zonas, combos, catálogo, exportación Excel)
- CMS Landing completo: popup, servicios con múltiples imágenes, cursos, galería, testimonios
- API pública `/api/landing/*` para consumo desde `solcantero.com.ar`

**Pendiente / sin definir:**
- Bitácora y roadmap vacíos — no hay tareas activas registradas al día de hoy
- La carpeta `front/` existe pero está vacía (posiblemente reservada para futura SPA o assets separados)
- Confirmar si la tabla `servicios` todavía se usa en el código o es remanente de una versión anterior — `turnos` referencia `servicios_base`, no `servicios`; revisar si algún modelo/controller la consulta o si se puede deprecar

## Convenciones del proyecto

- **Logging:** siempre `logger.error("modulo.accion.failed", { error: error.message })`. Nunca `console.log`.
- **Flash:** `req.session.flash = { tipo: "success"|"error"|"warning", mensaje: "..." }` antes de redirect. La vista lo lee y borra con `delete req.session.flash`.
- **Nombres de rutas:** kebab-case, en español (ej: `/nueva-clienta`, `/mi-panel`).
- **Nombres de vistas:** carpeta por módulo, archivos `index.ejs`, `nuevo.ejs`, `editar.ejs`, `perfil.ejs`, etc.
- **Modelos:** funciones puras exportadas, sin clase. Siempre `async/await` con el pool directo.
- **Controllers:** siempre `try/catch`. En catch: loguear y devolver 500 o redirigir con flash.
- **`method-override`:** los forms HTML usan `?_method=PUT` o `?_method=DELETE` para simular PUT/DELETE.
- **`activo` en booleanos de formulario:** `activo === "on"` (viene como string del checkbox HTML).
- **Orden en tablas CMS:** campo `orden` numérico + `id ASC` como desempate, en todas las tablas de landing.
