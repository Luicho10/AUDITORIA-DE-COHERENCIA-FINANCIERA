/* AUDITORIA DE COHERENCIA FINANCIERA - TENDENCIAS V5
   Correccion: ignora valores iniciales 0 usados como ausencia de dato por el normalizador.
   Trabaja con los periodos realmente disponibles y genera interpretaciones especificas.
*/
(function(){
  const money=n=>n==null?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n));
  const pct=(a,b)=>b!=null&&b!==0?(a/b-1)*100:null;
  const f1=n=>n==null?'—':Number(n).toFixed(1)+'%';
  const val=(d,k,y)=>d?.matched?.[k]?.values?.[y]??null;
  const normalized=()=>{try{return(typeof NORMALIZED!=='undefined'?NORMALIZED:null)||window.NORMALIZED||{}}catch(_){return window.NORMALIZED||{}}};

  const defs=[
    ['VENTAS','resultados','ventas','actividad comercial'],
    ['RESULTADO BRUTO','resultados','resultado_bruto','margen comercial'],
    ['EBITDA','resultados','ebitda','generacion operativa'],
    ['RESULTADO NETO','resultados','resultado_neto','resultado final'],
    ['ACTIVO TOTAL','balance','total_activo','estructura de activos'],
    ['PASIVO TOTAL','balance','total_pasivo','financiacion de terceros'],
    ['PATRIMONIO NETO','balance','total_patrimonio','base patrimonial'],
    ['INVENTARIOS','balance','inventarios','capital inmovilizado en stock'],
    ['CREDITOS COMERCIALES','balance','creditos_ventas','cartera comercial'],
    ['PROVEEDORES','balance','proveedores','financiacion comercial']
  ];

  function series(d,source,key){
    const obj=source==='balance'?d.balance:d.resultados;
    const periods=(obj?.periods||[]).map(String).filter(y=>/^\\d{4}$/.test(y)).sort();
    const raw=periods.map(y=>({y,v:val(obj,key,y)})).filter(p=>p.v!=null);
    /* En este proyecto el normalizador usa 0 para celdas sin importe. Se descartan
       solamente los ceros iniciales anteriores al primer importe distinto de cero. */
    let firstNonZero=raw.findIndex(p=>Number(p.v)!==0);
    if(firstNonZero>0) raw.splice(0,firstNonZero);
    return raw;
  }

  function interpret(name,pts){
    const first=pts[0],last=pts[pts.length-1];
    if(pts.length<2) return {label:'evolucion no concluyente',tone:'neutral',text:`${name} presenta ${money(first.v)} en ${first.y}. Con la informacion disponible no se establece una tendencia interperiodo concluyente.`};
    const prev=pts[pts.length-2], ch=pct(last.v,prev.v);
    const a=Number(prev.v), b=Number(last.v);
    if(a>0&&b<0) return {label:'cambio de signo: positivo a negativo',tone:'negative',text:`${name} pasa de ${money(a)} en ${prev.y} a ${money(b)} en ${last.y}. El cambio implica un deterioro material de la posicion observada y debe explicarse a partir de los componentes que determinan esta cuenta.`};
    if(a<0&&b>0) return {label:'cambio de signo: negativo a positivo',tone:'positive',text:`${name} pasa de ${money(a)} en ${prev.y} a ${money(b)} en ${last.y}. Se observa una recuperacion material; corresponde verificar si responde a una mejora sostenible o a un efecto extraordinario.`};
    if(name==='VENTAS'){
      if(ch>5)return {label:'crecimiento de la actividad',tone:'positive',text:`Las ventas aumentan ${f1(ch)} entre ${prev.y} y ${last.y}, pasando de ${money(a)} a ${money(b)}. La actividad comercial se expande en el ultimo periodo comparable.`};
      if(ch<-5)return {label:'contraccion de la actividad',tone:'negative',text:`Las ventas disminuyen ${f1(Math.abs(ch))} entre ${prev.y} y ${last.y}. La contraccion comercial requiere contrastarse con margen bruto, gastos operativos y capital de trabajo.`};
      return {label:'actividad comercial estable',tone:'neutral',text:`Las ventas presentan una variacion de ${f1(ch)} entre ${prev.y} y ${last.y}. No se observa un cambio material en el nivel de actividad.`};
    }
    if(name==='EBITDA'){
      if(b<0)return {label:'generacion operativa negativa',tone:'negative',text:`El EBITDA termina en ${money(b)} en ${last.y}, despues de registrar ${money(a)} en ${prev.y}. La operacion deja de generar resultado antes de depreciaciones y amortizaciones; esto constituye una señal de deterioro operativo y debe relacionarse con ventas, costos y gastos.`};
      if(ch>5)return {label:'mejora de generacion operativa',tone:'positive',text:`El EBITDA aumenta ${f1(ch)} entre ${prev.y} y ${last.y}. La generacion operativa mejora y debe contrastarse con la evolucion de ventas para determinar si la mejora proviene de mayor actividad, margen o reduccion de gastos.`};
      if(ch<-5)return {label:'deterioro de generacion operativa',tone:'negative',text:`El EBITDA disminuye ${f1(Math.abs(ch))} entre ${prev.y} y ${last.y}. La generacion operativa pierde capacidad y requiere identificar si la causa se encuentra en ventas, costo de ventas o gastos operativos.`};
    }
    if(name==='RESULTADO NETO'){
      if(b<0)return {label:'resultado final negativo',tone:'negative',text:`El resultado neto termina en perdida de ${money(Math.abs(b))} en ${last.y}. Debe determinarse si la pérdida proviene de la operación, del costo financiero, diferencias de cambio u otros componentes no recurrentes.`};
      if(ch>5)return {label:'mejora del resultado final',tone:'positive',text:`El resultado neto aumenta ${f1(ch)} entre ${prev.y} y ${last.y}. La mejora debe contrastarse con el comportamiento operativo para determinar su calidad y sostenibilidad.`};
      if(ch<-5)return {label:'deterioro del resultado final',tone:'negative',text:`El resultado neto disminuye ${f1(Math.abs(ch))} entre ${prev.y} y ${last.y}. Debe identificarse qué componente explica la reducción de la rentabilidad.`};
    }
    if(name==='INVENTARIOS'){
      if(ch>25)return {label:'acumulacion relevante de inventarios',tone:'warning',text:`Los inventarios aumentan ${f1(ch)} entre ${prev.y} y ${last.y}. El crecimiento debe contrastarse con las ventas: si el stock crece más rápido que la actividad, aumenta el capital inmovilizado y el riesgo de realizacion.`};
      if(ch<-25)return {label:'reduccion relevante de inventarios',tone:'positive',text:`Los inventarios disminuyen ${f1(Math.abs(ch))} entre ${prev.y} y ${last.y}. La reducción puede ser favorable si responde a mayor rotacion y ventas, pero debe verificarse que no derive de una contraccion de la actividad.`};
    }
    if(name==='CREDITOS COMERCIALES'){
      if(ch>25)return {label:'crecimiento relevante de cartera',tone:'warning',text:`Los creditos comerciales aumentan ${f1(ch)} entre ${prev.y} y ${last.y}. Si este crecimiento supera a las ventas, puede indicar mayor plazo de financiacion al cliente o menor velocidad de cobranza.`};
      if(ch<-25)return {label:'reduccion relevante de cartera',tone:'positive',text:`Los creditos comerciales disminuyen ${f1(Math.abs(ch))}. Debe contrastarse con las ventas y la disponibilidad de caja para determinar si refleja mejor cobranza o menor venta a credito.`};
    }
    if(name==='PROVEEDORES'){
      if(ch>25)return {label:'mayor dependencia comercial',tone:'warning',text:`Los proveedores aumentan ${f1(ch)} entre ${prev.y} y ${last.y}. Si crecen por encima de las ventas, aumenta la dependencia del financiamiento comercial.`};
      if(ch<-25)return {label:'reduccion de financiamiento comercial',tone:'positive',text:`Los proveedores disminuyen ${f1(Math.abs(ch))}. La variacion puede reflejar cancelacion de obligaciones o menor utilizacion del credito comercial y debe contrastarse con caja y compras.`};
    }
    if(name==='ACTIVO TOTAL'){
      if(ch>30)return {label:'expansion patrimonial superior a la actividad',tone:'warning',text:`El activo total aumenta ${f1(ch)}, una variacion que debe contrastarse con las ventas. Si los activos crecen mucho mas que la actividad, puede existir acumulacion o menor productividad de los recursos.`};
      if(ch<-30)return {label:'contraccion del activo',tone:'negative',text:`El activo total disminuye ${f1(Math.abs(ch))}. La contraccion debe explicarse identificando qué componentes del activo originan el cambio.`};
    }
    if(name==='PASIVO TOTAL'){
      if(ch>30)return {label:'aumento significativo del pasivo',tone:'warning',text:`El pasivo total aumenta ${f1(ch)}. Debe verificarse si el crecimiento financia expansion productiva o cubre necesidades derivadas de una menor generacion operativa.`};
      if(ch<-30)return {label:'reduccion significativa del pasivo',tone:'positive',text:`El pasivo total disminuye ${f1(Math.abs(ch))}. La reduccion mejora la estructura financiera si no fue acompañada por una contraccion excesiva de activos o actividad.`};
    }
    if(name==='PATRIMONIO NETO'){
      if(ch>30)return {label:'fortalecimiento patrimonial',tone:'positive',text:`El patrimonio neto aumenta ${f1(ch)} entre ${prev.y} y ${last.y}. La mejora fortalece el respaldo patrimonial y debe relacionarse con resultados, aportes y acumulacion de utilidades.`};
      if(ch<-30)return {label:'deterioro patrimonial',tone:'negative',text:`El patrimonio neto disminuye ${f1(Math.abs(ch))}. La reduccion debilita el respaldo propio y requiere identificar si responde a pérdidas, retiros o ajustes patrimoniales.`};
    }
    if(name==='RESULTADO BRUTO'){
      if(ch>5)return {label:'mejora del resultado comercial',tone:'positive',text:`El resultado bruto aumenta ${f1(ch)} entre ${prev.y} y ${last.y}. Debe contrastarse con las ventas para determinar si mejora el margen comercial y no solamente el volumen.`};
      if(ch<-5)return {label:'deterioro del resultado comercial',tone:'negative',text:`El resultado bruto disminuye ${f1(Math.abs(ch))}. La variacion debe contrastarse con ventas y costo de ventas para determinar si existe deterioro del margen.`};
    }
    return {label:'variacion moderada',tone:'neutral',text:`${name} pasa de ${money(a)} en ${prev.y} a ${money(b)} en ${last.y}, con una variacion de ${f1(ch)}. La magnitud no supera los umbrales establecidos para considerarla un cambio material.`};
  }

  function render(){
    const host=document.getElementById('auditoria');if(!host||host.classList.contains('hidden'))return;
    const h=[...host.querySelectorAll('h3')].find(x=>x.textContent.includes('D. TENDENCIAS MULTIPERIODO'));if(!h)return;
    const trend=h.parentElement.querySelector('.trend');if(!trend)return;
    const n=normalized();
    const cards=[];
    defs.forEach(([name,source,key])=>{
      const pts=series(n,source,key);if(!pts.length)return;
      const it=interpret(name,pts);
      const seq=pts.map(p=>`${p.y}: ${money(p.v)}`).join(' → ');
      cards.push(`<div class="t ${it.tone}"><div class="tn">${name}</div><div><b>TRAYECTORIA:</b> ${seq}</div><div class="td">${it.label}</div><div class="ts"><b>INTERPRETACION:</b> ${it.text}</div></div>`);
    });
    trend.innerHTML=cards.join('');
  }
  function watch(){
    const host=document.getElementById('auditoria');if(!host)return;
    new MutationObserver(()=>setTimeout(render,40)).observe(host,{childList:true,subtree:true});
    setTimeout(render,200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();
