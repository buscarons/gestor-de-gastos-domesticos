import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Table2, Wallet, BookOpen, ChevronLeft, ChevronRight, Plus, ShoppingBag, Settings, Sparkles, Database, Trash2 } from 'lucide-react';
import { ExpenseItem, IncomeItem, ViewState, Product, ProductTag, YearConfig, MONTHS } from './types';
import { Dashboard } from './components/Dashboard';
import { ExpenseEntry } from './components/ExpenseEntry';
import { IncomeEntry } from './components/IncomeEntry';

import { CategoryHelp } from './components/CategoryHelp';
import { QuickAddModal } from './components/QuickAddModal';
import { ProductManager } from './components/ProductManager';
import { WelcomeScreen } from './components/WelcomeScreen';
import { YearSettingsModal } from './components/YearSettingsModal';
import { StorageService } from './services/StorageService';
import { DemoDataService } from './services/DemoDataService'; // Import Demo Service
import { LoginModal } from './components/LoginModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { User, LogIn, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');

  // Data States
  const [data, setData] = useState<ExpenseItem[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeItem[]>([]);
  const [globalBaseBalance, setGlobalBaseBalance] = useState<number>(0);
  const [yearConfigs, setYearConfigs] = useState<YearConfig[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [tags, setTags] = useState<ProductTag[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showYearSettings, setShowYearSettings] = useState(false);
  const [entryTab, setEntryTab] = useState<'expenses' | 'income'>('expenses');
  const [initError, setInitError] = useState<string | null>(null);

  // Auth State
  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  // Year state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Load data on mount using StorageService
  const loadAllData = async () => {
    setLoading(true);
    try {
      // Ensure we have a user (anonymous or otherwise) before loading data
      // If we are already logged in via Email, this just confirms it.
      await StorageService.ensureAuth();

      const user = await StorageService.getSessionUser();
      setCurrentUserEmail(user?.email || null); // If email is null, it's Guest Mode

      // GUEST MODE: Initialize Demo Data if needed
      if (!user) {
        if (!DemoDataService.checkIfGuestDataExists()) {
          DemoDataService.initializeDemoData(selectedYear);
        }
      }

      const [
        setupStatus,
        expenses,
        income,
        baseBalance,
        configs,
        prods,
        loadedTags
      ] = await Promise.all([
        StorageService.getSetupStatus(),
        StorageService.getExpenses(),
        StorageService.getIncome(),
        StorageService.getBaseBalance(),
        StorageService.getYearConfigs(),
        StorageService.getProducts(),
        StorageService.getTags()
      ]);

      setIsSetup(setupStatus);
      setData(expenses);
      setIncomeData(income);
      setGlobalBaseBalance(baseBalance);
      setYearConfigs(configs);
      setProducts(prods);
      setTags(loadedTags);
    } catch (error: any) {
      console.error("Failed to load data:", error);
      setInitError(error.message || "Error desconocido al iniciar la aplicación.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Check for Demo Welcome
  useEffect(() => {
    if (!loading && !currentUserEmail) {
      const shown = localStorage.getItem('demo_welcome_shown');
      if (!shown) {
        setDemoModalOpen(true);
      }
    }
  }, [loading, currentUserEmail]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const performLogout = async () => {
    await StorageService.signOut();
    window.location.reload();
  };

  // --- DERIVED DATA & HELPERS ---

  // Dynamic Categories from Data
  const availableCategories = useMemo(() => {
    const cats = new Set(data.map(i => i.category));
    const list = Array.from(cats);
    return list.length > 0 ? list : [];
  }, [data]);

  const currentYearData = useMemo(() => {
    return data.filter(item => item.year === selectedYear);
  }, [data, selectedYear]);

  const previousYearData = useMemo(() => {
    return data.filter(item => item.year === selectedYear - 1);
  }, [data, selectedYear]);

  const currentYearIncome = useMemo(() => {
    return incomeData.filter(item => item.year === selectedYear);
  }, [incomeData, selectedYear]);

  const previousYearIncome = useMemo(() => {
    return incomeData.filter(item => item.year === selectedYear - 1);
  }, [incomeData, selectedYear]);

  const currentYearConfig = useMemo(() => {
    return yearConfigs.find(c => c.year === selectedYear) || { year: selectedYear, startMonthIndex: 0 };
  }, [yearConfigs, selectedYear]);

  const previousYearConfig = useMemo(() => {
    return yearConfigs.find(c => c.year === selectedYear - 1) || { year: selectedYear - 1, startMonthIndex: 0 };
  }, [yearConfigs, selectedYear]);

  // ... (existing code)


  const previousYearsAccumulated = useMemo(() => {
    let accumulated = 0;
    const allYears = new Set([...data.map(i => i.year), ...incomeData.map(i => i.year)]);
    const pastYears = Array.from(allYears).filter(y => y < selectedYear);

    pastYears.forEach(year => {
      const yearExp = data.filter(i => i.year === year);
      const yearInc = incomeData.filter(i => i.year === year);

      const totalExp = yearExp.reduce((acc, item) => acc + item.amounts.reduce((a, b) => a + b, 0), 0);
      const totalInc = yearInc.reduce((acc, item) => acc + item.amounts.reduce((a, b) => a + b, 0), 0);

      accumulated += (totalInc - totalExp);
    });

    return accumulated;
  }, [data, incomeData, selectedYear]);

  const openingBalanceForSelectedYear = globalBaseBalance + previousYearsAccumulated;

  // --- HANDLERS ---

  const completeSetup = async () => {
    setIsSetup(true);
    await StorageService.completeSetup();
  };

  const handleManualSetup = async (year: number, startMonthIndex: number) => {
    setSelectedYear(year);
    handleUpdateYearConfig(startMonthIndex, year);
    await completeSetup();
    setView('entry');
  };

  const handleUpdateData = async (yearData: ExpenseItem[]) => {
    const otherYearsData = data.filter(item => item.year !== selectedYear);
    const newData = [...otherYearsData, ...yearData];
    setData(newData);
    await StorageService.saveExpenses(newData);
  };

  const handleUpdateIncome = async (yearIncome: IncomeItem[]) => {
    const otherYearsIncome = incomeData.filter(item => item.year !== selectedYear);
    const newIncome = [...otherYearsIncome, ...yearIncome];
    setIncomeData(newIncome);
    await StorageService.saveIncome(newIncome);
  };

  const handleUpdateOpeningBalance = async (newOpeningBalance: number) => {
    const newGlobalBase = newOpeningBalance - previousYearsAccumulated;
    setGlobalBaseBalance(newGlobalBase);
    await StorageService.saveBaseBalance(newGlobalBase);
  };

  const handleUpdateYearConfig = async (startMonthIndex: number, targetYear: number = selectedYear) => {
    const otherConfigs = yearConfigs.filter(c => c.year !== targetYear);
    const newConfig = { year: targetYear, startMonthIndex };
    const newConfigs = [...otherConfigs, newConfig];
    setYearConfigs(newConfigs);
    await StorageService.saveYearConfigs(newConfigs);
  };

  const handleUpdateProducts = async (newProducts: Product[]) => {
    setProducts(newProducts);
    await StorageService.saveProducts(newProducts);
  };

  const handleUpdateTags = async (newTags: ProductTag[]) => {
    setTags(newTags);
    await StorageService.saveTags(newTags);
  };

  const handleCleanInvalidData = (startIdx: number) => {
    // Corrects data for the *selectedYear* by zeroing out months before startIdx
    const updatedYearData = currentYearData.map(item => {
      const newAmounts = [...item.amounts];
      let hasChanges = false;

      for (let i = 0; i < startIdx; i++) {
        if (newAmounts[i] !== 0) {
          newAmounts[i] = 0;
          hasChanges = true;
        }
      }

      return hasChanges ? { ...item, amounts: newAmounts } : item;
    });

    const changed = updatedYearData.some((item, i) => item !== currentYearData[i]);
    if (changed) {
      handleUpdateData(updatedYearData);
    }
    return changed;
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center">Cargando...</div>;

  if (initError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-8 text-center bg-red-50">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-red-100 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error de Conexión</h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // --- WELCOME SCREEN (MANUAL SETUP) ---
  if (!isSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <WelcomeScreen
          onManualStart={handleManualSetup}
          defaultYear={selectedYear}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 relative">
      <CategoryHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <YearSettingsModal
        isOpen={showYearSettings}
        onClose={() => setShowYearSettings(false)}
        year={selectedYear}
        currentStartMonthIndex={currentYearConfig.startMonthIndex}
        onSave={(idx) => handleUpdateYearConfig(idx)}
        onCleanInvalidData={() => handleCleanInvalidData(currentYearConfig.startMonthIndex)}
      />

      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        data={currentYearData}
        year={selectedYear}
        onSave={(updated) => {
          handleUpdateData(updated);
        }}
      />

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 sticky top-0 md:h-screen z-20 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">Mis Finanzas</h1>
            <p className="text-xs text-gray-500">Gestión Integral</p>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <LayoutDashboard size={18} />
            Estadísticas
          </button>

          <button
            onClick={() => setView('entry')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'entry' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Table2 size={18} />
            Registro (Gastos/Ingresos)
          </button>

          <button
            onClick={() => setView('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'products' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <ShoppingBag size={18} />
            Catálogo de Productos
          </button>



          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => setShowHelp(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            >
              <BookOpen size={18} />
              Glosario de Categorías
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-full ${currentUserEmail ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-700 truncate">
                {currentUserEmail ? 'Usuario Conectado' : 'Modo Invitado'}
              </p>
              <p className="text-[10px] text-gray-500 truncate" title={currentUserEmail || 'Datos locales'}>
                {currentUserEmail || 'Datos temporales'}
              </p>
            </div>
          </div>

          {currentUserEmail ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-xs text-red-600 hover:bg-red-50 p-2 rounded border border-transparent hover:border-red-100 transition-all font-medium"
            >
              <LogOut size={14} /> Cerrar Sesión
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="w-full flex items-center justify-center gap-2 text-xs text-blue-600 hover:bg-blue-50 p-2 rounded border border-transparent hover:border-blue-100 transition-all font-medium"
            >
              <LogIn size={14} /> Iniciar Sesión
            </button>
          )}
        </div>
      </aside>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={() => {
          // Reload everything to fetch data for the new user
          loadAllData();
        }}
      />

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={performLogout}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir? Volverás al modo invitado."
        confirmLabel="Cerrar Sesión"
        isDestructive={true}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {view === 'dashboard' && 'Resumen Financiero'}
              {view === 'entry' && 'Libro Diario'}
              {view === 'products' && 'Mi Catálogo'}

            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {view === 'dashboard' && `Visualiza el flujo de caja y proyecciones de ${selectedYear}.`}
              {view === 'entry' && `Administra tus ingresos y gastos para el año ${selectedYear}.`}
              {view === 'products' && `Gestiona tus productos frecuentes para carga rápida.`}

            </p>
          </div>

          {view !== 'products' && (
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 font-bold text-gray-800 min-w-[80px] text-center select-none">
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear(y => y + 1)}
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </header>

        {view === 'dashboard' && (
          <Dashboard
            data={currentYearData}
            incomeData={currentYearIncome}
            previousYearData={previousYearData}
            previousYearIncome={previousYearIncome}
            yearConfig={{
              year: selectedYear,
              startMonthIndex: currentYearConfig.startMonthIndex
            }}
            prevYearStartMonthIndex={previousYearConfig.startMonthIndex}
            baseBalance={openingBalanceForSelectedYear}
          />
        )}

        {view === 'entry' && (
          <div className="space-y-6">
            {/* Header: Tabs + Global Config */}
            <div className="flex justify-between items-center">
              <div className="flex gap-1 bg-gray-200 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setEntryTab('expenses')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${entryTab === 'expenses' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  Gastos
                </button>
                <button
                  onClick={() => setEntryTab('income')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${entryTab === 'income' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  Ingresos y Ahorros
                </button>
              </div>

              {/* Global Year Config Button */}
              <button
                onClick={() => setShowYearSettings(true)}
                className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-blue-600 bg-white border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-colors"
                title="Corregir mes de inicio de datos"
              >
                <Settings size={14} />
                <span>Inicio: {MONTHS[currentYearConfig.startMonthIndex]}</span>
              </button>
            </div>

            {currentYearData.length === 0 && entryTab === 'expenses' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3 mb-4">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-full mt-0.5"><Plus size={16} /></div>
                <div>
                  <h4 className="font-bold text-blue-800 text-sm">Comienza a registrar</h4>
                  <p className="text-xs text-blue-600 mt-1">Tu tabla está vacía. Usa el formulario de abajo para agregar tu primera categoría (ej. "Supermercado") y empezar.</p>
                </div>
              </div>
            )}

            {entryTab === 'expenses' ? (
              <ExpenseEntry
                data={currentYearData}
                previousYearData={previousYearData}
                categories={availableCategories}
                onUpdate={handleUpdateData}
                year={selectedYear}
                products={products}
                onUpdateProducts={handleUpdateProducts}
                startMonthIndex={currentYearConfig.startMonthIndex}
              />
            ) : (
              <IncomeEntry
                data={currentYearIncome}
                previousYearData={previousYearIncome}
                onUpdate={handleUpdateIncome}
                year={selectedYear}
                startMonthIndex={currentYearConfig.startMonthIndex}
                openingBalance={openingBalanceForSelectedYear}
                previousYearsAccumulated={previousYearsAccumulated}
                onUpdateOpeningBalance={handleUpdateOpeningBalance}
              />
            )}
          </div>
        )}

        {view === 'products' && (
          <ProductManager
            products={products}
            tags={tags}
            onUpdateProducts={handleUpdateProducts}
            onUpdateTags={handleUpdateTags}
            allExpenses={data}
          />
        )}


      </main>

      {/* Floating Action Button for Quick Add */}
      {currentYearData.length > 0 && view !== 'products' && (
        <button
          onClick={() => setShowQuickAdd(true)}
          className="fixed bottom-20 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 z-40 group"
          title="Registro Rápido de Gastos"
        >
          <Plus size={28} />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Agregar Gasto
          </span>
        </button>
      )}

      {/* DEMO MODE BANNER */}
      {!currentUserEmail && !loading && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-400 text-amber-950 px-4 py-2 z-50 flex items-center justify-center shadow-lg border-t border-amber-500">
          <div className="flex items-center gap-2 max-w-4xl w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded border border-amber-200">MODO DEMO</span>
              <p className="text-xs font-medium hidden sm:block">Datos de ejemplo generados automáticamente. Tus cambios se perderán al borrar caché.</p>
              <p className="text-xs font-medium sm:hidden">Datos de ejemplo no persistentes.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  StorageService.signOut().then(() => {
                    localStorage.removeItem('guest_setup_completed');
                    window.location.reload();
                  });
                }}
                className="text-xs underline hover:text-black font-medium"
              >
                Reiniciar Demo
              </button>
              <span className="text-amber-700/40">|</span>
              <button onClick={() => setShowLogin(true)} className="text-xs font-bold hover:underline flex items-center gap-1">
                <LogIn size={12} />
                Acceder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEMO WELCOME MODAL */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 transform transition-all scale-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
              <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-md border border-white/30">
                <Sparkles size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-1">Modo Demo Activado</h2>
              <p className="text-blue-100 text-sm">Explora la app con datos de prueba</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex gap-3 items-start bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="mt-0.5 text-blue-600"><Database size={18} /></div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Datos Locales</h4>
                  <p className="text-xs text-gray-600 mt-0.5">Todo lo que ves vive en tu navegador. Nada se guarda en la nube ni es visible para otros.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-amber-50 p-3 rounded-lg border border-amber-100">
                <div className="mt-0.5 text-amber-600"><Trash2 size={18} /></div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Volátil</h4>
                  <p className="text-xs text-gray-600 mt-0.5">Si borras el historial o entras desde otro dispositivo, comenzarás de cero (o verás una nueva demo).</p>
                </div>
              </div>

              <p className="text-xs text-center text-gray-400 mt-4">
                ¿Listo para tomar el control de tus finanzas? create una cuenta para guardar tus datos reales.
              </p>

              <button
                onClick={() => {
                  localStorage.setItem('demo_welcome_shown', 'true');
                  // Force re-render just to hide modal? Or generic state?
                  // Quick hack: just remove modal from DOM by simpler logic or state?
                  // We need state for this modal visibility to close it smoothly.
                  // Let's rely on React state update instead of direct variable.
                  window.dispatchEvent(new Event('storage')); // trigger update? No.
                  // Better: Set a state.
                  setDemoModalOpen(false);
                }}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-all transform active:scale-95 shadow-lg"
              >
                ¡Entendido, vamos!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default App;