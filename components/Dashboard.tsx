import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, Area } from 'recharts';
import { ExpenseItem, IncomeItem, MONTHS } from '../types';
import { TrendingUp, PiggyBank, Target, PieChart as PieIcon, Activity, TrendingDown, LifeBuoy, Wallet, Calculator, Calendar, ArrowRight, Sparkles, LineChart } from 'lucide-react';
import { InflationService, getCumulativeInflation, calculateRealValue } from '../services/InflationService';

interface DashboardProps {
  data: ExpenseItem[];
  incomeData: IncomeItem[];
  yearConfig: { startMonthIndex: number; year: number };
  baseBalance: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const Dashboard: React.FC<DashboardProps> = ({ data, incomeData, yearConfig, baseBalance }) => {

  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  // Use year from config for year-based logic
  const year = yearConfig.year;
  const isCurrentYear = year === currentYear;

  // Start month logic for reliable stats
  const startMonthIndex = yearConfig.startMonthIndex;

  const [showInflationAdjusted, setShowInflationAdjusted] = useState(false);
  const [inflationRates, setInflationRates] = useState<number[]>([]);

  // Simulator State
  const [simMonth, setSimMonth] = useState<number>(currentMonthIndex);
  const [simYear, setSimYear] = useState<number>(currentYear + 1);

  // Investment State
  const [enableInvestment, setEnableInvestment] = useState(false);
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(0);

  useEffect(() => {
    // Load inflation data on mount
    InflationService.getMonthlyInflation(year).then(setInflationRates);
  }, [year]);

  useEffect(() => {
    // Load inflation data on mount
    InflationService.getMonthlyInflation(year).then(setInflationRates);
  }, [year]);

  // --- LOGIC: DATA WINDOWS ---
  const RELIABLE_START_INDEX = startMonthIndex;

  // 1. For CHARTS: We include the current month so the user sees immediate progress
  const MAX_MONTH_FOR_CHARTS = isCurrentYear ? currentMonthIndex : 11;

  // 2. For STATS (Averages): We EXCLUDE the current month because it's incomplete and would skew the average down
  const MAX_MONTH_FOR_STATS = isCurrentYear ? Math.max(-1, currentMonthIndex - 1) : 11;

  // Helpers
  const isReliableForCharts = (idx: number) => idx >= RELIABLE_START_INDEX && idx <= MAX_MONTH_FOR_CHARTS;
  const isReliableForStats = (idx: number) => idx >= RELIABLE_START_INDEX && idx <= MAX_MONTH_FOR_STATS;

  // --- 1. MONTHLY AGGREGATES ---
  const monthlyData = useMemo(() => {
    return MONTHS.map((month, index) => {
      const totalExpense = data.reduce((acc, item) => acc + (item.amounts[index] || 0), 0);
      const totalIncome = incomeData.reduce((acc, item) => acc + (item.amounts[index] || 0), 0);
      const netSavings = totalIncome - totalExpense;

      return {
        name: month.substring(0, 3),
        fullName: month,
        expense: totalExpense,
        income: totalIncome,
        netSavings: netSavings,
        index: index
      };
    });
  }, [data, incomeData]);

  // --- 2. CALCULATE AVERAGES (Strictly on Completed Months) ---
  const { avgExpense, avgIncome, avgSavings, validMonthsCount } = useMemo(() => {
    let sumExpense = 0;
    let sumIncome = 0;
    let sumSavings = 0;
    let count = 0;

    for (let i = 0; i < 12; i++) {
      if (isReliableForStats(i)) {
        sumExpense += monthlyData[i].expense;
        sumIncome += monthlyData[i].income;
        sumSavings += monthlyData[i].netSavings;
        count++;
      }
    }

    return {
      avgExpense: count > 0 ? sumExpense / count : 0,
      avgIncome: count > 0 ? sumIncome / count : 0,
      avgSavings: count > 0 ? sumSavings / count : 0,
      validMonthsCount: count
    };
  }, [monthlyData, isReliableForStats]);

  // --- 3. PROJECTION LOGIC (With Inflation) ---
  const projectionData = useMemo(() => {
    // We maintain two separate accumulators to allow "forking" at the current month
    let runningActual = baseBalance; // initialSavings -> baseBalance (Prop name is baseBalance)
    let runningProjected = baseBalance;

    // Calculate Standard Deviation for Error Margin based only on COMPLETED months
    const reliableSavingsValues = monthlyData
      .filter(m => isReliableForStats(m.index))
      .map(m => m.netSavings);

    const variance = reliableSavingsValues.length > 0
      ? reliableSavingsValues.reduce((acc, val) => acc + Math.pow(val - avgSavings, 2), 0) / reliableSavingsValues.length
      : 0;
    const stdDev = Math.sqrt(variance);

    // Build the chart data
    const result = [];

    for (let i = 0; i < 12; i++) {
      // Calculate Accumulated Inflation from Start Month up to this month
      const cumulativeInflation = getCumulativeInflation(inflationRates, startMonthIndex, i);
      const monthStats = monthlyData[i];

      const isPast = isCurrentYear ? i < currentMonthIndex : true;
      const isCurrent = isCurrentYear && i === currentMonthIndex;
      const isFuture = isCurrentYear && i > currentMonthIndex;

      // --- 1. PAST MONTHS (Purely Actual) ---
      if (isPast) {
        runningActual += monthStats.netSavings;
        runningProjected = runningActual; // Projection syncs with reality in the past

        const realValue = calculateRealValue(runningActual, cumulativeInflation);

        result.push({
          name: monthStats.name,
          actual: runningActual,
          realActual: realValue,
          projected: null, // Don't show projection line for past, just actual
          realProjected: null,
          range: null,
          isUnrecorded: i < startMonthIndex,
          inflation: cumulativeInflation
        });
      }

      // --- 2. CURRENT MONTH (The Fork) ---
      else if (isCurrent) {
        // Path A: Reality (What has been entered so far, usually partial)
        // Note: For the 'Actual' line, we assume 'runningActual' IS the current state.
        // We add the current month's partial net savings to show "Today's State"
        const currentActualBalance = runningActual + monthStats.netSavings;

        // Path B: Projection (Where we SHOULD be based on average)
        // CRITICAL CHANGE: We do NOT use currentActualBalance for the projection line start.
        // We use the previous month closing + average savings. This stabilizes the projection.
        runningProjected += avgSavings;

        const realActual = calculateRealValue(currentActualBalance, cumulativeInflation);
        const realProjected = calculateRealValue(runningProjected, cumulativeInflation);

        result.push({
          name: monthStats.name,
          actual: currentActualBalance,     // Show reality (Spikes included)
          realActual: realActual,
          projected: runningProjected,      // Show stable projection (No spikes)
          realProjected: realProjected,
          range: [runningProjected - (stdDev * 0.5), runningProjected + (stdDev * 0.5)], // Small margin for current month
          isUnrecorded: false,
          inflation: cumulativeInflation
        });

        // Update running actual for next iterations (though next iterations are future)
        runningActual = currentActualBalance;
      }

      // --- 3. FUTURE MONTHS (Purely Projected) ---
      else if (isFuture) {
        // Continue adding average to the projected path
        runningProjected += avgSavings;

        const realValue = calculateRealValue(runningProjected, cumulativeInflation);
        const monthsIntoFuture = i - currentMonthIndex;
        const margin = stdDev * Math.sqrt(monthsIntoFuture) * 1.5;

        result.push({
          name: monthStats.name,
          actual: null, // No actual data for future
          realActual: null,
          projected: runningProjected,
          realProjected: realValue,
          range: [runningProjected - margin, runningProjected + margin],
          isUnrecorded: false,
          inflation: cumulativeInflation
        });
      }
    }
    return result;
  }, [monthlyData, baseBalance, avgSavings, currentMonthIndex, isReliableForStats, year, isCurrentYear, startMonthIndex, inflationRates]);


  // --- 4. CATEGORY BREAKDOWN ---
  // We use reliable CHART index here (includes current month) because we want to see what we spent this month
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};

    data.forEach(item => {
      // Sum amounts from start month up to current month (inclusive)
      const reliableTotal = item.amounts.reduce((sum, val, idx) => {
        return isReliableForCharts(idx) ? sum + val : sum;
      }, 0);

      if (reliableTotal > 0) {
        if (!categories[item.category]) {
          categories[item.category] = 0;
        }
        categories[item.category] += reliableTotal;
      }
    });

    return Object.keys(categories).map(key => ({
      name: key,
      value: categories[key]
    })).sort((a, b) => b.value - a.value);
  }, [data, isReliableForCharts]);

  // Totals for the whole year (Raw sum for display)
  const totalAnnualExpense = monthlyData.reduce((acc, curr) => acc + curr.expense, 0);

  // Get the last value of the year (could be actual or projected)
  const lastMonthData = projectionData[11];

  // KPI 1: Projected End Year Wealth
  const projectedEndYearNominal = lastMonthData?.projected ?? lastMonthData?.actual ?? 0;
  const projectedEndYearReal = lastMonthData?.realProjected ?? lastMonthData?.realActual ?? 0;

  const displayProjected = showInflationAdjusted ? projectedEndYearReal : projectedEndYearNominal;
  const purchasingPowerLoss = projectedEndYearNominal - projectedEndYearReal;

  // --- WEALTH CALCULATIONS ---

  // 1. LIQUID WEALTH (Cash on Hand)
  const currentLiquidWealth = monthlyData.reduce((acc, m, idx) => {
    if (!isCurrentYear) return acc + m.netSavings; // Past year: sum all
    if (idx <= currentMonthIndex) return acc + m.netSavings; // Current year: sum up to now
    return acc;
  }, baseBalance);

  // 2. STABLE WEALTH (Closed Months Only)
  const closedMonthsWealth = monthlyData.reduce((acc, m, idx) => {
    if (!isCurrentYear) return acc + m.netSavings; // Past year: sum all
    if (idx < currentMonthIndex) return acc + m.netSavings; // Current year: Strictly LESS than current index
    return acc;
  }, baseBalance);

  const runwayMonths = avgExpense > 0 ? closedMonthsWealth / avgExpense : 0;

  // Runway Color Logic
  let runwayColor = "text-gray-900";
  let runwayBg = "bg-gray-100";
  let runwayIconColor = "text-gray-600";

  if (runwayMonths < 1) {
    runwayColor = "text-red-600";
    runwayBg = "bg-red-100";
    runwayIconColor = "text-red-600";
  } else if (runwayMonths < 3) {
    runwayColor = "text-orange-600";
    runwayBg = "bg-orange-100";
    runwayIconColor = "text-orange-600";
  } else if (runwayMonths >= 6) {
    runwayColor = "text-blue-600";
    runwayBg = "bg-blue-100";
    runwayIconColor = "text-blue-600";
  } else {
    // 3-6 months (Healthy)
    runwayColor = "text-emerald-600";
    runwayBg = "bg-emerald-100";
    runwayIconColor = "text-emerald-600";
  }

  // --- SIMULATOR CALCULATIONS ---
  const simulationResult = useMemo(() => {
    // Calculate months diff from NOW to TARGET
    // NOW = currentYear, currentMonthIndex
    // TARGET = simYear, simMonth

    // Safety check: Don't simulate past or immediate present (makes no sense)
    if (simYear < currentYear || (simYear === currentYear && simMonth <= currentMonthIndex)) {
      return {
        nominal: currentLiquidWealth,
        real: currentLiquidWealth,
        investedNominal: currentLiquidWealth,
        investmentProfit: 0,
        monthsDiff: 0
      };
    }

    const monthsDiff = ((simYear - currentYear) * 12) + (simMonth - currentMonthIndex);

    // --- 1. BASIC SCENARIO (NO INVESTMENT) ---
    // Future Nominal = Current Money + (Months * Avg Savings Rate)
    const futureNominal = currentLiquidWealth + (monthsDiff * avgSavings);

    // Get Avg Inflation for Projection
    const avgMonthlyInflation = inflationRates.length > 0
      ? inflationRates.reduce((a, b) => a + b, 0) / inflationRates.length
      : 0.5; // Default fallback if no rates loaded

    // Calculate cumulative inflation for the future period: (1 + rate)^months
    const cumulativeInflationFactor = Math.pow(1 + (avgMonthlyInflation / 100), monthsDiff);

    // To get real value, we discount the future nominal amount
    const futureReal = futureNominal / cumulativeInflationFactor;

    // --- 2. INVESTMENT SCENARIO ---
    let investedNominal = futureNominal;
    let investmentProfit = 0;

    if (enableInvestment && annualReturnRate > 0) {
      const monthlyRate = Math.pow(1 + (annualReturnRate / 100), 1 / 12) - 1;

      // A. Compound Interest on Lump Sum (Current Wealth)
      const futureLumpSum = currentLiquidWealth * Math.pow(1 + monthlyRate, monthsDiff);

      // B. Compound Interest on Monthly Contributions (Annuity Future Value)
      // Formula: PMT * [((1 + r)^n - 1) / r]
      let futureContributions = 0;
      if (monthlyRate > 0) {
        futureContributions = avgSavings * ((Math.pow(1 + monthlyRate, monthsDiff) - 1) / monthlyRate);
      } else {
        futureContributions = avgSavings * monthsDiff;
      }

      investedNominal = futureLumpSum + futureContributions;
      investmentProfit = investedNominal - futureNominal;
    }

    return {
      nominal: futureNominal,
      real: futureReal,
      investedNominal,
      investmentProfit,
      monthsDiff
    };

  }, [simYear, simMonth, currentYear, currentMonthIndex, currentLiquidWealth, avgSavings, inflationRates, enableInvestment, annualReturnRate]);

  // Calculate Average Inflation (Annualized) for the UI preset
  const estimatedAnnualInflation = useMemo(() => {
    const avgMonthly = inflationRates.length > 0
      ? inflationRates.reduce((a, b) => a + b, 0) / inflationRates.length
      : 0.5;
    return (Math.pow(1 + avgMonthly / 100, 12) - 1) * 100;
  }, [inflationRates]);

  const handleSetInvestmentPreset = (type: 'cash' | 'ui' | 'conservative' | 'aggressive') => {
    if (type === 'cash') {
      setEnableInvestment(false);
      setAnnualReturnRate(0);
    } else {
      setEnableInvestment(true);
      if (type === 'ui') setAnnualReturnRate(Number(estimatedAnnualInflation.toFixed(2)));
      if (type === 'conservative') setAnnualReturnRate(5);
      if (type === 'aggressive') setAnnualReturnRate(10);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* KPI Cards Row - Responsive 6 Columns (3 on laptop, 6 on huge screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">

        {/* CARD 1: Patrimonio (Future Projection) */}
        <div className={`p-5 rounded-xl shadow-sm border relative overflow-hidden transition-colors ${showInflationAdjusted ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2 z-10 relative">
            <div className={`p-1.5 rounded-md ${showInflationAdjusted ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <PiggyBank size={16} />
            </div>
            <h3 className={`text-xs font-bold uppercase ${showInflationAdjusted ? 'text-orange-700' : 'text-gray-500'}`}>
              {showInflationAdjusted ? 'Patrimonio Real (Dic)' : 'Patrimonio Nominal (Dic)'}
            </h3>
          </div>
          <p className={`text-2xl font-bold z-10 relative ${showInflationAdjusted ? 'text-orange-900' : 'text-gray-900'}`}>
            ${Math.round(displayProjected).toLocaleString('es-UY')}
          </p>
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-2 translate-y-2">
            <TrendingUp size={64} />
          </div>
        </div>

        {/* CARD 2: Liquid Wealth (Present - Volatile) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 z-10 relative">
            <div className="p-1.5 bg-violet-100 text-violet-600 rounded-md"><Wallet size={16} /></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase">Ahorro Actual (Hoy)</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${Math.round(currentLiquidWealth).toLocaleString('es-UY')}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Saldo disponible real</p>
        </div>

        {/* CARD 3: Runway / Fondo de Emergencia (Stable) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 z-10 relative">
            <div className={`p-1.5 rounded-md ${runwayBg} ${runwayIconColor}`}><LifeBuoy size={16} /></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase">Fondo de Emergencia</h3>
          </div>
          <p className={`text-2xl font-bold ${runwayColor}`}>
            {runwayMonths === Infinity ? '∞' : runwayMonths.toFixed(1)} Meses
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Basado en meses cerrados</p>
        </div>

        {/* CARD 4: Promedio Gastos / Inflation Loss */}
        {showInflationAdjusted ? (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-red-100 text-red-600 rounded-md"><TrendingDown size={16} /></div>
              <h3 className="text-xs font-bold text-gray-500 uppercase">Pérdida Poder Adquisitivo</h3>
            </div>
            <p className="text-2xl font-bold text-red-600">-${Math.round(purchasingPowerLoss).toLocaleString('es-UY')}</p>
            <p className="text-[10px] text-gray-400 mt-1">Impacto acumulado de inflación</p>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md"><Activity size={16} /></div>
              <h3 className="text-xs font-bold text-gray-500 uppercase">Promedio Gastos</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">${Math.round(avgExpense).toLocaleString('es-UY')}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              {validMonthsCount > 0 ? `Basado en ${validMonthsCount} meses cerrados` : 'Datos insuficientes'}
            </p>
          </div>
        )}

        {/* CARD 5: Capacidad Ahorro */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md"><Target size={16} /></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase">Capacidad Ahorro</h3>
          </div>
          <p className={`text-2xl font-bold ${avgSavings >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
            ${Math.round(avgSavings).toLocaleString('es-UY')}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Promedio mensual real</p>
        </div>

        {/* CARD 6: Total Gastado */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md"><PieIcon size={16} /></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase">Total Gastado ({year})</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">${totalAnnualExpense.toLocaleString('es-UY')}</p>
          <p className="text-[10px] text-gray-400 mt-1">Acumulado anual total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CHART 1: Cash Flow (2/3 width) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 shrink-0">Flujo de Caja (Ingresos vs Gastos)</h3>
          <div className="flex-1 min-h-0 flex flex-col">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <RechartsTooltip
                  cursor={{ fill: '#f9fafb' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Monto"]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar name="Ingresos" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar name="Gastos" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Category Breakdown (1/3 width) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 shrink-0">Distribución de Gastos</h3>
          <p className="text-xs text-gray-400 mb-4 shrink-0">Datos visibles (incluye mes actual)</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHART 3: Savings Projection (Full Width) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col">
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Evolución y Proyección de Ahorros</h3>
            <p className="text-sm text-gray-500">
              {startMonthIndex > 0
                ? 'Los meses previos al inicio de registros se muestran planos.'
                : 'Basada en tu ritmo de ahorro promedio.'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* INFLATION TOGGLE */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setShowInflationAdjusted(false)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!showInflationAdjusted ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Nominal
              </button>
              <button
                onClick={() => setShowInflationAdjusted(true)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${showInflationAdjusted ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Ajustar por Inflación
              </button>
            </div>

            <div className="flex gap-2">
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium border border-indigo-100">Margen de error</span>
              {startMonthIndex > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium border border-gray-200">Zona no registrada</span>}
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <ComposedChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <RechartsTooltip
                formatter={(value: any, name: string) => {
                  if (name === 'range') return [null, null];
                  // Translation map
                  const labels: Record<string, string> = {
                    'actual': 'Ahorro Nominal',
                    'projected': 'Proy. Nominal',
                    'realActual': 'Valor Real (Ajustado)',
                    'realProjected': 'Proy. Real (Ajustada)'
                  };
                  return [`$${Number(value).toLocaleString()}`, labels[name] || name];
                }}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />

              {/* Margin of Error Area */}
              {!showInflationAdjusted && (
                <Area
                  type="monotone"
                  dataKey="range"
                  stroke="none"
                  fill="#c7d2fe"
                  name="Margen de Error"
                />
              )}

              {/* Actual Line - Connects known points */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                name="Nominal"
                connectNulls
                opacity={showInflationAdjusted ? 0.3 : 1}
              />

              {/* Projected Line */}
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#9333ea"
                strokeDasharray="5 5"
                strokeWidth={3}
                dot={{ r: 4, fill: '#9333ea', strokeWidth: 2, stroke: '#fff' }}
                name="Proyección"
                connectNulls
                opacity={showInflationAdjusted ? 0.3 : 1}
              />

              {/* REAL VALUE LINES (Only when toggled) */}
              {showInflationAdjusted && (
                <>
                  <Line
                    type="monotone"
                    dataKey="realActual"
                    stroke="#ea580c"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }}
                    name="Valor Real"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="realProjected"
                    stroke="#ea580c"
                    strokeDasharray="5 5"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }}
                    name="Proy. Real"
                    connectNulls
                  />
                </>
              )}

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LONG TERM SIMULATOR WIDGET */}
      <div className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-xl p-6 text-white shadow-xl flex flex-col xl:flex-row items-stretch justify-between gap-6 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 p-24 bg-indigo-500 opacity-10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>

        <div className="z-10 flex-1 min-w-[300px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-500/30 p-2 rounded-lg backdrop-blur-sm">
              <Sparkles className="text-indigo-300" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Simulador de Futuro</h3>
              <p className="text-indigo-200 text-xs">
                ¿Qué pasaría si...?
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-end mt-4">
            <div>
              <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Fecha Objetivo</label>
              <div className="flex gap-2">
                <select
                  value={simMonth}
                  onChange={(e) => setSimMonth(Number(e.target.value))}
                  className="bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:bg-black/40"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx} className="text-black">{m}</option>
                  ))}
                </select>
                <select
                  value={simYear}
                  onChange={(e) => setSimYear(Number(e.target.value))}
                  className="w-24 bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:bg-black/40 appearance-none cursor-pointer text-white"
                >
                  {Array.from({ length: 11 }, (_, i) => currentYear + i).map((y) => (
                    <option key={y} value={y} className="text-gray-900">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                  Habilitar Inversión
                </label>
                <div className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${enableInvestment ? 'bg-emerald-500' : 'bg-gray-600'}`} onClick={() => setEnableInvestment(!enableInvestment)}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${enableInvestment ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
              </div>

              {enableInvestment ? (
                <div className="flex gap-2">
                  <div className="relative w-24">
                    <input
                      type="number"
                      value={annualReturnRate}
                      onChange={(e) => setAnnualReturnRate(Number(e.target.value))}
                      className="w-full bg-emerald-900/40 border border-emerald-500/50 rounded-lg px-2 py-2 text-sm font-bold text-emerald-100 outline-none focus:bg-emerald-900/60"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-bold">% TEA</span>
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => handleSetInvestmentPreset('ui')} className="whitespace-nowrap px-2 py-1 rounded bg-orange-500/20 text-orange-200 border border-orange-500/30 text-[10px] hover:bg-orange-500/40">
                      UI ({estimatedAnnualInflation.toFixed(1)}%)
                    </button>
                    <button onClick={() => handleSetInvestmentPreset('conservative')} className="whitespace-nowrap px-2 py-1 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30 text-[10px] hover:bg-blue-500/40">
                      Bonos (5%)
                    </button>
                    <button onClick={() => handleSetInvestmentPreset('aggressive')} className="whitespace-nowrap px-2 py-1 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30 text-[10px] hover:bg-purple-500/40">
                      S&P (10%)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-[38px] flex items-center px-3 text-xs text-gray-400 bg-black/10 rounded-lg border border-white/10 italic">
                  Sin estrategia de inversión activa.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Display */}
        <div className="z-10 flex flex-col justify-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm min-w-[280px]">

          {/* Main Projection */}
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] text-indigo-300 font-bold uppercase block mb-0.5">Patrimonio Proyectado</span>
              <span className={`text-2xl font-bold tracking-tight ${enableInvestment ? 'text-emerald-300' : 'text-white'}`}>
                ${Math.round(enableInvestment ? simulationResult.investedNominal : simulationResult.nominal).toLocaleString('es-UY')}
              </span>
            </div>
            {enableInvestment && (
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block mb-0.5">Ganancia por Interés</span>
                <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                  +${Math.round(simulationResult.investmentProfit).toLocaleString('es-UY')}
                </span>
              </div>
            )}
          </div>

          {/* Real Value Comparison */}
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] text-orange-300 font-bold uppercase mb-1 flex items-center gap-1">
                Poder de Compra (Hoy) <TrendingUp size={12} />
              </span>
              {enableInvestment ? (
                // If investing, calculate REAL value of invested amount
                <span className="text-lg font-bold tracking-tight text-orange-200">
                  ${Math.round(calculateRealValue(simulationResult.investedNominal, (Math.pow(1 + (estimatedAnnualInflation / 100) / 12, simulationResult.monthsDiff) - 1) * 100)).toLocaleString('es-UY')}
                </span>
              ) : (
                <span className="text-lg font-bold tracking-tight text-orange-200">
                  ${Math.round(simulationResult.real).toLocaleString('es-UY')}
                </span>
              )}
            </div>

            {enableInvestment && estimatedAnnualInflation > 0 && annualReturnRate >= estimatedAnnualInflation && (
              <div className="text-[10px] text-green-300 flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full">
                <Target size={10} /> Inflación superada
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};