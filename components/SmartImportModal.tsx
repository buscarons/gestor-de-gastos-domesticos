import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ParsedExpense, parseExpensesFromText } from '../services/geminiService';
import { MONTHS, STANDARD_CATEGORIES } from '../types';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  startMonthIndex: number;
  onImport: (items: ParsedExpense[]) => void;
  isGuest?: boolean;
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose, year, startMonthIndex, onImport, isGuest }) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [defaultMonth, setDefaultMonth] = useState(new Date().getMonth() >= startMonthIndex ? new Date().getMonth() : startMonthIndex);
  const [parsedItems, setParsedItems] = useState<ParsedExpense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removedCount, setRemovedCount] = useState(0);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!inputText.trim() || isGuest) return;
    setIsLoading(true);
    setError(null);
    setRemovedCount(0);
    try {
      // Pass startMonthIndex to AI service
      const result = await parseExpensesFromText(inputText, defaultMonth, year, startMonthIndex);

      // Post-process: Fill in null months with default and HARD FILTER invalid months
      const processed: ParsedExpense[] = [];
      let skipped = 0;

      result.forEach(item => {
        const effectiveMonth = item.monthIndex === null ? defaultMonth : item.monthIndex;

        if (effectiveMonth >= startMonthIndex) {
          processed.push({ ...item, monthIndex: effectiveMonth });
        } else {
          skipped++;
        }
      });

      setParsedItems(processed);
      setRemovedCount(skipped);
      setStep('preview');
    } catch (e) {
      console.error(e);
      setError("No se pudo entender el texto. Intenta ser más claro o verifica tu conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    onImport(parsedItems);
    handleClose();
  };

  const handleClose = () => {
    setInputText('');
    setParsedItems([]);
    setStep('input');
    setError(null);
    onClose();
  };

  const removeItem = (idx: number) => {
    setParsedItems(parsedItems.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ParsedExpense, value: any) => {
    const updated = [...parsedItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setParsedItems(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Sparkles size={24} className="text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Importar con IA</h2>
              <p className="text-indigo-100 text-sm">Pega texto libre y deja que Gemini organice tus gastos.</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {isGuest ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8 animate-fade-in">
              <div className="bg-amber-50 p-6 rounded-full text-amber-500">
                <AlertCircle size={48} />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-gray-800">IA no disponible en Modo Invitado</h3>
                <p className="text-sm text-gray-500 mt-2">
                  La funcionalidad de inteligencia artificial requiere una conexión segura con la API de Google Gemini, la cual solo está disponible para usuarios autenticados.
                </p>
                <p className="text-xs text-indigo-600 font-medium mt-4 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                  ¡Inicia sesión o regístrate para usar el asistente inteligente!
                </p>
              </div>
            </div>
          ) : step === 'input' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  1. Pega tus gastos aquí
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Ejemplo:\n- Pagué 2500 de UTE\n- Supermercado 1500 ayer\n- Farmacia 400 y Feria 800`}
                  className="w-full h-40 border border-gray-300 rounded-xl p-4 text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  2. Si no se menciona mes, usar:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {MONTHS.map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => idx >= startMonthIndex && setDefaultMonth(idx)}
                      disabled={idx < startMonthIndex}
                      className={`text-xs py-2 rounded-md border transition-all ${defaultMonth === idx
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : idx < startMonthIndex
                          ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        }`}
                    >
                      {m.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Vista Previa ({parsedItems.length} items)</h3>
                <button onClick={() => setStep('input')} className="text-xs text-indigo-600 hover:underline">
                  Volver a editar texto
                </button>
              </div>

              {removedCount > 0 && (
                <div className="bg-orange-50 text-orange-700 text-xs p-3 rounded-lg border border-orange-100 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>Se filtraron <b>{removedCount} gastos</b> porque corresponden a meses anteriores al inicio ({MONTHS[startMonthIndex]}).</span>
                </div>
              )}

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                    <tr>
                      <th className="px-3 py-2">Concepto</th>
                      <th className="px-3 py-2">Categoría</th>
                      <th className="px-3 py-2 w-24">Monto</th>
                      <th className="px-3 py-2 w-24">Mes</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-gray-50">
                        <td className="p-2">
                          <input
                            value={item.name}
                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.category}
                            onChange={(e) => updateItem(idx, 'category', e.target.value)}
                            className="w-full bg-transparent text-xs outline-none"
                          >
                            {STANDARD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateItem(idx, 'amount', parseFloat(e.target.value))}
                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none font-medium"
                          />
                        </td>
                        <td className="p-2 text-xs text-gray-500">
                          {MONTHS[item.monthIndex || defaultMonth].substring(0, 3)}
                        </td>
                        <td className="p-2 text-center">
                          <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedItems.length === 0 && (
                <p className="text-center text-gray-400 py-4">No se encontraron gastos válidos.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
          {step === 'input' ? (
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !inputText.trim()}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? 'Analizando...' : 'Analizar Texto'}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={parsedItems.length === 0}
              className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Check size={18} />
              Confirmar e Importar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};