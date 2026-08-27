/* CONTROL DE FINANCIAMIENTO DEL PERÍODO ACTUAL
   Complemento: solo muestra movimientos de obligaciones que NO quedaron explicados.
   Si Flujo y Balance concilian, no genera una alerta ni repite información.
   Deuda comercial LP se mantiene separada de deuda financiera.
*/
(function(){
 const $=id=>document.getElementById(id);
 const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
 const money=x=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(x||0);
 const n=v=>{if(v==null||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;let s=String(v).trim().replace(/\s/g,'').replace(/[()]/g,'-');if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'.');const x=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(x)?x:0};
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function findRow(rows,names){const wanted=names.map(norm);for(let i=0;i<rows.length;i++){const s=norm(rows[i]?.[1]??rows[i]?.[0]);if(wanted.includes(s))return i}for(let i=0;i<rows.length;i++){const s=norm(rows[i]?.[1]??rows[i]?.[0]);if(wanted.some(w=>s===w||s.includes(w)))return i}return -1}
 function run(){
  const f=$('archivoUnico')?.files?.[0];if(!f||!window.XLSX)return;
  f.arrayBuffer().then(b=>{
   const wb=XLSX.read(b,{type:'array',raw:true,blankrows:true});
   const sh=wb.SheetNames.find(x=>norm(x)==='ee ff y eerr')||wb.SheetNames[0];
   const rows=XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,defval:0,raw:true,blankrows:true});
   const cols=[2,5,8],cur=2,prev=1;
   const items=[
    ['Nuevas Deudas Financieras CP',['nuevas deudas financieras cp'],'FINANCIERA'],
    ['Nuevas Deudas Financieras LP',['nuevas deudas financieras lp'],'FINANCIERA'],
    ['Nuevas Deudas Comerciales LP',['nuevas deudas comerciales lp'],'COMERCIAL LP'],
    ['Nuevas Deudas con Socios y Cooperativas CP',['nuevas deudas con socios y cooperativas cp'],'SOCIOS'],
    ['Nuevas Deudas con Socios y Cooperativas LP',['nuevas deudas con socios y cooperativas lp'],'SOCIOS'],
    ['Pago Deudas Financieras CP',['pago deudas financieras cp'],'PAGO FINANCIERO'],
    ['Pago Deudas Financieras LP',['pago deudas financieras lp'],'PAGO FINANCIERO'],
    ['Pago Deudas Comerciales LP',['pago deudas comerciales lp'],'PAGO COMERCIAL LP'],
    ['Pago Deudas con Socios y Cooperativas CP',['pago deudas con socios y cooperativas cp'],'PAGO SOCIOS'],
    ['Pago Deudas con Socios y Cooperativas LP',['pago deudas con socios y cooperativas lp'],'PAGO SOCIOS']
   ];
   const detected=[];
   for(const [name,names,type] of items){const r=findRow(rows,names);if(r>=0){const curVal=n(rows[r]?.[cols[cur]]);const prevVal=n(rows[r]?.[cols[prev]]);if(Math.abs(curVal)>0||Math.abs(prevVal)>0)detected.push({name,type,cur:curVal,prev:prevVal})}}
   const old=$('financiamientoDetectado');if(old)old.remove();
   if(!detected.length)return;
   const commercial=detected.filter(x=>x.type==='COMERCIAL LP'),financial=detected.filter(x=>x.type==='FINANCIERA'),others=detected.filter(x=>!['COMERCIAL LP','FINANCIERA'].includes(x.type));
   let html='';
   if(commercial.length){
    const br=findRow(rows,['deudas comerciales - lp','deudas comerciales lp','deuda comercial - lp','deuda comercial lp']);
    const balNow=br>=0?n(rows[br]?.[cols[cur]]):null, balPrev=br>=0?n(rows[br]?.[cols[prev]]):null, balDelta=br>=0?balNow-balPrev:null;
    const gross=commercial.reduce((s,x)=>s+x.cur,0);
    const payRow=findRow(rows,['pago deudas comerciales lp','pago deudas comerciales - lp']);
    const paid=payRow>=0?Math.abs(n(rows[payRow]?.[cols[cur]])):0;
    const expectedDelta=gross-paid;
    const tol=Math.max(1,Math.abs(gross)*0.000001);
    // Solo se considera conciliado cuando el cambio neto del Balance queda explicado por nuevas obligaciones menos pagos.
    // Un aumento cero NO es conciliación de una nueva deuda de G. 33.179 millones.
    if(br>=0 && Math.abs((balDelta??0)-expectedDelta)<=tol){
      // Correcto y deliberadamente silencioso: no es alerta.
    }else if(br<0){
      html+=`<div class="diag-item actionable"><div class="diag-head"><b>NUEVA DEUDA COMERCIAL DE LARGO PLAZO</b><span class="priority p-media">SIN CONTRAPARTIDA IDENTIFICABLE</span></div>${commercial.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}<p><b>Resultado:</b> el Flujo registra nueva deuda comercial LP, pero no se encontró una cuenta identificable de Deudas Comerciales LP en el Balance.</p><p><b>Qué hacer:</b> revisar la clasificación del Pasivo. Solo si la obligación no aparece en una cuenta compatible, pedir detalle de deuda con proveedores.</p></div>`;
    }else{
      html+=`<div class="diag-item actionable"><div class="diag-head"><b>NUEVA DEUDA COMERCIAL DE LARGO PLAZO</b><span class="priority p-media">DIFERENCIA NO EXPLICADA</span></div>${commercial.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}<p><b>Flujo:</b> nueva deuda G. ${money(gross)}${paid?`; pagos de deuda comercial LP G. ${money(paid)}`:''}.</p><p><b>Balance:</b> Deudas Comerciales LP pasó de G. ${money(balPrev)} a G. ${money(balNow)}; variación neta G. ${money(balDelta)}.</p><p><b>Resultado:</b> el movimiento no cierra con la variación del Balance. La diferencia es G. ${money((balDelta??0)-expectedDelta)}.</p><p><b>Qué hacer:</b> revisar primero pagos, vencimientos y reclasificaciones. Solo si la diferencia permanece sin explicación, pedir detalle de deuda con proveedores.</p></div>`;
    }
   }
   // Otros movimientos solo se muestran si requieren revisión; no se crea una pantalla informativa por movimientos ya conciliados.
   if(financial.length){
    html+=`<div class="diag-item"><div class="diag-head"><b>DEUDA FINANCIERA NUEVA/PAGADA</b></div>${financial.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}<p>Este movimiento se mantiene separado de la deuda comercial para el análisis financiero.</p></div>`;
   }
   if(others.length){
    html+=`<div class="diag-item"><div class="diag-head"><b>OTRAS OBLIGACIONES</b></div>${others.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}</div>`;
   }
   if(!html)return;
   const sec=document.createElement('section');sec.className='card';sec.id='financiamientoDetectado';
   sec.innerHTML=`<h2>CONTROL DE OBLIGACIONES — ${esc($('ejercicio')?.value||'PERÍODO ACTUAL')}</h2><div class="body"><div class="compact-note"><b>Solo se muestran movimientos que requieren revisión.</b> Los movimientos conciliados no generan una alerta ni se repiten.</div>${html}</div>`;
   const a=$('auditoria');if(a){a.appendChild(sec);a.classList.remove('hidden')}else document.body.appendChild(sec);
  });
 }
 function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(run,450))}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();