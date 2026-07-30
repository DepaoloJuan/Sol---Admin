-- Migra los turnos históricos con monto_abonado > 0 a turno_pagos, asumiendo
-- 'efectivo' porque no hay registro previo del método usado. Si Sol confirma
-- que hubo transferencias históricas, corregir manualmente esos registros
-- después de correr este script (ver nota en docs/ai/TASKS.md).
INSERT INTO turno_pagos (turno_id, metodo, monto)
SELECT id, 'efectivo', monto_abonado
FROM turnos
WHERE monto_abonado > 0;
