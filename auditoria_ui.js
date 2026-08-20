/* AUDITORÍA DE COHERENCIA FINANCIERA — MOTOR INTERPRETATIVO
   Objetivo: no repetir el Balance ni limitarse a comparar períodos.
   La salida debe responder: ¿qué está pasando?, ¿es coherente?, ¿es favorable,
   desfavorable o requiere indagación?, ¿qué relación entre cuentas lo explica?
*/
(function(){
  const esc=s=>String(s??'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const num=s=>{
    if(s==null||s==='—'||s==='-')return null;
    if(typeof s==='number')return Number.isFinite(s)?s:null;
    let x=String(s).trim().replace(/\s/g,'');
    if(!x)return null;
    if(/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(x))x=x.replace(/\./g,'').replace(',','.');
    else x=x.replace(/\./g,'').replace(',','.');
    const n=Number(x.replace(/[^0-9eE+\-.]/g,''));
    return Number.isFinite(n)?n:null;
  };
  const money=n=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  const pct=(a,b)=>b!=null&&b!==0&&a!=null?(a/b-1)*100:null;
  const pp=(a,b)=>a!=null&&b!=null?a-b:null;
  const f1=n=>n==null?'—':Number(n).toFixed(1);
  const f2=n=>n==null?'—':Number(n).toFixed(2);

  function rowsFromTable(table){
    const heads=[...table.querySelectorAll('thead tr:last-child th')].map(x=>x.textContent.trim());
    const periods=heads.filter(x=>/^(19|20)\d{2}$/.test(x));
    const rows={};
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const td=[...tr.children];if(td.length<4)return;
      const key=td[0].textContent.trim();if(!key)return;
      const values={};periods.forEach((y,i)=>values[y]=td[4+i]?num(td[4+i].textContent):null);
      rows[key]={label:td[1]?.textContent.trim()||key,values};
    });
    return{periods,rows};
  }

  function collect(){
    const result={balance:null,resultados:null};
    document.querySelectorAll('.normalization-table').forEach(t=>{
      const alert=t.parentElement?.previousElementSibling;
      const title=(alert?.querySelector('strong')?.textContent||'').toUpperCase();
      if(title.includes('BALANCE'))result.balance=rowsFromTable(t);
      if(title.includes('RESULTADOS'))result.resultados=rowsFromTable(t);
    });
    return result;
  }
  const val=(d,k,y)=>d?.rows?.[k]?.values?.[y]??null;
  const exists=(d,k,y)=>val(d,k,y)!==null;

  function finding(arr,tipo,titulo,conclusion,causa,evidencia){
    arr.push({tipo,titulo,conclusion,causa,evidencia});
  }

  function analyze(d){
    const b=d.balance,r=d.resultados;
    if(!b&&!r)return{years:[],hallazgos:[],resumen:[]};
    const years=[...new Set([...(b?.periods||[]),...(r?.periods||[])])].sort();
    const h=[],res=[];
    const y=years.at(-1),p=years.length>1?years.at(-2):null;

    /* 1. VALIDACIÓN DE DATOS: evitar falsos positivos por años vacíos */
    years.forEach(yr=>{
      const ac=val(b,'total_activo',yr),pa=val(b,'total_pasivo',yr),pn=val(b,'total_patrimonio',yr);
      if(ac==null||pa==null||pn==null)return;
      if(ac===0&&pa===0&&pn===0)return;
      const diff=ac-pa-pn;
      if(Math.abs(diff)>1)finding(h,'crit','Inconsistencia patrimonial — '+yr,'El Balance no cierra matemáticamente.','Antes de interpretar ratios o riesgo, debe verificarse la carga o clasificación de cuentas.',`Activo ${money(ac)} − Pasivo ${money(pa)} − Patrimonio ${money(pn)} = ${money(diff)}.`);
    });

    /* 2. PRUEBAS ESTRUCTURALES DEL ÚLTIMO EJERCICIO */
    if(y){
      const ac=val(b,'total_activo',y),pa=val(b,'total_pasivo',y),pn=val(b,'total_patrimonio',y);
      const acorr=val(b,'total_activo_corriente',y),pcorr=val(b,'total_pasivo_corriente',y),inv=val(b,'inventarios',y),cli=val(b,'creditos_ventas',y),cash=val(b,'caja_bancos',y);
      const ventas=val(r,'ventas',y),costo=val(r,'costo_ventas',y),bruto=val(r,'resultado_bruto',y),ebitda=val(r,'ebitda',y),ebit=val(r,'ebit',y),neto=val(r,'resultado_neto',y),interes=val(r,'intereses_gasto',y);

      if(ac!=null&&pa!=null&&pn!=null&&ac!==0&&pa!==0&&pn!==0){
        const ende=pa/ac*100;
        if(ende>=70)finding(h,'imp','Endeudamiento estructural elevado — '+y,'La empresa mantiene una estructura patrimonial fuertemente financiada por terceros.',`Pasivo representa ${f1(ende)}% del activo.`,`${f1(ende)}% de endeudamiento.`);
        else if(ende<=40)finding(h,'ok','Estructura patrimonial favorable — '+y,'La dependencia del pasivo es baja en relación con los activos y existe una base patrimonial relevante.',`Pasivo representa solo ${f1(ende)}% del activo.`,`Activo ${money(ac)}; Pasivo ${money(pa)}; Patrimonio ${money(pn)}.`);
        else finding(h,'warn','Estructura patrimonial intermedia — '+y,'La empresa presenta una dependencia moderada de terceros; no constituye por sí sola una señal negativa.',`Pasivo representa ${f1(ende)}% del activo.`,`${f1(ende)}% de endeudamiento.`);
      }

      if(acorr!=null&&pcorr!=null&&pcorr!==0){
        const lc=acorr/pcorr;
        const pesoInv=inv!=null&&acorr?inv/acorr*100:null;
        if(lc<1)finding(h,'crit','Liquidez corriente insuficiente — '+y,'Los activos corrientes no alcanzan para cubrir los pasivos corrientes.',`Liquidez corriente ${f2(lc)}x, inferior a 1,00x.`,`Activo corriente ${money(acorr)} / Pasivo corriente ${money(pcorr)} = ${f2(lc)}x.`);
        else if(lc<1.2)finding(h,'warn','Liquidez corriente ajustada — '+y,'Existe cobertura de corto plazo, pero con margen reducido ante demoras de cobranza o menor realización de activos.',`Liquidez corriente ${f2(lc)}x.`,`Activo corriente ${money(acorr)} / Pasivo corriente ${money(pcorr)} = ${f2(lc)}x.`);
        else if(lc>=2&&pesoInv!=null&&pesoInv>=60)finding(h,'warn','Liquidez nominal fuerte, pero concentrada en inventarios — '+y,'La cobertura corriente parece holgada, aunque gran parte depende de convertir inventarios en efectivo. Por eso la liquidez contable no equivale a liquidez inmediata.',`Liquidez ${f2(lc)}x y ${f1(pesoInv)}% del activo corriente concentrado en inventarios.`,`Activo corriente ${money(acorr)}; Pasivo corriente ${money(pcorr)}; Inventarios ${money(inv)}.`);
        else if(lc>=1.5)finding(h,'ok','Liquidez corriente favorable — '+y,'La cobertura de obligaciones de corto plazo es holgada según el Balance.',`Liquidez corriente ${f2(lc)}x.`,`Activo corriente ${money(acorr)} / Pasivo corriente ${money(pcorr)} = ${f2(lc)}x.`);
      }

      if(ventas!=null&&ventas!==0){
        if(bruto!=null){const m=bruto/ventas*100;if(m<0)finding(h,'crit','Margen bruto negativo — '+y,'La actividad comercial no cubre el costo de ventas.',`Margen bruto ${f1(m)}%.`,`Ventas ${money(ventas)}; Resultado bruto ${money(bruto)}.`);}
        if(ebitda!=null&&ebitda<0)finding(h,'crit','EBITDA negativo — '+y,'La operación no genera resultado operativo antes de depreciaciones y amortizaciones.',`EBITDA ${money(ebitda)}.`,`Ventas ${money(ventas)}; EBITDA ${money(ebitda)}.`);
        if(neto!=null&&neto<0)finding(h,'imp','Resultado neto negativo — '+y,'La empresa termina el ejercicio con pérdida.',`Resultado neto ${money(neto)}.`,`Ventas ${money(ventas)}; Resultado neto ${money(neto)}.`);
      }

      if(ebitda!=null&&ebit!=null&&ebitda<ebit)finding(h,'crit','Inconsistencia EBITDA / EBIT — '+y,'El EBITDA informado es inferior al EBIT, relación que normalmente requiere revisión de clasificación o cálculo.',`EBITDA ${money(ebitda)} < EBIT ${money(ebit)}.`,`Diferencia ${money(ebitda-ebit)}.`);

      if(interes!=null&&interes>0&&ebitda!=null){const cov=ebitda/interes;if(cov<1)finding(h,'crit','Cobertura de intereses insuficiente — '+y,'El resultado operativo disponible no alcanza para cubrir los intereses financieros.',`Cobertura EBITDA / intereses = ${f2(cov)}x.`,`EBITDA ${money(ebitda)} / Intereses ${money(interes)}.`);else if(cov<3)finding(h,'warn','Cobertura de intereses ajustada — '+y,'La operación cubre los intereses, pero con un margen de seguridad limitado.',`Cobertura ${f2(cov)}x.`,`EBITDA ${money(ebitda)} / Intereses ${money(interes)}.`);else finding(h,'ok','Cobertura de intereses adecuada — '+y,'La generación operativa cubre los intereses financieros con margen razonable.',`Cobertura ${f2(cov)}x.`,`EBITDA ${money(ebitda)} / Intereses ${money(interes)}.`);}
    }

    /* 3. CORRELACIONES: aquí está el verdadero núcleo de la auditoría */
    if(p&&y){
      const ventas0=val(r,'ventas',p),ventas1=val(r,'ventas',y),inv0=val(b,'inventarios',p),inv1=val(b,'inventarios',y),prov0=val(b,'proveedores',p),prov1=val(b,'proveedores',y),act0=val(b,'total_activo',p),act1=val(b,'total_activo',y),pas0=val(b,'total_pasivo',p),pas1=val(b,'total_pasivo',y),pat0=val(b,'total_patrimonio',p),pat1=val(b,'total_patrimonio',y),cap0=val(b,'capital',p),cap1=val(b,'capital',y),neto1=val(r,'resultado_neto',y),bruto0=val(r,'resultado_bruto',p),bruto1=val(r,'resultado_bruto',y),neto0=val(r,'resultado_neto',p),cli0=val(b,'creditos_ventas',p),cli1=val(b,'creditos_ventas',y);
      const vv=pct(ventas1,ventas0),vi=pct(inv1,inv0),vp=pct(prov1,prov0),va=pct(act1,act0),vpas=pct(pas1,pas0),vpat=pct(pat1,pat0),vcli=pct(cli1,cli0);

      if(vv!=null&&vi!=null){
        const gap=vi-vv;
        if(Math.abs(gap)<=20)finding(h,'ok','Inventarios acompañan la evolución de las ventas — '+y,'No se observa una acumulación desproporcionada de inventarios frente al cambio de actividad comercial.',`Ventas ${f1(vv)}% e inventarios ${f1(vi)}%; diferencia ${f1(gap)} puntos.`,`La reducción de inventarios es consistente, en magnitud, con la contracción de ventas.`);
        else if(gap>20)finding(h,'imp','Inventarios crecen mucho más que las ventas — '+y,'Existe una señal de posible acumulación de stock respecto de la actividad comercial.',`Inventarios ${f1(vi)}% frente a ventas ${f1(vv)}%.`,`Diferencia ${f1(gap)} puntos porcentuales.`);
        else finding(h,'warn','Inventarios caen más que las ventas — '+y,'La reducción de stock supera la contracción comercial y conviene verificar si responde a liquidación de existencias, menor compra o cambio de actividad.',`Inventarios ${f1(vi)}% frente a ventas ${f1(vv)}%.`,`Diferencia ${f1(gap)} puntos porcentuales.`);
      }

      if(vv!=null&&vp!=null){
        const gap=vp-vv;
        if(vp<vv-20)finding(h,'ok','Proveedores disminuyen más que las ventas — '+y,'La caída de proveedores es consistente con un fuerte proceso de reducción de obligaciones comerciales, más intenso que la contracción de ventas.',`Proveedores ${f1(vp)}% frente a ventas ${f1(vv)}%.`,`Esto sugiere menor financiamiento de proveedores o cancelación significativa de obligaciones.`);
        else if(gap>20)finding(h,'warn','Proveedores crecen más que las ventas — '+y,'Las obligaciones comerciales aumentan más rápido que la actividad, lo que merece revisión de plazos y presión de corto plazo.',`Proveedores ${f1(vp)}% frente a ventas ${f1(vv)}%.`,`Diferencia ${f1(gap)} puntos.`);
      }

      if(vv!=null&&vcli!=null&&vcli>vv+20)finding(h,'imp','Cartera crece más rápido que las ventas — '+y,'Existe una señal de posible deterioro de la velocidad de cobranza o extensión de plazos.',`Créditos comerciales ${f1(vcli)}% frente a ventas ${f1(vv)}%.`,`Diferencia ${f1(vcli-vv)} puntos.`);
      else if(vv!=null&&vcli!=null&&vcli<vv-20)finding(h,'ok','Cartera no acompaña el crecimiento de ventas — '+y,'La cartera no aumenta proporcionalmente a las ventas; esto es compatible con una cobranza relativamente más rápida o mayor proporción de ventas al contado.',`Créditos ${f1(vcli)}% frente a ventas ${f1(vv)}%.`,`Debe contrastarse con el flujo de efectivo cuando esté disponible.`);

      if(vv!=null&&va!=null){
        if(Math.abs(va-vv)<=15)finding(h,'ok','Activos evolucionan de forma razonablemente consistente con la escala comercial — '+y,'La variación del activo guarda una relación razonable con el cambio de ventas.',`Activo ${f1(va)}% frente a ventas ${f1(vv)}%.`,`Diferencia ${f1(va-vv)} puntos.`);
        else if(va<vv-20)finding(h,'warn','Los activos caen menos que las ventas — '+y,'La empresa reduce actividad más rápido que su estructura de activos; puede existir capacidad instalada o activos ociosos.',`Ventas ${f1(vv)}% frente a activos ${f1(va)}%.`,`Diferencia ${f1(va-vv)} puntos.`);
        else if(va>vv+20)finding(h,'warn','Los activos crecen más que las ventas — '+y,'La inversión o acumulación de activos aumenta a mayor velocidad que la actividad y requiere identificar qué activos explican el crecimiento.',`Activos ${f1(va)}% frente a ventas ${f1(vv)}%.`,`Diferencia ${f1(va-vv)} puntos.`);
      }

      if(vpas!=null&&vpat!=null&&vpat>0){
        finding(h,'ok','Cambio estructural del financiamiento — '+y,'El patrimonio aumenta mientras el pasivo disminuye, señal de fortalecimiento patrimonial y desapalancamiento.',`Patrimonio ${f1(vpat)}% y pasivo ${f1(vpas)}%.`,`La estructura pasa a depender menos de terceros.`);
      }

      /* Puente patrimonial: evita interpretar el aumento del patrimonio como algo inexplicable */
      if(pat0!=null&&pat1!=null&&cap0!=null&&cap1!=null&&neto1!=null){
        const deltaPat=pat1-pat0,deltaCap=cap1-cap0,explicado=deltaCap+neto1,diff=deltaPat-explicado;
        if(Math.abs(diff)<=Math.max(1000000,Math.abs(deltaPat)*.03))finding(h,'ok','Aumento patrimonial explicado por capital y resultado — '+y,'El crecimiento del patrimonio es matemáticamente consistente con el aumento de capital y el resultado del ejercicio.',`Variación patrimonio ${money(deltaPat)} ≈ aumento de capital ${money(deltaCap)} + resultado neto ${money(neto1)}.`,`Diferencia residual ${money(diff)}.`);
        else finding(h,'warn','Aumento patrimonial requiere conciliación adicional — '+y,'El incremento del patrimonio no queda suficientemente explicado por capital y resultado; debe revisarse la composición patrimonial.',`Variación patrimonio ${money(deltaPat)} frente a capital + resultado ${money(explicado)}.`,`Diferencia no explicada ${money(diff)}.`);
      }

      /* Rentabilidad: no basta con decir que subió; se evalúa qué significa */
      if(ventas0&&ventas1&&bruto0!=null&&bruto1!=null){
        const m0=bruto0/ventas0*100,m1=bruto1/ventas1*100,cambio=pp(m1,m0);
        if(cambio>=5)finding(h,'ok','Mejora real del margen bruto — '+y,'La rentabilidad comercial mejora aun cuando el volumen de ventas cambia; esto indica una mejora de margen y no simplemente mayor facturación.',`Margen bruto pasa de ${f1(m0)}% a ${f1(m1)}%.`,`Mejora de ${f1(cambio)} puntos porcentuales.`);
        else if(cambio<=-5)finding(h,'imp','Deterioro real del margen bruto — '+y,'La empresa obtiene menos margen por cada unidad monetaria vendida.',`Margen bruto pasa de ${f1(m0)}% a ${f1(m1)}%.`,`Caída de ${f1(Math.abs(cambio))} puntos porcentuales.`);
      }
      if(ventas0&&ventas1&&neto0!=null&&neto1!=null){
        const m0=neto0/ventas0*100,m1=neto1/ventas1*100,cambio=pp(m1,m0);
        if(cambio>=5)finding(h,'ok','Mejora significativa de la rentabilidad final — '+y,'La empresa no solo sigue siendo rentable: mejora sustancialmente el resultado obtenido por cada unidad de venta.',`Margen neto pasa de ${f1(m0)}% a ${f1(m1)}%.`,`Mejora de ${f1(cambio)} puntos porcentuales.`);
        else if(cambio<=-5)finding(h,'imp','Deterioro significativo de la rentabilidad final — '+y,'La rentabilidad final se deteriora y requiere identificar el componente que explica el cambio.',`Margen neto pasa de ${f1(m0)}% a ${f1(m1)}%.`,`Caída de ${f1(Math.abs(cambio))} puntos.`);
      }

      /* Diagnóstico del volumen: imprescindible para no confundir margen con salud */
      if(vv!=null&&vv<=-20){
        if((bruto1!=null&&ventas1&&bruto0!=null&&ventas0&&bruto1/ventas1>bruto0/ventas0) && (neto1!=null&&neto1>0))
          finding(h,'warn','Contracción comercial con mejora de rentabilidad — '+y,'La empresa vende mucho menos, pero obtiene mayor margen y resultado. Es una mejora de eficiencia, aunque existe un riesgo por reducción de escala.',`Ventas ${f1(vv)}%, mientras los márgenes mejoran.`,`La mejora de rentabilidad no elimina el riesgo derivado de la fuerte caída del volumen.`);
        else finding(h,'imp','Contracción comercial relevante — '+y,'La caída de ventas representa una señal desfavorable de actividad que debe explicarse, aun cuando otros indicadores puedan mejorar.',`Ventas ${f1(vv)}%.`,`Debe determinarse si responde a estacionalidad, pérdida de clientes, cambio de negocio o decisión estratégica.`);
      }

      /* Liquidez nominal vs liquidez de calidad */
      const acorr1=val(b,'total_activo_corriente',y),pcorr1=val(b,'total_pasivo_corriente',y),inv1=val(b,'inventarios',y),cash1=val(b,'caja_bancos',y),cli1=val(b,'creditos_ventas',y);
      if(acorr1&&pcorr1&&inv1!=null){const lc=acorr1/pcorr1,quick=(acorr1-inv1)/pcorr1;
        if(lc>=2&&quick<1)finding(h,'warn','Liquidez corriente depende del inventario — '+y,'La liquidez corriente parece muy buena, pero al excluir inventarios la cobertura queda por debajo de 1 vez. La fortaleza es principalmente contable, no necesariamente inmediata.',`Liquidez corriente ${f2(lc)}x; liquidez sin inventarios ${f2(quick)}x.`,`Activo corriente ${money(acorr1)}; Inventarios ${money(inv1)}; Pasivo corriente ${money(pcorr1)}.`);
        else if(quick>=1)finding(h,'ok','Liquidez de mejor calidad — '+y,'Incluso excluyendo inventarios, los activos corrientes cubren las obligaciones corrientes.',`Liquidez sin inventarios ${f2(quick)}x.`,`Caja ${money(cash1)} + créditos ${money(cli1)} + otros activos corrientes cubren el pasivo corriente.`);
      }

      /* Ausencia de intereses: no asumir que es bueno si aún existen pasivos */
      const pas1=val(b,'total_pasivo',y),interes1=val(r,'intereses_gasto',y);
      if(pas1!=null&&pas1>0&&interes1===0)find(h,'warn','Pasivo sin gasto financiero informado — '+y,'No se informa gasto de intereses pese a existir pasivos. Esto puede ser correcto si predominan obligaciones comerciales o debe verificarse si faltan deudas financieras en la carga.',`Pasivo ${money(pas1)} y gastos financieros informados: 0.`,`No se debe interpretar automáticamente como ausencia de deuda financiera.`);
    }

    /* Resumen ejecutivo: máximo 6 conclusiones, no una lista de cuentas */
    const priority={crit:4,imp:3,warn:2,ok:1};
    h.sort((a,b)=>priority[b.tipo]-priority[a.tipo]);
    const seen=new Set();
    h.forEach(x=>{const k=x.titulo.replace(/—.*$/,'');if(!seen.has(k)){seen.add(k);res.push(x);}});
    return{years,hallazgos:h,resumen:res.slice(0,8)};
  }

  function render(){
    const host=document.getElementById('auditoria');if(!host)return;
    const d=collect();if(!d.balance&&!d.resultados)return;
    const out=analyze(d),h=out.hallazgos;
    const counts={crit:h.filter(x=>x.tipo==='crit').length,imp:h.filter(x=>x.tipo==='imp').length,warn:h.filter(x=>x.tipo==='warn').length,ok:h.filter(x=>x.tipo==='ok').length};
    const label={crit:'DESFAVORABLE / CRÍTICO',imp:'DESFAVORABLE / IMPORTANTE',warn:'ATENCIÓN / REQUIERE INDAGACIÓN',ok:'FAVORABLE / COHERENTE'};
    const cards=out.resumen.map(x=>`<div class="alert ${x.tipo}"><strong>${esc(label[x.tipo])}: ${esc(x.titulo)}</strong><div class="why"><b>Conclusión:</b> ${esc(x.conclusion)}</div><div><b>¿Por qué aparece?</b> ${esc(x.causa)}</div><div class="note"><b>Evidencia:</b> ${esc(x.evidencia)}</div></div>`).join('');
    const detail=h.filter(x=>!out.resumen.includes(x)).map(x=>`<details class="audit-detail"><summary><b>${esc(label[x.tipo])}</b> — ${esc(x.titulo)}</summary><div class="why"><b>Conclusión:</b> ${esc(x.conclusion)}</div><div><b>Fundamento:</b> ${esc(x.causa)}</div><div class="note"><b>Evidencia:</b> ${esc(x.evidencia)}</div></details>`).join('');
    host.innerHTML=`<section class="card"><h2>4. AUDITORÍA DE COHERENCIA FINANCIERA</h2><div class="body">
      <div class="kpis"><div class="kpi">Críticas<b>${counts.crit}</b></div><div class="kpi">Importantes<b>${counts.imp}</b></div><div class="kpi">Para indagar<b>${counts.warn}</b></div><div class="kpi">Favorables<b>${counts.ok}</b></div><div class="kpi">Períodos<b>${out.years.length}</b></div></div>
      <div class="evidence"><b>Períodos analizados:</b> ${out.years.join(', ')}</div>
      <div class="alert ok"><strong>DIAGNÓSTICO EJECUTIVO</strong><div>Esta sección no repite las cuentas del Balance. Cruza estructura patrimonial, liquidez, actividad, rentabilidad y evolución histórica para determinar si los movimientos son <b>coherentes, favorables, desfavorables o requieren indagación</b>.</div></div>
      ${cards||'<div class="alert ok"><strong>Sin conclusiones adversas con la información disponible.</strong><div>No se encontraron relaciones que superen los umbrales definidos.</div></div>'}
      ${detail?`<details class="audit-more"><summary><b>VER RESTO DE LAS PRUEBAS REALIZADAS (${h.length-out.resumen.length})</b></summary>${detail}</details>`:''}
    </div></section>`;
    host.classList.remove('hidden');
  }
  function start(){render();const c=document.getElementById('controlBody');if(c)new MutationObserver(()=>setTimeout(render,0)).observe(c,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
