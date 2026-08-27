/* CONTROL DE FINANCIAMIENTO DEL PERÍODO ACTUAL
   Complemento: detecta movimientos reales del flujo y los contrasta con el Balance.
   No clasifica deuda comercial LP como deuda financiera.
*/
(function(){
 const $=id=>document.getElementById(id);
 const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
 const money=x=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(x||0);
 const n=v=>{if(v==null||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;let s=String(v).trim().replace(/\s/g,'').replace(/[()]/g,'-');if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'.');const x=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(x)?x:0};
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function findRow(rows,names){const wanted=names.map(norm);for(let i=0;i<rows.length;i++){const s=norm(rows[i]?.[1]??rows[i]?.[0]);if(wanted.includes(s))return i}for(let i=0;i<rows.length;i++){const s=norm(rows[i]?.[1]??rows[i]?.[0]);if(wanted.some(w=>s===w||s.includes(w)))return i}return -1}
 function run(){const f=$('archivoUnico')?.files?.[0];if(!f||!window.XLSX)return;f.arrayBuffer().then(b=>{const wb=XLSX.read(b,{type:'array',raw:true,blankrows:true});const sh=wb.SheetNames.find(x=>norm(x)==='ee ff y eerr')||wb.SheetNames[0];const rows=XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,defval:0,raw:true,blankrows:true});const cols=[2,5,8],cur=2,prev=1;
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
 const detected=[];for(const [name,names,type] of items){const r=findRow(rows,names);if(r>=0){const curVal=n(rows[r]?.[cols[cur]]);const prevVal=n(rows[r]?.[cols[prev]]);if(Math.abs(curVal)>0||Math.abs(prevVal)>0)detected.push({name,type,cur:curVal,prev:prevVal})}}
 const old=$('financiamientoDetectado');if(old)old.remove();if(!detected.length)return;
 const commercial=detected.filter(x=>x.type==='COMERCIAL LP'),financial=detected.filter(x=>x.type==='FINANCIERA'),others=detected.filter(x=>!['COMERCIAL LP','FINANCIERA'].includes(x.type));
 const sec=document.createElement('section');sec.className='card';sec.id='financiamientoDetectado';
 let commercialHtml='';
 if(commercial.length){
   const br=findRow(rows,['deudas comerciales - lp','deudas comerciales lp','deuda comercial - lp','deuda comercial lp']);
   const balNow=br>=0?n(rows[br]?.[cols[cur]]):null, balPrev=br>=0?n(rows[br]?.[cols[prev]]):null, balDelta=br>=0?balNow-balPrev:null;
   const gross=commercial.reduce((s,x)=>s+x.cur,0);
   let status,explain,action;
   if(br<0){
     status='<span class="priority p-media">CONTRAPARTIDA NO IDENTIFICADA</span>';
     explain=`El Flujo registra nueva deuda comercial LP por G. ${money(gross)}, pero no se encontró una cuenta con etiqueta identificable de Deudas Comerciales LP en el Balance cargado. Esto no prueba omisión: puede estar clasificada en otra cuenta del pasivo.`;
     action=`Revisar primero el Pasivo y las notas/clasificación disponibles. Si la obligación no aparece en ninguna cuenta compatible, pedir detalle de deuda con proveedores.`;
   }else if(balDelta<0){
     status='<span class="priority p-high">NO CIERRA</span>';
     explain=`El Flujo registra nueva deuda comercial LP por G. ${money(gross)}, pero el saldo de Deudas Comerciales LP del Balance disminuye G. ${money(Math.abs(balDelta))}. Una disminución puede coexistir con nuevas deudas si hubo pagos, vencimientos o reclasificaciones, pero la relación requiere explicación.`;
     action=`Primero comprobar pagos y reclasificaciones del período. Si no explican la diferencia, pedir detalle de deuda con proveedores.`;
   }else if(balDelta<=gross){
     status='<span class="priority p-low">EXPLICADA / COMPATIBLE</span>';
     explain=`El Flujo registra nueva deuda comercial LP por G. ${money(gross)} y el saldo de Deudas Comerciales LP del Balance aumenta G. ${money(balDelta)}. La diferencia entre deuda nueva bruta y aumento neto puede deberse a pagos, vencimientos o reclasificaciones durante el año.`;
     action=`No pedir documentación adicional por este movimiento. Solo profundizar si otro control detecta una diferencia no explicada.`;
   }else{
     status='<span class="priority p-media">REVISAR DIFERENCIA</span>';
     explain=`El saldo de Deudas Comerciales LP aumenta G. ${money(balDelta)}, por encima de la nueva deuda comercial LP informada por el Flujo de G. ${money(gross)}. Puede existir deuda anterior, reclasificación u otro movimiento que explique la diferencia.`;
     action=`Revisar movimientos y clasificación del pasivo. Si no se explica, pedir detalle de deuda con proveedores.`;
   }
   commercialHtml=`<div class="diag-item actionable"><div class="diag-head"><b>NUEVA DEUDA COMERCIAL DE LARGO PLAZO</b>${status}</div>${commercial.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}<p><b>Qué significa:</b> la empresa registró una nueva obligación comercial de largo plazo. Esto puede financiar compras, operaciones o acuerdos con proveedores; <b>no es un préstamo bancario</b>.</p><p><b>Comprobación automática:</b> ${explain}</p><p><b>Qué hacer:</b> ${action}</p></div>`;
 }
 sec.innerHTML=`<h2>CONTROL DE OBLIGACIONES — ${esc($('ejercicio')?.value||'PERÍODO ACTUAL')}</h2><div class="body"><div class="compact-note"><b>El sistema detectó movimientos de financiamiento en el Flujo.</b> Se muestran separados para no confundir deuda financiera con deuda comercial.</div>${commercialHtml}${financial.length?`<div class="diag-item"><div class="diag-head"><b>DEUDA FINANCIERA NUEVA/PAGADA</b></div>${financial.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}<p>Se mantiene separada de la deuda comercial para el análisis de intereses y referencias bancarias.</p></div>`:''}${others.length?`<div class="diag-item"><div class="diag-head"><b>OTRAS OBLIGACIONES</b></div>${others.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}</div>`:''}</div>`;
 const a=$('auditoria');if(a){a.appendChild(sec)}else document.body.appendChild(sec);
 })}
 function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(run,450))}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();