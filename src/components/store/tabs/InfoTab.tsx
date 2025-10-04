import React from 'react';
import Card from '../components/Card';
import Field from '../components/Field';
import { Info, MapPin, Loader2, X, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export type StoreForm = {
  name: string;
  slug?: string; // não exibido aqui
  street?: string; number?: string; district?: string; city?: string; state?: string; zip?: string;
  whatsapp?: string;
  instagram?: string; tiktok?: string;
};

/* ── helpers ─────────────────────────────────────────────── */
const onlyDigits = (s: string) => (s || '').replace(/\D+/g, '');
const formatCep = (s: string) => {
  const d = onlyDigits(s).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

// BR phone mask for display (10–11 digits)
const formatBrPhone = (raw?: string) => {
  const d = onlyDigits(raw || '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};
const normalizeBrPhoneDigits = (raw?: string) => {
  const d = onlyDigits(raw || '');
  return d ? d.slice(0, 11) : '';
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
  const [addressEdit, setAddressEdit] = React.useState(false); // alterna modo editar endereço
  const numberRef = React.useRef<HTMLInputElement>(null);

  // snapshot para detectar alterações (dirty)
  const initialRef = React.useRef<StoreForm>(value);

  React.useEffect(() => {
    setForm(value);
    setCepMasked(formatCep(value.zip || ''));
    initialRef.current = value;
    // Se já tem endereço, começa fechado (exibir one-liner). Se não tem, aberto.
    const hasAddress = !!(value.street || value.city || value.state);
    setAddressEdit(!hasAddress);
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
    setAddressEdit(true);
  };

  const normalizedForCompare = (f: StoreForm) => ({
    ...f,
    whatsapp: normalizeBrPhoneDigits(f.whatsapp),
    instagram: normalizeHandle(f.instagram),
    tiktok: normalizeHandle(f.tiktok),
    zip: formatCep(f.zip || ''),
    state: (f.state || '').toUpperCase(),
  });

  const dirty = React.useMemo(() => {
    const a = normalizedForCompare(form);
    const b = normalizedForCompare(initialRef.current);
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    onChange({
      ...form,
      instagram: normalizeHandle(form.instagram),
      tiktok: normalizeHandle(form.tiktok),
      zip: formatCep(form.zip || ''),
      state: (form.state || '').toUpperCase(),
      whatsapp: normalizeBrPhoneDigits(form.whatsapp),
    });
    // sem toast aqui (evita duplicidade)
  };

  return (
    <Card className="p-5 relative">
      {/* Identidade */}
      <SectionTitle
        icon={<Info />}
        title="Identidade"
        desc="Defina o nome como sua loja será exibida."
      />

      {/* ✅ desabilita validação nativa para não travar com a máscara de telefone */}
      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-10">
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

        {/* separador visível no dark */}
        <div className="border-t border-gray-200 dark:border-slate-700/80" />

        {/* Contato (WhatsApp logo após Identidade) */}
        <SectionTitle
          icon={<Phone />}
          title="Contato"
          desc="WhatsApp da loja (DDD + número)."
        />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="WhatsApp (DDD + número)" hint="Somente dígitos; usamos isso para link wa.me">
            <input
              inputMode="tel"
              autoComplete="tel-national"
              // ❌ sem pattern para não conflitar com a máscara visual
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                         px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="(11) 98765-4321"
              value={formatBrPhone(form.whatsapp)}
              onChange={(e) => setLocal('whatsapp', e.target.value)}
              onBlur={(e) => setLocal('whatsapp', normalizeBrPhoneDigits(e.target.value))}
            />
          </Field>
          <div className="hidden sm:block" />
        </div>

        {/* separador */}
        <div className="border-t border-gray-200 dark:border-slate-700/80" />

        {/* Endereço */}
        <SectionTitle
          icon={<MapPin />}
          title="Endereço"
          desc="Busque pelo CEP e informe apenas o número."
        />

        {/* Modo exibição: one-liner + Alterar */}
        {!addressEdit && hasLoadedAddress && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-sm
                            text-gray-800 dark:text-slate-100">
              {oneLiner || '—'}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAddressEdit(true)}
                className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm
                           border border-gray-200 dark:border-slate-700
                           text-gray-700 dark:text-slate-200
                           hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                Alterar endereço
              </button>
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
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Modo edição: CEP + Buscar CEP + Número */}
        {(addressEdit || !hasLoadedAddress) && (
          <div className="mt-4 space-y-4">
            {/* CEP + botão lado a lado no desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <Field label="CEP">
                <div className="flex gap-2">
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
                  <button
                    type="button"
                    onClick={handleLoadAddress}
                    disabled={loadingCep || onlyDigits(cepMasked).length !== 8}
                    className="min-w-[140px] whitespace-nowrap inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                               border border-gray-200 dark:border-slate-700
                               bg-gray-50 hover:bg-gray-100 dark:bg-slate-900/70 dark:hover:bg-slate-800
                               text-gray-800 dark:text-slate-200 text-sm font-medium transition disabled:opacity-50"
                  >
                    {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Buscar CEP
                  </button>
                </div>
              </Field>
            </div>

            {/* Após buscar, mostra one-liner de preview e campo Número */}
            {hasLoadedAddress && (
              <>
                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-sm
                                text-gray-800 dark:text-slate-100">
                  {oneLiner || '—'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <Field label="Número" className="sm:col-span-1">
                    <input
                      ref={numberRef}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                                 px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                      value={form.number || ''}
                      onChange={(e) => setLocal('number', e.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={() => setAddressEdit(false)}
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm
                                 border border-gray-200 dark:border-slate-700
                                 text-gray-700 dark:text-slate-200
                                 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                    >
                      Fechar edição
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* separador */}
        <div className="border-t border-gray-200 dark:border-slate-700/80" />

        {/* Redes sociais (opcional manter) */}
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

        {/* BOTÃO SALVAR (desktop / quando não estiver usando o flutuante) */}
        <div className="hidden sm:flex items-center justify-end gap-3 pt-2">
          <button
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:opacity-50"
            type="submit"
            disabled={!dirty}
          >
            Salvar dados
          </button>
        </div>

        {/* Floating Save (mobile & também disponível no desktop se quiser) */}
        {dirty && (
          <div className="sm:hidden">
            <div className="fixed bottom-6 inset-x-0 px-4 z-40 pointer-events-none">
              <div className="pointer-events-auto max-w-md mx-auto">
                <button
                  onClick={handleSubmit as any}
                  className="w-full shadow-lg rounded-full px-5 py-3 bg-indigo-600 text-white font-semibold
                             hover:bg-indigo-700 active:scale-[0.99] transition"
                >
                  Salvar dados
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
};

export default InfoTab;
