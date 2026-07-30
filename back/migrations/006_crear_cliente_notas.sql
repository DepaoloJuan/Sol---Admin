-- Anotaciones con fecha en el historial de cada clienta (múltiples entradas,
-- no un campo único). Guarda quién la escribió; si ese usuario se borra más
-- adelante, la anotación se conserva sin autor identificado.
CREATE TABLE cliente_notas (
  id SERIAL PRIMARY KEY,
  id_cliente INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  id_usuario INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cliente_notas_cliente_id ON cliente_notas(id_cliente);
