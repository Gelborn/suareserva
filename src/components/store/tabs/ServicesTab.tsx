import React from 'react';
import Card from '../components/Card';
import Field from '../components/Field';
import { Scissors, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export type ServiceItem = { id: string; name: string; price: number; minutes: number };

const ServicesTab: React.FC<{
  services: ServiceItem[];
  onChange: (next: ServiceItem[]) => void;
}> = ({ services, onChange }) => {
  const [draft, setDraft] = React.useState<ServiceItem>({ id: '', name: '', price: 0, minutes: 30 });

  const add = () => {
    if (!draft.name || !draft.minutes) return toast.error('Informe nome e duração');
    const id = Math.random().toString(36).slice(2);
    onChange([...services, { ...draft, id }]);
    setDraft({ id: '', name: '', price: 0, minutes: 30 });
    toast.success('Serviço adicionado');
  };

  const remove = (id: string) => {
    onChange(services.filter(s => s.id !== id));
  };

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <Scissors className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Serviços</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Cadastre o que você oferece (nome, duração e preço).</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <Card className="lg:col-span-2 p-4">
          <div className="space-y-3">
            {services.length === 0 && (
              <div className="text-sm text-gray-500">Nenhum serviço cadastrado ainda.</div>
            )}
            {services.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-gray-600">R$ {s.price} · {s.minutes} min</div>
                </div>
                <button onClick={()=>remove(s.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Form rápido */}
        <Card className="p-4">
          <div className="font-medium mb-3">Adicionar serviço</div>
          <div className="space-y-3">
            <Field label="Nome do serviço">
              <input
                className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2"
                placeholder="Corte masculino"
                value={draft.name}
                onChange={e=>setDraft({...draft, name: e.target.value})}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duração (min)">
                <select
                  className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2"
                  value={draft.minutes}
                  onChange={e=>setDraft({...draft, minutes: parseInt(e.target.value, 10)})}
                >
                  {[15, 20, 30, 45, 60, 75, 90, 120].map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Preço (R$)">
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-2"
                  value={draft.price}
                  onChange={e=>setDraft({...draft, price: Number(e.target.value)})}
                />
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={add} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                <Plus className="w-4 h-4" /> Adicionar serviço
              </button>
              <button onClick={()=>toast.success('Serviços salvos (mock)')} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm">
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>
          </div>
        </Card>
      </div>
    </Card>
  );
};

export default ServicesTab;
