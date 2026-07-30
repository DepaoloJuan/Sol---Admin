-- Historial de notificaciones push recibidas por cada usuario, para poder
-- verlas dentro de la app (hoy solo llegan como push del sistema operativo,
-- sin ningun lugar donde revisarlas despues).
CREATE TABLE notificaciones (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  cuerpo TEXT,
  url TEXT,
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(id_usuario);
