window.AuditoriaNormalizador = (() => {
  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const extractYears = v => {
    if (v instanceof Date) { const y=v.getFullYear(); return Number.isFinite(y)&&y>=1900&&y<=2100?[String(y)]:[]; }
    if (typeof v === 'number') {
      const n=Number(v);
      if(Number.isInteger(n)&&n>=1900&&n<=2100)return[String(n)];
      if(Number.isFinite(n)&&n>=30000&&n<=60000){
        const d=new Date(Date.UTC(1899,11,30)+n*86400000),y=d.getUTCFullYear();
        return Number.isFinite(y)&&y>=1900&&y<=2100?[String(y)]:[];
      }
      return [];
    }
    const s=String(v==null?'':v).trim(); if(!s)return [];
    if(/^(19|20)\d{2}$/.test(s))return[s];
    const m=s.match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/); return m?[m[1]]:[];
  };
  const number=v=>{
    if(v instanceof Date)return null;if(typeof v==='number')return Number.isFinite(v)?v:null;
    let s=String(v==null?'':v).trim();if(!s)return null;s=s.replace(/\s/g,'').replace(/[()]/g,'-');
    if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');
    else if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replace(/,/g,'');else s=s.replace(/,/g,'.');
    const n=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(n)?n:null;
  };
  const C={
    balance:{
      caja_bancos:['caja','caja y bancos','bancos','disponible','disponibilidades','efectivo','efectivo y equivalentes'],creditos_ventas:['creditos por ventas','cuentas por cobrar','clientes','deudores por ventas','creditos comerciales'],inventarios:['inventarios','inventario','existencias','mercaderias','stock'],anticipos_proveedores:['anticipos a proveedores','anticipos proveedores'],otros_activos_corrientes:['otros activos corrientes','otros activos cp'],ppe:['propiedad planta y equipo','propiedad, planta y equipo','bienes de uso','activo fijo','activos fijos','inmovilizado material'],otros_activos_no_corrientes:['otros activos no corrientes','otros activos lp'],proveedores:['proveedores','cuentas por pagar a proveedores','proveedores nacionales','proveedores del exterior','deudas comerciales'],prestamos_cp:['prestamos corrientes','prestamos corto plazo','deudas financieras corrientes','prestamos bancarios cp','deudas financieras cp'],prestamos_lp:['prestamos no corrientes','prestamos largo plazo','deudas financieras no corrientes','prestamos bancarios lp','deudas financieras lp'],deudas_fiscales:['deudas fiscales','impuestos a pagar','tributos a pagar'],deudas_sociales:['deudas sociales','sueldos y cargas sociales','cargas sociales'],acreedores_varios:['acreedores varios'],capital:['capital','capital social'],reservas:['reservas','reserva legal','reservas legales'],resultados_acumulados:['resultados acumulados','resultados no asignados','utilidades acumuladas','perdidas acumuladas'],resultado_ejercicio:['resultado del ejercicio','resultado neto del ejercicio','utilidad del ejercicio','perdida del ejercicio'],total_activo:['total activo','total de activos'],total_activo_corriente:['total activo corriente'],total_activo_no_corriente:['total activo no corriente'],total_pasivo:['total pasivo','total de pasivos'],total_pasivo_corriente:['total pasivo corriente'],total_pasivo_no_corriente:['total pasivo no corriente'],total_patrimonio:['total patrimonio','patrimonio neto','total patrimonio neto']
    },
    resultados:{ventas:['ventas netas','ventas','ingresos por ventas','ingresos de actividades ordinarias'],costo_ventas:['costo de ventas','costo de mercaderias vendidas','costo de mercaderias','costos de ventas'],resultado_bruto:['resultado bruto comercial principal','resultado bruto total','resultado bruto','utilidad bruta','ganancia bruta'],gastos_comerciales:['gastos de comercializacion','gastos comerciales','gastos de ventas','gastos operativos, administrativos y de ventas'],gastos_administrativos:['gastos de administracion','gastos administrativos'],otros_gastos_operativos:['otros egresos operativos','otros gastos operativos'],diferencia_cambio:['perdidas por diferencia de cambio','ganancias por diferencia de cambio','diferencia de cambio'],intereses_gasto:['intereses financieros pagados','intereses pagados','intereses perdidos','gastos financieros','costos financieros'],intereses_ingreso:['intereses financieros cobrados','intereses ganados','ingresos financieros'],depreciaciones:['depreciaciones','depreciacion','depreciaciones del ejercicio','depreciacion del ejercicio'],amortizaciones:['amortizaciones','amortizacion','amortizaciones del ejercicio','amortizacion del ejercicio'],ebitda:['ebitda','flujo operativo puro','flujo operativo puro/caja real'],ebit:['ebit','resultado operativo','resultado operativo contable'],resultado_antes_impuesto:['resultado antes del impuesto','resultado antes de impuestos','resultado antes de impuesto'],impuesto_renta:['impuesto a la renta','impuesto a las ganancias'],resultado_neto:['resultado neto total del ejercicio','resultado neto de capitalizaciones','resultado neto','utilidad neta','ganancia neta','perdida neta']
    },
    flujo:{flujo_operativo:['flujo de efectivo de actividades operativas','flujo operativo','efectivo generado por actividades operativas'],cobros_clientes:['cobros a clientes','cobros por ventas','cobranzas de clientes'],pagos_proveedores:['pagos a proveedores','pago a proveedores','pagos por compras'],intereses_pagados:['intereses pagados','pagos de intereses'],flujo_inversion:['flujo de efectivo de actividades de inversion','flujo de inversion'],capex:['capex','adquisicion de propiedad planta y equipo','compras de propiedad planta y equipo','adquisiciones de activos fijos'],flujo_financiamiento:['flujo de efectivo de actividades de financiacion','flujo de financiamiento'],prestamos_recibidos:['prestamos recibidos','obtencion de prestamos','nuevos prestamos'],prestamos_pagados:['prestamos pagados','amortizacion de prestamos','pago de prestamos'],aportes:['aportes de capital','aportes de socios','capital aportado'],dividendos:['dividendos pagados','retiros de socios'],flujo_neto:['aumento neto del efectivo','disminucion neta del efectivo','flujo neto de efectivo','variacion neta del efectivo'],efectivo_inicial:['efectivo al inicio','saldo inicial de efectivo','efectivo inicial'],efectivo_final:['efectivo al cierre','saldo final de efectivo','efectivo final']}
  };
  const badSheet=/endeudamiento|periodo medio|rotacion|liquidez|score|ratio|margen|cobertura|indicadores|calificacion/;
  const rowText=row=>row.map(norm).filter(Boolean).join(' ');

  function headers(rows){
    // Busca la fila que realmente funciona como encabezado de ejercicios.
    // Solo considera años cerrados: el período actual del análisis es el último
    // ejercicio anual cerrado, no proyecciones futuras.
    const ultimoCerrado=new Date().getFullYear()-1;
    const candidates=[];
    const limit=Math.min(rows.length,100);
    for(let r=0;r<limit;r++){
      const row=rows[r]||[],items=[];
      row.forEach((v,i)=>extractYears(v).forEach(y=>{const n=Number(y);if(n>=1900&&n<=ultimoCerrado)items.push({y,i});}));
      const unique=[...new Set(items.map(x=>x.y))].sort((a,b)=>a-b);
      if(unique.length>=2){
        const span=unique[unique.length-1]-unique[0];
        const consecutive=unique.every((y,i)=>i===0||y===unique[i-1]+1);
        const text=rowText(row);
        let score=unique.length*10+(consecutive?8:0)+(span<=5?5:0);
        if(/periodo|ejercicio|fecha|importe|ano|año|31\/12/.test(text))score+=10;
        candidates.push({r,items,unique,score});
      }
    }
    if(!candidates.length)return{};
    candidates.sort((a,b)=>b.score-a.score||b.unique.length-a.unique.length||a.r-b.r);
    const chosen=candidates[0],found={};
    chosen.items.forEach(({y,i})=>{if(found[String(y)]==null)found[String(y)]=i;});
    return found;
  }

  function match(labelText,type){
    const n=norm(labelText);if(!n)return null;let best=null;
    Object.entries(C[type]||{}).forEach(([key,aliases])=>aliases.forEach(alias=>{
      const a=norm(alias);
      const compact=n.replace(/[.,:;()\-_/]/g,' ').replace(/\s+/g,' ').trim();
      const aa=a.replace(/[.,:;()\-_/]/g,' ').replace(/\s+/g,' ').trim();
      if(n===a||n.startsWith(a+' ')||n.includes(' '+a)||compact===aa||compact.startsWith(aa+' ')||compact.includes(' '+aa)){
        const score=n===a||compact===aa?100:Math.min(99,Math.max(35,Math.round(a.length/n.length*100)));
        if(!best||score>best.score)best={key,alias,score};
      }
    }));
    return best;
  }

  function bestSheet(doc,type='balance'){
    let best=doc.sheets[0],bestScore=-Infinity;
    (doc.sheets||[]).forEach(sh=>{
      const name=norm(sh.name),all=sh.rows.slice(0,220).map(rowText).join(' ');let score=0;
      if(type==='balance'){if(/balance|situacion patrimonial|estado de situacion/.test(name))score+=80;if(/balance general|activo|pasivo|patrimonio/.test(all))score+=40;}
      if(type==='resultados'&&/resultado|perdida|ganancia/.test(name))score+=80;
      if(type==='flujo'&&/flujo|efectivo/.test(name))score+=80;
      if(/balance general|estado de resultados|ventas|inventario|proveedores/.test(all))score+=30;
      if(badSheet.test(name))score-=100;
      if(score>bestScore){bestScore=score;best=sh;}
    });
    return best;
  }

  function label(row,type){let best=null;row.forEach(v=>{const s=String(v==null?'':v).trim();if(!s||extractYears(v).length||/^[-+]?\(?[\d.,%\s]+\)?$/.test(s))return;const m=match(s,type);if(m&&(!best||m.score>best.m.score))best={s,m};});return best?best.s:'';}

  function normalize(doc,type){
    const sh=bestSheet(doc,type),hh=headers(sh.rows),periods=Object.keys(hh).sort(),matched={},unmapped=[];
    sh.rows.forEach(row=>{
      const text=label(row,type);if(!text||badSheet.test(norm(text)))return;
      const m=match(text,type);if(!m)return;const values={};periods.forEach(y=>values[y]=number(row[hh[y]]));
      if(!Object.values(values).some(v=>v!==null))return;
      if(!matched[m.key])matched[m.key]={label:text,alias:m.alias,score:m.score,values};
      else periods.forEach(y=>{if(matched[m.key].values[y]===null&&values[y]!==null)matched[m.key].values[y]=values[y];});
    });
    return{name:doc.name,sheet:sh.name,periods,matched,unmapped};
  }

  function normalizeCombined(doc){
    const sh=bestSheet(doc,'balance'),hh=headers(sh.rows),periods=Object.keys(hh).sort(),out={balance:{name:doc.name,sheet:sh.name,periods,matched:{},unmapped:[]},resultados:{name:doc.name,sheet:sh.name,periods,matched:{},unmapped:[]}};let section=null;
    sh.rows.forEach(row=>{
      const txt=rowText(row);if(/^1\.\s*balance general/.test(txt)||txt==='balance general'){section='balance';return;}if(/^2\.\s*estado de resultados/.test(txt)||txt==='estado de resultados'){section='resultados';return;}if(!section)return;
      const text=label(row,section);if(!text||badSheet.test(norm(text)))return;const m=match(text,section);if(!m)return;const values={};periods.forEach(y=>values[y]=number(row[hh[y]]));if(!Object.values(values).some(v=>v!==null))return;
      if(!out[section].matched[m.key])out[section].matched[m.key]={label:text,alias:m.alias,score:m.score,values};else periods.forEach(y=>{if(out[section].matched[m.key].values[y]===null&&values[y]!==null)out[section].matched[m.key].values[y]=values[y];});
    });
    return out;
  }
  return{normalize,normalizeCombined,number,norm,extractYears,C};
})();