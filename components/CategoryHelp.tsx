import React from 'react';
import { X, Zap, Building2, HeartPulse, ShoppingCart } from 'lucide-react';

interface CategoryHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryHelp: React.FC<CategoryHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Criterios de Categorización</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 grid gap-6">
          <div className="flex gap-4">
            <div className="bg-blue-100 p-3 rounded-lg h-fit text-blue-600">
              <Zap size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Servicios Básicos</h4>
              <p className="text-sm text-gray-600 mt-1">
                Gastos recurrentes y contractuales necesarios para el funcionamiento del hogar. Suelen tener vencimiento mensual fijo.
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Ej: UTE, ANTEL, TCC, Tarjetas de Crédito (OCA).</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-orange-100 p-3 rounded-lg h-fit text-orange-600">
              <Building2 size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Impuestos / Vivienda</h4>
              <p className="text-sm text-gray-600 mt-1">
                Tributos obligatorios ligados a la propiedad o alquiler. Suelen ser bimestrales o anuales.
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Ej: Contribución Inmobiliaria, Saneamiento, Tributos Domiciliarios.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-red-100 p-3 rounded-lg h-fit text-red-600">
              <HeartPulse size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Salud</h4>
              <p className="text-sm text-gray-600 mt-1">
                Cuotas fijas de cobertura médica, mutualistas o seguros de salud.
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Ej: Cuotas de socios CASMU, Emergencias móviles.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg h-fit text-green-600">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Gastos Variables</h4>
              <p className="text-sm text-gray-600 mt-1">
                Gastos de consumo diario que fluctúan mes a mes dependiendo de tus hábitos de compra.
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Ej: Supermercado, Feria, Farmacia, Veterinaria, Garrafa.</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};