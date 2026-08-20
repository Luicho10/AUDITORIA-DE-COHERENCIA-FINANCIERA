/* AUDITORÍA AUTÓNOMA
   Esta capa NO depende de MotorCoherenciaFinanciera ni de NORMALIZED.
   Lee directamente las tablas que el usuario ya ve en pantalla y ejecuta
   las pruebas de coherencia sobre esos valores.
*/
(function(){
  const esc=s=>String(s??'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const num=s=>{
    if(s==null)return null;
    let x=String(s).trim().replace(/\s/g,'');
    if(!x||x==='—'||x==='-')return null;
    if(/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(x))x=x.replace(/\./g,'').replace(',','.');
    else x=x.replace(/,/g,'.');
    const n=Number(x.replace(/[^0-9eE+\-.]/g,''));
    return Number.isFinite(n)?n:null;
  };
  const money=n=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  const f1=n=>n==null?'—':Number(n).toFixed(1)+'%';
  const f2=n=>n==null?'—':Number(n).toFixed(2)+'x';
  const change=(a,b)=>b!=null&&b!==0&&a!=null?(a/b-1)*100:null;
  const val=(d,k,y)=>d?.rows?.[k]?.values?.[y]??null;

  function readTable(t){
    const heads=[...t.querySelectorAll('thead tr:last-child th')].map(x=>x.textContent.trim());
    const periods=heads.filter(x=>/^(19|20)\d{2}$/.test(x));
    const rows={};
    t.querySelectorAll('tbody tr').forEach(tr=>{
      const td=[...tr.children];
      if(td.length<5)return;
      const key=td[0].textContent.trim();
      if(!key)return;
      const values={};
      periods.forEach((y,i)=>values[y]=num(td[4+i]?.textContent));
      rows[key]={label:td[1]?.textContent.trim()||key,values};
    });
    return {periods,rows};
  }

  function collect(){
    const out={balance:null,resultados:null};
    document.querySelectorAll('.normalization-table').forEach(t=>{
      const wrap=t.closest('.normalization-table-wrap');
      const alert=wrap?.previousElementSibling;
      const title=(alert?.querySelector('strong')?.textContent||'').toUpperCase();
      if(title.includes('BALANCE'))out.balance=readTable(t);
      else if(title.includes('RESULTADOS'))out.resultados=readTable(t);
    });
    return out;
  }

  function add(a,nivel,titulo,prueba,interpretacion,valores){a.push({nivel,titulo,prueba,interpretacion,valores});}

  function analyze(d){
    const b=d.balance,r=d.resultados;
    const years=[...new Set([...(b?.periods||[]),...(r?.periods||[])])].sort();
    const a=[];
    if(!years.length)return{years,hallazgos:a};

    /* 1. INTEGRIDAD ARITMÉTICA */
    years.forEach(y=>{
      const ac=val(b,'total_activo',y),pa=val(b,'total_pasivo',y),pn=val(b,'total_patrimonio',y);
      if(ac==null||pa==null||pn==null)return;
      const diff=ac-pa-pn;
      if(Math.abs(diff)>1)add(a,'crit','Inconsistencia patrimonial — '+y,'Activo − Pasivo − Patrimonio = 0','El Balance no cierra matemáticamente. Debe verificarse la carga o clasificación de cuentas antes de utilizar el período para conclusiones.',{activo:ac,pasivo:pa,patrimonio:pn,diferencia:diff});
      else add(a,'ok','Ecuación patrimonial conciliada — '+y,'Activo − Pasivo − Patrimonio = 0','El Balance presenta cierre matemático para este período. Esto valida la aritmética básica, pero no demuestra por sí solo la razonabilidad de las cuentas.',{activo:ac,pasivo:pa,patrimonio:pn,diferencia:0});
    });

    /* 2. ESTRUCTURA FINANCIERA */
    const y=years.at(-1);
    const ac=val(b,'total_activo',y),pa=val(b,'total_pasivo',y),pn=val(b,'total_patrimonio',y),acorr=val(b,'total_activo_corriente',y),pcorr=val(b,'total_pasivo_corriente',y),inv=val(b,'inventarios',y),caja=val(b,'caja_bancos',y),cli=val(b,'creditos_ventas',y);
    if(ac!=null&&pa!=null&&ac!==0){
      const ende=pa/ac*100;
      if(ende>=70)add(a,'imp','Dependencia elevada de financiación de terceros — '+y,'Pasivo / Activo × 100','La estructura patrimonial depende fuertemente de terceros. Debe contrastarse con generación operativa y capacidad de servicio de deuda.',{pasivo:pa,activo:ac,endeudamiento_pct:ende});
      else if(ende<=40)add(a,'ok','Estructura patrimonial con baja dependencia de terceros — '+y,'Pasivo / Activo × 100','La participación del pasivo es relativamente baja respecto del activo. Es una condición favorable de estructura, no una conclusión integral de riesgo.',{pasivo:pa,activo:ac,endeudamiento_pct:ende});
      else add(a,'warn','Estructura patrimonial intermedia — '+y,'Pasivo / Activo × 100','Existe una dependencia moderada de financiación de terceros. Debe analizarse junto con liquidez y generación operativa.',{pasivo:pa,activo:ac,endeudamiento_pct:ende});
    }
    if(acorr!=null&&pcorr!=null&&pcorr!==0){
      const lc=acorr/pcorr,pinv=inv!=null?inv/acorr*100:null;
      if(lc<1)add(a,'crit','Liquidez corriente insuficiente — '+y,'Activo corriente / Pasivo corriente','Los activos corrientes no alcanzan para cubrir las obligaciones corrientes.',{activo_corriente:acorr,pasivo_corriente:pcorr,liquidez:lc});
      else if(lc<1.2)add(a,'warn','Liquidez corriente ajustada — '+y,'Activo corriente / Pasivo corriente','Existe cobertura, pero con margen reducido ante demoras de cobranza o menor realización de activos.',{activo_corriente:acorr,pasivo_corriente:pcorr,liquidez:lc});
      else if(lc>=2&&pinv>=60)add(a,'imp','Liquidez contable concentrada en inventarios — '+y,'Inventarios / Activo corriente × 100','La liquidez corriente parece holgada, pero una parte dominante depende de realizar inventarios. No debe confundirse liquidez contable con liquidez inmediata.',{activo_corriente:acorr,inventarios:inv,peso_inventarios_pct:pinv,liquidez:lc});
      else add(a,'ok','Cobertura corriente suficiente — '+y,'Activo corriente / Pasivo corriente','Existe cobertura de las obligaciones corrientes según los saldos informados.',{activo_corriente:acorr,pasivo_corriente:pcorr,liquidez:lc});
    }

    /* 3. RESULTADOS Y CAPACIDAD OPERATIVA */
    const ventas=val(r,'ventas',y),costo=val(r,'costo_ventas',y),bruto=val(r,'resultado_bruto',y),ebitda=val(r,'ebitda',y),ebit=val(r,'ebit',y),interes=val(r,'intereses_gasto',y),neto=val(r,'resultado_neto',y);
    if(ventas!=null&&ventas!==0){
      if(costo!=null&&bruto!=null){const esperado=ventas-costo,diff=bruto-esperado;if(Math.abs(diff)>1)add(a,'crit','Resultado bruto no concilia — '+y,'Resultado bruto = Ventas − Costo de ventas','El resultado bruto informado no coincide con la relación matemática entre ventas y costo de ventas.',{ventas,costo_ventas:costo,resultado_bruto:bruto,resultado_bruto_esperado:esperado,diferencia:diff});}
      if(bruto!=null)add(a,bruto/ventas<0?'crit':'ok','Margen bruto — '+y,'Resultado bruto / Ventas × 100',bruto<0?'El costo de ventas supera las ventas, generando margen comercial negativo.':'El margen comercial muestra cuánto resultado queda después del costo de ventas.',{ventas,resultado_bruto:bruto,margen_pct:bruto/ventas*100});
      if(ebitda!=null&&ebitda<0)add(a,'crit','EBITDA negativo — '+y,'EBITDA / Ventas','La operación no genera resultado antes de depreciaciones y amortizaciones.',{ventas,ebitda,margen_ebitda_pct:ebitda/ventas*100});
      if(neto!=null&&neto<0)add(a,'imp','Resultado neto negativo — '+y,'Resultado neto / Ventas','El ejercicio termina con pérdida y requiere identificar qué componente la explica.',{ventas,resultado_neto:neto,margen_neto_pct:neto/ventas*100});
    }
    if(ebitda!=null&&ebit!=null&&ebitda<ebit)add(a,'crit','Relación EBITDA / EBIT inconsistente — '+y,'EBITDA normalmente no debe ser inferior al EBIT','El EBITDA informado es menor que el EBIT. Debe revisarse clasificación de depreciaciones/amortizaciones o la forma en que fueron calculados.',{ebitda,ebit,diferencia:ebitda-ebit});
    if(interes!=null&&interes>0&&ebitda!=null){const cov=ebitda/interes;if(cov<1)add(a,'crit','Cobertura de intereses insuficiente — '+y,'EBITDA / Intereses','La generación operativa informada no alcanza para cubrir los intereses financieros.',{ebitda,intereses:interes,cobertura:cov});else if(cov<3)add(a,'warn','Cobertura de intereses ajustada — '+y,'EBITDA / Intereses','Los intereses están cubiertos, pero con un margen de seguridad limitado.',{ebitda,intereses:interes,cobertura:cov});else add(a,'ok','Cobertura de intereses adecuada — '+y,'EBITDA / Intereses','La generación operativa cubre los intereses con margen razonable.',{ebitda,intereses:interes,cobertura:cov});}

    /* 4. CORRELACIONES Y TENDENCIAS */
    years.slice(1).forEach((py,i)=>{
      const cy=years[i];
      const v0=val(r,'ventas',py),v1=val(r,'ventas',cy),inv0=val(b,'inventarios',py),inv1=val(b,'inventarios',cy),prov0=val(b,'proveedores',py),prov1=val(b,'proveedores',cy),cli0=val(b,'creditos_ventas',py),cli1=val(b,'creditos_ventas',cy),act0=val(b,'total_activo',py),act1=val(b,'total_activo',cy),pas0=val(b,'total_pasivo',py),pas1=val(b,'total_pasivo',cy),pat0=val(b,'total_patrimonio',py),pat1=val(b,'total_patrimonio',cy);
      const vv=change(v1,v0),vi=change(inv1,inv0),vp=change(prov1,prov0),vc=change(cli1,cli0),va=change(act1,act0),vpas=change(pas1,pas0),vpat=change(pat1,pat0);
      if(vv!=null&&vi!=null){const gap=vi-vv;if(gap>30)add(a,'imp','Inventarios crecen mucho más que las ventas — '+cy,'Variación de inventarios vs. variación de ventas','La acumulación de inventarios supera significativamente la evolución de las ventas. Debe verificarse rotación, obsolescencia, valorización y necesidad real de stock.',{periodo_anterior:py,periodo_actual:cy,ventas_variacion_pct:vv,inventarios_variacion_pct:vi,diferencia_puntos:gap});else if(gap<-30)add(a,'warn','Inventarios caen más que las ventas — '+cy,'Variación de inventarios vs. variación de ventas','El stock disminuye mucho más que las ventas. Puede ser consistente con liquidación de inventario, menor reposición o cambio de actividad; requiere explicación.',{periodo_anterior:py,periodo_actual:cy,ventas_variacion_pct:vv,inventarios_variacion_pct:vi,diferencia_puntos:gap});else add(a,'ok','Inventarios evolucionan de forma compatible con las ventas — '+cy,'Variación de inventarios vs. variación de ventas','No se observa una divergencia material entre ambas variaciones.',{periodo_anterior:py,periodo_actual:cy,ventas_variacion_pct:vv,inventarios_variacion_pct:vi,diferencia_puntos:gap});}
      if(vv!=null&&vp!=null&&vp>vv+30)add(a,'warn','Proveedores crecen más que las ventas — '+cy,'Variación de proveedores vs. variación de ventas','Las obligaciones comerciales aumentan a mayor velocidad que la actividad. Deben revisarse plazos, compras y dependencia de financiación de proveedores.',{ventas_variacion_pct:vv,proveedores_variacion_pct:vp,diferencia_puntos:vp-vv});
      if(vv!=null&&vc!=null&&vc>vv+30)add(a,'imp','Créditos comerciales crecen más que las ventas — '+cy,'Variación de créditos vs. variación de ventas','La cartera aumenta a mayor velocidad que las ventas. Puede indicar extensión de plazos o menor velocidad de cobranza y debe contrastarse con caja.',{ventas_variacion_pct:vv,creditos_variacion_pct:vc,diferencia_puntos:vc-vv});
      if(vv!=null&&va!=null&&va<vv-30)add(a,'warn','Los activos caen menos que las ventas — '+cy,'Variación del activo vs. variación de ventas','La estructura de activos se contrae menos que la actividad. Puede existir capacidad ociosa o activos que no acompañan la escala actual.',{ventas_variacion_pct:vv,activo_variacion_pct:va,diferencia_puntos:va-vv});
      if(vv!=null&&va!=null&&va>vv+30)add(a,'warn','Los activos crecen más que las ventas — '+cy,'Variación del activo vs. variación de ventas','La estructura de activos aumenta más que la actividad comercial. Debe verificarse si existe inversión, acumulación o activos de baja productividad.',{ventas_variacion_pct:vv,activo_variacion_pct:va,diferencia_puntos:va-vv});
      if(vpas!=null&&vpat!=null&&vpas>30&&vpat<10)add(a,'imp','El pasivo crece mucho más que el patrimonio — '+cy,'Variación del pasivo vs. variación del patrimonio','La financiación de terceros aumenta significativamente más que la base patrimonial. Es una señal de mayor apalancamiento que requiere explicación.',{pasivo_variacion_pct:vpas,patrimonio_variacion_pct:vpat});
    });
    return{years,hallazgos:a};
  }

  function render(){
    const host=document.getElementById('auditoria');if(!host)return;
    const data=collect();
    if(!data.balance&&!data.resultados)return;
    const r=analyze(data),a=r.hallazgos;
    const crit=a.filter(x=>x.nivel==='crit'),imp=a.filter(x=>x.nivel==='imp'),warn=a.filter(x=>x.nivel==='warn'),ok=a.filter(x=>x.nivel==='ok');
    const rank={crit:0,imp:1,warn:2,ok:3};
    const ordered=[...a].sort((x,y)=>rank[x.nivel]-rank[y.nivel]);
    const conclusion=crit.length?'Se detectaron inconsistencias que deben verificarse antes de considerar confiable la información.':imp.length?'No se observa una ruptura matemática crítica, pero existen señales financieras relevantes que requieren indagación.':warn.length?'No se detectaron inconsistencias críticas; sí existen relaciones que requieren explicación o contraste.':'La información analizada no supera los umbrales de alerta configurados.';
    const cards=ordered.map(x=>`<div class="audit-finding ${x.nivel}"><div class="finding-title">${esc(x.titulo)}</div><div><b>Prueba:</b> ${esc(x.prueba)}</div><div><b>Valores utilizados:</b><pre>${esc(JSON.stringify(x.valores,null,2))}</pre></div><div class="finding-interpretation"><b>Conclusión:</b> ${esc(x.interpretacion)}</div></div>`).join('');
    host.innerHTML=`<section class="card audit-card"><h2>4. AUDITORÍA DE COHERENCIA FINANCIERA</h2><div class="body"><div class="kpis"><div class="kpi"><span>Críticas</span><b>${crit.length}</b></div><div class="kpi"><span>Importantes</span><b>${imp.length}</b></div><div class="kpi"><span>Para indagar</span><b>${warn.length}</b></div><div class="kpi"><span>Conciliadas / favorables</span><b>${ok.length}</b></div><div class="kpi"><span>Períodos</span><b>${r.years.length}</b></div></div><div class="audit-periods"><b>Períodos analizados:</b> ${r.years.join(', ')||'—'}</div><div class="audit-executive"><b>LECTURA ANALÍTICA</b><p>${esc(conclusion)}</p></div><div class="audit-subtitle">HALLAZGOS Y RELACIONES DETECTADAS</div>${cards||'<div class="alert ok"><strong>Sin hallazgos</strong><div>No se encontraron pruebas con información suficiente.</div></div>'}</div></section>`;
    host.classList.remove('hidden');
  }

  function start(){
    const control=document.getElementById('control');
    if(control)new MutationObserver(()=>setTimeout(render,30)).observe(control,{childList:true,subtree:true});
    setTimeout(render,100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
