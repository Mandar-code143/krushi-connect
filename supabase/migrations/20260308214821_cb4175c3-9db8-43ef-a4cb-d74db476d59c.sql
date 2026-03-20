
-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID NOT NULL,
  title TEXT NOT NULL,
  work_type TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  village TEXT DEFAULT '',
  district TEXT DEFAULT 'Pune',
  state TEXT DEFAULT 'Maharashtra',
  work_date DATE,
  start_time TEXT DEFAULT '07:00',
  duration TEXT DEFAULT '1 day',
  workers_needed INTEGER NOT NULL DEFAULT 1,
  workers_accepted INTEGER NOT NULL DEFAULT 0,
  gender_pref TEXT DEFAULT 'any',
  experience_pref TEXT DEFAULT 'any',
  urgency TEXT NOT NULL DEFAULT 'normal',
  wage_type TEXT NOT NULL DEFAULT 'daily',
  wage_amount INTEGER NOT NULL DEFAULT 450,
  food_included BOOLEAN DEFAULT true,
  transport_included BOOLEAN DEFAULT false,
  tools_provided BOOLEAN DEFAULT true,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create job_applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  farmer_notes TEXT DEFAULT '',
  worker_notes TEXT DEFAULT ''
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Jobs: everyone authenticated can read
CREATE POLICY "Anyone can read jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
-- Jobs: farmers can insert their own
CREATE POLICY "Farmers can insert own jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (farmer_id = auth.uid());
-- Jobs: farmers can update their own
CREATE POLICY "Farmers can update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (farmer_id = auth.uid());

-- Applications: workers can insert their own
CREATE POLICY "Workers can insert own applications" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid());
-- Applications: worker can read own, farmer can read for their jobs
CREATE POLICY "Read own applications or for own jobs" ON public.job_applications FOR SELECT TO authenticated USING (
  worker_id = auth.uid() OR
  job_id IN (SELECT id FROM public.jobs WHERE farmer_id = auth.uid())
);
-- Applications: farmer can update (accept/reject) for their jobs
CREATE POLICY "Farmer can update applications for own jobs" ON public.job_applications FOR UPDATE TO authenticated USING (
  job_id IN (SELECT id FROM public.jobs WHERE farmer_id = auth.uid())
);

-- Enable realtime for jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;

-- Create avatar storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policy: users can upload own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
