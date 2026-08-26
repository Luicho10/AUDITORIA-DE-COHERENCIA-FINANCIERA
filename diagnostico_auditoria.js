/* DIAGNÓSTICO E INTERPRETACIÓN
   Objetivo: transformar las pruebas en una conclusión comprensible para un usuario no auditor.
   Regla: el último período disponible genera las alertas; los períodos anteriores sirven únicamente como contexto/tendencia.
*/
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const human={
    'CONCILIADO':{name:'BIEN',cls:'g-good',text:'La relación matemática evaluada cuadra en el período actual.'},
    'CORRELACIÓN':{name:'NORMAL',cls:'g-good',text:'Existe una relación económica útil, pero por sí sola no demuestra un error.'},
    'PARA INDAGAR':{name:'REGULAR',cls:'g-warn',text:'Existe una señal en el período actual que necesita explicación documental o gerencial. No significa automáticamente que exista un error.'},
    'OBSERVACIÓN':{name:'OBSERVACIÓN',cls:'g-warn',text:'Existe una diferencia de presentación, metodología o evolución que debe interpretarse antes de sacar una conclusión.'},
    'INCONSISTENCIA':{name:'MALO',cls:'g-bad',text:'La relación matemática evaluada no cuadra y la diferencia no queda explicada con la información disponible.'},
    'SIN DATOS':{name:'SIN DATOS',cls:'g-warn',text:'No hay información suficiente para realizar esta prueba. No se debe interpretar un período sin datos como una inconsistencia.'}
  };
  const rules=[
    {keys:['clientes','ventas'],title:'Clientes frente a ventas',why:'Compara cuánto representan los créditos a clientes respecto de las ventas y ayuda a detectar cambios importantes en el plazo implícito de cobranza.',accounts:'Balance: Créditos por ventas / Clientes. Estado de Resultados: Ventas netas.',evidence:'Antigüedad de saldos, principales clientes, condiciones de crédito y cobranzas posteriores al cierre.',threshold:'Una variación importante frente al período anterior merece explicación; un plazo alto no significa por sí solo incobrabilidad.'},
    {keys:['inventario','costo de ventas'],title:'Inventario frente al costo de ventas',why:'Permite evaluar si el inventario actual es razonable en relación con el costo de ventas y si su rotación cambió significativamente.',accounts:'Balance: Inventarios. Estado de Resultados: Costo de ventas.',evidence:'Inventario físico, antigüedad, obsolescencia, compras, bajas, ajustes y criterio de valuación.',threshold:'Un aumento importante del inventario relativo al costo puede requerir revisar acumulación, obsolescencia o valuación.'},
    {keys:['proveedores','compras'],title:'Proveedores frente a compras',why:'Reconstruye aproximadamente las compras a partir del costo de ventas y la variación del inventario y las contrasta con el movimiento de proveedores.',accounts:'Balance: Proveedores, anticipos y acreedores. Estado de Resultados: Costo de ventas. También Inventarios.',evidence:'Mayor de proveedores, facturas, pagos, compras al contado, anticipos y acreedores relacionados.',threshold:'La diferencia entre compras reconstruidas y proveedores no es automáticamente un error: debe explicarse mediante pagos, compras al contado y cambios de plazo.'},
    {keys:['deuda','intereses'],title:'Deuda frente a intereses',why:'Relaciona los intereses registrados con la deuda financiera para detectar una relación atípica. La tasa implícita es solo una señal y no reemplaza el contrato.',accounts:'Balance: Deudas financieras CP y LP. Estado de Resultados: Intereses financieros.',evidence:'Contratos, cronogramas, extractos, desembolsos, cancelaciones, tasas e intereses devengados.',threshold:'Intereses con deuda final muy baja o cero requieren comprobar deuda cancelada durante el año, devengamientos u otras fuentes de financiamiento.'},
    {keys:['caja','flujo'],title:'Caja frente al Flujo de Fondos',why:'Comprueba que la diferencia entre la caja inicial y final coincida con la variación neta de efectivo informada por el flujo.',accounts:'Balance: Caja y Bancos de ambos cierres. Flujo: Variación neta de caja.',evidence:'Extractos bancarios, conciliaciones, saldos iniciales/finales y composición de ingresos y egresos de efectivo.',threshold:'Si no coincide, hay que localizar la diferencia en saldos bancarios, movimientos omitidos o clasificación dentro del flujo.'},
    {keys:['ppe','capex'],title:'Activo fijo frente a inversiones',why:'Compara el movimiento del activo fijo con las inversiones/compras informadas en el flujo. No tienen que ser idénticos porque existen depreciaciones, bajas, ventas y reclasificaciones.',accounts:'Balance: Activo fijo y depreciación. Flujo: Inversiones/compras y ventas de activo fijo.',evidence:'Registro de activo fijo, facturas, altas, bajas, ventas, depreciaciones y financiación de activos.',threshold:'Una diferencia requiere identificar qué parte corresponde a depreciación, baja, venta, reclasificación o adquisición financiada.'},
    {keys:['inversión','financiamiento'],title:'Inversión frente a fuentes de financiamiento',why:'Busca determinar si los movimientos de deuda pueden explicar fuentes de fondos y si existe una relación razonable con las inversiones del período.',accounts:'Balance: Deuda financiera CP/LP. Flujo: Nuevas deudas y aplicaciones. Cruzar con Activo fijo, inversiones y caja.',evidence:'Contratos, desembolsos, extractos, facturas de inversión y documentación del destino de los fondos.',threshold:'Una nueva deuda identifica una fuente posible, pero no demuestra por sí sola el destino del dinero.'},
    {keys:['ecuación patrimonial'],title:'Ecuación patrimonial',why:'Verifica que el Total Activo sea exactamente igual al Total Pasivo más Patrimonio Neto.',accounts:'Balance: Total Activo, Total Pasivo y Patrimonio Neto y las cuentas que forman cada total.',evidence:'Balance original, sumatorias, subtotales y partida que explique la diferencia.',threshold:'Cualquier diferencia distinta de cero requiere localizar la cuenta, signo o total que la origina.'},
    {keys:['composición del patrimonio'],title:'Composición del patrimonio',why:'Comprueba que Capital, Reservas y Resultados expliquen el Patrimonio Neto informado.',accounts:'Balance: Capital, reservas, resultados acumulados, resultado del ejercicio y Patrimonio Neto.',evidence:'Estado de evolución del patrimonio, actas de capitalización, distribución de resultados y movimientos de reservas.',threshold:'Una diferencia requiere revisar capitalizaciones, distribuciones, reservas y resultados acumulados.'},
    {keys:['resultado del ejercicio'],title:'Resultado neto',why:'Verifica que Resultado antes de impuesto menos Impuesto llegue al Resultado Neto informado.',accounts:'Estado de Resultados: Resultado antes de impuesto, Impuesto y Resultado Neto.',evidence:'Liquidación del impuesto, conciliación fiscal y Estado de Resultados.',threshold:'Una diferencia apunta a impuesto, resultado neto o clasificación de alguna partida.'},
    {keys:['resultado bruto'],title:'Resultado bruto',why:'Comprueba que Ventas netas menos Costo de ventas explique el Resultado Bruto.',accounts:'Estado de Resultados: Ventas netas, Costo de ventas y Resultado Bruto.',evidence:'Libro de ventas, compras/costo, inventarios y conciliación del costo.',threshold:'Una diferencia requiere revisar importes, signos y clasificación del costo de ventas.'},
    {keys:['ebitda'],title:'EBITDA',why:'Comprueba si el EBITDA puede explicarse desde el Resultado Bruto y los gastos operativos.',accounts:'Estado de Resultados: Resultado Bruto, gastos operativos y EBITDA.',evidence:'Detalle de gastos y criterios de clasificación.',threshold:'Una diferencia puede deberse a clasificación u omisión de gastos operativos.'},
    {keys:['ebit'],title:'EBIT',why:'Comprueba que EBITDA menos depreciaciones/amortizaciones llegue al EBIT informado.',accounts:'Estado de Resultados: EBITDA, depreciaciones/amortizaciones y EBIT.',evidence:'Registro de activo fijo, vidas útiles, depreciaciones y movimientos de activos.',threshold:'Una diferencia requiere revisar depreciaciones y clasificación de gastos.'},
    {keys:['resultado antes de impuesto'],title:'Resultado antes de impuesto',why:'Comprueba que el EBIT llegue al Resultado antes de impuesto considerando intereses, diferencia de cambio y otros resultados.',accounts:'Estado de Resultados: EBIT, intereses, diferencia de cambio, otros resultados y Resultado antes de impuesto.',evidence:'Detalle de resultados financieros/no operativos y comprobantes.',threshold:'Una diferencia puede estar en cuentas financieras, diferencia de cambio, otros resultados o clasificación.'}
  ];
  function ruleFor(test){
    const n=norm(test);
    return rules.find(r=>r.keys.every(k=>n.includes(k)))||rules.find(r=>r.keys.some(k=>n.includes(k)))||null;
  }
  function collectLatest(){
    const rows=[...document.querySelectorAll('#auditoria tr')].map(tr=>{const c=[...tr.children].map(x=>x.innerText.trim());return {test:c[0]||'',relation:c[1]||'',detail:c[2]||'',result:(c[3]||'').toUpperCase()};}).filter(x=>x.result);
    /* Cada prueba se repite por período. Conservar la última aparición evita que 2023/2024 generen alertas actuales. */
    const latest=new Map();
    rows.forEach(x=>latest.set(norm(x.test),x));
    return [...latest.values()];
  }
  function currentYear(){
    const explicit=$('ejercicio')?.value?.trim();
    if(explicit)return explicit;
    const text=$('auditoria')?.innerText||'';
    const years=[...text.matchAll(/(20\d{2})\s*[—-]\s*(?:PRUEBAS|VALIDACIÓN)/gi)].map(m=>m[1]);
    return years.length?years[years.length-1]:'período actual';
  }
  function overall(items){
    const bad=items.filter(x=>x.result==='INCONSISTENCIA').length;
    const ind=items.filter(x=>x.result==='PARA INDAGAR').length;
    const obs=items.filter(x=>x.result==='OBSERVACIÓN').length;
    const noData=items.filter(x=>x.result==='SIN DATOS').length;
    if(bad)return {name:'MALO',cls:'g-bad',text:`Se detectaron ${bad} inconsistencia(s) en el período actual. Deben localizarse y explicarse antes de considerar plenamente coherente la información.`};
    if(ind)return {name:'REGULAR',cls:'g-warn',text:`Se detectaron ${ind} señal(es) que requieren indagación en el período actual. Una alerta de este tipo no significa automáticamente que exista un error.`};
    if(obs)return {name:'BIEN',cls:'g-good',text:`Las relaciones principales del período actual cuadran, pero quedaron ${obs} observación(es) que requieren interpretación.`};
    if(noData===items.length)return {name:'SIN DATOS',cls:'g-warn',text:'No existen datos suficientes en el período actual para emitir una conclusión confiable.'};
    return {name:'EXCELENTE',cls:'g-excellent',text:'Las pruebas disponibles del período actual cuadran y no quedaron alertas relevantes.'};
  }
  function readableResult(result){return human[result]||{name:result,cls:'g-warn',text:'La prueba requiere interpretación.'};}
  function render(){
    const audit=$('auditoria');if(!audit)return;
    const items=collectLatest();if(!items.length)return;
    const old=$('diagnosticoAuditoria');if(old)old.remove();
    const year=currentYear();
    const g=overall(items);
    const alerts=items.filter(x=>['PARA INDAGAR','INCONSISTENCIA','OBSERVACIÓN','SIN DATOS'].includes(x.result));
    const normal=items.filter(x=>['CONCILIADO','CORRELACIÓN'].includes(x.result)).length;
    let html=`<section class="card" id="diagnosticoAuditoria"><h2>DIAGNÓSTICO E INTERPRETACIÓN — PERÍODO ACTUAL ${esc(year)}</h2><div class="body"><div class="diag-grade ${g.cls}"><div class="diag-label">CONCLUSIÓN GENERAL</div><div class="diag-value">${esc(g.name)}</div><div>${esc(g.text)}</div><div class="note"><b>Importante:</b> ${esc(year==='período actual'?'Los períodos anteriores se utilizan como referencia, cuando existen.':'Los períodos anteriores se utilizan únicamente para comparar evolución y explicar cambios; no generan alertas independientes.')}</div></div>`;
    html+=`<div class="diag-summary"><b>Lectura del período:</b> ${normal} prueba(s) sin alerta principal · ${alerts.filter(x=>x.result!=='SIN DATOS').length} alerta(s)/observación(es) actuales${alerts.some(x=>x.result==='SIN DATOS')?' · '+alerts.filter(x=>x.result==='SIN DATOS').length+' sin datos':''}.</div>`;
    if(!alerts.length){
      html+='<div class="diag-ok"><b>No quedaron puntos que requieran indagación en el período actual.</b><br>Las pruebas disponibles muestran relaciones coherentes. Los períodos anteriores quedan como referencia de tendencia.</div>';
    }else{
      html+='<h3>QUÉ SIGNIFICA CADA ALERTA DEL PERÍODO ACTUAL</h3><div class="diag-list">';
      alerts.forEach((x,i)=>{
        const r=ruleFor(x.test);const h=readableResult(x.result);const priority=x.result==='INCONSISTENCIA'?'ALTA':x.result==='PARA INDAGAR'?'MEDIA':x.result==='OBSERVACIÓN'?'BAJA':'INFORMATIVA';
        const detail=x.detail.replace(/Base:.*?Verificar:/s,'').replace(/\s+/g,' ').trim();
        html+=`<div class="diag-item ${h.cls}"><div class="diag-head"><b>${i+1}. ${esc(r?.title||x.test)}</b><span class="priority">${priority}</span></div><div class="diag-result"><b>${esc(h.name)}</b> — ${esc(h.text)}</div><div><b>¿Qué está evaluando?</b> ${esc(r?.why||'La relación entre las cuentas que intervienen en esta prueba.')}</div><div><b>¿Qué cuentas intervienen?</b> ${esc(r?.accounts||'Revisar las cuentas que forman el cálculo de la prueba.')}</div><div><b>¿Por qué aparece la alerta?</b> ${esc(r?.threshold||'El resultado actual requiere explicación con la información contable y documental del período.')}</div><div><b>¿Qué debería comprobar?</b> ${esc(r?.evidence||'Solicitar el detalle auxiliar y la documentación que explique el movimiento.')}</div><div class="diag-detail"><b>Datos utilizados por el sistema:</b> ${esc(detail||'Consultar el detalle de la prueba.')}</div>`;
        if(x.result==='SIN DATOS')html+='<div class="diag-caution"><b>No interpretar como error:</b> la ausencia de datos impide evaluar la relación. El sistema no debe convertir un período sin información en una inconsistencia.</div>';
        html+='</div>';
      });
      html+='</div>';
    }
    html+='<div class="diag-legend"><b>MALO</b> = la relación actual no cuadra y no queda explicada. <b>REGULAR</b> = existe una señal actual que requiere indagación. <b>BIEN</b> = no hay inconsistencias principales actuales, aunque puede haber observaciones. <b>EXCELENTE</b> = las pruebas disponibles cuadran sin alertas relevantes.</div></div></section>';
    audit.insertAdjacentHTML('beforeend',html);
  }
  function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(render,1200));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
