# CONTEXT.md — Sol Admin
_Última actualización: 2026-08-04_

## Qué es esto
Sistema de gestión web para un salón de estética (Sol Cantero). Cubre agenda, clientes, servicios, empleadas, reportes financieros, depilación láser y un CMS para la landing pública. Está en producción en `admin.solcantero.com.ar` con una clienta activa.

## Stack
- **Backend:** Node.js + Express 5 (SSR con EJS)
- **Base de datos:** PostgreSQL — conexión via `pg` (pool), sesiones persistidas en tabla `session` (connect-pg-simple)
- **Vistas:** EJS con partials reutilizables (head, header, sidebar, footer)
- **Estilos:** CSS puro con variables custom, sin frameworks. Dark mode soportado via `theme.js`
- **UI select avanzado:** Tom Select (dark mode integrado)
- **Imágenes:** Cloudinary para subida/eliminación de assets del CMS landing y de la foto de perfil de usuarios
- **Excel:** ExcelJS para importar/exportar clientes y servicios en `.xlsx`
- **Push:** web-push (VAPID) para notificaciones push del navegador; cada envío se persiste en tabla `notificaciones`
- **Asistente de voz/texto:** Gemini Live (`@google/genai`, modelo `gemini-3.1-flash-live-preview`) vía `geminiTools`. Identifica si habla con Sol o con Mari al arrancar la conversación. Disponible como página completa (`/asistente`) y como mini-chat flotante en todas las vistas admin, con historial persistido en BD (tabla `asistente_mensajes`)
- **Logging:** Winston (estructurado, con niveles info/warn/error y contexto por operación)
- **Seguridad:** Helmet, express-rate-limit (en login), bcrypt, express-session (httpOnly, secure en prod, sameSite strict, 8h)
- **Deploy:** Render (backend + PostgreSQL). En prod usa `DATABASE_URL` con SSL.
- **Login con Google (`google-auth-library`):** solo para el backend de fidelización en la rama `fidelizacion` (ver Estado actual) — no está en `main` todavía.
- **Email transaccional (`resend`):** solo para el backend de fidelización en la rama `fidelizacion` — envío del mail de reseteo de contraseña. No está en `main` todavía.

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
    │   ├── reporteHelpers.js ← calcularDatosDashboard, calcularDatosReportes (reutilizado por dashboard, reportes por rango y reporte anual mes a mes)
    │   ├── turnoHelpers.js
    │   ├── pushHelper.js     ← enviarPush / enviarPushATodas (web-push + persiste en notificaciones)
    │   ├── geminiTools/      ← herramientas y system prompt del asistente Gemini
    │   └── logger.js
    ├── views/                ← plantillas EJS por módulo
    └── public/
        ├── css/styles.css
        └── js/
            ├── alertas.js         ← sistema de notificaciones con localStorage (solo admin); reporta su conteo a `window.notifCounts.alertas`, ya no dibuja su propio badge
            ├── misNotificaciones.js ← campanita de notificaciones propias (todos los roles), pagina con "Cargar más" (offset de a 20); reporta a `window.notifCounts.mias`
            ├── notificaciones.js  ← (nuevo) lógica compartida del dropdown único de campanitas: toggle y badge combinado (`window.actualizarBadgeNotificaciones`) sumando alertas + mías
            ├── cuenta.js          ← (nuevo) toggle del dropdown de cuenta (avatar en el header)
            ├── push.js            ← suscripción push del navegador
            ├── asistenteCore.js   ← (nuevo) factory `crearAsistenteChat(elementos)` con toda la lógica del asistente (conexión Gemini Live, audio, tool-calling, historial); instanciado tanto por la página completa como por el widget
            ├── asistenteWidget.js ← (nuevo) instancia `asistenteCore` para el mini-chat flotante del footer
            ├── theme.js
            └── toast.js
```

MVC clásico. No hay ORM: todos los modelos hacen SQL directo con el pool de `pg`. Las transacciones (BEGIN/COMMIT/ROLLBACK) se hacen con `pool.connect()` cuando la operación afecta múltiples tablas.

> Nota: en la rama `fidelizacion` (no mergeada, ver Estado actual) se agregaron `back/src/utils/fidelidadHelper.js` (matching por teléfono, otorgamiento de sellos, sorteo de premios), `back/src/utils/emailHelper.js` (envío de mail transaccional con Resend, usado para el reseteo de contraseña), `back/src/api/middlewares/clientaMiddleware.js` (auth por token bearer para clientas) y los modelos/controllers/rutas/vista de `fidelidad*` y `landingCuenta*`. No están reflejados en el árbol de arriba porque todavía no están en `main`.

## Módulos principales

| Módulo | Ruta | Descripción |
|---|---|---|
| Dashboard | `/admin` | Solo admin. KPIs del negocio + alertas. "Total cobrado" desglosa Efectivo/Transferencia |
| Agenda | `/agenda` | Grilla diaria por empleada (8:00–20:00, bloques de 30min) |
| Clientes | `/clientes` | CRUD + historial de turnos + import/export Excel |
| Servicios | `/servicios` | Catálogo base con precio y duración sugerida |
| Empleados | `/empleados` | Perfil con % ganancia configurable |
| Turnos | `/turnos` | Creación/edición desde agenda |
| Reportes | `/reportes` | Financiero por rango de fechas + anual comparativo |
| Mi Panel | `/mi-panel` | Vista de empleada: sus turnos y métricas (semana/mes) |
| Mi Perfil | `/mi-perfil` | Cualquier usuario logueado: foto propia (Cloudinary), título/cargo editable, cambio de contraseña propia con verificación de la actual |
| Notificaciones | `/notificaciones/mias` (JSON) | Campanita en el header (unificada con las alertas de admin en un solo dropdown): historial de push recibidas + contador de no leídas, paginado con "Cargar más" |
| Asistente | `/asistente` (página completa, solo admin) + widget flotante en toda la UI admin | Chat de voz/texto/imagen con Gemini Live. Historial persistido en BD, se recarga como contexto al reconectar |
| Láser | `/laser` | Módulo separado para depilación láser: clientas, días, zonas, combos, catálogo |
| Usuarios | `/usuarios` | Gestión de cuentas (solo admin, accesible desde el dropdown de cuenta) |
| Landing CMS | `/landing` | Gestión de popup, servicios, cursos, galería y testimonios para la web pública |
| Landing API | `/api/landing/*` | Endpoints GET públicos para que el frontend de solcantero.com.ar consuma el CMS |
| **Fidelización (admin)** ⚠️ | `/fidelidad/pendientes` | **NO en producción — vive en la rama `fidelizacion`, ver Estado actual.** Cola de revisión manual de cuentas que no se pudieron vincular solas a una fila de `clientes`: vincular a clienta existente, crear clienta nueva, o rechazar |
| **Fidelización API** ⚠️ | `/api/fidelidad/*` | **NO en producción — rama `fidelizacion`.** Login con Google, registro y login manual con email+contraseña, reseteo de contraseña por mail, carga de teléfono, progreso de sellos, girar ruleta de premio, historial de turnos (sin montos). Consumida por el repo `landingPageSol` (rama `fidelizacion-front`), CORS restringido igual que `/api/landing` |

## Estructura de la Base de Datos

Hay dos dominios claramente separados: el **salón** (clientes, turnos, servicios, empleados) y el **módulo láser** (clientas_laser, sesiones_laser, zonas, combos). Las tablas `landing_*` pertenecen al CMS público y al portal de fidelización.

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
| foto_url | text | nullable — foto de perfil propia (Cloudinary), sin foto se muestra la inicial del nombre |
| titulo | varchar(50) | nullable — cargo/título editable por el propio usuario (ej. "Lashista"); reemplaza la etiqueta genérica "Empleada"/"Administrador" en el sidebar cuando está cargado |

**notificaciones** — historial de notificaciones push recibidas por cada usuario
| Columna | Tipo | Notas |
|---|---|---|
| id | integer | PK |
| id_usuario | integer | FK → usuarios(id) CASCADE |
| titulo | varchar(255) | NOT NULL |
| cuerpo | text | nullable |
| url | text | nullable |
| leida | boolean | NOT NULL, default false |
| created_at | timestamptz | default now(), indexado junto a id_usuario |

**asistente_mensajes** — historial de conversación del asistente Gemini, por usuario (tabla nueva, migración 010, ya corrida en producción)
| Columna | Tipo | Notas |
|---|---|---|
| id | serial | PK |
| id_usuario | integer | FK → usuarios(id) CASCADE, NOT NULL |
| rol | varchar(10) | NOT NULL, CHECK IN (`sol`, `asistente`) |
| texto | text | NOT NULL |
| created_at | timestamp | NOT NULL, default now(), indexado junto a id_usuario |

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

### Dominio: Fidelización (rama `fidelizacion` — NO mergeada a main, NO en producción)

Migración `back/migrations/011_crear_fidelizacion.sql`, ya corrida en la base local, pendiente de correr en producción cuando se mergee. Como la rama todavía no está mergeada, esta migración se sigue editando directamente en vez de sumar una migración nueva cada vez (fue el caso al agregar el login manual con email+contraseña). Ver "Estado actual" para el contexto completo de por qué esto no está mezclado con el resto de las tablas en producción.

**landing_cuentas** — cuentas de clientas de la landing pública, con login por Google y/o por email+contraseña, vinculadas (o no) a una fila existente de `clientes`
| Columna | Tipo | Notas |
|---|---|---|
| id | serial | PK |
| google_sub | varchar(255) | nullable, UNIQUE — id estable que devuelve Google, solo se completa si la cuenta usa login con Google |
| password_hash | varchar(255) | nullable, bcrypt — solo se completa si la cuenta usa login manual (email+contraseña) |
| email | varchar(255) | NOT NULL, UNIQUE |
| nombre | varchar(255) | nullable — antes se llamaba `nombre_google`; se renombró porque ya no viene forzosamente de Google, también se carga en el registro manual |
| telefono_ingresado | varchar(50) | nullable |
| id_cliente | integer | FK → clientes(id), nullable, sin CASCADE |
| estado_vinculacion | varchar(20) | NOT NULL, default `pendiente`, CHECK IN (`pendiente`, `auto`, `manual`, `rechazada`) |
| token_sesion | varchar(64) | nullable — token bearer propio de la clienta, no usa `express-session` |
| token_expira_at | timestamptz | nullable |
| reset_token | varchar(64) | nullable — token de un solo uso para resetear contraseña |
| reset_token_expira | timestamptz | nullable — vence 1 hora después de generado |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

CHECK(`google_sub IS NOT NULL OR password_hash IS NOT NULL`) en `landing_cuentas` — toda cuenta tiene que tener al menos un método de autenticación.

**fidelidad_sellos** — un sello por turno que pasó a estado "Pagado"
| Columna | Tipo | Notas |
|---|---|---|
| id | serial | PK |
| id_cuenta | integer | FK → landing_cuentas(id) CASCADE, NOT NULL |
| id_turno | integer | FK → turnos(id) CASCADE, NOT NULL, UNIQUE — evita duplicar el sello si el turno se edita más de una vez estando Pagado |
| numero_sello | integer | NOT NULL — posición 1–10 dentro del ciclo |
| ciclo | integer | NOT NULL, default 1 — rollover automático al completar 10 sellos |
| created_at | timestamptz | default now() |

**fidelidad_premios** — premio pendiente de "girar", generado en el sello 5 y el 10 de cada ciclo
| Columna | Tipo | Notas |
|---|---|---|
| id | serial | PK |
| id_cuenta | integer | FK → landing_cuentas(id) CASCADE, NOT NULL |
| ciclo | integer | NOT NULL |
| sello_numero | integer | NOT NULL, CHECK IN (5, 10) |
| tipo_premio | varchar(50) | nullable — se completa recién cuando la clienta gira la ruleta |
| descripcion | varchar(255) | nullable |
| redimido | boolean | NOT NULL, default false |
| redimido_en | timestamptz | nullable |
| created_at | timestamptz | default now() |

UNIQUE(id_cuenta, ciclo, sello_numero) en `fidelidad_premios` — evita duplicar el premio del mismo hito.

---

### Relaciones entre tablas (resumen)

```
clientes ──< turnos >── servicios_base
clientes ──< servicios
empleados ──< turnos
empleados ──< servicios
empleados ──< gastos_personales
empleados ──< usuarios
usuarios ──< notificaciones
usuarios ──< asistente_mensajes

clientas_laser ──< sesiones_laser >── dias_laser
clientas_laser ──< tratamientos_laser >── zonas_laser
sesiones_laser ──< sesion_items >── zonas_laser
sesiones_laser ──< sesion_items >── combos_laser
combos_laser ──< combo_zonas >── zonas_laser
dias_laser ──< gastos_laser

landing_servicios ──< landing_servicios_imagenes

# rama `fidelizacion` (no mergeada):
clientes ──< landing_cuentas
landing_cuentas ──< fidelidad_sellos >── turnos
landing_cuentas ──< fidelidad_premios
```

## Decisiones de diseño relevantes

- **Sin ORM:** queries SQL puras para tener control total y evitar magia. Los modelos son funciones que devuelven rows.
- **SSR full:** no hay SPA ni cliente React. Todo se renderiza en servidor con EJS. El único JS de cliente es para alertas, tema, toasts, selectores y el chat del asistente.
- **Roles simples:** `admin` ve todo, `empleada` solo ve `/mi-panel`. El middleware `requireAdmin` bloquea el resto. Las empleadas se vinculan a usuarios via `id_empleado` en sesión.
- **Flash messages via sesión:** `req.session.flash` se setea antes del redirect y se consume en la vista siguiente. Sin librería externa.
- **Sistema de alertas con expiración en localStorage:** las alertas (turnos pendientes, cumpleaños, deuda total) se generan en servidor y se renderizan en cliente con `alertas.js`. Solo las ve el admin. El usuario puede ignorarlas; la ignorancia expira según tipo (cumpleaños: 24h, deuda: 4h).
- **Notificaciones propias vs. alertas del admin — dos fuentes de datos distintas, un solo dropdown en UI:** `alertas.js` (solo admin, localStorage, sin persistencia en BD) sigue existiendo para KPIs del negocio; la campanita de notificaciones propias (`misNotificaciones.js`, tabla `notificaciones`) es para *cualquier* usuario y persiste en BD el historial de cada push enviado por `pushHelper.enviarPushATodas`. Antes eran dos botones 🔔 separados en el header; ahora comparten un único botón/dropdown (`#notificaciones-btn`) con dos secciones internas y un badge combinado, coordinado por `notificaciones.js` vía `window.notifCounts` — cada script sigue siendo dueño de su propio dato, solo se unificó la presentación.
- **Landing API con CORS restringido:** `/api/landing/*` tiene CORS abierto en dev y solo permite `solcantero.com.ar` en producción. El resto del sistema no expone APIs — es SSR puro (las excepciones JSON son `/notificaciones/mias`, los endpoints de `/asistente`, y — en la rama `fidelizacion`, no mergeada — `/api/fidelidad/*`).
- **Cloudinary para imágenes CMS y de perfil:** las imágenes de landing y la foto de perfil de usuarios se suben como buffer desde Multer (memoria) a Cloudinary. Los campos `imagen_url_fallback` (landing) permiten URL alternativa sin subida.
- **Cambio de contraseña propia con verificación:** `/mi-perfil/password` exige la contraseña actual (bcrypt.compare) antes de permitir setear una nueva, distinto del reseteo que puede hacer un admin desde `/usuarios` sin esa verificación.
- **Cache de assets estáticos:** en producción, `src/public` se sirve con `maxAge: 7d`. Los JS/CSS críticos usan cache busting manual (`?v=N`) en las vistas; hay que bumpear la versión a mano cada vez que se toca el contenido de uno de esos archivos, si no el navegador sirve la versión vieja cacheada hasta 7 días.
- **Láser como módulo paralelo:** las clientas de láser no son las mismas entidades que los clientes del salón. Tienen su propia tabla y flujo (días de trabajo, zonas, combos).
- **Asistente identifica interlocutor al arrancar:** el system prompt de Gemini obliga a preguntar "¿Hablo con Sol o con Mari?" antes de cualquier otra cosa en cada conversación nueva, y a dirigirse por ese nombre el resto del intercambio — no hay autenticación real del lado del asistente, es solo para personalizar el trato entre la dueña y la secretaria.
- **Resolución de nombres del asistente: clientas por substring, empleadas por roster completo.** Para clientas/servicios el prompt le dice al modelo que pruebe primero literal lo que dijo Sol (las queries ya hacen `LIKE` parcial). Para empleadas la heurística es distinta: Sol siempre usa apodos que no necesariamente son substring ni diminutivo obvio del nombre real (ej. "Mili" no es forzosamente por "Milagros"). El prompt le prohíbe al modelo inventar el "nombre formal" de un apodo — lo obliga a traer primero el roster completo con `consultarEmpleados` sin filtro y comparar el apodo contra los nombres reales tal como están escritos, preguntando a Sol si hay ambigüedad. Esto se sumó a un fix de fondo en `empleadoModel.searchEmpleados`, que no buscaba por `CONCAT(nombre, ' ', apellido)` y por eso fallaba con nombre completo (igual que ya hacía `clienteModel.searchClientes`).
- **Contexto del asistente persistido vía `sendClientContent`, no `sessionResumption`:** el sistema es SSR sin SPA, así que cada navegación entre páginas pierde la conexión Live activa (WebSocket) con Gemini. En vez de intentar retomar la sesión de audio en vivo (`sessionResumption`, que requeriría mantener el handle de sesión vivo entre cargas de página), el historial de la conversación se persiste en la tabla `asistente_mensajes` y, al reconectar, se reinyecta como contexto inicial con `session.sendClientContent({ turns: [...], turnComplete: false })` antes de que Sol diga nada. Es más simple de sostener en una arquitectura sin estado de cliente persistente, a costa de no retomar el audio literal, solo el texto transcripto de la charla.
- **`asistenteCore.js` como factory reusable:** la lógica completa del asistente (conexión Gemini Live, captura/reproducción de audio, envío de imágenes, tool-calling, historial) vive en una función `crearAsistenteChat(elementos)` que recibe los IDs del DOM como parámetros. Así se instancia igual tanto en la página completa `/asistente` como en el widget flotante del footer, sin duplicar lógica — solo cambian los elementos del DOM que se le pasan.
- **Fidelización: token bearer propio en vez de cookies de sesión (rama `fidelizacion`, no mergeada).** La landing de clientas (repo aparte, `landingPageSol`) consume la API cross-origin, así que `landing_cuentas` tiene su propio `token_sesion`/`token_expira_at` validado por el middleware `requireClienta` — totalmente separado de `express-session`, que sigue siendo el único mecanismo de auth para todo el resto del sistema (admin/empleadas).
- **Matching cliente-cuenta por últimos 8 dígitos del teléfono, con desambiguación por nombre (rama `fidelizacion`).** `fidelidadHelper.resolverVinculacion` normaliza el teléfono ingresado en la landing a los últimos 8 dígitos y busca coincidencias en `clientes`. Si hay una sola, vincula automático (`estado_vinculacion = auto`); si hay varias, intenta desambiguar comparando el nombre de la cuenta contra `nombre`/`apellido` de cada candidata antes de dejarla en la cola de revisión manual (`pendiente`). Con datos reales se confirmó que hay colisiones genuinas de teléfono en `clientes` — algunas son clientas distintas que comparten número (ej. de familia), otras son filas duplicadas de la misma persona — así que la cola de `/fidelidad/pendientes` va a tener movimiento regular, no es un caso raro que se pueda ignorar.
- **Otorgamiento de sellos idempotente, enganchado en 4 lugares (rama `fidelizacion`).** Cualquier turno que pase a "Pagado" (sin haberlo estado antes) dispara un sello, ya sea por la UI de agenda (`agendaController`), la edición de turno (`turnoController`), o el asistente de voz al crear/editar (`geminiTools/turnos.js`). La idempotencia la garantiza `UNIQUE(id_turno)` en `fidelidad_sellos` con `ON CONFLICT DO NOTHING`, así que editar el mismo turno varias veces estando Pagado no duplica sellos. Nunca rompe el flujo principal de turnos: los 4 call-sites envuelven la llamada en su propio try/catch y solo loguean si falla.
- **Historial de turnos para clientas expone solo fecha/servicio/empleada, nunca montos (rama `fidelizacion`).** `turnoModel.getHistorialParaClienta` selecciona explícitamente esas columnas — a propósito no trae `costo`/`monto_abonado`/`propina`, ese dato es exclusivo del lado admin.
- **Login con Google verificado server-side, degrada a 503 controlado (rama `fidelizacion`).** `login-google` usa `google-auth-library` para verificar el ID token contra `GOOGLE_CLIENT_ID`. Si esa variable no está seteada, el endpoint responde 503 en vez de romper — mismo patrón que ya existe para `GEMINI_API_KEY` con el asistente. `GOOGLE_CLIENT_ID` ya está configurada en local y en Render.
- **Login dual — Google o email+contraseña, nunca ninguno de los dos exigido a la fuerza (rama `fidelizacion`).** `landing_cuentas.google_sub` y `password_hash` son ambos nullable, con un CHECK que exige al menos uno de los dos. Se eligió así porque no todas las clientas quieren loguearse con una cuenta de Google, y exigir una sola vía habría bajado la conversión de registro. `loginEmail` distingue: si el email pertenece a una cuenta sin `password_hash` (o sea, 100% Google), devuelve un mensaje específico ("iniciá sesión con ese botón") en vez del genérico "email o contraseña incorrectos", para no confundir a la clienta.
- **Registro manual resuelve el teléfono en el mismo paso; el flujo de Google lo pide después (rama `fidelizacion`).** `loginGoogle` crea la cuenta solo con lo que trae el token (sub, email, nombre) y recién pide el teléfono en un segundo request (`ingresarTelefono`) porque Google no lo provee. `registro`, en cambio, ya tiene el teléfono como campo obligatorio del formulario de alta, así que resuelve la vinculación (`fidelidadHelper.resolverVinculacion`) en el mismo request — un paso menos para la clienta, reusando la misma función de matching que ya usaba el flujo de Google en vez de duplicar la lógica.
- **Reseteo de contraseña sin filtrar qué emails están registrados, mismo patrón defensivo de `emailHelper` que Google/Gemini (rama `fidelizacion`).** `olvidePassword` siempre responde 200 con el mismo mensaje genérico, exista o no la cuenta con ese email — así no se puede usar el endpoint para enumerar clientas registradas. El token de reset (`reset_token`/`reset_token_expira`) vence en 1 hora y es de un solo uso. `emailHelper.js` solo instancia el cliente de Resend si `RESEND_API_KEY` está seteada; si falta, loguea error y no rompe el flujo (la respuesta genérica se manda igual). La plantilla del mail es HTML con estilos inline (tabla, sin flexbox/grid) para que se vea bien en Outlook, con los colores calcados de `tailwind.config.js` de `landingPageSol` (charcoal, gold, cream), más un fallback de texto plano.

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
VAPID_PUBLIC_KEY=       ← push notifications (web-push)
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
GEMINI_API_KEY=         ← asistente Gemini Live; si falta, /asistente/token responde 503 y el asistente queda deshabilitado (el resto del sistema sigue funcionando)
GOOGLE_CLIENT_ID=       ← YA CONFIGURADA en local Y en Render (producción). Login con Google en la rama `fidelizacion` operativo en ambos entornos.
RESEND_API_KEY=         ← YA CONFIGURADA en local Y en Render — envío real de mail de reseteo de contraseña vía Resend
RESEND_FROM=            ← YA CONFIGURADA en local Y en Render — remitente con dominio verificado `solcantero.com.ar`
RESEND_REPLY_TO=        ← YA CONFIGURADA en local Y en Render — a dónde llegan las respuestas si una clienta contesta el mail de reset
FRONTEND_URL=           ← YA CONFIGURADA — usada para armar el link del mail de reset (`{FRONTEND_URL}/mi-fidelidad/resetear?token=...`)
```

## Estado actual

**En producción y funcionando:**
- Agenda, clientes, servicios, empleados, turnos
- Reportes financieros (mensual, por rango, anual comparativo — el anual reutiliza `calcularDatosReportes` mes a mes en vez de duplicar cálculos)
- Dashboard con desglose Efectivo/Transferencia dentro de "Total cobrado"
- Mi Panel (vista empleada con métricas semanales y mensuales, ahora con header foto+nombre)
- Mi Perfil (`/mi-perfil`): foto propia, título/cargo editable, cambio de contraseña propia
- Header con avatar + dropdown de cuenta (Mi Perfil para todos; Usuarios y Empleados solo admin; Cerrar sesión), reemplaza el botón de logout de texto
- Sidebar reorganizado: "Lifting" y "Extensiones" agrupados en un desplegable "💅 Lashista"; Empleados y Usuarios se movieron al dropdown de cuenta
- Campanita de notificaciones unificada en el header: un solo botón/dropdown con sección "Alertas" (solo admin, KPIs del negocio en localStorage) y sección "Mis notificaciones" (todos, historial persistido en tabla `notificaciones`), badge combinado, paginado con "Cargar más" de a 20
- Botón "Activar notificaciones" push que se auto-oculta si el dispositivo ya está suscripto
- Módulo Láser completo (días, clientas, zonas, combos, catálogo, exportación Excel)
- CMS Landing completo: popup, servicios con múltiples imágenes, cursos, galería, testimonios
- API pública `/api/landing/*` para consumo desde `solcantero.com.ar`
- Asistente de voz/texto (Gemini Live): identifica si habla con Sol o con Mari al empezar y se dirige por su nombre el resto de la charla; busca clientas/servicios por nombres cortos sin pedir apellido de entrada; para empleadas resuelve apodos comparando contra el roster completo (`consultarEmpleados`) en vez de asumir diminutivos
- Mini-chat flotante del asistente (burbuja 💗 + panel tipo WhatsApp) disponible en casi todas las vistas admin (excepto login y la página completa `/asistente`), con historial de conversación persistido en tabla `asistente_mensajes` y reinyectado como contexto al reconectar; botón para vaciar el chat
- Fix de overflow horizontal en la fila de tabs en mobile (se aplica en toda la UI, no solo en un módulo)

**En desarrollo — rama `fidelizacion` (⚠️ NO mergeada a main, ⚠️ NO desplegada a producción):**
- Backend completo del sistema de fidelización de clientas: login con Google o registro/login manual con email+contraseña desde una landing separada, vinculación automática o manual (cola de revisión) a la fila existente en `clientes` por teléfono, sellos por turno pagado (tarjeta de 10 con rollover de ciclo), premio pendiente de girar en el sello 5 y el 10 (sorteo ponderado), vista admin `/fidelidad/pendientes` integrada a la campanita de alertas
- Login/registro manual con email+contraseña (bcrypt) sumado al login con Google ya existente, con reseteo de contraseña por mail (token de un solo uso, vence en 1 hora, envío vía Resend con plantilla HTML con identidad de marca)
- Validado end-to-end con curl real en esta sesión: registro con vinculación automática por teléfono, login correcto e incorrecto, login contra una cuenta de Google (mensaje específico), flujo completo de reset de contraseña (token real, contraseña vieja invalidada, nueva funcionando, token de un solo uso), y envío real del mail de reset con Resend (llegó con la plantilla estilizada)
- PR abierto, todavía sin mergear: https://github.com/DepaoloJuan/Sol---Admin/pull/new/fidelizacion
- `GOOGLE_CLIENT_ID` y las 3 variables de Resend (`RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`) ya están configuradas en local Y en Render — sin prerequisitos externos pendientes para mergear la rama `fidelizacion`.
- Migración `011_crear_fidelizacion.sql` (editada directamente varias veces porque la rama no está mergeada, la más reciente sumó `fecha_inicio`, servicios habilitados, reglas por ciclo) ya corrida y verificada tanto en la base local como en Neon (la base de datos real de producción, corrida manualmente por Juanma antes de mergear) — no queda pendiente ningún paso de DB para cuando se mergee la rama
- La contraparte de frontend (login, registro, reseteo, tarjeta de sellos, ruleta de premios) vive en otro repo, `landingPageSol`, rama `fidelizacion-front` — no se tocó nada de ese repo desde acá
- Importante: no confundir con los módulos de "En producción y funcionando" de arriba — nada de esto está corriendo para clientas reales todavía

**Pendiente / sin definir:**
- Bitácora y roadmap vacíos — no hay tareas activas registradas al día de hoy fuera de lo que ya está en la rama `fidelizacion`
- La carpeta `front/` existe pero está vacía (posiblemente reservada para futura SPA o assets separados)
- Confirmar si la tabla `servicios` todavía se usa en el código o es remanente de una versión anterior — `turnos` referencia `servicios_base`, no `servicios`; revisar si algún modelo/controller la consulta o si se puede deprecar
- `docs/ai/db_schema_dump.sql` todavía no incluye la tabla `asistente_mensajes` ni las tablas de fidelización (`landing_cuentas`, `fidelidad_sellos`, `fidelidad_premios`) — dump manual desde pgAdmin, no se regeneró después de correr la migración 010 ni la 011. La estructura documentada acá para esas tablas sale de las migraciones SQL directamente; conviene refrescar el dump la próxima vez que se actualice a mano

## Convenciones del proyecto

- **Logging:** siempre `logger.error("modulo.accion.failed", { error: error.message })`. Nunca `console.log`.
- **Flash:** `req.session.flash = { tipo: "success"|"error"|"warning", mensaje: "..." }` antes de redirect. La vista lo lee y borra con `delete req.session.flash`.
- **Nombres de rutas:** kebab-case, en español (ej: `/nueva-clienta`, `/mi-panel`, `/mi-perfil`).
- **Nombres de vistas:** carpeta por módulo, archivos `index.ejs`, `nuevo.ejs`, `editar.ejs`, `perfil.ejs`, etc.
- **Modelos:** funciones puras exportadas, sin clase. Siempre `async/await` con el pool directo.
- **Controllers:** siempre `try/catch`. En catch: loguear y devolver 500 o redirigir con flash.
- **`method-override`:** los forms HTML usan `?_method=PUT` o `?_method=DELETE` para simular PUT/DELETE.
- **`activo` en booleanos de formulario:** `activo === "on"` (viene como string del checkbox HTML).
- **Orden en tablas CMS:** campo `orden` numérico + `id ASC` como desempate, en todas las tablas de landing.
- **JS de cliente compartido entre vistas:** cuando una misma pieza de UI (ej. el chat del asistente) se necesita en más de un lugar, se extrae a una factory que recibe los IDs del DOM por parámetro (patrón `asistenteCore.js`) en vez de duplicar el archivo.
