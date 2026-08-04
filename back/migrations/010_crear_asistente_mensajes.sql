CREATE TABLE asistente_mensajes (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol VARCHAR(10) NOT NULL CHECK (rol IN ('sol', 'asistente')),
  texto TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asistente_mensajes_usuario ON asistente_mensajes(id_usuario, created_at);
