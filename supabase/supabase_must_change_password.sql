-- Kullanıcıların admin tarafından şifre sıfırlandıktan sonra
-- zorunlu şifre değiştirme yapmasını sağlayan kolon
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
