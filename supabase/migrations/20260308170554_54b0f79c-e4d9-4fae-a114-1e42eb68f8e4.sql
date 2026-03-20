CREATE TABLE public.ivr_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid text,
  worker_name text NOT NULL,
  worker_phone text NOT NULL,
  farmer_name text NOT NULL,
  job_title text NOT NULL,
  job_date text,
  job_hours text,
  job_location text,
  job_budget text,
  status text NOT NULL DEFAULT 'queued',
  language_selected text,
  retry_count integer DEFAULT 0,
  campaign_id uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ivr_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to ivr_calls" ON public.ivr_calls FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ivr_calls;