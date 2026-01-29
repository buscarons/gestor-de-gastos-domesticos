import React, { useState, useEffect, useRef } from 'react';
import { ExpenseItem, MONTHS, Transaction, Product, STANDARD_CATEGORIES } from '../types';
import { Plus, Trash2, AlertTriangle, X, List, CheckCircle2, Loader2, Copy, GripVertical, Sparkles } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { SmartImportModal } from './SmartImportModal';
import { ConfirmationModal } from './ConfirmationModal';
import { ParsedExpense } from '../services/geminiService';

interface ExpenseEntryProps {
  data: ExpenseItem[];
  previousYearData: ExpenseItem[]; // Data from year - 1
  categories: string[]; // Dynamic categories passed from App (kept for compatibility but unused for new items)
  onUpdate: (newData: ExpenseItem[]) => void;
  year: number;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  startMonthIndex: number;
  isGuest?: boolean;
}

// Color Palette Definition
const CATEGORY_STYLES: Record<string, { border: string, bg: string, text: string, badge: string }> = {
  "Servicios Básicos": {
    border: "border-blue-500",
    bg: "bg-blue-50/60",
    text: "text-blue-900",
    badge: "bg-blue-100 text-blue-700 border-blue-200"
  },
  "Impuestos / Vivienda": {
    border: "border-orange-500",
    bg: "bg-orange-50/60",
    text: "text-orange-900",
    badge: "bg-orange-100 text-orange-700 border-orange-200"
  },
  "Salud": {
    border: "border-rose-500",
    bg: "bg-rose-50/60",
    text: "text-rose-900",
    badge: "bg-rose-100 text-rose-700 border-rose-200"
  },
  "Gastos Variables": {
    border: "border-emerald-500",
    bg: "bg-emerald-50/60",
    text: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200"
  }
};

// Fallback palette for custom categories
const FALLBACK_PALETTES = [
  { border: "border-purple-500", bg: "bg-purple-50/60", text: "text-purple-900", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  { border: "border-cyan-500", bg: "bg-cyan-50/60", text: "text-cyan-900", badge: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { border: "border-fuchsia-500", bg: "bg-fuchsia-50/60", text: "text-fuchsia-900", badge: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
  { border: "border-amber-500", bg: "bg-amber-50/60", text: "text-amber-900", badge: "bg-amber-100 text-amber-700 border-amber-200" },
];

const getCategoryStyle = (category: string) => {
  if (CATEGORY_STYLES[category]) return CATEGORY_STYLES[category];

  // Deterministic hash for custom categories to always get the same color
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[index];
};

const formatMoney = (amount: number) => {
  return amount.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export const ExpenseEntry: React.FC<ExpenseEntryProps> = ({ data, previousYearData, onUpdate, year, products, onUpdateProducts, startMonthIndex, isGuest }) => {
  const [localData, setLocalData] = useState<ExpenseItem[]>(data);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local data if props change (external update)
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Default to the first standard category
  const [newCategory, setNewCategory] = useState(STANDARD_CATEGORIES[0]);

  const [newName, setNewName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<ExpenseItem | null>(null);

  // Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Inline Editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  // Ref for the name input to auto-focus
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Transaction Modal State
  const [editingTransactions, setEditingTransactions] = useState<{
    itemId: string; // Changed from itemIndex/item to itemId for stability
    monthIndex: number;
    itemName: string; // Keep name for display
  } | null>(null);

  // Smart Import Modal
  const [showSmartImport, setShowSmartImport] = useState(false);

  const triggerAutoSave = (updatedData: ExpenseItem[]) => {
    setSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      onUpdate(updatedData);
      setSaveStatus('saved');
    }, 500); // 500ms debounce
  };

  const handleValueChange = (id: string, monthIndex: number, val: string) => {
    const numVal = parseFloat(val) || 0;
    const updated = localData.map(item => {
      if (item.id === id) {
        const newAmounts = [...item.amounts];
        newAmounts[monthIndex] = numVal;

        // If user manually edits a cell that had transactions, clear the transactions
        const newTransactions = item.transactions ? { ...item.transactions } : {};
        if (newTransactions[monthIndex]) {
          delete newTransactions[monthIndex];
        }

        return { ...item, amounts: newAmounts, transactions: newTransactions };
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

  const handleTransactionsSave = (transactions: Transaction[]) => {
    if (!editingTransactions) return;
    const { itemId, monthIndex } = editingTransactions;

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    const updated = localData.map(item => {
      if (item.id === itemId) {
        const newAmounts = [...item.amounts];
        newAmounts[monthIndex] = totalAmount;

        const newTransactionMap = item.transactions ? { ...item.transactions } : {};
        newTransactionMap[monthIndex] = transactions;

        return { ...item, amounts: newAmounts, transactions: newTransactionMap };
      }
      return item;
    });

    setLocalData(updated);
    // Modal save is explicit, no debounce needed (actually now it's auto-save, so we use debounce logic or direct onUpdate)
    // We use onUpdate for immediate save to match expectation of "non-loss"
    onUpdate(updated);
  };

  const handleAddProductFromModal = (newProduct: Product) => {
    // Extra safeguard: check if product already exists by ID
    if (products.some(p => p.id === newProduct.id)) return;
    onUpdateProducts([...products, newProduct]);
  };

  const handleUpdateProductFromModal = (updatedProduct: Product) => {
    const updatedList = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    onUpdateProducts(updatedList);
  };

  const handleAddItem = () => {
    if (!newName.trim()) return;

    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      year: year,
      category: newCategory,
      name: newName,
      amounts: Array(12).fill(0)
    };
    const updated = [...localData, newItem];
    setLocalData(updated);
    onUpdate(updated); // Immediate save for new items
    setNewName('');

    // Auto-focus back to input for rapid entry
    nameInputRef.current?.focus();
  };

  const handleSmartImport = (items: ParsedExpense[]) => {
    let updatedData = [...localData];

    items.forEach(imported => {
      // Logic: Try to find existing item with same name and category
      let existingIndex = updatedData.findIndex(
        row => row.name.toLowerCase() === imported.name.toLowerCase() && row.category === imported.category
      );

      const monthIdx = imported.monthIndex || 0;

      if (existingIndex >= 0) {
        // Update existing
        const existingItem = { ...updatedData[existingIndex] };
        const newAmounts = [...existingItem.amounts];

        // Add to existing amount
        newAmounts[monthIdx] = (newAmounts[monthIdx] || 0) + imported.amount;
        existingItem.amounts = newAmounts;
        updatedData[existingIndex] = existingItem;
      } else {
        // Create new
        const newItem: ExpenseItem = {
          id: Date.now().toString() + Math.random().toString(),
          year: year,
          category: imported.category,
          name: imported.name,
          amounts: Array(12).fill(0)
        };
        newItem.amounts[monthIdx] = imported.amount;
        updatedData.push(newItem);
      }
    });

    setLocalData(updatedData);
    onUpdate(updatedData);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    const updated = localData.filter(i => i.id !== itemToDelete.id);
    setLocalData(updated);
    onUpdate(updated); // Immediate save for deletion
    setItemToDelete(null);
  };

  const handleCopyFromPreviousYear = () => {
    if (previousYearData.length === 0) return;

    // Create new items based on previous year's structure but with 0 amounts
    const newItems = previousYearData.map((item, idx) => ({
      id: Date.now().toString() + '-' + idx, // Unique ID
      year: year,
      category: item.category,
      name: item.name,
      amounts: Array(12).fill(0), // Reset amounts
      transactions: {} // Clear transactions
    }));

    const updated = [...localData, ...newItems];
    setLocalData(updated);
    onUpdate(updated);
  };

  const handleDoubleClick = (item: ExpenseItem, itemIdx: number, monthIdx: number) => {
    // Prevent opening modal if month is disabled
    if (monthIdx < startMonthIndex) return;

    // CHANGED: Allow breakdown for ALL items, not just specific categories.
    // This allows user to breakdown "Water", "UTE" (if paid twice?), or "Supermarket".
    setEditingTransactions({ itemId: item.id, monthIndex: monthIdx, itemName: item.name });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedItemIndex(index);
    // Required for Firefox
    e.dataTransfer.effectAllowed = "move";
    // Set a transparent drag image or similar if needed, default usually works
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
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
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Planilla de Gastos {year}</h3>

            {/* COPY STRUCTURE BUTTON */}
            {previousYearData.length > 0 && (
              <button
                onClick={handleCopyFromPreviousYear}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                title={`Copiar categorías y conceptos del año ${year - 1}`}
              >
                <Copy size={14} />
                Copiar estructura de {year - 1}
              </button>
            )}
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

        {/* Add New Item */}
        <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
            <div className="relative group">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-56 bg-white cursor-pointer"
              >
                {STANDARD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre (ej. Super Tienda Inglesa)</label>
            <input
              ref={nameInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Descripción del gasto..."
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full"
            />
          </div>
          <button
            onClick={handleAddItem}
            disabled={!newName}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm h-[38px]"
          >
            <Plus size={16} />
            Agregar
          </button>

          {/* AI Import Button */}
          <div className="h-[38px] w-px bg-gray-300 mx-2"></div>
          <button
            onClick={() => setShowSmartImport(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm h-[38px] ${isGuest
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-pointer hover:bg-gray-200'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:opacity-90'
              }`}
            title={isGuest ? "IA no disponible en modo invitado" : "Pegar texto y detectar gastos con IA"}
          >
            {isGuest ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            ) : (
              <Sparkles size={16} className="text-yellow-200" />
            )}
            <span>Importar con IA</span>
          </button>
        </div>

        {/* Spreadsheet Table */}
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10 min-w-[180px] border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Concepto</th>
                {MONTHS.map(m => (
                  <th key={m} className="px-2 py-3 min-w-[100px] text-right border-r border-gray-100">{m.substring(0, 3)}</th>
                ))}
                <th className="px-2 py-3 min-w-[100px] text-right font-bold bg-green-50">Total</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {localData.length === 0 && (
                <tr>
                  <td colSpan={14} className="text-center py-8 text-gray-400 italic">
                    No hay gastos registrados. Agrega uno arriba {previousYearData.length > 0 ? `o copia la estructura de ${year - 1}.` : 'para comenzar.'}
                  </td>
                </tr>
              )}
              {localData.map((item, itemIdx) => {
                const rowTotal = item.amounts.reduce((a, b) => a + b, 0);
                const styles = getCategoryStyle(item.category);
                const isDragging = draggedItemIndex === itemIdx;
                const isEditingCat = editingCategoryId === item.id;
                const isEditingName = editingNameId === item.id;

                return (
                  <tr
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, itemIdx)}
                    onDragOver={(e) => handleDragOver(e, itemIdx)}
                    onDrop={(e) => handleDrop(e, itemIdx)}
                    className={`border-b hover:bg-gray-50 transition-colors group ${isDragging ? 'opacity-40 bg-gray-100' : ''}`}
                  >
                    <td className={`px-4 py-3 font-medium sticky left-0 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-l-4 z-10 ${styles.bg} ${styles.border}`}>
                      <div className="flex items-center gap-3">
                        {/* Drag Handle */}
                        <div
                          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-black/5 flex-shrink-0"
                          title="Arrastrar para mover"
                        >
                          <GripVertical size={14} />
                        </div>

                        <div className="flex flex-col gap-1 w-full min-w-0">
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
                              className={`text-sm ${styles.text} font-semibold truncate cursor-pointer hover:underline decoration-dashed underline-offset-4 decoration-gray-400/50`}
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
                              className="text-[10px] w-full p-0.5 rounded border border-gray-300 bg-white outline-none"
                            >
                              {STANDARD_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              onClick={() => setEditingCategoryId(item.id)}
                              className={`text-[10px] w-fit px-1.5 py-0.5 rounded border ${styles.badge} cursor-pointer hover:underline hover:opacity-80 transition-opacity`}
                              title="Clic para cambiar categoría"
                            >
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {item.amounts.map((amt, monthIdx) => {
                      // Check for ANY transactions in this cell
                      const hasTransactions = item.transactions?.[monthIdx] && item.transactions[monthIdx].length > 0;
                      const isDisabled = monthIdx < startMonthIndex;
                      const displayValue = amt === 0 ? '' : parseFloat(amt.toFixed(2));

                      return (
                        <td
                          key={monthIdx}
                          className={`px-2 py-2 border-r border-gray-100 relative bg-white group-hover:bg-gray-50 ${hasTransactions ? 'bg-blue-50/30' : ''} ${isDisabled ? 'bg-gray-100' : ''}`}
                          onDoubleClick={() => !isDisabled && handleDoubleClick(item, itemIdx, monthIdx)}
                        >
                          <div className="relative">
                            <input
                              type="number"
                              value={displayValue}
                              onChange={(e) => !hasTransactions && handleValueChange(item.id, monthIdx, e.target.value)}
                              readOnly={!!hasTransactions || isDisabled}
                              disabled={isDisabled}
                              className={`w-full text-right bg-transparent border-transparent border-b px-1 focus:outline-none transition-colors
                                ${hasTransactions
                                  ? 'text-blue-700 font-medium cursor-pointer focus:border-transparent'
                                  : 'focus:border-blue-500 focus:bg-white cursor-text'} 
                                ${isDisabled ? 'cursor-not-allowed text-gray-400' : ''}`}
                              placeholder={isDisabled ? '-' : '-'}
                              title={isDisabled ? "Mes no disponible por configuración" : (hasTransactions ? "Doble clic para ver detalles" : "Doble clic para agregar múltiples compras (desglose)")}
                            />
                            {hasTransactions && !isDisabled && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none">
                                <List size={12} />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-right font-bold text-gray-800 bg-green-50/50">
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
                      <td key={idx} className={`px-2 py-3 text-right ${idx < startMonthIndex ? 'text-gray-400' : ''}`}>
                        ${formatMoney(colTotal)}
                      </td>
                    );
                  })}
                  <td className="px-2 py-3 text-right text-blue-800 bg-green-100">
                    ${formatMoney(localData.reduce((acc, curr) => acc + curr.amounts.reduce((a, b) => a + b, 0), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Standardized Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirmar Eliminación"
        message={`¿Estás seguro que deseas eliminar "${itemToDelete?.name}" del registro de ${year}? Esta acción no se puede deshacer.`}
        isDestructive={true}
        confirmLabel="Eliminar Gasto"
      />

      {/* Transaction Breakdown Modal - Auto Saves on Change */}
      {editingTransactions && (
        <TransactionModal
          isOpen={!!editingTransactions}
          onClose={() => setEditingTransactions(null)}
          itemName={editingTransactions.itemName}
          monthIndex={editingTransactions.monthIndex}
          // Lookup current transactions from live localData
          currentTransactions={
            localData.find(i => i.id === editingTransactions.itemId)?.transactions?.[editingTransactions.monthIndex] || []
          }
          onTransactionChange={handleTransactionsSave} // Auto-save handler
          onSave={() => setEditingTransactions(null)} // Close only
          products={products}
          onAddProduct={handleAddProductFromModal}
          onUpdateProduct={handleUpdateProductFromModal}
        />
      )}

      {/* Smart Import AI Modal */}
      <SmartImportModal
        isOpen={showSmartImport}
        onClose={() => setShowSmartImport(false)}
        year={year}
        startMonthIndex={startMonthIndex}
        onImport={handleSmartImport}
        isGuest={isGuest}
      />
    </>
  );
};
