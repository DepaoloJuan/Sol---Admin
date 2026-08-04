# Roadmap — Sol Cantero

_Este archivo lo mantiene el agente `roadmap`. Cada feature nueva se agrega como una sección propia._

---

## Método de pago en turnos — completada 2026-07-30

Registrar si un turno se cobró en efectivo, transferencia o mixto (parte de cada uno). El registro ocurre al marcar el turno como cobrado/actualizado, no al crearlo. Requiere nueva tabla `turno_pagos` para soportar el caso mixto (múltiples registros por turno).

**Mergeada a `main`:** commit `2129c2f` (rama `feature/2.0`), incluida en el merge `6527155`. En producción desde entonces.

---

### Pasos

#### DB / Migración

- [x] Crear script SQL `back/migrations/001_crear_turno_pagos.sql` con:
  - `CREATE TABLE turno_pagos (id SERIAL PRIMARY KEY, turno_id BIGINT NOT NULL REFERENCES turnos(id) ON DELETE CASCADE, metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('efectivo', 'transferencia')), monto NUMERIC(12,2) NOT NULL)`
  - `CREATE INDEX idx_turno_pagos_turno_id ON turno_pagos(turno_id)`
- [x] Crear script SQL `back/migrations/002_migrar_pagos_historicos.sql` que inserte en `turno_pagos` un registro por cada turno existente que tenga `monto_abonado > 0`, usando `metodo = 'efectivo'` y `monto = monto_abonado` — solo para no dejar datos inconsistentes desde el día uno
- [x] Ejecutar ambos scripts en producción (Render) — confirmado por Juanma, ya corridas

#### Backend — modelo (`back/src/api/models/turnoModel.js`)

- [x] Agregar función `insertarPagos(turnoId, pagos, client)` que recibe un array `[{ metodo, monto }]` y hace INSERT en `turno_pagos` dentro de una transacción (acepta `client` para poder usarse con `pool.connect()`)
- [x] Agregar función `eliminarPagosDeTurno(turnoId, client)` para borrar los registros previos de un turno antes de re-insertar (necesario en edición)
- [x] Agregar función `getPagosDeTurno(turnoId)` que devuelva los registros de `turno_pagos` para un turno dado
- [x] Modificar `getTurnoById` para que incluya los pagos como campo `pagos` (array) usando un JOIN o una segunda query, para que la vista de edición pueda pre-popular el método elegido

#### Backend — controller (`back/src/api/controllers/turnoController.js`)

- [x] En `actualizarTurno`: leer del `req.body` los campos de método de pago (`metodo_pago`, `monto_efectivo`, `monto_transferencia`)
- [x] Envolver la lógica de `updateTurno` + `eliminarPagosDeTurno` + `insertarPagos` en una transacción explícita con `pool.connect()` / `BEGIN` / `COMMIT` / `ROLLBACK`
- [x] Agregar validación en `back/src/api/validators/turnoValidator.js`: función `validarMetodoPago({ metodo_pago, monto_efectivo, monto_transferencia, monto_abonado })` — debe chequear que el método sea uno de los valores válidos y que, en caso mixto, ambos montos sean positivos y que `monto_efectivo + monto_transferencia === monto_abonado` (no se valida contra `costo`, solo contra `monto_abonado`)
- [x] Si la validación falla, re-renderizar `agenda/editar` con el error, igual que hoy hace con `errorValidacion`

#### Frontend — form de cobro (`back/src/views/agenda/editar.ejs`)

- [x] Agregar selector `<select name="metodo_pago">` con opciones: `efectivo`, `transferencia`, `mixto` — visible solo cuando el estado es `Parcial` o `Pagado` (ocultarlo con JS cuando es `Pendiente`)
- [x] Cuando se selecciona `mixto`: mostrar dos inputs adicionales `monto_efectivo` y `monto_transferencia`; cuando se selecciona `efectivo` o `transferencia`: ocultarlos (el monto total lo sigue manejando el campo `monto_abonado` existente)
- [x] Pre-popular el selector y los montos al cargar la vista en base a los `pagos` que devuelve el modelo modificado (`turno.pagos`)
- [x] Actualizar el bloque JS de `actualizarResumen()` para que, en modo mixto, valide en cliente que `monto_efectivo + monto_transferencia === monto_abonado` (solo warning visual, no bloqueante — la validación real es en servidor)
- [x] Asegurarse de que cuando el estado es `Pendiente` se envíen los campos de método vacíos / no se guarden pagos en `turno_pagos` (un turno sin cobro no debe tener registros de pago)

#### Backend — reportes: modelo y helpers

- [x] En `turnoModel.js`, modificar `getTurnosPorRango` para hacer LEFT JOIN con `turno_pagos` y agregar los montos agrupados por método como columnas extra (`monto_efectivo_cobrado`, `monto_transferencia_cobrado`), usando una subquery o `json_agg` — elegir la opción que menos cambie la firma de retorno para no romper los consumers existentes
- [x] En `back/src/utils/reporteHelpers.js`, función `calcularDatosReportes`: agregar al objeto `resumen` los campos `totalEfectivo` y `totalTransferencia`, calculados sumando los montos de `turno_pagos` por método sobre los turnos del rango
- [x] En `back/src/utils/reporteHelpers.js`, función `calcularDatosDashboard`: ídem — agregar `totalEfectivo` y `totalTransferencia` al objeto `resumen`
- [x] En `reporteController.js`, función `verReporteAnual`: el cálculo mes a mes está inline en el controller (no delega a un helper). Se agregó la suma de `totalEfectivo` y `totalTransferencia` dentro del `Promise.all` de meses, expuestos en el objeto que se pasa a la vista `reportes/anual`

#### Frontend — vistas de reportes

- [x] En `back/src/views/reportes/index.ejs`: debajo del total cobrado (`totalCobrado`), se agregó una línea desglosada: "Efectivo: $X / Transferencia: $Y" usando los nuevos campos del `resumen`
- [x] En `back/src/views/reportes/anual.ejs`: se agregaron columnas `Efectivo` y `Transferencia` en la tabla mensual (modo detalle de un año; el modo comparación de varios años queda sin estos campos para no ensanchar la grilla — ver "A revisar")
- [x] `calcularDatosDashboard` está conectada a la ruta `/admin` (`back/index.js`, línea ~111) — **corrección respecto a la nota original de este archivo:** esto no fue parte de esta feature, ya estaba conectado desde el commit `147a44c` ("feat: dashboard admin...", abril 2026), muy anterior. La nota previa de "código muerto" era incorrecta.
- [x] Mostrar el desglose `totalEfectivo` / `totalTransferencia` en la vista del dashboard (`back/src/views/admin/dashboard.ejs`) — resuelto en la sesión del 2026-08-03, ver sección "Mini-chat del asistente, campanitas unificadas y reorden de nav" más abajo.

---

### A revisar

- La migración histórica (`002`) asume `metodo = 'efectivo'` para todos los turnos anteriores. Si Sol sabe que hubo transferencias históricas, hay que coordinar manualmente antes/si se corre el script en producción.
- `getTurnoById` devuelve `pagos` como array. La vista de edición interpreta si hay 1 o 2 registros para saber el método — revisar que no haya quedado lógica confusa en el EJS si en el futuro se toca ese flujo.
- El reporte anual calcula todo inline en `reporteController.js` (no delega a `calcularDatosReportes`). Deuda técnica de duplicación conocida, no bloqueante. **Resuelto el 2026-08-03**, ver sección de abajo.

---

### Notas

#### Decisiones tomadas

- **Validación del pago mixto:** el pago mixto describe la composición del monto cobrado *en ese momento* (puede ser una seña o un saldo parcial), nunca el costo total del turno. Es exactamente el mismo modelo que ya usa `monto_abonado` hoy: el turno puede estar parcialmente cobrado sin problema. La validación en `validarMetodoPago` es: ambos montos positivos + `monto_efectivo + monto_transferencia === monto_abonado`. No hay que comparar contra `costo`.

- **No existe "un pago cubre varios turnos":** la secretaria siempre cobra turno por turno, incluso cuando salda varios turnos el mismo día. No hay caso de uso donde un pago cubra múltiples turnos a la vez. Esto descarta cualquier necesidad de lógica de distribución de pagos entre turnos.

- Los scripts de migración se ubicaron en `back/migrations/` (no en un `migrations/` en la raíz del repo), porque toda la lógica de conexión a la DB vive bajo `back/`.
- `validarMetodoPago` exige `metodo_pago` cuando `monto_abonado > 0` (no estaba explícito en el desglose original, pero sin este chequeo un cobro sin método seleccionado rompía la transacción con un 500 por el CHECK de `turno_pagos.metodo`). Con `monto_abonado = 0` no se pide método, igual que antes.
- `reportes/anual.ejs`: las columnas Efectivo/Transferencia se agregaron solo en el modo "detalle de un año". En el modo "comparación de varios años" no se agregaron para no ensanchar más una tabla que ya tiene columnas por año.

#### Decisiones de diseño fijas

- Los valores válidos de `metodo` en `turno_pagos` son `'efectivo'` y `'transferencia'` (el caso mixto no es un método en sí, sino dos registros). Esto ya está decidido por el esquema de tabla propuesto.
- No hay ruta separada de "cobrar turno" — el cobro se hace editando el turno desde `/turnos/:id/editar`. Todo el flujo de método de pago va dentro del `actualizarTurno` existente.
- La tabla `turno_pagos` tiene `ON DELETE CASCADE` sobre `turnos(id)`, así que eliminar un turno borra automáticamente sus pagos sin lógica extra en el modelo.

---

## Mi Perfil, notificaciones y ajustes varios — completada 2026-07-30

Cuatro mejoras chicas empaquetadas juntas: perfil propio editable (foto, título/cargo, contraseña), sistema de notificaciones persistentes con campanita para todos los usuarios (no solo admin), fixes de responsive en `/mi-panel`, y el asistente de voz identificando con quién habla.

**Mergeada a `main`:** rama `feature/mi-perfil`, commits `b631c19` (perfil + notificaciones + fixes), `d9625ba` (fix de zona horaria en asistente, no relacionado a esta feature — ver nota abajo) y `b8fe937` (asistente pregunta Sol/Mari), integrados en el merge `12814eb`. En producción desde entonces.

---

### Pasos

#### DB / Migración

- [x] `back/migrations/007_agregar_foto_usuarios.sql`: `ALTER TABLE usuarios ADD COLUMN foto_url TEXT` (nullable, sin foto se sigue mostrando la inicial)
- [x] `back/migrations/008_agregar_titulo_usuarios.sql`: `ALTER TABLE usuarios ADD COLUMN titulo VARCHAR(50)` (nullable, sin título se sigue mostrando la etiqueta genérica "Admin"/"Empleada")
- [x] `back/migrations/009_crear_notificaciones.sql`: `CREATE TABLE notificaciones (id, id_usuario FK → usuarios ON DELETE CASCADE, titulo, cuerpo, url, leida boolean default false, created_at)` + `CREATE INDEX idx_notificaciones_usuario`
- [x] Ejecutar las tres migraciones en producción (Render) — confirmado por Juanma, ya corridas

#### Backend — modelo (`back/src/api/models/userModel.js`, `notificacionModel.js`)

- [x] `userModel.findUserByEmail`: agregar `u.foto_url, u.titulo` al SELECT para que estén disponibles en el login
- [x] `userModel.updateFotoUsuario(id, fotoUrl)`: UPDATE + `RETURNING *`
- [x] `userModel.updateTituloUsuario(id, titulo)`: UPDATE + `RETURNING *`
- [x] Crear `back/src/api/models/notificacionModel.js` con `crearNotificacion(idUsuario, { titulo, cuerpo, url })`, `getNotificacionesPorUsuario(idUsuario, limit=20)`, `marcarTodasLeidas(idUsuario)`, `contarNoLeidas(idUsuario)`
- [x] `pushSubscriptionModel.js`: agregar `id_usuario` al SELECT de `getSuscripcionesPorUsuario` y `getSuscripcionesPorRol` (necesario para que `pushHelper` sepa a qué usuario asociar la notificación persistida)

#### Backend — controller (`perfilController.js`, `notificacionController.js`, `authController.js`)

- [x] Crear `back/src/api/controllers/perfilController.js` con `mostrarPerfil`, `actualizarFoto` (sube a Cloudinary vía `cloudinaryHelper.subirImagen`, borra la anterior si existía), `eliminarFoto`, `actualizarTitulo` (máx 50 caracteres), `actualizarPasswordPropia`
- [x] `actualizarPasswordPropia`: valida los 3 campos completos, que nueva y confirmación coincidan, longitud mínima 6, y compara la actual con `bcrypt.compare` contra el hash guardado antes de permitir el cambio
- [x] Crear `back/src/api/controllers/notificacionController.js` con `listarPropias` (devuelve notificaciones + contador de no leídas en JSON) y `marcarLeidas`
- [x] `authController.login`: agregar `foto_url` y `titulo` al objeto `req.session.user` que se arma al loguear
- [x] `pushHelper.enviarPushATodas`: además de enviar el push, ahora persiste una fila en `notificaciones` por cada usuario destinatario (usa los `id_usuario` de las suscripciones)

#### Backend — rutas

- [x] Crear `back/src/api/routes/perfilRoutes.js`: `GET /mi-perfil`, `POST /mi-perfil/foto` (multer memoryStorage), `POST /mi-perfil/foto/eliminar`, `POST /mi-perfil/titulo`, `POST /mi-perfil/password` — todas con `requireAuth` (no `requireAdmin`, cualquier usuario logueado accede a su propio perfil)
- [x] Crear `back/src/api/routes/notificacionRoutes.js`: `GET /notificaciones/mias`, `POST /notificaciones/mias/marcar-leidas` — con `requireAuth`
- [x] Registrar ambos routers en `back/index.js`

#### Frontend — Mi Perfil (`back/src/views/perfil/index.ejs`)

- [x] Sección "Foto de perfil": preview de la foto actual (o inicial si no hay), form de subida (`input type="file" accept="image/*"`), botón "Quitar foto" con `showConfirm` si ya hay una cargada
- [x] Sección "Cómo se muestra tu rol": input de texto para `titulo` (maxlength 50), con placeholder de ejemplos (Lashista, Manicura, Extensionista de pestañas) y aclaración de cuál es el valor por defecto si no se completa
- [x] Sección "Cambiar contraseña": 3 inputs (actual/nueva/confirmar), validación de coincidencia en cliente (JS inline, solo UX — la validación real es en servidor)

#### Frontend — sidebar y header (`partials/sidebar.ejs`, `partials/header.ejs`)

- [x] `sidebar.ejs`: el bloque `sidebar-user` ahora es un link a `/mi-perfil`; muestra `user.foto_url` si existe (si no, la inicial como antes); el rol mostrado usa `user.titulo || (admin/empleada por defecto)`
- [x] `sidebar.ejs`: el link "Mi Panel" para empleadas ahora muestra la foto (o el emoji 📋 si no hay) y el nombre del usuario en vez del texto fijo "Mi Panel"
- [x] `header.ejs`: nuevo bloque `#mis-notificaciones-wrapper` con botón campanita (🔔) + badge de no leídas + dropdown de historial, visible para **todos** los usuarios logueados (a diferencia del sistema de alertas existente, que es solo para admin)
- [x] Crear `back/src/public/js/misNotificaciones.js`: al cargar la página hace `fetch('/notificaciones/mias')` y renderiza la lista + badge; al abrir el dropdown llama a `marcar-leidas` y oculta el badge; cierra al hacer click afuera
- [x] `push.js`: el botón "Activar notificaciones" ahora se oculta también si `pushManager.getSubscription()` devuelve una suscripción existente al cargar la página (antes solo se ocultaba después de activarlas en esa misma sesión de navegador)

#### Frontend — `/mi-panel` responsive (`views/miPanel/index.ejs`, `public/css/styles.css`)

- [x] Header de `/mi-panel`: reemplaza el emoji fijo 👩‍💼 + "Mi Panel" por la foto (o emoji si no hay) + nombre y apellido de la empleada; el título/cargo se muestra debajo si está cargado
- [x] `styles.css`: la fila de tabs (`.tabs` o equivalente) ahora tiene `overflow-x: auto` + `-webkit-overflow-scrolling: touch` + `max-width: 100%`, y cada `.tab-btn` tiene `flex-shrink: 0` — soluciona que el tab "Filtro" se saliera del cuadro en mobile
- [x] Cache busting de `styles.css` bumpeado a `v4` en `partials/head.ejs`

#### Asistente de voz (`back/src/utils/geminiTools/index.js`)

- [x] Agregar instrucción al `SYSTEM_INSTRUCTION`: cuando se menciona un nombre de clienta/empleada/servicio (aunque sea apodo corto, ej. "Mili"), probar primero tal cual se dijo sin pedir apellido "por las dudas"; solo pedir precisión si la herramienta devuelve error de "no encontrado" o "más de una coincidencia"
- [x] Agregar instrucción (commit separado `b8fe937`): al arrancar la conversación, antes que cualquier otra cosa, preguntar si habla con Sol (dueña) o con Mari (secretaria), y dirigirse a esa persona por su nombre el resto de la charla sin volver a preguntar

---

### A revisar

- El fix de zona horaria del asistente de voz (`d9625ba`, "fix: desfase de fecha en el asistente de voz por zona horaria") quedó cronológicamente entre `b631c19` y `b8fe937`, pero no está descripto en el pedido de esta sección ni tiene relación de código con perfil/notificaciones — no se detalla acá como parte de esta feature. Si hace falta documentarlo, es una entrada de bitácora suelta, no un paso de este roadmap.
- El endpoint `GET /notificaciones/mias` no pagina — trae siempre las últimas 20 (`limit` hardcodeado con default en el modelo, no expuesto como query param). No es un problema hoy pero si el volumen de notificaciones crece podría valer la pena. **Resuelto el 2026-08-03**, ver sección de abajo.
- No hay migración para hacer *backfill* de notificaciones históricas (a diferencia de la migración 002 de método de pago) — tiene sentido, ya que antes de esta feature no existía ningún registro de pushes enviados para migrar.

---

### Notas

#### Decisiones tomadas

- **Campanita separada de las alertas de admin:** el sistema de alertas existente (`alertas.js`, turnos pendientes/deudas/cumpleaños) sigue siendo exclusivo de admin y con expiración en `localStorage`. La campanita nueva (`misNotificaciones.js`) es un sistema aparte: persiste en DB, es para todos los roles, y no tiene lógica de expiración — se marcan como leídas explícitamente al abrir el dropdown. No se unificaron ambos sistemas. **Nota 2026-08-03:** se mantuvieron como sistemas separados a nivel de datos y lógica, pero sí se unificó su presentación visual (un solo botón/dropdown con badge combinado) — ver sección de abajo.
- **La foto y el título son autogestionados, no editables por admin sobre terceros:** las rutas de `/mi-perfil` usan `requireAuth` (no `requireAdmin`) y siempre operan sobre `req.session.user.id` — no reciben un `:id` de otro usuario. El admin no tiene, desde esta feature, una pantalla para setear la foto/título de una empleada por ella.
- **Notificación persistida solo para pushes reales, no para cualquier evento:** `crearNotificacion` se dispara únicamente desde `pushHelper.enviarPushATodas`, es decir, solo cuando efectivamente se manda un push. No hay un registro de "eventos" separado del envío de push.

#### Pregunta abierta

- El dropdown de notificaciones no tiene acción para navegar/limpiar notificaciones individuales (solo "marcar todas como leídas" al abrir) — confirmar si eso es suficiente o si en algún momento se va a pedir descartar una notificación puntual.

---

## Mini-chat del asistente, campanitas unificadas y reorden de nav — completada 2026-08-03

Sesión de trabajo que agrupa: fix de búsqueda/resolución de apodos de empleadas en el asistente de voz, desglose de efectivo/transferencia en el dashboard (pendiente de la feature de "Método de pago en turnos"), refactor del reporte anual para eliminar la deuda técnica de duplicación (pendiente de esa misma feature), paginación de notificaciones propias, unificación visual de las dos campanitas (alertas admin + notificaciones propias) en un solo botón/dropdown, y la feature grande de la sesión: mini-chat flotante del asistente con historial persistente, disponible en todas las páginas admin. De paso, reorganización de la navegación (sidebar y header).

**Mergeada a `main`:** commit único `8ef4eae` (directo sobre `main`, sin rama intermedia). Migración `010_crear_asistente_mensajes.sql` ya corrida en producción (Render) — confirmado por Juanma.

---

### Pasos

#### Fix — búsqueda de empleadas y resolución de apodos del asistente

- [x] `back/src/api/models/empleadoModel.js` (`searchEmpleados`): agregado `LOWER(CONCAT(nombre, ' ', apellido)) LIKE LOWER($1)` al `WHERE`, mismo patrón que ya tenía `clienteModel.searchClientes`, para que la búsqueda por nombre completo funcione
- [x] `back/src/utils/geminiTools/index.js` (`SYSTEM_INSTRUCTION`): reescrita la instrucción de resolución de nombres de empleadas — ya no asume que un apodo (ej. "Mili") es diminutivo de un nombre formal inventado; ahora, si todavía no tiene el roster en la conversación, llama primero a `consultarEmpleados` sin filtro para traer la lista completa y compara el apodo literalmente contra los nombres reales antes de usar cualquier otra herramienta; si sigue sin poder identificar a la empleada, pregunta en vez de adivinar

#### Dashboard

- [x] `back/src/views/admin/dashboard.ejs`: agregado el desglose "Efectivo: $X / Transferencia: $Y" debajo de "Total cobrado", usando `dashboard.resumen.totalEfectivo` / `dashboard.resumen.totalTransferencia` — el helper `calcularDatosDashboard` ya los calculaba desde la feature de "Método de pago en turnos", pero la vista no los usaba. Cierra el pendiente que había quedado abierto en esa sección.

#### Reportes — reporte anual (deuda técnica)

- [x] `back/src/api/controllers/reporteController.js` (`verReporteAnual`): refactorizado para llamar a `calcularDatosReportes` (de `back/src/utils/reporteHelpers.js`) por cada mes, en vez de reimplementar los cálculos inline dentro del `Promise.all`. Cierra la deuda técnica anotada en la sección "Método de pago en turnos".

#### Notificaciones — paginación

- [x] `back/src/api/models/notificacionModel.js` (`getNotificacionesPorUsuario`): agregado parámetro `offset = 0` además de `limit`, con `OFFSET $3` en la query
- [x] `back/src/api/controllers/notificacionController.js` (`listarPropias`): lee `offset` de `req.query` (`parseInt(req.query.offset, 10) || 0`) y lo pasa al modelo
- [x] `back/src/public/js/misNotificaciones.js`: reescrito para paginar de a 20 — mantiene `offsetActual`, agrega botón "Cargar más" (`#btn-cargar-mas-notificaciones`, se muestra/oculta según si la última tanda vino completa) y una función `renderizar(notificaciones, noLeidas, append)` que agrega al final de la lista en vez de reemplazarla cuando `append = true`

#### Notificaciones — unificación de campanitas

- [x] `back/src/views/partials/header.ejs`: unificados los dos botones 🔔 separados (alertas de admin + notificaciones propias) en un solo wrapper `#notificaciones-wrapper` / botón `#notificaciones-btn` / dropdown `#notificaciones-dropdown`, con dos secciones dentro (`#alertas-lista`, solo visible si `user.rol === 'admin'`, y `#mis-notificaciones-lista`, para todos) y un único badge combinado `#notificaciones-badge`
- [x] Crear `back/src/public/js/notificaciones.js`: centraliza `window.notifCounts = { alertas, mias }` y `window.actualizarBadgeNotificaciones()` (suma ambos contadores y muestra/oculta el badge), y maneja el toggle de apertura/cierre del dropdown nuevo, disparando el evento `notificaciones:abiertas` al abrir
- [x] `alertas.js` y `misNotificaciones.js`: ya no pintan su propio badge — actualizan `window.notifCounts.alertas` / `window.notifCounts.mias` y llaman a `window.actualizarBadgeNotificaciones()`
- [x] `back/src/views/partials/head.ejs`: agregado `<script src="/js/notificaciones.js?v=1">` antes de `alertas.js` y `misNotificaciones.js` (define `window.notifCounts` antes de que los otros dos lo usen)

#### DB / Migración — historial del asistente

- [x] Crear `back/migrations/010_crear_asistente_mensajes.sql`: `CREATE TABLE asistente_mensajes (id SERIAL PRIMARY KEY, id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, rol VARCHAR(10) NOT NULL CHECK (rol IN ('sol', 'asistente')), texto TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW())` + `CREATE INDEX idx_asistente_mensajes_usuario ON asistente_mensajes(id_usuario, created_at)`
- [x] Ejecutar la migración en producción (Render) — confirmado por Juanma, ya corrida

#### Backend — historial persistente del asistente

- [x] Crear `back/src/api/models/asistenteMensajeModel.js` con `guardarMensaje(idUsuario, rol, texto)`, `getUltimosMensajes(idUsuario, limit=40)` (trae los últimos N ordenados por `created_at DESC` y los devuelve en orden cronológico con `.reverse()`) y `vaciarMensajes(idUsuario)`
- [x] `back/src/api/controllers/asistenteController.js`: agregar `getHistorial` (devuelve `{ rol, texto }` por mensaje), `guardarTurno` (valida `rol` ∈ `['sol', 'asistente']` y `texto` no vacío antes de insertar) y `vaciarHistorial`
- [x] `back/src/api/routes/asistenteRoutes.js`: agregar `GET /asistente/historial`, `POST /asistente/historial`, `POST /asistente/historial/vaciar` — las tres con `requireAdmin` (mismo gate que el resto de las rutas del asistente)

#### Frontend — refactor del asistente a core reusable + widget flotante

- [x] Extraer toda la lógica de conexión Gemini Live, captura/reproducción de audio y tool-calling desde `back/src/public/js/asistente.js` a un factory nuevo y reusable, `back/src/public/js/asistenteCore.js` (`crearAsistenteChat(elementos)`), que recibe los elementos del DOM (`btnMic`, `estadoEl`, `chatEl`, `formTexto`, `inputTexto`, `inputImagen`, `btnVaciar`) por parámetro para no atarse a IDs fijos
- [x] `asistenteCore.js` — al conectar (`conectar()`): antes de nada, hace `fetch('/asistente/historial')`, pinta cada mensaje guardado como burbuja en el chat, y si hay mensajes cebea el contexto de la sesión de Gemini Live con `session.sendClientContent({ turns: mensajes.map(...), turnComplete: false })` (en vez de la alternativa `sessionResumption` de la SDK)
- [x] `asistenteCore.js` — al recibir un turno completo (`flushTranscripciones`), además de pintar la burbuja hace `POST /asistente/historial` por cada mensaje (`rol: 'sol'` / `rol: 'asistente'`) para persistirlo
- [x] `asistenteCore.js` — botón `btnVaciar` (opcional, solo si el elemento existe): `POST /asistente/historial/vaciar`, limpia el chat en el DOM y cierra la sesión de Gemini Live activa (`session.close()`) para no arrastrar contexto viejo
- [x] `back/src/public/js/asistente.js` (página completa `/asistente`): reescrito para instanciar `crearAsistenteChat` con los IDs existentes (`btnMic`, `estadoAsistente`, `chat`, `formTexto`, `inputTexto`, `inputImagen`, `btnVaciarAsistente`)
- [x] Crear `back/src/public/js/asistenteWidget.js`: instancia `crearAsistenteChat` con los IDs del widget (`widget-btnMic`, `widget-estadoAsistente`, `widget-chat`, etc.) y maneja el toggle de abrir/cerrar el panel flotante (`asistente-burbuja` / `asistente-panel` / `asistente-cerrar`)
- [x] `back/src/views/partials/footer.ejs` (antes vacío, sin uso): agregado el HTML del widget (burbuja 💗 + panel con header, botón vaciar, chat, form de texto e input de imagen), gateado con `<% if (typeof user !== 'undefined' && user && user.rol === 'admin') { %>` y el `<script type="module" src="/js/asistenteWidget.js?v=1">`
- [x] `footer.ejs` incluido en las ~41 vistas admin/empleadas del proyecto (agenda, clientes, servicios, reportes, láser, landing, fichas, empleados, usuarios, perfil, mi-panel, asistente, etc.) para que el widget esté disponible en toda la app, no solo en `/asistente`

#### Frontend — reorganización de navegación

- [x] `back/src/views/partials/sidebar.ejs`: los links "Lifting" y "Extensiones" agrupados en un desplegable nuevo "💅 Lashista" (`.sidebar-group` / `.sidebar-submenu`, con toggle JS que recuerda el estado abierto si hay un link activo adentro); se agregó el mismo desplegable al menú de empleadas cuando `user.email === 'mili@centro.com'`
- [x] `sidebar.ejs`: los links "Empleados" y "Usuarios" se sacaron del nav principal de admin (se movieron al dropdown de cuenta del header)
- [x] `back/src/views/partials/header.ejs`: el botón "Cerrar sesión" suelto se reemplazó por un avatar circular (`#cuenta-btn`, foto o inicial) con dropdown `#cuenta-dropdown`: "Mi Perfil" (todos), "Usuarios" + "Empleados" (solo `user.rol === 'admin'`), "Cerrar sesión". Mismo patrón de wrapper/dropdown para admin y empleadas.
- [x] Crear `back/src/public/js/cuenta.js`: maneja el toggle de apertura/cierre de `#cuenta-dropdown` y lo cierra al hacer click fuera de `#cuenta-wrapper` (mismo patrón que `notificaciones.js`)
- [x] `back/src/views/partials/head.ejs`: agregado `<script src="/js/cuenta.js?v=1">`

#### Cache busting

- [x] `back/src/views/partials/head.ejs`: bumpeadas las versiones `?v=` de los assets que cambiaron de contenido en esta sesión — `styles.css` a `v5`, `alertas.js` a `v4`, `misNotificaciones.js` a `v2`; agregados `notificaciones.js?v=1` y `cuenta.js?v=1` (nuevos)
- [x] `back/src/views/asistente/index.ejs`: `asistente.js` a `v1` (bump por el refactor a `asistenteCore.js`, aunque el nombre de archivo no cambió el contenido sí)
- [x] Justificación: el servidor sirve estáticos con `maxAge: process.env.NODE_ENV === "production" ? "7d" : 0` (`back/index.js`), así que sin bump de versión el navegador podía seguir sirviendo la versión cacheada vieja de esos archivos en producción hasta por 7 días

---

### A revisar

- No se verificó en producción con datos reales que `/reportes/anual` muestre los mismos números que antes del refactor de `verReporteAnual` — se validó por lectura de código (el helper `calcularDatosReportes` ya se usaba en `/reportes` con la misma lógica), no probado en vivo contra la base real.
- No se probó el prefill de contexto del asistente (`session.sendClientContent` con el historial) mezclado con audio real en el navegador — solo se validó con un script de prueba de texto contra la API real de Gemini Live, antes de implementarlo en `asistenteCore.js`.
- `docs/ai/db_schema_dump.sql` no se regeneró todavía con la tabla `asistente_mensajes` nueva.

---

### Notas

#### Decisiones tomadas

- **Causa real del bug de apodos:** no era un problema de "diminutivos" en el sentido humano — en la base, el campo `nombre` de una empleada ya es literalmente `"mili"` (no `"Milagros"` ni ninguna forma "formal"). El asistente fallaba porque intentaba adivinar y buscar una versión formal inventada que no existe en la DB. La solución no es lingüística, es de proceso: traer el roster real primero (`consultarEmpleados`) y comparar contra eso, nunca inventar.
- **`sendClientContent` en vez de `sessionResumption`:** para reinyectar el historial guardado al reconectar, se evaluó usar `sessionResumption` de la SDK de Gemini Live (retomar la sesión nativa) contra cebear el contexto manualmente con `session.sendClientContent({ turns, turnComplete: false })`. Se eligió la segunda opción a propósito: permite mostrar el historial como burbujas de chat reales en el DOM (no solo continuar la sesión "a ciegas") y que el botón "vaciar chat" tenga un efecto literal (borra las filas de `asistente_mensajes` y cierra la sesión de Gemini Live activa, sin arrastrar nada). Se validó el comportamiento de `sendClientContent` con un script de prueba de texto contra la API real antes de escribir el código final.
- **Widget solo para admin, no para empleadas:** el widget flotante en `footer.ejs` está gateado por `user.rol === 'admin'`, igual que la ruta `/asistente/*` (`requireAdmin`). No hay asistente de voz disponible desde `/mi-panel`.
- **No se unificó el modelo de datos de las dos campanitas, solo la presentación:** `alertas.js` (admin, con expiración en `localStorage`) y `misNotificaciones.js` (todos, persistente en DB) siguen siendo sistemas de datos separados — la unificación de esta sesión fue puramente visual (un botón, un dropdown con dos secciones, un badge combinado vía `window.notifCounts`), no se tocó la lógica de negocio de ninguno de los dos.
- Cache busting: se bumpearon únicamente las versiones de los archivos que cambiaron de contenido en esta sesión (criterio ya establecido en la sección "Mi Perfil, notificaciones y ajustes varios"), no todos los `?v=` del proyecto.

#### Pregunta abierta

- El límite de `getUltimosMensajes` (40 mensajes) no es configurable desde ningún lado — a diferencia de `getNotificacionesPorUsuario`, que ahora pagina. Si el historial de una conversación larga con el asistente crece mucho, hoy se corta en los últimos 40 sin forma de ver los anteriores. Evaluar si hace falta paginar el historial del asistente también, o si alcanza con "vaciar chat" cuando se acumula.
