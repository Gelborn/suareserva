import React from 'react';
import {
  X, Loader2, Upload, Image as ImageIcon, Search, ChevronDown, Check, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

/** Tipos básicos */
export type ServiceRow = {
  id: string;
  business_id: string;
  store_id: string | null;
  name: string;
  price_cents: number;
  duration_min: number;
  is_active: boolean;
  color?: string | null;
  service_pic?: string | null;
};

export type TeamMemberRow = {
  id: string;
  business_id: string;
  store_id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  max_parallel: number;
  profile_pic?: string | null;
};

export type StoreOption = { id: string; name: string };

type Mode = 'create' | 'edit';

type Props = {
  open: boolean;
  mode: Mode;
  businessId: string;
  stores: StoreOption[];
  onClose: () => void;
  /** Quando editando, passe o membro atual */
  member?: TeamMemberRow | null;
  /** Chamado após salvar (criar/editar) para recarregar a lista no pai */
  onSaved?: () => void;
};

const onlyDigits = (s?: string | null) => String(s ?? '').replace(/\D+/g, '');

/** Modal lindão p/ criar/editar membros */
const MemberModal: React.FC<Props> = ({ open, onClose, mode, businessId, stores, member, onSaved }) => {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [saving, setSaving] = React.useState(false);

  // Dados do membro
  const [fullName, setFullName] = React.useState(member?.full_name ?? '');
  const [storeId, setStoreId] = React.useState(member?.store_id ?? '');
  const [email, setEmail] = React.useState(member?.email ?? '');
  const [phone, setPhone] = React.useState(member?.phone ?? '');
  const [profilePic, setProfilePic] = React.useState<string | null>(member?.profile_pic ?? null);
  const [upLoading, setUpLoading] = React.useState(false);
  const [pickedName, setPickedName] = React.useState<string | null>(null);

  // Serviços
  const [services, setServices] = React.useState<ServiceRow[]>([]);
  const [servicesLoading, setServicesLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedSvc, setSelectedSvc] = React.useState<Record<string, boolean>>({});

  const hasSelectedSvc = React.useMemo(
    () => Object.values(selectedSvc).some(Boolean),
    [selectedSvc]
  );

  // Reset ao abrir/fechar
  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setSaving(false);
    setFullName(member?.full_name ?? '');
    setStoreId(member?.store_id ?? '');
    setEmail(member?.email ?? '');
    setPhone(member?.phone ?? '');
    setProfilePic(member?.profile_pic ?? null);
    setUpLoading(false);
    setPickedName(null);
    setServices([]);
    setSelectedSvc({});
    setSearch('');
  }, [open, member]);

  // Carrega serviços ativos da loja selecionada
  React.useEffect(() => {
    const loadServices = async () => {
      if (!open || step !== 2 || !storeId) return;
      setServicesLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', businessId)
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setServices((data ?? []) as ServiceRow[]);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar serviços');
      } finally {
        setServicesLoading(false);
      }
    };
    loadServices();
  }, [open, step, storeId, businessId]);

  // Se for editar, no passo 2 pré-carrega os serviços já ligados
  React.useEffect(() => {
    const loadSelected = async () => {
      if (!open || mode !== 'edit' || step !== 2 || !member?.id) return;
      try {
        const { data, error } = await supabase
          .from('service_providers')
          .select('service_id')
          .eq('team_member_id', member.id);
        if (error) throw error;

        const next: Record<string, boolean> = {};
        (data ?? []).forEach((row: any) => { next[row.service_id] = true; });
        setSelectedSvc(next);
      } catch (e) {
        console.error(e);
      }
    };
    loadSelected();
  }, [open, step, mode, member?.id]);

  const toggleSvc = (id: string) => setSelectedSvc(prev => ({ ...prev, [id]: !prev[id] }));

  // Upload da foto (bucket existente)
  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Envie uma imagem.');
    if (f.size > 3 * 1024 * 1024) return toast.error('Imagem muito grande (máx 3 MB).');

    try {
      setUpLoading(true);
      const ext = f.name.split('.').pop()?.toLowerCase() || 'jpg';
      const ts = Date.now();
      const path = `${businessId}/team/profile_${ts}.${ext}`;
      const { error } = await supabase.storage.from('store-assets').upload(path, f, {
        upsert: true,
        contentType: f.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('store-assets').getPublicUrl(path);
      setProfilePic(data.publicUrl);
      setPickedName(f.name);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao enviar a imagem.');
    } finally {
      setUpLoading(false);
    }
  };

  const canGoStep2 = fullName.trim().length >= 2 && !!storeId;

  // Salvar (create/edit) + diffs em service_providers
  const handleSave = async () => {
    if (!fullName.trim() || !storeId) {
      toast.error('Preencha nome e loja.');
      return;
    }
    if (!hasSelectedSvc) {
      toast.error('Selecione pelo menos um serviço.');
      return;
    }

    try {
      setSaving(true);

      // 1) Upsert do membro
      let memberId = member?.id ?? null;

      if (mode === 'create') {
        const { data: created, error } = await supabase
          .from('team_members')
          .insert({
            business_id: businessId,
            store_id: storeId,
            user_id: null,
            full_name: fullName.trim(),
            phone: onlyDigits(phone) || null,
            email: (email || '').trim() || null,
            is_active: true,
            max_parallel: 1,
            profile_pic: profilePic ?? null,
          })
          .select('*')
          .single();
        if (error) throw error;
        memberId = created.id;
      } else if (mode === 'edit' && member?.id) {
        const { error } = await supabase
          .from('team_members')
          .update({
            store_id: storeId,
            full_name: fullName.trim(),
            phone: onlyDigits(phone) || null,
            email: (email || '').trim() || null,
            profile_pic: profilePic ?? null,
          })
          .eq('id', member.id);
        if (error) throw error;
        memberId = member.id;
      }

      if (!memberId) throw new Error('memberId ausente');

      // 2) Diff dos vínculos de serviços
      const chosenIds = Object.entries(selectedSvc).filter(([, v]) => v).map(([id]) => id);

      // Leitura atual (se edit) para diffs
      let currentIds: Set<string> = new Set();
      const { data: links } = await supabase
        .from('service_providers')
        .select('service_id')
        .eq('team_member_id', memberId);
      (links ?? []).forEach((r: any) => currentIds.add(r.service_id));

      const nextIds = new Set(chosenIds);
      const toInsert = [...nextIds].filter(id => !currentIds.has(id));
      const toDelete = [...currentIds].filter(id => !nextIds.has(id));

      if (toInsert.length) {
        const payload = toInsert.map((service_id) => ({ service_id, team_member_id: memberId! }));
        const { error: insErr } = await supabase.from('service_providers').insert(payload);
        if (insErr) throw insErr;
      }
      if (toDelete.length) {
        const { error: delErr } = await supabase
          .from('service_providers')
          .delete()
          .eq('team_member_id', memberId)
          .in('service_id', toDelete);
        if (delErr) throw delErr;
      }

      toast.success(mode === 'create' ? 'Membro criado!' : 'Membro atualizado!');
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível salvar o membro.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay 100% viewport, sem vãos */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[1px]"
        onClick={onClose}
      />
      {/* Wrapper responsivo centralizado (desktop) e bottom-sheet (mobile) */}
      <div className="fixed inset-0 flex items-end sm:items-center sm:justify-center sm:p-4">
        <div
          role="dialog" aria-modal="true"
          className="relative sm:max-w-2xl w-full sm:w-[720px] mx-auto sm:mx-0 sm:rounded-3xl rounded-t-3xl
                     bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl
                     p-0 overflow-hidden"
        >
          {/* Header elegante com stepper */}
          <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {mode === 'create' ? 'Novo membro' : 'Editar membro'}
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {step === 1 ? 'Dados básicos' : 'Serviços executados'}
                </h4>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper */}
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-full border ${
                step === 1
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700'
              }`}>1. Dados</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400 dark:text-slate-300" />
              <span className={`px-2.5 py-1 rounded-full border ${
                step === 2
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700'
              }`}>2. Serviços</span>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-5 sm:p-6">
            {step === 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Foto */}
                <div className="sm:col-span-1">
                  <div className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-2">Foto de perfil</div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 overflow-hidden grid place-items-center">
                      {profilePic ? (
                        <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-400 dark:text-slate-300" />
                      )}
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white hover:bg-gray-50 dark:bg-slate-900/70 dark:hover:bg-slate-800 text-xs text-gray-700 dark:text-slate-100 cursor-pointer">
                      {upLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Trocar
                      <input type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
                    </label>
                  </div>
                  {pickedName && <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">Selecionado: <strong className="text-gray-700 dark:text-slate-100">{pickedName}</strong></div>}
                </div>

                {/* Form principal */}
                <div className="sm:col-span-2 grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Nome completo</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
                      placeholder="Ex: Maria Souza"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Loja</label>
                    <div className="relative">
                      <select
                        value={storeId}
                        onChange={(e) => setStoreId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 pr-9 py-2 text-gray-900 dark:text-slate-100 appearance-none"
                      >
                        <option value="">Selecione…</option>
                        {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <ChevronDown
                        className="w-4 h-4 absolute right-3 top-[calc(50%+2px)] -translate-y-1/2 text-gray-400 dark:text-slate-300 pointer-events-none"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Telefone (opcional)</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Email (opcional)</label>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
                        placeholder="membro@exemplo.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-300" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar serviço…"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-gray-200 dark:border-slate-700">
                  {servicesLoading ? (
                    <div className="p-6 text-center text-gray-500 dark:text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                      Carregando serviços…
                    </div>
                  ) : services.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-slate-400">
                      Nenhum serviço ativo encontrado para esta loja.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-slate-800">
                      {services
                        .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
                        .map((s) => {
                          const checked = !!selectedSvc[s.id];
                          return (
                            <li key={s.id} className="p-3 flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSvc(s.id)}
                                className="w-4 h-4"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-800 dark:text-slate-100">{s.name}</div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                  {(s.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · {s.duration_min} min
                                </div>
                              </div>
                              {s.color && <span className="w-4 h-4 rounded" style={{ background: s.color }} />}
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>

                {!hasSelectedSvc && (
                  <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Selecione pelo menos um serviço para continuar.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex items-center justify-between border-t border-gray-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900">
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {step === 1 ? 'Etapa 1 de 2 — Dados do membro' : 'Etapa 2 de 2 — Seleção de serviços'}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800">
                Fechar
              </button>
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Voltar
                </button>
              )}
              {step === 1 ? (
                <button
                  disabled={!canGoStep2}
                  onClick={() => setStep(2)}
                  className={`px-3 py-2 rounded-xl text-white ${canGoStep2 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-300 cursor-not-allowed'}`}
                >
                  Continuar
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!hasSelectedSvc || saving}
                  className={`px-3 py-2 rounded-xl text-white ${(!hasSelectedSvc || saving) ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> : <Check className="w-4 h-4 inline-block mr-2" />}
                  {mode === 'create' ? 'Concluir' : 'Salvar alterações'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberModal;
