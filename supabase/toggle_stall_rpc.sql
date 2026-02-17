-- 1. Create the RPC function to toggle stall status
CREATE OR REPLACE FUNCTION toggle_stall(p_stall_id BIGINT, p_action TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to update the table
AS $$
DECLARE
  v_user_email TEXT;
  v_is_active BOOLEAN;
BEGIN
  -- Get the email of the user calling the function
  v_user_email := auth.jwt() ->> 'email';

  -- STRICT SECURITY CHECK: Only allow Super Admin
  IF v_user_email IS DISTINCT FROM 'tejachennuru05@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden: Super Admin Access Only';
  END IF;

  -- Determine the new status
  IF p_action = 'activate' THEN
    v_is_active := TRUE;
  ELSIF p_action = 'deactivate' THEN
    v_is_active := FALSE;
  ELSE
    RAISE EXCEPTION 'Invalid action. Use activate or deactivate.';
  END IF;

  -- Update the stall
  UPDATE public.stalls
  SET is_active = v_is_active
  WHERE id = p_stall_id;

  -- Return success message
  RETURN json_build_object(
    'message', 'Stall ' || p_stall_id || ' is now ' || p_action || 'd',
    'is_active', v_is_active
  );
END;
$$;
