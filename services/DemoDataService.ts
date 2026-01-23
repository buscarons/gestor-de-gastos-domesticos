import { ExpenseItem, IncomeItem, Product, ProductTag, YearConfig, Transaction } from '../types';

export const DemoDataService = {
    initializeDemoData: (targetYear: number) => {
        console.log("Initializing Demo Data for Guest Mode...");

        // 1. Tags
        const tags: ProductTag[] = [
            { id: 'tag-1', name: 'Comestibles', emoji: '🍞' },
            { id: 'tag-2', name: 'Limpieza', emoji: '🧹' },
            { id: 'tag-3', name: 'Bebidas', emoji: '🥤' },
            { id: 'tag-4', name: 'Carnicería', emoji: '🥩' },
            { id: 'tag-5', name: 'Verdulería', emoji: '🥦' },
            { id: 'tag-6', name: 'Lácteos', emoji: '🧀' },
        ];
        localStorage.setItem('guest_tags', JSON.stringify(tags));

        // 2. Products (Demo Catalog)
        const products: Product[] = [
            { id: 'prod-1', name: 'Leche Descremada 1L', defaultPrice: 42, tagId: 'tag-6', image: '' },
            { id: 'prod-2', name: 'Pan de Molde', defaultPrice: 120, tagId: 'tag-1', image: '' },
            { id: 'prod-3', name: 'Refresco Cola 2L', defaultPrice: 160, tagId: 'tag-3', image: '' },
            { id: 'prod-4', name: 'Detergente Lavavajillas', defaultPrice: 85, tagId: 'tag-2', image: '' },
            { id: 'prod-5', name: 'Carne Picada Magra (kg)', defaultPrice: 450, tagId: 'tag-4', image: '' },
            { id: 'prod-6', name: 'Huevos (docena)', defaultPrice: 180, tagId: 'tag-1', image: '' },
            { id: 'prod-7', name: 'Arroz 1kg', defaultPrice: 55, tagId: 'tag-1', image: '' },
            { id: 'prod-8', name: 'Papel Higiénico (pack 4)', defaultPrice: 90, tagId: 'tag-2', image: '' },
        ];
        localStorage.setItem('guest_products', JSON.stringify(products));

        // 3. Year Config
        const yearConfigs: YearConfig[] = [
            { year: targetYear, startMonthIndex: 0 }, // Jan start
            { year: targetYear - 1, startMonthIndex: 0 }
        ];
        localStorage.setItem('guest_year_configs', JSON.stringify(yearConfigs));

        // 4. Base Balance (Savings)
        localStorage.setItem('guest_base_balance', '150000'); // Initial savings demo

        // 5. Income & Expenses Generation for Current and Previous Year
        const currentMonth = new Date().getMonth();

        // Helper to generate amounts
        const generateMonthlyAmounts = (base: number, variance: number = 0) => {
            return Array(12).fill(0).map((_, idx) => {
                const noise = (Math.random() * variance) - (variance / 2);
                return Math.round(base + noise);
            });
        };

        const yearsToGenerate = [targetYear, targetYear - 1];
        let allExpenses: ExpenseItem[] = [];
        let allIncome: IncomeItem[] = [];

        yearsToGenerate.forEach(year => {
            // Income
            allIncome.push(
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Ingreso Fijo',
                    name: 'Sueldo Titular',
                    amounts: Array(12).fill(40000)
                },
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Ingreso Extra',
                    name: 'Ventas Online',
                    amounts: Array(12).fill(0).map(() => Math.floor(Math.random() * 5000) + 2000)
                }
            );

            // Expenses
            allExpenses.push(
                // Servicios
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Servicios Básicos',
                    name: 'UTE (Electricidad)',
                    amounts: generateMonthlyAmounts(3500, 500)
                },
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Servicios Básicos',
                    name: 'OSE (Agua)',
                    amounts: generateMonthlyAmounts(800, 200)
                },
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Servicios Básicos',
                    name: 'Antel (Internet)',
                    amounts: Array(12).fill(1900)
                },
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Servicios Básicos',
                    name: 'Gas',
                    amounts: generateMonthlyAmounts(1200, 300)
                },
                // Impuestos
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Impuestos / Vivienda',
                    name: 'Tributos Domiciliarios',
                    amounts: Array(12).fill(0).map((_, i) => (i % 2 === 0 ? 1500 : 0))
                },
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Impuestos / Vivienda',
                    name: 'Contribución Inmobiliaria',
                    amounts: Array(12).fill(0).map((_, i) => (i === 2 || i === 6 || i === 10 ? 5000 : 0))
                },
                // Salud
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Salud',
                    name: 'Mutualista',
                    amounts: Array(12).fill(4500)
                },
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Salud',
                    name: 'Farmacia',
                    amounts: generateMonthlyAmounts(1500, 800)
                },
                // Gastos Variables
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Gastos Variables',
                    name: 'Supermercado',
                    amounts: generateMonthlyAmounts(18000, 3000),
                    transactions: {}
                },
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Gastos Variables',
                    name: 'Vestimenta',
                    amounts: generateMonthlyAmounts(3000, 2000)
                },
                {
                    id: crypto.randomUUID(),
                    year: year,
                    category: 'Gastos Variables',
                    name: 'Ocio / Salidas',
                    amounts: generateMonthlyAmounts(5000, 2000)
                }
            );
        });

        // Add specific transactions for CURRENT month and Current Year
        const superIdx = allExpenses.findIndex(e => e.name === 'Supermercado' && e.year === targetYear);
        if (superIdx >= 0) {
            const transactions: Transaction[] = [
                { id: crypto.randomUUID(), description: 'Surtido Semanal', amount: 4500, date: new Date().toISOString(), productId: 'prod-5', quantity: 2, unitPrice: 450 },
                { id: crypto.randomUUID(), description: 'Compras varias', amount: 1200, date: new Date().toISOString(), productId: 'prod-2', quantity: 1, unitPrice: 120 }
            ];
            allExpenses[superIdx].transactions = { [currentMonth]: transactions };
            allExpenses[superIdx].amounts[currentMonth] = 5700;
        }

        localStorage.setItem('guest_income', JSON.stringify(allIncome));
        localStorage.setItem('guest_expenses', JSON.stringify(allExpenses));
        localStorage.setItem('guest_setup_completed', 'true');
    },

    checkIfGuestDataExists: () => {
        return localStorage.getItem('guest_setup_completed') === 'true';
    },

    clearGuestData: () => {
        localStorage.removeItem('guest_tags');
        localStorage.removeItem('guest_products');
        localStorage.removeItem('guest_year_configs');
        localStorage.removeItem('guest_base_balance');
        localStorage.removeItem('guest_income');
        localStorage.removeItem('guest_expenses');
        localStorage.removeItem('guest_setup_completed');
    }
};
