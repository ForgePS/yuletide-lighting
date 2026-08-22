import { TRUST_STATS } from '@/lib/company';
import { Shield, Zap, Calendar, Warehouse } from 'lucide-react';

const ICONS = [Shield, Zap, Calendar, Warehouse];

export function TrustBar() {
  return (
    <section className="border-y border-border/60 bg-[#0c1222] py-12 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
        {TRUST_STATS.map((stat, i) => {
          const Icon = ICONS[i] ?? Shield;
          return (
            <div key={stat.label} className="text-center">
              <Icon className="mx-auto h-6 w-6 text-amber-400" />
              <p className="font-display mt-3 text-2xl font-bold text-amber-200">{stat.value}</p>
              <p className="mt-1 text-sm text-white/60">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
