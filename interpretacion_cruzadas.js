/* LECTURA SIMPLE DE PRUEBAS CRUZADAS
   Convierte la tabla técnica del período actual en una lectura orientada a decisión.
   No cambia los cálculos: cambia la forma de explicarlos.
*/
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const money=s=>String(s??'').replace(/·/g,' · ');
  function explanation(test,result,detail){
    const n=norm(test), r=norm(result);
    if(n.includes('clientes')&&n.includes('ventas')) return {
      title:'Clientes y ventas',
      question:'¿La empresa está vendiendo y cobrando normalmente?',
      meaning:r==='correlación'?'El saldo de clientes es pequeño frente a las ventas del período. Eso, por sí solo, no muestra un problema. Lo importante es comprobar si existen clientes atrasados o si cambió el plazo de cobro respecto de años anteriores.':'La relación requiere revisión porque el comportamiento de los créditos de clientes merece explicación.',
      action:'Revisar el listado de clientes, antigüedad de saldos y cobranzas posteriores al cierre. Si los saldos son recientes y se cobran normalmente, la señal pierde importancia.',
      level:r==='correlación'?'SIN ALERTA':'REVISAR'
    };
    if(n.includes('inventario')&&n.includes('costo')) return {
      title:'Inventario y costo de ventas',
      question:'¿Hay mercadería acumulada o inmovilizada?',
      meaning:r==='correlación'?'El inventario equivale a una parte del costo de ventas y la relación se mantiene como una señal de análisis, no como un error contable. Lo importante es saber si el stock realmente existe y puede venderse.':'La relación requiere revisar el inventario del período actual.',
      action:'Comprobar inventario físico, productos sin movimiento, obsolescencia, ajustes y criterio de valuación.',
      level:r==='correlación'?'SIN ALERTA':'REVISAR'
    };
    if(n.includes('proveedores')&&n.includes('compras')) return {
      title:'Proveedores y compras',
      question:'¿Las compras y las deudas con proveedores tienen una explicación?',
      meaning:'Las compras reconstruidas no tienen que ser iguales a la variación de proveedores. Una parte puede haberse pagado, comprado al contado o registrado como anticipo. Por eso esta prueba no demuestra un error por sí sola.',
      action:'Revisar proveedores iniciales y finales, pagos realizados, compras al contado, anticipos y acreedores relacionados. El objetivo es poder explicar el movimiento.',
      level:r==='inconsistencia'?'REVISAR':'CONTROLAR'
    };
    if(n.includes('deuda')&&n.includes('intereses')) return {
      title:'Deudas e intereses',
      question:'¿El costo financiero es razonable para la deuda que tuvo la empresa?',
      meaning:r==='para indagar'?'Hay intereses que necesitan una explicación específica frente al nivel de deuda informado. Puede haber préstamos cancelados durante el año, intereses devengados u otra fuente de financiamiento.':'La relación sirve para controlar si el gasto financiero guarda una proporción razonable con la deuda.',
      action:'Revisar contratos, tasas, préstamos vigentes y cancelados, movimientos bancarios e intereses devengados. No tomar la tasa calculada como tasa contractual.',
      level:r==='para indagar'?'REVISAR':'SIN ALERTA'
    };
    if(n.includes('caja')&&n.includes('flujo')) return {
      title:'Caja y flujo de fondos',
      question:'¿El movimiento de efectivo que muestra el flujo coincide con la caja real?',
      meaning:r==='conciliado'?'La variación de caja del flujo coincide con la diferencia entre el saldo inicial y final. Esta parte está matemáticamente controlada.':'El flujo no explica correctamente el cambio entre caja inicial y caja final. Es una alerta importante porque hay que localizar qué movimiento falta o está mal clasificado.',
      action:r==='conciliado'?'Mantener como control realizado y verificar las conciliaciones bancarias si el análisis general las requiere.':'Revisar Caja y Bancos de ambos cierres, conciliaciones bancarias y cada ingreso/egreso incluido en el flujo.',
      level:r==='conciliado'?'BIEN':'ALTA'
    };
    if(n.includes('ppe')||n.includes('activo fijo')) return {
      title:'Activo fijo e inversiones',
      question:'¿Las inversiones en activos tienen una explicación?',
      meaning:'El aumento del activo fijo no necesariamente coincide con las compras de activos del flujo. Depreciaciones, ventas, bajas o reclasificaciones pueden explicar la diferencia.',
      action:'Revisar registro de activo fijo, facturas de compras, bajas/ventas, depreciaciones y activos adquiridos mediante financiación.',
      level:r==='conciliado'?'BIEN':'REVISAR'
    };
    if(n.includes('inversión')&&n.includes('financiamiento')) return {
      title:'Inversión y financiamiento',
      question:'¿Se puede explicar de dónde salió el dinero y en qué se utilizó?',
      meaning:'El aumento o reducción de la deuda muestra una posible fuente de fondos, pero no demuestra por sí solo el destino del dinero.',
      action:'Cruzar nuevas deudas con caja, inversiones, activo fijo y demás usos de fondos. Buscar contratos y desembolsos.',
      level:r==='correlación'?'CONTROLAR':'REVISAR'
    };
    return {
      title:test,
      question:'¿Qué debo comprobar?',
      meaning:'La prueba requiere interpretar las cuentas que intervienen y no debe considerarse un error solamente por mostrar una diferencia o correlación.',
      action:'Revisar los saldos y movimientos que originan la relación y solicitar el detalle auxiliar correspondiente.',
      level:r==='inconsistencia'?'ALTA':'CONTROLAR'
    };
  }
  function build(){
    const audit=$('auditoria'); if(!audit)return;
    const tables=[...audit.querySelectorAll('table')].filter(t=>norm(t.innerText).includes('clientes')&&norm(t.innerText).includes('ventas'));
    if(!tables.length)return;
    const table=tables[tables.length-1];
    if(table.dataset.simpleReady==='1')return;
    const rows=[...table.querySelectorAll('tr')].map(tr=>{const c=[...tr.children].map(x=>x.innerText.trim());return {test:c[0]||'',relation:c[1]||'',detail:c[2]||'',result:c[3]||''};}).filter(x=>x.test&&!/prueba/i.test(x.test)&&x.result);
    if(!rows.length)return;
    const current=$('ejercicio')?.value||'período actual';
    const wrap=document.createElement('section');
    wrap.className='card simple-cross';
    wrap.innerHTML=`<h2>LECTURA EN LENGUAJE SIMPLE — PRUEBAS CRUZADAS ${esc(current)}</h2><div class="body"><div class="simple-intro"><b>¿Cómo leer esta sección?</b> No busca decir solamente si una cuenta aumentó o disminuyó. Busca responder <b>qué relación hay entre las cuentas, si esa relación es normal o merece revisión y exactamente qué deberías comprobar.</b> Los años anteriores se usan como referencia; la alerta se concentra en ${esc(current)}.</div><div class="simple-grid"></div><details class="technical"><summary>Ver cálculos y detalle técnico</summary><div class="technical-slot"></div></details></div></section>`;
    const grid=wrap.querySelector('.simple-grid');
    rows.forEach(x=>{const e=explanation(x.test,x.result,x.detail);const card=document.createElement('article');card.className='simple-item';card.innerHTML=`<div class="simple-head"><h3>${esc(e.title)}</h3><span class="simple-level level-${norm(e.level).replace(/\s/g,'-')}">${esc(e.level)}</span></div><div class="simple-question"><b>Pregunta que responde:</b> ${esc(e.question)}</div><p><b>En palabras simples:</b> ${esc(e.meaning)}</p><p><b>Qué tenés que revisar:</b> ${esc(e.action)}</p><div class="simple-number"><b>Dato calculado:</b> ${esc(money(x.detail.split('Base:')[0]))}<span class="result-chip">Resultado técnico: ${esc(x.result)}</span></div></article>`;grid.appendChild(card);});
    wrap.querySelector('.technical-slot').appendChild(table.cloneNode(true));
    table.style.display='none'; table.dataset.simpleReady='1';
    const parent=table.parentElement;
    parent.insertBefore(wrap,table);
  }
  function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(build,1800));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
