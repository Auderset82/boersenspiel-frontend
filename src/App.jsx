import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const API_URL = "https://boersenspiel-backend.onrender.com"; // ✅ Hier ist die API-URL definiert

function App() {
  const [players, setPlayers] = useState(() => JSON.parse(localStorage.getItem("players")) || {});
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem("history")) || {});
  const [loading, setLoading] = useState(() => !localStorage.getItem("players")); // ✅ Lädt nur, wenn keine alten Daten existieren
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  console.log("🚀 App gestartet");

  const fetchPlayers = useCallback(async () => {
    try {
      setIsUpdating(true);
      console.log("📡 Fetching players data...");
      const response = await fetch(`${API_URL}/players`);
      const data = await response.json();
      console.log("👤 API Player-Daten:", data);
      setPlayers(data.players);
      localStorage.setItem("players", JSON.stringify(data.players));
      setLoading(false);  // ✅ Deaktiviere `loading`, sobald Daten geladen wurden
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Spieler:', error);
    } finally {
      setIsUpdating(false);
    }
  }, []);


  const fetchHistory = useCallback(async () => {
    try {
      setIsUpdating(true);
      console.log("📡 Fetching history data...");
      const response = await fetch(`${API_URL}/history`);
      const data = await response.json();
      console.log("📈 API History-Daten:", data);
      setHistory(data.history);
      localStorage.setItem("history", JSON.stringify(data.history));
      setLoading(false);  // ✅ Deaktiviere `loading`
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Historie:', error);
    } finally {
      setIsUpdating(false);
    }
  }, []);


  useEffect(() => {
    const savedPlayers = JSON.parse(localStorage.getItem("players"));
    const savedHistory = JSON.parse(localStorage.getItem("history"));

    if (savedPlayers) setPlayers(savedPlayers);
    if (savedHistory) setHistory(savedHistory);

    fetchPlayers();
    fetchHistory();
  }, [fetchPlayers, fetchHistory]);


  const getCurrencyRateSOY = (historyData, currency) => {
    if (currency === "CHF") return "1.0000";
    if (currency === "EUR") return (1 / 1.06435599).toFixed(4);

    let soyRate = null;
    const eoyEntry = historyData.find(entry => entry.Date === '2024-12-30');
    if (eoyEntry) {
      soyRate = eoyEntry.exchange_rate_start;
    } else {
      const firstEntry2025 = historyData.find(entry => entry.Date.startsWith('2025'));
      if (firstEntry2025) {
        soyRate = firstEntry2025.exchange_rate_start;
      }
    }

    return soyRate ? (1 / soyRate).toFixed(4) : "N/A";
  };

  const calculatePerformance = (eoyPrice, currentPrice, direction, startExchangeRate, currentExchangeRate) => {
    if (!eoyPrice || !currentPrice || !startExchangeRate || !currentExchangeRate) return { performanceStock: 0, performanceInCHF: 0, performanceForGame: 0 };

    const performanceStock = ((currentPrice - eoyPrice) / eoyPrice) * 100;
    const currencyPerformance = ((currentExchangeRate / startExchangeRate) - 1) * 100;
    const performanceInCHF = performanceStock + currencyPerformance;
    const performanceForGame = direction === 'long' ? performanceInCHF : -performanceInCHF;

    return { performanceStock, performanceInCHF, performanceForGame };
  };

  const rankingData = Object.keys(players)
    .map((player, index) => {
      let stocks = players[player];
      if (!stocks || stocks.length === 0) return null;

      stocks = stocks.sort((a, b) => (a.direction === "long" ? -1 : 1));

      let totalPerformanceForGame = 0;

      const stockData = stocks.map((stock) => {
        const historyData = history[stock.ticker] || [];
        const lastEntry = historyData.length ? historyData[historyData.length - 1] : null;
        const eoyEntry = historyData.find(entry => entry.Date === '2024-12-30') || lastEntry;

        const startExchangeRate = getCurrencyRateSOY(historyData, stock.currency);
        const currentExchangeRate = lastEntry ? (1 / lastEntry.exchange_rate_current).toFixed(4) : "N/A";

        const performance = calculatePerformance(
          eoyEntry?.close_price, lastEntry?.close_price,
          stock.direction, startExchangeRate, currentExchangeRate
        );

        totalPerformanceForGame += performance.performanceForGame * 0.5;

        return {
          ...stock,
          currency: lastEntry?.currency || 'N/A',
          eoyPrice: eoyEntry?.close_price?.toFixed(2) || 'N/A',
          currentPrice: lastEntry?.close_price?.toFixed(2) || 'N/A',
          performanceStock: performance.performanceStock.toFixed(2),
          performanceInCHF: performance.performanceInCHF.toFixed(2),
          performanceForGame: performance.performanceForGame.toFixed(2),
          startExchangeRate: startExchangeRate,
          currentExchangeRate: currentExchangeRate,
          priceHistory: historyData.filter(entry => entry.Date >= '2024-12-30') // Nur relevante Daten
        };
      });

      return { player, stocks: stockData, totalPerformanceForGame: totalPerformanceForGame.toFixed(2) };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalPerformanceForGame - a.totalPerformanceForGame)
    .map((playerData, index) => ({ ...playerData, rank: index + 1 })); // 🏆 Rang hinzufügen

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
