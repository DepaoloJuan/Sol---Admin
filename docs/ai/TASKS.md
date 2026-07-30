# Roadmap — Sol Cantero

_Este archivo lo mantiene el agente `roadmap`. Cada feature nueva se agrega como una sección propia._

---

## Método de pago en turnos — iniciado 2026-07-17

Registrar si un turno se cobró en efectivo, transferencia o mixto (parte de cada uno). El registro ocurre al marcar el turno como cobrado/actualizado, no al crearlo. Requiere nueva tabla `turno_pagos` para soportar el caso mixto (múltiples registros por turno).

---

### Pasos

#### DB / Migración

- [x] Crear script SQL `back/migrations/001_crear_turno_pagos.sql` con:
  - `CREATE TABLE turno_pagos (id SERIAL PRIMARY KEY, turno_id BIGINT NOT NULL REFERENCES turnos(id) ON DELETE CASCADE, metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('efectivo', 'transferencia')), monto NUMERIC(12,2) NOT NULL)`
  - `CREATE INDEX idx_turno_pagos_turno_id ON turno_pagos(turno_id)`
- [x] Crear script SQL `back/migrations/002_migrar_pagos_historicos.sql` que inserte en `turno_pagos` un registro por cada turno existente que tenga `monto_abonado > 0`, usando `metodo = 'efectivo'` y `monto = monto_abonado` — solo para no dejar datos inconsistentes desde el día uno
- [ ] Ejecutar ambos scripts en producción (Render) y verificar que el conteo de filas en `turno_pagos` coincide con los turnos migrados — **manual, pendiente, no se ejecuta desde acá**

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
- [x] En `back/src/utils/reporteHelpers.js`, función `calcularDatosDashboard`: ídem — agregar `totalEfectivo` y `totalTransferencia` al objeto `resumen` para que el dashboard pueda mostrar el desglose del mes actual
- [x] En `reporteController.js`, función `verReporteAnual`: el cálculo mes a mes está inline en el controller (no delega a un helper). Agregar la suma de `totalEfectivo` y `totalTransferencia` dentro del `Promise.all` de meses, y exponerlos en el objeto que se pasa a la vista `reportes/anual`

#### Frontend — vistas de reportes

- [x] En `back/src/views/reportes/index.ejs`: debajo del total cobrado (`totalCobrado`), agregar una línea desglosada: "Efectivo: $X / Transferencia: $Y" usando los nuevos campos del `resumen`
- [x] En `back/src/views/reportes/anual.ejs`: agregar columnas `Efectivo` y `Transferencia` en la tabla mensual (modo detalle de un año; el modo comparación de varios años queda sin estos campos para no ensanchar la grilla — ver "A revisar")
- [ ] Verificar que el dashboard (`/admin`) muestre el desglose — **`calcularDatosDashboard` no está conectada a ninguna ruta/controller actualmente (código muerto), ver "A revisar"**

---

### A revisar

- La migración histórica asume `metodo = 'efectivo'` para todos los turnos anteriores. Si Sol sabe que hubo transferencias históricas, hay que coordinar manualmente antes de correr el script.
- `getTurnoById` hoy devuelve una sola fila plana. Al agregar `pagos` como array, la vista de edición necesita lógica para interpretar si hay 1 o 2 registros y cuál es el método. Revisar que no quede lógica confusa en el EJS.
- El reporte anual calcula todo inline en `reporteController.js` (no delega a `calcularDatosReportes`). Hay una deuda técnica de duplicación — considerar refactorizar a un helper compartido, aunque no es bloqueante para esta feature.

**Implementación (rama `feature/2.0`, sin commitear todavía):**

- Los scripts de migración se ubicaron en `back/migrations/` (no en un `migrations/` en la raíz del repo), porque toda la lógica de conexión a la DB vive bajo `back/`. Confirmar que este es el path correcto antes de correrlos en Render.
- `validarMetodoPago` exige `metodo_pago` cuando `monto_abonado > 0` (no estaba explícito en el desglose original, pero sin este chequeo un cobro sin método seleccionado rompía la transacción con un 500 por el CHECK de `turno_pagos.metodo`). Con `monto_abonado = 0` no se pide método, igual que antes.
- `reportes/anual.ejs`: las columnas Efectivo/Transferencia se agregaron solo en el modo "detalle de un año". En el modo "comparación de varios años" no se agregaron para no ensanchar más una tabla que ya tiene columnas por año — evaluar si hace falta.
- `calcularDatosDashboard` (en `reporteHelpers.js`) ya tiene `totalEfectivo`/`totalTransferencia`, pero **la función no está conectada a ninguna ruta ni controller actualmente** (no hay un `dashboardController` que la use) — es código muerto previo a esta feature. No se conectó porque está fuera del alcance original; si el dashboard de `/admin` debe mostrar el desglose, hace falta ubicar qué controller renderiza `/admin` y cablearla ahí.
- Nada de esto se commiteó ni se pusheó — queda en el working tree de `feature/2.0` para revisión antes de commitear.

---

### Notas

#### Decisiones tomadas

- **Validación del pago mixto:** el pago mixto describe la composición del monto cobrado *en ese momento* (puede ser una seña o un saldo parcial), nunca el costo total del turno. Es exactamente el mismo modelo que ya usa `monto_abonado` hoy: el turno puede estar parcialmente cobrado sin problema. La validación en `validarMetodoPago` es: ambos montos positivos + `monto_efectivo + monto_transferencia === monto_abonado`. No hay que comparar contra `costo`.

- **No existe "un pago cubre varios turnos":** la secretaria siempre cobra turno por turno, incluso cuando salda varios turnos el mismo día. No hay caso de uso donde un pago cubra múltiples turnos a la vez. Esto descarta cualquier necesidad de lógica de distribución de pagos entre turnos.

#### Decisiones de diseño fijas

- Los valores válidos de `metodo` en `turno_pagos` son `'efectivo'` y `'transferencia'` (el caso mixto no es un método en sí, sino dos registros). Esto ya está decidido por el esquema de tabla propuesto.
- No hay ruta separada de "cobrar turno" — el cobro se hace editando el turno desde `/turnos/:id/editar`. Todo el flujo de método de pago va dentro del `actualizarTurno` existente.
- La tabla `turno_pagos` tiene `ON DELETE CASCADE` sobre `turnos(id)`, así que eliminar un turno borra automáticamente sus pagos sin lógica extra en el modelo.
