import { useState, useEffect } from 'react';
import { PageHeader, StatusBadge } from '@/components/shared/SharedComponents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Phone, PhoneCall, PhoneOff, PhoneIncoming, PhoneMissed,
  CheckCircle2, XCircle, Clock, RefreshCw, Play, Pause, Plus, Trash2
} from 'lucide-react';

interface WorkerEntry {
  name: string;
  phone: string;
}

interface IVRCall {
  id: string;
  worker_name: string;
  worker_phone: string;
  status: string;
  language_selected: string | null;
  retry_count: number;
  call_sid: string | null;
  created_at: string;
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'queued': return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'calling': return <PhoneCall className="h-4 w-4 text-accent animate-pulse" />;
    case 'answered': return <PhoneIncoming className="h-4 w-4 text-primary" />;
    case 'accepted': return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'unavailable': return <PhoneMissed className="h-4 w-4 text-warning" />;
    case 'no_response': return <PhoneMissed className="h-4 w-4 text-warning" />;
    case 'failed': return <PhoneOff className="h-4 w-4 text-destructive" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'accepted': return 'border-success/20 bg-success/10 text-success';
    case 'rejected': return 'border-destructive/20 bg-destructive/10 text-destructive';
    case 'calling': return 'border-accent/20 bg-accent/10 text-accent';
    case 'answered': return 'border-primary/20 bg-primary/10 text-primary';
    case 'no_response': case 'unavailable': return 'border-warning/20 bg-warning/10 text-warning';
    case 'failed': return 'border-destructive/20 bg-destructive/10 text-destructive';
    default: return 'border-border bg-muted text-muted-foreground';
  }
};

export default function IVRPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [calls, setCalls] = useState<IVRCall[]>([]);

  // Job details
  const [jobTitle, setJobTitle] = useState('Sugarcane Harvesting');
  const [jobDate, setJobDate] = useState('१०/०३/२०२६');
  const [jobHours, setJobHours] = useState('८');
  const [jobLocation, setJobLocation] = useState(user?.village ? `${user.village}, ${user.taluka}` : 'पुणे');
  const [jobBudget, setJobBudget] = useState('५०० रुपये');

  // Workers to call
  const [workers, setWorkers] = useState<WorkerEntry[]>([
    { name: 'Test Worker', phone: '9699516587' },
  ]);

  const addWorker = () => setWorkers(prev => [...prev, { name: '', phone: '' }]);
  const removeWorker = (i: number) => setWorkers(prev => prev.filter((_, idx) => idx !== i));
  const updateWorker = (i: number, field: keyof WorkerEntry, value: string) => {
    setWorkers(prev => prev.map((w, idx) => idx === i ? { ...w, [field]: value } : w));
  };

  // Realtime subscription for call updates
  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`ivr-campaign-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ivr_calls', filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setCalls(prev => prev.map(c => c.id === (payload.new as IVRCall).id ? payload.new as IVRCall : c));
          } else if (payload.eventType === 'INSERT') {
            setCalls(prev => {
              if (prev.find(c => c.id === (payload.new as IVRCall).id)) return prev;
              return [...prev, payload.new as IVRCall];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaignId]);

  const startCampaign = async () => {
    const validWorkers = workers.filter(w => w.name && w.phone);
    if (validWorkers.length === 0) {
      toast({ title: "No workers", description: "Add at least one worker with name and phone.", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setCalls([]);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/ivr-initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workers: validWorkers,
          farmerName: user?.name || 'Farmer',
          jobTitle,
          jobDate,
          jobHours,
          jobLocation,
          jobBudget,
        }),
      });

      const data = await resp.json();

      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        setIsRunning(false);
        return;
      }

      setCampaignId(data.campaignId);

      // Fetch initial call records
      const { data: callRecords } = await supabase
        .from('ivr_calls')
        .select('*')
        .eq('campaign_id', data.campaignId);

      if (callRecords) setCalls(callRecords as IVRCall[]);

      toast({ title: "IVR Campaign Started! 📞", description: `Calling ${validWorkers.length} worker(s). Real calls are being placed.` });
    } catch (err) {
      toast({ title: "Failed to start", description: String(err), variant: "destructive" });
      setIsRunning(false);
    }
  };

  const stats = {
    total: calls.length || workers.filter(w => w.name && w.phone).length,
    calling: calls.filter(c => c.status === 'calling' || c.status === 'answered').length,
    accepted: calls.filter(c => c.status === 'accepted').length,
    rejected: calls.filter(c => c.status === 'rejected').length,
    noResponse: calls.filter(c => c.status === 'no_response' || c.status === 'unavailable').length,
    failed: calls.filter(c => c.status === 'failed').length,
  };

  const isComplete = calls.length > 0 && stats.calling === 0 && calls.every(c => c.status !== 'queued' && c.status !== 'calling' && c.status !== 'answered');

  useEffect(() => {
    if (isComplete && isRunning) {
      setIsRunning(false);
      toast({ title: "IVR Campaign Complete ✅", description: `${stats.accepted} accepted, ${stats.rejected} rejected, ${stats.noResponse} no response.` });
    }
  }, [isComplete, isRunning]);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <PageHeader title="IVR Call Center" description="Make real calls to workers about job opportunities">
        <Button
          size="sm"
          onClick={startCampaign}
          disabled={isRunning}
          className={`gap-1.5 text-xs ${isRunning ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
        >
          {isRunning ? <><Phone className="h-3.5 w-3.5 animate-pulse" /> Calling...</> : <><Play className="h-3.5 w-3.5" /> Start Campaign</>}
        </Button>
      </PageHeader>

      {/* Job Details Form */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <h3 className="text-sm font-bold text-foreground">Job Details (spoken in IVR message)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Job Title / Work Type</label>
            <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. पेरणी" className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date (दिनांक)</label>
            <Input value={jobDate} onChange={e => setJobDate(e.target.value)} placeholder="e.g. १०/१०/२०२५" className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hours (तास)</label>
            <Input value={jobHours} onChange={e => setJobHours(e.target.value)} placeholder="e.g. ८" className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Location (ठिकाण)</label>
            <Input value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="e.g. पुणे" className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Budget (बजेट)</label>
            <Input value={jobBudget} onChange={e => setJobBudget(e.target.value)} placeholder="e.g. ५०० रुपये" className="mt-1" />
          </div>
        </div>
      </div>

      {/* Workers List */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Workers to Call</h3>
          <Button variant="outline" size="sm" onClick={addWorker} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add Worker
          </Button>
        </div>
        {workers.map((w, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={w.name}
              onChange={e => updateWorker(i, 'name', e.target.value)}
              placeholder="Worker name"
              className="flex-1"
            />
            <Input
              value={w.phone}
              onChange={e => updateWorker(i, 'phone', e.target.value)}
              placeholder="Phone (10 digits)"
              className="flex-1"
            />
            {workers.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeWorker(i)} className="shrink-0 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground">
          ⚠️ Twilio free trial: Only verified numbers will receive calls. Verify numbers at{' '}
          <a href="https://console.lio.com/us1/develop/phone-numbers/manage/verified" target="_blank" rel="noopener" className="underline text-primary">
            Twilio Console
          </a>
        </p>
      </div>

      {/* Stats */}
      {calls.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {[
              { label: 'Total', value: stats.total, color: 'text-foreground' },
              { label: 'Calling', value: stats.calling, color: 'text-accent' },
              { label: 'Accepted', value: stats.accepted, color: 'text-success' },
              { label: 'Rejected', value: stats.rejected, color: 'text-destructive' },
              { label: 'No Answer', value: stats.noResponse, color: 'text-warning' },
              { label: 'Failed', value: stats.failed, color: 'text-destructive' },
            ].map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-medium text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Campaign Progress</span>
              <span>{stats.accepted + stats.rejected + stats.noResponse + stats.failed}/{stats.total} completed</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {stats.total > 0 && <>
                <div className="bg-success transition-all" style={{ width: `${(stats.accepted / stats.total) * 100}%` }} />
                <div className="bg-destructive transition-all" style={{ width: `${(stats.rejected / stats.total) * 100}%` }} />
                <div className="bg-warning transition-all" style={{ width: `${(stats.noResponse / stats.total) * 100}%` }} />
                <div className="bg-accent transition-all" style={{ width: `${(stats.calling / stats.total) * 100}%` }} />
              </>}
            </div>
            <div className="mt-1 flex gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Accepted</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Rejected</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> No Answer</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Calling</span>
            </div>
          </div>

          {/* Call Log */}
          <div className="rounded-xl border border-border bg-card shadow-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-bold text-foreground">Live Call Log</h3>
            </div>
            <div className="divide-y divide-border">
              {calls.map(call => (
                <div key={call.id} className={`flex items-center gap-3 px-4 py-3 ${call.status === 'calling' || call.status === 'answered' ? 'bg-accent/5' : ''}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {statusIcon(call.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{call.worker_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {call.worker_phone}
                      {call.language_selected && ` • Lang: ${call.language_selected === 'mr' ? 'मराठी' : call.language_selected === 'hi' ? 'हिंदी' : 'English'}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColor(call.status)}`}>
                      {call.status === 'calling' && '📞 '}
                      {call.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* IVR Flow Info */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="text-sm font-bold text-foreground mb-2">📞 IVR Call Flow</h3>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Worker receives call → Language menu plays</li>
          <li>"Press 1 for English, 2 for Hindi, 3 for Marathi"</li>
          <li>Job details spoken in selected language (farmer name, job, date, location, budget)</li>
          <li>Worker presses: 1=Accept, 2=Reject, 3=Unavailable</li>
          <li>Response recorded & shown in real-time above</li>
        </ol>
      </div>
    </div>
  );
}
