import { demoEquipment } from '@/lib/demo-data';
import { PageHeader, StatusBadge } from '@/components/shared/SharedComponents';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star, MapPin, Tractor, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';

export default function EquipmentMarketplace() {
  const { language } = useAuth();
  const [search, setSearch] = useState('');
  const [booked, setBooked] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const filtered = demoEquipment.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.type.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = [t('equip.all', language), 'Tractor', 'Rotavator', 'Harvester', 'Sprayer', 'Seed Drill'];
  const [activeCat, setActiveCat] = useState(t('equip.all', language));
  const catFiltered = activeCat === t('equip.all', language) ? filtered : filtered.filter(e => e.type === activeCat);

  const handleBook = (id: string, name: string) => {
    setBooked(prev => [...prev, id]);
    toast({ title: t('equip.bookingSent', language), description: t('equip.bookingDesc', language) });
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <PageHeader title={t('equip.title', language)} description={`${catFiltered.length} ${t('equip.available', language)}`}>
        <Button onClick={() => toast({ title: t('equip.listEquipment', language), description: t('equip.listSoon', language) })} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
          <Plus className="h-4 w-4" /> {t('equip.listEquipment', language)}
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder={t('equip.search', language)} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <Button key={cat} size="sm" variant={activeCat === cat ? 'default' : 'outline'} onClick={() => setActiveCat(cat)} className={`shrink-0 text-xs ${activeCat === cat ? 'bg-primary text-primary-foreground' : ''}`}>
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catFiltered.map(eq => (
          <div key={eq.id} className="rounded-xl border border-border bg-card shadow-card hover:shadow-elevated overflow-hidden">
            <div className="flex h-36 items-center justify-center bg-muted/50">
              <Tractor className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">{eq.type}</span>
                  <h3 className="text-sm font-bold text-foreground">{eq.name}</h3>
                </div>
                <StatusBadge status={eq.available ? 'active' : 'pending'} />
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {eq.location}, {eq.district}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                <div>
                  <p className="text-lg font-bold text-foreground">₹{eq.pricePerDay.toLocaleString()}</p>
                  <p className="text-muted-foreground">{t('equip.perDay', language)}</p>
                </div>
                <div className="text-right">
                  <p className="flex items-center gap-1 font-medium text-foreground"><Star className="h-3 w-3 fill-accent text-accent" /> {eq.rating}</p>
                  <p className="text-muted-foreground">{eq.reviewCount} {t('profile.reviews', language)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {eq.operatorIncluded && <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">👨‍🔧 {t('equip.operator', language)}</span>}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{eq.condition}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{eq.year}</span>
              </div>
              {booked.includes(eq.id) ? (
                <div className="mt-3 rounded-lg bg-success/10 p-2 text-center text-xs font-semibold text-success">
                  ✓ {t('equip.booked', language)}
                </div>
              ) : (
                <Button className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs" size="sm" disabled={!eq.available} onClick={() => handleBook(eq.id, eq.name)}>
                  {eq.available ? t('equip.book', language) : t('common.noResults', language)}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
