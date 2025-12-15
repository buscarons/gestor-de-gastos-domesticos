import React from 'react';
import { X, Calendar, Check } from 'lucide-react';
import { MONTHS } from '../types';

interface YearSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  currentStartMonthIndex: number;
  onSave: (monthIndex: number) => void;
  onCleanInvalidData?: () => boolean;
}

export const YearSettingsModal: React.FC<YearSettingsModalProps> = ({
  isOpen, onClose, year, currentStartMonthIndex, onSave, onCleanInvalidData
}) => {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [feedback, setFeedback] = React.useState<'idle' | 'success' | 'none_found'>('idle');

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setShowConfirm(false);
      setFeedback('idle');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClean = () => {
    if (onCleanInvalidData) {
      const changed = onCleanInvalidData();
      setFeedback(changed ? 'success' : 'none_found');
      // Hide confirm UI immediately to show feedback main slot or just change text
      setShowConfirm(false);

      // Auto-hide feedback after 3s
      setTimeout(() => setFeedback('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-lg text-gray-800">Configuración del Período</h3>
            <p className="text-xs text-gray-500">Año Contable {year}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="text-blue-600 mt-0.5">
              <Calendar size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-800 mb-1">Corrección de Mes de Inicio</h4>
              <p className="text-xs text-blue-700 leading-relaxed">
                Selecciona el mes real desde donde tienes datos fiables.
                <br /><br />
                <span className="font-semibold">Nota:</span> Al cambiar esto, recuerda actualizar tu <span className="font-bold">Saldo Inicial</span> en la pestaña de Ingresos para que coincida con la fecha elegida.
              </p>
            </div>
          </div>

          {onCleanInvalidData && (
            <div className="mb-6">
              {feedback === 'success' && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-green-700 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
                  <Check size={16} /> Limpieza completada con éxito
                </div>
              )}

              {feedback === 'none_found' && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-600 text-xs text-center animate-fade-in">
                  No se encontraron datos inválidos para limpiar.
                </div>
              )}

              {feedback === 'idle' && !showConfirm && (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  Limpiar datos anteriores a {MONTHS[currentStartMonthIndex]}
                </button>
              )}

              {feedback === 'idle' && showConfirm && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-100 animate-fade-in">
                  <p className="text-xs font-bold text-red-800 mb-2">
                    ¿Estás seguro?
                  </p>
                  <p className="text-xs text-red-600 mb-3">
                    Se eliminarán permanentemente todos los gastos registrados en los meses anteriores a <b>{MONTHS[currentStartMonthIndex]}</b>.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 py-1.5 px-3 bg-white text-gray-600 text-xs font-medium rounded border border-gray-200 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleClean}
                      className="flex-1 py-1.5 px-3 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 shadow-sm"
                    >
                      Confirmar Limpieza
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Mes de Inicio
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, idx) => (
              <button
                key={m}
                onClick={() => {
                  onSave(idx);
                  onClose();
                }}
                className={`relative px-2 py-3 text-xs font-medium rounded-lg border transition-all flex flex-col items-center gap-1 ${currentStartMonthIndex === idx
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105 z-10'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
              >
                <span>{m.substring(0, 3)}</span>
                {currentStartMonthIndex === idx && (
                  <span className="absolute top-1 right-1">
                    <Check size={10} strokeWidth={4} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};