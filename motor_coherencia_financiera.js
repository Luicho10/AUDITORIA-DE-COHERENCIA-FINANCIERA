const MotorCoherenciaFinanciera = (() => {
  const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const pct = (final, inicial) => {
    const f = num(final), i = num(inicial);
    return i === null || i === 0 || f === null ? null : (f / i - 1) * 100;
  };
  const val = (data, key, year) => data?.matched?.[key]?.values?.[year] ?? null;
  const has = (...xs) => xs.every(x => x !== null && Number.isFinite(Number(x)));
  const nivel = n => ['crit','imp','warn','info'].includes(n) ? n : 'info';
  const hallazgo = (tipo, n, titulo, formula, valores, interpretacion, conclusion) => ({
    tipo, nivel: nivel(n), titulo, formula, valores, interpretacion, conclusion
  });

  function integridad(balance, resultados, years) {
    const out = [];
    years.forEach(year => {
      const activo = val(balance,'total_activo',year);
      const pasivo = val(balance,'total_pasivo',year);
      const patrimonio = val(balance,'total_patrimonio',year);
      if (has(activo,pasivo,patrimonio)) {
        const diferencia = activo - pasivo - patrimonio;
        out.push(Math.abs(diferencia) > 0.5
          ? hallazgo('integridad','crit',`Ecuación patrimonial inconsistente — ${year}`,
              'Activo − Pasivo − Patrimonio = 0',
              {activo,pasivo,patrimonio,diferencia},
              `La ecuación no cierra por Gs. ${diferencia.toLocaleString('es-PY')}.`,
              'Debe revisarse antes de utilizar los estados para conclusiones posteriores.')
          : hallazgo('integridad','info',`Ecuación patrimonial conciliada — ${year}`,
              'Activo − Pasivo − Patrimonio = 0',
              {activo,pasivo,patrimonio,diferencia},
              'La ecuación patrimonial cierra dentro del margen de tolerancia.',
              'La estructura patrimonial presenta consistencia matemática para este período.')
        );
      }

      const ventas = val(resultados,'ventas',year);
      const costo = val(resultados,'costo_ventas',year);
      const bruto = val(resultados,'resultado_bruto',year);
      const ebit = val(resultados,'ebit',year);
      const ebitda = val(resultados,'ebitda',year);

      if (has(ventas,costo,bruto)) {
        const esperado = ventas - costo;
        const diferencia = bruto - esperado;
        if (Math.abs(diferencia) > 1) {
          out.push(hallazgo('integridad','imp',`Resultado bruto no concilia con ventas y costo — ${year}`,
            'Resultado bruto = Ventas − Costo de ventas',
            {ventas,costo_ventas:costo,resultado_bruto:bruto,resultado_bruto_esperado:esperado,diferencia},
            'El resultado bruto informado no coincide con la relación básica entre ventas y costo.',
            'Existe una inconsistencia que debe explicarse por reclasificaciones, componentes adicionales o error de carga.'
          ));
        }
      }
      if (has(ebitda,ebit) && ebitda < ebit) {
        out.push(hallazgo('integridad','warn',`EBITDA inferior al EBIT — ${year}`,
          'EBITDA ≥ EBIT',{ebitda,ebit},
          'En condiciones normales, EBITDA no debería ser inferior al EBIT.',
          'Revisar definición o clasificación de depreciaciones y amortizaciones.'
        ));
      }
    });
    return out;
  }

  function correlacionClientes(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior = years[i];
      const ci = val(balance,'creditos_ventas',anterior), cf = val(balance,'creditos_ventas',year);
      const ventas = val(resultados,'ventas',year), ventasAnt = val(resultados,'ventas',anterior);
      if (!has(ci,cf,ventas)) return [];
      const cobranzas = ci + ventas - cf;
      const crecVentas = pct(ventas,ventasAnt), crecCreditos = pct(cf,ci);
      let n='info', titulo=`Ventas y créditos comerciales — ${year}`;
      let conclusion='La evolución de ventas y créditos debe analizarse conjuntamente para distinguir crecimiento comercial de mayor inmovilización en cartera.';
      if (crecVentas!==null && crecCreditos!==null) {
        if (crecCreditos > crecVentas + 20) {
          n='imp'; titulo=`Créditos comerciales crecen más que las ventas — ${year}`;
          conclusion='La cartera crece más rápido que las ventas; puede existir extensión del plazo de cobro o menor velocidad de recuperación.';
        } else if (crecVentas > crecCreditos + 20) {
          n='warn'; titulo=`Ventas crecen más que los créditos — ${year}`;
          conclusion='El crecimiento de ventas no se traduce proporcionalmente en cartera; la cobranza aparente es favorable y debe contrastarse con caja.';
        }
      }
      return [hallazgo('correlacion',n,titulo,
        'Cobranza estimada = Créditos iniciales + Ventas − Créditos finales',
        {ventas,ventas_variacion_pct:crecVentas,creditos_inicial:ci,creditos_final:cf,creditos_variacion_pct:crecCreditos,cobranza_estimada:cobranzas},
        'Se relacionan ventas, cartera y cobranza reconstruida.',conclusion)];
    });
  }

  function correlacionProveedores(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i];
      const pi=val(balance,'proveedores',anterior), pf=val(balance,'proveedores',year);
      const costo=val(resultados,'costo_ventas',year), ii=val(balance,'inventarios',anterior), inf=val(balance,'inventarios',year);
      if (!has(pi,pf,costo,ii,inf)) return [];
      const compras=costo+inf-ii;
      const variacionProveedores=pct(pf,pi);
      const variacionCompras=pct(compras,Math.abs(costo)||null);
      const pagosEstimados=pi+compras-pf;
      let n='info',titulo=`Proveedores, compras y pagos estimados — ${year}`;
      let conclusion='La evolución de proveedores debe leerse junto con compras estimadas e inventarios para evaluar dependencia del crédito comercial.';
      if (variacionProveedores!==null && variacionCompras!==null && variacionProveedores>variacionCompras+25) {
        n='imp'; titulo=`Proveedores crecen por encima de las compras estimadas — ${year}`;
        conclusion='La obligación con proveedores aumenta más que las compras estimadas; puede indicar acumulación de saldos, menor pago o reclasificaciones.';
      } else if (variacionProveedores!==null && variacionProveedores<-30 && compras>0) {
        n='warn'; titulo=`Fuerte reducción de proveedores — ${year}`;
        conclusion='La reducción puede reflejar cancelación de obligaciones, cambio de financiación o menor uso de crédito comercial.';
      }
      return [hallazgo('correlacion',n,titulo,
        'Compras estimadas = Costo de ventas + Inventario final − Inventario inicial; Pagos = Proveedores iniciales + Compras − Proveedores finales',
        {proveedores_inicial:pi,proveedores_final:pf,compras_estimadas:compras,variacion_proveedores_pct:variacionProveedores,variacion_compras_vs_costo_pct:variacionCompras,pagos_estimados:pagosEstimados},
        'Reconstrucción analítica sin requerir Estado de Flujo formal.',conclusion)];
    });
  }

  function correlacionInventarios(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i], ii=val(balance,'inventarios',anterior), inf=val(balance,'inventarios',year);
      const costo=val(resultados,'costo_ventas',year), ventas=val(resultados,'ventas',year), ventasAnt=val(resultados,'ventas',anterior);
      if (!has(ii,inf,costo,ventas)) return [];
      const vi=pct(inf,ii), vc=pct(costo,val(resultados,'costo_ventas',anterior)), vv=pct(ventas,ventasAnt);
      let n='info',titulo=`Inventarios frente a ventas y costo — ${year}`;
      let conclusion='La evolución del inventario debe observarse junto con rotación y compras.';
      if (vi!==null && vv!==null && vi>vv+30) {
        n='imp'; titulo=`Inventarios crecen mucho más que las ventas — ${year}`;
        conclusion='El stock aumenta más rápidamente que las ventas; puede existir acumulación, menor rotación, compras anticipadas o riesgo de sobrestock/valuación.';
      } else if (vi!==null && vi<-30 && vv!==null && vv>20) {
        n='warn'; titulo=`Ventas crecen mientras inventarios disminuyen — ${year}`;
        conclusion='Puede ser favorable para la rotación, pero debe verificarse que el stock sea suficiente para sostener las ventas.';
      }
      return [hallazgo('correlacion',n,titulo,'Comparación de variaciones interanuales',
        {inventario_inicial:ii,inventario_final:inf,variacion_inventario_pct:vi,variacion_ventas_pct:vv,variacion_costo_pct:vc,costo_ventas:costo},
        'Se contrasta stock con actividad comercial.',conclusion)];
    });
  }

  function correlacionFinanciacion(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i], deudaI=val(balance,'prestamos_cp',anterior), deudaF=val(balance,'prestamos_cp',year);
      const interes=val(resultados,'intereses_gasto',year), cajaI=val(balance,'caja_bancos',anterior), cajaF=val(balance,'caja_bancos',year);
      if (!has(deudaI,deudaF,interes)) return [];
      const vd=pct(deudaF,deudaI), vc=has(cajaI,cajaF)?pct(cajaF,cajaI):null;
      let n='info',titulo=`Deuda financiera e intereses — ${year}`;
      let conclusion='La deuda debe contrastarse con intereses, caja y generación operativa.';
      if (vd!==null && vd>30 && interes>0) {
        n='warn'; titulo=`Aumento de deuda financiera con costo financiero — ${year}`;
        conclusion='La deuda de corto plazo aumenta y genera costo financiero; debe verificarse si financia capital de trabajo o cubre faltantes de caja.';
      }
      if (vd!==null && vd>40 && vc!==null && vc<-20) {
        n='imp'; titulo=`Mayor deuda y menor caja — ${year}`;
        conclusion='Aumenta la deuda de corto plazo mientras disminuye caja: señal de presión financiera que debe contrastarse con generación operativa.';
      }
      return [hallazgo('correlacion',n,titulo,'Comparación de deuda, intereses y caja',
        {deuda_cp_inicial:deudaI,deuda_cp_final:deudaF,variacion_deuda_pct:vd,intereses_gasto:interes,caja_inicial:cajaI,caja_final:cajaF,variacion_caja_pct:vc},
        'Se determina si el financiamiento acompaña la operación o compensa presión de liquidez.',conclusion)];
    });
  }

  function margenes(resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const ant=years[i], ventas=val(resultados,'ventas',year), ventasAnt=val(resultados,'ventas',ant);
      const bruto=val(resultados,'resultado_bruto',year), brutoAnt=val(resultados,'resultado_bruto',ant);
      const ebitda=val(resultados,'ebitda',year), ebitdaAnt=val(resultados,'ebitda',ant);
      const neto=val(resultados,'resultado_neto',year), netoAnt=val(resultados,'resultado_neto',ant);
      if (!has(ventas)||ventas===0) return [];
      const mg=has(bruto)?bruto/ventas*100:null;
      const mgAnt=has(brutoAnt,ventasAnt)&&ventasAnt!==0?brutoAnt/ventasAnt*100:null;
      const me=has(ebitda)?ebitda/ventas*100:null;
      const meAnt=has(ebitdaAnt,ventasAnt)&&ventasAnt!==0?ebitdaAnt/ventasAnt*100:null;
      const mn=has(neto)?neto/ventas*100:null;
      const mnAnt=has(netoAnt,ventasAnt)&&ventasAnt!==0?netoAnt/ventasAnt*100:null;
      const cambios=[['Margen bruto',mg,mgAnt],['Margen EBITDA',me,meAnt],['Margen neto',mn,mnAnt)]
        .filter(x=>x[1]!==null&&x[2]!==null).map(x=>({...x,cambio:x[1]-x[2]}));
      return cambios.filter(x=>Math.abs(x.cambio)>=5).map(x=>hallazgo('tendencia',x.cambio<0?'warn':'info',
        `${x[0]} cambia significativamente — ${year}`,'Margen = Resultado / Ventas × 100',
        {periodo_anterior:ant,periodo_actual:year,margen_anterior_pct:x[2],margen_actual_pct:x[1],cambio_pp:x.cambio},
        'Se compara rentabilidad relativa y no solamente el resultado absoluto.',
        x.cambio>0?'La rentabilidad sobre ventas mejora y debe identificarse si proviene de precio, costo, gastos o mezcla comercial.':'La rentabilidad sobre ventas se deteriora y requiere identificar si la causa está en precios, costos, gastos o mezcla comercial.'
      ));
    });
  }

  function estructura(balance,years) {
    return years.flatMap(year => {
      const ac=val(balance,'total_activo_corriente',year), inv=val(balance,'inventarios',year), cc=val(balance,'creditos_ventas',year), caja=val(balance,'caja_bancos',year);
      if (!has(ac)||ac===0) return [];
      const componentes=[['Inventarios',inv],['Créditos comerciales',cc],['Caja y Bancos',caja]]
        .filter(x=>x[1]!==null).map(x=>({nombre:x[0],valor:x[1],peso:x[1]/ac*100}));
      const mayor=componentes.sort((a,b)=>b.peso-a.peso)[0];
      if (!mayor||mayor.peso<45) return [];
      return [hallazgo('estructura',mayor.peso>=70?'imp':'warn',`Alta concentración del activo corriente en ${mayor.nombre} — ${year}`,
        'Peso = Cuenta / Activo corriente × 100',{activo_corriente:ac,cuenta:mayor.nombre,importe:mayor.valor,peso_pct:mayor.peso,componentes},
        'La composición del activo corriente importa tanto como su importe total.',
        `Una concentración de ${mayor.peso.toFixed(1)}% en ${mayor.nombre.toLowerCase()} reduce la diversificación del activo corriente; debe evaluarse su calidad y capacidad de convertirse en efectivo.`
      )];
    });
  }

  function tendencias(balance,resultados,years) {
    const cuentas=[['ventas','Ventas',resultados],['costo_ventas','Costo de ventas',resultados],['resultado_neto','Resultado neto',resultados],['inventarios','Inventarios',balance],['proveedores','Proveedores',balance],['caja_bancos','Caja y Bancos',balance],['creditos_ventas','Créditos comerciales',balance]];
    return cuentas.flatMap(([key,nombre,data])=>years.slice(1).flatMap((year,i)=>{
      const a=val(data,key,years[i]), b=val(data,key,year);
      if (!has(a,b)||a===0) return [];
      const v=pct(b,a);
      if (v===null||Math.abs(v)<25) return [];
      const n=Math.abs(v)>=60?'warn':'info';
      return [hallazgo('tendencia',n,`Variación relevante — ${nombre} — ${year}`,
        'Variación = (valor final / valor inicial − 1) × 100',
        {periodo_inicial:years[i],periodo_final:year,valor_inicial:a,valor_final:b,variacion_pct:v},
        'Se identifica un cambio interanual relevante.',
        v>0?`El saldo de ${nombre.toLowerCase()} aumenta ${v.toFixed(1)}%; debe determinarse si el crecimiento acompaña la actividad o genera una presión adicional.`:`El saldo de ${nombre.toLowerCase()} disminuye ${Math.abs(v).toFixed(1)}%; debe determinarse si refleja mejora operativa, reducción deliberada o una presión financiera.`
      )];
    }));
  }

  function ejecutar(data) {
    const balance=data?.balance||null, resultados=data?.resultados||null;
    const years=[...new Set([
      ...(balance?.periods||[]), ...(resultados?.periods||[]), ...(data?.flujo?.periods||[])
    ])].filter(Boolean).sort();
    let hallazgos=[];
    if (balance&&resultados) {
      hallazgos.push(...integridad(balance,resultados,years));
      hallazgos.push(...correlacionClientes(balance,resultados,years));
      hallazgos.push(...correlacionProveedores(balance,resultados,years));
      hallazgos.push(...correlacionInventarios(balance,resultados,years));
      hallazgos.push(...correlacionFinanciacion(balance,resultados,years));
      hallazgos.push(...margenes(resultados,years));
      hallazgos.push(...estructura(balance,years));
      hallazgos.push(...tendencias(balance,resultados,years));
    } else if (resultados) {
      hallazgos.push(...integridad(null,resultados,years));
      hallazgos.push(...margenes(resultados,years));
      hallazgos.push(...tendencias(null,resultados,years));
    }
    return {years,hallazgos,resumen:{total:hallazgos.length,criticas:hallazgos.filter(x=>x.nivel==='crit').length,importantes:hallazgos.filter(x=>x.nivel==='imp').length,indagar:hallazgos.filter(x=>x.nivel==='warn').length,informativas:hallazgos.filter(x=>x.nivel==='info').length}};
  }

  return { ejecutar };
})();

window.MotorCoherenciaFinanciera = MotorCoherenciaFinanciera;
