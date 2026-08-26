/* FLUJO DE FONDOS — CONTROL DEL PERÍODO ACTUAL
   Las alertas se concentran en el año actual.
   Los controles se obtienen por ETIQUETA de la fila real del Excel, no por número fijo de fila.
*/
(function(){
 const $=id=>document.getElementById(id);
 const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const n=v=>{if(v==null||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;let s=String(v).trim().replace(/\s/g,'').replace(/[()]/g,'-');if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'.');let x=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(x)?x:0};
 const money=x=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(x||0);
 const label=r=>norm(r?.[1]??r?.[0]);
 function rows(){const f=$('archivoUnico')?.files?.[0];if(!f||!window.XLSX)return null;return f.arrayBuffer().then(b=>{const wb=XLSX.read(b,{type:'array',raw:true,blankrows:true});const name=wb.SheetNames.find(x=>norm(x)==='ee ff y eerr')||wb.SheetNames[0];return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:0,raw:true,blankrows:true})})}
 function findRow(r, names, start=0, end=r.length){const wanted=names.map(norm);for(let i=start;i<end;i++){const l=label(r[i]);if(wanted.includes(l))return i}for(let i=start;i<end;i++){const l=label(r[i]);if(wanted.some(w=>l.includes(w)))return i}return -1}
 function val(r,idx,col){return idx<0?0:n(r[idx]?.[col])}
 function run(r){
   if(!r)return;
   const C=[2,5,8],cur=2,prev=1;
   const cashRow=findRow(r,['disponible (caja y bancos)','disponible caja y bancos','caja y bancos','disponible']);
   const clientsRow=findRow(r,['creditos comerciales - cp (clientes)','creditos comerciales cp (clientes)']);
   const flowNetRow=findRow(r,['variacion neta de caja']);
   const flowClientsRow=findRow(r,['variacion cuentas a cobrar comerciales cp','variacion cuentas a cobrar comerciales - cp']);
   const genOpRow=findRow(r,['generacion (aplicacion) neta operativa']);
   const genNoOpRow=findRow(r,['generacion (aplicacion) neta no operativa']);
   const cashPrev=val(r,cashRow,C[prev]),cashCur=val(r,cashRow,C[cur]);
   const flowNet=val(r,flowNetRow,C[cur]);
   const clientPrev=val(r,clientsRow,C[prev]),clientCur=val(r,clientsRow,C[cur]);
   const flowClients=val(r,flowClientsRow,C[cur]);
   const cashVariation=cashCur-cashPrev;
   const clientVariation=clientCur-clientPrev;
   const genOp=val(r,genOpRow,C[cur]),genNoOp=val(r,genNoOpRow,C[cur]);
   const checks=[
     {name:'Caja ↔ Flujo',diff:cashVariation-flowNet,detail:`Caja 2024 G. ${money(cashPrev)} → Caja 2025 G. ${money(cashCur)} · Variación según Balance G. ${money(cashVariation)} · Variación neta según Flujo G. ${money(flowNet)}`,formula:`G. ${money(cashCur)} − G. ${money(cashPrev)} = G. ${money(cashVariation)}; luego G. ${money(cashVariation)} − G. ${money(flowNet)} = G. ${money(cashVariation-flowNet)}.`},
     {name:'Clientes ↔ Flujo',diff:flowClients-clientVariation,detail:`Clientes 2024 G. ${money(clientPrev)} → Clientes 2025 G. ${money(clientCur)} · Variación según Balance G. ${money(clientVariation)} · Variación de Clientes según Flujo G. ${money(flowClients)}`,formula:`G. ${money(flowClients)} − G. ${money(clientVariation)} = G. ${money(flowClients-clientVariation)}.`},
     {name:'Flujo neto ↔ generaciones',diff:flowNet-(genOp+genNoOp),detail:`Generación neta operativa G. ${money(genOp)} + generación neta no operativa G. ${money(genNoOp)} = G. ${money(genOp+genNoOp)} · Variación neta de caja del Flujo G. ${money(flowNet)}`,formula:`G. ${money(flowNet)} − G. ${money(genOp+genNoOp)} = G. ${money(flowNet-(genOp+genNoOp))}.`}
   ];
   const bad=checks.filter(x=>Math.abs(x.diff)>1);
   const sec=document.createElement('section');sec.className='card';sec.id='flujoCompacto';
   sec.innerHTML=`<h2>3. FLUJO DE FONDOS — CONTROL DEL PERÍODO ACTUAL</h2><div class="body">
   <div class="compact-note"><b>2025 es el período evaluado.</b> 2023 y 2024 se usan solamente para comparar evolución. No generan alertas independientes.</div>
   <div class="flow-summary"><div><b>Caja inicial 2025</b><strong>G. ${money(cashPrev)}</strong></div><div><b>Caja final 2025</b><strong>G. ${money(cashCur)}</strong></div><div><b>Variación según Balance</b><strong>G. ${money(cashVariation)}</strong></div><div><b>Variación según Flujo</b><strong>G. ${money(flowNet)}</strong></div></div>
   <div class="flow-status ${bad.length?'warn':'ok'}"><b>${bad.length?'REVISAR FLUJO':'FLUJO CONCILIADO'}</b><br>${bad.length?'Existe al menos una diferencia entre el Flujo y los estados que debe explicarse.':'Las relaciones principales del Flujo del período actual coinciden con los saldos utilizados.'}</div>
   <details open><summary>Ver origen de las diferencias</summary><div class="flow-origin">${checks.map(x=>`<div class="flow-check"><div><b>${esc(x.name)}</b><span class="${Math.abs(x.diff)>1?'badcell':'okcell'}">${Math.abs(x.diff)>1?'Diferencia G. '+money(x.diff):'CONCILIADO'}</span></div><div class="flow-detail">${esc(x.detail)}${Math.abs(x.diff)>1?`<br><b>Cómo se obtuvo:</b> ${esc(x.formula)}<br><b>Importante:</b> esta diferencia es una señal de conciliación; no significa por sí sola que exista un error contable.`:''}</div></div>`).join('')}</div></details>
   </div>`;
   const a=$('auditoria');if(a){const old=$('flujoCompacto');if(old)old.remove();a.classList.remove('hidden');a.insertBefore(sec,a.firstChild)}else document.body.appendChild(sec)
 }
 function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(()=>rows().then(run),150));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
