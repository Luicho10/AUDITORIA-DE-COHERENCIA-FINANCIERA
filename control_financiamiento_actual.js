/* CONTROL DE FINANCIAMIENTO DEL PERÍODO ACTUAL
   Complemento: detecta todas las nuevas/pagos de obligaciones del flujo por etiqueta real.
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
 sec.innerHTML=`<h2>CONTROL DE OBLIGACIONES — ${esc($('ejercicio')?.value||'PERÍODO ACTUAL')}</h2><div class="body"><div class="compact-note"><b>El sistema detectó movimientos de financiamiento en el Flujo.</b> Se muestran separados para no confundir deuda financiera con deuda comercial.</div>${commercial.length?`<div class="diag-item actionable"><div class="diag-head"><b>NUEVA DEUDA COMERCIAL DE LARGO PLAZO</b><span class="priority p-media">REVISAR</span></div>${commercial.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}<p><b>Qué significa:</b> la empresa registró una nueva obligación comercial de largo plazo. Esto puede financiar compras, operaciones o acuerdos con proveedores; <b>no es un préstamo bancario</b>.</p><p><b>Qué debe comprobar el sistema:</b> que el importe tenga su contrapartida en el Pasivo/Deudas Comerciales LP y que el flujo lo incorpore correctamente como fuente de fondos.</p><p><b>Qué hacer:</b> si Balance y Flujo explican el movimiento, <b>no pedir documentación adicional</b>. Si no aparece la obligación en el Pasivo o queda una diferencia material, pedir detalle de deuda con proveedores.</p></div>`:''}${financial.length?`<div class="diag-item"><div class="diag-head"><b>DEUDA FINANCIERA NUEVA/PAGADA</b></div>${financial.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}<p>Se mantiene separada de la deuda comercial para el análisis de intereses y referencias bancarias.</p></div>`:''}${others.length?`<div class="diag-item"><div class="diag-head"><b>OTRAS OBLIGACIONES</b></div>${others.map(x=>`<p><b>${esc(x.name)}:</b> G. ${money(x.cur)}</p>`).join('')}</div>`:''}</div>`;
 const a=$('auditoria');if(a){a.appendChild(sec)}else document.body.appendChild(sec);
 })}
 function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(run,450))}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();