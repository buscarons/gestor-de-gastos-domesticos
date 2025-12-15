import React, { useState } from 'react';
import { PenTool, Calendar } from 'lucide-react';
import { MONTHS } from '../types';

interface WelcomeScreenProps {
  onManualStart: (year: number, startMonthIndex: number) => void;
  defaultYear: number;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onManualStart, defaultYear }) => {
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedStartMonth, setSelectedStartMonth] = useState(6); // Default July (index 6)

  return (
    <div className="rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full mx-auto overflow-hidden animate-fade-in bg-white">
      <div className="p-8 md:p-12 flex flex-col justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden min-h-[500px]">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 left-0 p-24 bg-indigo-900 opacity-20 rounded-full blur-2xl transform -translate-x-10 translate-y-10"></div>
        
        <div className="relative z-10 flex flex-col h-full justify-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm shadow-inner">
            <div className="text-white">
              <PenTool size={32} />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-2">Comenzar desde Cero</h2>
          <p className="text-blue-100 mb-8 leading-relaxed">
            Crea una planilla vacía y registra tus gastos e ingresos paso a paso. Configura el inicio de tu año contable.
          </p>

          <div className="space-y-5 bg-white/10 p-6 rounded-xl border border-white/20 backdrop-blur-md shadow-lg">
            <div>
              <label className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">Año Contable</label>
              <input 
                type="number" 
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full bg-black/20 border border-white/30 rounded-lg px-4 py-3 text-white font-bold outline-none focus:bg-black/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">
                Mes de Inicio de Registros
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => setSelectedStartMonth(idx)}
                    className={`text-xs py-2 rounded-md transition-all border ${
                      selectedStartMonth === idx 
                        ? 'bg-white text-blue-700 border-white font-bold shadow-lg transform scale-105' 
                        : 'bg-transparent text-blue-200 border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {m.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => onManualStart(selectedYear, selectedStartMonth)}
              className="w-full bg-white text-blue-700 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg mt-4 flex items-center justify-center gap-2"
            >
              Crear Planilla <Calendar size={18}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};