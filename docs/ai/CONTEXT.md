# CONTEXT.md — Sol Admin
_Última actualización: 2026-08-06_

## Qué es esto
Sistema de gestión web para un salón de estética (Sol Cantero). Cubre agenda, clientes, servicios, empleadas, reportes financieros, depilación láser, un CMS para la landing pública y un programa de fidelización para clientas. Está en producción en `admin.solcantero.com.ar` con una clienta activa.

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
- **Login con Google (`google-auth-library`):** login de clientas en el portal de fidelización (`/mi-fidelidad`).
- **Email transaccional (`resend`):** mails del programa de fidelización (reseteo de contraseña de clientas), remitente con dominio verificado `solcantero.com.ar`.

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
    │   ├── fidelidadHelper.js ← matching por teléfono, otorgamiento de sellos (automático y manual), sorteo de premios ponderado por catálogo
    │   ├── emailHelper.js    ← envío de mail transaccional con Resend (reseteo de contraseña de clientas)
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

> El módulo de fidelización agrega, además de lo del árbol de arriba: `back/src/api/middlewares/clientaMiddleware.js` (auth por token bearer para clientas, no usa `express-session`) y los modelos/controllers/rutas/vistas de `fidelidad*` y `landingCuenta*`.

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
| Fidelización (admin) | `/fidelidad`, `/fidelidad/pendientes`, `/fidelidad/premios`, `/fidelidad/canjes` | Configuración del programa (fecha de lanzamiento, servicios que suman sello, catálogo de premios, reglas de en qué sello hay sorteo), cola de revisión manual de cuentas que no se pudieron vincular solas a una fila de `clientes` (vincular a clienta existente, crear clienta nueva o rechazar), otorgamiento manual de sello desde el historial de una clienta, y cola de canje de premios en persona (con alerta en el dashboard) |
| Fidelización API | `/api/fidelidad/*` | Login con Google, registro y login manual con email+contraseña, reseteo de contraseña por mail, carga de teléfono, progreso de sellos, girar ruleta de premio, historial de turnos (sin montos). Consumida por el repo `landingPageSol`, portal `/mi-fidelidad` (instalable como PWA — ver Decisiones de diseño), CORS restringido igual que `/api/landing` |

## Estructura de la Base de Datos

Hay tres dominios claramente separados: el **salón** (clientes, turnos, servicios, empleados), el **módulo láser** (clientas_laser, sesiones_laser, zonas, combos) y **fidelización** (landing_cuentas, fidelidad_*). Las tablas `landing_*` pertenecen al CMS público y al portal de fidelización.

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

### Dominio: Fidelización

Migración `back/migrations/011_crear_fidelizacion.sql`, corrida en local y en producción (Neon). 8 tablas en total.

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

**fidelidad_sellos** — un sello por turno que pasó a estado "Pagado" (o cargado a mano por el admin)
| Columna | Tipo | Notas |
|---|---|---|
| id | serial | PK |
| id_cuenta | integer | FK → landing_cuentas(id) CASCADE, NOT NULL |
| id_turno | integer | FK → turnos(id) CASCADE, NOT NULL, UNIQUE — evita duplicar el sello si el turno se edita más de una vez estando Pagado |
| numero_sello | integer | NOT NULL — posición 1–10 dentro del ciclo |
| ciclo | integer | NOT NULL, default 1 — rollover automático al completar 10 sellos |
| created_at | timestamptz | default now() |

**fidelidad_premios** — premio pendiente de "girar" u ya redimido, generado en los sellos definidos por `fidelidad_reglas_premio`
| Columna | Tipo | Notas |
|---|---|---|
| id | serial | PK |
| id_cuenta | integer | FK → landing_cuentas(id) CASCADE, NOT NULL |
| ciclo | integer | NOT NULL |
| sello_numero | integer | NOT NULL, CHECK 1–10 |
| tipo_premio | varchar(50) | nullable — se completa recién cuando la clienta gira la ruleta |
| descripcion | varchar(255) | nullable |
| redimido | boolean | NOT NULL, default false — también se marca así al canjear en persona desde `/fidelidad/canjes` |
| redimido_en | timestamptz | nullable |
| created_at | timestamptz | default now() |

UNIQUE(id_cuenta, ciclo, sello_numero) en `fidelidad_premios` — evita duplicar el premio del mismo hito.

**fidelidad_reglas_premio** — en qué número de sello (1–10) hay oportunidad de premio, configurable desde `/fidelidad/premios`
| Columna | Tipo | Notas |
|---|---|---|
| id | serial | PK |
| numero_sello | integer | NOT NULL, UNIQUE, CHECK 1–10 |
| created_at | timestamptz | default now() |

Seed: sellos 5 y 10.

**fidelidad_premios_catalogo** — catálogo editable de premios posibles, sorteo ponderado por `peso`
| Columna | Tipo | Notas |
|---|---|---|
| id | serial | PK |
| descripcion | varchar(255) | NOT NULL |
| peso | integer | NOT NULL, default 10, CHECK > 0 |
| activo | boolean | NOT NULL, default true |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

Seed: 5 premios (10%, 20% y 50% de descuento, perfilado de cejas gratis, manicura gratis).

**fidelidad_config** — configuración global del programa, fila única (singleton)
| Columna | Tipo | Notas |
|---|---|---|
| id | smallint | PK, default 1, CHECK id = 1 |
| fecha_inicio | date | nullable — NULL significa programa pausado, nadie suma sello hasta que Sol la cargue desde `/fidelidad` |
| updated_at | timestamptz | default now() |

**fidelidad_servicios_habilitados** — lista blanca de servicios que suman sello ("servicio completo")
| Columna | Tipo | Notas |
|---|---|---|
| id_servicio | integer | PK, FK → servicios_base(id) CASCADE |
| created_at | timestamptz | default now() |

Vacía por default a propósito: mejor que falte un servicio (no suma, se corrige agregándolo) que sobre (sumó algo indebido y hay que deshacerlo a mano).

**fidelidad_reglas_ciclo** — snapshot de qué reglas de premio estaban vigentes cuando arrancó cada tarjeta (ciclo) de cada clienta
| Columna | Tipo | Notas |
|---|---|---|
| id | serial | PK |
| id_cuenta | integer | FK → landing_cuentas(id) CASCADE, NOT NULL |
| ciclo | integer | NOT NULL |
| numero_sello | integer | NOT NULL, CHECK 1–10 |
| created_at | timestamptz | default now() |

UNIQUE(id_cuenta, ciclo, numero_sello). Se congela al otorgar el sello número 1 de un ciclo nuevo; así, si Sol edita `fidelidad_reglas_premio` a mitad de tarjeta, el cambio no le pisa la tarjeta a nadie que ya la tenga en curso. Backfill al crear la tabla: cuentas con sellos previos recibieron como snapshot las reglas vigentes al momento del backfill (aproximación conocida, no hay registro histórico exacto).

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

clientes ──< landing_cuentas
landing_cuentas ──< fidelidad_sellos >── turnos
landing_cuentas ──< fidelidad_premios
landing_cuentas ──< fidelidad_reglas_ciclo
servicios_base ──< fidelidad_servicios_habilitados
```

## Decisiones de diseño relevantes

- **Sin ORM:** queries SQL puras para tener control total y evitar magia. Los modelos son funciones que devuelven rows.
- **SSR full:** no hay SPA ni cliente React. Todo se renderiza en servidor con EJS. El único JS de cliente es para alertas, tema, toasts, selectores y el chat del asistente.
- **Roles simples:** `admin` ve todo, `empleada` solo ve `/mi-panel`. El middleware `requireAdmin` bloquea el resto. Las empleadas se vinculan a usuarios via `id_empleado` en sesión.
- **Flash messages via sesión:** `req.session.flash` se setea antes del redirect y se consume en la vista siguiente. Sin librería externa.
- **Sistema de alertas con expiración en localStorage:** las alertas (turnos pendientes, cumpleaños, deuda total) se generan en servidor y se renderizan en cliente con `alertas.js`. Solo las ve el admin. El usuario puede ignorarlas; la ignorancia expira según tipo (cumpleaños: 24h, deuda: 4h).
- **Notificaciones propias vs. alertas del admin — dos fuentes de datos distintas, un solo dropdown en UI:** `alertas.js` (solo admin, localStorage, sin persistencia en BD) sigue existiendo para KPIs del negocio; la campanita de notificaciones propias (`misNotificaciones.js`, tabla `notificaciones`) es para *cualquier* usuario y persiste en BD el historial de cada push enviado por `pushHelper.enviarPushATodas`. Antes eran dos botones 🔔 separados en el header; ahora comparten un único botón/dropdown (`#notificaciones-btn`) con dos secciones internas y un badge combinado, coordinado por `notificaciones.js` vía `window.notifCounts` — cada script sigue siendo dueño de su propio dato, solo se unificó la presentación.
- **Landing API con CORS restringido:** `/api/landing/*` tiene CORS abierto en dev y solo permite `solcantero.com.ar` en producción. El resto del sistema no expone APIs — es SSR puro (las excepciones JSON son `/notificaciones/mias`, los endpoints de `/asistente`, y `/api/fidelidad/*`).
- **Cloudinary para imágenes CMS y de perfil:** las imágenes de landing y la foto de perfil de usuarios se suben como buffer desde Multer (memoria) a Cloudinary. Los campos `imagen_url_fallback` (landing) permiten URL alternativa sin subida.
- **Cambio de contraseña propia con verificación:** `/mi-perfil/password` exige la contraseña actual (bcrypt.compare) antes de permitir setear una nueva, distinto del reseteo que puede hacer un admin desde `/usuarios` sin esa verificación.
- **Cache de assets estáticos:** en producción, `src/public` se sirve con `maxAge: 7d`. Los JS/CSS críticos usan cache busting manual (`?v=N`) en las vistas; hay que bumpear la versión a mano cada vez que se toca el contenido de uno de esos archivos, si no el navegador sirve la versión vieja cacheada hasta 7 días.
- **Láser como módulo paralelo:** las clientas de láser no son las mismas entidades que los clientes del salón. Tienen su propia tabla y flujo (días de trabajo, zonas, combos).
- **Asistente identifica interlocutor al arrancar:** el system prompt de Gemini obliga a preguntar "¿Hablo con Sol o con Mari?" antes de cualquier otra cosa en cada conversación nueva, y a dirigirse por ese nombre el resto del intercambio — no hay autenticación real del lado del asistente, es solo para personalizar el trato entre la dueña y la secretaria.
- **Resolución de nombres del asistente: clientas por substring, empleadas por roster completo.** Para clientas/servicios el prompt le dice al modelo que pruebe primero literal lo que dijo Sol (las queries ya hacen `LIKE` parcial). Para empleadas la heurística es distinta: Sol siempre usa apodos que no necesariamente son substring ni diminutivo obvio del nombre real (ej. "Mili" no es forzosamente por "Milagros"). El prompt le prohíbe al modelo inventar el "nombre formal" de un apodo — lo obliga a traer primero el roster completo con `consultarEmpleados` sin filtro y comparar el apodo contra los nombres reales tal como están escritos, preguntando a Sol si hay ambigüedad. Esto se sumó a un fix de fondo en `empleadoModel.searchEmpleados`, que no buscaba por `CONCAT(nombre, ' ', apellido)` y por eso fallaba con nombre completo (igual que ya hacía `clienteModel.searchClientes`).
- **Contexto del asistente persistido vía `sendClientContent`, no `sessionResumption`:** el sistema es SSR sin SPA, así que cada navegación entre páginas pierde la conexión Live activa (WebSocket) con Gemini. En vez de intentar retomar la sesión de audio en vivo (`sessionResumption`, que requeriría mantener el handle de sesión vivo entre cargas de página), el historial de la conversación se persiste en la tabla `asistente_mensajes` y, al reconectar, se reinyecta como contexto inicial con `session.sendClientContent({ turns: [...], turnComplete: false })` antes de que Sol diga nada. Es más simple de sostener en una arquitectura sin estado de cliente persistente, a costa de no retomar el audio literal, solo el texto transcripto de la charla.
- **`asistenteCore.js` como factory reusable:** la lógica completa del asistente (conexión Gemini Live, captura/reproducción de audio, envío de imágenes, tool-calling, historial) vive en una función `crearAsistenteChat(elementos)` que recibe los IDs del DOM como parámetros. Así se instancia igual tanto en la página completa `/asistente` como en el widget flotante del footer, sin duplicar lógica — solo cambian los elementos del DOM que se le pasan.
- **Reutilizar endpoints existentes en vez de crear nuevos (rama `reportes-drilldown`, sin mergear):** para el drill-down de turnos en reportes, en vez de sumar un endpoint nuevo de "toggle estado", se detectó que `/turnos/:id/editar` (`turnoController.actualizarTurno`) ya recalculaba `estado` desde `monto_abonado` vs `costo` y ya manejaba método de pago + transacción de `turno_pagos` correctamente. Se reutilizó tal cual, solo agregándole un redirect condicional: si el POST trae `desde`/`hasta` en el body vuelve a `/reportes?desde=..&hasta=..`, si no sigue yendo a `/agenda` como siempre.
- **Fidelización: vinculación por teléfono con cola de revisión manual, nunca automática a ciegas.** Cuando una clienta se registra en el portal, `fidelidadHelper` intenta matchear su teléfono contra `clientes`. Si hay un único match exacto se vincula sola (`estado_vinculacion = 'auto'`); si hay ambigüedad o ningún match, la cuenta queda `pendiente` y aparece en `/fidelidad/pendientes` para que el admin decida a mano (vincular, crear clienta nueva o rechazar) — se prioriza no mezclar el historial de turnos de dos personas distintas por error.
- **Reglas de premio congeladas por tarjeta (`fidelidad_reglas_ciclo`):** en vez de consultar siempre `fidelidad_reglas_premio` en vivo, cada ciclo/tarjeta de cada clienta guarda su propio snapshot de qué sellos otorgan premio, tomado al momento de arrancar esa tarjeta. Así un cambio de reglas a mitad de tarjeta no le afecta retroactivamente a nadie que ya la tenga en curso.
- **Sorteo de premios ponderado por catálogo editable (`fidelidad_premios_catalogo.peso`):** en vez de un set fijo de premios en código, el catálogo es editable desde `/fidelidad/premios` y el sorteo pondera por `peso` — permite ajustar la probabilidad de cada premio sin tocar código.
- **Programa pausado por default (`fidelidad_config.fecha_inicio = NULL`):** hasta que Sol no carga la fecha de lanzamiento desde `/fidelidad`, nadie suma sello aunque el resto de la infraestructura ya esté activa — da margen para terminar de configurar qué servicios cuentan (`fidelidad_servicios_habilitados`) antes de exponer el programa a clientas reales.
- **PWA instalable del lado del frontend (repo `landingPageSol`):** el portal `/mi-fidelidad` es instalable como app (manifest + service worker con cache stale-while-revalidate), pero la instalabilidad queda acotada a esa sección, no a todo el sitio. El service worker nunca cachea `/api/*` — la ruleta, el progreso de sellos y el historial siempre se piden en vivo. No implementa push notifications reales: no hay `Notification.requestPermission` ni tabla de suscripciones para `landing_cuentas`, aunque el nombre de la rama de frontend que la introdujo hacía referencia a "push".

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
GOOGLE_CLIENT_ID=       ← configurada en local y en Render — login con Google del portal de fidelización
RESEND_API_KEY=         ← configurada en local y en Render — envío real de mail de reseteo de contraseña vía Resend
RESEND_FROM=            ← configurada en local y en Render — remitente con dominio verificado `solcantero.com.ar`
RESEND_REPLY_TO=        ← configurada en local y en Render — a dónde llegan las respuestas si una clienta contesta el mail de reset
FRONTEND_URL=           ← configurada en local y en Render — usada para armar el link del mail de reset (`{FRONTEND_URL}/mi-fidelidad/resetear?token=...`)
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
- **Programa de fidelización, mergeado a `main` y desplegado (PR #2, commit `c888eaa`, 2026-08-06):** login de clientas con Google y con email+contraseña (registro, reseteo de contraseña por mail con Resend), vinculación de cuenta a `clientes` (automática por teléfono o manual desde la cola `/fidelidad/pendientes`), sello por turno pagado (o cargado a mano por el admin desde el historial de una clienta), sorteo de premio ponderado en los sellos 5 y 10 (configurable), catálogo de premios editable, canje de premios en persona desde `/fidelidad/canjes` con alerta en el dashboard, fecha de lanzamiento configurable (`fidelidad_config`), lista de servicios que suman sello (`fidelidad_servicios_habilitados`), y reglas de premio congeladas por tarjeta (`fidelidad_reglas_ciclo`). Consumido por el portal `/mi-fidelidad` del repo `landingPageSol` (mergeado a su `main` y deployado a Firebase Hosting el mismo día), que además es instalable como PWA. Variables de entorno (`GOOGLE_CLIENT_ID`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, `FRONTEND_URL`) ya configuradas en Render, sin prerequisitos externos pendientes.

**En desarrollo, rama `reportes-drilldown` (creada desde `main`, sin mergear, sin PR abierto) — NO está en producción:**
- Drill-down de turnos en `/reportes`: las stat-cards "Deuda pendiente" y cada tarjeta de empleada en "Sueldos del período" ahora filtran, client-side (JS puro, sin request al server), la tabla "Turnos del período" que ya traía todos los turnos del período pero antes no era interactiva.
- Columna "Acciones" nueva en esa tabla, por fila: "✏️ Editar" (link ya existente a `/turnos/:id/editar`, sin cambios), y un toggle rápido de estado — "✅ Marcar pagado" (solo si el turno está `Pendiente`; abre un popover pidiendo método de pago: efectivo/transferencia/mixto) o "↩️ Marcar pendiente" (solo si está `Pagado`; resetea `monto_abonado` a 0 y borra los `turno_pagos` asociados). Turnos en estado `Parcial` solo muestran "Editar" — a propósito, para no pisar el desglose de cómo ya se cobró esa seña con un método específico.
- No se crearon endpoints nuevos: ver bullet correspondiente en "Decisiones de diseño relevantes" (reutiliza `/turnos/:id/editar`, con redirect condicional a `/reportes?desde=..&hasta=..` si el POST trae esos params).
- Se agregaron columnas "Clienta" y "Empleada" a la misma tabla de turnos en reportes (el dato ya venía de `getTurnosPorRango`, solo faltaba mostrarlo) — útil sobre todo al filtrar por "Deuda pendiente", donde aparecen turnos de varias empleadas/clientas mezclados.
- Probado en vivo contra la BD local (no solo renderizado): marcar pagado (efectivo) → estado Pagado y desglose Efectivo del dashboard correcto; marcar pendiente → estado Pendiente y `turno_pagos` vacío; intento de pago mixto con montos que no suman el total, rechazado con 400 por la validación server-side existente (`validarMetodoPago`).
- Archivos tocados: `back/src/api/controllers/turnoController.js` (redirect condicional, ~6 líneas) y `back/src/views/reportes/index.ejs` (todo el resto: filtros, columna de acciones, popover, columnas nuevas).

**Pendiente / sin definir:**
- Bitácora y roadmap vacíos — no hay tareas activas registradas al día de hoy fuera de lo que ya está en la rama `reportes-drilldown`
- La carpeta `front/` existe pero está vacía (posiblemente reservada para futura SPA o assets separados)
- Confirmar si la tabla `servicios` todavía se usa en el código o es remanente de una versión anterior — `turnos` referencia `servicios_base`, no `servicios`; revisar si algún modelo/controller la consulta o si se puede deprecar
- `docs/ai/db_schema_dump.sql` todavía no incluye la tabla `asistente_mensajes` ni las 8 tablas de fidelización — dump manual desde pgAdmin, no se regeneró después de correr la migración 010 ni la 011. La estructura documentada acá para esas tablas sale de las migraciones SQL directamente; conviene refrescar el dump la próxima vez que se actualice a mano

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
