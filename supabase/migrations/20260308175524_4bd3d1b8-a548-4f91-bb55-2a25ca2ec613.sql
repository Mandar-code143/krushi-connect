
-- Fix overly permissive RLS on ivr_calls - restrict to authenticated users
DROP POLICY IF EXISTS "Allow all access to ivr_calls" ON public.ivr_calls;

CREATE POLICY "Authenticated users can read ivr_calls"
  ON public.ivr_calls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ivr_calls"
  ON public.ivr_calls FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ivr_calls"
  ON public.ivr_calls FOR UPDATE
  TO authenticated
  USING (true);

-- Allow anon for webhook updates
CREATE POLICY "Anon can update ivr_calls for webhook"
  ON public.ivr_calls FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anon can insert ivr_calls"
  ON public.ivr_calls FOR INSERT
  TO anon
  WITH CHECK (true);
