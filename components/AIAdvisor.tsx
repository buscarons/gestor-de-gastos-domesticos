import React, { useState } from 'react';
import { ExpenseItem } from '../types';
import { analyzeExpenses } from '../services/geminiService';
import { Sparkles, Send, Loader2, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAdvisorProps {
  data: ExpenseItem[];
  configText?: string;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ data, configText }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);
    
    const result = await analyzeExpenses(data, question, configText);
    setResponse(result);
    setLoading(false);
  };

  const suggestions = [
    "¿En qué categoría estoy gastando más?",
    "¿Cómo evolucionó el gasto de Supermercado?",
    "Dame 3 consejos para ahorrar en base a mis gastos.",
    "Proyecta mi gasto total para fin de año."
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Left: Chat Interface */}
      <div className="lg:col-span-2 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h2 className="font-semibold">Asistente Financiero IA</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!response && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 opacity-70">
              <Bot size={64} strokeWidth={1} />
              <p className="text-center max-w-sm">
                Soy tu asistente personal. Analizo tus datos locales y te ayudo a entender mejor tus finanzas. Pregúntame lo que quieras.
              </p>
            </div>
          )}

          {response && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 animate-fade-in">
              <div className="prose prose-sm prose-blue max-w-none text-gray-800">
                <ReactMarkdown>{response}</ReactMarkdown>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <span className="text-sm text-gray-500">Analizando tus gastos...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ej: ¿Por qué gasté tanto en junio?"
              className="flex-1 border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="bg-indigo-600 text-white px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Suggestions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Sugerencias Rápidas</h3>
        <div className="space-y-3">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestion(s);
                // Optional: auto submit
              }}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm text-gray-700"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <h4 className="text-yellow-800 font-medium mb-2 text-sm">¿Cómo funciona?</h4>
          <p className="text-xs text-yellow-700 leading-relaxed">
            El asistente analiza la tabla de gastos que has cargado. Detecta patrones, sumas totales y anomalías en tus consumos de UTE, Antel, Supermercado, etc.
          </p>
        </div>
      </div>
    </div>
  );
};