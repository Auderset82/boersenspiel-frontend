// 📌 src/utils/fetchData.js
export const fetchPlayers = async (API_URL, setPlayers) => {
    try {
        const response = await fetch(`${API_URL}/players`);
        const data = await response.json();
        setPlayers(data.players);
        console.log("👤 Spieler-Daten:", data.players);
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Spieler:", error);
    }
};

export const fetchPrices = async (API_URL, setPrices) => {
    try {
        const response = await fetch(`${API_URL}/prices`);
        const data = await response.json();

        // ✅ Normalize tickers for frontend
        const normalizedPrices = Object.keys(data.prices).reduce((acc, backendTicker) => {
            let frontendTicker = backendTicker.replace(".XETRA", ".DE")
                .replace(".XSWX", ".SW")
                .replace(".XBRU", ".BR");

            const stockData = data.prices[backendTicker];

            if (!stockData) {
                console.warn(`⚠️ Kein Datenobjekt für ${backendTicker}`);
                return acc;
            }

            // ✅ Ensure historical data is sorted chronologically
            const sortedHistory = stockData.history ? Object.fromEntries(
                Object.entries(stockData.history)
                    .sort((a, b) => new Date(a[0]) - new Date(b[0])) // Sort by ascending date
            ) : {};

            // ✅ Use `current_price` if available, otherwise fallback to the most recent historical price
            let latestPrice = stockData.current_price;

            if (!latestPrice || latestPrice === "N/A") {
                const historyEntries = Object.entries(sortedHistory);
                if (historyEntries.length > 0) {
                    latestPrice = parseFloat(historyEntries[historyEntries.length - 1][1]); // Get latest historical price
                }
            }

            // ✅ Log prices for debugging
            console.log(`🔍 Ticker: ${frontendTicker} | Latest Price: ${latestPrice} | History:`, sortedHistory);

            acc[frontendTicker] = {
                current_price: latestPrice !== undefined ? latestPrice : "N/A",
                history: sortedHistory,
            };

            return acc;
        }, {});

        setPrices(normalizedPrices);
        console.log("📈 Aktienpreise (Normalized & Fixed Latest Price):", normalizedPrices);
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Aktienpreise:", error);
    }
};


export const fetchExchangeRates = async (API_URL, setExchangeRates) => {
    try {
        const response = await fetch(`${API_URL}/exchange_rates`);
        const data = await response.json();
        setExchangeRates(data.exchange_rates);
        console.log("💱 Wechselkurse:", data.exchange_rates);
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Wechselkurse:", error);
    }
};