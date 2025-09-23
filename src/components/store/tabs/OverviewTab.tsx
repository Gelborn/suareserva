import React from 'react';
import Card from '../components/Card';
import Checklist from '../components/Checklist';
import PublicHeader from '../components/PublicHeader';
import { Store, Info, Clock, Scissors, Palette, ExternalLink } from 'lucide-react';
import { TabKey } from '../components/Tabs';

import type { StoreForm } from './InfoTab';

const OverviewTab: React.FC<{
  info: StoreForm;
  logoUrl: string | null;
  primary: string;
  secondary: string;
  completeness: { filledInfo: boolean; filledHours: boolean; filledServices: boolean; filledTheme: boolean; allGood: boolean };
  goTo: (tab: TabKey) => void;
}> = ({ info, logoUrl, primary, secondary, completeness, goTo }) => {
  const address = (info.street || info.city || info.state || info.zip)
    ? `${info.street || ''}${info.number ? `, ${info.number}` : ''} — ${info.district || ''} ${info.city ? `• ${info.city}` : ''}`
    : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sua Loja</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Resumo enxuto do cabeçalho público.</p>
          </div>
        </div>

        <div className="mt-4">
          <PublicHeader
            name={info.name || 'Sua Loja'}
            address={address}
            slug={info.slug || undefined}
            primary={primary}
            secondary={secondary}
            logoUrl={logoUrl || undefined}
            instagram={info.instagram}
            tiktok={info.tiktok}
          />
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          {info.slug ? `suareserva.online/${info.slug}` : 'Defina o slug para ativar o link público'}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Checklist</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Finalize os passos para publicar.</p>
          </div>
        </div>

        <div className="mt-4">
          <Checklist
            items={[
              { ok: completeness.filledInfo,     label: 'Dados da loja',            onClick: () => goTo('info') },
              { ok: completeness.filledHours,    label: 'Horário de funcionamento', onClick: () => goTo('hours') },
              { ok: completeness.filledServices, label: 'Serviços',                 onClick: () => goTo('services') },
              { ok: completeness.filledTheme,    label: 'Personalização',           onClick: () => goTo('theme') },
            ]}
          />
        </div>
      </Card>
    </div>
  );
};

export default OverviewTab;
