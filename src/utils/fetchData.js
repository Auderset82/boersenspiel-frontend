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
        setPrices(data.prices);
        console.log("📈 Aktienpreise:", data.prices);
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