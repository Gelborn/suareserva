import React from 'react';
import Card from '../components/Card';
import { Palette, Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';

type Props = {
  info: { name?: string } & Record<string, any>;

  // Cores (o pai persiste quando chamados)
  primary: string;
  secondary: string;
  onPrimary: (v: string) => void;
  onSecondary: (v: string) => void;

  // Imagens atuais (persistidas) + setters que salvam no banco (pai)
  logoUrl: string | null;
  coverUrl: string | null;
  onLogo: (v: string | null) => void;
  onCover: (v: string | null) => void;

  // IDs para upload
  storeId?: string;
  businessId?: string;
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

  // zera pendências quando props externas mudarem (ex.: após salvar)
  React.useEffect(() => setPendingLogo(null), [logoUrl]);
  React.useEffect(() => setPendingCover(null), [coverUrl]);

  const hasLogoChange = pendingLogo !== null; // null => sem mudança staged; string => novo URL; "" (não uso) — usamos null para remover
  const hasCoverChange = pendingCover !== null;
  const hasAnyChange = hasLogoChange || hasCoverChange;

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) { toast.error('Envie uma imagem.'); e.target.value = ''; return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('Imagem muito grande (máx 3 MB).'); e.target.value = ''; return; }

    // Dev fallback (sem IDs): preview local sem chamar onLogo/onCover
    if (!storeId || !businessId) {
      const url = URL.createObjectURL(file);
      if (kind === 'logo') setPendingLogo(url);
      else setPendingCover(url);
      e.target.value = '';
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

      if (kind === 'logo') setPendingLogo(publicUrl);
      else setPendingCover(publicUrl);
      // sem toast aqui — só tostar quando realmente salvar no banco
    } catch (err) {
      console.error(err);
      toast.error('Falha ao enviar a imagem.');
    } finally {
      setUpLoading(null);
      e.target.value = '';
    }
  };

  const clearImg = (kind: 'logo' | 'cover') => {
    // marcar remoção staged (null significa “sem mudança”; para remover usamos string vazia especial? melhor usar um sentinel)
    // usaremos string especial '__REMOVE__' para indicar remoção
    if (kind === 'logo') setPendingLogo('__REMOVE__');
    else setPendingCover('__REMOVE__');
  };

  const applySaves = async () => {
    try {
      // logo
      if (hasLogoChange) {
        if (pendingLogo === '__REMOVE__') await onLogo(null);
        else await onLogo(pendingLogo);
      }
      // cover
      if (hasCoverChange) {
        if (pendingCover === '__REMOVE__') await onCover(null);
        else await onCover(pendingCover);
      }
      toast.success('Imagens salvas');
      // deixar o pai refetchar e, quando props voltarem, os pendings são limpos pelos effects
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível salvar as imagens.');
    }
  };

  // resolve qual URL mostrar (prioriza staged)
  const logoPreview = pendingLogo && pendingLogo !== '__REMOVE__' ? pendingLogo : logoUrl;
  const coverPreview = pendingCover && pendingCover !== '__REMOVE__' ? pendingCover : coverUrl;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* ===== Imagens (primeiro) ===== */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700">
            <ImageIcon className="w-5 h-5 text-gray-700 dark:text-slate-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Logo e capa</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Envie imagens leves (até 3&nbsp;MB). As mudanças só são publicadas ao clicar em <strong>Salvar alterações</strong>.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-6">
          {/* Logo */}
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-2">Logo</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 overflow-hidden grid place-items-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>

              <label
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700
                           bg-white hover:bg-gray-50 dark:bg-slate-900/70 dark:hover:bg-slate-800 text-xs cursor-pointer"
              >
                {upLoading === 'logo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Trocar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickFile(e, 'logo')}
                />
              </label>

              {(logoPreview || pendingLogo === '__REMOVE__') && (
                <button
                  onClick={() => clearImg('logo')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700
                             hover:bg-gray-50 dark:hover:bg-slate-800 text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              )}
            </div>
          </div>

          {/* Capa */}
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-2">Capa (opcional)</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-28 h-16 rounded-xl bg-gray-100 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 overflow-hidden grid place-items-center">
                {coverPreview ? (
                  <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>

              <label
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700
                           bg-white hover:bg-gray-50 dark:bg-slate-900/70 dark:hover:bg-slate-800 text-xs cursor-pointer"
              >
                {upLoading === 'cover' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Trocar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickFile(e, 'cover')}
                />
              </label>

              {(coverPreview || pendingCover === '__REMOVE__') && (
                <button
                  onClick={() => clearImg('cover')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700
                             hover:bg-gray-50 dark:hover:bg-slate-800 text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer de salvar (aparece apenas com mudanças staged) */}
        {hasAnyChange && (
          <div className="mt-5 flex items-center justify-end">
            <button
              onClick={applySaves}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              Salvar alterações
            </button>
          </div>
        )}
      </Card>

      {/* ===== Cores ===== */}
      <Card className="xl:col-span-2 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700">
            <Palette className="w-5 h-5 text-gray-700 dark:text-slate-200" />
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
    </div>
  );
};

export default ThemeTab;
