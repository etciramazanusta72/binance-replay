import express from "express";
import axios from "axios";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(__dirname)); // index.html'i servis eder

// Binance API endpointi
app.get("/api/data", async (req, res) => {
  try {
    const { data } = await axios.get("https://api.binance.com/api/v3/klines", {
      params: { symbol: "BTCUSDT", interval: "1h", limit: 50 },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Veri alınamadı" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`));
