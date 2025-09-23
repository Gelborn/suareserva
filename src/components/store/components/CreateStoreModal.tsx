import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, CheckCircle2 } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<{ id: string; name: string } | null>;
  onGoToStore: (id: string) => void;
  onGoToList: () => void;
};

const CreateStoreModal: React.FC<Props> = ({ open, onClose, onCreate, onGoToStore, onGoToList }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string>('');

  const canSubmit = name.trim().length >= 2 && !submitting;

  useEffect(() => {
    if (!open) {
      setName('');
      setSubmitting(false);
      setCreatedId(null);
      setCreatedName('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onClick = (e: MouseEvent) => {
      if (!dialogRef.current) return;
      if (!dialogRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    // atraso pequeno para não fechar ao clicar no botão que abriu
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, onClose]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await onCreate(name.trim());
      if (res) {
        setCreatedId(res.id);
        setCreatedName(res.name);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      {/* dialog */}
      <div
        ref={dialogRef}
        className="relative w-[92%] max-w-lg bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/70 dark:border-gray-700/70">
          <h3 className="text-lg font-semibold">
            {createdId ? 'Loja criada' : 'Criar loja'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* body */}
        {!createdId ? (
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Dê um nome para sua loja/unidade. Você poderá ajustar o endereço, horários, serviços e página pública logo em seguida.
            </p>

            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Nome da loja</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Unidade Centro, Barbershop Moema…"
                className="mt-1 w-full px-3 py-2 rounded-xl border bg-transparent"
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold"
              >
                <Plus className="w-5 h-5" />
                {submitting ? 'Criando…' : 'Criar loja'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 text-center">
            <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="mt-4 text-xl font-semibold">Loja criada com sucesso!</h4>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              <span className="font-medium">{createdName}</span> foi criada. Você já pode configurar horários, serviços e o visual da página pública.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onGoToStore(createdId)}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                Gerenciar loja
              </button>
              <button
                onClick={() => onGoToList()}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
              >
                Ver lojas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateStoreModal;
