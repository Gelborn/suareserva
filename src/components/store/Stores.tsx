import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';
import { useStores } from '../../hooks/useStores';
import CreateStoreModal from './components/CreateStoreModal';

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 shadow-sm ${className}`}>
    {children}
  </div>
);

const Stores: React.FC = () => {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const { loading, stores, createStoreWithDefaults } = useStores(business?.id);

  const [openModal, setOpenModal] = useState(false);
  const empty = useMemo(() => !loading && stores.length === 0, [loading, stores]);

  const onOpenModal = () => setOpenModal(true);
  const onCloseModal = () => setOpenModal(false);

  const handleCreate = async (name: string) => {
    const created = await createStoreWithDefaults({ name });
    // Retorna id e nome para o modal mostrar o painel de sucesso
    return created ? { id: created.id, name: created.name } : null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Lojas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Gerencie suas unidades/endereços.</p>
        </div>

        {!empty && (
          <button
            onClick={onOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            + Nova loja
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Carregando…</div>
      ) : empty ? (
        <Card className="p-10 text-center">
          <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-indigo-100 text-indigo-700">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Crie sua primeira loja</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Você vai configurar <strong>dados da loja</strong>, <strong>horários</strong>, <strong>serviços</strong> e a
            <strong> página pública</strong>.
          </p>
          <div className="mt-6">
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Criar minha loja
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stores.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{s.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {s.slug ? `suareserva.online/${s.slug}` : 'Sem URL pública'}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/stores/${s.id}`)}
                  className="px-3 py-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  Abrir
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      <CreateStoreModal
        open={openModal}
        onClose={onCloseModal}
        onCreate={handleCreate}
        onGoToStore={(id) => { onCloseModal(); navigate(`/stores/${id}`); }}
        onGoToList={() => { onCloseModal(); /* já estamos na lista */ }}
      />
    </div>
  );
};

export default Stores;
