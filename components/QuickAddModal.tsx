import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign, Tag, Calculator, ArrowRight, PenTool } from 'lucide-react';
import { ExpenseItem, MONTHS, Transaction, CATEGORIES_WITH_BREAKDOWN } from '../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExpenseItem[];
  year: number;
  onSave: (updatedData: ExpenseItem[]) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, data, year, onSave }) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [monthIndex, setMonthIndex] = useState<number>(new Date().getMonth());
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [manualQty, setManualQty] = useState('');
  const [manualUnit, setManualUnit] = useState('');

  // Reset fields when opening
  useEffect(() => {
    if (isOpen) {
      setMonthIndex(new Date().getMonth());
      setAmount('');
      setDescription('');
      setSelectedItemId('');
      setShowCalculator(false);
      setManualQty('');
      setManualUnit('');
    }
  }, [isOpen]);

  // Calculator Logic
  useEffect(() => {
    if (showCalculator) {
      const q = parseFloat(manualQty);
      const u = parseFloat(manualUnit);
      if (!isNaN(q) && !isNaN(u)) {
        setAmount((q * u).toFixed(2));
      }
    }
  }, [manualQty, manualUnit, showCalculator]);

  if (!isOpen) return null;

  // Group items by category for the dropdown
  const groupedItems = data.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ExpenseItem[]>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return;

    const updatedData = data.map(item => {
      if (item.id === selectedItemId) {
        
        // CHECK IF THIS CATEGORY SUPPORTS BREAKDOWN (TRANSACTIONS)
        const supportsBreakdown = CATEGORIES_WITH_BREAKDOWN.includes(item.category) || 
                                  CATEGORIES_WITH_BREAKDOWN.some(c => item.category.includes(c));

        const newAmounts = [...item.amounts];

        if (supportsBreakdown) {
          // Construct Description
          let finalDesc = description.trim() || 'Ingreso Rápido';
          if (showCalculator && manualQty && manualUnit) {
             // If user typed a description like "Bananas", append the calc: "Bananas (1.5 x 20)"
             // If user didn't type desc, use item name: "Supermercado (1.5 x 20)"
             const baseDesc = description.trim() || item.name;
             finalDesc = `${baseDesc} (${manualQty} x $${manualUnit})`;
          }

          const newTransaction: Transaction = {
            id: Date.now().toString(),
            description: finalDesc,
            amount: numAmount,
            date: new Date().toISOString()
          };

          const currentTransactions = item.transactions?.[monthIndex] || [];
          let finalTransactions = [...currentTransactions, newTransaction];
          
          // Handle legacy manual value preservation
          if (!item.transactions?.[monthIndex] && item.amounts[monthIndex] > 0) {
             const legacyTransaction: Transaction = {
               id: 'legacy-' + Date.now(),
               description: 'Gasto previo (Manual)',
               amount: item.amounts[monthIndex],
               date: new Date().toISOString()
             };
             finalTransactions = [legacyTransaction, newTransaction];
          }

          const newTotal = finalTransactions.reduce((acc, t) => acc + t.amount, 0);
          newAmounts[monthIndex] = newTotal;

          return { 
            ...item, 
            amounts: newAmounts,
            transactions: {
              ...item.transactions,
              [monthIndex]: finalTransactions
            }
          };

        } else {
          // LOGIC FOR FIXED EXPENSES (UTE, Antel, etc.) -> Simple Addition
          newAmounts[monthIndex] = (newAmounts[monthIndex] || 0) + numAmount;
          
          return {
            ...item,
            amounts: newAmounts
          };
        }
      }
      return item;
    });

    onSave(updatedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-start text-white shrink-0">
          <div>
            <h2 className="text-xl font-bold">Registro Rápido</h2>
            <p className="text-blue-100 text-sm mt-1">Año {year}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Month Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                Mes
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonthIndex(idx)}
                    className={`text-xs py-2 rounded-md transition-colors border ${
                      monthIndex === idx 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {m.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Concept Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Tag size={16} className="text-blue-500" />
                Concepto (Categoría)
              </label>
              <div className="relative">
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-700"
                  required
                >
                  <option value="">Selecciona un rubro...</option>
                  {Object.keys(groupedItems).map(category => (
                    <optgroup key={category} label={category}>
                      {groupedItems[category].map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Description (New) */}
            <div className="space-y-2">
               <div className="flex justify-between items-center">
                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                   <PenTool size={16} className="text-blue-500" />
                   Detalle <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                 </label>
                 
                 {/* Calculator Toggle */}
                 <button 
                  type="button"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full transition-colors border ${showCalculator ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}
                 >
                   <Calculator size={14} />
                   {showCalculator ? 'Calculadora ON' : 'Calculadora OFF'}
                 </button>
               </div>
               <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={showCalculator ? "Ej. Bananas" : "Ej. Compra del día"}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
               />
            </div>

            {/* Calculator Inputs */}
            {showCalculator && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 grid grid-cols-[1fr_auto_1fr] gap-2 items-end animate-fade-in">
                 <div>
                    <label className="block text-[10px] font-bold text-blue-600 mb-1">Cantidad/Peso</label>
                    <input 
                      type="number" 
                      step="any"
                      value={manualQty}
                      onChange={e => setManualQty(e.target.value)}
                      className="w-full text-sm border border-blue-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="1.674"
                    />
                 </div>
                 <div className="text-blue-400 pb-2">×</div>
                 <div>
                    <label className="block text-[10px] font-bold text-blue-600 mb-1">Precio Unit.</label>
                    <input 
                      type="number" 
                      step="any"
                      value={manualUnit}
                      onChange={e => setManualUnit(e.target.value)}
                      className="w-full text-sm border border-blue-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="119"
                    />
                 </div>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <DollarSign size={16} className="text-blue-500" />
                Monto Total
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  readOnly={showCalculator}
                  placeholder="0.00"
                  className={`w-full border border-gray-300 rounded-lg pl-8 pr-4 py-3 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${showCalculator ? 'bg-gray-100 text-gray-600' : 'bg-white'}`}
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedItemId || !amount}
                className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                Guardar Gasto
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
