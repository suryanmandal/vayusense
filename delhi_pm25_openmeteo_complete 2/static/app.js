async function loadInfo(){
  const r=await fetch('/api/model/info'); const x=await r.json(); const m=x.evaluation.xgboost; const p=x.production;
  document.getElementById('metrics').innerHTML=`
    <div class="card"><div>Hold-out RMSE</div><div class="metric">${m.rmse.toFixed(2)}</div><div>µg/m³</div></div>
    <div class="card"><div>Hold-out MAE</div><div class="metric">${m.mae.toFixed(2)}</div><div>µg/m³</div></div>
    <div class="card"><div>Hold-out R²</div><div class="metric">${m.r2.toFixed(3)}</div></div>
    <div class="card"><div>Within ±25</div><div class="metric">${m.within_25_pct.toFixed(2)}%</div></div>
    <div class="card"><div>Production rows</div><div class="metric">${p.rows.toLocaleString()}</div><div>${p.stations} stations</div></div>`
}
async function csv(path){const t=await (await fetch(path)).text();const lines=t.trim().split(/\r?\n/);const h=lines[0].split(',');return lines.slice(1).map(l=>{const v=l.split(',');let o={};h.forEach((k,i)=>o[k]=v[i]);return o})}
async function runDemo(){
  const s=document.getElementById('offlineStatus'); s.textContent='Running...';
  try{
    const hist=await csv('/static/sample_pm_history_24h.csv'); const weather=await csv('/static/sample_weather_72h.csv');
    const body={pm_history:hist.map(x=>Number(x.pm25)),weather:weather.map(x=>({timestamp:x.timestamp,AT:Number(x.AT),RH:Number(x.RH),WD:Number(x.WD),SR:Number(x.SR),RF:Number(x.RF),BP:Number(x.BP)})),coupled:true};
    const r=await fetch('/api/forecast/72h',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}); const x=await r.json();
    if(!r.ok) throw new Error(x.detail||'Request failed'); render(x.forecast); s.textContent='Done'; s.className='status ok';
  }catch(e){s.textContent=e.message; s.className='status warn'}
}
async function runLiveAuto(){
  const s=document.getElementById('liveStatus'); const meta=document.getElementById('liveMeta'); s.textContent='Fetching Open-Meteo...'; meta.textContent='';
  try{
    const body={latitude:Number(document.getElementById('lat').value),longitude:Number(document.getElementById('lon').value),timezone:document.getElementById('tz').value,coupled:true};
    const r=await fetch('/api/forecast/live-auto',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}); const x=await r.json();
    if(!r.ok) throw new Error(x.detail||'Live request failed');
    render(x.forecast); s.textContent='Live forecast loaded'; s.className='status ok';
    meta.innerHTML=`Weather: <span class="badge">${x.weather_source}</span> &nbsp; PM seed: <span class="badge">${x.pm_seed_source}</span><br>Latest seed: ${Number(x.pm_seed_last_value).toFixed(2)} µg/m³ at ${x.pm_seed_last_timestamp}`;
  }catch(e){s.textContent=e.message; s.className='status warn'}
}
function render(a){
  document.getElementById('rows').innerHTML=a.map(x=>`<tr><td>${x.timestamp}</td><td>${x.persistence_pm25}</td><td>${x.xgboost_pm25}</td><td>${x.coupled_experimental_pm25}</td><td>${x.pbl_height_m??''}</td><td>${x.inversion_active?'Yes':'No'}</td><td>${x.wind_speed_10m_kmh??''}</td></tr>`).join('');
  const c=document.getElementById('chart'),g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height);
  const vals=a.flatMap(x=>[x.persistence_pm25,x.xgboost_pm25,x.coupled_experimental_pm25]).filter(Number.isFinite); const max=Math.max(50,...vals)*1.1,pad=42;
  g.strokeStyle='#304462';g.beginPath();g.moveTo(pad,10);g.lineTo(pad,c.height-pad);g.lineTo(c.width-10,c.height-pad);g.stroke();
  function line(key,stroke){g.strokeStyle=stroke;g.lineWidth=2;g.beginPath();a.forEach((x,i)=>{const px=pad+i*(c.width-pad-15)/(Math.max(1,a.length-1)),py=(c.height-pad)-(x[key]/max)*(c.height-pad-20);i?g.lineTo(px,py):g.moveTo(px,py)});g.stroke()}
  line('persistence_pm25','#94a3b8');line('xgboost_pm25','#60a5fa');line('coupled_experimental_pm25','#f59e0b');
  g.fillStyle='#e8eef9';g.fillText(`max ${max.toFixed(0)} µg/m³`,5,18);g.fillStyle='#94a3b8';g.fillText('Persistence',70,20);g.fillStyle='#60a5fa';g.fillText('XGBoost',160,20);g.fillStyle='#f59e0b';g.fillText('Coupled*',230,20)
}
loadInfo();
