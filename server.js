import express from "express";
import axios from "axios";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

// index.html ve diğer dosyalar aynı dizinde
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// chart.js veya diğer statik dosyalar için:
app.use(express.static(__dirname));

app.get("/api/candles", async (req, res) => {
  try {
    const symbol = req.query.symbol || "BTCUSDT";
    const interval = req.query.interval || "4h";
    const limit = req.query.limit || 500;

    const response = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    const candles = response.data.map(k => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));

    res.json(candles);
  } catch (err) {
    console.error(err);
    res.status(500).send("Veri alınırken hata oluştu.");
  }
});

app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`));