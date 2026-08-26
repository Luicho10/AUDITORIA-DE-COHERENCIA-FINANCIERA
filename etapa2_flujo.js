/* FLUJO DE FONDOS — VISTA CREDITICIA COMPACTA
   El período actual concentra las alertas. Los anteriores solo sirven como referencia.
   Cada diferencia debe mostrar los importes que la originan.
*/
(function(){
 const $=id=>document.getElementById(id), norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const n=v=>{if(v==null||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;let s=String(v).trim().replace(/\s/g,'');if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'.');let x=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(x)?x:0};
 const money=x=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(x||0);
 function rows(){const f=$('archivoUnico')?.files?.[0];if(!f||!window.XLSX)return null;return f.arrayBuffer().then(b=>{const wb=XLSX.read(b,{type:'array',raw:true,blankrows:true});const name=wb.SheetNames.find(x=>norm(x)==='ee ff y eerr')||wb.SheetNames[0];return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:0,raw:true,blankrows:true})})}
 function run(r){
   if(!r)return;
   const C=[2,5,8],cur=2,prev=1;
   const cash=C.map(c=>n(r[9]?.[c]));
   const flowNet=C.map(c=>n(r[185]?.[c]));
   const clients=C.map(c=>n(r[12]?.[c]));
   // Fila real del Flujo: "Variación cuentas a cobrar comerciales CP".
   // No debe confundirse con "Variación neta de caja" (fila 185).
   const flowClients=C.map(c=>n(r[158]?.[c]));
   const flowMovements=C.map(c=>n(r[158]?.[c])+n(r[184]?.[c]));
   const cashVariation=cash[cur]-cash[prev];
   const clientVariation=clients[cur]-clients[prev];
   const clientDiff=flowClients[cur]-clientVariation;
   const checks=[
     {name:'Caja ↔ Flujo',diff:cashVariation-flowNet[cur],detail:`Caja 2024 G. ${money(cash[prev])} → Caja 2025 G. ${money(cash[cur])} · Variación según Balance G. ${money(cashVariation)} · Variación según Flujo G. ${money(flowNet[cur])}`},
     {name:'Clientes ↔ Flujo',diff:clientDiff,detail:`Clientes 2024 G. ${money(clients[prev])} → Clientes 2025 G. ${money(clients[cur])} · Variación según Balance G. ${money(clientVariation)} · Variación de Clientes según Flujo G. ${money(flowClients[cur])}`},
     {name:'Flujo neto ↔ movimientos',diff:flowNet[cur]-flowMovements[cur],detail:`Variación neta de caja según Flujo G. ${money(flowNet[cur])} · Movimientos utilizados en este control G. ${money(flowMovements[cur])}`}
   ];
   const bad=checks.filter(x=>Math.abs(x.diff)>1);
   const sec=document.createElement('section');sec.className='card';sec.id='flujoCompacto';
   sec.innerHTML=`<h2>3. FLUJO DE FONDOS — CONTROL DEL PERÍODO ACTUAL</h2><div class="body">
   <div class="compact-note"><b>2025 es el período evaluado.</b> 2023 y 2024 se usan solamente para comparar evolución. No generan alertas independientes.</div>
   <div class="flow-summary"><div><b>Caja inicial 2025</b><strong>G. ${money(cash[prev])}</strong></div><div><b>Caja final 2025</b><strong>G. ${money(cash[cur])}</strong></div><div><b>Variación según Balance</b><strong>G. ${money(cashVariation)}</strong></div><div><b>Variación según Flujo</b><strong>G. ${money(flowNet[cur])}</strong></div></div>
   <div class="flow-status ${bad.length?'warn':'ok'}"><b>${bad.length?'REVISAR FLUJO':'FLUJO CONCILIADO'}</b><br>${bad.length?'Existe al menos una diferencia entre el Flujo y los estados que debe explicarse.':'Las relaciones principales del Flujo del período actual coinciden con los saldos utilizados.'}</div>
   <details open><summary>Ver origen de las diferencias</summary><div class="flow-origin">${checks.map(x=>`<div class="flow-check"><div><b>${esc(x.name)}</b><span class="${Math.abs(x.diff)>1?'badcell':'okcell'}">${Math.abs(x.diff)>1?'Diferencia G. '+money(x.diff):'CONCILIADO'}</span></div><div class="flow-detail">${esc(x.detail)}${Math.abs(x.diff)>1?`<br><b>Cómo se obtiene la diferencia:</b> importe del Flujo − importe calculado con el Balance = <b>G. ${money(x.diff)}</b>.`:''}</div></div>`).join('')}</div></details>
   <details><summary>Ver controles técnicos del flujo</summary><table class="table"><thead><tr><th>Control</th><th>Resultado</th></tr></thead><tbody>${checks.map(x=>`<tr><td>${esc(x.name)}</td><td class="${Math.abs(x.diff)>1?'badcell':'okcell'}">${Math.abs(x.diff)>1?'Diferencia G. '+money(x.diff):'Conciliado'}</td></tr>`).join('')}</tbody></table></details>
   </div>`;
   const a=$('auditoria');if(a){const old=$('flujoCompacto');if(old)old.remove();a.classList.remove('hidden');a.insertBefore(sec,a.firstChild)}else document.body.appendChild(sec)
 }
 function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(()=>rows().then(run),150));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
