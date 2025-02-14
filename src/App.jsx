import React, { useEffect, useState, useCallback, useRef } from "react";
import "./App.css";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

const API_URL = "https://boersenspiel-backend.onrender.com"; // ✅ API URL

function App() {
  const [players, setPlayers] = useState(() => JSON.parse(localStorage.getItem("players")) || {});
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem("history")) || {});
  const [latestRates, setLatestRates] = useState({ USD: 1.1, EUR: 1.0 }); // ✅ Store latest exchange rates
  const [loading, setLoading] = useState(() => !localStorage.getItem("players"));
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const lastUpdated = useRef(null); // ✅ Track last API update time without re-rendering

  console.log("🚀 App gestartet");

  // ✅ Fetch Latest Exchange Rates from API (Avoids redundant calls)
  const fetchLatestExchangeRates = useCallback(async () => {
    const now = Date.now();
    if (lastUpdated.current && now - lastUpdated.current < 3600000) return; // Skip if updated <1h ago

    try {
      console.log("📡 Fetching latest exchange rates...");
      const response = await fetch(`${API_URL}/latest`);
      const data = await response.json();
      console.log("💱 API Latest Exchange Rates:", data);

      // ✅ Sicherstellen, dass wir den richtigen Tageskurs nehmen
      const today = new Date().toISOString().split("T")[0]; // "2025-02-14"
      const ratesForToday = data[today] || { USD: data.USD, EUR: data.EUR }; // Falls heute nicht existiert, nehme Hauptwerte

      console.log("✅ Verwendete Wechselkurse:", ratesForToday);

      setLatestRates(ratesForToday);
      lastUpdated.current = now; // ✅ Track last update time
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der neuesten Wechselkurse:", error);
    }
  }, []);

  // ✅ Fetch Players Data
  const fetchPlayers = useCallback(async () => {
    try {
      setIsUpdating(true);
      console.log("📡 Fetching players data...");
      const response = await fetch(`${API_URL}/players`);
      const data = await response.json();
      console.log("👤 API Player-Daten:", data);
      setPlayers(data.players);
      localStorage.setItem("players", JSON.stringify(data.players));
      setLoading(false);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Spieler:", error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // ✅ Fetch Historical Data
  // ✅ Fetch Historical Data
  const fetchHistory = useCallback(async () => {
    try {
      setIsUpdating(true);
      console.log("📡 Fetching history data...");
      const response = await fetch(`${API_URL}/history`);
      const data = await response.json();
      console.log("📈 API History-Daten (Debugging):", JSON.stringify(data, null, 2)); // 🛠 Debugging Log
      setHistory(data.history);
      localStorage.setItem("history", JSON.stringify(data.history));
      setLoading(false);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Historie:", error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // ✅ Fetch all data when component mounts
  useEffect(() => {
    fetchPlayers();
    fetchHistory();
    fetchLatestExchangeRates(); // ✅ Fetch latest exchange rates
  }, [fetchLatestExchangeRates]);

  // ✅ Auto-update exchange rates every hour
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLatestExchangeRates();
    }, 3600000); // Update every hour

    return () => clearInterval(interval);
  }, [fetchLatestExchangeRates]);

  // ✅ Process Player Rankings
  const rankingData = Object.keys(players)
    .map((player) => {
      let stocks = players[player];
      if (!stocks || stocks.length === 0) return null;

      let totalPerformanceForGame = 0;

      const stockData = stocks.map((stock) => {
        const historyData = history[stock.ticker] || [];
        const lastEntry = historyData.length ? historyData[historyData.length - 1] : null;
        const eoyEntry = historyData.find((entry) => entry.Date === "2024-12-30") || lastEntry;

        // ✅ Ensure `stock.currency` exists
        const currencyKey = stock.currency ? stock.currency.trim().toUpperCase() : "CHF"; // Default CHF

        // ✅ Use correct latest rate for the currency, else default to 1.0
        const exchangeRate = latestRates[currencyKey] || 1.0;
        const currentExchangeRate = exchangeRate !== 1.0 ? (1 / exchangeRate).toFixed(4) : "N/A"; // Ensure proper display

        console.log(`🔍 ${stock.ticker} | Currency: ${currencyKey} | Rate: ${currentExchangeRate}`);

        if (currentExchangeRate !== "N/A") {
          totalPerformanceForGame += parseFloat(currentExchangeRate);
        }

        return {
          ...stock,
          currency: lastEntry?.currency || "N/A",
          eoyPrice: eoyEntry?.close_price?.toFixed(2) || "N/A",
          currentPrice: lastEntry?.close_price?.toFixed(2) || "N/A",
          currentExchangeRate,
        };
      });

      return { player, stocks: stockData, totalPerformanceForGame: totalPerformanceForGame.toFixed(2) };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalPerformanceForGame - a.totalPerformanceForGame)
    .map((playerData, index) => ({ ...playerData, rank: index + 1 }));


  // ✅ Define handlePlayerClick before returning JSX
  const handlePlayerClick = (player) => {
    setSelectedPlayer((prevSelected) => (prevSelected === player ? null : player));
  };

  return (
    <div className="App">
      <h1>📈 Börsenspiel Rangliste</h1>
      <button onClick={() => { fetchPlayers(); fetchHistory(); }}>🔄 Aktualisieren</button>

      {isUpdating && <p className="update-info">🔄 Daten werden im Hintergrund aktualisiert...</p>}


      {loading ? (
        <p>Lädt...</p>
      ) : (
        <>
          <h2>🏆 Spielerübersicht</h2>
          <table className="players-table">
            <thead>
              <tr>
                <th>#</th> {/* 🏆 Neue Spalte für Rang */}
                <th>Player</th>
                <th>Aktien</th>
                <th>Direction</th>
                <th>Währung</th>
                <th>Währungskurs SOY</th>
                <th>Währungskurs Current</th>
                <th>EOY 2024</th>
                <th>Current Price</th>
                <th>Performance Aktie (%)</th>
                <th>Performance Aktie in CHF</th>
                <th>Performance für Game</th>
                <th>Total Performance für Game</th>
              </tr>
            </thead>

            <tbody>
              {rankingData.map(({ rank, player, stocks, totalPerformanceForGame }, index) => {
                const rowColor = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'transparent';
                return stocks.map((stock, stockIndex) => (
                  <tr key={`${player}-${stock.ticker}`} style={{ backgroundColor: rowColor }} onClick={() => handlePlayerClick(player)}>
                    {stockIndex === 0 && (
                      <>
                        <td rowSpan={stocks.length}><strong>{rank}</strong></td>  {/* 🏆 Rang korrekt eingefügt */}
                        <td rowSpan={stocks.length}><strong>{player}</strong></td>
                      </>
                    )}
                    <td>{stock.ticker}</td>
                    <td>{stock.direction}</td>
                    <td>{stock.currency}</td>
                    <td>{stock.startExchangeRate}</td>
                    <td>{stock.currentExchangeRate}</td>
                    <td>{stock.eoyPrice}</td>
                    <td>{stock.currentPrice}</td>
                    <td>{stock.performanceStock}%</td>
                    <td>{stock.performanceInCHF}%</td>
                    <td>{stock.performanceForGame}%</td>
                    {stockIndex === 0 && (
                      <td rowSpan={stocks.length}><strong>{totalPerformanceForGame}%</strong></td>
                    )}
                  </tr>
                ));
              })}
            </tbody>

          </table>

          {selectedPlayer && (
            <div>
              <h2>📊 Kursverlauf für {selectedPlayer}</h2>
              <div className="chart-row">
                {rankingData.find(p => p.player === selectedPlayer).stocks.map(stock => (
                  <div
                    className={`chart-container ${stock.direction === 'long' ? 'chart-long' : 'chart-short'}`}
                    key={stock.ticker}
                  >
                    <h3 className="chart-direction">{stock.direction.toUpperCase()}</h3>
                    <Line data={{
                      labels: stock.priceHistory.map(e => e.Date),
                      datasets: [{
                        label: stock.ticker,
                        data: stock.priceHistory.map(e => e.close_price),
                        borderColor: stock.direction === 'long' ? 'green' : 'red',
                        fill: false
                      }]
                    }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
