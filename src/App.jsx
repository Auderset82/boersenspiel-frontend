import React, { useEffect, useState, useCallback } from "react";
import "./App.css";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

const API_URL = "https://boersenspiel-backend.onrender.com";

function App() {
  const [players, setPlayers] = useState({});
  const [prices, setPrices] = useState({});
  const [exchangeRates, setExchangeRates] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log("🚀 App gestartet");

  // 📌 API Fetch-Funktionen
  const fetchPlayers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/players`);
      const data = await response.json();
      setPlayers(data.players);
      console.log("👤 Spieler-Daten:", data.players);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Spieler:", error);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/prices`);
      const data = await response.json();
      setPrices(data.prices);
      console.log("📈 Aktienpreise:", data.prices);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Aktienpreise:", error);
    }
  }, []);

  const fetchExchangeRates = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/exchange_rates`);
      const data = await response.json();
      setExchangeRates(data.exchange_rates);
      console.log("💱 Wechselkurse:", data.exchange_rates);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Wechselkurse:", error);
    }
  }, []);

  // 📌 Daten beim Start laden
  useEffect(() => {
    Promise.all([fetchPlayers(), fetchPrices(), fetchExchangeRates()]).then(() =>
      setLoading(false)
    );
  }, [fetchPlayers, fetchPrices, fetchExchangeRates]);

  // 📌 Automatisches Update alle 20 Minuten
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices();
      fetchExchangeRates();
    }, 1200000);
    return () => clearInterval(interval);
  }, [fetchPrices, fetchExchangeRates]);

  // 📌 Spieler & Aktien berechnen
  let rankingData = Object.keys(players).map((player) => {
    let stocks = players[player]
      .map((stock) => {
        const stockData = prices[stock.ticker] || {};
        const history = stockData.history || {};
        const currentPriceObj = stockData.current_price || {};

        const latestDate = currentPriceObj ? Object.keys(currentPriceObj).pop() : null;
        const latestPrice = latestDate ? currentPriceObj[latestDate] : null;

        const startPrice = Object.values(history)[0];

        const validStartPrice = typeof startPrice === "number" ? startPrice.toFixed(2) : "N/A";
        const validLatestPrice = typeof latestPrice === "number" ? latestPrice.toFixed(2) : "N/A";

        const currencyKey = stock.currency || "USD";
        const soyExchangeRate = exchangeRates?.SOY_EXCHANGE_RATES?.[currencyKey] || 1.0;
        const currentExchangeRate = exchangeRates?.[currencyKey] || 1.0;
        const reciprocalSoy = soyExchangeRate !== 0 ? (1 / soyExchangeRate).toFixed(4) : "N/A";
        const reciprocalCurrent = currentExchangeRate !== 0 ? (1 / currentExchangeRate).toFixed(4) : "N/A";

        let performance = "N/A";
        let performanceInCHF = "N/A";
        let performanceForGame = "N/A";

        if (typeof startPrice === "number" && typeof latestPrice === "number") {
          performance = (((latestPrice - startPrice) / startPrice) * 100).toFixed(2);
          const currencyGainLoss = (reciprocalCurrent / reciprocalSoy) - 1;

          performanceInCHF = ((1 + parseFloat(performance) / 100) * (1 + currencyGainLoss) - 1) * 100;
          performanceInCHF = performanceInCHF.toFixed(2);

          performanceForGame = stock.direction === "long"
            ? performanceInCHF
            : (-performanceInCHF).toFixed(2);
        }

        return {
          ...stock,
          currency: currencyKey,
          startExchangeRate: reciprocalSoy,
          currentExchangeRate: reciprocalCurrent,
          startPrice: validStartPrice,
          currentPrice: validLatestPrice,
          performance: `${performance}%`,
          performanceInCHF: `${performanceInCHF}%`,
          performanceForGame: `${performanceForGame}%`,
        };
      })
      .sort((a, b) => (a.direction === "long" ? -1 : 1));

    const totalPerformanceForGame = (parseFloat(stocks[0].performanceForGame) + parseFloat(stocks[1].performanceForGame)) / 2;

    return { player, stocks, totalPerformanceForGame, rank: 0 };
  });

  // **Sortiere nach Gesamtperformance absteigend**
  rankingData.sort((a, b) => b.totalPerformanceForGame - a.totalPerformanceForGame);

  // **Neuen Rang vergeben (1,2,3,...)**
  rankingData = rankingData.map((playerData, index) => ({
    ...playerData,
    rank: index + 1,
  }));

  return (
    <div className="App">
      <h1>📈 Börsenspiel Rangliste</h1>
      <button onClick={() => Promise.all([fetchPlayers(), fetchPrices(), fetchExchangeRates()])}>
        🔄 Aktualisieren
      </button>

      {loading ? (
        <p>Lädt...</p>
      ) : (
        <>
          <h2>🏆 Spielerübersicht</h2>
          <table className="players-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Spieler</th>
                <th>Aktien</th>
                <th>Richtung</th>
                <th>Startpreis</th>
                <th>Aktueller Preis</th>
                <th>Performance</th>
                <th>Währung</th>
                <th>Währungskurs SOY</th>
                <th>Währungskurs Aktuell</th>
                <th>Performance in CHF</th>
                <th>Performance für Game</th>
                <th>Gesamtperformance für Game</th>
              </tr>
            </thead>
            <tbody>
              {rankingData.map(({ rank, player, stocks, totalPerformanceForGame }) =>
                stocks.map((stock, stockIndex) => {
                  const rowColor =
                    rank === 1 ? "#FFD700" : // Gold
                      rank === 2 ? "#C0C0C0" : // Silber
                        rank === 3 ? "#CD7F32" : // Bronze
                          "transparent";

                  return (
                    <tr key={`${player}-${stock.ticker}`} onClick={() => setSelectedPlayer(player)} style={{ backgroundColor: rowColor }}>
                      {stockIndex === 0 && (
                        <>
                          <td rowSpan={stocks.length}>{rank}</td>
                          <td rowSpan={stocks.length}>{player}</td>
                        </>
                      )}
                      <td>{stock.ticker}</td>
                      <td>{stock.direction}</td>
                      <td>{stock.startPrice}</td>
                      <td>{stock.currentPrice}</td>
                      <td>{stock.performance}</td>
                      <td>{stock.currency}</td>
                      <td>{stock.startExchangeRate}</td>
                      <td>{stock.currentExchangeRate}</td>
                      <td>{stock.performanceInCHF}</td>
                      <td>{stock.performanceForGame}</td>
                      {stockIndex === 0 && <td rowSpan={stocks.length}>{totalPerformanceForGame.toFixed(2)}%</td>}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default App;
