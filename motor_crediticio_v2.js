/* MOTOR CREDITICIO V2 — diagnóstico compacto del período actual.
   2023/2024 = comparación; 2025 = período evaluado.
   No acusa fraude: detecta relaciones que merecen explicación crediticia.
*/
(function(){
  const $=id=>document.getElementById(id);
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num=v=>{if(v==null||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v).trim().replace(/\s/g,'').replace(/[()]/g,'-');if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'.');const n=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(n)?n:null};
  const money=n=>n==null?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(n);
  const pct=n=>n==null||!Number.isFinite(n)?'—':(n*100).toFixed(1)+'%';
  const signedPct=n=>n==null||!Number.isFinite(n)?'—':(n>=0?'+':'')+(n*100).toFixed(1)+'%';
  const days=n=>n==null||!Number.isFinite(n)?'—':n.toFixed(1)+' días';
  const findRow=(rows,aliases)=>{const a=aliases.map(norm);for(let i=0;i<rows.length;i++){const l=norm(rows[i]?.[1]??rows[i]?.[0]);if(a.includes(l))return i}for(let i=0;i<rows.length;i++){const l=norm(rows[i]?.[1]??rows[i]?.[0]);if(a.some(x=>l===x||l.startsWith(x+' ')||l.includes(x)))return i}return -1};
  const aliases={
    caja:['disponible (caja y bancos)','disponible caja y bancos','caja y bancos','disponible'],
    clientes:['creditos comerciales - cp (clientes)','creditos comerciales cp (clientes)'],
    inventario:['inventario'],
    proveedores:['deudas comerciales - cp (proveedores)','deudas comerciales cp (proveedores)'],
    acreedores:['acreedores varios'],
    impuestos:['impuestos por pagar','tributos por pagar','impuestos y tasas por pagar'],
    deuda:['deudas financieras - cp','deudas financieras cp'],
    deudaLP:['deudas financieras - lp','deudas financieras lp'],
    pasivo:['total pasivo'],
    activo:['total activo'],
    patrimonio:['total patrimonio neto'],
    ventas:['ventas netas'],
    costo:['costo de ventas'],
    resultadoNeto:['resultado neto total del ejercicio','resultado neto','resultado del ejercicio'],
    intereses:['intereses financieros pagados'],
    flowCaja:['variacion neta de caja'],
    flowClientes:['variacion cuentas a cobrar comerciales cp','variacion cuentas a cobrar comerciales'],
    flowProveedores:['variacion cuentas a pagar comerciales cp'],
    flowOp:['generacion (aplicacion) neta operativa'],
    flowDeudaPago:['pago deudas financieras cp'],
    flowDeudaNueva:['nuevas deudas financieras cp']
  };
  function workbook(){const f=$('archivoUnico')?.files?.[0];if(!f||!window.XLSX)return Promise.resolve(null);return f.arrayBuffer().then(b=>{const wb=XLSX.read(b,{type:'array',raw:true,blankrows:true});const name=wb.SheetNames.find(x=>norm(x)==='ee ff y eerr')||wb.SheetNames[0];return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null,raw:true,blankrows:true})})}
  function getData(rows){
    const cols=[2,5,8];
    const yearAt=(v)=>{if(v instanceof Date&&!isNaN(v))return String(v.getFullYear());if(typeof v==='number'&&v>=1900&&v<=2100)return String(v);const m=String(v??'').match(/(?:19|20)\d{2}/);return m?m[0]:null};
    let years=cols.map(c=>yearAt(rows[4]?.[c]));
    if(years.some(x=>!x)){for(let r=0;r<Math.min(12,rows.length);r++){const ys=cols.map(c=>yearAt(rows[r]?.[c]));if(ys.every(Boolean)){years=ys;break}}}
    const d={years};for(const[k,a]of Object.entries(aliases)){const i=findRow(rows,a);d[k]=i<0?null:cols.map(c=>num(rows[i]?.[c]))}
    return d;
  }
  const val=(d,k,i)=>d[k]?.[i]??null;
  const growth=(a,b)=>a==null||b==null||b===0?null:(a-b)/Math.abs(b);
  function analyze(d){
    const n=d.years?.length||3, i=n-1, p=n-2;
    const cur=d.years?.[i]||$('ejercicio')?.value||'período actual', prev=d.years?.[p]||'período anterior';
    const f=[];
    const add=(level,title,detected,meaning,accounts,action)=>f.push({level,title,detected,meaning,accounts,action});
    const sales=val(d,'ventas',i), salesP=val(d,'ventas',p), cost=val(d,'costo',i), costP=val(d,'costo',p);
    const clients=val(d,'clientes',i), clientsP=val(d,'clientes',p), inv=val(d,'inventario',i), invP=val(d,'inventario',p);
    const prov=val(d,'proveedores',i), provP=val(d,'proveedores',p), pass=val(d,'pasivo',i), passP=val(d,'pasivo',p);
    const debt=val(d,'deuda',i), debtP=val(d,'deuda',p), debtLP=val(d,'deudaLP',i), debtLPP=val(d,'deudaLP',p);
    const cash=val(d,'caja',i), cashP=val(d,'caja',p), res=val(d,'resultadoNeto',i), flowOp=val(d,'flowOp',i);
    const salesG=growth(sales,salesP), clientG=growth(clients,clientsP), invG=growth(inv,invP), provG=growth(prov,provP), passG=growth(pass,passP);
    const totalDebt=(debt||0)+(debtLP||0), totalDebtP=(debtP||0)+(debtLPP||0);

    if(salesG!=null&&salesG<=-.15){
      const resultSignal=res!=null&&val(d,'resultadoNeto',p)!=null?growth(res,val(d,'resultadoNeto',p)):null;
      const extra=[];if(resultSignal!=null)extra.push(`resultado neto ${signedPct(resultSignal)}`);if(flowOp!=null)extra.push(`generación operativa G. ${money(flowOp)}`);
      add(salesG<=-.30?'ALTA':'MEDIA','Ventas: deterioro de actividad',`Las ventas pasaron de G. ${money(salesP)} a G. ${money(sales)} (${signedPct(salesG)}). ${extra.length?'Además, '+extra.join(' y ')+'.':''}`,`La caída de ventas solo se vuelve una señal crediticia fuerte cuando también afecta el resultado o la generación de fondos. El sistema cruza esas cuentas para separar una baja comercial aislada de un deterioro que puede reducir la capacidad de pago.`,`Ventas ↔ Resultado neto ↔ Flujo operativo ↔ Caja ↔ Clientes`,`Comparar con los 12 últimos IVA. Si la caída también aparece en resultado/flujo, no aumentar la exposición sin considerarlo.`);
    }

    if(clients!=null&&sales!=null&&sales>0){
      const d0=clients/sales*365, dP=clientsP!=null&&salesP>0?clientsP/salesP*365:null, delta=clientsP!=null?clients-clientsP:null;
      const flowCli=val(d,'flowClientes',i), flowMatch=flowCli!=null&&delta!=null&&Math.abs(flowCli-delta)<=1;
      const disproportion=clientG!=null&&salesG!=null&&clientG>0&&clientG>salesG+0.20;
      if(d0>60 || (dP!=null&&d0>dP+30) || disproportion){
        let reason=`El saldo de clientes equivale a ${days(d0)} de ventas`+(dP!=null?`, frente a ${days(dP)} en ${prev}`:'');
        if(clientG!=null&&salesG!=null)reason+=`. Clientes ${signedPct(clientG)} frente a ventas ${signedPct(salesG)}.`;
        if(delta!=null)reason+=` El saldo pendiente aumentó G. ${money(delta)}.`;
        if(flowMatch)reason+=` El Flujo confirma el mismo aumento de cuentas a cobrar por G. ${money(flowCli)}: ese importe es una aplicación de efectivo porque la venta se registró pero todavía no se cobró.`;
        add('MEDIA','Clientes: mayor inmovilización de cobros',reason,`Esto no significa que la empresa haya perdido dinero ni que los clientes sean incobrables. Significa que una porción mayor de las ventas quedó temporalmente en cuentas por cobrar en vez de convertirse en efectivo. Si el aumento es persistente, puede presionar la caja y aumentar la necesidad de financiamiento.`,`Clientes ↔ Ventas ↔ Flujo de cuentas a cobrar ↔ Caja`,`Primero comprobar automáticamente si el aumento está acompañado por ventas y flujo. Si no se explica con los estados y los IVA, pedir detalle de deuda de clientes.`);
      }
    }

    if(inv!=null&&cost!=null&&cost>0){
      const invDays=inv/cost*365, invDaysP=invP!=null&&costP>0?invP/costP*365:null;
      if(invDays>180 || (invDaysP!=null&&invDays>invDaysP+45)){
        add('MEDIA','Inventario: posible acumulación',`El inventario equivale a ${days(invDays)} de costo de ventas`+(invDaysP!=null?`, frente a ${days(invDaysP)} en ${prev}`:'')+`. Ventas ${salesG==null?'':signedPct(salesG)}.`,`La señal no dice que exista mercadería obsoleta. Indica que una parte importante del capital está dentro del stock y debe comprobarse si la actividad comercial justifica ese nivel. Si ventas caen y el inventario no acompaña la caída, el riesgo aumenta.`,`Inventario ↔ Costo de ventas ↔ Ventas ↔ Caja`,`Si ventas están deterioradas y el inventario sigue alto, considerar reducción de exposición. Pedir detalle de inventario solo si los estados e IVA no explican el comportamiento.`);
      }
    }

    if(cost!=null&&inv!=null&&invP!=null&&prov!=null&&provP!=null){
      const purchases=cost+(inv-invP), provDelta=prov-provP;
      if(purchases>0&&provDelta<0&&Math.abs(provDelta)>purchases*.20){
        add('MEDIA','Proveedores: compras altas con menor saldo pendiente',`Compras reconstruidas ≈ G. ${money(purchases)} mientras Proveedores disminuyeron G. ${money(Math.abs(provDelta))}.`,`La empresa pudo haber pagado proveedores durante el período o comprar al contado. La señal aparece porque el volumen de compras no se refleja en un mayor saldo pendiente; por eso el sistema debe comprobar si el efectivo, la deuda financiera o los movimientos del flujo explican los pagos.`,`Costo de ventas ↔ Inventario ↔ Proveedores ↔ Caja ↔ Deuda financiera ↔ Flujo`,`Si Caja/Flujo no explican los pagos, pedir detalle de deuda con proveedores. Esto también ayuda a detectar obligaciones que puedan estar fuera de la cuenta de proveedores.`);
      }
    }

    const liquidOther=(val(d,'acreedores',i)||0)+(val(d,'impuestos',i)||0)+(prov||0)+totalDebt;
    const liquidOtherP=(val(d,'acreedores',p)||0)+(val(d,'impuestos',p)||0)+(provP||0)+totalDebtP;
    if(pass!=null&&passP!=null&&sales!=null&&salesP!=null&&passG!=null&&salesG!=null){
      const liabilitiesDrop=passG<=-.20, activityNotDown=salesG>=-.05, compositionDrop=liquidOtherP>0&&liquidOther<liquidOtherP*.80;
      if(liabilitiesDrop&&activityNotDown&&compositionDrop){
        add('ALTA','Pasivos: posible subregistro a comprobar',`El Pasivo total disminuyó ${signedPct(passG)} mientras las ventas ${signedPct(salesG)} y el conjunto Proveedores + Acreedores + Impuestos + Deuda también disminuyó de forma importante.`,`No demuestra un pasivo omitido. La señal aparece porque la actividad no se contrajo en la misma proporción que las obligaciones registradas. Puede existir pago real, refinanciación, reclasificación o una obligación registrada en otra cuenta.`,`Pasivo total ↔ Proveedores ↔ Acreedores ↔ Impuestos ↔ Deuda financiera ↔ Flujo`,`Revisar primero los saldos y el flujo. Si no hay explicación, pedir detalle de deuda con proveedores y referencias bancarias. No solicitar una lista general de documentos.`);
      }
    }

    if(res!=null&&res>0&&cash!=null&&cashP!=null&&cash<cashP){
      const cashDrop=cashP-cash;
      if((flowOp!=null&&flowOp<0)||cashDrop>res*.30){
        add('MEDIA','Resultado positivo pero caja se debilita',`Resultado neto G. ${money(res)} mientras Caja/Bancos pasó de G. ${money(cashP)} a G. ${money(cash)}.`,`La utilidad contable no se convirtió en efectivo en la misma medida. El sistema debe identificar si la caja fue absorbida por clientes, inventario, inversiones o pagos de deuda.`,`Resultado neto ↔ Clientes ↔ Inventario ↔ Flujo operativo ↔ Deuda ↔ Caja`,`Antes de reducir o ampliar la línea, comprobar qué movimiento absorbió el efectivo. Si el propio flujo lo explica, no pedir documentación adicional.`);
      }
    }

    const interests=val(d,'intereses',i);
    if(interests!=null&&Math.abs(interests)>0&&totalDebt===0){
      add('ALTA','Intereses sin deuda financiera al cierre',`Se registran intereses financieros por G. ${money(interests)} pero la deuda financiera al cierre es G. 0.`,`Puede haber deuda cancelada durante el año, intereses de períodos anteriores, refinanciaciones o una obligación que quedó en otra cuenta. La relación no permite concluir por sí sola que exista pasivo omitido.`,`Intereses ↔ Deuda financiera CP/LP ↔ Flujo de nuevas/pagos de deuda`,`Revisar movimientos del año. Si no cierra, pedir detalle de deuda y referencias bancarias.`);
    }
    const order={ALTA:0,MEDIA:1};f.sort((a,b)=>order[a.level]-order[b.level]);
    return {current:cur,prev,a:f};
  }
  function grade(a){const hi=a.filter(x=>x.level==='ALTA').length, me=a.filter(x=>x.level==='MEDIA').length;if(hi>=2)return ['MALO','Hay varias señales relevantes que pueden comprometer la lectura del riesgo. No conviene aumentar exposición hasta aclararlas.','g-bad'];if(hi===1)return ['REGULAR','Existe una señal relevante que debe comprobarse antes de tomar una decisión de crédito.','g-warn'];if(me>=2)return ['REGULAR','No se observa una inconsistencia grave, pero hay varias señales que merecen revisión antes de ampliar la exposición.','g-warn'];if(me===1)return ['BIEN','Existe una señal puntual, sin evidencia de una inconsistencia generalizada en el período actual.','g-good'];return ['EXCELENTE','Las relaciones principales disponibles no muestran señales relevantes en el período actual.','g-excellent']}
  function render(result){
    const a=$('auditoria');if(!a)return;const old=$('diagnosticoV2');if(old)old.remove();
    const g=grade(result.a), alerts=result.a.slice(0,5), sec=document.createElement('section');sec.id='diagnosticoV2';sec.className='card';
    sec.innerHTML=`<h2>4. CONCLUSIÓN CREDITICIA — ${esc(result.current)}</h2><div class="body credit-v2"><div class="v2-grade ${g[2]}"><div class="v2-kicker">RESULTADO DEL PERÍODO ACTUAL</div><div class="v2-value">${esc(g[0])}</div><div class="v2-summary">${esc(g[1])}</div><div class="v2-rule"><b>Regla:</b> ${esc(result.current)} determina la conclusión. ${esc(result.prev)} y los demás períodos anteriores sirven únicamente para medir tendencia y deterioro.</div></div>${alerts.length?`<h3>ALERTAS QUE CAMBIAN LA LECTURA DEL CRÉDITO</h3><div class="v2-alerts">${alerts.map((x,i)=>`<article class="v2-alert level-${x.level.toLowerCase()}"><div class="v2-head"><div><span class="v2-num">${i+1}</span><b>${esc(x.title)}</b></div><span class="v2-priority">${esc(x.level)}</span></div><div class="v2-row"><b>QUÉ DETECTÓ</b><span>${esc(x.detected)}</span></div><div class="v2-row"><b>QUÉ SIGNIFICA</b><span>${esc(x.meaning)}</span></div><div class="v2-row"><b>CUENTAS QUE RELACIONÓ</b><span>${esc(x.accounts)}</span></div><div class="v2-row action"><b>ACCIÓN CREDITICIA</b><span>${esc(x.action)}</span></div></article>`).join('')}</div>`:`<div class="v2-clean"><b>NO HAY ALERTAS RELEVANTES EN ${esc(result.current)}.</b><br>Las relaciones disponibles son compatibles entre sí. Los períodos anteriores se usan solamente como tendencia.</div>`}<details class="v2-method"><summary>Ver cómo llegó a estas conclusiones</summary><div>El sistema no toma una ratio aislada como una acusación. Cada alerta necesita una relación entre al menos dos cuentas y, cuando existe, una confirmación con el Flujo. Los cálculos técnicos quedan fuera de la vista principal.</div></details></div>`;
    a.appendChild(sec);[...a.children].forEach(el=>{if(el.id!=='flujoCompacto'&&el.id!=='diagnosticoV2')el.style.display='none'});const flujo=$('flujoCompacto');if(flujo){const details=flujo.querySelector('details');if(details)details.removeAttribute('open');}
  }
  function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(()=>workbook().then(rows=>{if(rows)render(analyze(getData(rows)))}),350));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
