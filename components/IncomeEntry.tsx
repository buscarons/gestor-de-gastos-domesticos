import React, { useState, useEffect, useRef } from 'react';
import { IncomeItem, MONTHS, STANDARD_INCOME_CATEGORIES } from '../types';
import { Plus, Trash2, AlertTriangle, X, Wallet, Loader2, CheckCircle2, Copy, GripVertical } from 'lucide-react';

interface IncomeEntryProps {
  data: IncomeItem[];
  previousYearData: IncomeItem[]; // Data from year - 1
  onUpdate: (newData: IncomeItem[]) => void;
  year: number;
  startMonthIndex: number;
  // onUpdateStartMonth removed from interface as it's handled globally
  
  // Balance Props
  openingBalance: number; // For the current selected year
  previousYearsAccumulated: number; // To calculate the "Global Base" when calibrating
  onUpdateOpeningBalance: (amount: number) => void;
}

const formatMoney = (amount: number) => {
  return amount.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export const IncomeEntry: React.FC<IncomeEntryProps> = ({ 
  data, previousYearData, onUpdate, year, startMonthIndex,
  openingBalance, previousYearsAccumulated, onUpdateOpeningBalance 
}) => {
  
  const [localData, setLocalData] = useState<IncomeItem[]>(data);
  const [localSavings, setLocalSavings] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Sync props to local state
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Sync opening balance, but keep it empty string if 0 to allow placeholder to show
  useEffect(() => {
    setLocalSavings(openingBalance === 0 ? '' : openingBalance.toString());
  }, [openingBalance]);

  const [newCategory, setNewCategory] = useState(STANDARD_INCOME_CATEGORIES[0]);
  const [newName, setNewName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<IncomeItem | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  // Inline editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const triggerAutoSave = (updatedData?: IncomeItem[], updatedSavings?: string) => {
    setSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = setTimeout(() => {
      if (updatedData) onUpdate(updatedData);
      if (updatedSavings !== undefined) {
         // If empty string, save as 0
         onUpdateOpeningBalance(parseFloat(updatedSavings) || 0);
      }
      setSaveStatus('saved');
    }, 500); // 500ms debounce
  };

  const handleValueChange = (id: string, monthIndex: number, val: string) => {
    const numVal = parseFloat(val) || 0;
    const updated = localData.map(item => {
      if (item.id === id) {
        const newAmounts = [...item.amounts];
        newAmounts[monthIndex] = numVal;
        return { ...item, amounts: newAmounts };
      }
      return item;
    });
    setLocalData(updated);
    triggerAutoSave(updated);
  };

  const handleCategoryChange = (id: string, newCat: string) => {
    const updated = localData.map(item => 
      item.id === id ? { ...item, category: newCat } : item
    );
    setLocalData(updated);
    setEditingCategoryId(null);
    triggerAutoSave(updated);
  };

  const handleNameChange = (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingNameId(null);
      return;
    }
    const updated = localData.map(item =>
      item.id === id ? { ...item, name: newName } : item
    );
    setLocalData(updated);
    setEditingNameId(null);
    triggerAutoSave(updated);
  };

  const handleSavingsChange = (val: string) => {
    setLocalSavings(val);
    triggerAutoSave(undefined, val);
  };

  const handleAddItem = () => {
    if (!newName.trim()) return;
    const newItem: IncomeItem = {
      id: Date.now().toString(),
      year: year,
      category: newCategory,
      name: newName,
      amounts: Array(12).fill(0)
    };
    const updated = [...localData, newItem];
    setLocalData(updated);
    onUpdate(updated); // Immediate update for new items
    setNewName('');
    nameInputRef.current?.focus();
  };

  const handleCopyFromPreviousYear = () => {
    if (previousYearData.length === 0) return;
    
    // Create new items based on previous year's structure but with 0 amounts
    const newItems = previousYearData.map((item, idx) => ({
      id: Date.now().toString() + '-inc-' + idx, // Unique ID
      year: year,
      category: item.category,
      name: item.name,
      amounts: Array(12).fill(0) // Reset amounts
    }));

    const updated = [...localData, ...newItems];
    setLocalData(updated);
    onUpdate(updated);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    const updated = localData.filter(i => i.id !== itemToDelete.id);
    setLocalData(updated);
    onUpdate(updated); // Immediate update for delete
    setItemToDelete(null);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    const newItems = [...localData];
    const [movedItem] = newItems.splice(draggedItemIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    setLocalData(newItems);
    triggerAutoSave(newItems);
    setDraggedItemIndex(null);
  };

  return (
    <>
      <div className="space-y-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-800">Planilla de Ingresos {year}</h3>
              
              {/* COPY STRUCTURE BUTTON */}
              {previousYearData.length > 0 && (
                <button 
                  onClick={handleCopyFromPreviousYear}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                  title={`Copiar fuentes de ingreso del año ${year - 1}`}
                >
                  <Copy size={14} />
                  Copiar estructura de {year - 1}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">
                Registra sueldos y entradas. 
              </p>
            </div>
          </div>
          
           {/* Status Indicator */}
           <div className="flex items-center gap-2 text-sm font-medium">
             {saveStatus === 'saving' ? (
               <span className="text-blue-600 flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full">
                 <Loader2 size={14} className="animate-spin" /> Guardando...
               </span>
             ) : (
               <span className="text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full animate-fade-in">
                 <CheckCircle2 size={14} /> Guardado
               </span>
             )}
          </div>
        </div>

        {/* Initial Savings Input Section */}
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col md:flex-row items-center gap-4 relative overflow-hidden">
          <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 z-10">
            <Wallet size={24} />
          </div>
          <div className="flex-1 z-10">
            <h4 className="font-bold text-gray-800">
               Saldo Inicial al 1 de {MONTHS[startMonthIndex]} {year}
            </h4>
            <p className="text-xs text-gray-600 max-w-lg">
               Ingresa aquí cuánto dinero tenías acumulado al comenzar este período ({MONTHS[startMonthIndex]}).
            </p>
          </div>
          <div className="flex items-center gap-4 z-10">
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-emerald-200 shadow-sm">
              <span className="font-bold text-gray-500">$</span>
              <input 
                type="number" 
                value={localSavings}
                onChange={(e) => handleSavingsChange(e.target.value)}
                className="border-none px-0 py-1 text-lg font-bold text-gray-800 w-32 focus:ring-0 outline-none text-right"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-emerald-100/30 to-transparent pointer-events-none"></div>
        </div>

        {/* Add New Income Item */}
        <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
            <div className="relative group">
               <select 
                 value={newCategory} 
                 onChange={(e) => setNewCategory(e.target.value)}
                 className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48 bg-white cursor-pointer"
               >
                 {STANDARD_INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre (ej. Bono)</label>
            <input 
              ref={nameInputRef}
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Nueva fuente de ingreso..."
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
          <button 
            onClick={handleAddItem}
            disabled={!newName}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm h-[38px]"
          >
            <Plus size={16} />
            Agregar Fila
          </button>
        </div>

        {/* Spreadsheet Table */}
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10 min-w-[150px] border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Concepto</th>
                {MONTHS.map(m => (
                  <th key={m} className="px-2 py-3 min-w-[100px] text-right border-r border-gray-100">{m.substring(0,3)}</th>
                ))}
                <th className="px-2 py-3 min-w-[100px] text-right font-bold bg-green-50">Total</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {localData.length === 0 && (
                <tr>
                   <td colSpan={14} className="text-center py-8 text-gray-400 italic">
                     No hay ingresos registrados. Agrega uno arriba {previousYearData.length > 0 ? `o copia la estructura de ${year - 1}.` : 'para comenzar.'}
                   </td>
                </tr>
              )}
              {localData.map((item, index) => {
                const rowTotal = item.amounts.reduce((a, b) => a + b, 0);
                const isDragging = draggedItemIndex === index;
                const isEditingCat = editingCategoryId === item.id;
                const isEditingName = editingNameId === item.id;

                return (
                  <tr 
                    key={item.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`border-b hover:bg-gray-50 transition-colors group ${isDragging ? 'opacity-40 bg-gray-100' : ''}`}
                  >
                    <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-gray-50 transition-colors z-10">
                      <div className="flex items-center gap-3">
                         {/* Drag Handle */}
                         <div 
                           className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-black/5 flex-shrink-0"
                           title="Arrastrar para mover"
                         >
                           <GripVertical size={14} />
                         </div>
                         <div className="flex flex-col w-full min-w-0">
                          {isEditingName ? (
                            <input 
                              type="text" 
                              defaultValue={item.name}
                              onBlur={(e) => handleNameChange(item.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNameChange(item.id, e.currentTarget.value);
                                if (e.key === 'Escape') setEditingNameId(null);
                              }}
                              autoFocus
                              className="text-sm font-semibold text-gray-900 border border-blue-300 rounded px-1 py-0.5 w-full outline-none bg-white"
                            />
                          ) : (
                            <span 
                              onClick={() => setEditingNameId(item.id)}
                              className="text-sm cursor-pointer hover:underline decoration-dashed underline-offset-4 decoration-gray-400/50 truncate"
                              title="Clic para editar nombre"
                            >
                              {item.name}
                            </span>
                          )}
                          
                          {/* Inline Category Editing */}
                          {isEditingCat ? (
                            <select 
                              value={item.category}
                              onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                              onBlur={() => setEditingCategoryId(null)}
                              autoFocus
                              className="text-[10px] w-full p-0 rounded border border-gray-300 bg-white outline-none mt-0.5"
                            >
                              {STANDARD_INCOME_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          ) : (
                            <span 
                              onClick={() => setEditingCategoryId(item.id)}
                              className="text-[10px] text-gray-400 cursor-pointer hover:underline hover:text-blue-600 transition-colors"
                              title="Clic para cambiar categoría"
                            >
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {item.amounts.map((amt, monthIdx) => {
                      const isDisabled = monthIdx < startMonthIndex;
                      const displayValue = amt === 0 ? '' : parseFloat(amt.toFixed(2));

                      return (
                        <td key={monthIdx} className={`px-2 py-2 border-r border-gray-100 ${isDisabled ? 'bg-gray-100' : ''}`}>
                          <input
                            type="number"
                            value={displayValue}
                            onChange={(e) => handleValueChange(item.id, monthIdx, e.target.value)}
                            disabled={isDisabled}
                            className={`w-full text-right bg-transparent border-transparent border-b px-1 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors
                            ${isDisabled ? 'cursor-not-allowed text-gray-400' : ''}`}
                            placeholder={isDisabled ? '-' : '-'}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-right font-bold text-emerald-600 bg-green-50/50">
                      ${formatMoney(rowTotal)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button 
                        onClick={() => setItemToDelete(item)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all"
                        title={`Eliminar ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {localData.length > 0 && (
              <tfoot className="font-bold text-gray-900 bg-gray-100">
                <tr>
                  <td className="px-4 py-3 sticky left-0 bg-gray-100 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">TOTAL MENSUAL</td>
                  {MONTHS.map((_, idx) => {
                    const colTotal = localData.reduce((acc, curr) => acc + (curr.amounts[idx] || 0), 0);
                    return (
                      <td key={idx} className={`px-2 py-3 text-right text-emerald-700 ${idx < startMonthIndex ? 'text-gray-400 bg-gray-100' : ''}`}>
                        ${formatMoney(colTotal)}
                      </td>
                    );
                  })}
                  <td className="px-2 py-3 text-right text-emerald-800 bg-green-100">
                    ${formatMoney(localData.reduce((acc, curr) => acc + curr.amounts.reduce((a,b)=>a+b,0), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full text-red-600">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Confirmar Eliminación</h3>
              </div>
              <button 
                onClick={() => setItemToDelete(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-6 ml-11">
              ¿Estás seguro que deseas eliminar <span className="font-bold text-gray-900">"{itemToDelete.name}"</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
