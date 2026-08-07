# Bitácora de Progreso — Sol Cantero

_Este archivo lo mantiene el agente `bitacora`. No editar el formato manualmente, solo dejar que el agente agregue entradas._

<!-- Las entradas nuevas se agregan al final del archivo -->
## [2026-08-06]

**Qué se hizo:**
- Merge de la rama `fidelizacion` a `main` (PR #2, commit `c888eaa`), trayendo todo el backend del programa de fidelización de clientas: login con Google y con email+contraseña (con reseteo de contraseña por mail), sellos por turno pagado, ruleta de premios, canje de premios en persona, cola de revisión manual de vinculaciones, fecha de lanzamiento configurable, servicios habilitados para sumar sello, reglas de premios configurables por ciclo/tarjeta y sello manual.
- Incluye 5 fixes de seguridad aplicados sobre la sesión de fidelización: rate limiting, sesión deslizante, corrección de race conditions y verificación de token de Google en el servidor (server-side).
- Commit posterior `0837baf` (docs) actualiza `docs/ai/CONTEXT.md` para reflejar que las variables de entorno de Render y la migración 011 ya estaban corridas en Neon, y agrega `.atl` y `.codegraph` al `.gitignore`.
- Cierre de la unidad de trabajo en producción (no es un commit de este repo, es estado real de infra): la migración `back/migrations/011_crear_fidelizacion.sql` se corrió manualmente contra Neon (base de producción) y se verificó. Las variables de entorno en Render (`GOOGLE_CLIENT_ID`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`) ya están configuradas. Con esto, la feature de fidelización quedó 100% desplegada en producción al 2026-08-06, no solo mergeada en git.

**Archivos tocados:** `back/src/api/controllers/fidelidadController.js`, `back/src/api/controllers/landingCuentaController.js`, `back/src/api/models/fidelidadModel.js`, `back/src/api/models/landingCuentaModel.js`, `back/src/api/routes/fidelidadRoutes.js`, `back/src/api/routes/landingCuentaRoutes.js`, `back/src/api/middlewares/clientaMiddleware.js`, `back/src/utils/fidelidadHelper.js`, `back/src/utils/emailHelper.js`, `back/migrations/011_crear_fidelizacion.sql`, vistas `back/src/views/fidelidad/*.ejs`, `docs/ai/CONTEXT.md`.

**Pendiente / a revisar:** no se pudo determinar desde git si quedó algún ítem abierto puntual de la feature (no hay TODOs explícitos en los commits revisados); a confirmar en `docs/ai/TASKS.md` si corresponde tildar algo.
