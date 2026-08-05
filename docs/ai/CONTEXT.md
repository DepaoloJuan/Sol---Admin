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
usuarios ──< notificaciones
usuarios ──< asistente_mensajes

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
- **SSR full:** no hay SPA ni cliente React. Todo se renderiza en servidor con EJS. El único JS de cliente es para alertas, tema, toasts, selectores y el chat del asistente.
- **Roles simples:** `admin` ve todo, `empleada` solo ve `/mi-panel`. El middleware `requireAdmin` bloquea el resto. Las empleadas se vinculan a usuarios via `id_empleado` en sesión.
- **Flash messages via sesión:** `req.session.flash` se setea antes del redirect y se consume en la vista siguiente. Sin librería externa.
- **Sistema de alertas con expiración en localStorage:** las alertas (turnos pendientes, cumpleaños, deuda total) se generan en servidor y se renderizan en cliente con `alertas.js`. Solo las ve el admin. El usuario puede ignorarlas; la ignorancia expira según tipo (cumpleaños: 24h, deuda: 4h).
- **Notificaciones propias vs. alertas del admin — dos fuentes de datos distintas, un solo dropdown en UI:** `alertas.js` (solo admin, localStorage, sin persistencia en BD) sigue existiendo para KPIs del negocio; la campanita de notificaciones propias (`misNotificaciones.js`, tabla `notificaciones`) es para *cualquier* usuario y persiste en BD el historial de cada push enviado por `pushHelper.enviarPushATodas`. Antes eran dos botones 🔔 separados en el header; ahora comparten un único botón/dropdown (`#notificaciones-btn`) con dos secciones internas y un badge combinado, coordinado por `notificaciones.js` vía `window.notifCounts` — cada script sigue siendo dueño de su propio dato, solo se unificó la presentación.
- **Landing API con CORS restringido:** `/api/landing/*` tiene CORS abierto en dev y solo permite `solcantero.com.ar` en producción. El resto del sistema no expone APIs — es SSR puro (las excepciones JSON son `/notificaciones/mias` y los endpoints de `/asistente`, consumidos por el propio front SSR vía fetch).
- **Cloudinary para imágenes CMS y de perfil:** las imágenes de landing y la foto de perfil de usuarios se suben como buffer desde Multer (memoria) a Cloudinary. Los campos `imagen_url_fallback` (landing) permiten URL alternativa sin subida.
- **Cambio de contraseña propia con verificación:** `/mi-perfil/password` exige la contraseña actual (bcrypt.compare) antes de permitir setear una nueva, distinto del reseteo que puede hacer un admin desde `/usuarios` sin esa verificación.
- **Cache de assets estáticos:** en producción, `src/public` se sirve con `maxAge: 7d`. Los JS/CSS críticos usan cache busting manual (`?v=N`) en las vistas; hay que bumpear la versión a mano cada vez que se toca el contenido de uno de esos archivos, si no el navegador sirve la versión vieja cacheada hasta 7 días.
- **Láser como módulo paralelo:** las clientas de láser no son las mismas entidades que los clientes del salón. Tienen su propia tabla y flujo (días de trabajo, zonas, combos).
- **Asistente identifica interlocutor al arrancar:** el system prompt de Gemini obliga a preguntar "¿Hablo con Sol o con Mari?" antes de cualquier otra cosa en cada conversación nueva, y a dirigirse por ese nombre el resto del intercambio — no hay autenticación real del lado del asistente, es solo para personalizar el trato entre la dueña y la secretaria.
- **Resolución de nombres del asistente: clientas por substring, empleadas por roster completo.** Para clientas/servicios el prompt le dice al modelo que pruebe primero literal lo que dijo Sol (las queries ya hacen `LIKE` parcial). Para empleadas la heurística es distinta: Sol siempre usa apodos que no necesariamente son substring ni diminutivo obvio del nombre real (ej. "Mili" no es forzosamente por "Milagros"). El prompt le prohíbe al modelo inventar el "nombre formal" de un apodo — lo obliga a traer primero el roster completo con `consultarEmpleados` sin filtro y comparar el apodo contra los nombres reales tal como están escritos, preguntando a Sol si hay ambigüedad. Esto se sumó a un fix de fondo en `empleadoModel.searchEmpleados`, que no buscaba por `CONCAT(nombre, ' ', apellido)` y por eso fallaba con nombre completo (igual que ya hacía `clienteModel.searchClientes`).
- **Contexto del asistente persistido vía `sendClientContent`, no `sessionResumption`:** el sistema es SSR sin SPA, así que cada navegación entre páginas pierde la conexión Live activa (WebSocket) con Gemini. En vez de intentar retomar la sesión de audio en vivo (`sessionResumption`, que requeriría mantener el handle de sesión vivo entre cargas de página), el historial de la conversación se persiste en la tabla `asistente_mensajes` y, al reconectar, se reinyecta como contexto inicial con `session.sendClientContent({ turns: [...], turnComplete: false })` antes de que Sol diga nada. Es más simple de sostener en una arquitectura sin estado de cliente persistente, a costa de no retomar el audio literal, solo el texto transcripto de la charla.
- **`asistenteCore.js` como factory reusable:** la lógica completa del asistente (conexión Gemini Live, captura/reproducción de audio, envío de imágenes, tool-calling, historial) vive en una función `crearAsistenteChat(elementos)` que recibe los IDs del DOM como parámetros. Así se instancia igual tanto en la página completa `/asistente` como en el widget flotante del footer, sin duplicar lógica — solo cambian los elementos del DOM que se le pasan.
- **Reutilizar endpoints existentes en vez de crear nuevos (rama `reportes-drilldown`, sin mergear):** para el drill-down de turnos en reportes, en vez de sumar un endpoint nuevo de "toggle estado", se detectó que `/turnos/:id/editar` (`turnoController.actualizarTurno`) ya recalculaba `estado` desde `monto_abonado` vs `costo` y ya manejaba método de pago + transacción de `turno_pagos` correctamente. Se reutilizó tal cual, solo agregándole un redirect condicional: si el POST trae `desde`/`hasta` en el body vuelve a `/reportes?desde=..&hasta=..`, si no sigue yendo a `/agenda` como siempre.

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

**En desarrollo, rama `reportes-drilldown` (creada desde `main`, sin mergear, sin PR abierto) — NO está en producción:**
- Drill-down de turnos en `/reportes`: las stat-cards "Deuda pendiente" y cada tarjeta de empleada en "Sueldos del período" ahora filtran, client-side (JS puro, sin request al server), la tabla "Turnos del período" que ya traía todos los turnos del período pero antes no era interactiva.
- Columna "Acciones" nueva en esa tabla, por fila: "✏️ Editar" (link ya existente a `/turnos/:id/editar`, sin cambios), y un toggle rápido de estado — "✅ Marcar pagado" (solo si el turno está `Pendiente`; abre un popover pidiendo método de pago: efectivo/transferencia/mixto) o "↩️ Marcar pendiente" (solo si está `Pagado`; resetea `monto_abonado` a 0 y borra los `turno_pagos` asociados). Turnos en estado `Parcial` solo muestran "Editar" — a propósito, para no pisar el desglose de cómo ya se cobró esa seña con un método específico.
- No se crearon endpoints nuevos: ver bullet correspondiente en "Decisiones de diseño relevantes" (reutiliza `/turnos/:id/editar`, con redirect condicional a `/reportes?desde=..&hasta=..` si el POST trae esos params).
- Se agregaron columnas "Clienta" y "Empleada" a la misma tabla de turnos en reportes (el dato ya venía de `getTurnosPorRango`, solo faltaba mostrarlo) — útil sobre todo al filtrar por "Deuda pendiente", donde aparecen turnos de varias empleadas/clientas mezclados.
- Probado en vivo contra la BD local (no solo renderizado): marcar pagado (efectivo) → estado Pagado y desglose Efectivo del dashboard correcto; marcar pendiente → estado Pendiente y `turno_pagos` vacío; intento de pago mixto con montos que no suman el total, rechazado con 400 por la validación server-side existente (`validarMetodoPago`).
- Archivos tocados: `back/src/api/controllers/turnoController.js` (redirect condicional, ~6 líneas) y `back/src/views/reportes/index.ejs` (todo el resto: filtros, columna de acciones, popover, columnas nuevas).

**Pendiente / sin definir:**
- Bitácora y roadmap vacíos — no hay tareas activas registradas al día de hoy
- La carpeta `front/` existe pero está vacía (posiblemente reservada para futura SPA o assets separados)
- Confirmar si la tabla `servicios` todavía se usa en el código o es remanente de una versión anterior — `turnos` referencia `servicios_base`, no `servicios`; revisar si algún modelo/controller la consulta o si se puede deprecar
- `docs/ai/db_schema_dump.sql` todavía no incluye la tabla `asistente_mensajes` (dump manual desde pgAdmin, no se regeneró después de correr la migración 010) — la estructura documentada acá sale de la migración SQL, conviene refrescar el dump la próxima vez que se actualice a mano

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
- **Interactividad "gratis" client-side sobre datos ya renderizados:** cuando una vista SSR ya trae todos los datos necesarios en el HTML (ej. la tabla de turnos en reportes), preferir filtrar/interactuar con JS puro en el cliente antes que pegarle de nuevo al server — solo se vuelve a pegarle al backend cuando la acción muta datos (ej. marcar pagado).
