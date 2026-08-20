/* MOTOR DE COHERENCIA FINANCIERA
   Principio de lectura:
   - Procesa todos los periodos disponibles.
   - El ultimo periodo disponible es el PERIODO ACTUAL.
   - Los periodos anteriores solo sirven como referencia interna para medir evolucion.
   - Los hallazgos, titulos e interpretaciones se refieren al PERIODO ACTUAL.
   - No se generan hallazgos independientes para ejercicios anteriores.
*/
window.MotorCoherenciaFinanciera=(()=>{
  const v=(d,k,y)=>d?.matched?.[k]?.values?.[y]??null;
  const n=x=>Number.isFinite(Number(x))?Number(x):null;
  const pct=(a,b)=>n(b)!==null&&n(b)!==0&&n(a)!==null?(n(a)/n(b)-1)*100:null;
  const h=(nivel,titulo,formula,valores,interpretacion)=>({nivel,titulo,formula,valores,interpretacion});

  function ejecutar(data){
    const b=data?.balance,r=data?.resultados,flujo=data?.flujo;
    const years=[...new Set([...(b?.periods||[]),...(r?.periods||[]),...(flujo?.periods||[])])]
      .map(String).filter(y=>/^\d{4}$/.test(y)).sort();
    const actual=years[years.length-1];
    const anterior=years.length>1?years[years.length-2]:null;
    const a=[];
    if(!actual)return{years,hallazgos:a,actual:null,anterior:null};

    const comparar=(source,key)=>{
      const cur=v(source,key,actual),prev=anterior?v(source,key,anterior):null;
      return {actual:cur,anterior:prev,variacion:pct(cur,prev)};
    };

    // =========================================================
    // 1. ECUACION PATRIMONIAL - SOLO PERIODO ACTUAL
    // =========================================================
    if(b){
      const ac=v(b,'total_activo',actual),pa=v(b,'total_pasivo',actual),pn=v(b,'total_patrimonio',actual);
      if(ac!==null&&pa!==null&&pn!==null){
        const d=ac-pa-pn;
        a.push(h(Math.abs(d)>1?'crit':'info',
          Math.abs(d)>1?'Inconsistencia en la ecuacion patrimonial — '+actual:'Ecuacion patrimonial conciliada — '+actual,
          'Activo − Pasivo − Patrimonio = 0',
          {periodo_actual:actual,activo:ac,pasivo:pa,patrimonio:pn,diferencia:d},
          Math.abs(d)>1
            ?'El balance del periodo actual no cierra matematicamente. La informacion requiere revision antes de considerar confiables las conclusiones derivadas de su estructura patrimonial.'
            :'El balance del periodo actual presenta cierre matematico. Esta prueba valida la igualdad contable, pero no demuestra por si sola la razonabilidad economica de las cuentas.'
        ));
      }

      // =========================================================
      // 2. LIQUIDEZ ACTUAL
      // =========================================================
      const acorr=v(b,'total_activo_corriente',actual),pcorr=v(b,'total_pasivo_corriente',actual);
      if(acorr!==null&&pcorr!==null&&pcorr!==0){
        const liq=acorr/pcorr;
        if(liq<1)a.push(h('crit','Liquidez corriente insuficiente — '+actual,'Activo corriente / Pasivo corriente',{periodo_actual:actual,activo_corriente:acorr,pasivo_corriente:pcorr,liquidez:liq},'El activo corriente no alcanza para cubrir las obligaciones corrientes del periodo actual. Existe una presion de corto plazo que debe analizarse conjuntamente con caja, cartera, inventarios y proveedores.'));
        else if(liq<1.2)a.push(h('warn','Liquidez corriente ajustada — '+actual,'Activo corriente / Pasivo corriente',{periodo_actual:actual,activo_corriente:acorr,pasivo_corriente:pcorr,liquidez:liq},'La cobertura corriente es positiva pero presenta un margen reducido frente a las obligaciones de corto plazo. La calidad y realizacion de los activos corrientes resulta relevante.'));
      }

      // =========================================================
      // 3. CONCENTRACION DEL ACTIVO CORRIENTE - ACTUAL
      // =========================================================
      if(acorr&&acorr>0){
        const componentes=[['Inventarios',v(b,'inventarios',actual)],['Creditos comerciales',v(b,'creditos_ventas',actual)],['Caja y Bancos',v(b,'caja_bancos',actual)],['Anticipos a proveedores',v(b,'anticipos_proveedores',actual)],['Otros activos corrientes',v(b,'otros_activos_corrientes',actual)]]
          .filter(x=>x[1]!==null).map(x=>({cuenta:x[0],importe:x[1],peso:x[1]/acorr*100}));
        const m=[...componentes].sort((x,z)=>z.peso-x.peso)[0];
        if(m&&m.peso>=45)a.push(h(m.peso>=70?'imp':'warn','Concentracion relevante del activo corriente — '+actual,'Cuenta / Activo corriente × 100',{periodo_actual:actual,activo_corriente:acorr,principal:m,componentes},'Una proporcion relevante del activo corriente se concentra en '+m.cuenta.toLowerCase()+'. La lectura debe considerar su capacidad real de conversion en efectivo y su relacion con la actividad del periodo actual.'));
      }

      // =========================================================
      // 4. ESTRUCTURA DE FINANCIAMIENTO ACTUAL
      // =========================================================
      const at=v(b,'total_activo',actual),pt=v(b,'total_pasivo',actual);
      if(at&&pt!==null){
        const ende=pt/at*100;
        if(ende>=70)a.push(h('imp','Dependencia elevada de terceros — '+actual,'Pasivo / Activo × 100',{periodo_actual:actual,pasivo:pt,activo:at,endeudamiento_pct:ende},'La estructura patrimonial del periodo actual presenta una elevada participacion de financiamiento de terceros. Esto incrementa la sensibilidad de la empresa frente a menor generacion operativa, dificultades de cobranza o aumento del costo financiero.'));
        else if(ende>=50)a.push(h('warn','Dependencia significativa de terceros — '+actual,'Pasivo / Activo × 100',{periodo_actual:actual,pasivo:pt,activo:at,endeudamiento_pct:ende},'Una parte significativa de los activos se encuentra financiada por terceros. Debe analizarse conjuntamente con la generacion operativa y la capacidad de servicio de deuda.'));
      }
    }

    // =========================================================
    // 5. RESULTADOS DEL PERIODO ACTUAL
    // =========================================================
    if(r){
      const ventas=v(r,'ventas',actual),costo=v(r,'costo_ventas',actual),bruto=v(r,'resultado_bruto',actual),ebitda=v(r,'ebitda',actual),ebit=v(r,'ebit',actual),neto=v(r,'resultado_neto',actual),intereses=v(r,'intereses_gasto',actual);

      if(ventas!==null&&costo!==null&&bruto!==null){
        const esperado=ventas-costo,d=bruto-esperado;
        if(Math.abs(d)>1)a.push(h('crit','Resultado bruto no concilia — '+actual,'Resultado bruto = Ventas − Costo de ventas',{periodo_actual:actual,ventas,costo_ventas:costo,resultado_bruto:bruto,esperado,diferencia:d},'El resultado bruto informado no coincide con la diferencia entre ventas y costo de ventas. Existe una inconsistencia aritmetica que debe verificarse.'));
      }

      if(ventas!==null&&ventas!==0){
        if(bruto!==null){const m=bruto/ventas*100;if(m<0)a.push(h('crit','Margen bruto negativo — '+actual,'Resultado bruto / Ventas × 100',{periodo_actual:actual,ventas,resultado_bruto:bruto,margen_pct:m},'El periodo actual no recupera el costo de ventas mediante la actividad comercial. La formacion del precio y/o la estructura de costos requiere revision.'));}
        if(ebitda!==null&&ebitda<0)a.push(h('crit','EBITDA negativo — '+actual,'EBITDA / Ventas × 100',{periodo_actual:actual,ventas,ebitda,margen_ebitda_pct:ebitda/ventas*100},'La operacion del periodo actual no genera excedente antes de depreciaciones y amortizaciones. La situacion debe contrastarse con margen bruto, gastos operativos y carga financiera.'));
        if(neto!==null&&neto<0)a.push(h('imp','Resultado neto negativo — '+actual,'Resultado neto / Ventas × 100',{periodo_actual:actual,ventas,resultado_neto:neto,margen_neto_pct:neto/ventas*100},'El periodo actual termina con perdida. Debe identificarse si la causa proviene de la operacion, del costo financiero, diferencias de cambio u otros componentes no operativos.'));
      }

      if(ebitda!==null&&ebit!==null&&ebitda<ebit)a.push(h('warn','Relacion EBITDA / EBIT requiere revision — '+actual,'EBITDA ≥ EBIT',{periodo_actual:actual,ebitda,ebit},'La relacion informada entre EBITDA y EBIT no presenta la secuencia esperada. Debe revisarse la clasificacion de depreciaciones y amortizaciones y la composicion del resultado operativo.'));

      if(ebitda!==null&&intereses!==null&&intereses>0){
        const cobertura=ebitda/intereses;
        if(cobertura<1)a.push(h('crit','Cobertura de intereses insuficiente — '+actual,'EBITDA / Intereses',{periodo_actual:actual,ebitda,intereses,cobertura},'La generacion operativa del periodo actual no alcanza para cubrir los intereses financieros. Esto constituye una señal relevante de presion sobre la capacidad de servicio financiero.'));
        else if(cobertura<1.5)a.push(h('warn','Cobertura de intereses ajustada — '+actual,'EBITDA / Intereses',{periodo_actual:actual,ebitda,intereses,cobertura},'La generacion operativa cubre los intereses, pero con un margen reducido. La sostenibilidad de la cobertura debe verificarse.'));
      }
    }

    // =========================================================
    // 6. CORRELACIONES: ACTUAL CONTRA ANTECEDENTE
    //    El titulo y la interpretacion hablan del actual; el
    //    periodo anterior solo aparece como referencia de calculo.
    // =========================================================
    if(b&&r&&anterior){
      const ventas=comparar(r,'ventas'),cli=comparar(b,'creditos_ventas'),inv=comparar(b,'inventarios'),prov=comparar(b,'proveedores');

      if(ventas.variacion!==null&&cli.variacion!==null){
        const brecha=cli.variacion-ventas.variacion;
        if(brecha>20)a.push(h('imp','Cartera comercial crece mas rapido que las ventas — '+actual,'Variacion de creditos comerciales vs. variacion de ventas',{periodo_actual:actual,variacion_ventas_pct:ventas.variacion,variacion_creditos_pct:cli.variacion,brecha_puntos:brecha,credito_actual:cli.actual,ventas_actuales:ventas.actual},'En el periodo actual, los creditos comerciales aumentan proporcionalmente mas que las ventas. La situacion puede reflejar extension de plazos, menor velocidad de cobranza o mayor financiacion a clientes y requiere verificacion de la cartera.'));
        else if(brecha<-20)a.push(h('info','Ventas crecen por encima de la cartera — '+actual,'Variacion de ventas vs. variacion de creditos comerciales',{periodo_actual:actual,variacion_ventas_pct:ventas.variacion,variacion_creditos_pct:cli.variacion,brecha_puntos:brecha,credito_actual:cli.actual,ventas_actuales:ventas.actual},'En el periodo actual, la actividad comercial crece mas rapidamente que la cartera. La relacion es compatible con una mayor proporcion de ventas de contado o una mejor realizacion de creditos.'));
      }

      if(ventas.variacion!==null&&inv.variacion!==null){
        const brecha=inv.variacion-ventas.variacion;
        if(brecha>30)a.push(h('imp','Inventarios crecen mas que las ventas — '+actual,'Variacion de inventarios vs. variacion de ventas',{periodo_actual:actual,variacion_inventario_pct:inv.variacion,variacion_ventas_pct:ventas.variacion,brecha_puntos:brecha,inventario_actual:inv.actual,ventas_actuales:ventas.actual},'En el periodo actual, los inventarios crecen a un ritmo materialmente superior al de las ventas. Esto puede indicar acumulacion de stock o una menor rotacion y debe contrastarse con la naturaleza de la actividad.'));
        else if(brecha<-30)a.push(h('info','Inventarios evolucionan por debajo de las ventas — '+actual,'Variacion de inventarios vs. variacion de ventas',{periodo_actual:actual,variacion_inventario_pct:inv.variacion,variacion_ventas_pct:ventas.variacion,brecha_puntos:brecha,inventario_actual:inv.actual,ventas_actuales:ventas.actual},'En el periodo actual, las ventas evolucionan por encima de los inventarios. La relacion es compatible con una utilizacion mas eficiente del stock, siempre que no exista riesgo de quiebre de abastecimiento.'));
      }

      if(ventas.variacion!==null&&prov.variacion!==null){
        const brecha=prov.variacion-ventas.variacion;
        if(brecha>30)a.push(h('warn','Proveedores crecen mas que las ventas — '+actual,'Variacion de proveedores vs. variacion de ventas',{periodo_actual:actual,variacion_proveedores_pct:prov.variacion,variacion_ventas_pct:ventas.variacion,brecha_puntos:brecha,proveedores_actuales:prov.actual,ventas_actuales:ventas.actual},'En el periodo actual, las obligaciones con proveedores aumentan por encima de la actividad comercial. Esto puede señalar mayor dependencia del financiamiento comercial y requiere relacionarlo con compras, caja y ciclo operativo.'));
      }

      const bruto=comparar(r,'resultado_bruto'),neto=comparar(r,'resultado_neto');
      if(ventas.variacion!==null&&bruto.variacion!==null){
        const margenActual=ventas.actual&&bruto.actual!==null?bruto.actual/ventas.actual*100:null;
        const margenPrev=ventas.anterior&&bruto.anterior!==null?bruto.anterior/ventas.anterior*100:null;
        if(margenActual!==null&&margenPrev!==null&&Math.abs(margenActual-margenPrev)>=5)a.push(h(margenActual<margenPrev?'warn':'info','Margen bruto cambia materialmente — '+actual,'Resultado bruto / Ventas × 100',{periodo_actual:actual,margen_actual_pct:margenActual,margen_antecedente_pct:margenPrev,cambio_puntos:margenActual-margenPrev,ventas_actuales:ventas.actual,resultado_bruto_actual:bruto.actual},margenActual<margenPrev?'El periodo actual presenta deterioro del margen comercial respecto del nivel antecedente. La reduccion indica que una menor proporcion de las ventas se transforma en resultado bruto.':'El periodo actual presenta mejora del margen comercial respecto del nivel antecedente. La mejora indica que una mayor proporcion de las ventas queda como resultado bruto.'));
      }
    }

    return {years,hallazgos:a,actual,anterior};
  }
  return{ejecutar};
})();
