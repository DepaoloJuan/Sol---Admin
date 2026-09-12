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

---

## [2026-09-06]

**Qué se hizo:**
- Merge de la rama `fix/urgencias-sol` a `main` (PR #4, merge commit `ddc87df`, commit de contenido `7960305`): oculta la tarjeta "Horas trabajadas" en las 5 secciones de métricas de `/mi-panel` (vista de empleada), y sincroniza automáticamente el campo "% Ganancia" al reasignar un turno a otra empleada desde `/turnos/:id/editar` — antes quedaba guardado el % de la empleada anterior si no se lo editaba a mano, un bug real de integridad de datos (el backend toma ese campo tal cual del formulario, sin recalcularlo).
- Revisión hecha antes de mergear: sin cambios de modelo/migración, solo vistas EJS + JS inline; confirmado que `metricasXxx.horasTrabajadas` sigue calculándose igual en `dateHelpers.calcularMetricas` (solo se dejó de renderizar), y que `turnoController.js:132` lee `porcentaje_ganancia` literal del `req.body`, lo que confirma que el fix de frontend es necesario y suficiente para el flujo del formulario.
- De paso se detectó que el PR #3 anterior (`fix/validar-horario-turnos-30min`, commit `472ef43`, 2026-08-06 — exige horarios en punto o y media al crear/editar turnos) nunca se documentó en `TASKS.md`/`PROGRESS.md`, aunque ya está en producción. Se dejó anotado el vacío en `CONTEXT.md` ("Pendiente / sin definir") para reconstruirlo más adelante si hace falta ese nivel de detalle.

**Archivos tocados:** `back/src/views/agenda/editar.ejs`, `back/src/views/miPanel/index.ejs`, `docs/ai/CONTEXT.md`, `docs/ai/TASKS.md`.

**Pendiente / a revisar:** el fix de % ganancia solo cubre el formulario de `/turnos/:id/editar` — el mismo bug de fondo podría reaparecer si se reasigna un turno por otro camino que no pase por ese form (ej. el asistente de voz vía `geminiTools/turnos.js`), porque la corrección vive en el frontend y no en el modelo/controller. Sigue pendiente documentar en detalle el PR #3 de validación de horarios.

---

## [2026-09-11]

**Qué se hizo:**
- Bug reportado por Sol: el asistente (Gemini Live) permitía hablar pero no escribir — el texto tipeado nunca llegaba al modelo. Causa raíz: en `back/src/public/js/asistenteCore.js` el envío de texto usaba `session.sendRealtimeInput({ text: texto })`, y según la documentación del SDK `@google/genai` (verificada vía context7, librería `/googleapis/js-genai`) `sendRealtimeInput` solo acepta un campo `media` (Blob de audio/video) — no tiene campo `text`, así que el texto se descartaba en silencio sin ningún error visible. Se corrigió cambiando a `session.sendClientContent({ turns: [{ role: "user", parts: [{ text: texto }] }] })`, el método correcto del SDK para contenido que no es un Blob en vivo.
- De paso, al probar el login en local apareció un problema de infraestructura no relacionado con el código: Postgres local no estaba corriendo (`ECONNREFUSED`), lo que daba "Error interno del servidor" en el login con un log vacío (`error: ""`) porque el error real era un `AggregateError` cuyo `.message` es vacío. Es un problema de configuración de entorno local, no de código — Sol lo resolvió creando la base en local (alternativa habría sido apuntar el `.env` a Neon, que ya tenía una `DATABASE_URL` comentada).
- Feature nueva pedida en la misma rama: se renombró el botón de llamada de voz abierta (VAD, sin cambios de comportamiento) de "🎙️ Hablar" a "📞 Llamada"/"🛑 Cortar", y se agregó un botón 🎤 nuevo de nota de voz estilo WhatsApp: mantener presionado graba, soltar envía, deslizar hacia arriba (+60px) "fija" la grabación (manos-libres, con overlay ✔️ enviar / ✕ cancelar), deslizar a la izquierda (+80px) cancela sin enviar. La nota usa `audioStreamEnd: true` (señal de la Live API, confirmada también vía context7) para cortar el turno al instante en vez de esperar el VAD del servidor. Todo implementado una sola vez en `crearAsistenteChat()` (`asistenteCore.js`), compartido entre la página completa `/asistente` y el widget flotante del panel admin, sin duplicar lógica.
- `/code-review high` antes de mergear encontró 3 bugs reales + 1 duplicación, todos corregidos: (1) tocar el botón de nota mientras ya estaba fijada reseteaba el lock y terminaba cortando/enviando sin que el usuario lo pidiera; (2) `pointercancel` (el navegador interrumpe el gesto) se manejaba igual que soltar-y-enviar, en vez de descartar la nota a medias; (3) sin guard de reentrada en `iniciarGrabacionNota()`, un tap muy rápido antes de terminar `conectar()`/`getUserMedia()` podía arrancar dos grabaciones superpuestas y dejar el micrófono/AudioContext colgado; (4) duplicación casi textual del pipeline de captura PCM16 entre la llamada y la nota, extraída a un helper compartido `crearCapturaAudio()` que de paso resolvió el bug de reentrancia al centralizar el estado.

**Archivos tocados:** `back/src/public/js/asistenteCore.js`, `back/src/public/js/asistente.js`, `back/src/public/js/asistenteWidget.js`, `back/src/views/asistente/index.ejs`, `back/src/views/partials/footer.ejs`, `back/src/public/css/styles.css`, `docs/ai/CONTEXT.md`, `docs/ai/TASKS.md`, `docs/ai/PROGRESS.md`.

**Pendiente / a revisar:** PR #5 (rama `feat/asistente-input-texto`, commits `945b691` y `6151fb9`) abierto en GitHub, todavía sin mergear a `main` al momento de esta entrada. No se pudo probar en un browser real automatizado el gesto de mantener presionado/deslizar de la nota de voz (necesita permiso real de micrófono) — verificado por lectura de código y code review, falta prueba humana con el dedo o mouse real. No hay tests automatizados para ninguno de los dos flujos. Queda un edge case menor sin corregir a propósito: si se suelta el botón de nota mientras `iniciarGrabacionNota()` todavía espera `conectar()`/permiso de mic y en esa ventana se hace swipe-cancelar en vez de soltar simple, el swipe no se detecta y queda pendiente de "enviar" en vez de "cancelar" — ventana muy chica, no bloqueante.
