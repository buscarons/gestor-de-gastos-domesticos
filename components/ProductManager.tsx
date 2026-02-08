import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product, ProductTag, ExpenseItem, Transaction } from '../types';
import { Plus, Trash2, Edit2, Save, X, Search, Image as ImageIcon, Tag as TagIcon, Upload, LineChart as ChartIcon, TrendingUp, TrendingDown, BarChart3, ArrowRight, ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { InflationService, calculatePresentValue } from '../services/InflationService';
import { AlertModal } from './AlertModal';
import { ConfirmationModal } from './ConfirmationModal';


interface ProductManagerProps {
  products: Product[];
  tags: ProductTag[];
  onUpdateProducts: (products: Product[]) => void;
  onUpdateTags: (tags: ProductTag[]) => void;
  allExpenses: ExpenseItem[]; // To calculate history
}

const EMOJI_OPTIONS = [
  '🍎', '🥦', '🥩', '🐟', '🥖', '🧀', '🥫', '🍝', '🥣', '🧂',
  '🥨', '🥛', '🥚', '🧊', '🥤', '💧', '☕', '🍷', '🧼', '🧴',
  '👶', '🐾', '💊', '🩹'
];

export const ProductManager: React.FC<ProductManagerProps> = ({ products, tags, onUpdateProducts, onUpdateTags, allExpenses }) => {
  // View State: 'manage' (default) or 'analysis' (the report)
  const [viewMode, setViewMode] = useState<'manage' | 'analysis'>('manage');

  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // Inflation State
  const [inflationRates, setInflationRates] = useState<number[]>([]);
  const [showRealPrices, setShowRealPrices] = useState(false);

  // Tag Management State
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null); // null = create mode, string = edit mode
  const [newTagName, setNewTagName] = useState('');
  const [newTagEmoji, setNewTagEmoji] = useState(EMOJI_OPTIONS[0]);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [tagId, setTagId] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Modal States
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Inflation Data on Mount
  useEffect(() => {
    InflationService.getMonthlyInflation(new Date().getFullYear()).then(setInflationRates);
  }, []);

  const resetForm = () => {
    setName('');
    setPrice('');
    setTagId(tags[0]?.id || '');
    setImagePreview(null);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resize image to max 200x200 to save localStorage space
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxSize = 200;

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      setImagePreview(canvas.toDataURL('image/jpeg', 0.8)); // 80% quality
    };
  };

  const handleSaveProduct = async () => {
    if (!name || !price || isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    const finalPrice = parseFloat(price);
    if (isNaN(finalPrice)) return;

    if (tags.length === 0) {
      showAlert('Error', 'Espere a que se carguen las etiquetas antes de guardar.', 'warning');
      return;
    }

    // Check for duplicates (Case Insensitive)
    const normalizedName = trimmedName.toLowerCase();
    const isDuplicate = products.some(p =>
      p.id !== editingId && p.name.trim().toLowerCase() === normalizedName
    );

    if (isDuplicate) {
      showAlert('Producto Duplicado', `Ya existe un producto llamado "${trimmedName}" en el catálogo.`, 'warning');
      return;
    }

    const finalTagId = tagId || tags[0].id;
    console.log("Attempting to save product:", { trimmedName, finalPrice, finalTagId, editingId }); // DEBUG LOG
    setIsSaving(true);

    try {
      if (editingId) {
        // Edit
        const updated = products.map(p =>
          p.id === editingId
            ? { ...p, name: trimmedName, defaultPrice: finalPrice, tagId: finalTagId, image: imagePreview || undefined }
            : p
        );
        await onUpdateProducts(updated);
        // Add
        const newProduct: Product = {
          id: crypto.randomUUID(),
          name: trimmedName,
          defaultPrice: finalPrice,
          tagId: finalTagId,
          image: imagePreview || undefined
        };
        await onUpdateProducts([...products, newProduct]);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      showAlert('Error', 'No se pudo guardar el producto.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (p: Product) => {
    setName(p.name);
    setPrice(p.defaultPrice.toString());
    setTagId(p.tagId);
    setImagePreview(p.image || null);
    setEditingId(p.id);
    setIsAdding(true);
  };

  const handleDeleteProduct = (id: string) => {
    showConfirm(
      'Eliminar Producto',
      '¿Estás seguro de que deseas eliminar este producto del catálogo?',
      () => {
        onUpdateProducts(products.filter(p => p.id !== id));
      }
    );
  };

  const handleCreateTag = () => {
    if (!newTagName) return;

    // Check for duplicates (Case Insensitive)
    const normalizedName = newTagName.trim().toLowerCase();
    const existingTag = tags.find(t => t.name.toLowerCase() === normalizedName);

    if (existingTag) {
      showAlert(
        'Categoría Existente',
        `Ya existe una categoría llamada "${existingTag.name}". Se ha seleccionado automáticamente.`,
        'info'
      );
      setTagId(existingTag.id);
      setNewTagName('');
      setShowTagManager(false);
      return;
    }

    const newTag: ProductTag = {
      id: Date.now().toString(),
      name: newTagName.trim(), // Trim whitespace
      emoji: newTagEmoji
    };
    const updatedTags = [...tags, newTag];
    onUpdateTags(updatedTags);

    // Auto select new tag if in form
    setTagId(newTag.id);

    setNewTagName('');
    setEditingTagId(null);
    setShowTagManager(false);
  };

  // New: Edit an existing tag
  const handleUpdateTag = () => {
    if (!editingTagId || !newTagName.trim()) return;

    const normalizedName = newTagName.trim().toLowerCase();
    // Check for duplicates (but ignore self)
    const existingTag = tags.find(t => t.id !== editingTagId && t.name.toLowerCase() === normalizedName);

    if (existingTag) {
      showAlert(
        'Nombre Duplicado',
        `Ya existe otra categoría llamada "${existingTag.name}".`,
        'warning'
      );
      return;
    }

    const updatedTags = tags.map(t =>
      t.id === editingTagId
        ? { ...t, name: newTagName.trim(), emoji: newTagEmoji }
        : t
    );
    onUpdateTags(updatedTags);

    setNewTagName('');
    setNewTagEmoji(EMOJI_OPTIONS[0]);
    setEditingTagId(null);
    setShowTagManager(false);
  };

  const startEditTag = (tag: ProductTag) => {
    setEditingTagId(tag.id);
    setNewTagName(tag.name);
    setNewTagEmoji(tag.emoji);
    setShowTagManager(true);
  };

  const resetTagForm = () => {
    setNewTagName('');
    setNewTagEmoji(EMOJI_OPTIONS[0]);
    setEditingTagId(null);
    setShowTagManager(false);
  };

  // --- PRICE HISTORY LOGIC (REUSED) ---
  const getProductHistory = (product: Product) => {
    const history: { date: string, price: number, realPrice: number }[] = [];
    const currentMonthIndex = new Date().getMonth();

    // Iterate through all expenses (years, items)
    allExpenses.forEach(item => {
      // Check transactions map
      if (!item.transactions) return;

      Object.values(item.transactions).forEach((transactions: any) => {
        // Explicitly cast to Transaction[]
        (transactions as Transaction[]).forEach(t => {
          // Match by explicit ID (new way) or Fuzzy Name (legacy way)
          const isMatch = t.productId === product.id || t.description.toLowerCase().includes(product.name.toLowerCase());

          if (isMatch && t.date) {
            let unitPrice = t.unitPrice;

            // Fallback: Try to parse "Name (Qty x $Price)" if unitPrice is missing (Legacy data)
            if (!unitPrice) {
              const match = t.description.match(/x\s*\$([\d\.]+)/);
              if (match && match[1]) {
                unitPrice = parseFloat(match[1]);
              }
            }

            if (unitPrice && !isNaN(unitPrice)) {
              // Calculate Real Price (Inflation Adjusted)
              const txDate = new Date(t.date);
              const txMonth = txDate.getMonth();
              const realVal = calculatePresentValue(unitPrice, txMonth, currentMonthIndex, inflationRates);

              history.push({
                date: t.date, // ISO string
                price: unitPrice,
                realPrice: realVal
              });
            }
          }
        });
      });
    });

    // Sort by date ascending
    return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // --- ANALYSIS MODE LOGIC ---
  const analysisReport = useMemo(() => {
    if (viewMode !== 'analysis') return { increases: [], drops: [], stable: [] };

    const items = products.map(p => {
      const history = getProductHistory(p);
      if (history.length < 2) return null; // Need at least 2 points to compare

      const first = history[0];
      const last = history[history.length - 1];

      // Calculate Real Variation (Real vs Real)
      const realVariation = ((last.realPrice - first.realPrice) / first.realPrice) * 100;

      return {
        product: p,
        historyCount: history.length,
        firstDate: first.date,
        lastDate: last.date,
        firstRealPrice: first.realPrice,
        lastRealPrice: last.realPrice,
        lastNominalPrice: last.price,
        variation: realVariation
      };
    }).filter(x => x !== null);

    // Sort by variation
    const sorted = items.sort((a, b) => b!.variation - a!.variation);

    const increases = sorted.filter(i => i!.variation > 1); // > 1% increase
    const drops = sorted.filter(i => i!.variation < -1).sort((a, b) => a!.variation - b!.variation); // < -1% drop (sorted most negative first)
    const stable = sorted.filter(i => i!.variation >= -1 && i!.variation <= 1);

    return { increases, drops, stable };
  }, [products, allExpenses, viewMode, inflationRates]);


  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Group products by Tag
  const groupedProducts: Record<string, Product[]> = {};
  filteredProducts.forEach(p => {
    const tId = p.tagId || 'uncategorized';
    if (!groupedProducts[tId]) groupedProducts[tId] = [];
    groupedProducts[tId].push(p);
  });

  // --- RENDER ---

  if (viewMode === 'analysis') {
    return (
      <div className="bg-gray-50 h-[calc(100vh-140px)] flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="text-indigo-600" />
              Reporte de Variaciones Reales
            </h2>
            <p className="text-sm text-gray-500">
              Comparativa de precios ajustada por inflación (Primera compra vs. Última compra)
            </p>
          </div>
          <button
            onClick={() => setViewMode('manage')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al Catálogo
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden min-h-0">

          {/* COL 1: ALERTS (Increases) */}
          <div className="bg-white rounded-xl shadow-sm border border-red-100 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-red-100 bg-red-50/50 flex justify-between items-center">
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <TrendingUp size={20} />
                Subas Críticas (Real)
              </h3>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                {analysisReport.increases.length} Prod.
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {analysisReport.increases.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p>¡Buenas noticias! No hay subas drásticas por encima de la inflación.</p>
                </div>
              ) : (
                analysisReport.increases.map((item: any) => (
                  <div key={item.product.id} className="p-3 border border-red-100 rounded-lg hover:bg-red-50/30 transition-colors flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {item.product.image ? (
                        <img src={item.product.image} className="w-10 h-10 rounded-md object-cover bg-gray-100" />
                      ) : (
                        <div className="w-10 h-10 bg-red-50 rounded-md flex items-center justify-center text-red-300">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{item.product.name}</h4>
                        <div className="flex gap-2 text-[10px] text-gray-500">
                          <span>Inicio Real: ${item.firstRealPrice.toFixed(0)}</span>
                          <ArrowRight size={10} className="mt-0.5" />
                          <span>Hoy Real: ${item.lastRealPrice.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-red-600 font-bold text-lg">+{item.variation.toFixed(1)}%</span>
                      <button
                        onClick={() => setHistoryProduct(item.product)}
                        className="text-[10px] text-indigo-500 hover:underline"
                      >
                        Ver Gráfico
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COL 2: OPPORTUNITIES (Drops) */}
          <div className="bg-white rounded-xl shadow-sm border border-green-100 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-green-100 bg-green-50/50 flex justify-between items-center">
              <h3 className="font-bold text-green-800 flex items-center gap-2">
                <TrendingDown size={20} />
                Bajas / Oportunidades
              </h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                {analysisReport.drops.length} Prod.
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {analysisReport.drops.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p>No se detectaron bajas reales significativas.</p>
                </div>
              ) : (
                analysisReport.drops.map((item: any) => (
                  <div key={item.product.id} className="p-3 border border-green-100 rounded-lg hover:bg-green-50/30 transition-colors flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {item.product.image ? (
                        <img src={item.product.image} className="w-10 h-10 rounded-md object-cover bg-gray-100" />
                      ) : (
                        <div className="w-10 h-10 bg-green-50 rounded-md flex items-center justify-center text-green-300">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{item.product.name}</h4>
                        <div className="flex gap-2 text-[10px] text-gray-500">
                          <span>Inicio Real: ${item.firstRealPrice.toFixed(0)}</span>
                          <ArrowRight size={10} className="mt-0.5" />
                          <span>Hoy Real: ${item.lastRealPrice.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-green-600 font-bold text-lg">{item.variation.toFixed(1)}%</span>
                      <button
                        onClick={() => setHistoryProduct(item.product)}
                        className="text-[10px] text-indigo-500 hover:underline"
                      >
                        Ver Gráfico
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Helper Footer */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex gap-2 items-start shrink-0">
          <div className="mt-0.5 font-bold">Nota:</div>
          <p>
            Este reporte compara el precio de la <strong>primera compra registrada</strong> contra la <strong>última compra</strong>,
            ambos ajustados a valor presente (pesos de hoy).
            Un valor positivo en rojo significa que el producto subió más que la inflación acumulada en ese período.
          </p>
        </div>
      </div>
    );
  }

  // --- DEFAULT VIEW (MANAGE) ---

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
        {/* LEFT: List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-gray-800">Mis Productos</h2>

            <div className="flex gap-3">
              <button
                onClick={() => setViewMode('analysis')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-200 transition-colors"
                title="Ver reporte de variaciones de precios"
              >
                <BarChart3 size={16} />
                Reporte de Variaciones
              </button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-40 sm:w-auto"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            {/* Mobile Button for Analysis */}
            <div className="sm:hidden mb-4">
              <button
                onClick={() => setViewMode('analysis')}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-bold border border-indigo-200 transition-colors"
              >
                <BarChart3 size={18} />
                Ver Reporte de Variaciones
              </button>
            </div>

            {tags.map(tag => {
              const tagProducts = groupedProducts[tag.id];
              if (!tagProducts || tagProducts.length === 0) return null;

              return (
                <div key={tag.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <span>{tag.emoji}</span> {tag.name}
                    </h3>
                    <button
                      onClick={() => startEditTag(tag)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title={`Editar categoría ${tag.name}`}
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tagProducts.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:shadow-md transition-shadow group bg-white">
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-300">
                              <ImageIcon size={20} />
                            </div>
                          )}
                          <div>
                            <h3 className="font-medium text-gray-900">{p.name}</h3>
                            <p className="text-xs text-gray-500">Ref: ${p.defaultPrice}/u</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setHistoryProduct(p)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full" title="Ver Historial de Precios">
                            <ChartIcon size={16} />
                          </button>
                          <button onClick={() => startEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized Items */}
            {groupedProducts['uncategorized'] && groupedProducts['uncategorized'].length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Sin Categoría</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groupedProducts['uncategorized'].map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:shadow-md transition-shadow group bg-white">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-300">
                            <ImageIcon size={20} />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">{p.name}</h3>
                          <p className="text-xs text-gray-500">Ref: ${p.defaultPrice}/u</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setHistoryProduct(p)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full" title="Ver Historial de Precios">
                          <ChartIcon size={16} />
                        </button>
                        <button onClick={() => startEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                {search ? 'No se encontraron productos.' : 'Tu catálogo está vacío. ¡Agrega productos para empezar!'}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Editor Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            {isAdding && (
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            )}
          </div>

          {!isAdding && !editingId ? (
            <div className="space-y-4">
              <button
                onClick={() => setIsAdding(true)}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-2"
              >
                <Plus size={24} />
                <span className="font-medium">Agregar Producto</span>
              </button>
              <button
                onClick={() => setShowTagManager(!showTagManager)}
                className="w-full py-3 bg-gray-50 text-gray-600 rounded-lg text-sm hover:bg-gray-100 font-medium flex items-center justify-center gap-2"
              >
                <TagIcon size={16} />
                {showTagManager ? 'Cerrar Gestor de Etiquetas' : 'Gestionar Etiquetas'}
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* Image Upload */}
              <div className="flex justify-center">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-500 cursor-pointer flex flex-col items-center justify-center text-gray-400 overflow-hidden relative bg-gray-50 transition-colors"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload size={24} className="mb-2" />
                      <span className="text-xs">Subir Foto</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ej. Coca Cola 1.5L"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-start">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Precio de Referencia Unitario ($)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="0.00"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Ingresa el precio por unidad o por kilo. Este precio se usará como base para tus cálculos.
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Etiqueta</label>
                  <select
                    value={tagId}
                    onChange={e => {
                      if (e.target.value === 'new') {
                        setShowTagManager(true);
                        // Keep old value until created
                      } else {
                        setTagId(e.target.value);
                      }
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {tags.length > 0 ? (
                      tags.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)
                    ) : (
                      <option disabled>Cargando etiquetas...</option>
                    )}
                    <option value="new" className="text-blue-600 font-bold">+ Crear Nueva...</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button onClick={resetForm} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
                <button
                  onClick={handleSaveProduct}
                  disabled={tags.length === 0 || isSaving}
                  className={`flex-1 py-2 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${tags.length === 0 || isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {isSaving ? 'Guardando...' : (tags.length === 0 ? 'Cargando Tags...' : 'Guardar')}
                </button>
              </div>
            </div>
          )}

          {/* Inline Tag Manager (Create or Edit Mode) */}
          {showTagManager && (
            <div className="mt-6 border-t pt-6 animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-700 text-sm">
                  {editingTagId ? 'Editar Etiqueta' : 'Crear Nueva Etiqueta'}
                </h4>
                <button onClick={resetTagForm} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setNewTagEmoji(e)}
                      className={`text-lg p-1.5 rounded-lg transition-colors flex-shrink-0 ${newTagEmoji === e ? 'bg-white shadow-sm ring-1 ring-emerald-500' : 'hover:bg-gray-200'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
                    placeholder="Nombre (ej. Lácteos)"
                  />
                  <button
                    onClick={editingTagId ? handleUpdateTag : handleCreateTag}
                    disabled={!newTagName}
                    className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-900 disabled:opacity-50"
                  >
                    {editingTagId ? 'GUARDAR' : 'CREAR'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRICE HISTORY MODAL */}
      {historyProduct && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">

            {/* Header with Inflation Toggle */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{historyProduct.name}</h2>
                  <p className="text-indigo-100 text-sm opacity-90">Historial de variaciones de precio</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex bg-black/20 rounded-lg p-1">
                  <button
                    onClick={() => setShowRealPrices(false)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!showRealPrices ? 'bg-white text-indigo-700 shadow' : 'text-indigo-100 hover:bg-white/10'}`}
                  >
                    Nominal
                  </button>
                  <button
                    onClick={() => setShowRealPrices(true)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${showRealPrices ? 'bg-orange-500 text-white shadow' : 'text-indigo-100 hover:bg-white/10'}`}
                  >
                    Real (Ajustado)
                  </button>
                </div>
                <button onClick={() => setHistoryProduct(null)} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {(() => {
                const history = getProductHistory(historyProduct);
                if (history.length === 0) {
                  return (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
                      <ChartIcon size={48} className="mb-2 opacity-50" />
                      <p>No hay datos históricos para este producto.</p>
                    </div>
                  );
                }

                // Calculate simple stats based on SELECTION (Real or Nominal)
                const latestItem = history[history.length - 1];
                const firstItem = history[0];

                const latestVal = showRealPrices ? latestItem.realPrice : latestItem.price;
                const firstVal = showRealPrices ? firstItem.realPrice : firstItem.price;

                const variation = ((latestVal - firstVal) / firstVal) * 100;
                const isPositive = variation > 0;

                // Determine Colors
                const mainColor = showRealPrices ? '#f97316' : '#4f46e5'; // Orange vs Indigo
                const gradientId = showRealPrices ? 'colorReal' : 'colorNominal';

                return (
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className={`p-4 rounded-xl border flex-1 ${showRealPrices ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                        <span className={`text-xs font-bold uppercase ${showRealPrices ? 'text-orange-600' : 'text-gray-500'}`}>
                          Precio Actual ({showRealPrices ? 'Real' : 'Nominal'})
                        </span>
                        <p className={`text-2xl font-bold ${showRealPrices ? 'text-orange-900' : 'text-gray-800'}`}>
                          ${latestVal.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl border flex-1 ${isPositive ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
                            Variación {showRealPrices ? 'Real' : 'Nominal'}
                          </span>
                          {showRealPrices && (
                            <span className="text-[10px] bg-white/50 px-1.5 rounded text-gray-500 font-normal">vs Inicio</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`text-2xl font-bold ${isPositive ? 'text-red-700' : 'text-green-700'}`}>
                            {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                          </p>
                          {isPositive ? <TrendingUp size={20} className="text-red-500" /> : <TrendingDown size={20} className="text-green-500" />}
                        </div>
                      </div>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(d) => new Date(d).toLocaleDateString('es-UY', { month: 'short', day: 'numeric' })}
                            stroke="#9ca3af"
                            fontSize={12}
                            tickMargin={10}
                          />
                          <YAxis stroke="#9ca3af" fontSize={12} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
                          <RechartsTooltip
                            formatter={(val: number) => [`$${val.toFixed(2)}`, showRealPrices ? 'Precio Real' : 'Precio Ticket']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString('es-UY', { dateStyle: 'medium' })}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Area
                            type="monotone"
                            dataKey={showRealPrices ? "realPrice" : "price"}
                            stroke={mainColor}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#${gradientId})`}
                            animationDuration={500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-3 items-start">
                      <div className="text-blue-500 mt-0.5"><TrendingUp size={16} /></div>
                      <div>
                        <p className="text-xs text-blue-800 font-bold mb-0.5">
                          {showRealPrices ? 'Análisis de Precio Real' : 'Análisis de Precio Nominal'}
                        </p>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          {showRealPrices
                            ? 'Este gráfico muestra cuánto te costaría el producto hoy, trayendo los precios del pasado a valor presente según la inflación. Si la línea sube, el producto se encareció más que el promedio de la economía.'
                            : 'Este gráfico muestra exactamente lo que pagaste en cada ticket. No considera la inflación, por lo que es normal ver una tendencia al alza a largo plazo.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        isDestructive={true}
        confirmLabel="Eliminar"
      />
    </>
  );
};