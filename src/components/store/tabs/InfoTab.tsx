import React from 'react';
import Card from '../components/Card';
import Field from '../components/Field';
import { Info, MapPin, Loader2, X, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export type StoreForm = {
  name: string;
  slug?: string; // não exibido aqui
  street?: string; number?: string; district?: string; city?: string; state?: string; zip?: string;
  phone?: string; whatsapp?: string;
  instagram?: string; tiktok?: string;
};

/* ── helpers ─────────────────────────────────────────────── */
const onlyDigits = (s: string) => (s || '').replace(/\D+/g, '');
const formatCep = (s: string) => {
  const d = onlyDigits(s).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

// normaliza @handle e remove barra final se vier URL
const normalizeHandle = (raw?: string) => {
  let s = (raw || '').trim();
  s = s.replace(/\/+$/g, '');
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '@');
  s = s.replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '@');
  s = s.replace(/^@+/, '@');
  s = s.replace(/\s+/g, '');
  return s;
};

// formata telefone BR de 10–11 dígitos para exibição
const formatBrPhone = (raw?: string) => {
  const d = onlyDigits(raw || '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  // 11 dígitos (celular com 9)
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};

// normaliza para salvar (apenas dígitos 10–11)
const normalizeBrPhoneDigits = (raw?: string) => {
  const d = onlyDigits(raw || '');
  return d ? d.slice(0, 11) : '';
};

/* ── seção visual ────────────────────────────────────────── */
const SectionTitle: React.FC<{ icon?: React.ReactNode; title: string; desc?: string }> = ({ icon, title, desc }) => (
  <div className="flex items-start gap-3">
    {icon && (
      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700">
        <div className="w-5 h-5 text-gray-700 dark:text-slate-200">{icon}</div>
      </div>
    )}
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
      {desc && <p className="text-sm text-gray-600 dark:text-slate-400">{desc}</p>}
    </div>
  </div>
);

/* ── componente ──────────────────────────────────────────── */
const InfoTab: React.FC<{
  value: StoreForm;
  onChange: (v: StoreForm) => void; // chamado somente no submit
}> = ({ value, onChange }) => {
  // estado local (edita sem salvar no banco)
  const [form, setForm] = React.useState<StoreForm>(value);
  const [cepMasked, setCepMasked] = React.useState(formatCep(value.zip || ''));
  const [loadingCep, setLoadingCep] = React.useState(false);
  const numberRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
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
    onChange({
      ...form,
      instagram: normalizeHandle(form.instagram),
      tiktok: normalizeHandle(form.tiktok),
      zip: formatCep(form.zip || ''),
      state: (form.state || '').toUpperCase(),
      phone: normalizeBrPhoneDigits(form.phone),
      whatsapp: normalizeBrPhoneDigits(form.whatsapp),
    });
    // sem toast de sucesso aqui (evita duplicidade com o pai)
  };

  return (
    <Card className="p-5">
      {/* Identidade */}
      <SectionTitle
        icon={<Info />}
        title="Identidade"
        desc="Defina o nome e como sua loja será exibida."
      />

      <form onSubmit={handleSubmit} className="mt-5 space-y-10">
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

        {/* divisor sutil */}
        <div className="h-px w-full bg-gray-200 dark:bg-slate-800" />

        {/* Endereço */}
        <SectionTitle
          icon={<MapPin />}
          title="Endereço"
          desc="Busque pelo CEP e informe apenas o número."
        />

        {/* CEP + botão (desktop não quebra linha) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3">
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
                setLocal('zip', m); // estado local
              }}
            />
          </Field>

          <div className="hidden sm:flex items-end text-xs text-gray-500 dark:text-slate-500">
            Digite o CEP e clique em “Carregar endereço”.
          </div>

          <div className="self-end">
            <button
              type="button"
              onClick={handleLoadAddress}
              disabled={loadingCep || onlyDigits(cepMasked).length !== 8}
              className="min-w-[170px] whitespace-nowrap inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl
                         border border-gray-200 dark:border-slate-700
                         bg-gray-50 hover:bg-gray-100 dark:bg-slate-900/70 dark:hover:bg-slate-800
                         text-gray-800 dark:text-slate-200 text-sm font-medium transition disabled:opacity-50"
            >
              {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Carregar endereço
            </button>
          </div>
        </div>

        {/* One-liner + Número */}
        {hasLoadedAddress && (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-sm
                            text-gray-800 dark:text-slate-100">
              {oneLiner || '—'}
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

              <div className="sm:col-span-4 flex items-end">
                <button
                  type="button"
                  onClick={handleClearAddress}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm
                             border border-gray-200 dark:border-slate-700
                             text-gray-700 dark:text-slate-200
                             hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  title="Limpar endereço"
                >
                  <X className="w-4 h-4" />
                  Limpar endereço
                </button>
              </div>
            </div>
          </div>
        )}

        {/* divisor sutil */}
        <div className="h-px w-full bg-gray-200 dark:bg-slate-800" />

        {/* Contato */}
        <SectionTitle
          icon={<Phone />}
          title="Contato"
          desc="Telefone fixo/celular e WhatsApp da loja (DDD + número)."
        />

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Telefone (DDD + número)" hint="Ex.: (11) 3456-7890 ou (11) 93456-7890">
            <input
              inputMode="tel"
              autoComplete="tel"
              pattern="\d{10,11}"
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                         px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="(11) 3456-7890 ou (11) 93456-7890"
              value={formatBrPhone(form.phone)}
              onChange={(e) => setLocal('phone', e.target.value)}
              onBlur={(e) => setLocal('phone', normalizeBrPhoneDigits(e.target.value))}
            />
          </Field>

          <Field label="WhatsApp (DDD + número)" hint="Somente dígitos; usaremos o link com wa.me">
            <input
              inputMode="tel"
              autoComplete="tel-national"
              pattern="\d{10,11}"
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                         px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="(11) 98765-4321"
              value={formatBrPhone(form.whatsapp)}
              onChange={(e) => setLocal('whatsapp', e.target.value)}
              onBlur={(e) => setLocal('whatsapp', normalizeBrPhoneDigits(e.target.value))}
            />
          </Field>
        </div>

        {/* divisor sutil */}
        <div className="h-px w-full bg-gray-200 dark:bg-slate-800" />

        {/* Redes sociais */}
        <SectionTitle
          title="Redes sociais"
          desc="Cole a URL ou digite @usuário; nós limpamos automaticamente."
        />

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
