/* AUDITORÍA DE COHERENCIA FINANCIERA — V2.0
   Presentación ejecutiva del análisis.
   No repite el Balance: transforma los datos normalizados en
   inconsistencias, correlaciones, tendencias, señales favorables
   y puntos concretos para indagar.
*/
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num=v=>{if(v==null||v==='—'||v==='-')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;const s=String(v).trim().replace(/\s/g,'');if(!s)return null;let x=s;if(/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(x))x=x.replace(/\./g,'').replace(',','.');else x=x.replace(/,/g,'.');const n=Number(x.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(n)?n:null};
  const money=n=>n==null?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(n);
  const f1=n=>n==null?'—':Number(n).toFixed(1);
  const f2=n=>n==null?'—':Number(n).toFixed(2);
  const pct=(a,b)=>a!=null&&b!=null&&b!==0?(a/b-1)*100:null;
  const val=(d,k,y)=>d?.matched?.[k]?.values?.[y]??null;
  const label=(d,k)=>d?.matched?.[k]?.label||k;
  const latest=years=>years?.length?years[years.length-1]:null;
  const previous=(years,i)=>i>0?years[i-1]:null;

  function finding(tipo,titulo,lectura,razon,evidencia,periodo){return{tipo,titulo,lectura,razon,evidencia,periodo}};

  function analizar(){
    const n=window.NORMALIZED||{};
    const b=n.balance,r=n.resultados,f=n.flujo;
    const years=[...new Set([...(b?.periods||[]),...(r?.periods||[]),...(f?.periods||[])].filter(x=>/^\d{4}$/.test(String(x))))].sort();
    const crit=[],imp=[],warn=[],ok=[],trend=[],corr=[];
    const add=(a,x)=>a.push(x);
    const all=y=>({
      ac:val(b,'total_activo',y),pa:val(b,'total_pasivo',y),pn:val(b,'total_patrimonio',y),
      acorr:val(b,'total_activo_corriente',y),pcorr:val(b,'total_pasivo_corriente',y),inv:val(b,'inventarios',y),cli:val(b,'creditos_ventas',y),cash:val(b,'caja_bancos',y),prov:val(b,'proveedores',y),
      ventas:val(r,'ventas',y),costo:val(r,'costo_ventas',y),bruto:val(r,'resultado_bruto',y),gastos:val(r,'gastos_comerciales',y),ebitda:val(r,'ebitda',y),ebit:val(r,'ebit',y),interes:val(r,'intereses_gasto',y),neto:val(r,'resultado_neto',y)
    });

    /* =========================
       1. INCONSISTENCIAS Y PRUEBAS
       ========================= */
    years.forEach(y=>{
      const d=all(y);
      if([d.ac,d.pa,d.pn].every(v=>v!=null)&&!(d.ac===0&&d.pa===0&&d.pn===0)){
        const dif=d.ac-d.pa-d.pn;
        if(Math.abs(dif)>1)add(crit,finding('crit','Ecuación patrimonial no conciliada — '+y,'El Balance no cierra matemáticamente.','Debe verificarse la carga, clasificación o totalización de las cuentas antes de utilizar el período como base de conclusiones.',`Activo ${money(d.ac)} − Pasivo ${money(d.pa)} − Patrimonio ${money(d.pn)} = ${money(dif)}.`,y));
      }
      if(d.ventas!=null&&d.costo!=null&&d.bruto!=null){
        const esperado=d.ventas-d.costo,dif=d.bruto-esperado;
        if(Math.abs(dif)>1)add(crit,finding('crit','Resultado bruto no concilia — '+y,'El resultado bruto informado no coincide con Ventas menos Costo de Ventas.','Es una inconsistencia aritmética que debe revisarse antes de interpretar márgenes o rentabilidad.',`Informado ${money(d.bruto)}; esperado ${money(esperado)}; diferencia ${money(dif)}.`,y));
      }
      if(d.ebitda!=null&&d.ebit!=null&&d.ebitda<d.ebit)add(crit,finding('crit','Relación EBITDA / EBIT requiere revisión — '+y,'El EBITDA informado es inferior al EBIT.','La relación requiere revisar clasificación, depreciaciones/amortizaciones o la forma en que fueron calculados ambos resultados.',`EBITDA ${money(d.ebitda)} < EBIT ${money(d.ebit)}.`,y));
      if(d.acorr!=null&&d.pcorr!=null&&d.pcorr!==0){
        const lc=d.acorr/d.pcorr;
        if(lc<1)add(crit,finding('crit','Liquidez corriente insuficiente — '+y,'La cobertura contable de corto plazo es inferior a 1,00x.','El activo corriente no alcanza para cubrir el pasivo corriente.',`Activo corriente ${money(d.acorr)} / Pasivo corriente ${money(d.pcorr)} = ${f2(lc)}x.`,y));
      }
      if(d.ebitda!=null&&d.interes!=null&&d.interes>0){
        const cov=d.ebitda/d.interes;
        if(cov<1)add(crit,finding('crit','Cobertura de intereses insuficiente — '+y,'La generación operativa informada no cubre los intereses financieros.','Existe una presión financiera que debe contrastarse con caja, deuda y capacidad de refinanciación.',`EBITDA ${money(d.ebitda)} / Intereses ${money(d.interes)} = ${f2(cov)}x.`,y));
      }
      if(d.ventas!=null&&d.ventas!==0&&d.neto!=null&&d.neto<0)add(imp,finding('imp','Resultado neto negativo — '+y,'El ejercicio termina con pérdida.','La pérdida no demuestra por sí sola una inconsistencia, pero requiere identificar qué componente la explica y si es recurrente.',`Ventas ${money(d.ventas)}; Resultado neto ${money(d.neto)}; margen neto ${f1(d.neto/d.ventas*100)}%.`,y));
      if(d.ac!=null&&d.pa!=null&&d.ac!==0){
        const ende=d.pa/d.ac*100;
        if(ende>=70)add(imp,finding('imp','Dependencia elevada de terceros — '+y,'La mayor parte de los activos está financiada con pasivos.','La estructura aumenta la sensibilidad ante caída de ventas, menor cobranza o mayores costos financieros.',`Pasivo ${money(d.pa)} / Activo ${money(d.ac)} = ${f1(ende)}%.`,y));
      }
      if(d.acorr!=null&&d.pcorr!=null&&d.pcorr!==0){
        const lc=d.acorr/d.pcorr,peso=d.inv!=null&&d.acorr?d.inv/d.acorr*100:null;
        if(lc>=1&&lc<1.2)add(warn,finding('warn','Liquidez corriente ajustada — '+y,'Existe cobertura de corto plazo, pero con margen reducido.','Una demora de cobranza o menor realización de activos puede presionar la capacidad de pago.',`Liquidez ${f2(lc)}x.`,y));
        if(lc>=1.5&&peso!=null&&peso>=60)add(warn,finding('warn','Liquidez concentrada en inventarios — '+y,'La liquidez contable depende en gran medida de la realización del stock.','Una parte elevada del activo corriente no es caja inmediata y debe contrastarse con rotación y ventas.',`Inventarios ${money(d.inv)} = ${f1(peso)}% del activo corriente.`,y));
      }
    });

    /* =========================
       2. CORRELACIONES ENTRE CUENTAS
       ========================= */
    for(let i=1;i<years.length;i++){
      const p=years[i-1],y=years[i],a=all(p),d=all(y);
      const vv=pct(d.ventas,a.ventas),vi=pct(d.inv,a.inv),vcli=pct(d.cli,a.cli),vp=pct(d.prov,a.prov),va=pct(d.ac,a.ac),vpa=pct(d.pa,a.pa),vpat=pct(d.pn,a.pn);
      if(vv!=null&&vi!=null){
        const gap=vi-vv;
        if(gap>25)add(corr,finding('imp','Inventarios crecen mucho más que las ventas — '+y,'Existe una acumulación relativa de inventarios frente a la actividad comercial.','Cuando el stock crece significativamente más que las ventas puede aumentar el capital inmovilizado y el riesgo de realización.',`Ventas ${f1(vv)}%; Inventarios ${f1(vi)}%; brecha ${f1(gap)} puntos.`,y));
        else if(gap<-25)add(corr,finding('warn','Inventarios caen más que las ventas — '+y,'La reducción del stock es más intensa que la contracción de ventas.','Puede ser compatible con liquidación de existencias, menor reposición o cambio de actividad; requiere identificar la causa.',`Ventas ${f1(vv)}%; Inventarios ${f1(vi)}%; brecha ${f1(gap)} puntos.`,y));
        else add(ok,finding('ok','Inventarios y ventas evolucionan de forma compatible — '+y,'No se observa una divergencia material entre el stock y la actividad comercial.','La variación de inventarios guarda una relación razonable con la variación de ventas.',`Ventas ${f1(vv)}%; Inventarios ${f1(vi)}%; brecha ${f1(gap)} puntos.`,y));
      }
      if(vv!=null&&vcli!=null){
        const gap=vcli-vv;
        if(gap>25)add(corr,finding('imp','Cartera crece más rápido que las ventas — '+y,'Los créditos comerciales aumentan significativamente por encima de las ventas.','Puede indicar extensión de plazos, menor velocidad de cobranza o concentración de ventas a crédito.',`Ventas ${f1(vv)}%; Créditos ${f1(vcli)}%; brecha ${f1(gap)} puntos.`,y));
        else if(gap<-25)add(ok,finding('ok','Cartera no acompaña el cambio de ventas — '+y,'Los créditos comerciales evolucionan por debajo de las ventas.','Es compatible con mayor proporción de contado o una cobranza relativamente más rápida; debe contrastarse con caja cuando exista flujo.',`Ventas ${f1(vv)}%; Créditos ${f1(vcli)}%; brecha ${f1(gap)} puntos.`,y));
      }
      if(vv!=null&&vp!=null){
        const gap=vp-vv;
        if(gap>25)add(warn,finding('warn','Proveedores crecen más rápido que las ventas — '+y,'Las obligaciones comerciales aumentan por encima de la actividad.','Puede existir mayor dependencia del financiamiento de proveedores o acumulación de obligaciones de corto plazo.',`Ventas ${f1(vv)}%; Proveedores ${f1(vp)}%; brecha ${f1(gap)} puntos.`,y));
        else if(gap<-25)add(ok,finding('ok','Proveedores disminuyen más que las ventas — '+y,'Las obligaciones comerciales caen más rápido que la actividad.','Es compatible con cancelación de deuda comercial o menor utilización del crédito de proveedores; conviene contrastar el origen de los pagos.',`Ventas ${f1(vv)}%; Proveedores ${f1(vp)}%; brecha ${f1(gap)} puntos.`,y));
      }
      if(vv!=null&&va!=null){
        const gap=va-vv;
        if(gap>30)add(warn,finding('warn','Activos crecen más que las ventas — '+y,'La estructura de activos aumenta mucho más que la escala comercial.','Puede existir inversión no acompañada por actividad, activos ociosos o cambio en la composición patrimonial.',`Ventas ${f1(vv)}%; Activos ${f1(va)}%; brecha ${f1(gap)} puntos.`,y));
        else if(gap<-30)add(warn,finding('warn','Ventas caen más que los activos — '+y,'La actividad comercial se contrae más rápido que la estructura de activos.','Puede reducirse la productividad o utilización de los activos y debe analizarse la capacidad instalada.',`Ventas ${f1(vv)}%; Activos ${f1(va)}%; brecha ${f1(gap)} puntos.`,y));
      }
      if(vpa!=null&&vpat!=null&&vpa>vpat+25)add(corr,finding('imp','Pasivos crecen más rápido que el patrimonio — '+y,'La estructura financiera se desplaza hacia una mayor financiación de terceros.','Si esta dinámica se sostiene puede aumentar el apalancamiento y reducir el colchón patrimonial.',`Pasivo ${f1(vpa)}%; Patrimonio ${f1(vpat)}%; brecha ${f1(vpa-vpat)} puntos.`,y));
      if(d.ebitda!=null&&d.interes!=null&&d.interes>0&&a.ebitda!=null&&a.interes!=null&&a.interes>0){
        const c0=a.ebitda/a.interes,c1=d.ebitda/d.interes;
        if(c1<c0-1)add(corr,finding('imp','La cobertura financiera se deteriora — '+y,'La capacidad operativa para cubrir intereses empeora respecto del período anterior.','La presión financiera aumenta aunque el resultado absoluto pueda seguir siendo positivo.',`Cobertura ${f2(c0)}x → ${f2(c1)}x.`,y));
        else if(c1>c0+1)add(ok,finding('ok','La cobertura financiera mejora — '+y,'La generación operativa cubre los intereses con mayor margen que en el período anterior.','La relación entre resultado operativo e intereses evoluciona favorablemente.',`Cobertura ${f2(c0)}x → ${f2(c1)}x.`,y));
      }
    }

    /* =========================
       3. TENDENCIAS MULTIPERÍODO
       ========================= */
    const series=[
      ['Ventas','resultados','ventas'],['Resultado bruto','resultados','resultado_bruto'],['EBITDA','resultados','ebitda'],['Resultado neto','resultados','resultado_neto'],
      ['Activo total','balance','total_activo'],['Pasivo total','balance','total_pasivo'],['Patrimonio neto','balance','total_patrimonio'],['Inventarios','balance','inventarios'],['Créditos comerciales','balance','creditos_ventas'],['Proveedores','balance','proveedores']
    ];
    series.forEach(([nombre,tipo,key])=>{
      const d=tipo==='balance'?b:r;if(!d)return;
      const pts=years.map(y=>({y,v:val(d,key,y)})).filter(x=>x.v!=null);
      if(pts.length<2)return;
      const first=pts[0],last=pts[pts.length-1],change=pct(last.v,first.v);
      const dir=change>5?'crecimiento':change<-5?'contracción':'estabilidad relativa';
      trend.push({nombre,key,first,last,change,dir,periods:pts});
    });

    /* =========================
       4. CONCLUSIÓN INTEGRADA
       ========================= */
    const totalCrit=crit.length,totalImp=imp.length,totalWarn=warn.length,totalCorr=corr.length;
    let nivel='FAVORABLE',texto='No se observan señales materiales de incoherencia en las pruebas ejecutadas con la información disponible.';
    if(totalCrit>0){nivel='REQUIERE REVISIÓN';texto='Se detectaron inconsistencias o señales críticas que deben verificarse antes de considerar confiable la información para una decisión.'}
    else if(totalImp>=2||totalCorr>=3){nivel='ATENCIÓN';texto='La información cierra en sus pruebas básicas, pero presenta relaciones y tendencias que requieren análisis adicional antes de concluir que la evolución financiera es favorable.'}
    else if(totalWarn>0||totalImp>0){nivel='ATENCIÓN';texto='No se observa una ruptura matemática general, pero existen señales que deben ser explicadas para determinar si la evolución es sostenible.'}
    const resumen=[];
    if(years.length>=2){
      const ventasT=trend.find(x=>x.key==='ventas'),netoT=trend.find(x=>x.key==='resultado_neto'),invT=trend.find(x=>x.key==='inventarios');
      if(ventasT)resumen.push(`Las ventas muestran ${ventasT.dir} entre ${ventasT.first.y} y ${ventasT.last.y} (${f1(ventasT.change)}%).`);
      if(netoT)resumen.push(`El resultado neto muestra ${netoT.dir} entre ${netoT.first.y} y ${netoT.last.y} (${f1(netoT.change)}%).`);
      if(invT)resumen.push(`Los inventarios muestran ${invT.dir} entre ${invT.first.y} y ${invT.last.y} (${f1(invT.change)}%).`);
    }
    return{years,crit,imp,warn,ok,corr,trend,nivel,texto,resumen};
  }

  function badge(tipo){const map={crit:['CRÍTICA','crit'],imp:['IMPORTANTE','imp'],warn:['PARA INDAGAR','warn'],ok:['FAVORABLE','ok']};const x=map[tipo]||map.warn;return `<span class="acf-badge ${x[1]}">${x[0]}</span>`}
  function card(x){return `<article class="acf-finding ${x.tipo}"><div class="acf-finding-head">${badge(x.tipo)}<strong>${esc(x.titulo)}</strong></div><div class="acf-reading"><b>Qué indica:</b> ${esc(x.lectura)}</div><div class="acf-why"><b>Por qué importa:</b> ${esc(x.razon)}</div><div class="acf-evidence"><b>Evidencia:</b> ${esc(x.evidencia)}</div></article>`}
  function trendCard(t){const arrow=t.change>5?'↑':t.change<-5?'↓':'→';return `<article class="acf-trend"><div><strong>${esc(t.nombre)}</strong><span>${arrow} ${esc(t.dir)}</span></div><div class="acf-trend-values"><b>${esc(t.first.y)}:</b> ${money(t.first.v)} <em>→</em> <b>${esc(t.last.y)}:</b> ${money(t.last.v)}</div><div class="acf-trend-change">Variación acumulada: <b>${f1(t.change)}%</b></div></article>`}
  function section(title,sub,items,empty){return `<section class="acf-section"><div class="acf-section-title"><h3>${title}</h3><p>${sub}</p></div>${items.length?items.map(card).join(''):`<div class="acf-empty">${empty}</div>`}</section>`}

  function render(){
    const box=document.getElementById('auditoria');if(!box)return;
    const a=analizar();
    if(!a.years.length){box.innerHTML='';box.classList.add('hidden');return}
    const total=a.crit.length+a.imp.length+a.warn.length+a.corr.length;
    const top=[...a.crit,...a.imp,...a.warn].slice(0,3);
    const css=`<style id="acf-v2-style">
      #auditoria .acf-wrap{margin:18px 0 30px}.acf-hero{background:#fff;border:1px solid #d8e0df;border-radius:8px;overflow:hidden}.acf-hero-top{padding:16px 18px;border-left:5px solid #176d55}.acf-hero-top h2{margin:0 0 4px;color:#176d55;font-size:19px}.acf-hero-top p{margin:0;color:#4f5f5d}.acf-kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:9px;padding:0 18px 16px}.acf-kpi{border:1px solid #dbe3e2;border-radius:7px;padding:10px 12px;background:#fafcfc}.acf-kpi span{display:block;color:#667573;font-size:12px}.acf-kpi b{display:block;font-size:22px;margin-top:3px}.acf-kpi.crit{border-left:4px solid #bd2525}.acf-kpi.imp{border-left:4px solid #df7b00}.acf-kpi.warn{border-left:4px solid #b39a00}.acf-kpi.ok{border-left:4px solid #197453}.acf-kpi.info{border-left:4px solid #718892}.acf-diagnosis{margin:0 18px 18px;padding:14px 16px;border-radius:7px;background:#f5f8f7;border-left:5px solid #176d55}.acf-diagnosis .label{font-size:12px;font-weight:700;color:#5c6b69}.acf-diagnosis strong{display:block;font-size:18px;margin:2px 0 5px}.acf-diagnosis p{margin:0;line-height:1.5}.acf-section{margin-top:14px;background:#fff;border:1px solid #d8e0df;border-radius:8px;overflow:hidden}.acf-section-title{padding:13px 17px;background:#f8faf9;border-bottom:1px solid #e0e6e5}.acf-section-title h3{margin:0;color:#176d55;font-size:16px}.acf-section-title p{margin:4px 0 0;color:#657371;font-size:13px}.acf-finding{margin:10px 12px;padding:13px 15px;border:1px solid #e0e4e3;border-left:5px solid #9ca9a6;border-radius:6px;background:#fff}.acf-finding.crit{border-left-color:#bd2525;background:#fffafa}.acf-finding.imp{border-left-color:#df7b00;background:#fffdf8}.acf-finding.warn{border-left-color:#b39a00;background:#fffef7}.acf-finding.ok{border-left-color:#197453;background:#fbfefc}.acf-finding-head{display:flex;gap:9px;align-items:center;margin-bottom:8px}.acf-finding-head strong{font-size:14px}.acf-badge{font-size:10px;font-weight:800;padding:3px 7px;border-radius:10px;white-space:nowrap}.acf-badge.crit{background:#f8dddd;color:#a31818}.acf-badge.imp{background:#fff0d8;color:#9a5900}.acf-badge.warn{background:#fff8cc;color:#776700}.acf-badge.ok{background:#dff2e9;color:#176447}.acf-reading,.acf-why,.acf-evidence{font-size:13px;line-height:1.5;margin-top:5px}.acf-reading b,.acf-why b,.acf-evidence b{color:#354542}.acf-evidence{background:#f4f6f6;padding:8px 10px;border-radius:5px}.acf-trends{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px}.acf-trend{border:1px solid #dfe5e4;border-radius:6px;padding:12px;background:#fff}.acf-trend>div:first-child{display:flex;justify-content:space-between;gap:10px}.acf-trend>div:first-child span{font-size:12px;color:#176d55;font-weight:700}.acf-trend-values{margin-top:9px;font-size:13px}.acf-trend-values em{margin:0 8px;color:#8a9694}.acf-trend-change{margin-top:5px;font-size:12px;color:#667573}.acf-empty{padding:15px;color:#5e6d6a;font-size:13px}.acf-executive{margin-top:14px;background:#fff;border:1px solid #d8e0df;border-radius:8px;padding:16px 18px}.acf-executive h3{margin:0 0 8px;color:#176d55}.acf-executive ul{margin:8px 0 0 20px;padding:0}.acf-executive li{margin:6px 0;line-height:1.45}.acf-note{font-size:11px;color:#73817f;margin-top:10px}.acf-top-findings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px}.acf-top-findings .acf-finding{margin:0}.acf-top-title{padding:12px 16px 0;font-weight:700;color:#394846}@media(max-width:800px){.acf-kpis{grid-template-columns:repeat(2,1fr)}.acf-trends,.acf-top-findings{grid-template-columns:1fr}}
    </style>`;
    const topHtml=top.length?`<div class="acf-top-title">Principales señales detectadas</div><div class="acf-top-findings">${top.map(card).join('')}</div>`:'';
    const trendHtml=a.trend.length?`<section class="acf-section"><div class="acf-section-title"><h3>3. TENDENCIAS MULTIPERÍODO</h3><p>La tendencia no se limita al último cambio: muestra la dirección acumulada entre el primer y el último período disponible.</p></div><div class="acf-trends">${a.trend.map(trendCard).join('')}</div></section>`:'';
    const conclusion=`<section class="acf-executive"><h3>6. CONCLUSIÓN INTEGRADA</h3><p>${esc(a.texto)}</p>${a.resumen.length?`<ul>${a.resumen.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<div class="acf-note">La auditoría identifica indicios analíticos. Un hallazgo no constituye por sí solo una acusación de error, irregularidad o fraude; debe verificarse con documentación y contexto operativo.</div></section>`;
    box.innerHTML=css+`<div class="acf-wrap"><div class="acf-hero"><div class="acf-hero-top"><h2>4. AUDITORÍA DE COHERENCIA FINANCIERA</h2><p>Períodos analizados: <b>${a.years.join(', ')}</b></p></div><div class="acf-kpis"><div class="acf-kpi crit"><span>Críticas</span><b>${a.crit.length}</b></div><div class="acf-kpi imp"><span>Importantes</span><b>${a.imp.length}</b></div><div class="acf-kpi warn"><span>Para indagar</span><b>${a.warn.length}</b></div><div class="acf-kpi ok"><span>Favorables</span><b>${a.ok.length}</b></div><div class="acf-kpi info"><span>Correlaciones</span><b>${a.corr.length}</b></div></div><div class="acf-diagnosis"><div class="label">DIAGNÓSTICO GENERAL</div><strong>${esc(a.nivel)}</strong><p>${esc(a.texto)}</p></div>${topHtml}</div>${section('1. INCONSISTENCIAS DETECTADAS','Pruebas de cierre, relaciones aritméticas y señales que pueden afectar la confiabilidad de la información.',a.crit.concat(a.imp),'No se detectaron inconsistencias críticas o importantes en las pruebas realizadas.')}${section('2. CORRELACIONES FINANCIERAS','Cruces entre cuentas que buscan explicar qué relación existe entre actividad, estructura patrimonial, liquidez y generación operativa.',a.corr,'No se detectaron divergencias materiales entre las relaciones analizadas.')}${trendHtml}${section('4. SEÑALES FAVORABLES','Relaciones que evolucionan de manera compatible y que ayudan a equilibrar la lectura de riesgo.',a.ok,'No se identificaron señales claramente favorables con los umbrales actuales.')}${section('5. PUNTOS PARA INDAGAR','Situaciones que no necesariamente son errores, pero cuya causa debería ser explicada antes de tomar una conclusión.',a.warn,'No quedaron puntos adicionales para indagar.')}${conclusion}<div class="acf-note">Pruebas ejecutadas: ${total}. El período y las cuentas se determinan dinámicamente a partir de los estados normalizados cargados.</div></div>`;
    box.classList.remove('hidden');
  }

  window.renderAudit=render;
  window.AuditoriaCoherenciaV2={analizar,render};
})();
