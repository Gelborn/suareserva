import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Mail, User, Phone, ArrowRight, Loader, Shield, RotateCcw } from 'lucide-react';
import { toastError, toastSuccess } from '../../lib/toast';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

/* ===== Helpers ===== */
const onlyDigits = (v: string) => v.replace(/\D/g, '');
const clamp11 = (v: string) => v.slice(0, 11);
const isValidBrPhoneDigits = (digits: string) => digits.length === 10 || digits.length === 11;
const normalizeBrDigits = (raw: string) => {
  let x = onlyDigits(raw);
  if (x.startsWith('55') && x.length >= 12) x = x.slice(2);
  if (x.length > 11 && x.startsWith('0')) x = x.slice(1);
  return clamp11(x);
};
const formatPhoneBr = (digits: string) => {
  const d = clamp11(onlyDigits(digits));
  if (!d) return '';
  if (d.length <= 10) {
    return d.replace(
      /^(\d{0,2})(\d{0,4})(\d{0,4}).*$/,
      (_: any, a: string, b: string, c: string) =>
        `${a ? `(${a}${a.length === 2 ? ')' : ''}` : ''}${a && a.length === 2 ? ' ' : ''}${b}${c ? `-${c}` : ''}`.trim()
    );
  }
  return d.replace(
    /^(\d{0,2})(\d{0,5})(\d{0,4}).*$/,
    (_: any, a: string, b: string, c: string) =>
      `${a ? `(${a}${a.length === 2 ? ')' : ''}` : ''}${a && a.length === 2 ? ' ' : ''}${b}${c ? `-${c}` : ''}`.trim()
  );
};
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const normEmail = (v: string) => v.trim().toLowerCase();

const RESEND_COOLDOWN_SECONDS = 30;

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const phoneFormatted = formatPhoneBr(phoneDigits);

  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [originalMode, setOriginalMode] = useState<'login' | 'register'>(initialMode);

  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<number | null>(null);

  // refs p/ foco
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const otpInputRef = useRef<HTMLInputElement | null>(null);

  // foca ao abrir / trocar modo
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      if (mode === 'otp') otpInputRef.current?.focus();
      else if (mode === 'register') nameInputRef.current?.focus();
      else emailInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [isOpen, mode]);

  // fecha no ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // sincroniza initialMode quando abrir
  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setOriginalMode(initialMode);
  }, [isOpen, initialMode]);

  const clearFieldErrors = () => setErrors({});
  const showFieldError = (field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const onPhoneChange: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
    const next = normalizeBrDigits(ev.target.value);
    setPhoneDigits(next);
    if (next && !isValidBrPhoneDigits(next)) {
      setErrors((p) => ({ ...p, phone: 'Telefone inválido. Use 10 ou 11 dígitos.' }));
    } else {
      setErrors((p) => {
        const { phone, ...rest } = p;
        return rest;
      });
    }
  };

  const canCreate = useMemo(() => {
    if (mode !== 'register') return true;
    const e = normEmail(email);
    const n = name.trim();
    return !!(n && isValidEmail(e));
  }, [mode, email, name]);

  // inicia cooldown ao entrar em OTP
  useEffect(() => {
    if (isOpen && mode === 'otp') startCooldown();
  }, [mode, isOpen]);

  const startCooldown = () => {
    stopCooldown();
    setCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownTimerRef.current = window.setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          stopCooldown();
          return 0;
        }
        return c - 1;
      });
    }, 1000) as unknown as number;
  };
  const stopCooldown = () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  };
  useEffect(() => () => stopCooldown(), []);

  /* ===== Actions ===== */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    clearFieldErrors();

    const eTrim = normEmail(email);
    if (!isValidEmail(eTrim)) {
      showFieldError('email', 'Email inválido');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: eTrim,
        options: { shouldCreateUser: false },
      });

      if (!error) {
        setOriginalMode('login');
        setMode('otp');
        setOtpCode('');
        toastSuccess('Código enviado para seu email!');
      } else {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('not found')) showFieldError('email', 'Nenhuma conta encontrada com este email');
        else if (msg.includes('invalid')) showFieldError('email', 'Email inválido');
        else toastError('Não foi possível enviar o código.', error.message);
      }
    } catch (err: any) {
      toastError('Erro de conexão ao enviar o código.', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    clearFieldErrors();

    const eTrim = normEmail(email);
    const nTrim = name.trim();

    if (!nTrim) showFieldError('name', 'Nome é obrigatório');
    if (!isValidEmail(eTrim)) showFieldError('email', 'Email inválido');
    if (phoneDigits && !isValidBrPhoneDigits(phoneDigits))
      showFieldError('phone', 'Telefone inválido. Use 10 ou 11 dígitos.');
    if (!nTrim || !isValidEmail(eTrim) || (phoneDigits && !isValidBrPhoneDigits(phoneDigits))) {
      setIsLoading(false);
      return;
    }

    try {
      // sua edge function cria user + business e envia OTP
      const resp = await fetch('https://uqquluodgdginkddngpp.supabase.co/functions/v1/app/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: eTrim, name: nTrim, phone: phoneDigits || undefined }),
      });
      const data = await resp.json().catch(() => ({}));

      if (resp.status === 201) {
        setOriginalMode('register');
        setMode('otp');
        setOtpCode('');
        toastSuccess('Conta criada! Código enviado para seu email.');
      } else if (resp.status === 400) {
        switch (data?.error) {
          case 'EMAIL_REQUIRED': showFieldError('email', 'Email é obrigatório'); break;
          case 'NAME_REQUIRED':  showFieldError('name', 'Nome é obrigatório'); break;
          case 'EMAIL_INVALID':  showFieldError('email', 'Email inválido'); break;
          default:               toastError('Dados inválidos. Verifique os campos.');
        }
      } else if (resp.status === 409) {
        switch (data?.error) {
          case 'EMAIL_ALREADY_REGISTERED':
          case 'BUSINESS_EMAIL_IN_USE': showFieldError('email', 'Este email já está em uso'); break;
          case 'PHONE_IN_USE':         showFieldError('phone', 'Este telefone já está em uso'); break;
          default:                     toastError('Conflito nos dados. Verifique as informações.');
        }
      } else {
        toastError('Erro interno. Tente novamente mais tarde.');
      }
    } catch (err: any) {
      toastError('Erro de conexão. Verifique sua internet.', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const actuallyVerifyOtp = async () => {
    if (isLoading) return;
    setIsLoading(true);
    clearFieldErrors();

    const eTrim = normEmail(email);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: eTrim,
        token: otpCode,
        type: 'email', // OTP numérico via e-mail
      });

      if (!error && data?.session?.access_token) {
        // Sessão já está setada no client; o AuthContext vai hidratar o usuário.
        toastSuccess('Login realizado com sucesso!');
        onClose();
      } else {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('invalid') || msg.includes('expired')) {
          toastError('Código inválido ou expirado. Tente reenviar.');
        } else {
          toastError('Não foi possível verificar o código.', error?.message);
        }
      }
    } catch (err: any) {
      toastError('Erro de conexão ao verificar o código.', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toastError('Digite os 6 dígitos do código.');
      return;
    }
    await actuallyVerifyOtp();
  };

  const resendCode = async () => {
    if (isLoading || cooldown > 0) return;
    const eTrim = normEmail(email);
    if (!isValidEmail(eTrim)) {
      showFieldError('email', 'Email inválido');
      return;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: eTrim,
        options: { shouldCreateUser: false },
      });
      if (!error) {
        toastSuccess('Novo código enviado!');
        setOtpCode('');
        startCooldown();
        otpInputRef.current?.focus();
      } else {
        toastError('Não foi possível reenviar o código.', error.message);
      }
    } catch (err: any) {
      toastError('Erro de conexão ao reenviar código.', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setMode(initialMode);
    setEmail('');
    setName('');
    setPhoneDigits('');
    setOtpCode('');
    setOriginalMode(initialMode);
    clearFieldErrors();
    stopCooldown();
    setCooldown(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  const renderOtpView = () => (
    <div className="p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verificar Código</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Enviamos um código de 6 dígitos para
          <br />
          <span className="font-medium break-all">{email}</span>
        </p>
      </div>

      <form onSubmit={handleOtpVerification} className="space-y-6" autoComplete="on">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Código de Verificação
          </label>
          <input
            ref={otpInputRef}
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text') || '';
              const digits = pasted.replace(/\D/g, '').slice(0, 6);
              if (digits) { e.preventDefault(); setOtpCode(digits); }
            }}
            className="w-full text-center text-2xl font-mono tracking-widest py-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            placeholder="000000"
            maxLength={6}
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            name="one-time-code"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setMode(originalMode);
              setOtpCode('');
              clearFieldErrors();
              stopCooldown();
              setCooldown(0);
            }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            ← Voltar
          </button>

          <button
            type="button"
            onClick={resendCode}
            disabled={isLoading || cooldown > 0}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-60"
            title={cooldown > 0 ? `Aguarde ${cooldown}s` : 'Reenviar código'}
          >
            <RotateCcw className="h-4 w-4" />
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading || otpCode.length !== 6}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? <Loader className="h-5 w-5 animate-spin" /> : (<><span>Verificar Código</span><ArrowRight className="h-5 w-5" /></>)}
        </button>
      </form>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'otp' ? 'Verificação' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {mode === 'otp' ? (
          renderOtpView()
        ) : (
          <div className="p-6">
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => { setMode('login'); clearFieldErrors(); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); clearFieldErrors(); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  mode === 'register'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Registrar
              </button>
            </div>

            <form
              onSubmit={mode === 'login' ? handleLogin : handleRegister}
              className="space-y-4"
              autoComplete="on"
            >
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome do Negócio *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${
                        errors.name ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Ex: Barbearia do João"
                      required
                      autoComplete="organization"
                      name="organization"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    name="username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${
                      errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefone (opcional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      name="tel"
                      value={phoneFormatted}
                      onChange={onPhoneChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${
                        errors.phone ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || (mode === 'register' && !canCreate)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Enviar Código' : 'Criar Conta'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {mode === 'login' && (
                <div className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                  <p>Você receberá um código de 6 dígitos no seu email para acessar.</p>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
