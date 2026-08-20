/* AUDITORIA DE COHERENCIA FINANCIERA - UI EJECUTIVA
   La pantalla se centra exclusivamente en el ultimo periodo disponible.
   Los periodos anteriores se procesan internamente para calcular variaciones,
   pero NO se muestran como periodos de hallazgo ni como fichas historicas.
*/
(function(){
  const money=n=>n==null?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n));
  const pct=n=>n==null?'—':Number(n).toFixed(1)+'%';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const get=()=>{try{return(typeof NORMALIZED!=='undefined'?NORMALIZED:null)||window.NORMALIZED||{}}catch(_){return window.NORMALIZED||{}}};

  function currentPeriod(data){
    const p=[...(data?.balance?.periods||[]),...(data?.resultados?.periods||[]),...(data?.flujo?.periods||[])]
      .map(String).filter(x=>/^\d{4}$/.test(x));
    return [...new Set(p)].sort().at(-1)||null;
  }

  function run(){
    const host=document.getElementById('auditoria');
    if(!host||host.classList.contains('hidden'))return;
    const data=get();
    if(!data?.balance&&!data?.resultados)return;
    if(!window.MotorCoherenciaFinanciera?.ejecutar)return;
    const result=window.MotorCoherenciaFinanciera.ejecutar(data);
    const actual=result.actual||currentPeriod(data);
    if(!actual)return;

    const hallazgos=Array.isArray(result.hallazgos)?result.hallazgos:[];
    const crit=hallazgos.filter(x=>x.nivel==='crit');
    const imp=hallazgos.filter(x=>x.nivel==='imp');
    const warn=hallazgos.filter(x=>x.nivel==='warn');
    const ok=hallazgos.filter(x=>x.nivel==='info'||x.nivel==='ok');
    const corr=hallazgos.filter(x=>/Cartera|Inventarios|Proveedores|Ventas|Activos|Pasivo|Margen/.test(x.titulo));
    const direct=hallazgos.filter(x=>!corr.includes(x));

    const card=x=>`<article class="audit-item ${esc(x.nivel||'info')}">
      <div class="audit-title">${esc(x.titulo)}</div>
      <div class="audit-label">SITUACION ACTUAL</div>
      <div class="audit-reading">${esc(x.interpretacion||'')}</div>
      <div class="audit-test"><b>PRUEBA:</b> ${esc(x.formula||'')}</div>
      <div class="audit-values"><b>EVIDENCIA:</b> ${formatValues(x.valores)}</div>
    </article>`;

    const formatValues=obj=>{
      if(!obj||typeof obj!=='object')return '';
      const labels={periodo_actual:'Periodo actual',activo:'Activo',pasivo:'Pasivo',patrimonio:'Patrimonio neto',activo_corriente:'Activo corriente',pasivo_corriente:'Pasivo corriente',liquidez:'Liquidez',endeudamiento_pct:'Endeudamiento',ventas:'Ventas',ventas_actuales:'Ventas actuales',costo_ventas:'Costo de ventas',resultado_bruto:'Resultado bruto',resultado_bruto_esperado:'Resultado bruto esperado',ebitda:'EBITDA',margen_ebitda_pct:'Margen EBITDA',ebit:'EBIT',intereses:'Intereses',cobertura:'Cobertura',resultado_neto:'Resultado neto',margen_neto_pct:'Margen neto',inventario_actual:'Inventarios actuales',credito_actual:'Créditos actuales',creditos_actuales:'Créditos actuales',proveedores_actuales:'Proveedores actuales',variacion_ventas_pct:'Variación ventas',variacion_creditos_pct:'Variación créditos',variacion_inventario_pct:'Variación inventarios',variacion_proveedores_pct:'Variación proveedores',brecha_puntos:'Brecha',margen_actual_pct:'Margen actual',margen_antecedente_pct:'Margen antecedente',cambio_puntos:'Cambio'};
      return Object.entries(obj).filter(([k])=>k!=='periodo_actual').map(([k,v])=>{
        if(v==null||typeof v==='object')return null;
        const label=labels[k]||k.replace(/_/g,' ');
        const isPct=/pct|puntos|endeudamiento/.test(k);
        return `<span><b>${esc(label)}:</b> ${isPct?pct(v):money(v)}</span>`;
      }).filter(Boolean).join(' · ');
    };

    const conclusion=buildConclusion(data,result,actual);
    const html=`<section class="card audit-section">
      <h2>4. AUDITORÍA DE COHERENCIA FINANCIERA</h2>
      <div class="audit-summary">
        <div><span>CRÍTICAS</span><b>${crit.length}</b></div>
        <div><span>IMPORTANTES</span><b>${imp.length}</b></div>
        <div><span>PARA INDAGAR</span><b>${warn.length}</b></div>
        <div><span>CONCILIADAS / FAVORABLES</span><b>${ok.length}</b></div>
        <div><span>PERÍODO ACTUAL</span><b>${esc(actual)}</b></div>
      </div>
      <div class="audit-current"><b>LECTURA EJECUTIVA DEL PERÍODO ${esc(actual)}</b><br>
        Todos los períodos disponibles fueron utilizados para medir evolución. La interpretación y las conclusiones se concentran en la situación financiera del período actual.
      </div>
      <section class="audit-block"><h3>A. INCONSISTENCIAS Y SEÑALES CRÍTICAS</h3>${crit.length?crit.map(card).join(''):'<div class="audit-empty">No se detectaron inconsistencias críticas en el período actual.</div>'}</section>
      <section class="audit-block"><h3>B. HALLAZGOS IMPORTANTES</h3>${imp.length?imp.map(card).join(''):'<div class="audit-empty">No se detectaron hallazgos importantes en el período actual.</div>'}</section>
      <section class="audit-block"><h3>C. CORRELACIONES FINANCIERAS</h3>${corr.length?corr.map(card).join(''):'<div class="audit-empty">No se detectaron correlaciones materiales en el período actual.</div>'}</section>
      <section class="audit-block"><h3>D. EVOLUCIÓN DEL PERÍODO ACTUAL</h3>${warn.length?warn.map(card).join(''):'<div class="audit-empty">No se detectaron deterioros o señales para indagar en el período actual.</div>'}</section>
      <section class="audit-block"><h3>E. CONCLUSIÓN INTEGRADA</h3><div class="audit-conclusion">${esc(conclusion)}</div></section>
    </section>`;

    host.innerHTML=html;
    host.classList.remove('hidden');
  }

  function buildConclusion(data,result,actual){
    const b=data?.balance,r=data?.resultados;
    const v=(d,k)=>d?.matched?.[k]?.values?.[actual]??null;
    const ventas=v(r,'ventas'),bruto=v(r,'resultado_bruto'),ebitda=v(r,'ebitda'),neto=v(r,'resultado_neto'),intereses=v(r,'intereses_gasto');
    const activo=v(b,'total_activo'),pasivo=v(b,'total_pasivo'),patrimonio=v(b,'total_patrimonio'),ac=v(b,'total_activo_corriente'),pc=v(b,'total_pasivo_corriente'),inv=v(b,'inventarios'),cli=v(b,'creditos_ventas'),prov=v(b,'proveedores');
    const parts=[];
    if(ventas!=null)parts.push(`En ${actual}, las ventas alcanzan ${money(ventas)}.`);
    if(ebitda!=null){
      parts.push(ebitda<0?`La principal señal de atención se encuentra en la generación operativa, ya que el EBITDA es negativo por ${money(Math.abs(ebitda))}.`:`La generación operativa presenta un EBITDA de ${money(ebitda)}.`);
    }
    if(bruto!=null&&ventas){const m=bruto/ventas*100;parts.push(`El margen bruto se ubica en ${m.toFixed(1)}%, por lo que la capacidad de absorber gastos operativos y financieros debe evaluarse a partir de ese nivel de resultado comercial.`);}
    if(ac!=null&&pc){const liq=ac/pc;parts.push(liq<1?`La liquidez corriente es ${liq.toFixed(2)}x, inferior a la unidad, configurando una presión relevante sobre las obligaciones de corto plazo.`:`La liquidez corriente alcanza ${liq.toFixed(2)}x y debe interpretarse considerando la composición de los activos corrientes.`);}
    if(activo&&pasivo!=null){const e=pasivo/activo*100;parts.push(`El pasivo representa ${e.toFixed(1)}% del activo, por lo que la estructura de financiamiento ${e>=70?'presenta una dependencia elevada de terceros':'debe analizarse en conjunto con la generación operativa y el patrimonio'}.`);}
    if(inv!=null&&ventas!=null)parts.push(`Los inventarios ascienden a ${money(inv)} y deben contrastarse con el nivel actual de ventas para determinar si existe inmovilización excesiva o una utilización razonable del stock.`);
    if(cli!=null&&ventas!=null)parts.push(`Los créditos comerciales alcanzan ${money(cli)}; su evolución frente a las ventas es relevante para evaluar la realización del capital de trabajo.`);
    if(prov!=null)parts.push(`Los proveedores totalizan ${money(prov)}, por lo que su peso dentro del financiamiento operativo debe relacionarse con la liquidez y el ciclo de pagos.`);
    if(intereses!=null&&intereses>0&&ebitda!=null)parts.push(`La cobertura EBITDA/intereses resulta de ${(ebitda/intereses).toFixed(2)}x, constituyendo un elemento central para evaluar la capacidad actual de servicio financiero.`);
    if(neto!=null)parts.push(neto<0?`El período actual termina con pérdida de ${money(Math.abs(neto))}, lo que refuerza la necesidad de identificar el componente que explica el resultado final.`:`El período actual presenta resultado neto positivo de ${money(neto)}, aunque su calidad debe analizarse conjuntamente con la generación operativa.`);
    if(!parts.length)return `No existen datos suficientes para formular una conclusión integrada del período ${actual}.`;
    return parts.join(' ')+` En conjunto, la evaluación del período ${actual} debe priorizar las relaciones que puedan afectar la capacidad de generación de recursos, liquidez, financiamiento y sostenibilidad del resultado. Los períodos anteriores fueron utilizados como referencia de cálculo, pero no constituyen el objeto principal de esta conclusión.`;
  }

  function observe(){
    const app=document.getElementById('app');if(!app)return;
    const obs=new MutationObserver(()=>setTimeout(run,120));obs.observe(app,{childList:true,subtree:true});
    setTimeout(run,300);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe);else observe();
})();
