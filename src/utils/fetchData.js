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

            // ✅ Ensure historical data is sorted chronologically
            const sortedHistory = stockData.history ? Object.fromEntries(
                Object.entries(stockData.history)
                    .sort((a, b) => new Date(a[0]) - new Date(b[0])) // Sort by ascending date
            ) : {};

            acc[frontendTicker] = {
                current_price: stockData.current_price,  // Keep latest price
                history: sortedHistory // Store sorted history
            };

            return acc;
        }, {});

        setPrices(normalizedPrices);
        console.log("📈 Aktienpreise (Normalized & Sorted History):", normalizedPrices);
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