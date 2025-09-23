import React from 'react';
import Card from '../components/Card';
import Field from '../components/Field';
import PublicHeader from '../components/PublicHeader';
import { Palette, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import type { StoreForm } from './InfoTab';

const ThemeTab: React.FC<{
  info: StoreForm;
  primary: string; secondary: string;
  onPrimary: (v: string) => void; onSecondary: (v: string) => void;
  logoUrl: string | null; coverUrl: string | null;
  onLogo: (v: string | null) => void; onCover: (v: string | null) => void;
}> = ({ info, primary, secondary, onPrimary, onSecondary, logoUrl, coverUrl, onLogo, onCover }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Personalização</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ajuste cores e imagens.</p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Cor primária"><input type="color" value={primary} onChange={(e)=>onPrimary(e.target.value)} /></Field>
            <Field label="Cor secundária"><input type="color" value={secondary} onChange={(e)=>onSecondary(e.target.value)} /></Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Logo">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-900 border overflow-hidden grid place-items-center">
                  {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-gray-400" />}
                </div>
                <label className="px-3 py-2 rounded-xl border bg-white dark:bg-gray-800 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  Trocar logo
                  <input type="file" accept="image/*" className="hidden" onChange={(e)=> {
                    const f = e.target.files?.[0]; if (!f) return; onLogo(URL.createObjectURL(f));
                  }} />
                </label>
              </div>
            </Field>

            <Field label="Capa (opcional)">
              <div className="flex items-center gap-3">
                <div className="w-28 h-16 rounded-xl bg-gray-100 dark:bg-gray-900 border overflow-hidden grid place-items-center">
                  {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-gray-400" />}
                </div>
                <label className="px-3 py-2 rounded-xl border bg-white dark:bg-gray-800 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  Trocar capa
                  <input type="file" accept="image/*" className="hidden" onChange={(e)=> {
                    const f = e.target.files?.[0]; if (!f) return; onCover(URL.createObjectURL(f));
                  }} />
                </label>
              </div>
            </Field>
          </div>

          <button
            onClick={()=>toast.success('Personalização salva (mock)')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            Salvar personalização
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <PublicHeader
          name={info.name || 'Studio Reserva'}
          address={
            (info.street || info.city || info.state || info.zip)
              ? `${info.street || ''}${info.number ? `, ${info.number}` : ''} — ${info.district || ''} ${info.city ? `• ${info.city}` : ''}`
              : 'Rua das Palmeiras, 120 — Centro'
          }
          slug={info.slug || 'sua-loja'}
          primary={primary}
          secondary={secondary}
          logoUrl={logoUrl || undefined}
          instagram={info.instagram}
          tiktok={info.tiktok}
        />
      </Card>
    </div>
  );
};

export default ThemeTab;
