/* ETAPA 2 - VALIDACION DEL FLUJO DE FONDOS COMPARATIVO */
(function(){
  const $=id=>document.getElementById(id);
  const fmt=n=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num=v=>{if(v===null||v===undefined||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;let s=String(v).trim().replace(/\s/g,'');if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'.');const n=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(n)?n:0;};
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  function getRows(wb){const name=wb.SheetNames.find(n=>norm(n)==='ee ff y eerr')||wb.SheetNames[0];return{name,rows:XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null,raw:true,blankrows:true})};}
  function v(rows,r,c){return num(rows[r]?.[c]);}
  function calc(rows){
    const C=[2,5,8], years=['2023','2024','2025'];
    const B={cash:C.map(c=>v(rows,9,c)),clients:C.map(c=>v(rows,12,c)),inventory:C.map(c=>v(rows,16,c)),adv:C.map(c=>v(rows,17,c)),otherCA:C.map(c=>v(rows,19,c)),ppe:C.map(c=>v(rows,27,c)),totalA:C.map(c=>v(rows,32,c)),debtCP:C.map(c=>v(rows,33,c)),providers:C.map(c=>v(rows,35,c)),clientAdv:C.map(c=>v(rows,36,c)),provisions:C.map(c=>v(rows,37,c)),creditors:C.map(c=>v(rows,38,c)),otherPC:C.map(c=>v(rows,41,c)),totalPC:C.map(c=>v(rows,42,c)),debtLP:C.map(c=>v(rows,44,c)),providersLP:C.map(c=>v(rows,45,c)),totalPNC:C.map(c=>v(rows,48,c)),totalP:C.map(c=>v(rows,49,c)),capital:C.map(c=>v(rows,51,c)),result:C.map(c=>v(rows,56,c)),equity:C.map(c=>v(rows,57,c))};
    const R={sales:C.map(c=>v(rows,63,c)),gross:C.map(c=>v(rows,65,c)),ebitda:C.map(c=>v(rows,72,c)),ebit:C.map(c=>v(rows,74,c)),interestPaid:C.map(c=>v(rows,75,c)),fxLoss:C.map(c=>v(rows,77,c)),fxGain:C.map(c=>v(rows,78,c)),beforeTax:C.map(c=>v(rows,81,c)),tax:C.map(c=>v(rows,82,c)),net:C.map(c=>v(rows,88,c))};
    const F={flowNet:C.map(c=>v(rows,144,c)),flowDep:C.map(c=>v(rows,145,c)),grossFunds:C.map(c=>v(rows,147,c)),varClients:C.map(c=>v(rows,149,c)),varInvAdv:C.map(c=>v(rows,150,c)),varOtherCA:C.map(c=>v(rows,152,c)),applicationsOp:C.map(c=>v(rows,153,c)),varProviders:C.map(c=>v(rows,154,c)),varProvisions:C.map(c=>v(rows,155,c)),varOtherPC:C.map(c=>v(rows,156,c)),generationsOp:C.map(c=>v(rows,157,c)),netOp:C.map(c=>v(rows,158,c)),varPPE:C.map(c=>v(rows,163,c)),dividends:C.map(c=>v(rows,166,c)),newDebtCP:C.map(c=>v(rows,178,c)),capitalVar:C.map(c=>v(rows,173,c)),applicationsNonOp:C.map(c=>v(rows,172,c)),generationsNonOp:C.map(c=>v(rows,183,c)),netNonOp:C.map(c=>v(rows,184,c)),netCash:C.map(c=>v(rows,185,c))};
    return{years,B,R,F};
  }
  function status(a,b,tol=1){const d=a-b;return{d,ok:Math.abs(d)<=tol};}
  function row(label,checks){const ok=checks.every(x=>x.ok);return `<tr><td><b>${esc(label)}</b></td><td>${checks.map(x=>esc(x.detail)).join('<br>')}</td><td class="${ok?'okcell':'badcell'}"><b>${ok?'CONCILIADO':'INCONSISTENCIA'}</b></td></tr>`;}
  function render(x){
    const {years,B,R,F}=x; const out=[];
    for(let i=1;i<3;i++){
      const y=years[i], prev=years[i-1];
      const checks=[];
      checks.push(Object.assign(status(F.netCash[i],B.cash[i]-B.cash[i-1]),{detail:`Variación neta de caja: ${fmt(F.netCash[i])} · Caja ${y} − Caja ${prev}: ${fmt(B.cash[i]-B.cash[i-1])} · Diferencia: ${fmt(F.netCash[i]-(B.cash[i]-B.cash[i-1]))}`}));
      checks.push(Object.assign(status(F.flowNet[i],R.net[i]),{detail:`Resultado Neto del flujo: ${fmt(F.flowNet[i])} · Resultado neto del Estado de Resultados: ${fmt(R.net[i])} · Diferencia: ${fmt(F.flowNet[i]-R.net[i])}`}));
      checks.push(Object.assign(status(F.varClients[i],B.clients[i]-B.clients[i-1]),{detail:`Variación clientes: flujo ${fmt(F.varClients[i])} · Balance ${fmt(B.clients[i]-B.clients[i-1])} · Diferencia: ${fmt(F.varClients[i]-(B.clients[i]-B.clients[i-1]))}`}));
      checks.push(Object.assign(status(F.varInvAdv[i],(B.inventory[i]-B.inventory[i-1])+(B.adv[i]-B.adv[i-1])),{detail:`Inventario + anticipos: flujo ${fmt(F.varInvAdv[i])} · Balance ${fmt((B.inventory[i]-B.inventory[i-1])+(B.adv[i]-B.adv[i-1]))} · Diferencia: ${fmt(F.varInvAdv[i]-((B.inventory[i]-B.inventory[i-1])+(B.adv[i]-B.adv[i-1])))}`}));
      checks.push(Object.assign(status(F.varProviders[i],(B.providers[i]-B.providers[i-1])+(B.providersLP[i]-B.providersLP[i-1])+(B.creditors[i]-B.creditors[i-1])),{detail:`Cuentas a pagar comerciales: flujo ${fmt(F.varProviders[i])} · Proveedores + LP + Acreedores varios: ${fmt((B.providers[i]-B.providers[i-1])+(B.providersLP[i]-B.providersLP[i-1])+(B.creditors[i]-B.creditors[i-1]))} · Diferencia: ${fmt(F.varProviders[i]-((B.providers[i]-B.providers[i-1])+(B.providersLP[i]-B.providersLP[i-1])+(B.creditors[i]-B.creditors[i-1])) )}`}));
      checks.push(Object.assign(status(F.varPPE[i],B.ppe[i]-B.ppe[i-1]),{detail:`Variación Activo Fijo: flujo ${fmt(F.varPPE[i])} · Balance ${fmt(B.ppe[i]-B.ppe[i-1])} · Diferencia: ${fmt(F.varPPE[i]-(B.ppe[i]-B.ppe[i-1]))}`}));
      checks.push(Object.assign(status(F.capitalVar[i],B.capital[i]-B.capital[i-1]),{detail:`Variación capital: flujo ${fmt(F.capitalVar[i])} · Balance ${fmt(B.capital[i]-B.capital[i-1])} · Diferencia: ${fmt(F.capitalVar[i]-(B.capital[i]-B.capital[i-1]))}`}));
      const nonop=F.netOp[i]+F.netNonOp[i];
      checks.push(Object.assign(status(F.netCash[i],F.netOp[i]+F.netNonOp[i]),{detail:`Flujo total: generación neta operativa ${fmt(F.netOp[i])} + generación neta no operativa ${fmt(F.netNonOp[i])} = ${fmt(nonop)} · Variación neta de caja ${fmt(F.netCash[i])} · Diferencia: ${fmt(F.netCash[i]-nonop)}`}));
      out.push(`<div class="alert ${checks.every(c=>c.ok)?'ok':'warn'}"><strong>${y} — VALIDACIÓN DEL FLUJO</strong><div>Comparación contra ${prev} y contra los Estados Financieros.</div></div><table class="table"><thead><tr><th>Prueba</th><th>Conciliación</th><th>Resultado</th></tr></thead><tbody>${row('1. Caja ↔ Variación neta de caja',[checks[0]])}${row('2. Resultado Neto ↔ Resultado del Estado de Resultados',[checks[1]])}${row('3. Clientes ↔ Variación de cuentas a cobrar',[checks[2]])}${row('4. Inventario + Anticipos ↔ Variación',[checks[3]])}${row('5. Proveedores/Acreedores ↔ Cuentas a pagar comerciales',[checks[4]])}${row('6. Activo Fijo ↔ Inversiones/variación',[checks[5]])}${row('7. Capital ↔ Aportes/variación',[checks[6]])}${row('8. Flujo operativo + no operativo ↔ Variación de caja',[checks[7]])}</tbody></table>`);
    }
    const all=[]; for(let i=1;i<3;i++){all.push(F.netCash[i]===F.netOp[i]+F.netNonOp[i]);all.push(F.netCash[i]===B.cash[i]-B.cash[i-1]);}
    $('auditoria').innerHTML=`<section class="card"><h2>4. VALIDACIÓN DEL FLUJO DE FONDOS COMPARATIVO</h2><div class="body"><div class="audit-current"><b>CONTROL ESPECÍFICO</b><br>El sistema compara el flujo contra Balance y Estado de Resultados. No emite todavía una conclusión de riesgo crediticio.</div>${out.join('')}<div class="audit-current"><b>CRITERIO</b><br>CONCILIADO = diferencia cero. INCONSISTENCIA = la cifra del flujo no puede explicarse con los estados fuente según la relación evaluada.</div></div></section>`;
    $('auditoria').classList.remove('hidden');
  }
  async function run(){const file=$('archivoUnico')?.files?.[0];if(!file)return;try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,raw:true,blankrows:true});const d=getRows(wb);render(calc(d.rows));}catch(e){$('auditoria').innerHTML=`<section class="card"><h2>4. VALIDACIÓN DEL FLUJO</h2><div class="body"><div class="alert crit"><b>Error:</b> ${esc(e.message)}</div></div></section>`;$('auditoria').classList.remove('hidden');}}
  function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(run,100));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
