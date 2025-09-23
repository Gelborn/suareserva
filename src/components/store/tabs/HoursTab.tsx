import React from 'react';
import Card from '../components/Card';
import { Clock } from 'lucide-react';
import HoursEditor, { HoursRow } from '../components/HoursEditor';
import toast from 'react-hot-toast';

const HoursTab: React.FC<{
  hours: HoursRow[];
  onChangeHours: (h: HoursRow[]) => void;
  slotMin: number;
  bufferMin: number;
  onChangeSlot: (n: number) => void;
  onChangeBuffer: (n: number) => void;
}> = ({ hours, onChangeHours, slotMin, bufferMin, onChangeSlot, onChangeBuffer }) => {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Horário de funcionamento</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Defina os horários abertos por dia.</p>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        <HoursEditor value={hours} onChange={onChangeHours} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="font-medium mb-2">Slot do agendamento</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              O <strong>slot</strong> é a granularidade dos horários exibidos aos clientes. Com slot de <strong>30 minutos</strong>, por exemplo,
              as opções aparecem de 30 em 30 min (09:00, 09:30, 10:00…).
            </p>
            <div className="flex items-center gap-3">
              <select
                className="rounded-xl border bg-white dark:bg-gray-900 px-3 py-2"
                value={slotMin}
                onChange={(e)=>onChangeSlot(parseInt(e.target.value,10))}
              >
                {[10, 15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v} min</option>)}
              </select>
              <span className="text-sm text-gray-500">padrão: 30 min</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="font-medium mb-2">Buffer entre atendimentos</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              O <strong>buffer</strong> é um tempo extra entre o fim de um serviço e o começo do próximo (ex.: limpeza, organização, transição).
              Não aparece para o cliente, mas evita colisões na agenda.
            </p>
            <div className="flex items-center gap-3">
              <select
                className="rounded-xl border bg-white dark:bg-gray-900 px-3 py-2"
                value={bufferMin}
                onChange={(e)=>onChangeBuffer(parseInt(e.target.value,10))}
              >
                {[0, 5, 10, 15, 20, 30].map(v => <option key={v} value={v}>{v} min</option>)}
              </select>
              <span className="text-sm text-gray-500">padrão: 0 min</span>
            </div>
          </Card>
        </div>

        <button
          onClick={()=>toast.success('Horários salvos (mock)')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        >
          Salvar horários
        </button>
      </div>
    </Card>
  );
};

export default HoursTab;
