/* DIAGNÓSTICO DEL PERÍODO ACTUAL
   Las pruebas conservan los años anteriores para comparación, pero las alertas y la calificación se calculan solamente sobre el último período disponible.
*/
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const rule=(test)=>{
    const n=norm(test);
    if(n.includes('caja')&&n.includes('flujo'))return ['Caja / Flujo: comprobar el puente de efectivo','La caja final menos la caja inicial debe explicar la variación neta de caja del período actual. Una diferencia puede estar en saldos bancarios, efectivo omitido o en la confección del flujo.','Balance: Caja y Bancos del período actual y anterior + Flujo: Variación neta de caja.','Extractos bancarios, conciliaciones, saldos iniciales/finales y composición de ingresos y egresos de efectivo.'];
    if(n.includes('clientes')&&n.includes('ventas'))return ['Clientes / Ventas: revisar plazo de cobranza','El saldo de clientes se relaciona con las ventas actuales. El período anterior sirve únicamente para medir si el plazo implícito aumentó o disminuyó.','Balance: Créditos comerciales / Clientes + Estado de Resultados: Ventas netas.','Antigüedad de saldos, principales clientes, condiciones de crédito y cobranzas posteriores al cierre.'];
    if(n.includes('inventario')&&n.includes('costo'))return ['Inventario / Costo: revisar rotación y existencia','La relación permite detectar acumulación o reducción significativa del inventario en el período actual.','Balance: Inventarios + Estado de Resultados: Costo de ventas.','Inventario físico, antigüedad, obsolescencia, compras, bajas, ajustes y criterio de valuación.'];
    if(n.includes('proveedores')&&n.includes('compras'))return ['Proveedores / Compras: explicar cuentas por pagar','La variación de proveedores no tiene que coincidir con las compras reconstruidas; debe poder explicarse mediante pagos, compras al contado, anticipos y cambios de plazo.','Balance: Proveedores, anticipos y acreedores + Estado de Resultados: Costo de ventas.','Mayor de proveedores, facturas, pagos, compras al contado, anticipos y acreedores varios.'];
    if(n.includes('deuda')&&n.includes('intereses'))return ['Deuda / Intereses: verificar costo financiero real','La tasa implícita es una señal y no una tasa contractual. Una relación atípica puede deberse a cancelaciones durante el año, devengamientos u otras fuentes de financiamiento.','Balance: Deudas financieras CP/LP + Estado de Resultados: Intereses financieros.','Contratos, cronogramas, extractos, desembolsos, cancelaciones, tasas e intereses devengados.'];
    if(n.includes('ppe')||n.includes('activo fijo'))return ['Activo fijo / CAPEX: explicar altas y bajas','El aumento del activo fijo actual no necesariamente equivale al CAPEX del flujo porque pueden intervenir depreciaciones, ventas, bajas o reclasificaciones.','Balance: Activo fijo y depreciación + Flujo: inversiones/compras y ventas de activo fijo.','Registro de activo fijo, facturas, bajas, ventas, depreciaciones y financiación de activos.'];
    if(n.includes('inversión')&&n.includes('financiamiento'))return ['Inversión / Financiamiento: determinar destino de fondos','Una nueva deuda puede ser una fuente de fondos, pero no demuestra por sí sola dónde se utilizaron. Debe explicarse el destino económico del período actual.','Balance: deuda financiera CP/LP + Flujo: nuevas deudas y aplicaciones.','Contratos, desembolsos, extractos, facturas de inversiones y conciliación del destino de fondos.'];
    if(n.includes('ecuación patrimonial'))return ['Ecuación patrimonial: localizar la diferencia','Activo debe ser igual a Pasivo + Patrimonio en el período actual. Una diferencia indica que alguna cuenta, total o signo requiere revisión.','Balance: Total Activo, Total Pasivo y Patrimonio Neto del período actual.','Balance original, sumatoria de cuentas y partida que explique la diferencia.'];
    if(n.includes('composición del patrimonio'))return ['Patrimonio: verificar sus componentes','Capital, reservas y resultados deben explicar el Patrimonio Neto actual.','Balance: Capital, reservas, resultados acumulados, resultado del ejercicio y Patrimonio Neto.','Estado de evolución del patrimonio, capitalizaciones, distribución de resultados y reservas.'];
    if(n.includes('resultado del ejercicio'))return ['Resultado neto: verificar impuesto y resultado','Resultado antes de impuesto menos impuesto debe llegar al resultado neto actual.','Estado de Resultados: Resultado antes de impuesto, Impuesto y Resultado neto.','Liquidación del impuesto, conciliación fiscal y Estado de Resultados.'];
    if(n.includes('resultado bruto'))return ['Resultado bruto: verificar ventas y costo','Ventas netas menos costo de ventas debe explicar el resultado bruto actual.','Estado de Resultados: Ventas netas, Costo de ventas y Resultado bruto.','Libro de ventas, compras/costo, inventarios y conciliación del costo.'];
    if(n.includes('ebitda'))return ['EBITDA: verificar gastos operativos','La prueba verifica que el EBITDA actual pueda explicarse desde resultado bruto y gastos operativos.','Estado de Resultados: Resultado bruto, gastos operativos y EBITDA.','Detalle de gastos y criterios de clasificación.'];
    if(n.includes('ebit'))return ['EBIT: verificar depreciaciones','EBITDA menos depreciaciones/amortizaciones debe explicar el EBIT actual.','Estado de Resultados: EBITDA, depreciaciones/amortizaciones y EBIT.','Registro de activo fijo, vidas útiles, depreciaciones y movimientos.'];
    if(n.includes('resultado antes de impuesto'))return ['Resultado antes de impuesto: explicar resultado financiero','El EBIT debe llegar al resultado antes de impuesto actual después de intereses, diferencias de cambio y otros resultados.','Estado de Resultados: EBIT, intereses, diferencia de cambio, otros ingresos/egresos y resultado antes de impuesto.','Detalle de resultados financieros/no operativos y comprobantes.'];
    return [test,'La relación del período actual requiere explicación adicional.','Revisar las cuentas que intervienen directamente en la prueba actual.','Solicitar el detalle auxiliar y documentación que explique el movimiento.'];
  };
  function collectCurrent(){
    const rows=[...document.querySelectorAll('#auditoria tr')].map(tr=>{const c=[...tr.children].map(x=>x.innerText.trim());return {test:c[0]||'',detail:c[2]||'',result:(c[3]||'').toUpperCase()};}).filter(x=>x.result&&x.result!=='RESULTADO'&&x.test!=='PRUEBA');
    const latest=new Map();
    rows.forEach(x=>latest.set(norm(x.test),x));
    return [...latest.values()];
  }
  function grade(items){
    const bad=items.filter(x=>x.result==='INCONSISTENCIA').length;
    const investigate=items.filter(x=>x.result==='PARA INDAGAR').length;
    const obs=items.filter(x=>x.result==='OBSERVACIÓN').length;
    const corr=items.filter(x=>x.result==='CORRELACIÓN').length;
    if(bad)return ['MALO','Existen inconsistencias en el período actual que deben resolverse o explicarse antes de considerar plenamente coherente la información.','g-bad'];
    if(investigate)return ['REGULAR','No necesariamente existe un error, pero el período actual presenta señales concretas que requieren verificación documental o explicación.','g-warn'];
    if(obs)return ['BIEN','Las relaciones principales del período actual cuadran, aunque existen observaciones que requieren interpretación.','g-good'];
    if(corr)return ['BIEN','No se detectan inconsistencias matemáticas principales en el período actual; las correlaciones sirven como señales para el análisis.','g-good'];
    return ['EXCELENTE','Las pruebas disponibles del período actual cuadran y no quedaron alertas relevantes.','g-excellent'];
  }
  function render(){
    const audit=$('auditoria');if(!audit)return;
    const items=collectCurrent();if(!items.length)return;
    const old=$('diagnosticoAuditoria');if(old)old.remove();
    const current=$('ejercicio')?.value||'último período disponible';
    const g=grade(items);
    const alerts=items.filter(x=>['PARA INDAGAR','INCONSISTENCIA','OBSERVACIÓN'].includes(x.result));
    let html=`<section class="card" id="diagnosticoAuditoria"><h2>DIAGNÓSTICO E INTERPRETACIÓN — PERÍODO ACTUAL ${esc(current)}</h2><div class="body"><div class="diag-grade ${g[2]}"><div class="diag-label">LECTURA GENERAL DEL PERÍODO ACTUAL</div><div class="diag-value">${g[0]}</div><div>${esc(g[1])}</div><div class="note">Los períodos anteriores se utilizan como comparación y tendencia; no generan alertas independientes en este diagnóstico.</div></div>`;
    if(!alerts.length)html+='<div class="diag-ok"><b>No quedaron alertas específicas en el período actual.</b><br>Las pruebas disponibles no muestran diferencias que requieran revisión adicional.</div>';
    else{
      html+='<h3>QUÉ DEBE INDAGARSE EN EL PERÍODO ACTUAL</h3><div class="diag-list">';
      alerts.forEach((x,i)=>{const r=rule(x.test),priority=x.result==='INCONSISTENCIA'?'ALTA':x.result==='PARA INDAGAR'?'MEDIA':'BAJA';html+=`<div class="diag-item"><div class="diag-head"><b>${i+1}. ${esc(r[0])}</b><span class="priority">${priority}</span></div><div class="diag-result">Resultado detectado: <b>${esc(x.result)}</b></div><div><b>Qué significa:</b> ${esc(r[1])}</div><div><b>Qué cuentas revisar:</b> ${esc(r[2])}</div><div><b>Qué pedir o comprobar:</b> ${esc(r[3])}</div><div class="diag-detail"><b>Dato que disparó la alerta:</b> ${esc(x.detail.replace(/Base:.*?Verificar:/s,''))}</div></div>`});
      html+='</div>';
    }
    html+='<div class="diag-legend"><b>MALO</b> = existe una inconsistencia del período actual que no se explica. <b>REGULAR</b> = hay señales actuales que requieren indagación. <b>BIEN</b> = no hay inconsistencias principales actuales, aunque puede haber observaciones/correlaciones. <b>EXCELENTE</b> = todas las pruebas disponibles del período actual cuadran.</div></div></section>';
    audit.insertAdjacentHTML('beforeend',html);
  }
  function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(render,1300));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
