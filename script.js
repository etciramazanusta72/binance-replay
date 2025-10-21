let chart, candleSeries, emaSeries, smaSeries, socket;
let currentSymbol = "BTCUSDT";
let currentInterval = "15m";
let liveMode = true;
let lastPriceLine = null;
let replayIndex = 0;
let replayData = [];
let replayTimer = null;
let replaySpeed = 1;
let showEMA = true;
let showSMA = true;

// EMA ve SMA hesaplama
function ema(data, period){ const k=2/(period+1); let emaArr=[], prev; for(let i=0;i<data.length;i++){ const close=data[i].close; if(i<period-1){ emaArr.push({time:data[i].time,value:null}); continue; } if(i===period-1){ prev=data.slice(0,period).reduce((s,d)=>s+d.close,0)/period; } else{ prev=close*k + prev*(1-k); } emaArr.push({time:data[i].time,value:prev}); } return emaArr; }
function sma(data, period){ return data.map((d,i)=>{ if(i<period-1) return {time:d.time,value:null}; const avg=data.slice(i-period+1,i+1).reduce((s,x)=>s+x.close,0)/period; return {time:d.time,value:avg}; }); }

// Chart init
function initChart(){
  if(chart){ chart.remove(); chart=null; }
  chart = LightweightCharts.createChart(document.getElementById("chart"),{
    layout:{background:{color:"#0e0e0e"},textColor:"#d1d4dc"},
    grid:{vertLines:{color:"#1e222d"},horzLines:{color:"#1e222d"}},
    crosshair:{mode:LightweightCharts.CrosshairMode.Normal},
    rightPriceScale:{borderColor:"#485c7b"},
    timeScale:{borderColor:"#485c7b"}
  });
  candleSeries = chart.addCandlestickSeries();
  emaSeries = chart.addLineSeries({color:"#22ab94",lineWidth:1.5});
  smaSeries = chart.addLineSeries({color:"#f39c12",lineWidth:1.5});
}

// Fetch historical
async function fetchHistoricalData(symbol, interval){
  const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`);
  const data = await res.json();
  return data.map(k=>({time:k[0]/1000,open:parseFloat(k[1]),high:parseFloat(k[2]),low:parseFloat(k[3]),close:parseFloat(k[4])}));
}

// Replay
async function startReplay(interval){
  cleanup(); liveMode=false; document.getElementById("modeLabel").innerText="Replay";
  initChart();
  replayData = await fetchHistoricalData(currentSymbol, interval);
  const emaData = ema(replayData,20);
  const smaData = sma(replayData,50);
  candleSeries.setData([]); emaSeries.setData([]); smaSeries.setData([]);
  replayIndex=0;
  const step=200/replaySpeed;
  replayTimer=setInterval(()=>{
    if(replayIndex<replayData.length){
      const c=replayData[replayIndex];
      candleSeries.update(c);
      if(showEMA) emaSeries.update(emaData[replayIndex]);
      if(showSMA) smaSeries.update(smaData[replayIndex]);
      updateLastPrice(c.close);
      updateInfoBar(c.close,c.open,c.time);
      replayIndex++;
    } else clearInterval(replayTimer);
  },step);
}

// Live
async function startLive(interval="15m"){
  cleanup(); liveMode=true; document.getElementById("modeLabel").innerText="Live";
  initChart();
  const histData = await fetchHistoricalData(currentSymbol,interval);
  candleSeries.setData(histData);
  if(showEMA) emaSeries.setData(ema(histData,20));
  if(showSMA) smaSeries.setData(sma(histData,50));
  updateLastPrice(histData[histData.length-1].close);
  updateInfoBar(histData[histData.length-1].close,histData[histData.length-1].open,histData[histData.length-1].time);

  socket = new WebSocket(`wss://stream.binance.com:9443/ws/${currentSymbol.toLowerCase()}@kline_${interval}`);
  socket.onmessage = event=>{
    const data = JSON.parse(event.data); const k=data.k;
    const candle = {time:Math.floor(k.t/1000),open:parseFloat(k.o),high:parseFloat(k.h),low:parseFloat(k.l),close:parseFloat(k.c)};
    candleSeries.update(candle);
    updateLastPrice(candle.close);
    updateInfoBar(candle.close,candle.open,candle.time);
  };
  socket.onclose = ()=>{ setTimeout(()=>{if(liveMode) startLive(interval);},5000); };
}

// Last price
function updateLastPrice(price){
  if(!chart||!candleSeries) return;
  if(lastPriceLine) candleSeries.removePriceLine(lastPriceLine);
  lastPriceLine = candleSeries.createPriceLine({price:price,color:"#22ab94",lineWidth:2,lineStyle:LightweightCharts.LineStyle.Solid,axisLabelVisible:true,title:`Last: ${price.toFixed(2)}`});
}

// Info bar
function updateInfoBar(price, open, time){
  document.getElementById("lastPrice").innerText = `Fiyat: ${price.toFixed(2)}`;
  const change=((price-open)/open)*100;
  const sign=change>=0?"+":"";
  document.getElementById("priceChange").innerHTML = `Değişim: <span class="change ${change>=0?'up':'down'}">${sign}${change.toFixed(2)}%</span>`;
  document.getElementById("candleTime").innerText = `Zaman: ${new Date(time*1000).toLocaleString()}`;
}

// Controls
function changeInterval(interval){ currentInterval=interval; liveMode?startLive(interval):startReplay(interval); }
function toggleMode(){ liveMode=!liveMode; liveMode?startLive(currentInterval):startReplay(currentInterval); }
function changeSymbol(symbol){ currentSymbol=symbol; liveMode?startLive(currentInterval):startReplay(currentInterval); }
function updateReplaySpeed(speed){ replaySpeed=parseFloat(speed); if(!liveMode) startReplay(currentInterval); }
function toggleEMA(){ showEMA=document.getElementById("toggleEMA").checked; liveMode?startLive(currentInterval):startReplay(currentInterval); }
function toggleSMA(){ showSMA=document.getElementById("toggleSMA").checked; liveMode?startLive(currentInterval):startReplay(currentInterval); }

// Cleanup
function cleanup(){ if(socket){ socket.onclose=null; socket.close(); socket=null; } if(chart){ chart.remove(); chart=null; candleSeries=null; } if(replayTimer){ clearInterval(replayTimer); replayTimer=null; } lastPriceLine=null; }

window.addEventListener("resize",()=>{ if(chart) chart.applyOptions({width:window.innerWidth,height:window.innerHeight-100}); });

startLive(currentInterval);
