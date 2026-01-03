import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Save, ShoppingBag, PenTool, Search, Image as ImageIcon, Calculator, ArrowRight, Scale, Calendar } from 'lucide-react';
import { Transaction, MONTHS, Product } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  monthIndex: number;
  currentTransactions: Transaction[];
  products: Product[];
  onSave: () => void; // Changed: No args, just close/done signal
  onTransactionChange: (transactions: Transaction[]) => void; // New: Auto-save
  onAddProduct: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen, onClose, itemName, monthIndex, currentTransactions, onSave, onTransactionChange, products, onAddProduct, onUpdateProduct
}) => {
  // Controlled Component: we derive 'transactions' directly from props 'currentTransactions'
  const transactions = currentTransactions || [];

  const [mode, setMode] = useState<'manual' | 'catalog'>('manual');

  // Manual State
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [entryDate, setEntryDate] = useState(''); // YYYY-MM-DD

  // Manual Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [manualQty, setManualQty] = useState('');
  const [manualUnit, setManualUnit] = useState('');

  // Catalog State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [catalogQty, setCatalogQty] = useState('1');
  const [priceOverride, setPriceOverride] = useState('');

  useEffect(() => {
    if (isOpen) {
      // NOTE: transactions are now props, so no sync logic here.
      resetManualForm();
      setSearchTerm('');
      setSelectedProduct(null);
      setCatalogQty('1');
      setPriceOverride('');
      setMode('manual');

      // Default date to today local
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setEntryDate(`${year}-${month}-${day}`);
    }
  }, [isOpen]);
  // Removed dependency on currentTransactions to prevent form reset loop
  // (Though now it's controlled so it should be fine, but we only want to reset inputs on OPEN)

  // Auto-calculate total when using calculator fields
  useEffect(() => {
    if (showCalculator) {
      const q = parseFloat(manualQty);
      const u = parseFloat(manualUnit);
      if (!isNaN(q) && !isNaN(u)) {
        setNewAmount((q * u).toFixed(2));
      }
    }
  }, [manualQty, manualUnit, showCalculator]);

  const resetManualForm = () => {
    setNewDesc('');
    setNewAmount('');
    setManualQty('');
    setManualUnit('');
    setShowCalculator(false);
    // Keep date as is for rapid entry of same day
  };

  if (!isOpen) return null;

  // --- LOGIC: GROUP BY DATE ---
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    transactions.forEach(t => {
      // Handle legacy items without date (assume today or old)
      // We expect ISO string, split by T to get YYYY-MM-DD
      const dateKey = t.date ? t.date.split('T')[0] : 'Sin Fecha';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    // Sort dates descending (newest first)
    // "Sin Fecha" goes last
    return Object.keys(groups)
      .sort((a, b) => {
        if (a === 'Sin Fecha') return 1;
        if (b === 'Sin Fecha') return -1;
        return b.localeCompare(a);
      })
      .map(date => ({
        date,
        items: groups[date],
        total: groups[date].reduce((sum, t) => sum + t.amount, 0)
      }));
  }, [transactions]);

  // --- HANDLERS ---

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newAmount) return;

    let finalDesc = newDesc;
    if (showCalculator && manualQty && manualUnit) {
      finalDesc = `${newDesc} (${manualQty} x $${manualUnit})`;
    }

    // For manual add, we don't have productId, but we might have unitPrice from calculator
    const unitPrice = (showCalculator && manualUnit) ? parseFloat(manualUnit) : undefined;
    const quantity = (showCalculator && manualQty) ? parseFloat(manualQty) : undefined;

    addTransaction(finalDesc, parseFloat(newAmount), undefined, unitPrice, quantity);
    resetManualForm();
    document.getElementById('manual-desc')?.focus();
  };

  const handleCatalogAdd = () => {
    if (!selectedProduct) return;

    const price = priceOverride ? parseFloat(priceOverride) : selectedProduct.defaultPrice;
    const qty = parseFloat(catalogQty) || 0;

    if (qty <= 0) return;

    const total = price * qty;
    const desc = `${selectedProduct.name} (${catalogQty} x $${price})`;

    // Pass the productId, unitPrice (price), and quantity (qty)
    addTransaction(desc, total, selectedProduct.id, price, qty);

    // AUTO UPDATE REFERENCE PRICE Logic
    const now = new Date();
    const todayStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    const isHistorical = entryDate < todayStr;

    if (!isHistorical && onUpdateProduct && price !== selectedProduct.defaultPrice) {
      onUpdateProduct({
        ...selectedProduct,
        defaultPrice: price
      });
    }

    // Reset state for next entry
    setSelectedProduct(null);
    setCatalogQty('1');
    setPriceOverride('');
    setSearchTerm(''); // Clear search term so user can type next item immediately
  };

  const handleQuickCreateProduct = () => {
    if (!searchTerm) return;
    const newProduct: Product = {
      id: Date.now().toString(),
      name: searchTerm,
      defaultPrice: 0,
      tagId: 'uncategorized'
    };
    onAddProduct(newProduct);
    setSelectedProduct(newProduct);
    setPriceOverride('0');
  };

  const addTransaction = (description: string, amount: number, productId?: string, unitPrice?: number, quantity?: number) => {
    // Construct ISO string from the date picker + current time to avoid timezone data loss
    const now = new Date();
    // Parse YYYY-MM-DD
    const [year, month, day] = entryDate.split('-').map(Number);
    // Create new date object
    const finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes());

    const newItem: Transaction = {
      id: Date.now().toString(),
      description,
      amount,
      date: finalDate.toISOString(),
      productId,
      unitPrice,
      quantity
    };
    // Controlled update: Call parent immediately
    onTransactionChange([...transactions, newItem]);
  };

  const handleDelete = (id: string) => {
    onTransactionChange(transactions.filter(t => t.id !== id));
  };

  const handleSave = () => {
    // onSave passed from parent is now just "setEditingTransactions(null)" (close)
    onSave();
    onClose();
  };

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const catalogTotalPreview = (parseFloat(priceOverride) || 0) * (parseFloat(catalogQty) || 0);

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === 'Sin Fecha') return 'Registros Anteriores';

    const [y, m, d] = dateStr.split('-').map(Number);
    // Create date with local time assumption to avoid off-by-one errors in display
    const date = new Date(y, m - 1, d);

    return date.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gray-900 p-4 flex justify-between items-center text-white shrink-0">
          <div>
            <h3 className="font-bold text-lg">{itemName}</h3>
            <p className="text-gray-400 text-sm">{MONTHS[monthIndex]} - Detalle de Gastos</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mode === 'manual' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <PenTool size={16} />
            Entrada Manual
          </button>
          <button
            onClick={() => setMode('catalog')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mode === 'catalog' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <ShoppingBag size={16} />
            Desde Catálogo
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">

          {/* GROUPED TRANSACTIONS LIST */}
          <div className="space-y-4">
            {groupedTransactions.length === 0 ? (
              <p className="text-center text-gray-400 py-8 italic text-sm">No hay items en este registro.</p>
            ) : (
              groupedTransactions.map((group) => (
                <div key={group.date} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                  {/* Group Header (The "Instance" or "Trip") */}
                  <div className="bg-gray-100/50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">{formatDateLabel(group.date)}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                      ${group.total.toLocaleString('es-UY')}
                    </span>
                  </div>

                  {/* Items in this group */}
                  <div className="divide-y divide-gray-100">
                    {group.items.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 hover:bg-gray-50 group transition-colors">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{t.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-600 text-sm">${t.amount.toLocaleString('es-UY')}</span>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                            title="Eliminar item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* INPUT AREA (Sticky Bottom) */}
        <div className="bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">

          {/* Date Picker (Small, minimal) */}
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Fecha de compra:</span>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
              />
            </div>
          </div>

          {mode === 'manual' ? (
            <form onSubmit={handleManualAdd} className="flex flex-col gap-3">

              {/* Calculator Row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors font-medium border ${showCalculator ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                  >
                    <Calculator size={14} />
                    {showCalculator ? 'Ocultar Calc' : 'Usar Calculadora'}
                  </button>
                </div>
              </div>

              {showCalculator && (
                <div className="flex gap-2 items-center bg-blue-50 p-2 rounded border border-blue-100 animate-fade-in">
                  <div className="flex-1">
                    <input
                      type="number" step="any" value={manualQty} onChange={e => setManualQty(e.target.value)}
                      className="w-full text-xs border border-blue-200 rounded px-2 py-1.5 outline-none" placeholder="Cant/Peso"
                    />
                  </div>
                  <span className="text-blue-400">×</span>
                  <div className="flex-1">
                    <input
                      type="number" step="any" value={manualUnit} onChange={e => setManualUnit(e.target.value)}
                      className="w-full text-xs border border-blue-200 rounded px-2 py-1.5 outline-none" placeholder="$ Unitario"
                    />
                  </div>
                  <span className="text-blue-400"><ArrowRight size={14} /></span>
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Descripción</label>
                  <input
                    id="manual-desc" type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={showCalculator ? "Ej. Bananas" : "Ej. Compra Tienda Inglesa"} autoFocus
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Monto ($)</label>
                  <input
                    type="number" step="any" value={newAmount} onChange={e => setNewAmount(e.target.value)}
                    readOnly={showCalculator}
                    className={`w-full text-sm border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none ${showCalculator ? 'bg-gray-100 font-bold text-blue-900' : 'bg-white'}`}
                    placeholder="0"
                  />
                </div>
                <button type="submit" disabled={!newDesc || !newAmount}
                  className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors h-[38px] w-[38px] flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 space-y-3">
              {/* CATALOG MODE */}
              {!selectedProduct ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
                    <input
                      type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar en catálogo..."
                      className="w-full pl-9 pr-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto bg-white border border-emerald-100 rounded-lg shadow-sm">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setPriceOverride(p.defaultPrice.toString()); }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-xs flex justify-between items-center border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium text-gray-700">{p.name}</span>
                        <span className="text-emerald-600">${p.defaultPrice}</span>
                      </button>
                    ))}
                    {searchTerm && filteredProducts.length === 0 && (
                      <button onClick={handleQuickCreateProduct} className="w-full text-left px-3 py-2 text-xs text-emerald-600 font-medium hover:bg-emerald-50">
                        + Crear "{searchTerm}"
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800 text-sm">{selectedProduct.name}</span>
                    <button onClick={() => setSelectedProduct(null)} className="text-xs text-gray-400 hover:text-gray-600">Cambiar</button>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-emerald-700 mb-0.5">Precio Unit.</label>
                      <input type="number" step="any" value={priceOverride} onChange={e => setPriceOverride(e.target.value)}
                        className="w-full border border-emerald-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-emerald-700 mb-0.5">Cant/Peso</label>
                      <input type="number" step="any" value={catalogQty} onChange={e => setCatalogQty(e.target.value)}
                        className="w-full border border-emerald-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                        placeholder="1.0"
                      />
                    </div>
                    <button onClick={handleCatalogAdd} className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 h-[30px] flex items-center">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-[10px] text-gray-500">Total: </span>
                    <span className="text-sm font-bold text-emerald-700">${catalogTotalPreview.toLocaleString('es-UY', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center shrink-0">
          <div>
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Mes</span>
            <p className="text-2xl font-bold text-gray-800">${total.toLocaleString('es-UY')}</p>
          </div>
          <button
            onClick={handleSave}
            className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Save size={18} />
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
