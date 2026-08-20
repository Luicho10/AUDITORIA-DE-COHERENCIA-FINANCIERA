/* AUDITORIA DE COHERENCIA FINANCIERA - V4
   Presentacion ordenada y lectura financiera real de tendencias.
   V4 corrige especialmente:
   - No llamar "estabilidad relativa" cuando existe base cero o cambio de signo.
   - Detectar saldos negativos y explicar su significado.
   - Mostrar toda la secuencia disponible, no solamente primer y ultimo valor.
   - Ampliar las explicaciones y la conclusion integrada.
*/
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=n=>n==null?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n));
  const f1=n=>n==null?'—':Number(n).toFixed(1)+'%';
  const f2=n=>n==null?'—':Number(n).toFixed(2)+'x';
  const pct=(a,b)=>a!=null&&b!=null&&b!==0?(a/b-1)*100:null;
  const getNormalized=()=>{try{return(typeof NORMALIZED!=='undefined'?NORMALIZED:null)||window.NORMALIZED||{}}catch(_){return window.NORMALIZED||{}}};
  const val=(d,k,y)=>d?.matched?.[k]?.values?.[y]??null;
  const add=(arr,titulo,lectura,razon,evidencia,periodo)=>arr.push({titulo,lectura,razon,evidencia,periodo});

  function analizar(){
    const n=getNormalized(),b=n.balance,r=n.resultados,f=n.flujo;
    const years=[...new Set([...(b?.periods||[]),...(r?.periods||[]),...(f?.periods||[])].map(String).filter(x=>/^\d{4}$/.test(x)))].sort();
    const data={crit:[],imp:[],warn:[],ok:[],corr:[],trend:[]};
    const all=y=>({
      ac:val(b,'total_activo',y),pa:val(b,'total_pasivo',y),pn:val(b,'total_patrimonio',y),
      acorr:val(b,'total_activo_corriente',y),pcorr:val(b,'total_pasivo_corriente',y),inv:val(b,'inventarios',y),
      cli:val(b,'creditos_ventas',y),prov:val(b,'proveedores',y),
      ventas:val(r,'ventas',y),costo:val(r,'costo_ventas',y),bruto:val(r,'resultado_bruto',y),
      ebitda:val(r,'ebitda',y),ebit:val(r,'ebit',y),interes:val(r,'intereses_gasto',y),neto:val(r,'resultado_neto',y)
    });

    /* 1. PRUEBAS DIRECTAS */
    years.forEach(y=>{
      const d=all(y);
      if([d.ac,d.pa,d.pn].every(v=>v!=null)&&!(d.ac===0&&d.pa===0&&d.pn===0)){
        const dif=d.ac-d.pa-d.pn;
        if(Math.abs(dif)>1)add(data.crit,'Ecuacion patrimonial no conciliada',`El Balance de ${y} no cierra matematicamente.`,`Debe verificarse la carga, clasificacion o totalizacion de las cuentas antes de utilizar este periodo para conclusiones.`,`Activo ${money(d.ac)} − Pasivo ${money(d.pa)} − Patrimonio ${money(d.pn)} = ${money(dif)}.`,y);
        else add(data.ok,'Ecuacion patrimonial conciliada',`El Balance de ${y} presenta cierre matematico.`,`Esto valida la aritmetica basica, pero no demuestra por si solo la razonabilidad de las cuentas.`,`Activo ${money(d.ac)} − Pasivo ${money(d.pa)} − Patrimonio ${money(d.pn)} = 0.`,y);
      }
      if(d.ventas!=null&&d.costo!=null&&d.bruto!=null){
        const esperado=d.ventas-d.costo,dif=d.bruto-esperado;
        if(Math.abs(dif)>1)add(data.crit,'Resultado bruto no concilia',`El resultado bruto informado de ${y} no coincide con Ventas − Costo de Ventas.`,`Debe revisarse la clasificacion o carga de los componentes del resultado bruto.`,`Informado ${money(d.bruto)}; esperado ${money(esperado)}; diferencia ${money(dif)}.`,y);
      }
      if(d.acorr!=null&&d.pcorr!=null&&d.pcorr!==0){
        const lc=d.acorr/d.pcorr;
        if(lc<1)add(data.crit,'Liquidez corriente insuficiente',`La cobertura de corto plazo de ${y} es inferior a 1,00x.`,`El activo corriente no alcanza para cubrir el pasivo corriente.`,`Activo corriente ${money(d.acorr)} / Pasivo corriente ${money(d.pcorr)} = ${f2(lc)}.`,y);
        else if(lc<1.2)add(data.warn,'Liquidez corriente ajustada',`Existe cobertura en ${y}, pero con margen reducido.`,`Una demora de cobranza o menor realizacion de activos puede presionar la capacidad de pago.`,`Liquidez corriente = ${f2(lc)}.`,y);
        else if(lc>=1.5&&d.inv!=null&&d.inv/d.acorr>=0.60)add(data.warn,'Liquidez concentrada en inventarios',`La liquidez contable de ${y} depende fuertemente de realizar inventarios.`,`No debe confundirse liquidez contable con liquidez inmediata: una parte relevante de la cobertura depende de vender stock.`,`Inventarios ${money(d.inv)} = ${f1(d.inv/d.acorr*100)} del activo corriente; liquidez ${f2(lc)}.`,y);
        else add(data.ok,'Cobertura corriente suficiente',`La cobertura corriente de ${y} supera 1,00x.`,`Existe cobertura contable de las obligaciones corrientes.`,`Activo corriente ${money(d.acorr)} / Pasivo corriente ${money(d.pcorr)} = ${f2(lc)}.`,y);
      }
      if(d.ac!=null&&d.pa!=null&&d.ac!==0){
        const ende=d.pa/d.ac*100;
        if(ende>=70)add(data.imp,'Dependencia elevada de terceros',`El pasivo representa ${f1(ende)} del activo en ${y}.`,`La estructura aumenta la sensibilidad ante caida de ventas, menor cobranza o mayores costos financieros.`,`Pasivo ${money(d.pa)} / Activo ${money(d.ac)} = ${f1(ende)}.`,y);
        else if(ende<=40)add(data.ok,'Estructura patrimonial favorable',`La participacion del pasivo es relativamente baja en ${y}.`,`Es una condicion favorable de estructura, pero no constituye por si sola una conclusion integral de riesgo.`,`Pasivo ${money(d.pa)} / Activo ${money(d.ac)} = ${f1(ende)}.`,y);
        else add(data.warn,'Estructura patrimonial intermedia',`La dependencia de terceros es moderada en ${y}.`,`Debe analizarse junto con liquidez y generacion operativa.`,`Pasivo ${money(d.pa)} / Activo ${money(d.ac)} = ${f1(ende)}.`,y);
      }
      if(d.ventas!=null&&d.ventas!==0){
        if(d.bruto!=null){
          const m=d.bruto/d.ventas*100;
          if(m<0)add(data.crit,'Margen bruto negativo',`El costo de ventas supera las ventas en ${y}.`,`La actividad comercial no cubre su costo directo.`,`Ventas ${money(d.ventas)}; Resultado bruto ${money(d.bruto)}; margen ${f1(m)}.`,y);
          else add(data.ok,'Margen bruto positivo',`La actividad comercial conserva margen bruto en ${y}.`,`Existe resultado despues del costo de ventas; debe analizarse si alcanza para gastos y financiamiento.`,`Ventas ${money(d.ventas)}; Resultado bruto ${money(d.bruto)}; margen ${f1(m)}.`,y);
        }
        if(d.ebitda!=null&&d.ebitda<0)add(data.crit,'EBITDA negativo',`La operacion de ${y} no genera resultado antes de depreciaciones y amortizaciones.`,`La generacion operativa informada es insuficiente para sostener la estructura operativa y constituye una señal relevante de presion sobre la capacidad de servicio financiero.`,`EBITDA ${money(d.ebitda)}; margen EBITDA ${f1(d.ebitda/d.ventas*100)}.`,y);
        if(d.neto!=null&&d.neto<0)add(data.imp,'Resultado neto negativo',`El ejercicio ${y} termina con perdida.`,`Debe identificarse que componente explica la perdida y si es recurrente; una perdida aislada no equivale automaticamente a insolvencia, pero si requiere explicacion.`,`Ventas ${money(d.ventas)}; Resultado neto ${money(d.neto)}; margen neto ${f1(d.neto/d.ventas*100)}.`,y);
      }
      if(d.ebitda!=null&&d.ebit!=null&&d.ebitda<d.ebit)add(data.crit,'Relacion EBITDA / EBIT requiere revision',`En ${y}, EBITDA es inferior a EBIT.`,`Debe revisarse la clasificacion de depreciaciones/amortizaciones o la forma de calculo, porque conceptualmente el EBITDA no deberia quedar por debajo del EBIT cuando las depreciaciones y amortizaciones son los ajustes relevantes.`,`EBITDA ${money(d.ebitda)} < EBIT ${money(d.ebit)}.`,y);
      if(d.ebitda!=null&&d.interes!=null&&d.interes>0){
        const cov=d.ebitda/d.interes;
        if(cov<1)add(data.crit,'Cobertura de intereses insuficiente',`La generacion operativa de ${y} no cubre los intereses financieros.`,`Existe presion financiera que debe contrastarse con caja, deuda y refinanciacion.`, `EBITDA ${money(d.ebitda)} / Intereses ${money(d.interes)} = ${f2(cov)}.`,y);
        else if(cov<3)add(data.warn,'Cobertura de intereses ajustada',`Los intereses de ${y} estan cubiertos, pero con margen limitado.`,`Una baja adicional de la generacion operativa podria comprometer la cobertura.`,`EBITDA ${money(d.ebitda)} / Intereses ${money(d.interes)} = ${f2(cov)}.`,y);
        else add(data.ok,'Cobertura de intereses adecuada',`La generacion operativa cubre los intereses de ${y} con margen razonable.`,`La relacion operativa-financiera es favorable en este periodo.`,`EBITDA ${money(d.ebitda)} / Intereses ${money(d.interes)} = ${f2(cov)}.`,y);
      }
    });

    /* 2. CORRELACIONES */
    for(let i=1;i<years.length;i++){
      const p=years[i-1],y=years[i],a=all(p),d=all(y);
      const vv=pct(d.ventas,a.ventas),vi=pct(d.inv,a.inv),vc=pct(d.cli,a.cli),vp=pct(d.prov,a.prov),va=pct(d.ac,a.ac),vpa=pct(d.pa,a.pa),vpat=pct(d.pn,a.pn);
      if(vv!=null&&vi!=null){
        const gap=vi-vv;
        if(gap>25)add(data.corr,'Inventarios crecen mas que las ventas',`Entre ${p} y ${y}, el stock crece mucho mas que la actividad comercial.`,`Puede aumentar el capital inmovilizado y el riesgo de realizacion.`,`Ventas ${f1(vv)}; Inventarios ${f1(vi)}; brecha ${f1(gap)} puntos.`,y);
        else if(gap<-25)add(data.corr,'Inventarios caen mas que las ventas',`Entre ${p} y ${y}, el stock cae mas que las ventas.`,`Puede responder a liquidacion de existencias, menor reposicion o cambio de actividad; requiere explicacion.`,`Ventas ${f1(vv)}; Inventarios ${f1(vi)}; brecha ${f1(gap)} puntos.`,y);
        else add(data.ok,'Inventarios acompañan las ventas',`Entre ${p} y ${y}, inventarios y ventas evolucionan de forma razonablemente compatible.`,`No se observa una divergencia material entre stock y actividad.`,`Ventas ${f1(vv)}; Inventarios ${f1(vi)}; brecha ${f1(gap)} puntos.`,y);
      }
      if(vv!=null&&vc!=null){
        const gap=vc-vv;
        if(gap>25)add(data.corr,'Cartera crece mas rapido que las ventas',`Entre ${p} y ${y}, los creditos comerciales aumentan por encima de las ventas.`,`Puede indicar extension de plazos o menor velocidad de cobranza.`,`Ventas ${f1(vv)}; Creditos ${f1(vc)}; brecha ${f1(gap)} puntos.`,y);
        else if(gap<-25)add(data.ok,'Cartera no acompaña las ventas',`Entre ${p} y ${y}, los creditos evolucionan por debajo de las ventas.`,`Es compatible con mayor contado o cobranza relativamente mas rapida; debe contrastarse con caja.`,`Ventas ${f1(vv)}; Creditos ${f1(vc)}; brecha ${f1(gap)} puntos.`,y);
      }
      if(vv!=null&&vp!=null){
        const gap=vp-vv;
        if(gap>25)add(data.warn,'Proveedores crecen mas rapido que las ventas',`Entre ${p} y ${y}, las obligaciones comerciales aumentan mas que la actividad.`,`Puede existir mayor dependencia del financiamiento de proveedores.`,`Ventas ${f1(vv)}; Proveedores ${f1(vp)}; brecha ${f1(gap)} puntos.`,y);
        else if(gap<-25)add(data.ok,'Proveedores disminuyen mas que las ventas',`Entre ${p} y ${y}, las obligaciones comerciales caen mas que la actividad.`,`Es compatible con cancelacion de deuda comercial o menor utilizacion del credito de proveedores.`,`Ventas ${f1(vv)}; Proveedores ${f1(vp)}; brecha ${f1(gap)} puntos.`,y);
      }
      if(vv!=null&&va!=null){
        const gap=va-vv;
        if(gap>30)add(data.warn,'Activos crecen mas que las ventas',`Entre ${p} y ${y}, los activos aumentan mucho mas que la escala comercial.`,`Debe verificarse inversion, acumulacion o activos de baja productividad.`,`Ventas ${f1(vv)}; Activos ${f1(va)}; brecha ${f1(gap)} puntos.`,y);
        else if(gap<-30)add(data.warn,'Ventas caen mas que los activos',`Entre ${p} y ${y}, la actividad se contrae mas que la estructura de activos.`,`Puede existir capacidad ociosa o menor productividad de los activos.`,`Ventas ${f1(vv)}; Activos ${f1(va)}; brecha ${f1(gap)} puntos.`,y);
      }
      if(vpa!=null&&vpat!=null&&vpa>vpat+25)add(data.corr,'Pasivo crece mas rapido que patrimonio',`Entre ${p} y ${y}, la financiacion de terceros crece mas que la base patrimonial.`,`Si se sostiene, aumenta el apalancamiento y reduce el colchon patrimonial.`,`Pasivo ${f1(vpa)}; Patrimonio ${f1(vpat)}; brecha ${f1(vpa-vpat)} puntos.`,y);
      if(a.ebitda!=null&&a.interes>0&&d.ebitda!=null&&d.interes>0){
        const c0=a.ebitda/a.interes,c1=d.ebitda/d.interes;
        if(c1<c0-1)add(data.corr,'La cobertura financiera se deteriora',`La cobertura de intereses pasa de ${f2(c0)} a ${f2(c1)} entre ${p} y ${y}.`,`La capacidad operativa para atender el costo financiero empeora.`,`Cobertura ${f2(c0)} → ${f2(c1)}.`,y);
        else if(c1>c0+1)add(data.ok,'La cobertura financiera mejora',`La cobertura de intereses pasa de ${f2(c0)} a ${f2(c1)} entre ${p} y ${y}.`,`La relacion entre generacion operativa e intereses evoluciona favorablemente.`,`Cobertura ${f2(c0)} → ${f2(c1)}.`,y);
      }
    }

    /* 3. TENDENCIAS: lectura de signo, base cero y magnitud */
    const series=[
      ['Ventas',r,'ventas','actividad comercial'],['Resultado bruto',r,'resultado_bruto','margen comercial'],['EBITDA',r,'ebitda','generacion operativa'],['Resultado neto',r,'resultado_neto','resultado final'],
      ['Activo total',b,'total_activo','estructura de activos'],['Pasivo total',b,'total_pasivo','financiacion de terceros'],['Patrimonio neto',b,'total_patrimonio','base patrimonial'],['Inventarios',b,'inventarios','capital inmovilizado en stock'],['Creditos comerciales',b,'creditos_ventas','cartera comercial'],['Proveedores',b,'proveedores','financiacion comercial']
    ];
    function trendType(first,last){
      if(first==null||last==null)return{dir:'sin datos suficientes',tone:'neutral'};
      if(first===0&&last===0)return{dir:'sin variacion: permanece en cero',tone:'neutral'};
      if(first===0&&last>0)return{dir:'pasa de base cero a saldo positivo',tone:'positive'};
      if(first===0&&last<0)return{dir:'pasa de base cero a saldo negativo',tone:'negative'};
      if(first>0&&last<0)return{dir:'cambio de signo: pasa de positivo a negativo',tone:'negative'};
      if(first<0&&last>0)return{dir:'cambio de signo: pasa de negativo a positivo',tone:'positive'};
      if(first<0&&last<0){const ch=pct(last,first);return{dir:Math.abs(ch??0)<=5?'permanece negativo con variacion reducida':last<first?'continua negativo y se deteriora':'continua negativo pero mejora',tone:last<first?'negative':'warning'}}
      const ch=pct(last,first);
      if(ch!=null&&ch>30)return{dir:'crecimiento significativo',tone:'positive'};
      if(ch!=null&&ch<-30)return{dir:'contraccion significativa',tone:'negative'};
      if(ch!=null&&ch>5)return{dir:'crecimiento moderado',tone:'positive'};
      if(ch!=null&&ch<-5)return{dir:'contraccion moderada',tone:'negative'};
      return{dir:'estabilidad relativa',tone:'neutral'};
    }
    function trendExplanation(nombre,first,last,chg,dir,pts){
      const seq=pts.map(p=>`${p.y}: ${money(p.v)}`).join(' → ');
      const negative=pts.filter(p=>p.v!=null&&p.v<0);
      let lectura=`La serie ${nombre.toLowerCase()} presenta la siguiente trayectoria: ${seq}.`;
      let razon='';
      if(first===0&&last>0)razon=`El primer valor registrado es cero, por lo que no corresponde calcular una variacion porcentual convencional. El cambio debe interpretarse por su magnitud absoluta y por la aparicion de un saldo positivo. No es correcto calificarlo como estabilidad relativa.`;
      else if(first===0&&last<0)razon=`El primer valor registrado es cero y el ultimo es negativo. No corresponde hablar de estabilidad: existe un cambio hacia una posicion desfavorable que debe ser explicado.`;
      else if(first>0&&last<0)razon=`La serie cambia de signo y termina en terreno negativo. El porcentaje de variacion, por si solo, seria poco representativo; lo relevante es el deterioro absoluto y el cambio de naturaleza del saldo.`;
      else if(first<0&&last>0)razon=`La serie cambia de signo y termina en terreno positivo. Esto representa una recuperacion o reversión del saldo negativo, aunque debe verificarse si el cambio es recurrente.`;
      else if(first<0&&last<0)razon=`La serie permanece negativa durante los extremos observados. La lectura debe centrarse en si la perdida o deficit se profundiza o se reduce, no en una etiqueta generica de estabilidad.`;
      else if(chg!=null&&Math.abs(chg)>30)razon=`La magnitud cambia ${f1(Math.abs(chg))} entre el primer y el ultimo periodo, por lo que existe una variacion material y no corresponde tratarla como estabilidad.`;
      else if(chg!=null&&Math.abs(chg)>5)razon=`La magnitud presenta una variacion moderada de ${f1(chg)} entre extremos. Debe observarse el comportamiento intermedio para determinar si existe una tendencia sostenida.`;
      else razon=`Los extremos muestran una variacion porcentual reducida; por eso se utiliza estabilidad relativa. Esta expresion no significa que el valor sea favorable ni que no existan movimientos intermedios.`;
      if(negative.length)razon+=` Se identifican ${negative.length} periodo(s) con saldo negativo, por lo que la lectura debe considerar expresamente ese signo.`;
      let foco='';
      if(nombre==='EBITDA')foco=last<0?' En EBITDA, un saldo negativo significa que la operacion no genera excedente antes de depreciaciones y amortizaciones; es una señal operativa relevante.':' La evolucion del EBITDA debe contrastarse con ventas y gastos para evaluar la capacidad de generar fondos operativos.';
      if(nombre==='Resultado neto')foco=last<0?' En resultado neto, el saldo negativo implica perdida contable del ejercicio y requiere identificar su origen.':' En resultado neto, un saldo positivo no elimina por si solo las presiones operativas o financieras detectadas en otras pruebas.';
      if(nombre==='Ventas')foco=' En ventas, la lectura debe centrarse en la trayectoria de la actividad y no solamente en el porcentaje entre extremos.';
      if(nombre==='Inventarios')foco=' En inventarios, el crecimiento debe relacionarse con ventas para determinar si responde a una necesidad operativa o a acumulacion de stock.';
      if(nombre==='Creditos comerciales')foco=' En creditos comerciales, el crecimiento debe contrastarse con ventas y cobranza para determinar si existe mayor inmovilizacion de capital.';
      if(nombre==='Proveedores')foco=' En proveedores, la variacion debe relacionarse con compras, ventas y plazos para evaluar dependencia del financiamiento comercial.';
      if(nombre==='Pasivo total')foco=' En pasivo total, un crecimiento relevante implica mayor financiacion de terceros y debe contrastarse con patrimonio y generacion operativa.';
      if(nombre==='Patrimonio neto')foco=' En patrimonio neto, la evolucion permite observar si la empresa esta fortaleciendo o consumiendo su base patrimonial.';
      return{lectura,razon:razon+foco,evidencia:`Secuencia completa: ${seq}.${chg==null?'':` Variacion entre extremos: ${f1(chg)}.`}`};
    }
    series.forEach(([nombre,d,key])=>{
      if(!d)return;
      const pts=years.map(y=>({y,v:val(d,key,y)})).filter(x=>x.v!=null);
      if(pts.length<2)return;
      const first=pts[0],last=pts[pts.length-1],chg=pct(last.v,first.v),tt=trendType(first.v,last.v),tx=trendExplanation(nombre,first.v,last.v,chg,tt.dir,pts);
      data.trend.push({nombre,first,last,chg,dir:tt.dir,tone:tt.tone,pts,lectura:tx.lectura,razon:tx.razon,evidencia:tx.evidencia});
    });
    return{years,data};
  }

  function css(){
    if(document.getElementById('auditoria-v4-css'))return;
    const s=document.createElement('style');s.id='auditoria-v4-css';s.textContent=`
      #auditoria .aud-v4{margin-top:0}.aud-v4 .intro{padding:10px 0 14px}.aud-v4 .section{margin-top:18px;border:1px solid #d9e2e0;border-radius:8px;overflow:hidden;background:#fff}.aud-v4 .section h3{margin:0;padding:11px 14px;background:#f3f6f5;color:#155f4c;font-size:14px;border-bottom:1px solid #d9e2e0}.aud-v4 .item{padding:12px 14px;border-bottom:1px solid #e8eded}.aud-v4 .item:last-child{border-bottom:0}.aud-v4 .title{font-weight:700;font-size:13px;margin-bottom:5px}.aud-v4 .line{margin:4px 0;font-size:12px;line-height:1.5}.aud-v4 .evidence{margin-top:8px;background:#f5f7f7;border-left:3px solid #9aa;padding:8px 10px;font-size:11px;line-height:1.45}.aud-v4 .crit .title{color:#b3261e}.aud-v4 .imp .title{color:#d66b00}.aud-v4 .warn .title{color:#8a7100}.aud-v4 .ok .title{color:#176b51}.aud-v4 .corr .title{color:#8a3f00}.aud-v4 .empty{padding:12px 14px;color:#667;font-size:12px}.aud-v4 .summary{display:grid;grid-template-columns:repeat(5,minmax(100px,1fr));gap:10px;margin:10px 0 4px}.aud-v4 .box{border:1px solid #d9e2e0;border-left:4px solid #777;padding:10px 11px;border-radius:7px;background:#fff}.aud-v4 .box b{display:block;font-size:20px;margin-top:4px}.aud-v4 .trend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:10px}.aud-v4 .trend .t{border:1px solid #e0e6e4;border-radius:7px;padding:10px;font-size:11px;line-height:1.45;background:#fff}.aud-v4 .trend .t .tn{font-weight:700;font-size:12px;margin-bottom:5px}.aud-v4 .trend .t .td{font-weight:700;margin:5px 0}.aud-v4 .trend .t .ts{font-size:10.5px;color:#596563}.aud-v4 .trend .positive .td{color:#176b51}.aud-v4 .trend .negative .td{color:#b3261e}.aud-v4 .trend .warning .td{color:#a06000}.aud-v4 .trend .neutral .td{color:#5c6866}.aud-v4 .conclusion{padding:15px;background:#eef6f2;border-left:4px solid #176b51;line-height:1.6;font-size:13px}.aud-v4 .conclusion p{margin:0 0 9px}.aud-v4 .conclusion p:last-child{margin-bottom:0}.aud-v4 .note{font-size:11px;color:#687}.aud-v4 .period{font-size:11px;color:#667;margin-top:2px}@media(max-width:700px){.aud-v4 .summary,.aud-v4 .trend{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function itemHtml(x,kind){return `<div class="item ${kind}"><div class="title">${esc(x.titulo)}</div><div class="period">Periodo: <b>${esc(x.periodo||'—')}</b></div><div class="line"><b>Que muestra:</b> ${esc(x.lectura)}</div><div class="line"><b>Interpretacion:</b> ${esc(x.razon)}</div><div class="evidence"><b>Prueba / evidencia:</b> ${esc(x.evidencia)}</div></div>`}
  function section(title,arr,kind,empty){return `<div class="section"><h3>${title} <span class="note">(${arr.length})</span></h3>${arr.length?arr.map(x=>itemHtml(x,kind)).join(''):`<div class="empty">${empty}</div>`}</div>`}

  function trendHtml(data){
    if(!data.length)return '<div class="empty">No hay suficientes valores para construir tendencias.</div>';
    return data.map(t=>`<div class="t ${esc(t.tone)}"><div class="tn">${esc(t.nombre)}</div><div>${esc(t.first.y)}: <b>${money(t.first.v)}</b> → ${esc(t.last.y)}: <b>${money(t.last.v)}</b></div><div class="td">${esc(t.dir)}</div><div class="ts">${esc(t.lectura)}</div><div class="ts"><b>Interpretacion:</b> ${esc(t.razon)}</div></div>`).join('');
  }

  function conclusionIntegrada(years,data){
    const c=data.crit.length,im=data.imp.length,w=data.warn.length,co=data.corr.length;
    const latest=years[years.length-1],b=getNormalized().balance,r=getNormalized().resultados;
    const v=(d,k)=>val(d,k,latest);
    const ventas=v(r,'ventas'),ebitda=v(r,'ebitda'),neto=v(r,'resultado_neto'),activo=v(b,'total_activo'),pasivo=v(b,'total_pasivo'),pat=v(b,'total_patrimonio'),inv=v(b,'inventarios');
    const parts=[];
    parts.push(`<p><b>Lectura general.</b> El analisis comprende ${years.length} periodo(s) (${years.join(', ')}). Se identificaron ${c} prueba(s) critica(s), ${im} hallazgo(s) importante(s), ${co} correlacion(es) relevantes y ${w} señal(es) para indagar. La conclusion debe interpretarse como una lectura de coherencia de la informacion presentada, no como una validacion documental de las cuentas.</p>`);
    if(c)parts.push(`<p><b>Presiones o inconsistencias principales.</b> Las pruebas criticas muestran elementos que pueden afectar la confiabilidad o la capacidad financiera informada. ${data.crit.slice(0,3).map(x=>esc(x.titulo)).join('; ')}${c>3?' y otros hallazgos':''}. Estos puntos deben verificarse antes de tomar la informacion como plenamente consistente.</p>`);
    else if(im)parts.push(`<p><b>Resultado financiero.</b> No aparecen rupturas aritmeticas principales, pero existen ${im} hallazgo(s) importante(s) que requieren explicacion. La ausencia de una inconsistencia matematica no implica por si sola una situacion financiera saludable.</p>`);
    if(ventas!=null||ebitda!=null||neto!=null)parts.push(`<p><b>Capacidad operativa y resultado.</b> Para ${latest}, las ventas informadas son ${money(ventas)}, el EBITDA ${money(ebitda)} y el resultado neto ${money(neto)}. ${ebitda!=null&&ebitda<0?'El EBITDA negativo indica que la actividad no esta generando excedente operativo antes de depreciaciones y amortizaciones; esta es una presion central del analisis. ':''}${neto!=null&&neto<0?'El resultado neto negativo confirma que el ejercicio termina con perdida, por lo que debe determinarse si el origen es operativo, financiero, extraordinario o una combinacion de estos factores. ':''}${ebitda!=null&&ebitda>=0&&neto!=null&&neto>=0?'Los resultados finales son positivos, aunque deben contrastarse con liquidez, endeudamiento y conversion de resultados en caja. ':''}</p>`);
    if(activo!=null||pasivo!=null||pat!=null)parts.push(`<p><b>Estructura financiera.</b> En ${latest}, el activo total asciende a ${money(activo)}, el pasivo a ${money(pasivo)} y el patrimonio neto a ${money(pat)}. La lectura estructural debe hacerse conjuntamente con la generacion operativa: una estructura patrimonial razonable puede convivir con dificultades de caja, y una fuerte dependencia de terceros puede ser mas sensible cuando la operacion pierde capacidad de generar resultados.</p>`);
    if(inv!=null)parts.push(`<p><b>Capital de trabajo.</b> El inventario de ${latest} asciende a ${money(inv)}. Su importancia no debe evaluarse aisladamente: la auditoria lo contrasta con ventas, cartera y proveedores para determinar si el crecimiento del stock acompaña la actividad o si existe inmovilizacion de recursos.</p>`);
    if(co)parts.push(`<p><b>Correlaciones.</b> Las relaciones detectadas entre ventas, inventarios, cartera, proveedores y estructura financiera agregan informacion que no aparece observando cada cuenta por separado. ${data.corr.slice(0,4).map(x=>esc(x.titulo)).join('; ')}${co>4?' y otras relaciones':''}. Estas señales requieren contraste con rotacion, cobranza, compras, plazos y soporte documental.</p>`);
    if(data.trend.length)parts.push(`<p><b>Tendencia multiperiodo.</b> Las tendencias ya no se clasifican solamente por un porcentaje entre extremos: se consideran base cero, cambio de signo y presencia de saldos negativos. Por ello, un valor que pasa de cero a negativo se identifica como deterioro y no como estabilidad; del mismo modo, un saldo negativo que mejora hacia positivo se interpreta como recuperacion.</p>`);
    if(w)parts.push(`<p><b>Aspectos para indagar.</b> Las señales de indagacion no deben considerarse automaticamente negativas. Representan relaciones que necesitan explicacion: ${data.warn.slice(0,4).map(x=>esc(x.titulo)).join('; ')}${w>4?' y otras':''}.</p>`);
    parts.push(`<p><b>Conclusión ejecutiva.</b> La informacion debe ser considerada con un nivel de cautela proporcional a los hallazgos identificados. El foco no debe estar en un unico indicador, sino en la coherencia entre <b>resultado operativo, liquidez, estructura de financiacion, capital de trabajo y evolucion entre periodos</b>. Los hallazgos criticos o los cambios de signo deben ser priorizados para explicacion y respaldo antes de utilizar los estados como base definitiva para una decision financiera.</p>`);
    return parts.join('');
  }

  function render(){
    const host=document.getElementById('auditoria');if(!host)return false;
    const {years,data}=analizar();if(!years.length)return false;css();
    const c=data.crit.length,im=data.imp.length,w=data.warn.length,o=data.ok.length,co=data.corr.length;
    host.innerHTML=`<section class="card aud-v4"><h2>4. AUDITORIA DE COHERENCIA FINANCIERA</h2><div class="body">
      <div class="summary"><div class="box">Criticas<b>${c}</b></div><div class="box">Importantes<b>${im}</b></div><div class="box">Para indagar<b>${w}</b></div><div class="box">Favorables<b>${o}</b></div><div class="box">Correlaciones<b>${co}</b></div></div>
      <div class="intro"><b>Periodos analizados:</b> ${years.join(', ')}<br><span class="note">Las tendencias consideran signo, base cero, cambios materiales y trayectoria completa. No se utiliza "estabilidad relativa" cuando el saldo cambia de signo o pasa de cero a positivo/negativo.</span></div>
      ${section('A. INCONSISTENCIAS / PRUEBAS CRITICAS',data.crit,'crit','No se detectaron inconsistencias aritmeticas o estructurales bajo los umbrales actuales.')}
      ${section('B. HALLAZGOS IMPORTANTES',data.imp,'imp','No se detectaron hallazgos importantes en las pruebas ejecutadas.')}
      ${section('C. CORRELACIONES FINANCIERAS',data.corr,'corr','No se detectaron divergencias materiales entre las cuentas comparadas.')}
      <div class="section"><h3>D. TENDENCIAS MULTIPERIODO</h3><div class="trend">${trendHtml(data.trend)}</div></div>
      ${section('E. SEÑALES PARA INDAGAR',data.warn,'warn','No se detectaron señales que requieran indagacion adicional bajo los umbrales actuales.')}
      ${section('F. SEÑALES FAVORABLES / CONCILIADAS',data.ok,'ok','No se registraron señales favorables o conciliaciones.')}
      <div class="section"><h3>G. CONCLUSION INTEGRADA</h3><div class="conclusion">${conclusionIntegrada(years,data)}</div></div>
    </div></section>`;
    host.classList.remove('hidden');return true;
  }
  window.AuditoriaCoherenciaV4={render,analizar};
  window.AuditoriaCoherenciaV3=window.AuditoriaCoherenciaV4;
  function enganchar(){
    const btn=document.getElementById('leer');if(btn&&!btn.dataset.audV4){btn.dataset.audV4='1';btn.addEventListener('click',()=>setTimeout(render,700))}
    const control=document.getElementById('control');if(control&&!control.dataset.audV4Obs){control.dataset.audV4Obs='1';new MutationObserver(()=>setTimeout(render,100)).observe(control,{childList:true,subtree:true})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enganchar);else enganchar();
})();
