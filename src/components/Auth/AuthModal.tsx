import React, { useState } from 'react';
import { X, Mail, User, Phone, ArrowRight, Loader, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState('');

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const clearErrors = () => {
    setErrors({});
    setSuccessMessage('');
  };

  const showFieldError = (field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  };

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    if (type === 'success') {
      setSuccessMessage(message);
    } else {
      setErrors(prev => ({ ...prev, general: message }));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearErrors();

    try {
      // Simular envio do magic link
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMode('otp');
      showToast('Código enviado para seu email!', 'success');
    } catch (error) {
      showToast('Erro ao enviar código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearErrors();

    try {
      const response = await fetch('https://uqquluodgdginkddngpp.supabase.co/functions/v1/app/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined
        })
      });

      const data = await response.json();

      if (response.status === 201) {
        setMode('otp');
        showToast('Conta criada! Código enviado para seu email.', 'success');
      } else if (response.status === 400) {
        switch (data.error) {
          case 'EMAIL_REQUIRED':
            showFieldError('email', 'Email é obrigatório');
            break;
          case 'NAME_REQUIRED':
            showFieldError('name', 'Nome é obrigatório');
            break;
          case 'EMAIL_INVALID':
            showFieldError('email', 'Email inválido');
            break;
          default:
            showToast('Dados inválidos. Verifique os campos.');
        }
      } else if (response.status === 409) {
        switch (data.error) {
          case 'EMAIL_ALREADY_REGISTERED':
            showFieldError('email', 'Este email já está cadastrado');
            break;
          case 'PHONE_IN_USE':
            showFieldError('phone', 'Este telefone já está em uso');
            break;
          default:
            showToast('Conflito nos dados. Verifique as informações.');
        }
      } else {
        showToast('Erro interno. Tente novamente mais tarde.');
      }
    } catch (error) {
      showToast('Erro de conexão. Verifique sua internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearErrors();

    try {
      // Simular verificação do OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (otpCode === '123456') { // Mock validation
        if (mode === 'otp' && email) {
          await login(email, ''); // Mock login
          onClose();
        }
      } else {
        showToast('Código inválido. Tente novamente.');
      }
    } catch (error) {
      showToast('Erro ao verificar código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setMode(initialMode);
    setEmail('');
    setName('');
    setPhone('');
    setOtpCode('');
    clearErrors();
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const renderOtpView = () => (
    <div className="p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Verificar Código
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Enviamos um código de 6 dígitos para<br />
          <span className="font-medium">{email}</span>
        </p>
      </div>

      <form onSubmit={handleOtpVerification} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Código de Verificação
          </label>
          <input
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full text-center text-2xl font-mono tracking-widest py-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            placeholder="000000"
            maxLength={6}
            required
          />
        </div>

        {successMessage && (
          <div className="p-3 rounded-lg text-sm bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-center">
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div className="p-3 rounded-lg text-sm bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-center">
            {errors.general}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || otpCode.length !== 6}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <Loader className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span>Verificar Código</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(initialMode)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            ← Voltar
          </button>
        </div>
      </form>
    </div>
  );

  if (mode === 'otp') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Verificação
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          {renderOtpView()}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => {
                setMode('login');
                clearErrors();
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => {
                setMode('register');
                clearErrors();
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Negócio *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${
                      errors.name ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Ex: Barbearia do João"
                    required
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${
                    errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefone (opcional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${
                      errors.phone ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
                )}
              </div>
            )}

            {errors.general && (
              <div className="p-3 rounded-lg text-sm bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                {errors.general}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login' ? 'Enviar Código' : 'Criar Conta'}
                  </span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              <p>Receberá um código de 6 dígitos no seu email para acessar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;