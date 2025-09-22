// src/pages/Store.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Save, Loader2, Upload, Image as ImageIcon, Palette, Clock, Calendar, ChevronDown, Copy, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useBusiness } from '../../hooks/useBusiness';
import { useAuth } from '../../contexts/AuthContext';

// =================== Types ===================
type StoreRow = {
  id: string;
  business_id: string;
  name: string;
  slug: string | null;
  address: any | null; // { street, number, district, city, state, zip }
  timezone: string;
  slot_duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  max_parallel: number;
  created_at: string;
  updated_at: string;
};

type StoreHourRow = {
  store_id: string;
  day_of_week: number; // 0..6 (0 = Sunday)
  open_time: string | null; // '09:00:00'
  close_time: string | null; // '18:00:00'
  is_closed: boolean;
};

type FormValues = {
  name: string;
  slug: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
  timezone: string;
  slot_duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  max_parallel: number;
};

// =================== Constants ===================
const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/Bahia',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Boa_Vista',
];

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90, 120];
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30];
const PARALLEL_OPTIONS = [1, 2, 3, 4, 5];

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STORAGE_BUCKET = 'sr-public'; // crie esse bucket público no Supabase

// Tema salvo localmente por storeId
const themeLSKey = (storeId: string) => `sr.storeTheme.${storeId}`;

// =================== Helpers ===================
const toTime = (hhmm?: string | null) =>
  !hhmm ? null : (hhmm.length === 5 ? `${hhmm}:00` : hhmm);

const fromTime = (hhmmss?: string | null) =>
  !hhmmss ? '' : hhmmss.slice(0, 5);

const defaultHours = (): StoreHourRow[] =>
  Array.from({ length: 7 }, (_, i) => ({
    store_id: 'NEW',
    day_of_week: i,
    open_time: i === 0 ? null : '09:00:00',  // dom fechado por padrão
    close_time: i === 0 ? null : '18:00:00',
    is_closed: i === 0,
  }));

const prettyUrl = (s?: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// =================== Image Uploader ===================
const ImageUploader: React.FC<{
  label: string;
  objectKey: (storeId: string) => string; // function that returns key like `stores/{id}/logo`
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  storeId?: string;
  previewUrl?: string | null;
  onUploaded?: (url: string) => void;
}> = ({ label, objectKey, mime, storeId, previewUrl, onUploaded }) => {
  const [uploading, setUploading] = React.useState(false);
  const [url, setUrl] = React.useState<string | null>(previewUrl || null);

  React.useEffect(() => setUrl(previewUrl || null), [previewUrl]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!storeId) {
      toast.error('Salve a loja antes de subir imagens');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Use PNG, JPG ou WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }

    setUploading(true);
    try {
      const key = objectKey(storeId);
      // apaga anterior (idempotente)
      await supabase.storage.from(STORAGE_BUCKET).remove([key]).catch(() => {});
      // sobe novo
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(key, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
      setUrl(data.publicUrl);
      onUploaded?.(data.publicUrl);
      toast.success('Imagem atualizada!');
    } catch (err: any) {
      console.error(err);
      toast.error('Falha ao subir imagem');
    } finally {
      setUploading(false);
      // reset input para permitir mesmo arquivo novamente
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-6 h-6 text-gray-400" />
        )}
      </div>
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm font-medium">
        <Upload className="w-4 h-4" />
        <span>{uploading ? 'Enviando…' : `Trocar ${label}`}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={onFile}
        />
      </label>
    </div>
  );
};

// =================== Hours Editor ===================
const HoursEditor: React.FC<{
  hours: StoreHourRow[];
  onChange: (next: StoreHourRow[]) => void;
}> = ({ hours, onChange }) => {
  const setFor = (i: number, patch: Partial<StoreHourRow>) => {
    const next = [...hours];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const copyToAll = (src: number) => {
    const { open_time, close_time, is_closed } = hours[src];
    onChange(hours.map((h, i) => i === src ? h : { ...h, open_time, close_time, is_closed }));
    toast.success(`Copiado ${DAY_LABELS[src]} → todos`);
  };

  const presetMonFri = () => {
    const next = hours.map((h, i) => {
      if (i === 0) return { ...h, is_closed: true, open_time: null, close_time: null };
      if (i === 6) return { ...h, is_closed: true, open_time: null, close_time: null };
      return { ...h, is_closed: false, open_time: '09:00:00', close_time: '18:00:00' };
    });
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={presetMonFri}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCcw className="w-4 h-4" />
          Seg-Sex 09:00–18:00, Sáb/Dom fechado
        </button>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700 border rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
        {hours.map((h, idx) => (
          <div key={idx} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-16 shrink-0 text-sm font-medium">{DAY_LABELS[idx]}</div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={h.is_closed}
                  onChange={(e) => setFor(idx, { is_closed: e.target.checked })}
                />
                Fechado
              </label>
            </div>
            {!h.is_closed && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-gray-500">Abre</span>
                  <input
                    type="time"
                    value={fromTime(h.open_time)}
                    onChange={(e) => setFor(idx, { open_time: toTime(e.target.value) })}
                    className="px-2 py-1 rounded border bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-gray-500">Fecha</span>
                  <input
                    type="time"
                    value={fromTime(h.close_time)}
                    onChange={(e) => setFor(idx, { close_time: toTime(e.target.value) })}
                    className="px-2 py-1 rounded border bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            )}
            <div className="sm:ml-auto">
              <button
                type="button"
                onClick={() => copyToAll(idx)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Copy className="w-4 h-4" /> copiar p/ todos
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =================== Theme Editor ===================
const ThemeEditor: React.FC<{
  storeId?: string;
}> = ({ storeId }) => {
  const [primary, setPrimary] = React.useState('#6366f1'); // indigo-500
  const [secondary, setSecondary] = React.useState('#8b5cf6'); // violet-500

  React.useEffect(() => {
    if (!storeId) return;
    const raw = localStorage.getItem(themeLSKey(storeId));
    if (raw) {
      try {
        const t = JSON.parse(raw);
        if (t.primary) setPrimary(t.primary);
        if (t.secondary) setSecondary(t.secondary);
      } catch {}
    }
  }, [storeId]);

  const save = () => {
    if (!storeId) return;
    localStorage.setItem(themeLSKey(storeId), JSON.stringify({ primary, secondary }));
    toast.success('Tema salvo (local)');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5" />
        <h3 className="font-medium">Tema da página pública</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800">
          <span className="text-sm">Primária</span>
          <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
        </label>
        <label className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800">
          <span className="text-sm">Secundária</span>
          <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} className="px-3 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Salvar tema
        </button>
      </div>
    </div>
  );
};

// =================== Main Page ===================
const StorePage: React.FC = () => {
  const { user } = useAuth();
  const { business, loading: bizLoading } = useBusiness();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [store, setStore] = React.useState<StoreRow | null>(null);
  const [hours, setHours] = React.useState<StoreHourRow[]>(defaultHours());

  // imagens públicas
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '',
      slug: '',
      street: '',
      number: '',
      district: '',
      city: '',
      state: '',
      zip: '',
      timezone: 'America/Sao_Paulo',
      slot_duration_min: 30,
      buffer_before_min: 0,
      buffer_after_min: 0,
      max_parallel: 1,
    }
  });

  // auto-slug
  React.useEffect(() => {
    const sub = watch((v, { name }) => {
      if (name === 'name' && !watch('slug')) {
        setValue('slug', prettyUrl(v.name || ''));
      }
    });
    return () => sub.unsubscribe();
  }, [watch, setValue]);

  // load or create draft
  React.useEffect(() => {
    (async () => {
      if (bizLoading || !business?.id) return;
      setLoading(true);
      try {
        // pega a primeira loja do business (se existir)
        const { data: rows, error } = await supabase
          .from('stores')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (error) throw error;

        if (rows && rows.length) {
          const s = rows[0] as StoreRow;
          setStore(s);
          // form values
          const addr = (s.address || {}) as any;
          setValue('name', s.name);
          setValue('slug', s.slug || '');
          setValue('street', addr.street || '');
          setValue('number', addr.number || '');
          setValue('district', addr.district || '');
          setValue('city', addr.city || '');
          setValue('state', addr.state || '');
          setValue('zip', addr.zip || '');
          setValue('timezone', s.timezone || 'America/Sao_Paulo');
          setValue('slot_duration_min', s.slot_duration_min);
          setValue('buffer_before_min', s.buffer_before_min);
          setValue('buffer_after_min', s.buffer_after_min);
          setValue('max_parallel', s.max_parallel);

          // horas
          const { data: hrs, error: hrsErr } = await supabase
            .from('store_hours')
            .select('*')
            .eq('store_id', s.id)
            .order('day_of_week', { ascending: true });
          if (hrsErr) throw hrsErr;
          if (hrs && hrs.length === 7) setHours(hrs as StoreHourRow[]);
          else setHours(defaultHours().map(h => ({ ...h, store_id: s.id })));

          // imagens (chaves previsíveis)
          const lkey = `stores/${s.id}/logo`;
          const ckey = `stores/${s.id}/cover`;
          setLogoUrl(supabase.storage.from(STORAGE_BUCKET).getPublicUrl(lkey).data.publicUrl);
          setCoverUrl(supabase.storage.from(STORAGE_BUCKET).getPublicUrl(ckey).data.publicUrl);
        } else {
          // sem loja ainda → formulário limpo
          setStore(null);
          setHours(defaultHours());
        }
      } catch (err: any) {
        console.error(err);
        toast.error('Erro ao carregar loja');
      } finally {
        setLoading(false);
      }
    })();
  }, [bizLoading, business?.id, setValue]);

  const onSubmit = async (vals: FormValues) => {
    if (!business?.id) return;
    setSaving(true);
    try {
      const address = {
        street: vals.street || null,
        number: vals.number || null,
        district: vals.district || null,
        city: vals.city || null,
        state: vals.state || null,
        zip: vals.zip || null,
      };

      let storeId = store?.id;
      if (!storeId) {
        // INSERT
        const { data, error } = await supabase
          .from('stores')
          .insert({
            business_id: business.id,
            name: vals.name.trim(),
            slug: vals.slug ? prettyUrl(vals.slug) : null,
            address,
            timezone: vals.timezone,
            slot_duration_min: vals.slot_duration_min,
            buffer_before_min: vals.buffer_before_min,
            buffer_after_min: vals.buffer_after_min,
            max_parallel: vals.max_parallel,
          })
          .select('*')
          .single();
        if (error) throw error;
        storeId = data.id as string;
        setStore(data as StoreRow);

        // cria horas default (se não houver)
        const rows = defaultHours().map(h => ({ ...h, store_id: storeId! }));
        const { error: insHrsErr } = await supabase.from('store_hours').upsert(rows, { onConflict: 'store_id,day_of_week' });
        if (insHrsErr) throw insHrsErr;
        setHours(rows);
      } else {
        // UPDATE
        const { error: upErr } = await supabase
          .from('stores')
          .update({
            name: vals.name.trim(),
            slug: vals.slug ? prettyUrl(vals.slug) : null,
            address,
            timezone: vals.timezone,
            slot_duration_min: vals.slot_duration_min,
            buffer_before_min: vals.buffer_before_min,
            buffer_after_min: vals.buffer_after_min,
            max_parallel: vals.max_parallel,
          })
          .eq('id', storeId);
        if (upErr) throw upErr;
      }

      // upsert horas
      const hoursRows = hours.map(h => ({
        ...h,
        store_id: storeId!,
        open_time: h.is_closed ? null : h.open_time,
        close_time: h.is_closed ? null : h.close_time,
      }));
      const { error: hourErr } = await supabase.from('store_hours').upsert(hoursRows, { onConflict: 'store_id,day_of_week' });
      if (hourErr) throw hourErr;

      toast.success('Loja salva!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // ============ UI ============
  if (bizLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const title = store ? 'Editar Loja' : 'Criar Loja';

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
          Defina nome, horários, capacidade e o visual da sua página pública.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic / Branding */}
        <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Informações básicas</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Nome da loja</span>
                  <input
                    className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2"
                    placeholder="Ex.: BarberShop Centro"
                    {...register('name', { required: 'Informe o nome' })}
                  />
                  {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Slug (URL pública)</span>
                  <input
                    className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2"
                    placeholder="barbershop-centro"
                    {...register('slug')}
                    onBlur={(e) => e.currentTarget.value && setValue('slug', prettyUrl(e.currentTarget.value))}
                  />
                  <span className="text-xs text-gray-500">Exibiremos /{watch('slug') || 'sua-loja'}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Timezone</span>
                  <div className="relative">
                    <select
                      className="mt-1 w-full appearance-none rounded-lg border bg-white dark:bg-gray-900 px-3 py-2 pr-8"
                      {...register('timezone', { required: true })}
                    >
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </label>
              </div>

              {/* Endereço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm">Rua</span>
                  <input className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2" {...register('street')} />
                </label>
                <label className="block">
                  <span className="text-sm">Número</span>
                  <input className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2" {...register('number')} />
                </label>
                <label className="block">
                  <span className="text-sm">Bairro</span>
                  <input className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2" {...register('district')} />
                </label>
                <label className="block">
                  <span className="text-sm">Cidade</span>
                  <input className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2" {...register('city')} />
                </label>
                <label className="block">
                  <span className="text-sm">Estado</span>
                  <input className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2" {...register('state')} />
                </label>
                <label className="block">
                  <span className="text-sm">CEP</span>
                  <input className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2" {...register('zip')} />
                </label>
              </div>
            </div>

            {/* Branding (logo/capa) */}
            <div className="space-y-4">
              <ImageUploader
                label="logo"
                storeId={store?.id}
                previewUrl={logoUrl}
                objectKey={(id) => `stores/${id}/logo`}
                mime="image/png"
                onUploaded={setLogoUrl}
              />
              <ImageUploader
                label="capa"
                storeId={store?.id}
                previewUrl={coverUrl}
                objectKey={(id) => `stores/${id}/cover`}
                mime="image/jpeg"
                onUploaded={setCoverUrl}
              />
              <ThemeEditor storeId={store?.id} />
            </div>
          </div>
        </div>

        {/* Capacity / Slots */}
        <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Agenda e capacidade</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <label className="block">
              <span className="text-sm">Duração do slot (min)</span>
              <select
                className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2"
                {...register('slot_duration_min', { valueAsNumber: true })}
              >
                {DURATION_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <span className="text-xs text-gray-500">* Podemos evoluir para “baseado no serviço”.</span>
            </label>

            <label className="block">
              <span className="text-sm">Buffer antes (min)</span>
              <select
                className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2"
                {...register('buffer_before_min', { valueAsNumber: true })}
              >
                {BUFFER_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-sm">Buffer depois (min)</span>
              <select
                className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2"
                {...register('buffer_after_min', { valueAsNumber: true })}
              >
                {BUFFER_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-sm">Atendimentos paralelos</span>
              <select
                className="mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2"
                {...register('max_parallel', { valueAsNumber: true })}
              >
                {PARALLEL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Horário de funcionamento</h2>
          </div>
          <HoursEditor hours={hours} onChange={setHours} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar loja
          </button>
          {!store && (
            <span className="text-xs text-gray-500">
              Você poderá subir logo/capa após salvar a loja.
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default StorePage;
