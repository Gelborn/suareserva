import React from 'react';
import Card from '../components/Card';
import Checklist from '../components/Checklist';
import { Info, CheckCircle2 } from 'lucide-react';
import { TabKey } from '../components/Tabs';
import toast from 'react-hot-toast';

import type { StoreForm } from './InfoTab';

type Completeness = {
  filledInfo: boolean;
  filledHours: boolean;
  filledServices: boolean;
  filledTheme: boolean;
  allGood: boolean;
};

type SlugCheckResult = { available: boolean; suggestion?: string };

const prettyUrl = (s?: string) =>
  (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const OverviewTab: React.FC<{
  info: StoreForm;
  logoUrl: string | null;     // compat
  primary: string;            // —
  secondary: string;          // —
  completeness: Completeness;
  goTo: (tab: TabKey) => void;
  domainBase?: string;
  onCheckSlug?: (slug: string) => Promise<SlugCheckResult>;
  onSaveSlug?: (slug: string) => Promise<void>;
}> = ({
  info,
  completeness,
  goTo,
  domainBase = 'suareserva.online',
  onCheckSlug,
  onSaveSlug,
}) => {
  const steps = [
    { ok: completeness.filledInfo,     label: 'Dados da loja',            tab: 'info' as TabKey },
    { ok: completeness.filledHours,    label: 'Horário de funcionamento', tab: 'hours' as TabKey },
    { ok: completeness.filledServices, label: 'Serviços',                 tab: 'services' as TabKey },
    { ok: completeness.filledTheme,    label: 'Personalização',           tab: 'theme' as TabKey },
  ];
  const total = steps.length;
  const done  = steps.filter(s => s.ok).length;

  const [slug, setSlug] = React.useState(info.slug || '');
  const [status, setStatus] = React.useState<'idle'|'checking'|'ok'|'taken'|'error'>('idle');
  const [msg, setMsg] = React.useState<string>('');

  React.useEffect(() => {
    setSlug(info.slug || '');
    setStatus('idle');
    setMsg('');
  }, [info.slug]);

  const handleCheck = async () => {
    const s = prettyUrl(slug);
    setSlug(s);
    if (!s) { setStatus('error'); setMsg('Informe um slug válido.'); return; }
    if (!onCheckSlug) { setStatus('ok'); setMsg('Formato válido.'); return; }
    try {
      setStatus('checking'); setMsg('');
      const res = await onCheckSlug(s);
      if (res.available) { setStatus('ok'); setMsg('Disponível! 🙌'); }
      else { setStatus('taken'); setMsg(res.suggestion ? `Já em uso. Sugestão: ${res.suggestion}` : 'Já em uso.'); }
    } catch { setStatus('error'); setMsg('Erro ao verificar. Tente novamente.'); }
  };

  const handleSave = async () => {
    const s = prettyUrl(slug);
    if (!s) { toast.error('Informe um slug válido.'); return; }
    if (!onSaveSlug) { toast.success('Slug salvo (mock).'); return; }
    try { await onSaveSlug(s); toast.success('Slug salvo!'); }
    catch { toast.error('Não foi possível salvar o slug.'); }
  };

  const hasSlug = Boolean(info.slug);
  const publicUrl = slug ? `https://${domainBase}/${slug}` : `https://${domainBase}/sua-loja`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-start-1 lg:col-span-3 p-5">
        {/* AVISO DISCRETO NO TOPO — com recuo lateral só no mobile */}
        {!completeness.allGood && (
          <div className="mb-4">
            <div className="mx-2 sm:mx-0 flex items-start gap-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
              <Info className="w-4 h-4 text-amber-700 dark:text-amber-300 mt-0.5" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                Há itens pendentes no checklist abaixo. Conclua todos para liberar a página pública da sua loja.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700">
            <Info className="w-5 h-5 text-gray-700 dark:text-slate-200" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Checklist</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">Finalize os passos para publicar sua página.</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-3">
            <span className="text-xs text-gray-600 dark:text-slate-400">{done}/{total} concluídos</span>
            <div className="w-36 h-2 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Checklist — com recuo lateral só no mobile */}
        <div className="mt-4 mx-2 sm:mx-0">
          <Checklist
            items={steps.map(s => ({
              ok: s.ok,
              label: s.label,
              onClick: () => goTo(s.tab),
            }))}
          />
        </div>

        {/* Slug Section */}
        {completeness.allGood && (
          <div className="mt-6">
            {!hasSlug ? (
              <div className="mx-2 sm:mx-0 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-4">
                <div className="text-sm text-indigo-900 dark:text-indigo-200">
                  Sua loja está pronta! Defina o link exclusivo abaixo.
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                  <div className="flex items-center rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2">
                    <span className="text-sm text-gray-500 dark:text-slate-400 mr-2">{domainBase}/</span>
                    <input
                      className="w-full bg-transparent outline-none text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                      placeholder="sua-loja"
                      value={slug}
                      onChange={(e) => { setSlug(e.target.value); setStatus('idle'); setMsg(''); }}
                      onBlur={(e) => setSlug(prettyUrl(e.currentTarget.value))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheck}
                    className="rounded-xl px-3 py-2 text-sm font-medium border border-gray-300 dark:border-slate-700 bg-gray-50 hover:bg-gray-100 dark:bg-slate-900/70 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 transition"
                  >
                    Verificar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={status==='taken' || status==='checking'}
                    className="rounded-xl px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
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
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-500">
                  Seu link público ficará assim: <span className="font-medium">{publicUrl}</span>
                </div>
              </div>
            ) : (
              <div className="mx-2 sm:mx-0 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-700 dark:text-emerald-300" />
                <div className="text-sm text-emerald-900 dark:text-emerald-200">
                  Sua loja já está ativa em <span className="font-medium">https://{domainBase}/{info.slug}</span>.  
                  Dica: adicione o link nas suas redes sociais para maximizar agendamentos.
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default OverviewTab;
