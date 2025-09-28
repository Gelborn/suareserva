import React from 'react';
import Card from '../components/Card';
import Field from '../components/Field';
import { Info, MapPin, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export type StoreForm = {
  name: string;
  // slug não aparece aqui
  slug?: string;
  street?: string; number?: string; district?: string; city?: string; state?: string; zip?: string;
  instagram?: string; tiktok?: string;
};

const onlyDigits = (s: string) => (s || '').replace(/\D+/g, '');
const formatCep = (s: string) => {
  const d = onlyDigits(s).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};
const normalizeHandle = (s?: string) => (s || '').trim()
  .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '@')
  .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '@')
  .replace(/^@+/, '@')
  .replace(/\s+/g, '');

const InfoTab: React.FC<{
  value: StoreForm;
  onChange: (v: StoreForm) => void; // será chamado SOMENTE no submit
}> = ({ value, onChange }) => {
  // ------- estado local (edita sem salvar) -------
  const [form, setForm] = React.useState<StoreForm>(value);
  const [cepMasked, setCepMasked] = React.useState(formatCep(value.zip || ''));
  const [loadingCep, setLoadingCep] = React.useState(false);
  const numberRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // se value mudar externamente (ex: pós-salvar), sincroniza
    setForm(value);
    setCepMasked(formatCep(value.zip || ''));
  }, [value]);

  const setLocal = (k: keyof StoreForm, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const hasLoadedAddress =
    !!form.street || !!form.district || !!form.city || !!form.state;

  const oneLiner = React.useMemo(() => {
    const ruaNumero = [form.street, form.number].filter(Boolean).join(', ');
    const bairroCidade = [form.district, form.city].filter(Boolean).join(' / ');
    const parts = [ruaNumero || null, bairroCidade || null].filter(Boolean);
    return parts.length ? parts.join('. ') : '';
  }, [form.street, form.number, form.district, form.city]);

  const handleLoadAddress = async () => {
    const clean = onlyDigits(cepMasked);
    if (clean.length !== 8) {
      toast.error('Informe um CEP válido (8 dígitos).');
      return;
    }
    try {
      setLoadingCep(true);
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!res.ok) throw new Error('Falha na consulta do CEP');
      const data = await res.json();

      if (data?.erro) {
        toast.error('CEP não encontrado.');
        return;
      }

      // preenche campos a partir do ViaCEP; número fica para o usuário
      setForm(prev => ({
        ...prev,
        zip: formatCep(clean),
        street: data?.logradouro ?? '',
        district: data?.bairro ?? '',
        city: data?.localidade ?? '',
        state: data?.uf ?? '',
      }));

      setTimeout(() => numberRef.current?.focus(), 0);
      toast.success('Endereço carregado!');
    } catch {
      toast.error('Não foi possível carregar o endereço.');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleClearAddress = () => {
    setForm(prev => ({
      ...prev,
      street: '',
      district: '',
      city: '',
      state: '',
      number: '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // chama o onChange APENAS aqui -> quem chama persiste no banco
    onChange({
      ...form,
      instagram: normalizeHandle(form.instagram),
      tiktok: normalizeHandle(form.tiktok),
      zip: formatCep(form.zip || ''),
      state: (form.state || '').toUpperCase(),
    });
    toast.success('Dados salvos!');
  };

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700">
          <Info className="w-5 h-5 text-gray-700 dark:text-slate-200" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Dados da loja</h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Essas informações aparecem no seu site e ajudam clientes a te encontrar.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        {/* Nome */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome da loja">
            <input
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                         px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="Ex.: BarberShop Centro"
              value={form.name || ''}
              onChange={(e) => setLocal('name', e.target.value)}
            />
          </Field>
          <div className="hidden sm:block" />
        </div>

        {/* Endereço - ViaCEP minimalista */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <MapPin className="w-4 h-4 opacity-80" />
            Endereço
          </div>

          {/* CEP + botão */}
          <div className="grid grid-cols-1 sm:grid-cols-[160px_auto_120px] gap-3">
            <Field label="CEP">
              <input
                inputMode="numeric"
                autoComplete="postal-code"
                className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                           px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                placeholder="00000-000"
                value={cepMasked}
                onChange={(e) => {
                  const m = formatCep(e.target.value);
                  setCepMasked(m);
                  // atualiza apenas o zip no estado local (sem salvar)
                  setLocal('zip', m);
                }}
              />
            </Field>

            {/* dica */}
            <div className="self-end text-xs text-gray-500 dark:text-slate-500">
              Digite o CEP e clique em “Carregar endereço”. Só precisa informar o número.
            </div>

            <div className="self-end">
              <button
                type="button"
                onClick={handleLoadAddress}
                disabled={loadingCep || onlyDigits(cepMasked).length !== 8}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                           border border-gray-200 dark:border-slate-700
                           bg-gray-50 hover:bg-gray-100 dark:bg-slate-900/70 dark:hover:bg-slate-800
                           text-gray-800 dark:text-slate-200 text-sm font-medium transition disabled:opacity-50"
              >
                {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Carregar endereço
              </button>
            </div>
          </div>

          {/* One-liner + Número (aparece só depois de carregar) */}
          {hasLoadedAddress && (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-sm
                              text-gray-800 dark:text-slate-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {oneLiner || '—'}
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    (Logradouro/bairro/cidade/UF carregados via CEP)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearAddress}
                  className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100"
                  title="Limpar endereço"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <Field label="Número" className="sm:col-span-2">
                  <input
                    ref={numberRef}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                               px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                    value={form.number || ''}
                    onChange={(e) => setLocal('number', e.target.value)}
                  />
                </Field>
                {/* campos carregados são apenas display; não editáveis */}
                <Field label="Rua" className="sm:col-span-4">
                  <input
                    disabled
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40
                               px-3 py-2 text-gray-600 dark:text-slate-300"
                    value={form.street || ''}
                    readOnly
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <Field label="Bairro" className="sm:col-span-2">
                  <input
                    disabled
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40
                               px-3 py-2 text-gray-600 dark:text-slate-300"
                    value={form.district || ''}
                    readOnly
                  />
                </Field>
                <Field label="Cidade" className="sm:col-span-3">
                  <input
                    disabled
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40
                               px-3 py-2 text-gray-600 dark:text-slate-300"
                    value={form.city || ''}
                    readOnly
                  />
                </Field>
                <Field label="UF" className="sm:col-span-1">
                  <input
                    disabled
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40
                               px-3 py-2 text-gray-600 dark:text-slate-300"
                    value={(form.state || '').toUpperCase()}
                    readOnly
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        {/* Redes sociais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Instagram (@user ou URL)">
            <input
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                         px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="https://instagram.com/sualoja ou @sualoja"
              value={form.instagram || ''}
              onChange={(e) => setLocal('instagram', e.target.value)}
              onBlur={(e) => setLocal('instagram', normalizeHandle(e.target.value))}
            />
          </Field>
          <Field label="TikTok (@user ou URL)">
            <input
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                         px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="https://www.tiktok.com/@sualoja ou @sualoja"
              value={form.tiktok || ''}
              onChange={(e) => setLocal('tiktok', e.target.value)}
              onBlur={(e) => setLocal('tiktok', normalizeHandle(e.target.value))}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            type="submit"
          >
            Salvar dados
          </button>
        </div>
      </form>
    </Card>
  );
};

export default InfoTab;
