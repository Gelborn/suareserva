import React from 'react';
import { CheckCircle2, AlertCircle, Copy, ExternalLink, Pencil } from 'lucide-react';
import Card from '../components/Card';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import type { StoreForm } from './InfoTab';
import { TabKey } from '../components/Tabs';

/* ──────────────── Helpers ──────────────── */

const prettyUrl = (s?: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/* ──────────────── Types ──────────────── */

type RpcStoreStatus = {
  has_general_info: boolean;
  has_hours: boolean;
  has_services: boolean;
  status: 'active' | 'hasDependencies' | string;
};

/* ──────────────── Component ──────────────── */

const OverviewTab: React.FC<{
  storeId: string;
  info: StoreForm;
  logoUrl?: string | null;
  primary?: string;
  secondary?: string;
  goTo: (tab: TabKey) => void;
  domainBase?: string;
  onSlugChanged?: (slug: string) => void;
}> = ({
  storeId,
  info,
  logoUrl,
  primary = '#6366f1',
  secondary = '#8b5cf6',
  goTo,
  domainBase = 'suareserva.online',
  onSlugChanged,
}) => {
  /* === Status via RPC === */
  const [cmp, setCmp] = React.useState({
    filledInfo: false,
    filledHours: false,
    filledServices: false,
    allGood: false,
  });
  const [cmpLoading, setCmpLoading] = React.useState(true);
  // ✅ evita “flash” mantendo a tela final enquanto revalida
  const [optimisticActive, setOptimisticActive] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    try {
      setCmpLoading(true);
      const { data, error } = await supabase.rpc('store_status', { p_store_id: storeId });
      if (error) throw error;
      const r = (data || {}) as RpcStoreStatus;
      setCmp({
        filledInfo: !!r.has_general_info,
        filledHours: !!r.has_hours,
        filledServices: !!r.has_services,
        allGood: r.status === 'active',
      });
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar o status da loja.');
      setCmp({ filledInfo: false, filledHours: false, filledServices: false, allGood: false });
    } finally {
      setCmpLoading(false);
      setOptimisticActive(false); // encerra o modo otimista após revalidação
    }
  }, [storeId]);

  React.useEffect(() => { loadStatus(); }, [loadStatus]);

  /* === Opcional (personalização) === */
  const optionalDone =
    (logoUrl && logoUrl.trim() !== '') ||
    primary.toLowerCase() !== '#6366f1' ||
    secondary.toLowerCase() !== '#8b5cf6';

  const required = [
    { ok: cmp.filledInfo, label: 'Dados da loja', tab: 'info' as TabKey },
    { ok: cmp.filledHours, label: 'Horário de funcionamento', tab: 'hours' as TabKey },
    { ok: cmp.filledServices, label: 'Serviços', tab: 'services' as TabKey },
  ];
  const optional = { ok: optionalDone, label: 'Personalize sua loja', optional: true, tab: 'theme' as TabKey };

  const total = required.length;
  const done = required.filter(s => s.ok).length;

  /* === Slug (auto-check com debounce) === */
  const [savedSlug, setSavedSlug] = React.useState(info.slug || '');
  const [editingSlug, setEditingSlug] = React.useState(false);

  const [slug, setSlug] = React.useState(info.slug || '');
  const [status, setStatus] = React.useState<'idle'|'checking'|'ok'|'taken'|'error'>('idle');
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => {
    setSavedSlug(info.slug || '');
    if (!editingSlug) {
      setSlug(info.slug || '');
      setStatus('idle'); setMsg('');
    }
  }, [info.slug, editingSlug]);

  const checkSlug = React.useCallback(async (raw: string) => {
    const s = prettyUrl(raw);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return { available: false };
    const { data, error } = await supabase.from('stores').select('id').eq('slug', s).limit(1);
    if (error) return { available: false };
    const available = !data || data.length === 0;
    return { available, suggestion: available ? undefined : `${s}-${Math.floor(Math.random()*900+100)}` };
  }, []);

  const saveSlug = React.useCallback(async (raw: string) => {
    const s = prettyUrl(raw);
    const { error } = await supabase.from('stores').update({ slug: s }).eq('id', storeId);
    if (error) throw error;
  }, [storeId]);

  // debounce enquanto digita
  React.useEffect(() => {
    if (!editingSlug) return;
    const raw = slug || '';
    const s = prettyUrl(raw);

    if (!raw.trim()) { setStatus('idle'); setMsg(''); return; }
    if (s.length < 3) { setStatus('error'); setMsg('Mínimo de 3 caracteres.'); return; }
    if (savedSlug && s === savedSlug) { setStatus('ok'); setMsg('Este já é o seu link.'); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) { setStatus('error'); setMsg('Use letras/números e hífens.'); return; }

    let cancelled = false;
    setStatus('checking'); setMsg('');
    const t = setTimeout(async () => {
      try {
        const res = await checkSlug(s);
        if (cancelled) return;
        if (res.available) { setStatus('ok'); setMsg('Disponível! 🙌'); }
        else { setStatus('taken'); setMsg(res.suggestion ? `Já em uso. Sugestão: ${res.suggestion}` : 'Já em uso.'); }
      } catch {
        if (!cancelled) { setStatus('error'); setMsg('Erro ao verificar.'); }
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [slug, savedSlug, editingSlug, checkSlug]);

  const fireConfetti = React.useCallback(async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, ticks: 180, scalar: 0.9 });
    } catch {}
  }, []);

  const handleSave = async () => {
    const s = prettyUrl(slug);
    if (!s || status !== 'ok' || s === savedSlug) return;
    try {
      await saveSlug(s);
      setSavedSlug(s);            // reflete imediatamente
      setEditingSlug(false);
      // 🔇 sem toast aqui para evitar duplicidade; deixe o do updateStore (pai)
      fireConfetti();
      setOptimisticActive(true);  // mantém a tela final enquanto revalida
      loadStatus();               // revalida status
      onSlugChanged?.(s);         // pai atualiza header / salva silencioso
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    } catch (err:any) {
      toast.error(err?.message || 'Erro ao salvar.');
    }
  };

  const publicUrl = savedSlug ? `https://${domainBase}/${savedSlug}` : `https://${domainBase}/sua-loja`;
  const inner = 'w-full';

  /* === Checklist inline (compacto) === */
  const Checklist = ({
    items,
  }: {
    items: Array<{ ok: boolean; label: string; optional?: boolean; onClick: () => void }>;
  }) => (
    <div className="space-y-2 mt-4">
      {items.map((it, i) => (
        <button
          key={i}
          onClick={it.onClick}
          className="w-full flex items-center justify-between p-3 rounded-xl border
                     hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left
                     border-gray-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full grid place-items-center ${it.ok ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
              {it.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <span className="text-sm text-gray-800 dark:text-slate-100 flex items-center gap-2">
              {it.label}
              {it.optional && (
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/70 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded-md">
                  opcional
                </span>
              )}
            </span>
          </div>
          <span className="text-xs text-indigo-600 dark:text-indigo-400">ir →</span>
        </button>
      ))}
    </div>
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      // mantive um toast aqui porque é uma ação distinta do usuário
      toast.success('Link copiado!');
    } catch {
      const input = document.createElement('input');
      input.value = publicUrl;
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); toast.success('Link copiado!'); }
      catch { toast.error('Não foi possível copiar.'); }
      finally { document.body.removeChild(input); }
    }
  };

  /* === UI blocks reutilizáveis === */
  const SlugEditorBlock = (
    <div className={inner + ' mt-0'}>
      <div className="rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-4">
        <div className="text-sm text-indigo-900 dark:text-indigo-200">
          {savedSlug ? 'Defina um novo link exclusivo (se quiser alterar).' : 'Sua loja está quase lá! Defina o link exclusivo abaixo.'}
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <div className="flex items-center rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2">
            <span className="text-sm text-gray-500 dark:text-slate-400 mr-2">{domainBase}/</span>
            <input
              className="w-full bg-transparent outline-none text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
              placeholder="sua-loja"
              value={slug}
              onChange={(e) => { setEditingSlug(true); setSlug(e.target.value); }}
              onBlur={(e) => setSlug(prettyUrl(e.currentTarget.value))}
            />
          </div>
          {savedSlug ? (
            <button
              type="button"
              onClick={() => { setEditingSlug(false); setSlug(savedSlug); setStatus('idle'); setMsg(''); }}
              className="rounded-xl px-3 py-2 text-xs sm:text-sm font-medium border border-gray-300 dark:border-slate-700
                         bg-white hover:bg-gray-50 dark:bg-slate-900/70 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 transition"
            >
              Cancelar
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={status!=='ok' || prettyUrl(slug) === savedSlug}
            className="rounded-xl px-3 py-2 text-xs sm:text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
        <div className="mt-1 min-h-[1.25rem] text-sm">
          {status==='checking' && <span className="text-indigo-600 dark:text-indigo-400">Verificando…</span>}
          {status==='ok' && <span className="text-emerald-700 dark:text-emerald-400">{msg||'Disponível!'}</span>}
          {status==='taken' && <span className="text-rose-700 dark:text-rose-400">{msg||'Já em uso.'}</span>}
          {status==='error' && <span className="text-amber-700 dark:text-amber-400">{msg||'Erro ao verificar.'}</span>}
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-slate-500">
          Seu link ficará assim: <span className="font-medium">{`https://${domainBase}/${prettyUrl(slug || 'sua-loja')}`}</span>
        </div>
      </div>
    </div>
  );

  /* === Render === */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-start-1 lg:col-span-3 p-5">
        {editingSlug ? (
          /* — EDIÇÃO ISOLADA — */
          <div className={inner}>
            <div className="rounded-2xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-4 sm:p-5">
              <h4 className="text-base sm:text-lg font-semibold text-indigo-900 dark:text-indigo-200">Editar link da loja</h4>
              <p className="text-sm text-indigo-900/80 dark:text-indigo-200/80 mt-1">Escolha um identificador único para sua loja.</p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                <div className="flex items-center rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2">
                  <span className="text-sm text-gray-500 dark:text-slate-400 mr-2">{domainBase}/</span>
                  <input
                    className="w-full bg-transparent outline-none text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    placeholder="sua-loja"
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); }}
                    onBlur={(e) => setSlug(prettyUrl(e.currentTarget.value))}
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setSlug(savedSlug); setStatus('idle'); setMsg(''); setEditingSlug(false); }}
                  className="rounded-xl px-3 py-2 text-xs sm:text-sm font-medium border border-gray-300 dark:border-slate-700
                             bg-white hover:bg-gray-50 dark:bg-slate-900/70 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={status!=='ok' || prettyUrl(slug) === savedSlug}
                  className="rounded-xl px-3 py-2 text-xs sm:text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>

              <div className="mt-1 min-h-[1.25rem] text-sm">
                {status==='checking' && <span className="text-indigo-600 dark:text-indigo-400">Verificando…</span>}
                {status==='ok' && <span className="text-emerald-700 dark:text-emerald-400">{msg||'Disponível!'}</span>}
                {status==='taken' && <span className="text-rose-700 dark:text-rose-400">{msg||'Já em uso.'}</span>}
                {status==='error' && <span className="text-amber-700 dark:text-amber-400">{msg||'Erro ao verificar.'}</span>}
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-slate-500">
                Seu link ficará assim: <span className="font-medium">{`https://${domainBase}/${prettyUrl(slug || 'sua-loja')}`}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* FINAL ATIVO + COM SLUG (sem flash graças ao optimisticActive) */}
            {((optimisticActive || (!cmpLoading && cmp.allGood)) && savedSlug) ? (
              <div className={inner + ' space-y-6'}>
                <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="hidden sm:flex p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200/70 dark:border-emerald-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <div className="min-w-0 w-full">
                      <h4 className="text-lg sm:text-xl font-semibold text-emerald-900 dark:text-emerald-200">Sua loja está ativa! 🚀</h4>
                      <p className="text-sm text-emerald-800/90 dark:text-emerald-300/90 mt-1">Compartilhe o link abaixo para começar a receber agendamentos.</p>

                      <div className="mt-4 rounded-xl border border-emerald-200/70 dark:border-emerald-900 bg-white/80 dark:bg-slate-900/70 px-3 py-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <div className="text-[15px] sm:text-base font-medium text-emerald-900 dark:text-emerald-200 break-all">{publicUrl}</div>
                          <div className="sm:ml-auto flex items-center gap-1.5 flex-wrap">
                            <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border border-emerald-300/70 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition">
                              <Copy className="w-3.5 h-3.5" /> Copiar
                            </button>
                            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border border-emerald-300/70 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition">
                              <ExternalLink className="w-3.5 h-3.5" /> Abrir
                            </a>
                            <button onClick={() => { setEditingSlug(true); setSlug(savedSlug); setStatus('idle'); setMsg(''); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border border-emerald-300/70 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition">
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">Divulgue nas redes</div>
                          <ul className="mt-1.5 text-sm text-gray-600 dark:text-slate-400 list-disc pl-5 space-y-1">
                            <li>Coloque o link na bio do Instagram e TikTok.</li>
                            <li>Fixe um story com o link.</li>
                            <li>Responda DMs com o link para agendar.</li>
                          </ul>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">Facilite o acesso</div>
                          <ul className="mt-1.5 text-sm text-gray-600 dark:text-slate-400 list-disc pl-5 space-y-1">
                            <li>Adicione o link no WhatsApp Business.</li>
                            <li>Coloque o link na descrição do perfil.</li>
                            <li>Compartilhe o link com clientes recorrentes.</li>
                          </ul>
                        </div>
                      </div>

                      {!optionalDone && (
                        <div className="mt-5 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-4">
                          <div className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Personalize sua loja (opcional)</div>
                          <p className="text-sm text-indigo-900/80 dark:text-indigo-200/80 mt-1">Adicione sua logo e cores para deixar sua página com a sua cara.</p>
                          <div className="mt-3">
                            <button onClick={() => goTo('theme')} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition">
                              Personalizar agora
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* ativo mas sem slug => só editor de slug */}
                {!cmpLoading && cmp.allGood && !savedSlug ? (
                  SlugEditorBlock
                ) : (
                  <>
                    <div className={inner + ' flex items-start'}>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Checklist</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400">Complete os passos obrigatórios. A personalização é opcional.</p>
                      </div>
                      <div className="ml-auto hidden sm:flex items-center gap-3">
                        <span className="text-xs text-gray-600 dark:text-slate-400">{done}/{total} concluídos</span>
                        <div className="w-36 h-2 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className={inner}>
                      <Checklist
                        items={[
                          ...required.map(s => ({ ok: s.ok, label: s.label, onClick: () => goTo(s.tab) })),
                          { ok: optional.ok, label: optional.label, optional: true, onClick: () => goTo(optional.tab) },
                        ]}
                      />
                    </div>

                    {SlugEditorBlock}
                  </>
                )}
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default OverviewTab;
