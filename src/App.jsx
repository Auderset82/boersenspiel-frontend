import React, { useEffect, useState, useCallback } from "react";
import "./App.css";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { fetchPlayers, fetchPrices, fetchExchangeRates } from "./utils/fetchData";


const API_URL = "https://boersenspiel-backend.onrender.com";





function App() {
  const [players, setPlayers] = useState({});
  const [prices, setPrices] = useState({});
  const [exchangeRates, setExchangeRates] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("2025"); // Default to 2025
  const [historicalData, setHistoricalData] = useState([]);
  const [analysisData, setAnalysisData] = useState([]); // Speichert die Analysen
  const [performanceMatrix, setPerformanceMatrix] = useState({});
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    // ✅ Google Analytics Tracking-Code dynamisch einfügen
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-XV2BP9K51W";
    document.head.appendChild(script);

    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      window.gtag = gtag;

      gtag('js', new Date());
      gtag('config', 'G-XV2BP9K51W');
    };
  }, []);

  const getColor = (value) => {
    if (value === "N/A") return "#F8F8F8"; // Helles Grau für "N/A"
    const num = parseFloat(value);

    // ✅ **Grüne Farbtöne für positive Werte**
    if (num > 50) return "rgb(0, 100, 0)";   // Dunkelgrün
    if (num > 30) return "rgb(34, 139, 34)"; // Mittleres Dunkelgrün
    if (num > 20) return "rgb(60, 179, 60)"; // Mittleres Grün
    if (num > 10) return "rgb(144, 238, 144)"; // Helles Grün
    if (num > 0) return "rgb(173, 255, 173)"; // Sehr helles Grün

    // ❌ **Rote Farbtöne für negative Werte**
    if (num < -50) return "rgb(139, 0, 0)";   // Sehr dunkles Rot
    if (num < -30) return "rgb(178, 34, 34)"; // Dunkelrot
    if (num < -20) return "rgb(220, 20, 60)"; // Mittleres Rot
    if (num < -10) return "rgb(240, 128, 128)"; // Helles Rot
    if (num < 0) return "rgb(255, 182, 193)";  // Sehr helles Rot

    return "#FFFFFF"; // Falls kein passender Wert gefunden wird (Fallback auf Weiß)
  };

  // 🎨 Dynamische Schriftfarbe basierend auf Hintergrund
  const getTextColor = (value) => {
    const num = parseFloat(value);

    // **Helle Farben (sehr helles Grün oder Rot) → Schwarzer Text**
    if (num > 20 || num < -20) return "white";
    return "black"; // Standardmäßig dunkler Text auf helleren Farben
  };





  console.log("🚀 App gestartet");

  // 📌 Fetch historical results
  const fetchHistoricalResults = async (year) => {
    setSelectedYear(year);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/results/${year}`);
      const data = await response.json();
      setHistoricalData(data.results);
      console.log(`📜 Historische Daten für ${year}:`, data.results);
    } catch (error) {
      console.error(`❌ Fehler beim Abrufen der historischen Daten für ${year}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // 📌 Performance-Matrix abrufen
  const fetchPerformanceMatrix = async () => {
    try {
      const response = await fetch(`${API_URL}/performance-matrix`);
      const data = await response.json();
      setPerformanceMatrix(JSON.parse(data)); // JSON-String in Object umwandeln
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Performance-Matrix:", error);
    }
  };

  const fetchAnalysisData = async () => {
    setShowAnalysis(true);  // Schaltet die Ansicht um
    setLoading(true);

    const years = ["2024", "2023", "2022", "2021", "2020", "2019"];
    const analysisResults = [];

    try {
      for (const year of years) {
        const response = await fetch(`${API_URL}/results/${year}`);
        if (!response.ok) {
          throw new Error(`Fehler beim Laden der Daten für ${year}`);
        }
        const data = await response.json();
        analysisResults.push({ year, results: data.results });
      }
      setAnalysisData(analysisResults);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Analyse-Daten:", error);
      setAnalysisData([]);
    } finally {
      setLoading(false);
    }
  };



  // 📌 Laden der aktuellen Daten für das Jahr 2025 beim Start oder wenn das Jahr gewechselt wird
  useEffect(() => {
    if (selectedYear === "2025") {
      setLoading(true);
      Promise.all([
        fetchPlayers(API_URL, setPlayers),
        fetchPrices(API_URL, setPrices),
        fetchExchangeRates(API_URL, setExchangeRates),
      ]).then(() => setLoading(false));
    }
  }, [selectedYear]);

  // 📌 Load current year data on start
  useEffect(() => {
    if (selectedYear === "2025") {
      Promise.all([fetchPlayers(), fetchPrices(), fetchExchangeRates()]).then(() => setLoading(false));
    }
  }, [fetchPlayers, fetchPrices, fetchExchangeRates, selectedYear]);

  // 📌 Automatisches Update alle 20 Minuten
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices();
      fetchExchangeRates();
    }, 1200000);
    return () => clearInterval(interval);
  }, [fetchPrices, fetchExchangeRates]);

  useEffect(() => {
    console.log(`📊 Zustand von historicalData für ${selectedYear}:`, historicalData);
  }, [historicalData]);


  // 📌 Ranking logic for past years (2024, 2023)
  let historicalRanking = [];
  if (selectedYear !== "2025") {
    const groupedByPlayer = {};

    if (Array.isArray(historicalData) && historicalData.length > 0) {
      historicalData.forEach((stock) => {
        if (!groupedByPlayer[stock.owner]) {
          groupedByPlayer[stock.owner] = [];
        }
        groupedByPlayer[stock.owner].push(stock);
      });
    } else {
      console.warn("⚠️ `historicalData` ist leer oder kein Array:", historicalData);
    }

    historicalRanking = Object.keys(groupedByPlayer).map((player) => {
      const stocks = groupedByPlayer[player];

      let performances = stocks.map(stock => ({
        ...stock,
        performanceForGame: stock.direction === "long"
          ? stock.performance
          : (stock.performance * -1).toFixed(2),
      }));

      const totalPerformanceForGame = (
        (parseFloat(performances[0].performanceForGame) +
          parseFloat(performances[1].performanceForGame)) /
        2
      ).toFixed(2);

      return {
        player,
        stocks: performances,
        totalPerformanceForGame,
        rank: 0,
      };
    });

    // **Sortiere nach Gesamtperformance absteigend**
    historicalRanking.sort((a, b) => b.totalPerformanceForGame - a.totalPerformanceForGame);

    // **Neuen Rang vergeben (1,2,3,...)**
    historicalRanking = historicalRanking.map((playerData, index) => ({
      ...playerData,
      rank: index + 1,
    }));
  }

  // 📌 Spieler & Aktien berechnen
  let rankingData = Object.keys(players).map((player) => {
    let stocks = players[player].map((stock) => {
      const stockData = prices[stock.ticker] || {};
      const history = stockData.history || {};

      // ✅ Sort history (oldest first)
      const sortedHistory = Object.entries(history).sort((a, b) => new Date(a[0]) - new Date(b[0]));

      // ✅ Get startPrice (earliest available price)
      const startPrice = sortedHistory.length > 0 ? parseFloat(sortedHistory[0][1]) : null;

      // ✅ Use `current_price`, otherwise take the most recent historical price
      let latestPrice = stockData.current_price && !isNaN(stockData.current_price) ? stockData.current_price : null;

      if (!latestPrice && sortedHistory.length > 0) {
        latestPrice = parseFloat(sortedHistory[sortedHistory.length - 1][1]); // Get latest historical price
      }

      // ✅ Handle cases where prices are missing
      const validStartPrice = startPrice !== null ? startPrice.toFixed(2) : "N/A";
      const validLatestPrice = latestPrice !== null ? latestPrice.toFixed(2) : "N/A";

      const currencyKey = stock.currency || "USD";
      const soyExchangeRate = exchangeRates?.SOY_EXCHANGE_RATES?.[currencyKey] || 1.0;
      const currentExchangeRate = exchangeRates?.[currencyKey] || 1.0;
      const reciprocalSoy = soyExchangeRate !== 0 ? (1 / soyExchangeRate).toFixed(4) : "N/A";
      const reciprocalCurrent = currentExchangeRate !== 0 ? (1 / currentExchangeRate).toFixed(4) : "N/A";

      let performance = "N/A";
      let performanceInCHF = "N/A";
      let performanceForGame = "N/A";

      if (startPrice !== null && latestPrice !== null) {
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
    });

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
      <h1>📈 Manager Investment Game</h1>
      <div className="year-buttons">
        <button onClick={() => { setShowAnalysis(false); setSelectedYear("2025"); }}>Aktuelles Jahr</button>
        <button onClick={() => { setShowAnalysis(true); fetchPerformanceMatrix(); }}>
          Analysen der vergangenen Jahre
        </button>

        {/* Diese Buttons bleiben IMMER sichtbar */}
        <button onClick={() => { setShowAnalysis(false); fetchHistoricalResults("2024"); }}>2024</button>
        <button onClick={() => { setShowAnalysis(false); fetchHistoricalResults("2023"); }}>2023</button>
        <button onClick={() => { setShowAnalysis(false); fetchHistoricalResults("2022"); }}>2022</button>
        <button onClick={() => { setShowAnalysis(false); fetchHistoricalResults("2021"); }}>2021</button>
        <button onClick={() => { setShowAnalysis(false); fetchHistoricalResults("2020"); }}>2020</button>
        <button onClick={() => { setShowAnalysis(false); fetchHistoricalResults("2019"); }}>2019</button>
      </div>



      {showAnalysis ? (
        // 📊 Gesamtperformance-Matrix anzeigen
        <div className="analysis-section">
          <h2>📊 Gesamtperformance-Matrix</h2>
          <table className="analysis-table">
            <thead>
              <tr>
                <th>#</th> {/* Rang-Nummer */}
                <th>Spieler</th>
                <th>2019</th>
                <th>2020</th>
                <th>2021</th>
                <th>2022</th>
                <th>2023</th>
                <th>2024</th>
                <th>Durchschnittliche Performance</th> {/* Durchschnitt neu am Ende */}
              </tr>
            </thead>


            <tbody>
              {performanceMatrix &&
                Object.keys(performanceMatrix)
                  .map(player => {
                    const years = ["2019", "2020", "2021", "2022", "2023", "2024"];
                    const performances = years.map(year => {
                      const value = performanceMatrix[player]?.[year];
                      return value !== undefined && value !== null && value !== "N/A" && value !== ""
                        ? parseFloat(value)
                        : null; // Setze `NaN`, damit er nicht für Berechnungen verwendet wird
                    });

                    const validPerformances = performances.filter(val => val !== null && val !== 0);
                    const avgPerformance = validPerformances.length > 0
                      ? (validPerformances.reduce((acc, val) => acc + val, 0) / validPerformances.length).toFixed(2)
                      : "N/A"; // Falls der Spieler nie aktiv war, "N/A" setzen

                    return { player, performances, avgPerformance: parseFloat(avgPerformance) };
                  })
                  .sort((a, b) => b.avgPerformance - a.avgPerformance) // **Sortierung nach Durchschnittswert**
                  .map(({ player, performances, avgPerformance }, index) => (
                    <tr key={player}>
                      {/* 🔢 Rang */}
                      <td
                        style={{
                          fontWeight: "bold",
                          textAlign: "center",
                          padding: "8px",
                          backgroundColor: "#f0f0f0", // Heller Hintergrund für Rang
                          border: "1px solid #ddd",
                        }}
                      >
                        {index + 1} {/* Rang beginnt bei 1 */}
                      </td>

                      {/* Spielername */}
                      <td style={{ fontWeight: "bold", textAlign: "left", padding: "8px" }}>
                        {player}
                      </td>

                      {/* Jährliche Performance */}
                      {performances.map((value, index) => {
                        const year = ["2019", "2020", "2021", "2022", "2023", "2024"][index]; // Jahr zuweisen
                        const hasValue = value !== null && !isNaN(value); // Überprüfen, ob ein echter Wert existiert

                        return (
                          <td
                            key={year}
                            style={{
                              backgroundColor: hasValue ? getColor(value) : "white",
                              color: hasValue ? getTextColor(value) : "black",
                              fontWeight: "bold",
                              textAlign: "center",
                              padding: "8px",
                              border: "1px solid #ddd",
                              minWidth: "70px",
                            }}
                          >
                            {hasValue ? `${value}%` : "—"} {/* Statt `0%` eine Leerstelle */}
                          </td>

                        );
                      })}


                      {/* Durchschnittliche Performance (Schmalere Spalte) */}
                      <td
                        style={{
                          backgroundColor: getColor(avgPerformance),
                          color: getTextColor(avgPerformance),
                          fontWeight: "bold",
                          textAlign: "center",
                          padding: "8px",
                          border: "1px solid #000",
                          minWidth: "80px", // **Schmaler als vorher**
                          maxWidth: "80px", // **Maximale Breite gesetzt**
                        }}
                      >
                        {avgPerformance}%
                      </td>
                    </tr>
                  ))}
            </tbody>




          </table>
        </div>
      ) : (
        // 🏆 Normale Ansicht (Spielerübersicht oder vergangene Jahre)
        <>
          <h2>🏆 {isNaN(selectedYear) ? "Spielerübersicht" : `Ergebnisse von ${selectedYear}`}</h2>

          {selectedYear === "2025" ? (
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
          ) : (
            <table className="historical-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Spieler</th>
                  <th>Aktien</th>
                  <th>Richtung</th>
                  <th>Performance</th>
                  <th>Performance für Game</th>
                  <th>Gesamtperformance für Game</th>
                </tr>
              </thead>
              <tbody>
                {historicalRanking.map(({ rank, player, stocks, totalPerformanceForGame }) =>
                  stocks.map((stock, stockIndex) => {
                    let rowClass = "";
                    if (rank === 1) rowClass = "gold-row";
                    if (rank === 2) rowClass = "silver-row";
                    if (rank === 3) rowClass = "bronze-row";

                    return (
                      <tr key={`${player}-${stock.company}`} className={rowClass}>
                        {stockIndex === 0 && (
                          <>
                            <td rowSpan={stocks.length}>{rank}</td>
                            <td rowSpan={stocks.length}>{player}</td>
                          </>
                        )}
                        <td>{stock.company}</td>
                        <td>{stock.direction}</td>
                        <td>{stock.performance}%</td>
                        <td>{stock.performanceForGame}%</td>
                        {stockIndex === 0 && <td rowSpan={stocks.length}>{totalPerformanceForGame}%</td>}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );

}

export default App;
