/* DIAGNÓSTICO CREDITICIO DEL PERÍODO ACTUAL
   Objetivo: no repetir cálculos ni trasladar el trabajo al usuario.
   Los años anteriores son referencia; solamente el último período genera alertas.
   La documentación adicional se sugiere únicamente cuando una señal actual lo justifica.
*/
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const money=n=>n==null||!Number.isFinite(n)?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(n);
  const pct=n=>n==null||!Number.isFinite(n)?'—':`${n.toFixed(1)}%`;
  const numAfter=(text,label)=>{const m=String(text||'').match(new RegExp(label+'\\s+(-?[\\d.]+(?:,[\\d]+)?)','i'));if(!m)return null;return Number(m[1].replace(/\./g,'').replace(',','.'));};
  const parsePct=(text,label)=>{const m=String(text||'').match(new RegExp(label+'\\s+(-?[\\d.]+(?:,[\\d]+)?)%','i'));if(!m)return null;return Number(m[1].replace(',','.'));};
  function rowsCurrent(){
    const rows=[...document.querySelectorAll('#auditoria tr')].map(tr=>{const c=[...tr.children].map(x=>x.innerText.trim());return {test:c[0]||'',relation:c[1]||'',detail:c[2]||'',result:(c[3]||'').toUpperCase()};}).filter(x=>x.test&&x.result&&x.result!=='RESULTADO'&&x.test!=='PRUEBA');
    const latest=new Map(); rows.forEach(x=>latest.set(norm(x.test),x)); return [...latest.values()];
  }
  function find(items,needle){return items.find(x=>norm(x.test).includes(norm(needle)));}
  function finding(level,title,what,why,check,request,source){return {level,title,what,why,check,request,source};}
  function analyze(items,current){
    const out=[];
    const c=find(items,'clientes');
    if(c){
      const days=numAfter(c.detail,'Días estimados');
      const ratio=parsePct(c.detail,'Clientes/Ventas');
      if(c.result==='INCONSISTENCIA') out.push(finding('ALTA','Clientes ↔ Ventas: inconsistencia matemática',`La prueba del período ${current} no cuadra.`,'La relación entre saldo de clientes y ventas no puede explicarse con los importes disponibles.','Balance: Clientes y Ventas del Estado de Resultados.','Primero revisar el Balance y el total de ventas utilizado por el sistema. No pedir documentación al cliente hasta confirmar el dato contable.','Prueba cruzada Clientes ↔ Ventas'));
      else if(c.result==='PARA INDAGAR'||(days!=null&&days>90)) out.push(finding('MEDIA','Clientes ↔ Ventas: cobranza a revisar',`El plazo implícito calculado es de ${days==null?'más de 90':days.toFixed(1)} días${ratio!=null?` y los clientes representan ${pct(ratio)} de las ventas`:''}.`,'El saldo pendiente de clientes tiene un peso suficientemente alto como para que el sistema no lo considere una relación normal sin explicación.','Balance de Clientes de los 3 años + evolución de ventas + 12 últimos IVA.','Solo si la señal persiste: pedir detalle de deuda de clientes. No pedirlo de entrada si los estados e IVA explican el comportamiento.','Prueba cruzada Clientes ↔ Ventas'));
      else out.push(finding('OK','Clientes ↔ Ventas: no se detecta alerta',`El saldo actual representa ${ratio==null?'una proporción baja':pct(ratio)} de las ventas y el plazo implícito es ${days==null?'bajo o no determinable':days.toFixed(1)+' días'}.`,'No aparece una señal de acumulación de cuentas por cobrar con la información disponible. Esto no demuestra por sí solo que todas las ventas se hayan cobrado.','Comparación de Clientes, Ventas y tendencia de los 3 períodos.','No solicitar documentación adicional por esta prueba.','Prueba cruzada Clientes ↔ Ventas'));
    }
    const inv=find(items,'inventario');
    if(inv){
      const ratio=parsePct(inv.detail,'Inventario/Costo');
      const turn=numAfter(inv.detail,'Rotación aproximada');
      if(inv.result==='PARA INDAGAR'||(turn!=null&&turn<1.5)) out.push(finding('MEDIA','Inventario ↔ Costo: posible acumulación',`El inventario equivale a ${ratio==null?'una proporción elevada':pct(ratio)} del costo de ventas y la rotación aproximada es ${turn==null?'baja':turn.toFixed(2)+'x'}.`,'Una rotación baja puede indicar acumulación, mercadería de lenta salida u otra composición del stock. No significa obsolescencia automáticamente.','Comparar inventario 2023/2024/2025 y ventas/costo de ventas; usar los IVA para confirmar la tendencia de actividad.','Solo si la señal es relevante para el crédito: pedir detalle de inventario. No pedir inventario físico como requisito automático.','Prueba cruzada Inventario ↔ Costo'));
      else out.push(finding('OK','Inventario ↔ Costo: sin señal relevante',`La relación actual (${ratio==null?'sin porcentaje':pct(ratio)}, ${turn==null?'rotación no determinable':turn.toFixed(2)+'x'}) no muestra por sí sola una acumulación extraordinaria.`,'El comportamiento es compatible con una relación operativa que no genera alerta crediticia con los datos disponibles.','Evolución del inventario y costo de ventas en los 3 períodos.','No solicitar documentación adicional por esta prueba.','Prueba cruzada Inventario ↔ Costo'));
    }
    const prov=find(items,'proveedores');
    if(prov){
      const coverage=parsePct(prov.detail,'Cobertura');
      if(prov.result==='INCONSISTENCIA') out.push(finding('ALTA','Proveedores ↔ Compras: movimiento no explicado',`La prueba marca INCONSISTENCIA en ${current}.`,'Las compras reconstruidas y la variación de proveedores no guardan la relación esperada y la diferencia necesita una explicación contable.','Balance: Proveedores y acreedores; Estado de Resultados: Costo de ventas e Inventario.','Primera solicitud adicional: detalle de deuda con proveedores. Con ese detalle se puede separar compras, pagos, anticipos y saldos pendientes.','Prueba cruzada Proveedores ↔ Compras'));
      else if(prov.result==='PARA INDAGAR') out.push(finding('MEDIA','Proveedores ↔ Compras: revisar pagos y deuda',`La cobertura de la variación de proveedores sobre las compras reconstruidas es ${coverage==null?'atípica':pct(coverage)}.`,'La diferencia no demuestra un error porque las compras pueden pagarse durante el año o realizarse al contado, pero el movimiento debe poder explicarse.','Balance de proveedores, costo de ventas e inventario del período actual y anterior.','Si la diferencia afecta materialmente la evaluación: pedir detalle de deuda con proveedores.','Prueba cruzada Proveedores ↔ Compras'));
      else out.push(finding('OK','Proveedores ↔ Compras: sin alerta',`La prueba no presenta una inconsistencia matemática en ${current}.`,'La relación sirve como control de coherencia; la diferencia normal entre compras y deuda pendiente puede explicarse por pagos y condiciones de compra.','Evolución de proveedores, inventario y costo de ventas.','No solicitar documentación adicional por esta prueba.','Prueba cruzada Proveedores ↔ Compras'));
    }
    const debt=find(items,'deuda');
    if(debt){
      const rate=parsePct(debt.detail,'Tasa implícita aproximada');
      if(debt.result==='INCONSISTENCIA'||debt.result==='PARA INDAGAR') out.push(finding(debt.result==='INCONSISTENCIA'?'ALTA':'MEDIA','Deuda ↔ Intereses: costo financiero a explicar',`La relación actual muestra ${rate==null?'una señal que no puede cuantificarse con seguridad':`una tasa implícita aproximada de ${pct(rate)}`}.`,'La tasa calculada no es una tasa contractual. Puede estar afectada por altas y bajas de préstamos, intereses de períodos anteriores o distintas fuentes de financiamiento.','Balance de deuda financiera CP/LP + intereses del Estado de Resultados + evolución 2024/2025.','Si la señal es material: pedir detalle de deuda financiera o referencias bancarias. No pedir contratos de todos los préstamos automáticamente.','Prueba cruzada Deuda ↔ Intereses'));
      else out.push(finding('OK','Deuda ↔ Intereses: sin alerta principal',`La relación de deuda e intereses no presenta una señal suficiente para generar una alerta en ${current}.`,'El costo financiero puede analizarse con los estados disponibles; la tasa implícita es solo una referencia.','Deuda financiera e intereses de los 3 períodos.','No solicitar documentación adicional por esta prueba.','Prueba cruzada Deuda ↔ Intereses'));
    }
    const cash=find(items,'caja');
    if(cash){
      if(cash.result==='INCONSISTENCIA') out.push(finding('ALTA','Caja ↔ Flujo: el movimiento de efectivo no cuadra',`El flujo no explica exactamente la diferencia entre Caja inicial y Caja final de ${current}.`,'Esta es una inconsistencia matemática directa: falta o sobra un movimiento, o existe una diferencia de saldo/clasificación.','Balance: Caja/Bancos inicial y final + Flujo: Variación neta de caja.','Primero revisar el Excel y la clasificación del flujo. Solo si persiste, solicitar una referencia bancaria o conciliación específica; no pedir extractos completos por defecto.','Prueba cruzada Caja ↔ Flujo'));
      else if(cash.result==='PARA INDAGAR') out.push(finding('MEDIA','Caja ↔ Flujo: revisar puente de efectivo',`La variación de caja requiere explicación en ${current}.`,'El movimiento presentado por el flujo no queda plenamente explicado por los saldos de Caja/Bancos.','Caja/Bancos inicial y final y variación neta del flujo.','Revisar internamente primero. Solicitar una comprobación bancaria solo si la diferencia persiste y es material para el crédito.','Prueba cruzada Caja ↔ Flujo'));
      else out.push(finding('OK','Caja ↔ Flujo: conciliado',`La variación de caja del flujo coincide con el cambio entre saldo inicial y final de ${current}.`,'El puente básico de efectivo está matemáticamente cerrado.','Caja/Bancos y variación neta de caja.','No solicitar documentación adicional por esta prueba.','Prueba cruzada Caja ↔ Flujo'));
    }
    const ppe=find(items,'ppe');
    if(ppe){
      if(ppe.result==='INCONSISTENCIA') out.push(finding('MEDIA','Activo fijo ↔ CAPEX: movimiento a explicar','La relación entre activo fijo y flujo no cuadra.','Depreciaciones, bajas, ventas o reclasificaciones pueden explicar diferencias, pero primero debe comprobarse el movimiento registrado.','Activo fijo, depreciaciones y flujo de inversiones/compras.','Si el movimiento es material: manifestación de bienes y/o detalle de activos relevantes, especialmente maquinarias o vehículos.','Prueba cruzada PPE ↔ CAPEX'));
      else out.push(finding('OK','Activo fijo ↔ CAPEX: sin alerta principal','El movimiento actual no presenta una inconsistencia matemática relevante.','Las diferencias explicables por depreciación, bajas o reclasificaciones no deben tratarse automáticamente como errores.','Activo fijo y flujo de inversiones.','No solicitar documentación adicional por esta prueba salvo que el crédito dependa materialmente de esos bienes.','Prueba cruzada PPE ↔ CAPEX'));
    }
    const invfin=find(items,'inversión');
    if(invfin&&invfin.result==='PARA INDAGAR') out.push(finding('MEDIA','Inversión ↔ Financiamiento: destino de fondos','El movimiento de deuda/inversión genera una señal que no puede resolverse solamente con los estados.','Una nueva deuda puede financiar capital de trabajo, activos, refinanciaciones u otros usos. La prueba identifica la fuente, no el destino.','Deuda inicial/final, nuevas deudas y variaciones del activo.','Solo si es material para el crédito: referencia bancaria o manifestación de bienes; no pedir documentación amplia de entrada.','Prueba cruzada Inversión ↔ Financiamiento'));
    return out;
  }
  function grade(findings){
    const high=findings.filter(x=>x.level==='ALTA').length;
    const medium=findings.filter(x=>x.level==='MEDIA').length;
    if(high>=2)return ['MALO','Se detectaron varias inconsistencias o señales de alta importancia en el período actual. Deben explicarse antes de considerar la información plenamente confiable.','g-bad'];
    if(high===1)return ['REGULAR','Existe al menos una inconsistencia relevante en el período actual que requiere comprobación antes de tomar una conclusión crediticia.','g-warn'];
    if(medium>=2)return ['REGULAR','No se detectó necesariamente un error, pero existen varias señales actuales que requieren revisión.','g-warn'];
    if(medium===1)return ['BIEN','La información presenta una señal puntual para revisar, pero no se observan inconsistencias principales generalizadas.','g-good'];
    return ['EXCELENTE','Con la información disponible no se detectan alertas relevantes en las pruebas analizadas del período actual.','g-excellent'];
  }
  function render(){
    const audit=$('auditoria');if(!audit)return;
    const items=rowsCurrent();if(!items.length)return;
    const current=$('ejercicio')?.value||'último período disponible';
    const old=$('diagnosticoAuditoria');if(old)old.remove();
    const findings=analyze(items,current),g=grade(findings);
    const alerts=findings.filter(x=>x.level!=='OK');
    const positives=findings.filter(x=>x.level==='OK');
    let html=`<section class="card" id="diagnosticoAuditoria"><h2>DIAGNÓSTICO CREDITICIO — ${esc(current)}</h2><div class="body"><div class="diag-grade ${g[2]}"><div class="diag-label">CONCLUSIÓN GENERAL DEL PERÍODO ACTUAL</div><div class="diag-value">${esc(g[0])}</div><div>${esc(g[1])}</div><div class="note"><b>Importante:</b> 2023 y 2024 se utilizan como comparación y tendencia. No generan alertas independientes; el diagnóstico se concentra en ${esc(current)}.</div></div>`;
    if(alerts.length){
      html+=`<div class="diag-summary"><b>SE DETECTARON ${alerts.length} SITUACIÓN${alerts.length===1?'':'ES'} PARA REVISAR.</b> El sistema prioriza qué significa cada una y cuál es la comprobación mínima necesaria.</div><div class="diag-list">`;
      alerts.forEach((x,i)=>{html+=`<article class="diag-item actionable"><div class="diag-head"><div><span class="diag-num">${i+1}</span><b>${esc(x.title)}</b></div><span class="priority p-${x.level.toLowerCase()}">${esc(x.level)}</span></div><p><b>Qué detectó el sistema:</b> ${esc(x.what)}</p><p><b>Por qué importa:</b> ${esc(x.why)}</p><p><b>Qué cuentas/datos revisar primero:</b> ${esc(x.check)}</p><p><b>Qué pedir al cliente, solamente si hace falta:</b> ${esc(x.request)}</p><div class="diag-source"><b>Prueba que originó la señal:</b> ${esc(x.source)}</div></article>`});
      html+='</div>';
    } else html+='<div class="diag-ok"><b>NO SE DETECTARON ALERTAS RELEVANTES EN EL PERÍODO ACTUAL.</b><br>El sistema no encuentra una inconsistencia que justifique pedir documentación adicional con las pruebas disponibles.</div>';
    html+=`<div class="diag-section"><h3>LO QUE EL SISTEMA CONSIDERA CORRECTO</h3><div class="positive-list">${positives.map(x=>`<div><b>✓ ${esc(x.title)}</b><br>${esc(x.what)}</div>`).join('')}</div></div>`;
    html+=`<div class="diag-section"><h3>REGLA DE DOCUMENTACIÓN</h3><p class="diag-policy"><b>Primero se analiza lo que ya está cargado.</b> El sistema no debe pedir documentos para demostrar una situación que los estados financieros ya permiten considerar razonable. Solo propone documentación adicional cuando una señal actual no puede resolverse con Balance, Estado de Resultados, 12 últimos IVA y 2 últimas rentas.</p><p class="diag-policy"><b>Documentación adicional disponible:</b> detalle de deuda con proveedores, referencias de proveedores/entidades bancarias y manifestación de bienes (títulos, vehículos, maquinarias), únicamente cuando la alerta lo justifique.</p></div>`;
    html+=`<div class="diag-legend"><b>MALO</b> = inconsistencias relevantes actuales. <b>REGULAR</b> = varias señales o una inconsistencia importante. <b>BIEN</b> = sin inconsistencias principales, con alguna señal puntual posible. <b>EXCELENTE</b> = sin alertas relevantes con la información disponible.</div></div></section>`;
    audit.insertAdjacentHTML('beforeend',html);
  }
  function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(render,1500));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
