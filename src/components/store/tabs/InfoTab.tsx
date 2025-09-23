import React from 'react';
import Card from '../components/Card';
import Field from '../components/Field';
import { Info } from 'lucide-react';
import toast from 'react-hot-toast';

export type StoreForm = {
  name: string; slug: string;
  street?: string; number?: string; district?: string; city?: string; state?: string; zip?: string;
  instagram?: string; tiktok?: string;
};

const prettyUrl = (s?: string) =>
  (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const InfoTab: React.FC<{
  value: StoreForm;
  onChange: (v: StoreForm) => void;
}> = ({ value, onChange }) => {
  const set = (k: keyof StoreForm, v: string) => onChange({ ...value, [k]: v });

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Dados da loja</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Essas informações aparecem no seu site e ajudam clientes a te encontrar.</p>
        </div>
      </div>

      <form
        onSubmit={(e)=>{ e.preventDefault(); toast.success('Dados salvos (mock)'); }}
        className="mt-5 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome da loja">
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2"
                   placeholder="Ex.: BarberShop Centro"
                   value={value.name} onChange={e=>set('name', e.target.value)} />
          </Field>
          <Field label="Slug (URL pública)" hint={`suareserva.online/${value.slug || 'sua-loja'}`}>
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2"
                   placeholder="barbershop-centro"
                   value={value.slug} onChange={e=>set('slug', e.target.value)}
                   onBlur={(e)=> e.currentTarget.value && set('slug', prettyUrl(e.currentTarget.value))} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <Field label="CEP (autofill em breve)">
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2" value={value.zip || ''} onChange={e=>set('zip', e.target.value)} />
          </Field>
          <Field label="Rua">
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2" value={value.street || ''} onChange={e=>set('street', e.target.value)} />
          </Field>
          <Field label="Número">
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2" value={value.number || ''} onChange={e=>set('number', e.target.value)} />
          </Field>
          <Field label="Bairro">
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2" value={value.district || ''} onChange={e=>set('district', e.target.value)} />
          </Field>
          <Field label="Cidade">
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2" value={value.city || ''} onChange={e=>set('city', e.target.value)} />
          </Field>
          <Field label="Estado">
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2" value={value.state || ''} onChange={e=>set('state', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Instagram (URL)">
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2"
                   placeholder="https://instagram.com/sualoja"
                   value={value.instagram || ''} onChange={e=>set('instagram', e.target.value)} />
          </Field>
          <Field label="TikTok (URL)">
            <input className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2"
                   placeholder="https://www.tiktok.com/@sualoja"
                   value={value.tiktok || ''} onChange={e=>set('tiktok', e.target.value)} />
          </Field>
        </div>

        <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium">Salvar dados</button>
      </form>
    </Card>
  );
};

export default InfoTab;
