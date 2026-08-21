/* ETAPA 4 - PRUEBAS CRUZADAS - V5 ANALITICA */
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const fmt=n=>n===null||n===undefined||n===''?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  const pct=n=>n===null||n===undefined||!Number.isFinite(n)?'—':`${n.toFixed(1)}%`;
  const num=v=>{if(v===null||v===undefined||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v).trim().replace(/\s/g,'').replace(/[()]/g,'-');if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'.');const n=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(n)?n:null;};
  const years=['2023','2024','2025'],cols=[2,5,8];
  const aliases={
    caja:['disponible (caja y bancos)','disponible caja y bancos','caja y bancos','disponible','caja'],
    clientes:['creditos comerciales - cp (clientes)','creditos comerciales cp (clientes)','creditos comerciales - cp','creditos comerciales cp','clientes'],
    inventario:['inventario','inventarios'],
    ppe:['activo fijo (bruto)','activo fijo bruto','activo fijo'],
    deudaCp:['deudas financieras - cp','deudas financieras cp','deuda financiera - cp','deuda financiera cp'],
    deudaLp:['deudas financieras - lp','deudas financieras lp','deuda financiera - lp','deuda financiera lp'],
    proveedores:['deudas comerciales - cp (proveedores)','deudas comerciales cp (proveedores)','deudas comerciales - cp','deudas comerciales cp','proveedores'],
    ventas:['ventas netas','ventas'],
    costo:['costo de ventas','costos de ventas'],
    intereses:['intereses financieros pagados','intereses financieros','intereses pagados']
  };
  const flujoAliases={
    varCaja:['variacion neta de caja','variacion neta caja','variacion de caja','variacion neta del efectivo'],
    capex:['variacion activo fijo (inversiones y compras)','variacion activo fijo inversiones y compras','variacion activo fijo','inversiones y compras de activo fijo'],
    nuevasDeudaCp:['nuevas deudas financieras cp','nuevas deudas financieras - cp','nuevas deudas cp'],
    nuevasDeudaLp:['nuevas deudas financieras lp','nuevas deudas financieras - lp','nuevas deudas lp']
  };
  function readRows(){
    const file=$('archivoUnico')?.files?.[0];if(!file||!window.XLSX)throw new Error('No se pudo acceder al archivo Excel.');
    return file.arrayBuffer().then(buf=>{const wb=XLSX.read(buf,{type:'array',cellDates:true,raw:true,blankrows:true});const name=wb.SheetNames.find(n=>norm(n)==='ee ff y eerr')||wb.SheetNames[0];return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null,raw:true,blankrows:true});});
  }
  function findRow(rows,labels,start,end){
    const wanted=labels.map(norm);
    for(let r=start;r<Math.min(end,rows.length);r++){
      const cells=[rows[r]?.[0],rows[r]?.[1],rows[r]?.[2],rows[r]?.[3]].map(norm).filter(Boolean);
      if(wanted.some(w=>cells.includes(w)))return r;
    }
    for(let r=start;r<Math.min(end,rows.length);r++){
      const cells=[rows[r]?.[0],rows[r]?.[1],rows[r]?.[2],rows[r]?.[3]].map(norm).filter(Boolean);
      if(wanted.some(w=>cells.some(c=>c===w||c.startsWith(w+' ')||c.endsWith(' '+w))))return r;
    }
    return -1;
  }
  function extract(rows,map,start,end){const d={};Object.entries(map).forEach(([key,labels])=>{const r=findRow(rows,labels,start,end);d[key]=r<0?null:cols.map(c=>num(rows[r]?.[c]));});return d;}
  const v=(d,k,i)=>d[k]?.[i]??null,has=x=>x!==null&&x!==undefined&&Number.isFinite(x);
  const periodHasData=(d,f,i)=>Object.values(d).some(a=>has(a?.[i])&&a[i]!==0)||Object.values(f).some(a=>has(a?.[i])&&a[i]!==0);
  function status(s){return s==='CONCILIADO'?'okcell':s==='SIN DATOS'||s==='PARA INDAGAR'||s==='OBSERVACIÓN'?'warncell':'badcell';}
  function insight(base,reading,verify){return `<div class="why"><b>Base:</b> ${esc(base)}<br><b>Lectura:</b> ${esc(reading)}<br><b>Verificar:</b> ${esc(verify)}</div>`;}
  function row(test,relation,detail,result,analysis){return `<tr><td><b>${esc(test)}</b></td><td>${esc(relation)}</td><td>${esc(detail)}${analysis?insight(analysis.base,analysis.reading,analysis.verify):''}</td><td class="${status(result)}"><b>${esc(result)}</b></td></tr>`;}
  function days(avg,base){return !has(avg)||!has(base)||base===0?null:avg/base*365;}
  function clientSales(d,i,p){
    const ar=v(d,'clientes',i),sales=v(d,'ventas',i),old=v(d,'clientes',p),oldSales=v(d,'ventas',p);
    if(!has(ar)||!has(sales)||sales===0)return row('1. Clientes ↔ Ventas','Clientes / ventas y evolución del plazo implícito.','No existen importes suficientes para calcular la relación.','SIN DATOS',{base:'Balance: Créditos por ventas / Clientes; Estado de Resultados: Ventas netas.',reading:'La relación no puede determinarse con los importes disponibles.',verify:'Detalle de clientes, ventas y período de cobranza.'});
    const avg=has(old)?(ar+old)/2:ar,dc=days(avg,sales),ratio=ar/sales,result=dc!==null&&dc>90?'PARA INDAGAR':'CORRELACIÓN';
    let detail=`Clientes ${fmt(ar)} · Ventas ${fmt(sales)} · Clientes/Ventas ${pct(ratio*100)} · Días estimados ${dc===null?'—':dc.toFixed(1)}`;
    let reading='La relación muestra cuánto de las ventas permanece representado por créditos a clientes.';
    if(has(old)&&has(oldSales)&&oldSales!==0){const prev=old/oldSales;detail+=` · Período anterior ${pct(prev*100)}`;if(ratio>prev)reading+=` El peso de clientes aumentó respecto del período anterior, por lo que el plazo implícito se elevó.`;else if(ratio<prev)reading+=' El peso de clientes disminuyó respecto del período anterior.';}
    else detail+=' · Período anterior: sin base comparable';
    if(result==='PARA INDAGAR')reading+=' El plazo implícito supera 90 días y requiere explicación documental; no implica por sí solo incobrabilidad.';
    return row('1. Clientes ↔ Ventas','Clientes / ventas y evolución del plazo implícito.',detail,result,{base:'Balance: Créditos por ventas / Clientes + Estado de Resultados: Ventas netas. Cálculo: saldo promedio de clientes ÷ ventas × 365.',reading,verify:'Antigüedad de saldos, principales clientes, condiciones de venta y cobranzas posteriores al cierre.'});
  }
  function inventoryCost(d,i,p){
    const inv=v(d,'inventario',i),cost=v(d,'costo',i),old=v(d,'inventario',p),oldCost=v(d,'costo',p);
    if(!has(inv)||!has(cost)||cost===0)return row('2. Inventario ↔ Costo de ventas','Nivel de inventario frente al costo de ventas.','No existen importes suficientes para calcular la relación.','SIN DATOS',{base:'Balance: Inventarios + Estado de Resultados: Costo de ventas.',reading:'No es posible determinar el nivel relativo del inventario.',verify:'Detalle de inventarios, movimientos, compras y costo de ventas.'});
    const ratio=inv/cost,turn=inv!==0?cost/inv:null;let detail=`Inventario ${fmt(inv)} · Costo de ventas ${fmt(cost)} · Inventario/Costo ${pct(ratio*100)} · Rotación aproximada ${turn===null?'—':turn.toFixed(2)}x`;
    let reading='La relación permite observar el peso del inventario frente al costo de ventas y su rotación aproximada.';
    if(has(old)&&has(oldCost)&&oldCost!==0){const prev=old/oldCost;detail+=` · Período anterior ${pct(prev*100)}`;if(ratio>prev)reading+=' El inventario representa una proporción mayor del costo que en el período anterior.';else if(ratio<prev)reading+=' El inventario representa una proporción menor del costo que en el período anterior.';}
    else detail+=' · Período anterior: sin base comparable';
    return row('2. Inventario ↔ Costo de ventas','Nivel de inventario frente al costo de ventas.',detail,'CORRELACIÓN',{base:'Balance: Inventarios + Estado de Resultados: Costo de ventas. Cálculo: Inventario ÷ Costo de ventas; rotación aproximada = Costo de ventas ÷ Inventario.',reading,verify:'Detalle físico/contable de inventarios, antigüedad, compras, bajas y criterio de valuación.'});
  }
  function suppliers(d,i,p){
    const inv=v(d,'inventario',i),inv0=v(d,'inventario',p),cost=v(d,'costo',i),ap=v(d,'proveedores',i),ap0=v(d,'proveedores',p);
    if(!has(inv)||!has(inv0)||!has(cost)||!has(ap)||!has(ap0))return row('3. Proveedores ↔ Compras reconstruidas','Compras ≈ costo de ventas + Δinventario.','No existen saldos consecutivos suficientes para reconstruir compras.','SIN DATOS',{base:'Estado de Resultados: Costo de ventas + Balance: Inventarios y Proveedores.',reading:'No hay base suficiente para reconstruir el movimiento de compras.',verify:'Mayor de proveedores, compras, pagos, anticipos y saldos de cierre.'});
    const purchases=cost+(inv-inv0),deltaAp=ap-ap0,coverage=purchases!==0?deltaAp/purchases:null;
    let reading='Las compras reconstruidas se comparan con la variación de proveedores; la diferencia no constituye por sí sola un error porque intervienen pagos, compras al contado y cambios de plazo.';
    if(coverage!==null&&coverage<0)reading+=' La variación de proveedores es negativa pese al volumen de compras reconstruidas, por lo que conviene revisar pagos y cancelaciones.';
    return row('3. Proveedores ↔ Compras reconstruidas','Compras ≈ costo de ventas + Δinventario.',`Compras reconstruidas ${fmt(purchases)} · Variación proveedores ${fmt(deltaAp)} · Cobertura ${coverage===null?'—':pct(coverage*100)}.`, 'CORRELACIÓN',{base:'Compras reconstruidas = Costo de ventas + (Inventario final − Inventario inicial).',reading,verify:'Detalle de compras, proveedores, pagos, compras al contado, anticipos y cuentas de acreedores relacionadas.'});
  }
  function debtInterest(d,i,p){
    const cp=v(d,'deudaCp',i),lp=v(d,'deudaLp',i),interest=v(d,'intereses',i);if(!has(interest)||(!has(cp)&&!has(lp)))return row('4. Deuda ↔ Intereses','Intereses pagados frente a deuda financiera.','No existen datos suficientes de deuda e intereses.','SIN DATOS',{base:'Balance: Deudas financieras CP/LP + Estado de Resultados: Intereses financieros pagados.',reading:'No puede estimarse razonablemente el costo financiero.',verify:'Contratos de préstamo, extractos bancarios, cronogramas y detalle de intereses devengados/pagados.'});
    const debt=(cp||0)+(lp||0),old=(v(d,'deudaCp',p)||0)+(v(d,'deudaLp',p)||0),avg=(has(v(d,'deudaCp',p))||has(v(d,'deudaLp',p)))?(debt+old)/2:debt,rate=avg>0?interest/avg:null;
    let detail=`Deuda final ${fmt(debt)} · Intereses pagados ${fmt(interest)} · Tasa implícita aproximada ${rate===null?'—':pct(rate*100)}.`;
    let result='CORRELACIÓN',reading='La tasa implícita permite relacionar el gasto financiero con el saldo medio aproximado de deuda, pero no reemplaza las condiciones contractuales.';
    if(debt===0&&interest!==0){result='PARA INDAGAR';reading='Existen intereses con deuda financiera final en cero. Puede corresponder a deuda cancelada durante el ejercicio, devengamientos de períodos anteriores u otra fuente de financiamiento y debe explicarse.';detail+=' La existencia de intereses con deuda final cero requiere verificar devengamiento, deuda cancelada durante el ejercicio u otra fuente de financiamiento.';}
    return row('4. Deuda ↔ Intereses','Intereses pagados frente al saldo medio aproximado de deuda.',detail,result,{base:'Balance: deuda financiera CP + LP. Estado de Resultados: intereses financieros pagados. Cálculo: intereses ÷ deuda media aproximada.',reading,verify:'Contratos, tasas, fechas de desembolso/cancelación, intereses devengados y movimientos bancarios.'});
  }
  function cashFlow(d,f,i,p){
    const cash=v(d,'caja',i),cash0=v(d,'caja',p),flow=v(f,'varCaja',i);if(!has(cash)||!has(cash0)||!has(flow))return row('5. Caja ↔ Flujo de fondos','Caja final − caja inicial = variación neta de caja.','No existen saldos consecutivos de caja y/o variación neta de caja suficientes.','SIN DATOS',{base:'Balance: Caja/Bancos de ambos cierres + Flujo de fondos: Variación neta de caja.',reading:'No puede comprobarse el puente entre caja inicial, caja final y flujo.',verify:'Conciliaciones bancarias, saldos iniciales y finales y composición del flujo.'});
    const calc=cash-cash0,diff=calc-flow;
    if(Math.abs(diff)<=1)return row('5. Caja ↔ Flujo de fondos','Caja final − caja inicial = variación neta de caja.',`Caja inicial ${fmt(cash0)} · Caja final ${fmt(cash)} · Variación calculada ${fmt(calc)} · Flujo ${fmt(flow)} · Diferencia 0`,'CONCILIADO',{base:'Balance: Caja/Bancos. Flujo: Variación neta de caja. Cálculo: Caja final − Caja inicial.',reading:'El movimiento de caja presentado por el flujo coincide con la variación observada en Balance.',verify:'Conciliaciones bancarias y composición de los movimientos de efectivo para sustentar el flujo.'});
    const prevInitialDiff=typeof window.__auditoriaIniciales?.[p]==='number'?window.__auditoriaIniciales[p]:null;
    if(prevInitialDiff!==null&&Math.abs(diff-prevInitialDiff)<=1)return row('5. Caja ↔ Flujo de fondos','Caja final − caja inicial = variación neta de caja.',`Variación neta de caja ${fmt(flow)} · Caja ${years[i]} − Caja ${years[p]} ${fmt(calc)} · Diferencia ${fmt(diff)}. La diferencia coincide con el desequilibrio contable identificado en el período inicial (${years[p]}).`,'OBSERVACIÓN',{base:'Balance: Caja/Bancos + Flujo de fondos. La diferencia se contrasta además con el desequilibrio patrimonial del período inicial.',reading:'El descuadre coincide con un desequilibrio heredado del período inicial. No corresponde atribuirlo automáticamente al flujo del ejercicio.',verify:`Primero verificar la ecuación patrimonial de ${years[p]} y luego la conciliación bancaria de apertura de ${years[i]}.`});
    return row('5. Caja ↔ Flujo de fondos','Caja final − caja inicial = variación neta de caja.',`Variación neta de caja ${fmt(flow)} · Caja ${years[i]} − Caja ${years[p]} ${fmt(calc)} · Diferencia ${fmt(diff)}.`, 'INCONSISTENCIA',{base:'Balance: Caja/Bancos + Flujo de fondos: Variación neta de caja. Cálculo: (Caja final − Caja inicial) − Variación del flujo.',reading:'La variación presentada por el flujo no explica la variación de caja del Balance y la diferencia no coincide con un desequilibrio heredado identificado.',verify:'Conciliación bancaria, saldos iniciales, clasificación del flujo y movimientos no incluidos en el estado.'});
  }
  function ppeCapex(d,f,i,p){
    const ppe=v(d,'ppe',i),ppe0=v(d,'ppe',p),capex=v(f,'capex',i);if(!has(ppe)||!has(ppe0)||!has(capex))return row('6. PPE ↔ CAPEX ↔ Financiamiento','Δactivo fijo frente a inversión/compra de activo fijo.','No existen importes suficientes para comparar PPE y CAPEX.','SIN DATOS',{base:'Balance: Activo fijo bruto + Flujo: inversiones/compras de activo fijo.',reading:'No puede determinarse si el movimiento del activo fijo está respaldado por el flujo de inversión.',verify:'Registro de activos fijos, altas, bajas, depreciaciones, facturas y pagos de inversiones.'});
    const delta=ppe-ppe0,diff=delta-Math.abs(capex);let reading='El aumento del activo fijo se contrasta con las inversiones/compras informadas en el flujo.';if(Math.abs(diff)>1)reading+=' La diferencia puede explicarse por depreciaciones, bajas, ventas, reclasificaciones o adquisiciones financiadas y no reflejadas en esa línea.';
    return row('6. PPE ↔ CAPEX ↔ Financiamiento','Δactivo fijo frente a inversión/compra de activo fijo.',`PPE inicial ${fmt(ppe0)} · PPE final ${fmt(ppe)} · Aumento ${fmt(delta)} · CAPEX del flujo ${fmt(capex)} · Diferencia ${fmt(diff)}.`,Math.abs(diff)<=1?'CONCILIADO':'PARA INDAGAR',{base:'Balance: Activo fijo bruto. Flujo: inversiones/compras de activo fijo. Cálculo: ΔPPE bruto frente al CAPEX informado.',reading,verify:'Movimiento del activo fijo, altas y bajas, depreciaciones, reclasificaciones, facturas y fuente de financiamiento.'});
  }
  function financing(d,f,i,p){
    const debt=(v(d,'deudaCp',i)||0)+(v(d,'deudaLp',i)||0),old=(v(d,'deudaCp',p)||0)+(v(d,'deudaLp',p)||0),newDebt=(v(f,'nuevasDeudaCp',i)||0)+(v(f,'nuevasDeudaLp',i)||0),hasNew=has(v(f,'nuevasDeudaCp',i))||has(v(f,'nuevasDeudaLp',i));
    if(!has(v(d,'deudaCp',p))&&!has(v(d,'deudaLp',p)))return row('7. Inversión ↔ Fuentes de financiamiento','Variación de deuda frente a nuevas deudas reportadas.','No existen saldos comparables de deuda suficientes.','SIN DATOS',{base:'Balance: deuda financiera inicial/final + Flujo: nuevas deudas.',reading:'No puede identificarse si el movimiento de deuda constituye una fuente de financiamiento.',verify:'Contratos de deuda, desembolsos, amortizaciones y extractos bancarios.'});
    if(!hasNew)return row('7. Inversión ↔ Fuentes de financiamiento','Variación de deuda frente a nuevas deudas reportadas.','No existe una línea explícita de nuevas deudas en el flujo para este período.','SIN DATOS',{base:'Balance: deuda financiera. Flujo: nuevas deudas financieras.',reading:'La ausencia de una línea explícita impide atribuir el movimiento de deuda al flujo.',verify:'Estado de flujo completo, contratos y movimientos bancarios de financiación.'});
    if(debt===0&&old===0&&newDebt===0)return row('7. Inversión ↔ Fuentes de financiamiento','Variación de deuda frente a nuevas deudas reportadas.','Deuda inicial 0 · Deuda final 0 · Nuevas deudas 0.','CORRELACIÓN',{base:'Balance: deuda financiera + Flujo: nuevas deudas.',reading:'No hubo movimiento de financiamiento financiero identificable en el período; esta prueba no aporta evidencia adicional sobre una fuente de inversión.',verify:'Confirmar que no existan otras obligaciones financieras o préstamos clasificados en cuentas distintas.'});
    const delta=debt-old,diff=delta-newDebt,result=Math.abs(diff)<=1?'CONCILIADO':'CORRELACIÓN';
    return row('7. Inversión ↔ Fuentes de financiamiento','Variación de deuda frente a nuevas deudas reportadas.',`Deuda inicial ${fmt(old)} · Deuda final ${fmt(debt)} · Aumento neto ${fmt(delta)} · Nuevas deudas reportadas ${fmt(newDebt)} · Diferencia ${fmt(diff)}.`,result,{base:'Balance: deuda financiera inicial y final + Flujo: nuevas deudas reportadas. Cálculo: (Deuda final − Deuda inicial) − Nuevas deudas.',reading:result==='CONCILIADO'?'El movimiento de deuda informado guarda correspondencia matemática con las nuevas deudas reportadas.':'Existe relación entre el movimiento de deuda y las nuevas deudas informadas, pero la diferencia requiere revisar amortizaciones, refinanciaciones u otras variaciones.',verify:'Contratos, desembolsos, amortizaciones, refinanciaciones y destino de los fondos.'});
  }
  function render(d,f,initialDiffs){
    window.__auditoriaIniciales=initialDiffs||{};
    const valid=years.map((y,i)=>({y,i})).filter(({i})=>periodHasData(d,f,i));
    let html='<section class="card" id="pruebasCruzadasSection"><h2>6. PRUEBAS CRUZADAS</h2><div class="body"><div class="audit-current"><b>CONTROL ESPECÍFICO</b><br>Se relacionan cuentas de Balance, Estado de Resultados y Flujo de Fondos para detectar relaciones económicas que no se prueban mirando cada estado de forma aislada. Esta etapa no emite riesgo crediticio.</div>';
    valid.filter(x=>x.i>0).forEach(({y,i})=>{const p=i-1;html+=`<div class="alert ok"><strong>${y} — PRUEBAS CRUZADAS</strong><div>Comparación con ${years[p]} y con las relaciones disponibles del período.</div></div><table class="table"><thead><tr><th>Prueba</th><th>Relación</th><th>Conciliación / análisis</th><th>Resultado</th></tr></thead><tbody>${clientSales(d,i,p)}${inventoryCost(d,i,p)}${suppliers(d,i,p)}${debtInterest(d,i,p)}${cashFlow(d,f,i,p)}${ppeCapex(d,f,i,p)}${financing(d,f,i,p)}</tbody></table>`;});
    if(!valid.some(x=>x.i>0))html+='<div class="alert warn"><b>SIN DATOS SUFICIENTES</b><div>No existen al menos dos períodos con información contable real para ejecutar pruebas cruzadas. Un período compuesto únicamente por ceros no se utiliza como base de comparación.</div></div>';
    html+='<div class="audit-current"><b>LECTURA DEL RESULTADO</b><br>Las pruebas muestran relaciones matemáticas y económicas. Cada resultado incorpora la <b>base de cálculo</b>, la <b>lectura de la relación</b> y las <b>cuentas/documentos que deben verificarse</b>. Una CORRELACIÓN no constituye por sí sola un error; PARA INDAGAR indica una señal que necesita explicación; INCONSISTENCIA significa que los importes disponibles no explican la relación evaluada.</div><div class="audit-current"><b>CRITERIO</b><br><b>CONCILIADO</b> = la relación matemática evaluada cuadra. <b>CORRELACIÓN</b> = existe relación económica útil, pero no demuestra por sí sola un error o una causa. <b>PARA INDAGAR</b> = la relación presenta una señal que requiere explicación documental o gerencial. <b>OBSERVACIÓN</b> = existe una diferencia heredada, de presentación o metodología que requiere interpretación. <b>INCONSISTENCIA</b> = la relación matemática evaluada no cuadra y no existe una explicación heredada o metodológica suficiente. <b>SIN DATOS</b> = faltan importes suficientes.</div></div></section>';
    const old=$('pruebasCruzadasSection');if(old)old.remove();$('auditoria').insertAdjacentHTML('beforeend',html);
  }
  function getInitialDifferences(rows){
    const d=extract(rows,{activo:['total activo'],pasivo:['total pasivo'],patrimonio:['total patrimonio neto']},0,rows.length);
    const out={};years.forEach((y,i)=>{const a=d.activo?.[i],p=d.pasivo?.[i],e=d.patrimonio?.[i];if(has(a)&&has(p)&&has(e)&&Math.abs(a-(p+e))>1)out[i]=a-(p+e);});return out;
  }
  async function run(){try{const rows=await readRows();const d=extract(rows,aliases,0,rows.length);const f=extract(rows,flujoAliases,0,rows.length);render(d,f,getInitialDifferences(rows));}catch(e){console.error(e);const old=$('pruebasCruzadasSection');if(old)old.remove();}}
  window.ejecutarPruebasCruzadas=run;
  document.addEventListener('DOMContentLoaded',()=>{if($('archivoUnico'))$('archivoUnico').addEventListener('change',run);});
})();