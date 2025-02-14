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
    Promise.all([fetchPlayers(), fetchPrices(), fetchExchangeRates()]).then(() => setLoading(false));
  }, [fetchPlayers, fetchPrices, fetchExchangeRates]);

  // 📌 Automatisches Update alle 20 Minuten
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices();
      fetchExchangeRates();
    }, 1200000); // 20 Minuten (1200 * 1000 ms)
    return () => clearInterval(interval);
  }, [fetchPrices, fetchExchangeRates]);

  // 📌 Spieler & Aktien berechnen
  const rankingData = Object.keys(players).map((player, index) => {
    let stocks = players[player].map((stock) => {
      const stockData = prices[stock.ticker] || {};
      const history = stockData.history || {};
      const currentPriceObj = stockData.current_price || {};
      const latestDate = Object.keys(currentPriceObj).pop();
      let latestPrice = currentPriceObj[latestDate] || null;

      // Falls `current_price` nicht existiert, letzten bekannten Wert aus `history` nehmen
      if (!latestPrice) {
        const historyDates = Object.keys(history);
        latestPrice = historyDates.length ? history[historyDates.pop()] : "N/A";
      }

      // Währung und Wechselkurse abrufen
      const currencyKey = "USD"; // Standard USD
      const startExchangeRate = exchangeRates?.SOY_EXCHANGE_RATES?.[currencyKey] || 1.0;
      const currentExchangeRate = exchangeRates?.[currencyKey] || 1.0;

      // Performance Berechnung
      const startPrice = history["2024-12-30"] || null;
      const performance = startPrice
        ? (((latestPrice - startPrice) / startPrice) * 100).toFixed(2) + "%"
        : "N/A";

      return {
        ...stock,
        startExchangeRate,
        currentExchangeRate,
        currentPrice: latestPrice ? latestPrice.toFixed(2) : "N/A",
        startPrice: startPrice ? startPrice.toFixed(2) : "N/A",
        performance,
      };
    });

    return { player, stocks, rank: index + 1 };
  });

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
                <th>Währungskurs SOY</th>
                <th>Währungskurs Aktuell</th>
                <th>Startpreis</th>
                <th>Aktueller Preis</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {rankingData.map(({ rank, player, stocks }) =>
                stocks.map((stock, stockIndex) => (
                  <tr key={`${player}-${stock.ticker}`} onClick={() => setSelectedPlayer(player)}>
                    {stockIndex === 0 && (
                      <>
                        <td rowSpan={stocks.length}>{rank}</td>
                        <td rowSpan={stocks.length}>{player}</td>
                      </>
                    )}
                    <td>{stock.ticker}</td>
                    <td>{stock.direction}</td>
                    <td>{stock.startExchangeRate}</td>
                    <td>{stock.currentExchangeRate}</td>
                    <td>{stock.startPrice}</td>
                    <td>{stock.currentPrice}</td>
                    <td>{stock.performance}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {selectedPlayer && (
            <div>
              <h2>📊 Kursverlauf für {selectedPlayer}</h2>
              <div className="chart-row">
                {rankingData
                  .find((p) => p.player === selectedPlayer)
                  .stocks.map((stock) => {
                    const history = prices[stock.ticker]?.history || {};
                    return (
                      <div key={stock.ticker} className="chart-container">
                        <h3>{stock.direction.toUpperCase()} - {stock.ticker}</h3>
                        <Line
                          data={{
                            labels: Object.keys(history),
                            datasets: [
                              {
                                label: stock.ticker,
                                data: Object.values(history),
                                borderColor: stock.direction === "long" ? "green" : "red",
                                fill: false,
                              },
                            ],
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
