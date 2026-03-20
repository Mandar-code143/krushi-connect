
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Farmers can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Farmers can update own jobs" ON public.jobs;

CREATE POLICY "Anyone can read jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Farmers can insert own jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (farmer_id = auth.uid());
CREATE POLICY "Farmers can update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (farmer_id = auth.uid());

DROP POLICY IF EXISTS "Workers can insert own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Read own applications or for own jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Farmer can update applications for own jobs" ON public.job_applications;

CREATE POLICY "Workers can insert own applications" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid());
CREATE POLICY "Read own applications or for own jobs" ON public.job_applications FOR SELECT TO authenticated USING (
  worker_id = auth.uid() OR job_id IN (SELECT id FROM public.jobs WHERE farmer_id = auth.uid())
);
CREATE POLICY "Farmer can update applications for own jobs" ON public.job_applications FOR UPDATE TO authenticated USING (
  job_id IN (SELECT id FROM public.jobs WHERE farmer_id = auth.uid())
);
