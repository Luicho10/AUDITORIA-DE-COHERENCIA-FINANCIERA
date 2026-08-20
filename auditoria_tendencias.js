/* AUDITORIA DE COHERENCIA FINANCIERA - TENDENCIAS V6
   Lectura ejecutiva centrada en el ultimo periodo disponible.
   - Lee todos los periodos disponibles.
   - El ultimo periodo es el periodo actual y recibe el mayor peso.
   - Los periodos anteriores se utilizan como antecedentes para explicar la evolucion.
   - No expone una ficha independiente por cada año.
   - La conclusion se formula sobre la situacion actual y sus cambios relevantes.
*/
(function(){
  const money=n=>n==null?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n));
  const pct=(a,b)=>b!=null&&b!==0?(a/b-1)*100:null;
  const f1=n=>n==null?'—':Number(n).toFixed(1)+'%';
  const val=(d,k,y)=>d?.matched?.[k]?.values?.[y]??null;
  const normalized=()=>{try{return(typeof NORMALIZED!=='undefined'?NORMALIZED:null)||window.NORMALIZED||{}}catch(_){return window.NORMALIZED||{}}};

  const defs=[
    ['VENTAS','resultados','ventas'],
    ['RESULTADO BRUTO','resultados','resultado_bruto'],
    ['EBITDA','resultados','ebitda'],
    ['EBIT','resultados','ebit'],
    ['RESULTADO NETO','resultados','resultado_neto'],
    ['ACTIVO TOTAL','balance','total_activo'],
    ['PASIVO TOTAL','balance','total_pasivo'],
    ['PATRIMONIO NETO','balance','total_patrimonio'],
    ['ACTIVO CORRIENTE','balance','total_activo_corriente'],
    ['PASIVO CORRIENTE','balance','total_pasivo_corriente'],
    ['INVENTARIOS','balance','inventarios'],
    ['CREDITOS COMERCIALES','balance','creditos_ventas'],
    ['PROVEEDORES','balance','proveedores'],
    ['INTERESES FINANCIEROS','resultados','intereses_gasto']
  ];

  function periodsOf(d){
    const set=new Set();
    ['balance','resultados','flujo'].forEach(k=>(d[k]?.periods||[]).forEach(y=>{if(/^\d{4}$/.test(String(y)))set.add(String(y));}));
    return [...set].sort();
  }

  function series(d,source,key){
    const obj=source==='balance'?d.balance:d.resultados;
    const periods=(obj?.periods||[]).map(String).filter(y=>/^\d{4}$/.test(y)).sort();
    return periods.map(y=>({y,v:val(obj,key,y)})).filter(p=>p.v!=null);
  }

  function currentValue(d,source,key,period){
    return val(source==='balance'?d.balance:d.resultados,key,period);
  }

  function comparison(d,source,key,periods){
    const pts=series(d,source,key).filter(p=>periods.includes(p.y));
    const current=pts[pts.length-1];
    const previous=pts.length>1?pts[pts.length-2]:null;
    return {pts,current,previous,change:previous?pct(current.v,previous.v):null};
  }

  function trendPhrase(pts){
    if(!pts||pts.length<2)return 'sin antecedentes comparables suficientes';
    const vals=pts.map(p=>Number(p.v));
    const first=vals[0],last=vals[vals.length-1];
    if(first===0||!Number.isFinite(first)||!Number.isFinite(last))return 'con trayectoria disponible, sin variacion porcentual inicial concluyente';
    const total=(last/first-1)*100;
    const direction=total>5?'creciente':total<-5?'decreciente':'relativamente estable';
    return `trayectoria ${direction} en el conjunto de periodos disponibles (${f1(total)} desde ${pts[0].y} hasta ${pts[pts.length-1].y})`;
  }

  function interpret(name,cmp){
    const c=cmp.current,p=cmp.previous,ch=cmp.change;
    if(!c)return null;
    const b=Number(c.v),a=p==null?null:Number(p.v);
    if(p&&a>0&&b<0)return {tone:'negative',label:'deterioro actual con cambio de signo',text:`En ${c.y}, ${name.toLowerCase()} pasa de ${money(a)} a ${money(b)} respecto de ${p.y}. El cambio de signo constituye el principal hecho del periodo actual y debe explicarse a partir de sus componentes.`};
    if(p&&a<0&&b>0)return {tone:'positive',label:'mejora actual con cambio de signo',text:`En ${c.y}, ${name.toLowerCase()} pasa de ${money(a)} a ${money(b)} respecto de ${p.y}. El cambio de signo muestra una recuperacion material que debe contrastarse con la sostenibilidad de la mejora.`};

    if(name==='VENTAS'){
      if(ch>5)return {tone:'positive',label:'crecimiento de la actividad actual',text:`Las ventas de ${c.y} alcanzan ${money(b)} y aumentan ${f1(ch)} frente a ${p.y}. La actividad comercial mejora en el periodo actual.`};
      if(ch<-5)return {tone:'negative',label:'contraccion de la actividad actual',text:`Las ventas de ${c.y} alcanzan ${money(b)} y disminuyen ${f1(Math.abs(ch))} frente a ${p.y}. La menor actividad debe contrastarse con margen, gastos y capital de trabajo.`};
      return {tone:'neutral',label:'actividad actual sin cambio material',text:`Las ventas de ${c.y} alcanzan ${money(b)}, con una variacion de ${f1(ch)} frente a ${p.y}. No se observa un cambio material en el nivel de actividad.`};
    }

    if(name==='RESULTADO BRUTO'){
      if(ch>5)return {tone:'positive',label:'mejora del resultado comercial',text:`El resultado bruto de ${c.y} alcanza ${money(b)} y mejora ${f1(ch)} frente a ${p.y}. Debe verificarse si la mejora supera proporcionalmente a las ventas y representa un fortalecimiento del margen.`};
      if(ch<-5)return {tone:'negative',label:'deterioro del resultado comercial',text:`El resultado bruto de ${c.y} alcanza ${money(b)} y disminuye ${f1(Math.abs(ch))}. El cambio debe relacionarse con ventas y costo de ventas para determinar el comportamiento del margen.`};
    }

    if(name==='EBITDA'){
      if(b<0)return {tone:'negative',label:'generacion operativa negativa en el periodo actual',text:`El EBITDA de ${c.y} es negativo por ${money(Math.abs(b))}. La operacion actual no genera resultado antes de depreciaciones y amortizaciones. La evolucion frente a ${p?.y||'periodos anteriores'} muestra un deterioro que debe contrastarse con ventas, margen y gastos operativos.`};
      if(ch>5)return {tone:'positive',label:'mejora de generacion operativa',text:`El EBITDA de ${c.y} alcanza ${money(b)} y mejora ${f1(ch)} frente a ${p.y}. La mejora debe contrastarse con las ventas para determinar si proviene de mayor actividad, mejor margen o menor estructura de gastos.`};
      if(ch<-5)return {tone:'negative',label:'deterioro de generacion operativa',text:`El EBITDA de ${c.y} alcanza ${money(b)} y disminuye ${f1(Math.abs(ch))} frente a ${p.y}. La generacion operativa pierde capacidad en el periodo actual.`};
      return {tone:'neutral',label:'generacion operativa sin cambio material',text:`El EBITDA de ${c.y} alcanza ${money(b)} y presenta una variacion de ${f1(ch)} frente a ${p.y}.`};
    }

    if(name==='EBIT'){
      if(b<0)return {tone:'negative',label:'resultado operativo negativo',text:`El EBIT de ${c.y} es negativo por ${money(Math.abs(b))}. La operacion no alcanza a cubrir depreciaciones y amortizaciones y debe analizarse conjuntamente con EBITDA y margen bruto.`};
      if(ch>5)return {tone:'positive',label:'mejora del resultado operativo',text:`El EBIT mejora ${f1(ch)} frente a ${p.y}, alcanzando ${money(b)} en ${c.y}.`};
      if(ch<-5)return {tone:'negative',label:'deterioro del resultado operativo',text:`El EBIT disminuye ${f1(Math.abs(ch))} frente a ${p.y}, situandose en ${money(b)} en ${c.y}.`};
    }

    if(name==='RESULTADO NETO'){
      if(b<0)return {tone:'negative',label:'perdida en el periodo actual',text:`El resultado neto de ${c.y} termina en una perdida de ${money(Math.abs(b))}. El hecho debe explicarse a partir del resultado operativo, costo financiero y otros componentes del resultado.`};
      if(ch>5)return {tone:'positive',label:'mejora del resultado final',text:`El resultado neto de ${c.y} alcanza ${money(b)} y mejora ${f1(ch)} frente a ${p.y}. Corresponde verificar la calidad y sostenibilidad de la mejora.`};
      if(ch<-5)return {tone:'negative',label:'deterioro del resultado final',text:`El resultado neto de ${c.y} alcanza ${money(b)} y disminuye ${f1(Math.abs(ch))} frente a ${p.y}.`};
    }

    if(name==='INVENTARIOS'){
      if(ch>25)return {tone:'warning',label:'mayor inmovilizacion en inventarios',text:`Los inventarios alcanzan ${money(b)} en ${c.y} y aumentan ${f1(ch)} frente a ${p.y}. Debe determinarse si el stock crece por encima de las ventas y presiona el capital de trabajo.`};
      if(ch<-25)return {tone:'positive',label:'reduccion relevante de inventarios',text:`Los inventarios se reducen ${f1(Math.abs(ch))} en ${c.y}. La variacion es favorable si acompaña una actividad estable o creciente y una mejor rotacion.`};
    }

    if(name==='CREDITOS COMERCIALES'){
      if(ch>25)return {tone:'warning',label:'mayor exposicion en cartera',text:`Los creditos comerciales alcanzan ${money(b)} y aumentan ${f1(ch)} en ${c.y}. Si el crecimiento supera a las ventas, puede existir mayor financiacion al cliente o menor velocidad de cobranza.`};
      if(ch<-25)return {tone:'positive',label:'reduccion de cartera',text:`Los creditos comerciales disminuyen ${f1(Math.abs(ch))} en ${c.y}. Debe verificarse si la reduccion proviene de mejor cobranza o de menor venta a credito.`};
    }

    if(name==='PROVEEDORES'){
      if(ch>25)return {tone:'warning',label:'mayor utilizacion de financiamiento comercial',text:`Los proveedores alcanzan ${money(b)} y aumentan ${f1(ch)} en ${c.y}. Si crecen por encima de las ventas, aumenta la dependencia del financiamiento comercial.`};
      if(ch<-25)return {tone:'positive',label:'reduccion del financiamiento comercial',text:`Los proveedores disminuyen ${f1(Math.abs(ch))} en ${c.y}. La variacion debe contrastarse con compras, caja y actividad comercial.`};
    }

    if(name==='ACTIVO TOTAL'){
      if(ch>30)return {tone:'warning',label:'expansion del activo',text:`El activo total alcanza ${money(b)} en ${c.y} y aumenta ${f1(ch)} frente a ${p.y}. Debe verificarse si la expansion acompaña la actividad o genera recursos de baja productividad.`};
      if(ch<-30)return {tone:'negative',label:'contraccion del activo',text:`El activo total disminuye ${f1(Math.abs(ch))} en ${c.y}. La reduccion debe explicarse por los componentes que originan el cambio.`};
    }

    if(name==='PASIVO TOTAL'){
      if(ch>30)return {tone:'warning',label:'aumento significativo del pasivo',text:`El pasivo total alcanza ${money(b)} y aumenta ${f1(ch)} en ${c.y}. Debe determinarse si financia expansion o cubre necesidades derivadas de una menor generacion operativa.`};
      if(ch<-30)return {tone:'positive',label:'reduccion significativa del pasivo',text:`El pasivo total disminuye ${f1(Math.abs(ch))} en ${c.y}. La reduccion es favorable si no responde a una contraccion excesiva de la actividad o de los activos.`};
    }

    if(name==='PATRIMONIO NETO'){
      if(ch>30)return {tone:'positive',label:'fortalecimiento patrimonial',text:`El patrimonio neto alcanza ${money(b)} y aumenta ${f1(ch)} en ${c.y}. El respaldo propio mejora y debe relacionarse con resultados, aportes y utilidades acumuladas.`};
      if(ch<-30)return {tone:'negative',label:'deterioro patrimonial',text:`El patrimonio neto disminuye ${f1(Math.abs(ch))} en ${c.y}, debilitando el respaldo propio. Debe identificarse si la causa se encuentra en perdidas, retiros o ajustes.`};
    }

    if(name==='INTERESES FINANCIEROS'&&ch>25)return {tone:'warning',label:'mayor carga financiera',text:`Los intereses financieros alcanzan ${money(b)} en ${c.y} y aumentan ${f1(ch)} frente a ${p.y}. El efecto debe contrastarse con EBITDA y cobertura financiera.`};

    return {tone:'neutral',label:'variacion actual moderada',text:`${name} se ubica en ${money(b)} en ${c.y}. Frente a ${p?.y||'el periodo anterior'} la variacion es de ${p?f1(ch):'no concluyente'}.`};
  }

  function render(){
    const host=document.getElementById('auditoria');
    if(!host||host.classList.contains('hidden'))return;
    const h=[...host.querySelectorAll('h3')].find(x=>x.textContent.includes('D. TENDENCIAS MULTIPERIODO'));
    if(!h)return;
    const trend=h.parentElement.querySelector('.trend');if(!trend)return;
    const n=normalized(),periods=periodsOf(n),current=periods[periods.length-1];
    if(!current){trend.innerHTML='<div class="t neutral"><div class="tn">SIN PERIODOS</div><div class="ts">No existen periodos anuales suficientes para realizar la lectura multiperiodo.</div></div>';return;}

    const previous=periods.length>1?periods[periods.length-2]:null;
    const cards=[];

    defs.forEach(([name,source,key])=>{
      const cmp=comparison(n,source,key,periods);if(!cmp.current)return;
      const it=interpret(name,cmp);if(!it)return;
      const pts=cmp.pts;
      const history=pts.length>1?`${pts.map(p=>p.y+': '+money(p.v)).join(' → ')}`:'sin comparables anteriores';
      cards.push(`<div class="t ${it.tone}"><div class="tn">${name} — ${current}</div><div><b>SITUACION ACTUAL:</b> ${money(cmp.current.v)}</div><div class="td">${it.label}</div><div class="ts"><b>ANALISIS:</b> ${it.text}</div><div class="th"><b>ANTECEDENTE:</b> ${history}</div></div>`);
    });

    const sales=comparison(n,'resultados','ventas',periods);
    const inv=comparison(n,'balance','inventarios',periods);
    const cli=comparison(n,'balance','creditos_ventas',periods);
    const prov=comparison(n,'balance','proveedores',periods);
    const ebitda=comparison(n,'resultados','ebitda',periods);
    const intereses=comparison(n,'resultados','intereses_gasto',periods);
    const activos=comparison(n,'balance','total_activo',periods);
    const pasivos=comparison(n,'balance','total_pasivo',periods);
    const patrimonio=comparison(n,'balance','total_patrimonio',periods);

    const rel=[];
    if(sales?.change!=null&&inv?.change!=null){
      const gap=inv.change-sales.change;
      if(gap>25)rel.push(`<b>Inventarios vs. ventas:</b> en ${current}, los inventarios crecen ${f1(inv.change)} frente a ${f1(sales.change)} de ventas. La brecha de ${f1(gap)} puntos sugiere mayor inmovilizacion relativa de capital de trabajo.`);
      else if(gap<-25)rel.push(`<b>Inventarios vs. ventas:</b> en ${current}, los inventarios crecen ${f1(inv.change)} frente a ${f1(sales.change)} de ventas. La actividad supera la evolucion del stock, compatible con una mejor utilizacion relativa del inventario.`);
    }
    if(sales?.change!=null&&cli?.change!=null){
      const gap=cli.change-sales.change;
      if(gap>25)rel.push(`<b>Cartera vs. ventas:</b> los creditos comerciales crecen ${f1(cli.change)} frente a ${f1(sales.change)} de ventas. La cartera aumenta mas rapido que la actividad y requiere atencion sobre cobranza y plazos.`);
      else if(gap<-25)rel.push(`<b>Cartera vs. ventas:</b> los creditos comerciales crecen ${f1(cli.change)} frente a ${f1(sales.change)} de ventas. La cartera acompaña por debajo a la actividad, compatible con mayor contado o mejor realizacion.`);
    }
    if(sales?.change!=null&&prov?.change!=null){
      const gap=prov.change-sales.change;
      if(gap>25)rel.push(`<b>Proveedores vs. ventas:</b> los proveedores crecen ${f1(prov.change)} frente a ${f1(sales.change)} de ventas. La operacion utiliza proporcionalmente mas financiamiento comercial.`);
    }
    if(ebitda?.change!=null&&intereses?.change!=null&&ebitda.current&&intereses.current&&Number(intereses.current.v)>0){
      const cov=Number(ebitda.current.v)/Number(intereses.current.v);
      rel.push(`<b>Generacion vs. carga financiera:</b> el EBITDA de ${current} es ${money(ebitda.current.v)} frente a intereses por ${money(intereses.current.v)}, resultando una cobertura aproximada de ${cov.toFixed(2)}x. Esta relacion es prioritaria para evaluar la capacidad actual de servicio financiero.`);
    }
    if(activos?.change!=null&&sales?.change!=null&&activos.change-sales.change>30)rel.push(`<b>Activos vs. actividad:</b> los activos crecen ${f1(activos.change)} mientras las ventas lo hacen ${f1(sales.change)}. La estructura de recursos aumenta por encima de la escala comercial y requiere explicacion.`);
    if(pasivos?.change!=null&&patrimonio?.change!=null&&pasivos.change-patrimonio.change>25)rel.push(`<b>Pasivo vs. patrimonio:</b> el pasivo crece ${f1(pasivos.change)} frente a ${f1(patrimonio.change)} del patrimonio. La financiacion de terceros gana peso relativo en el periodo actual.`);

    if(rel.length)cards.push(`<div class="t neutral"><div class="tn">LECTURA INTEGRADA — ${current}</div><div class="ts">${rel.join('<br><br>')}</div></div>`);

    trend.innerHTML=`<div class="t neutral"><div class="tn">PERIODO ACTUAL: ${current}</div><div class="ts"><b>CRITERIO DE LECTURA:</b> todos los periodos disponibles fueron procesados. La interpretacion se concentra en ${current}; los periodos anteriores se utilizan exclusivamente como antecedentes para explicar si la situacion actual mejoro, se deterioro o cambio de estructura.</div><div class="th"><b>PERIODOS PROCESADOS:</b> ${periods.join(' → ')}</div></div>`+cards.join('');
  }

  function watch(){
    const host=document.getElementById('auditoria');if(!host)return;
    new MutationObserver(()=>setTimeout(render,40)).observe(host,{childList:true,subtree:true});
    setTimeout(render,200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();
