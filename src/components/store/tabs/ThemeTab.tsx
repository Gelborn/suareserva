import React from 'react';
import Card from '../components/Card';
import { Palette, Image as ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';

type Props = {
  info: { name?: string } & Record<string, any>;

  // Cores
  primary: string;
  secondary: string;
  onPrimary: (v: string) => void;
  onSecondary: (v: string) => void;

  // Imagens + persistência pelo pai
  logoUrl: string | null;
  coverUrl: string | null;
  onLogo: (v: string | null) => Promise<void> | void;
  onCover: (v: string | null) => Promise<void> | void;

  // IDs para upload
  storeId?: string;
  businessId?: string;

  // Controla se este componente deve exibir toast de sucesso
  showSuccessToast?: boolean;
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const normalizeHex = (s: string) => {
  let v = (s || '').trim();
  if (!v) return '#000000';
  if (v[0] !== '#') v = `#${v}`;
  if (!HEX_RE.test(v)) return v.toLowerCase();
  if (v.length === 4) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return v.toLowerCase();
};

const presets = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#111827'];

/* ───────────────────────── Confirm Dialog ───────────────────────── */
const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}> = ({ open, title, description, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onClose }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onConfirm, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[61] w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h4>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">{description}</p>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── Component ───────────────────────── */
const ThemeTab: React.FC<Props> = ({
  info,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  logoUrl,
  coverUrl,
  onLogo,
  onCover,
  storeId,
  businessId,
  showSuccessToast = true,
}) => {
  // ---- Cores (commit no onBlur/onClick) ----
  const [primaryLocal, setPrimaryLocal] = React.useState(primary);
  const [secondaryLocal, setSecondaryLocal] = React.useState(secondary);
  React.useEffect(() => setPrimaryLocal(primary), [primary]);
  React.useEffect(() => setSecondaryLocal(secondary), [secondary]);

  const commitPrimary = () => {
    const v = normalizeHex(primaryLocal);
    if (!HEX_RE.test(v)) return toast.error('Cor primária inválida.');
    onPrimary(v);
  };
  const commitSecondary = () => {
    const v = normalizeHex(secondaryLocal);
    if (!HEX_RE.test(v)) return toast.error('Cor secundária inválida.');
    onSecondary(v);
  };

  // ---- Imagens (stage → salvar) ----
  const [upLoading, setUpLoading] = React.useState<'logo' | 'cover' | null>(null);
  const [pendingLogo, setPendingLogo] = React.useState<string | null>(null);
  const [pendingCover, setPendingCover] = React.useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = React.useState<{ logo?: string; cover?: string }>({});
  const [saving, setSaving] = React.useState(false);

  // Remoção imediata
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmKind, setConfirmKind] = React.useState<'logo' | 'cover' | null>(null);
  const [deleting, setDeleting] = React.useState<'logo' | 'cover' | null>(null);

  // zera pendências quando props externas mudarem (após salvar pelo pai)
  React.useEffect(() => setPendingLogo(null), [logoUrl]);
  React.useEffect(() => setPendingCover(null), [coverUrl]);

  const hasLogoChange = pendingLogo !== null;
  const hasCoverChange = pendingCover !== null;
  const hasAnyChange = hasLogoChange || hasCoverChange;

  const MAX_MB = 3;
  const MAX_BYTES = MAX_MB * 1024 * 1024;

  const handleFile = async (file: File, kind: 'logo' | 'cover') => {
    if (!file.type.startsWith('image/')) { toast.error('Envie uma imagem.'); return; }
    if (file.size > MAX_BYTES) { toast.error(`Imagem muito grande (máx ${MAX_MB} MB).`); return; }

    // Dev fallback (sem IDs): preview local sem persistir
    if (!storeId || !businessId) {
      const url = URL.createObjectURL(file);
      if (kind === 'logo') {
        setPendingLogo(url);
        setPendingFileName((p) => ({ ...p, logo: file.name }));
      } else {
        setPendingCover(url);
        setPendingFileName((p) => ({ ...p, cover: file.name }));
      }
      return;
    }

    try {
      setUpLoading(kind);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const ts = Date.now();
      const path = `${businessId}/${storeId}/${kind}_${ts}.${ext}`;
      const bucket = 'store-assets';

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = data.publicUrl;

      if (kind === 'logo') {
        setPendingLogo(publicUrl);
        setPendingFileName((p) => ({ ...p, logo: file.name }));
      } else {
        setPendingCover(publicUrl);
        setPendingFileName((p) => ({ ...p, cover: file.name }));
      }
      // sem toast aqui — só quando salvar no banco
    } catch (err) {
      console.error(err);
      toast.error('Falha ao enviar a imagem.');
    } finally {
      setUpLoading(null);
    }
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    handleFile(file, kind);
  };

  const onDrop = (ev: React.DragEvent<HTMLDivElement>, kind: 'logo' | 'cover') => {
    ev.preventDefault();
    const file = ev.dataTransfer.files?.[0];
    if (file) handleFile(file, kind);
  };

  // Remoção: abre diálogo
  const clearImgAsk = (kind: 'logo' | 'cover') => {
    setConfirmKind(kind);
    setConfirmOpen(true);
  };

  // Remoção: confirma e já PERSISTE (sem “Salvar alterações”)
  const clearImgConfirm = async () => {
    if (!confirmKind) return;
    try {
      setDeleting(confirmKind);

      if (confirmKind === 'logo') {
        setPendingLogo(null);       // limpa qualquer staged
        await onLogo(null);         // persiste
      } else {
        setPendingCover(null);
        await onCover(null);
      }

      if (showSuccessToast) toast.success('Imagem removida.');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível remover a imagem.');
    } finally {
      setDeleting(null);
      setConfirmOpen(false);
    }
  };

  const undoPending = (kind: 'logo' | 'cover') => {
    if (kind === 'logo') setPendingLogo(null);
    else setPendingCover(null);
    setPendingFileName((p) => ({ ...p, [kind]: undefined }));
  };

  const applySaves = async () => {
    try {
      setSaving(true);

      // Salva apenas uploads staged (remoção agora é imediata)
      if (hasLogoChange && pendingLogo) {
        await onLogo(pendingLogo);
      }
      if (hasCoverChange && pendingCover) {
        await onCover(pendingCover);
      }

      if (showSuccessToast) toast.success('Imagens salvas.');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível salvar as imagens.');
    } finally {
      setSaving(false);
    }
  };

  // preview (prioriza staged)
  const logoPreview = pendingLogo ?? logoUrl;
  const coverPreview = pendingCover ?? coverUrl;

  // Estilos base p/ botões menores + ícones brancos no dark
  const btnBase =
    'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-colors ' +
    'border-gray-200 dark:border-slate-700 bg-white hover:bg-gray-50 dark:bg-slate-900/70 dark:hover:bg-slate-800 ' +
    'text-gray-800 dark:text-white';
  const iconSm = 'w-4 h-4';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* ===== Imagens ===== */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700">
            <ImageIcon className="w-5 h-5 text-gray-700 dark:text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Logo e capa</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Envie imagens leves (até 3&nbsp;MB). As mudanças de upload só são publicadas ao clicar em <strong>Salvar alterações</strong>.
            </p>
          </div>
        </div>

        {hasAnyChange && (
          <div className="mt-4 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Há alterações pendentes de upload. Clique em <strong>Salvar alterações</strong> para publicar.
          </div>
        )}

        <div className="mt-5 space-y-6">
          {/* Logo */}
          <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, 'logo')}>
            <div className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-2">Logo</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 overflow-hidden grid place-items-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400 dark:text-slate-300" />
                )}
              </div>

              <label className={`${btnBase} cursor-pointer`}>
                {upLoading === 'logo' ? <Loader2 className={`${iconSm} animate-spin`} /> : <Upload className={iconSm} />}
                <span className="hidden sm:inline">Trocar</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e, 'logo')} />
              </label>

              {logoPreview && (
                <>
                  <button
                    onClick={() => clearImgAsk('logo')}
                    className={btnBase}
                    disabled={deleting === 'logo'}
                  >
                    {deleting === 'logo' ? <Loader2 className={`${iconSm} animate-spin`} /> : <Trash2 className={iconSm} />}
                    <span className="hidden sm:inline">{deleting === 'logo' ? 'Removendo…' : 'Remover'}</span>
                  </button>
                  {hasLogoChange && pendingLogo && (
                    <button onClick={() => undoPending('logo')} className={btnBase} disabled={deleting !== null}>
                      <X className={iconSm} />
                      <span className="hidden sm:inline">Desfazer</span>
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Arraste e solte uma imagem aqui para enviar.
              {pendingFileName.logo && pendingLogo && (
                <span className="ml-2">Selecionado: <strong>{pendingFileName.logo}</strong></span>
              )}
            </div>
          </div>

          {/* Capa */}
          <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, 'cover')}>
            <div className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-2">Capa (opcional)</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-28 h-16 rounded-xl bg-gray-100 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 overflow-hidden grid place-items-center">
                {coverPreview ? (
                  <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400 dark:text-slate-300" />
                )}
              </div>

              <label className={`${btnBase} cursor-pointer`}>
                {upLoading === 'cover' ? <Loader2 className={`${iconSm} animate-spin`} /> : <Upload className={iconSm} />}
                <span className="hidden sm:inline">Trocar</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e, 'cover')} />
              </label>

              {coverPreview && (
                <>
                  <button
                    onClick={() => clearImgAsk('cover')}
                    className={btnBase}
                    disabled={deleting === 'cover'}
                  >
                    {deleting === 'cover' ? <Loader2 className={`${iconSm} animate-spin`} /> : <Trash2 className={iconSm} />}
                    <span className="hidden sm:inline">{deleting === 'cover' ? 'Removendo…' : 'Remover'}</span>
                  </button>
                  {hasCoverChange && pendingCover && (
                    <button onClick={() => undoPending('cover')} className={btnBase} disabled={deleting !== null}>
                      <X className={iconSm} />
                      <span className="hidden sm:inline">Desfazer</span>
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Arraste e solte uma imagem aqui para enviar.
              {pendingFileName.cover && pendingCover && (
                <span className="ml-2">Selecionado: <strong>{pendingFileName.cover}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Footer de salvar (aparece apenas com uploads staged) */}
        {hasAnyChange && (
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={applySaves}
              disabled={saving}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-medium ${
                saving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        )}
      </Card>

      {/* ===== Cores ===== */}
      <Card className="xl:col-span-2 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700">
            <Palette className="w-5 h-5 text-gray-700 dark:text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Cores da sua página</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Escolha as cores principais. Use o seletor ou cole um HEX.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Primária */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Cor primária</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                value={primaryLocal}
                onChange={(e) => setPrimaryLocal(e.target.value)}
                onBlur={commitPrimary}
                className="h-9 w-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70"
                aria-label="Selecionar cor primária"
              />
              <input
                value={primaryLocal}
                onChange={(e) => setPrimaryLocal(e.target.value)}
                onBlur={commitPrimary}
                placeholder="#6366f1"
                className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                           px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map((c) => (
                <button
                  key={c}
                  onClick={() => { setPrimaryLocal(c); onPrimary(c); }}
                  className="w-7 h-7 rounded-lg border border-gray-200 dark:border-slate-700"
                  style={{ backgroundColor: c }}
                  title={c}
                  aria-label={`Preset ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Secundária */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Cor secundária</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                value={secondaryLocal}
                onChange={(e) => setSecondaryLocal(e.target.value)}
                onBlur={commitSecondary}
                className="h-9 w-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70"
                aria-label="Selecionar cor secundária"
              />
              <input
                value={secondaryLocal}
                onChange={(e) => setSecondaryLocal(e.target.value)}
                onBlur={commitSecondary}
                placeholder="#8b5cf6"
                className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                           px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map((c) => (
                <button
                  key={c}
                  onClick={() => { setSecondaryLocal(c); onSecondary(c); }}
                  className="w-7 h-7 rounded-lg border border-gray-200 dark:border-slate-700"
                  style={{ backgroundColor: c }}
                  title={c}
                  aria-label={`Preset ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-900/70">
            <div className="text-sm text-gray-600 dark:text-slate-400">Preview</div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-white" style={{ background: primaryLocal }}>
                <div className="text-sm opacity-90">Botão primário</div>
                <div className="mt-2 font-semibold">Agendar agora</div>
              </div>
              <div className="rounded-xl p-4 text-white" style={{ background: secondaryLocal }}>
                <div className="text-sm opacity-90">Destaque</div>
                <div className="mt-2 font-semibold">Promo de sexta</div>
              </div>
              <div className="rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                <div className="text-sm text-gray-700 dark:text-slate-200">Cards / superfícies</div>
                <div className="mt-2 text-gray-600 dark:text-slate-400 text-sm">
                  As cores serão aplicadas nos elementos estratégicos da sua página pública.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal de confirmação para remover logo/capa (remoção imediata) */}
      <ConfirmDialog
        open={confirmOpen}
        title="Remover imagem?"
        description={
          confirmKind === 'logo'
            ? 'Tem certeza que deseja remover a logo?'
            : 'Tem certeza que deseja remover a capa?'
        }
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={clearImgConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default ThemeTab;
