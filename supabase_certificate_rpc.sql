-- New formatting + logo columns
ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS body_align TEXT DEFAULT 'center';
ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS title_size TEXT DEFAULT '2xl';
ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS body_size TEXT DEFAULT 'sm';
ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS name_font TEXT DEFAULT 'serif';
ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS logo_url  TEXT DEFAULT '';

-- Upsert RPC (bypasses RLS)
CREATE OR REPLACE FUNCTION upsert_certificate_template(p_data JSONB)
RETURNS certificate_templates
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_result certificate_templates;
BEGIN
  IF (p_data->>'id') IS NOT NULL THEN
    UPDATE certificate_templates SET
      title          = p_data->>'title',
      institution    = p_data->>'institution',
      body_text      = p_data->>'body_text',
      signature_name = COALESCE(p_data->>'signature_name', ''),
      signature_title= COALESCE(p_data->>'signature_title', ''),
      footer_text    = COALESCE(p_data->>'footer_text', ''),
      body_align     = COALESCE(p_data->>'body_align', 'center'),
      title_size     = COALESCE(p_data->>'title_size', '2xl'),
      body_size      = COALESCE(p_data->>'body_size', 'sm'),
      name_font      = COALESCE(p_data->>'name_font', 'serif'),
      logo_url       = COALESCE(p_data->>'logo_url', ''),
      updated_at     = NOW()
    WHERE id = (p_data->>'id')::INTEGER
    RETURNING * INTO v_result;
  ELSE
    INSERT INTO certificate_templates (
      city_id, title, institution, body_text,
      signature_name, signature_title, footer_text,
      body_align, title_size, body_size, name_font, logo_url
    ) VALUES (
      CASE WHEN p_data->>'city_id' IS NULL THEN NULL ELSE (p_data->>'city_id')::INTEGER END,
      p_data->>'title',
      p_data->>'institution',
      p_data->>'body_text',
      COALESCE(p_data->>'signature_name', ''),
      COALESCE(p_data->>'signature_title', ''),
      COALESCE(p_data->>'footer_text', ''),
      COALESCE(p_data->>'body_align', 'center'),
      COALESCE(p_data->>'title_size', '2xl'),
      COALESCE(p_data->>'body_size', 'sm'),
      COALESCE(p_data->>'name_font', 'serif'),
      COALESCE(p_data->>'logo_url', '')
    )
    RETURNING * INTO v_result;
  END IF;
  RETURN v_result;
END;
$$;
