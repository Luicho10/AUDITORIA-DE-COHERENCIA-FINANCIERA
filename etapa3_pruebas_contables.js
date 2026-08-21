/* ETAPA 3 - PRUEBAS CONTABLES BASICAS
   Verificación directa de Balance y Estado de Resultados.
   Los períodos y columnas se detectan desde los encabezados reales del Excel.
*/
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const fmt=n=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  const num=v=>{if(v===null||v===undefined||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v).trim().replace(/\s/g,'').replace(/[()]/g,'-');if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'.');const n=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(n)?n:null;};
  const aliases={'total activo':'totalActivo','total pasivo':'totalPasivo','total patrimonio neto':'patrimonio','capital':'capital','reserva legal / facultativa':'reservaLegal','reserva de revalúo':'reservaRevaluo','resultados acumulados':'acumulados','resultado del ejercicio':'resultadoEjercicio','ventas netas':'ventas','costo de ventas':'costoVentas','resultado bruto comercial principal':'brutoPrincipal','resultado bruto comercial secundario':'brutoSecundario','resultado bruto total':'brutoTotal','gastos operativos, administrativos y de ventas':'gastosAdminVentas','gastos operativos, administrativos y de ahorros y créditos':'gastosAhorros','ebitda (flujo operativo puro/caja real)':'ebitda','depreciaciones / amortizaciones':'depreciacion','ebit (resultado operativo) (utilidad op contable)':'ebit','intereses financieros pagados':'interesesPagados','intereses financieros cobrados':'interesesCobrados','pérdidas por diferencia de cambio':'perdidaCambio','ganancias por diferencia de cambio':'gananciaCambio','otros egresos no operativos':'otrosEgresosNoOp','otros ingresos no operativos':'otrosIngresosNoOp','resultado antes de impuesto':'antesImpuesto','impuesto a la renta':'impuesto','resultado neto total del ejercicio':'resultadoNeto'};
  async function readRows(){const file=$('archivoUnico')?.files?.[0];if(!file||!window.XLSX)throw new Error('No se pudo acceder al archivo Excel.');const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,raw:true,blankrows:true});const name=wb.SheetNames.find(n=>norm(n)==='ee ff y eerr')||wb.SheetNames[0];return{name,rows:XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null,raw:true,blankrows:true})};}
  function detectPeriods(rows){
    const candidates=[];
    for(let r=0;r<Math.min(rows.length,20);r++)for(let c=0;c<rows[r].length;c++){
      const v=rows[r][c];let y=null;
      if(v instanceof Date)y=String(v.getFullYear());
      else {const s=String(v??'');const m=s.match(/(?:19|20)\d{2}/);if(m)y=m[0];}
      if(y&&Number(y)>=2000&&Number(y)<=2100)candidates.push({year:y,col:c});
    }
    const byYear={};candidates.forEach(x=>{if(byYear[x.year]===undefined)byYear[x.year]=x.col;});
    const years=Object.keys(byYear).sort((a,b)=>Number(a)-Number(b));
    if(years.length<2)throw new Error('No se pudieron identificar los períodos en los encabezados del Excel.');
    const cols=years.map(y=>byYear[y]);
    return{years,cols};
  }
  function extract(rows,periods){
    const data={};
    Object.entries(aliases).forEach(([label,key])=>{
      const target=norm(label);let found=null;
      for(let r=0;r<rows.length;r++){
        const candidates=[rows[r]?.[0],rows[r]?.[1],rows[r]?.[2],rows[r]?.[3]].map(norm);
        if(candidates.includes(target)){found={row:r,values:{}};break;}
      }
      if(found)periods.years.forEach((y,i)=>{found.values[y]=num(rows[found.row]?.[periods.cols[i]]);});
      data[key]=found;
    });
    return data;
  }
  const val=(d,k,y)=>d[k]?.values?.[y]??null;
  function check(label,formula,detail,status='CONCILIADO'){return `<tr><td><b>${esc(label)}</b></td><td>${esc(formula)}</td><td>${esc(detail)}</td><td class="${status==='CONCILIADO'?'okcell':status==='OBSERVACION'||status==='SIN DATOS'?'warncell':'badcell'}"><b>${esc(status)}</b></td></tr>`;}
  function equation(d,y){const a=val(d,'totalActivo',y),p=val(d,'totalPasivo',y),e=val(d,'patrimonio',y);if(a===null||p===null||e===null)return check('1. Ecuación patrimonial','Activo = Pasivo + Patrimonio','No existen todos los importes necesarios.','SIN DATOS');const rhs=p+e,diff=a-rhs;return check('1. Ecuación patrimonial','Activo = Pasivo + Patrimonio',`Activo ${fmt(a)} · Pasivo + Patrimonio ${fmt(rhs)} · Diferencia ${fmt(diff)}`,Math.abs(diff)<=1?'CONCILIADO':'INCONSISTENCIA');}
  function equityComponents(d,y){const a=['capital','reservaLegal','reservaRevaluo','acumulados','resultadoEjercicio'].map(k=>val(d,k,y)),e=val(d,'patrimonio',y);if(e===null||a.some(v=>v===null))return check('2. Composición del patrimonio','Capital + Reservas + Resultados = Patrimonio','No existen todos los componentes necesarios.','SIN DATOS');const sum=a.reduce((s,v)=>s+v,0),diff=e-sum;return check('2. Composición del patrimonio','Capital + Reservas + Resultados = Patrimonio',`Componentes ${fmt(sum)} · Patrimonio ${fmt(e)} · Diferencia ${fmt(diff)}`,Math.abs(diff)<=1?'CONCILIADO':'INCONSISTENCIA');}
  function resultReconciliation(d,y){const before=val(d,'antesImpuesto',y),tax=val(d,'impuesto',y),net=val(d,'resultadoNeto',y)??val(d,'resultadoEjercicio',y);if(before===null||tax===null||net===null)return check('3. Resultado del ejercicio','Resultado antes de impuesto − Impuesto = Resultado neto','No existen todos los importes necesarios.','SIN DATOS');const calc=before-tax,diff=calc-net;return check('3. Resultado del ejercicio','Resultado antes de impuesto − Impuesto = Resultado neto',`${fmt(before)} − ${fmt(tax)} = ${fmt(calc)} · Resultado neto ${fmt(net)} · Diferencia ${fmt(diff)}`,Math.abs(diff)<=1?'CONCILIADO':'INCONSISTENCIA');}
  function gross(d,y){const sales=val(d,'ventas',y),cost=val(d,'costoVentas',y),bruto=val(d,'brutoPrincipal',y);if(sales===null||cost===null||bruto===null)return check('4. Resultado bruto','Ventas − Costo de ventas = Resultado bruto','No existen todos los importes necesarios.','SIN DATOS');const calc=sales-cost,diff=calc-bruto;return check('4. Resultado bruto','Ventas − Costo de ventas = Resultado bruto',`Ventas ${fmt(sales)} − Costo ${fmt(cost)} = ${fmt(calc)} · Resultado bruto ${fmt(bruto)} · Diferencia ${fmt(diff)}`,Math.abs(diff)<=1?'CONCILIADO':'INCONSISTENCIA');}
  function ebitdaTest(d,y){const bruto=val(d,'brutoTotal',y)??val(d,'brutoPrincipal',y),g1=val(d,'gastosAdminVentas',y)||0,g2=val(d,'gastosAhorros',y)||0,ebitda=val(d,'ebitda',y);if(bruto===null||ebitda===null)return check('5. EBITDA','Resultado bruto − gastos operativos = EBITDA','No existen todos los importes necesarios.','SIN DATOS');const calc=bruto-g1-g2,diff=calc-ebitda;return check('5. EBITDA','Resultado bruto − gastos operativos = EBITDA',`Bruto ${fmt(bruto)} − Gastos ${fmt(g1+g2)} = ${fmt(calc)} · EBITDA ${fmt(ebitda)} · Diferencia ${fmt(diff)}`,Math.abs(diff)<=1?'CONCILIADO':'INCONSISTENCIA');}
  function ebitTest(d,y){const ebitda=val(d,'ebitda',y),dep=val(d,'depreciacion',y),ebit=val(d,'ebit',y);if(ebitda===null||dep===null||ebit===null)return check('6. EBIT','EBITDA − Depreciaciones = EBIT','No existen todos los importes necesarios.','SIN DATOS');const calc=ebitda-dep,diff=calc-ebit;return check('6. EBIT','EBITDA − Depreciaciones = EBIT',`EBITDA ${fmt(ebitda)} − Depreciaciones ${fmt(dep)} = ${fmt(calc)} · EBIT ${fmt(ebit)} · Diferencia ${fmt(diff)}`,Math.abs(diff)<=1?'CONCILIADO':'INCONSISTENCIA');}
  function beforeTaxTest(d,y){const ebit=val(d,'ebit',y),ip=val(d,'interesesPagados',y)||0,ic=val(d,'interesesCobrados',y)||0,pl=val(d,'perdidaCambio',y)||0,gl=val(d,'gananciaCambio',y)||0,oe=val(d,'otrosEgresosNoOp',y)||0,oi=val(d,'otrosIngresosNoOp',y)||0,before=val(d,'antesImpuesto',y);if(ebit===null||before===null)return check('7. Resultado antes de impuesto','EBIT − resultado financiero + resultados no operativos = Resultado antes de impuesto','No existen todos los importes necesarios.','SIN DATOS');const calc=ebit-ip+ic-pl+gl-oe+oi,diff=calc-before;return check('7. Resultado antes de impuesto','EBIT − intereses + diferencia de cambio + otros = Resultado antes de impuesto',`Cálculo ${fmt(calc)} · Resultado antes de impuesto ${fmt(before)} · Diferencia ${fmt(diff)}`,Math.abs(diff)<=1?'CONCILIADO':'INCONSISTENCIA');}
  function equityMovement(d,y,prev){
    const e0=val(d,'patrimonio',prev),e1=val(d,'patrimonio',y),r=val(d,'resultadoEjercicio',y),rPrev=val(d,'resultadoEjercicio',prev),c0=val(d,'capital',prev),c1=val(d,'capital',y);
    if(e0===null||e1===null||r===null||c0===null||c1===null)return check('8. Evolución del patrimonio','Patrimonio inicial + resultado + movimientos patrimoniales = patrimonio final','No existen todos los importes necesarios.','SIN DATOS');
    const delta=e1-e0,capitalVar=c1-c0,netOther=delta-r,detailBase=`Patrimonio ${prev} ${fmt(e0)} → ${y} ${fmt(e1)} · Variación ${fmt(delta)} · Resultado ${fmt(r)} · Movimientos netos requeridos ${fmt(netOther)}`;
    if(Math.abs(netOther)<=1)return check('8. Evolución del patrimonio','Patrimonio inicial + resultado + movimientos patrimoniales = patrimonio final',`${detailBase} · La variación patrimonial se explica por el resultado del ejercicio.`, 'CONCILIADO');
    if(rPrev!==null&&Math.abs(capitalVar-rPrev)<=1)return check('8. Evolución del patrimonio','Patrimonio inicial + resultado + movimientos patrimoniales = patrimonio final',`${detailBase} · Aumento de capital ${fmt(capitalVar)} coincide con el resultado del ejercicio anterior ${fmt(rPrev)}; posible capitalización/reclasificación interna, sin aumento neto del patrimonio.`, 'OBSERVACION');
    return check('8. Evolución del patrimonio','Patrimonio inicial + resultado + movimientos patrimoniales = patrimonio final',`${detailBase} · Variación de capital ${fmt(capitalVar)}; falta identificar otros movimientos patrimoniales que expliquen la diferencia.`, 'OBSERVACION');
  }
  function render(d,periods){
    const years=periods.years;let html='<section class="card" id="pruebasContablesSection"><h2>5. PRUEBAS CONTABLES BÁSICAS</h2><div class="body"><div class="audit-current"><b>CONTROL ESPECÍFICO</b><br>Se verifica la coherencia interna de Balance y Estado de Resultados. Períodos detectados automáticamente: '+esc(years.join(', '))+'. Esta etapa no emite riesgo crediticio.</div>';
    years.forEach((y,i)=>{const prev=i?years[i-1]:null;html+=`<div class="alert ok"><strong>${esc(y)} — PRUEBAS CONTABLES</strong><div>Validación directa de las cifras del estado financiero.</div></div><table class="table"><thead><tr><th>Prueba</th><th>Relación</th><th>Conciliación</th><th>Resultado</th></tr></thead><tbody>${equation(d,y)}${equityComponents(d,y)}${resultReconciliation(d,y)}${gross(d,y)}${ebitdaTest(d,y)}${ebitTest(d,y)}${beforeTaxTest(d,y)}${prev?equityMovement(d,y,prev):''}</tbody></table>`;});
    html+='<div class="audit-current"><b>CRITERIO</b><br><b>CONCILIADO</b> = igualdad cumplida. <b>OBSERVACIÓN</b> = requiere interpretación. <b>INCONSISTENCIA</b> = los importes no explican la relación. <b>SIN DATOS</b> = faltan componentes.</div></div></section>';
    const old=$('pruebasContablesSection');if(old)old.remove();$('auditoria').insertAdjacentHTML('beforeend',html);
  }
  async function run(){try{const {rows}=await readRows();const periods=detectPeriods(rows);const data=extract(rows,periods);render(data,periods);}catch(e){const old=$('pruebasContablesSection');if(old)old.remove();$('auditoria').insertAdjacentHTML('beforeend',`<section class="card" id="pruebasContablesSection"><h2>5. PRUEBAS CONTABLES BÁSICAS</h2><div class="body"><div class="alert crit"><b>ERROR EN PRUEBAS CONTABLES:</b> ${esc(e.message)}</div></div></section>`);}}
  function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(run,220));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
