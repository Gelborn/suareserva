// src/components/Account/ProfileModal.tsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Mail, Phone, Globe, Copy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toastSuccess } from '../../lib/toast';

const formatPhoneBr = (digits?: string | null) => {
  if (!digits) return '';
  const d = String(digits).replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  return d.length <= 10
    ? d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*$/, (_, a, b, c) =>
        `${a ? `(${a}${a.length === 2 ? ')' : ''}` : ''}${a && a.length === 2 ? ' ' : ''}${b}${c ? `-${c}` : ''}`.trim()
      )
    : d.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*$/, (_, a, b, c) =>
        `${a ? `(${a}${a.length === 2 ? ')' : ''}` : ''}${a && a.length === 2 ? ' ' : ''}${b}${c ? `-${c}` : ''}`.trim()
      );
};

type ProfileModalProps = { open: boolean; onClose: () => void };

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const biz = user?.business || null;
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden'; // trava scroll por trás
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess('Copiado!');
    } catch {}
  };

  const node = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      onMouseDown={onClose}
      aria-modal="true"
      role="dialog"
    >
      {/* overlay sólido e consistente no dark */}
      <div className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-[1px]" />
      <div
        ref={dialogRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{biz?.name || 'Negócio'}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Perfil do negócio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Nome</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{biz?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Time zone</p>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-900 dark:text-white">{biz?.timezone || 'America/Sao_Paulo'}</p>
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">E-mail</p>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {biz?.contact_email || user?.email || '—'}
                  </p>
                </div>
                {(biz?.contact_email || user?.email) && (
                  <button
                    onClick={() => copy(biz?.contact_email || user?.email!)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Copiar e-mail"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Telefone</p>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {formatPhoneBr(biz?.contact_phone) || '—'}
                  </p>
                </div>
                {biz?.contact_phone && (
                  <button
                    onClick={() => copy(formatPhoneBr(biz.contact_phone))}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Copiar telefone"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

export default ProfileModal;
