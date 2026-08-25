/* CAPA DE DIAGNÓSTICO - no reemplaza las pruebas; interpreta sus resultados.
   Objetivo: decir QUÉ revisar, POR QUÉ, DÓNDE buscar y dar una lectura general.
*/
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const rules={
    'clientes ↔ ventas':{
      title:'Clientes / Ventas: revisar plazo de cobranza',
      why:'El saldo de clientes representa una proporción elevada de las ventas o aumentó frente al período anterior. Esto puede significar mayor plazo de venta, acumulación de saldos, crecimiento genuino del negocio o cobranzas atrasadas.',
      check:'Balance: Créditos comerciales / Clientes. Estado de Resultados: Ventas netas. También comparar con cobranzas posteriores al cierre.',
      evidence:'Antigüedad de saldos, listado de clientes, condiciones de crédito, cobranzas de enero-marzo siguiente y notas de crédito.'
    },
    'inventario ↔ costo de ventas':{
      title:'Inventario / Costo: revisar rotación y existencia',
      why:'La relación permite detectar inventario elevado o una variación fuerte respecto del período anterior. Una rotación baja puede indicar stock inmovilizado; una muy alta puede ser normal o requerir revisar si el saldo de cierre está completo.',
      check:'Balance: Inventarios. Estado de Resultados: Costo de ventas. Comparar además con compras y movimiento físico.',
      evidence:'Inventario físico, antigüedad/obsolescencia, compras, bajas, ajustes y criterio de valuación.'
    },
    'proveedores ↔ compras reconstruidas':{
      title:'Proveedores / Compras: explicar el movimiento de cuentas por pagar',
      why:'Las compras reconstruidas no tienen que coincidir con la variación de proveedores. La diferencia puede provenir de pagos, compras al contado, anticipos, cambios de plazo o acreedores no incluidos. Lo importante es explicar el puente.',
      check:'Balance: Proveedores, anticipos y acreedores. Estado de Resultados: Costo de ventas. Si existe, revisar el detalle de compras y pagos.',
      evidence:'Mayor de proveedores, listado de facturas, pagos, compras al contado, anticipos y movimientos de acreedores varios.'
    },
    'deuda ↔ intereses':{
      title:'Deuda / Intereses: verificar costo financiero real',
      why:'La tasa implícita es una señal, no una tasa contractual. Si hay intereses con poca deuda al cierre, puede existir deuda cancelada durante el año, intereses devengados de períodos anteriores u otra fuente de financiamiento.',
      check:'Balance: Deudas financieras CP y LP. Estado de Resultados: Intereses financieros pagados. Revisar también movimientos de deuda durante el ejercicio.',
      evidence:'Contratos, cronogramas, extractos bancarios, desembolsos, cancelaciones, tasas, intereses devengados y préstamos con socios.'
    },
    'caja ↔ flujo de fondos':{
      title:'Caja / Flujo: comprobar el puente de efectivo',
      why:'La caja final menos la caja inicial debe explicar la variación neta de caja del flujo. Si no coincide, hay que determinar si el problema está en saldos bancarios, efectivo omitido o en la confección del flujo.',
      check:'Balance: Caja y Bancos de ambos cierres. Flujo: Variación neta de caja. Revisar conciliaciones bancarias.',
      evidence:'Extractos bancarios, conciliaciones, saldos iniciales/finales y composición de ingresos y egresos de efectivo.'
    },
    'ppe ↔ capex ↔ financiamiento':{
      title:'Activo fijo / CAPEX: explicar las altas y bajas',
      why:'El aumento del activo fijo no necesariamente equivale al CAPEX del flujo: pueden intervenir depreciaciones, ventas, bajas, reclasificaciones o adquisiciones financiadas directamente.',
      check:'Balance: Activo fijo bruto y depreciación acumulada. Flujo: inversiones/compras de activo fijo y ventas de activo fijo.',
      evidence:'Registro de activo fijo, facturas de compras, ventas/bajas, depreciaciones y contratos de financiación de activos.'
    },
    'inversión ↔ fuentes de financiamiento':{
      title:'Inversión / Financiamiento: determinar el destino del dinero',
      why:'Una nueva deuda identifica una posible fuente de fondos, pero no demuestra por sí sola dónde se utilizó. Si el endeudamiento cambia mucho, debe buscarse el destino económico.',
      check:'Balance: deuda financiera CP/LP. Flujo: nuevas deudas y aplicaciones de inversión. Cruzar con activo fijo, inversiones y caja.',
      evidence:'Contratos de préstamos, desembolsos, extractos, facturas de inversiones y conciliación del destino de los fondos.'
    },
    'ecuación patrimonial':{
      title:'Ecuación patrimonial: localizar la diferencia',
      why:'Activo debe ser igual a Pasivo + Patrimonio. Una diferencia real indica que alguna cuenta, total o signo está mal informado o falta una partida.',
      check:'Balance: Total Activo, Total Pasivo y Patrimonio Neto; luego revisar subtotales que forman esos tres totales.',
      evidence:'Balance original, sumatoria de cuentas y asiento/saldo que explique la diferencia.'
    },
    'composición del patrimonio':{
      title:'Patrimonio: verificar sus componentes',
      why:'Capital + reservas + resultados debe explicar el Patrimonio Neto. Si no coincide, revisar reclasificaciones, resultados acumulados, capitalizaciones y reservas.',
      check:'Balance: Capital, reservas, resultados acumulados, resultado del ejercicio y Patrimonio Neto.',
      evidence:'Estado de evolución del patrimonio, actas de capitalización, distribución de resultados y movimientos de reservas.'
    },
    'resultado del ejercicio':{
      title:'Resultado neto: verificar impuesto y resultado',
      why:'Resultado antes de impuesto menos impuesto a la renta debe llegar al resultado neto. Si no coincide, existe una diferencia que debe localizarse.',
      check:'Estado de Resultados: Resultado antes de impuesto, Impuesto a la renta y Resultado neto.',
      evidence:'Declaración/liquidación del impuesto, conciliación fiscal y Estado de Resultados.'
    },
    'resultado bruto':{
      title:'Resultado bruto: verificar ventas y costo',
      why:'Ventas netas menos costo de ventas debe explicar el resultado bruto. Una diferencia apunta a clasificación, importe o signo.',
      check:'Estado de Resultados: Ventas netas, Costo de ventas y Resultado bruto.',
      evidence:'Libro de ventas, compras/costo, inventarios y conciliación del costo de ventas.'
    },
    'ebitda':{
      title:'EBITDA: verificar gastos operativos incluidos',
      why:'La prueba busca explicar el EBITDA desde el resultado bruto y los gastos operativos. Revisar especialmente qué gastos fueron considerados operativos.',
      check:'Estado de Resultados: Resultado bruto, gastos operativos y EBITDA.',
      evidence:'Detalle de gastos, criterios de clasificación y conciliación con el resultado operativo.'
    },
    'ebit':{
      title:'EBIT: verificar depreciaciones',
      why:'EBITDA menos depreciaciones/amortizaciones debe explicar el EBIT. Si no coincide, revisar depreciaciones o clasificación de gastos.',
      check:'Estado de Resultados: EBITDA, depreciaciones/amortizaciones y EBIT.',
      evidence:'Registro de activo fijo, vida útil, depreciaciones y movimientos de activos.'
    },
    'resultado antes de impuesto':{
      title:'Resultado antes de impuesto: explicar resultado financiero y no operativo',
      why:'El EBIT debe llegar al resultado antes de impuesto después de intereses, diferencias de cambio y otros resultados. La diferencia puede estar en una cuenta omitida o mal clasificada.',
      check:'Estado de Resultados: EBIT, intereses, diferencia de cambio, otros ingresos/egresos y resultado antes de impuesto.',
      evidence:'Detalle de resultados financieros/no operativos y comprobantes de intereses y diferencia de cambio.'
    }
  };
  function getRule(label){const n=norm(label);return Object.entries(rules).find(([k])=>n.includes(k))?.[1]||null;}
  function collect(){
    const rows=[...document.querySelectorAll('#auditoria tr')];
    return rows.map(tr=>{const cells=[...tr.children].map(x=>x.innerText.trim());return {test:cells[0]||'',detail:cells[2]||'',result:(cells[3]||'').toUpperCase()};}).filter(x=>x.result);
  }
  function grade(items){
    const bad=items.filter(x=>x.result==='INCONSISTENCIA').length;
    const investigate=items.filter(x=>x.result==='PARA INDAGAR').length;
    const obs=items.filter(x=>x.result==='OBSERVACIÓN').length;
    const corr=items.filter(x=>x.result==='CORRELACIÓN').length;
    if(bad)return {name:'MALO',text:'Hay inconsistencias matemáticas o contables que deben resolverse antes de considerar la información plenamente coherente.',cls:'g-bad'};
    if(investigate)return {name:'REGULAR',text:'No se detecta necesariamente un error, pero existen señales concretas que requieren verificación documental o explicación gerencial.',cls:'g-warn'};
    if(obs)return {name:'BIEN',text:'Las relaciones principales cuadran, aunque existen aspectos de presentación o evolución que requieren interpretación.',cls:'g-good'};
    if(corr)return {name:'BIEN',text:'Las pruebas matemáticas no muestran inconsistencias relevantes; varias relaciones son correlativas y deben interpretarse con la información del negocio.',cls:'g-good'};
    return {name:'EXCELENTE',text:'Las pruebas disponibles cuadran y no quedaron señales relevantes pendientes de explicación.',cls:'g-excellent'};
  }
  function render(){
    const audit=$('auditoria');if(!audit)return;
    const items=collect();if(!items.length)return;
    const old=$('diagnosticoAuditoria');if(old)old.remove();
    const g=grade(items);
    const alerts=items.filter(x=>['PARA INDAGAR','INCONSISTENCIA','OBSERVACIÓN'].includes(x.result));
    let html=`<section class="card" id="diagnosticoAuditoria"><h2>DIAGNÓSTICO E INTERPRETACIÓN</h2><div class="body"><div class="diag-grade ${g.cls}"><div class="diag-label">LECTURA GENERAL</div><div class="diag-value">${g.name}</div><div>${esc(g.text)}</div></div>`;
    if(!alerts.length){html+='<div class="diag-ok"><b>No quedaron alertas específicas.</b><br>Las pruebas disponibles no muestran diferencias que requieran una revisión adicional.</div>'}
    else{
      html+='<h3>QUÉ DEBE INDAGARSE</h3><div class="diag-list">';
      alerts.forEach((x,i)=>{const r=getRule(x.test);const priority=x.result==='INCONSISTENCIA'?'ALTA':x.result==='PARA INDAGAR'?'MEDIA':'BAJA';html+=`<div class="diag-item"><div class="diag-head"><b>${i+1}. ${esc(r?.title||x.test)}</b><span class="priority">${priority}</span></div><div class="diag-result">Resultado detectado: <b>${esc(x.result)}</b></div><div><b>Qué significa:</b> ${esc(r?.why||'La relación requiere una explicación adicional con los saldos y movimientos que la originan.')}</div><div><b>Qué cuentas revisar:</b> ${esc(r?.check||'Revisar las cuentas que intervienen directamente en la prueba y sus movimientos del período.')}</div><div><b>Qué pedir o comprobar:</b> ${esc(r?.evidence||'Solicitar el detalle auxiliar que permita explicar el movimiento.')}</div><div class="diag-detail"><b>Dato que disparó la alerta:</b> ${esc(x.detail.replace(/Base:.*?Verificar:/s,''))}</div></div>`});
      html+='</div>';
    }
    html+='<div class="diag-legend"><b>MALO</b> = existe una inconsistencia que no se explica con la relación evaluada. <b>REGULAR</b> = hay señales que requieren indagación. <b>BIEN</b> = no hay inconsistencias principales, aunque puede haber observaciones/correlaciones. <b>EXCELENTE</b> = todas las pruebas disponibles cuadran sin alertas relevantes.</div></div></section>';
    audit.insertAdjacentHTML('beforeend',html);
  }
  function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(render,900));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
