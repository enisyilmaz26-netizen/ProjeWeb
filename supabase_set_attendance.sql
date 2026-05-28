CREATE OR REPLACE FUNCTION set_workshop_attendance(p_reg_id UUID, p_attended BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE workshop_registrations SET attended = p_attended WHERE id = p_reg_id;
END;
$$;
