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
  const [view, setView] = useState("table"); // "table" or "chart"

  console.log("🚀 App gestartet");

  const fetchPlayers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/players`);
      const data = await response.json();
      setPlayers(data.players);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Spieler:", error);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/prices`);
      const data = await response.json();
      setPrices(data.prices);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Aktienpreise:", error);
    }
  }, []);

  const fetchExchangeRates = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/exchange_rates`);
      const data = await response.json();
      setExchangeRates(data.exchange_rates);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Wechselkurse:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPlayers(), fetchPrices(), fetchExchangeRates()]).then(() => setLoading(false));
  }, [fetchPlayers, fetchPrices, fetchExchangeRates]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices();
      fetchExchangeRates();
    }, 1200000);
    return () => clearInterval(interval);
  }, [fetchPrices, fetchExchangeRates]);

  let rankingData = Object.keys(players).map((player) => {
    let stocks = players[player]
      .map((stock) => {
        const stockData = prices[stock.ticker] || {};
        const history = stockData.history || {};
        const currentPriceObj = stockData.current_price || {};

        const latestDate = currentPriceObj ? Object.keys(currentPriceObj).pop() : null;
        const latestPrice = latestDate ? currentPriceObj[latestDate] : null;
        const startPrice = Object.values(history)[0];

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
          performanceForGame = stock.direction === "long" ? performanceInCHF : -performanceInCHF;
        }

        return {
          ...stock,
          startExchangeRate: reciprocalSoy,
          currentExchangeRate: reciprocalCurrent,
          startPrice,
          currentPrice: latestPrice,
          performance,
          performanceInCHF,
          performanceForGame,
        };
      })
      .sort((a, b) => (a.direction === "long" ? -1 : 1));

    const totalPerformanceForGame = (stocks[0].performanceForGame + stocks[1].performanceForGame) / 2;

    return { player, stocks, totalPerformanceForGame };
  });

  rankingData.sort((a, b) => b.totalPerformanceForGame - a.totalPerformanceForGame);

  return (
    <div className="App">
      <h1>📈 Börsenspiel Rangliste</h1>
      <button onClick={() => setView("table")}>🔄 Tabelle</button>
      <button onClick={() => setView("chart")}>📊 Charts</button>

      {loading ? (
        <p>Lädt...</p>
      ) : view === "table" ? (
        <div>
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
              {rankingData.map(({ player, stocks, totalPerformanceForGame }, index) => (
                <tr key={player}>
                  <td>{index + 1}</td>
                  <td>{player}</td>
                  <td>{stocks[0].ticker}</td>
                  <td>{stocks[0].direction}</td>
                  <td>{stocks[0].startPrice}</td>
                  <td>{stocks[0].currentPrice}</td>
                  <td>{stocks[0].performance}%</td>
                  <td>{stocks[0].currency}</td>
                  <td>{stocks[0].startExchangeRate}</td>
                  <td>{stocks[0].currentExchangeRate}</td>
                  <td>{stocks[0].performanceInCHF}%</td>
                  <td>{stocks[0].performanceForGame}%</td>
                  <td>{totalPerformanceForGame.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <h2>📊 Charts</h2>
          {rankingData.map(({ player, stocks }) => (
            <div key={player}>
              <h3>{player}</h3>
              {stocks.map((stock) => (
                <Line
                  key={stock.ticker}
                  data={{
                    labels: Object.keys(prices[stock.ticker]?.history || {}),
                    datasets: [{
                      label: stock.ticker,
                      data: Object.values(prices[stock.ticker]?.history || {}),
                      borderColor: stock.direction === "long" ? "green" : "red",
                    }],
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
