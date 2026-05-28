CREATE TABLE IF NOT EXISTS certificate_templates (
  id SERIAL PRIMARY KEY,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'KATILIM SERTİFİKASI',
  institution TEXT NOT NULL DEFAULT 'Millî Eğitim Bakanlığı ÖGEDEP',
  body_text TEXT NOT NULL DEFAULT '"{{atolye}}" başlıklı atölyeye {{tarih}} tarihinde katılmış olduğunuz tescil edilmiştir.',
  signature_name TEXT DEFAULT '',
  signature_title TEXT DEFAULT '',
  footer_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
