-- Crea la tabla push_subscriptions para guardar las suscripciones de Web Push
-- de cada usuario (admin o empleada). Un usuario puede tener varias
-- suscripciones (celular + compu).
CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
