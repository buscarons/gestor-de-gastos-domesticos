# Gestor de Finanzas Domésticas (Uruguay) 🇺🇾

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PWA](https://img.shields.io/badge/PWA-Supported-purple)

Una aplicación web progresiva (PWA), moderna y robusta para la gestión integral de la economía del hogar, diseñada específicamente para el contexto uruguayo. Construida con **React**, **TypeScript**, **Tailwind CSS** e integrada con **Google Gemini AI**.

## 📱 Instalación en Móvil/Tablet (PWA)

Esta aplicación es una **Progressive Web App**. Puedes instalarla en tu dispositivo sin pasar por una tienda de aplicaciones:

1.  Abre la aplicación en Chrome (Android) o Safari (iOS).
2.  Abre el menú de opciones del navegador.
3.  Selecciona **"Instalar aplicación"** o **"Agregar a inicio"**.
4.  La app funcionará como una aplicación nativa, a pantalla completa y con ícono propio.

## 🌟 Funcionalidades Principales

### 1. Dashboard Financiero Inteligente
*   **Análisis en Tiempo Real**: Visualiza flujo de caja, distribución de gastos y evolución patrimonial.
*   **Proyecciones Futuras**: Algoritmos que calculan tu proyección de ahorro a fin de año basándose en tu comportamiento reciente.
*   **Ajuste por Inflación**: Visualiza la pérdida de poder adquisitivo comparando valores Nominales vs. Reales.
*   **Métricas Clave (KPIs)**: Promedio de gastos, capacidad de ahorro y totales anuales.

### 2. Gestión de Gastos (Libro Diario)
*   **Formato Planilla**: Interfaz familiar tipo Excel para carga rápida de datos.
*   **Categorización Automática**: Colores semánticos para Servicios, Impuestos, Salud y Variables.
*   **Desglose de Tickets**: Haz doble clic en categorías variables (ej. Supermercado) para ingresar tickets individuales o seleccionar productos del catálogo.
*   **Auto-Guardado**: Sistema de persistencia automática que guarda tus cambios mientras escribes en `localStorage`.

### 3. Gestión de Ingresos y Patrimonio
*   **Calibración Dinámica**: Define tu saldo inicial en cualquier mes del año.
*   **Múltiples Fuentes**: Registra Sueldos, Aguinaldos e Ingresos Extra.
*   **Continuidad Anual**: Copia la estructura de gastos/ingresos del año anterior con un solo clic.

### 4. Catálogo de Productos
*   **Base de Datos Personal**: Crea tus propios productos frecuentes (ej. "Coca Cola 1.5L", "Jabón Líquido").
*   **Gestión de Imágenes**: Sube fotos de tus productos para identificarlos visualmente.
*   **Etiquetado**: Organiza por tags (Carnicería, Limpieza, etc.) para filtrar rápidamente al cargar gastos.
*   **Análisis de Precios**: Detecta automáticamente si un producto ha subido por encima de la inflación real.

### 5. Importación Inteligente (IA) ✨
*   **Reconocimiento de Texto**: Pega listas informales de gastos (ej: "Luz 2500, super 1500 ayer") y la IA los convertirá automáticamente en registros estructurados.
*   **Powered by Google Gemini**: Utiliza la tecnología de Gemini para entender contexto, fechas y categorías.

---

## 📈 Ajuste por Inflación y API del INE

La aplicación cuenta con un módulo dedicado (`InflationService.ts`) para calcular el valor real del dinero descontando la inflación mensual.

### Estado Actual: Datos Simulados (Mock)
Por defecto, la aplicación utiliza una **Serie de Datos Simulada** (`MOCK_INFLATION_2025`) basada en promedios históricos recientes de Uruguay (~0.4% - 0.6% mensual). Esto permite probar la funcionalidad visual (gráficas naranjas en el Dashboard) sin depender de conectividad externa inmediata.

### 🔧 Guía para Conectar API Real (INE / Datos Abiertos)

Para obtener datos oficiales en tiempo real, debes conectar la aplicación al Catálogo de Datos Abiertos de Uruguay.

1.  **Ubicar el Archivo**: Ve a `src/services/InflationService.ts`.
2.  **Encontrar el Endpoint**:
    *   Ingresa al [Catálogo de Datos Abiertos](https://catalogodatos.gub.uy/).
    *   Busca el dataset de **"Índice de Precios al Consumo (IPC)"**.
    *   Copia la URL de la API.
3.  **Actualizar el Código**:
    *   Dentro de la función `fetchMonthlyInflation`, elimina el código de *placeholder*.
    *   Implementa un `fetch()` estándar.

---

## 🛠️ Tecnologías

*   **Frontend**: React 18
*   **Lenguaje**: TypeScript
*   **Estilos**: Tailwind CSS
*   **Gráficos**: Recharts
*   **Iconos**: Lucide React
*   **IA**: Google GenAI SDK (@google/genai)
*   **Persistencia**: LocalStorage (Sin base de datos backend requerida)

## 🚀 Instalación Local

1.  Clonar repositorio:
    ```bash
    git clone https://github.com/buscarons/gestor-de-gastos-domesticos.git
    ```
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Configurar API Key de Gemini:
    *   Crea un archivo `.env` en la raíz.
    *   Agrega: `GEMINI_API_KEY=tu_api_key_de_google_ai_studio`
4.  Ejecutar:
    ```bash
    npm run dev
    ```

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE.md](LICENSE.md) para detalles.
