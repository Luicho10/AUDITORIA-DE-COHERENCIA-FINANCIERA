/* Auditoría visible y dinámica.
   Lee la tabla normalizada ya renderizada, calcula relaciones entre períodos
   y presenta hallazgos con fórmula, evidencia e interpretación.
   No depende del motor opcional para poder mostrar el resultado. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const num=s=>{
    if(s==null||s==='—'||s==='-') return null;
    if(typeof s==='number') return Number.isFinite(s)?s:null;
    let x=String(s).trim().replace(/\s/g,'');
    if(!x)return null;
    if(/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(x)) x=x.replace(/\./g,'').replace(',','.');
    else x=x.replace(/\./g,'').replace(',','.');
    x=Number(x.replace(/[^0-9eE+\-.]/g,''));
    return Number.isFinite(x)?x:null;
  };
  const pct=(a,b)=>b!=null&&b!==0&&a!=null?(a/b-1)*100:null;
  const money=n=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  const rowsFromTable=(table)=>{
    const heads=[...table.querySelectorAll('thead tr:last-child th')].map(x=>x.textContent.trim());
    const periods=heads.filter(x=>/^(19|20)\d{2}$/.test(x));
    const out={};
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const td=[...tr.children]; if(td.length<4)return;
      const key=td[0].textContent.trim();
      if(!key)return;
      const vals={};
      periods.forEach((y,i)=>{const cell=td[4+i]; vals[y]=cell?num(cell.textContent):null;});
      out[key]={label:td[1]?.textContent.trim()||key,values:vals};
    });
    return {periods,rows:out};
  };
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
  function find(data,key){return data?.rows?.[key]?.values||null;}
  function val(data,key,y){const v=find(data,key);return v?v[y]:null;}
  function add(a,nivel,titulo,formula,valores,interpretacion){a.push({nivel,titulo,formula,valores,interpretacion});}
  function analyze(d){
    const a=[], b=d.balance, r=d.resultados;
    if(!b&&!r)return {years:[],hallazgos:[]};
    const years=[...new Set([...(b?.periods||[]),...(r?.periods||[])])].sort();
    years.forEach(y=>{
      const ac=val(b,'total_activo',y),pa=val(b,'total_pasivo',y),pn=val(b,'total_patrimonio',y);
      if(ac!=null&&pa!=null&&pn!=null){const diff=ac-pa-pn;add(a,Math.abs(diff)>1?'crit':'info',Math.abs(diff)>1?'La ecuación patrimonial no cierra — '+y:'Ecuación patrimonial conciliada — '+y,'Activo − Pasivo − Patrimonio = 0',{activo:ac,pasivo:pa,patrimonio:pn,diferencia:diff},Math.abs(diff)>1?'La estructura patrimonial presenta una diferencia matemática que debe revisarse antes de extraer conclusiones.':'Activo, pasivo y patrimonio presentan conciliación matemática en este período.');}
      const acorr=val(b,'total_activo_corriente',y); if(acorr>0){[['Inventarios','inventarios'],['Créditos comerciales','creditos_ventas'],['Caja y Bancos','caja_bancos'],['Anticipos a proveedores','anticipos_proveedores'],['Otros activos corrientes','otros_activos_corrientes']].forEach(([name,key])=>{const x=val(b,key,y);if(x!=null&&x/acorr>=.45)add(a,x/acorr>=.7?'imp':'warn','Concentración relevante del activo corriente — '+y,'Cuenta / Activo corriente × 100',{cuenta:name,importe:x,activo_corriente:acorr,peso_pct:x/acorr*100},'Una proporción relevante del activo corriente está concentrada en '+name.toLowerCase()+'. Debe contrastarse con la actividad y la capacidad de realización.');});}
      const ventas=val(r,'ventas',y),costo=val(r,'costo_ventas',y),bruto=val(r,'resultado_bruto',y),ebitda=val(r,'ebitda',y),ebit=val(r,'ebit',y),neto=val(r,'resultado_neto',y);
      if(ventas!=null&&costo!=null&&bruto!=null){const esperado=ventas-costo,diff=bruto-esperado;if(Math.abs(diff)>1)add(a,'crit','Resultado bruto no concilia — '+y,'Resultado bruto = Ventas − Costo de ventas',{ventas,costo_ventas:costo,resultado_bruto:bruto,esperado,diferencia:diff},'El resultado bruto informado no coincide con ventas menos costo de ventas.');}
      if(ventas!=null&&ventas!==0){if(bruto!=null)add(a,'info','Margen bruto — '+y,'Resultado bruto / Ventas × 100',{ventas,resultado_bruto:bruto,margen_pct:bruto/ventas*100},'Mide cuánto resultado comercial queda por cada 100 de ventas.');if(ebitda!=null)add(a,'info','Margen EBITDA — '+y,'EBITDA / Ventas × 100',{ventas,ebitda,margen_pct:ebitda/ventas*100},'Mide el resultado operativo antes de depreciaciones y amortizaciones sobre las ventas.');if(neto!=null)add(a,'info','Margen neto — '+y,'Resultado neto / Ventas × 100',{ventas,resultado_neto:neto,margen_pct:neto/ventas*100},'Mide la rentabilidad final relativa a las ventas.');}
      if(ebitda!=null&&ebit!=null&&ebitda<ebit)add(a,'warn','EBITDA inferior al EBIT — '+y,'EBITDA ≥ EBIT',{ebitda,ebit},'Debe revisarse la clasificación de depreciaciones y amortizaciones o la composición del resultado operativo.');
    });
    for(let i=1;i<years.length;i++){
      const y=years[i],p=years[i-1];
      const pairs=[['Ventas','ventas','resultados'],['Inventarios','inventarios','balance'],['Proveedores','proveedores','balance'],['Activo total','total_activo','balance'],['Pasivo total','total_pasivo','balance'],['Patrimonio neto','total_patrimonio','balance']];
      pairs.forEach(([name,key,type])=>{const d0=type==='balance'?b:r,a0=val(d0,key,p),a1=val(d0,key,y),v=pct(a1,a0);if(v!=null&&Math.abs(v)>=10)add(a,v<0?'warn':'info','Variación relevante de '+name.toLowerCase()+' — '+y,'(Valor actual / Valor anterior − 1) × 100',{periodo_anterior:p,periodo_actual:y,valor_anterior:a0,valor_actual:a1,variacion_pct:v},v<0?'El indicador presenta una contracción relevante respecto del período anterior.':'El indicador presenta un crecimiento relevante respecto del período anterior.');});
      const ventas0=val(r,'ventas',p),ventas1=val(r,'ventas',y),inv0=val(b,'inventarios',p),inv1=val(b,'inventarios',y),prov0=val(b,'proveedores',p),prov1=val(b,'proveedores',y),cli0=val(b,'creditos_ventas',p),cli1=val(b,'creditos_ventas',y);
      const vv=pct(ventas1,ventas0),vi=pct(inv1,inv0),vp=pct(prov1,prov0),vc=pct(cli1,cli0);
      if(vv!=null&&vi!=null&&vi>vv+20)add(a,'imp','Inventarios evolucionan por encima de las ventas — '+y,'Variación inventarios − Variación ventas',{variacion_ventas_pct:vv,variacion_inventarios_pct:vi},'El inventario aumenta o cae a una velocidad significativamente distinta de las ventas. Conviene revisar rotación y realización.');
      if(vv!=null&&vp!=null&&vp>vv+20)add(a,'warn','Proveedores evolucionan por encima de las ventas — '+y,'Variación proveedores − Variación ventas',{variacion_ventas_pct:vv,variacion_proveedores_pct:vp},'La obligación comercial cambia a una velocidad superior a la actividad comercial.');
      if(vv!=null&&vc!=null&&vc>vv+20)add(a,'imp','Créditos comerciales crecen más que las ventas — '+y,'Variación créditos − Variación ventas',{variacion_ventas_pct:vv,variacion_creditos_pct:vc},'La cartera crece más rápido que las ventas. Puede indicar mayor plazo de cobro o menor velocidad de recuperación.');
      const bruto0=val(r,'resultado_bruto',p),bruto1=val(r,'resultado_bruto',y),neto0=val(r,'resultado_neto',p),neto1=val(r,'resultado_neto',y);
      if(ventas0&&ventas1&&bruto0!=null&&bruto1!=null){const m0=bruto0/ventas0*100,m1=bruto1/ventas1*100;if(Math.abs(m1-m0)>=5)add(a,m1<m0?'warn':'info','Cambio relevante del margen bruto — '+y,'Margen bruto = Resultado bruto / Ventas × 100',{periodo_anterior:p,periodo_actual:y,margen_anterior_pct:m0,margen_actual_pct:m1,cambio_puntos:m1-m0},m1<m0?'El margen bruto se deteriora.':'El margen bruto mejora.');}
      if(ventas0&&ventas1&&neto0!=null&&neto1!=null){const m0=neto0/ventas0*100,m1=neto1/ventas1*100;if(Math.abs(m1-m0)>=5)add(a,m1<m0?'warn':'info','Cambio relevante del margen neto — '+y,'Margen neto = Resultado neto / Ventas × 100',{periodo_anterior:p,periodo_actual:y,margen_anterior_pct:m0,margen_actual_pct:m1,cambio_puntos:m1-m0},m1<m0?'La rentabilidad final se deteriora.':'La rentabilidad final mejora.');}
    }
    return {years,hallazgos:a};
  }
  function render(){
    const host=document.getElementById('auditoria'); if(!host)return;
    const d=collect(); if(!d.balance&&!d.resultados)return;
    const out=analyze(d),a=out.hallazgos;
    const counts={crit:a.filter(x=>x.nivel==='crit').length,imp:a.filter(x=>x.nivel==='imp').length,warn:a.filter(x=>x.nivel==='warn').length,info:a.filter(x=>x.nivel==='info').length};
    const cards=a.length?a.map(x=>`<div class="alert ${x.nivel}"><strong>${esc(x.titulo)}</strong><div class="why"><b>Fórmula:</b> ${esc(x.formula)}</div><div><b>Valores utilizados:</b><pre>${esc(JSON.stringify(x.valores,null,2))}</pre></div><div class="why"><b>Interpretación:</b> ${esc(x.interpretacion)}</div></div>`).join(''):`<div class="alert ok"><strong>No se detectaron hallazgos con los datos disponibles</strong><div>Las pruebas actuales no superaron los umbrales definidos.</div></div>`;
    host.innerHTML=`<section class="card"><h2>4. AUDITORÍA DE COHERENCIA FINANCIERA</h2><div class="body"><div class="kpis"><div class="kpi">Críticas<b>${counts.crit}</b></div><div class="kpi">Importantes<b>${counts.imp}</b></div><div class="kpi">Para indagar<b>${counts.warn}</b></div><div class="kpi">Tendencias<b>${counts.info}</b></div><div class="kpi">Períodos<b>${out.years.length}</b></div></div><div class="evidence"><b>Períodos analizados:</b> ${out.years.join(', ')}</div><div class="alert ok"><strong>LECTURA ANALÍTICA</strong><div>Los resultados siguientes son indicios analíticos: muestran relaciones matemáticas, cambios y correlaciones que requieren revisión. No constituyen por sí solos una acusación de error o fraude.</div></div>${cards}</div></section>`;
    host.classList.remove('hidden');
  }
  const start=()=>{render();const c=document.getElementById('controlBody');if(c){new MutationObserver(()=>setTimeout(render,0)).observe(c,{childList:true,subtree:true});}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
