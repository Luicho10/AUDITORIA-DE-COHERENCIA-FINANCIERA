const MotorCoherenciaFinanciera = (() => {
  const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const fmt = v => (num(v) ?? 0).toLocaleString('es-PY', { maximumFractionDigits: 0 });
  const pct = (final, inicial) => num(inicial) === null || num(inicial) === 0 || num(final) === null ? null : (num(final) / num(inicial) - 1) * 100;
  const val = (data, key, year) => data?.matched?.[key]?.values?.[year] ?? null;
  const has = (...xs) => xs.every(x => x !== null && Number.isFinite(Number(x)));
  const level = (severity) => severity === 'crit' ? 'crit' : severity === 'imp' ? 'imp' : severity === 'warn' ? 'warn' : 'info';

  const hallazgo = (tipo, nivel, titulo, formula, valores, interpretacion, conclusion) => ({
    tipo, nivel: level(nivel), titulo, formula, valores, interpretacion, conclusion
  });

  function integridad(balance, resultados, years) {
    const out = [];
    years.forEach(year => {
      const activo=val(balance,'total_activo',year), pasivo=val(balance,'total_pasivo',year), patrimonio=val(balance,'total_patrimonio',year);
      if (has(activo,pasivo,patrimonio)) {
        const diferencia=activo-pasivo-patrimonio;
        out.push(Math.abs(diferencia)>0.5
          ? hallazgo('integridad','crit',`Ecuación patrimonial inconsistente — ${year}`,'Activo − Pasivo − Patrimonio = 0',{activo,pasivo,patrimonio,diferencia},`La ecuación no cierra por Gs. ${fmt(diferencia)}.`, 'Debe revisarse antes de utilizar los estados para conclusiones de riesgo, porque una diferencia patrimonial afecta la confiabilidad de los análisis posteriores.')
          : hallazgo('integridad','info',`Ecuación patrimonial conciliada — ${year}`,'Activo − Pasivo − Patrimonio = 0',{activo,pasivo,patrimonio,diferencia},'La ecuación patrimonial cierra dentro del margen de tolerancia.', 'La estructura patrimonial presenta consistencia matemática para este período.'));
      }

      const ventas=val(resultados,'ventas',year), costo=val(resultados,'costo_ventas',year), bruto=val(resultados,'resultado_bruto',year), ebit=val(resultados,'ebit',year), ebitda=val(resultados,'ebitda',year);
      if (has(ventas,costo,bruto)) {
        const esperado=ventas-costo, diferencia=bruto-esperado;
        if (Math.abs(diferencia)>1) out.push(hallazgo('integridad','imp',`Resultado bruto no concilia con ventas y costo — ${year}`,'Resultado bruto = Ventas − Costo de ventas',{ventas,costo_ventas:costo,resultado_bruto:bruto,resultado_bruto_esperado:esperado,diferencia},'El resultado bruto informado no coincide con la relación básica entre ventas y costo de ventas.', 'Existe una inconsistencia que debe explicarse por reclasificaciones, componentes adicionales del costo o error de carga.'));
      }
      if (has(ebitda,ebit) && ebitda < ebit) out.push(hallazgo('integridad','warn',`EBITDA inferior al EBIT — ${year}`,'EBITDA ≥ EBIT',{ebitda,ebit},'En condiciones normales, el EBITDA no debería ser inferior al EBIT porque parte del EBIT y reincorpora depreciaciones y amortizaciones.', 'La relación merece revisión de definición o clasificación de las cuentas operativas.'));
    });
    return out;
  }

  function correlacionClientes(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i], ci=val(balance,'creditos_ventas',anterior), cf=val(balance,'creditos_ventas',year), ventas=val(resultados,'ventas',year);
      if (!has(ci,cf,ventas)) return [];
      const cobranzas=ci+ventas-cf, crecimientoVentas=pct(ventas,val(resultados,'ventas',anterior)), crecimientoCreditos=pct(cf,ci);
      let nivel='info', titulo=`Ventas y créditos comerciales — ${year}`, conclusion='La evolución de ventas y créditos debe analizarse conjuntamente para distinguir crecimiento comercial de mayor inmovilización en cuentas por cobrar.';
      if (crecimientoVentas !== null && crecimientoCreditos !== null) {
        if (crecimientoCreditos > crecimientoVentas + 20) { nivel='imp'; titulo=`Créditos comerciales crecen más que las ventas — ${year}`; conclusion='La cartera está creciendo más rápido que las ventas; puede existir una extensión del plazo de cobro o una menor velocidad de recuperación.'; }
        else if (crecimientoVentas > crecimientoCreditos + 20) { nivel='warn'; titulo=`Ventas crecen más que los créditos — ${year}`; conclusion='El crecimiento de ventas no se traduce proporcionalmente en cuentas por cobrar; la cobranza aparente es favorable y debe contrastarse con caja y bancos.'; }
      }
      return [hallazgo('correlacion',nivel,titulo,'Cobranza estimada = Créditos iniciales + Ventas − Créditos finales',{ventas,ventas_variacion_pct:crecimientoVentas,creditos_inicial:ci,creditos_final:cf,creditos_variacion_pct:crecimientoCreditos,cobranza_estimada:cobranzas},'Se relacionan ventas, cartera y cobranza reconstruida a partir del balance y resultados.',conclusion)];
    });
  }

  function correlacionProveedores(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i], pi=val(balance,'proveedores',anterior), pf=val(balance,'proveedores',year), costo=val(resultados,'costo_ventas',year), ii=val(balance,'inventarios',anterior), inf=val(balance,'inventarios',year);
      if (!has(pi,pf,costo,ii,inf)) return [];
      const compras=costo+inf-ii, variacionProveedores=pct(pf,pi), variacionCompras=pct(compras,Math.abs(costo)||null), pagosEstimados=pi+compras-pf;
      let nivel='info', titulo=`Proveedores, compras y pagos estimados — ${year}`, conclusion='La evolución de proveedores debe leerse junto con compras estimadas e inventarios para evaluar la dependencia del crédito comercial.';
      if (variacionProveedores !== null && variacionCompras !== null && variacionProveedores > variacionCompras + 25) { nivel='imp'; titulo=`Proveedores crecen por encima de las compras estimadas — ${year}`; conclusion='La obligación con proveedores aumenta más que la actividad de compras estimada; puede indicar acumulación de saldos, menor pago o reclasificaciones que requieren indagación.'; }
      else if (variacionProveedores !== null && variacionProveedores < -30 && compras > 0) { nivel='warn'; titulo=`Fuerte reducción de proveedores — ${year}`; conclusion='La reducción de proveedores puede reflejar cancelación de obligaciones, cambio de financiación o menor uso de crédito comercial.'; }
      return [hallazgo('correlacion',nivel,titulo,'Compras estimadas = Costo de ventas + Inventario final − Inventario inicial; Pagos = Proveedores iniciales + Compras − Proveedores finales',{proveedores_inicial:pi,proveedores_final:pf,compras_estimadas:compras,variacion_proveedores_pct:variacionProveedores,variacion_compras_vs_costo_pct:variacionCompras,pagos_estimados:pagosEstimados},'Reconstrucción analítica sin requerir Estado de Flujo formal.',conclusion)];
    });
  }

  function correlacionInventarios(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i], ii=val(balance,'inventarios',anterior), inf=val(balance,'inventarios',year), costo=val(resultados,'costo_ventas',year), ventas=val(resultados,'ventas',year);
      if (!has(ii,inf,costo,ventas)) return [];
      const vi=pct(inf,ii), vc=pct(costo,val(resultados,'costo_ventas',anterior)), vv=pct(ventas,val(resultados,'ventas',anterior));
      let nivel='info', titulo=`Inventarios frente a ventas y costo — ${year}`, conclusion='La evolución del inventario es compatible con la actividad comercial y debe observarse junto con rotación y compras.';
      if (vi !== null && vv !== null && vi > vv + 30) { nivel='imp'; titulo=`Inventarios crecen mucho más que las ventas — ${year}`; conclusion='El stock aumenta más rápidamente que las ventas; puede existir acumulación, menor rotación, compras anticipadas o riesgo de sobrestock/valuación.'; }
      else if (vi !== null && vi < -30 && vv !== null && vv > 20) { nivel='warn'; titulo=`Ventas crecen mientras inventarios disminuyen — ${year}`; conclusion='Puede ser una señal favorable de rotación, pero debe verificarse que el nivel de inventario sea suficiente para sostener el volumen de ventas.'; }
      return [hallazgo('correlacion',nivel,titulo,'Comparación de variaciones interanuales',{inventario_inicial:ii,inventario_final:inf,variacion_inventario_pct:vi,variacion_ventas_pct:vv,variacion_costo_pct:vc,costo_ventas:costo},'Se contrasta la evolución del stock con la actividad comercial.',conclusion)];
    });
  }

  function correlacionFinanciacion(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i], deudaI=val(balance,'prestamos_cp',anterior), deudaF=val(balance,'prestamos_cp',year), interes=val(resultados,'intereses_gasto',year), cajaI=val(balance,'caja_bancos',anterior), cajaF=val(balance,'caja_bancos',year), ventas=val(resultados,'ventas',year), resultado=val(resultados,'resultado_neto',year);
      if (!has(deudaI,deudaF,interes)) return [];
      const vd=pct(deudaF,deudaI), vc=has(cajaI,cajaF)?pct(cajaF,cajaI):null;
      let nivel='info', titulo=`Deuda financiera e intereses — ${year}`, conclusion='La evolución de la deuda debe contrastarse con intereses, caja y generación de resultados para evaluar si el financiamiento está acompañando la operación.';
      if (vd !== null && vd > 30 && interes > 0) { nivel='warn'; titulo=`Aumento de deuda financiera con costo financiero — ${year}`; conclusion='La deuda de corto plazo aumenta y genera costo financiero; corresponde verificar si financia capital de trabajo productivo o cubre faltantes de caja.'; }
      if (vd !== null && vd > 40 && vc !== null && vc < -20) { nivel='imp'; titulo=`Mayor deuda y menor caja — ${year}`; conclusion='La empresa incrementa deuda de corto plazo mientras disminuye la caja; es una señal de presión financiera que debe contrastarse con generación operativa.'; }
      return [hallazgo('correlacion',nivel,titulo,'Comparación de deuda, intereses y caja',{deuda_cp_inicial:deudaI,deuda_cp_final:deudaF,variacion_deuda_pct:vd,intereses_gasto:interes,caja_inicial:cajaI,caja_final:cajaF,variacion_caja_pct:vc,ventas,resultado_neto:resultado},'Se busca determinar si el financiamiento acompaña la operación o compensa una presión de liquidez.',conclusion)];
    });
  }

  function tendencias(balance,resultados,years) {
    const cuentas=[['ventas','Ventas',resultados],['costo_ventas','Costo de ventas',resultados],['resultado_neto','Resultado neto',resultados],['inventarios','Inventarios',balance],['proveedores','Proveedores',balance],['caja_bancos','Caja y Bancos',balance],['creditos_ventas','Créditos comerciales',balance]];
    return cuentas.flatMap(([key,nombre,data]) => years.length<3 ? [] : years.slice(2).flatMap((year,i) => {
      const a=val(data,key,years[i]), b=val(data,key,years[i+1]), c=val(data,key,year);
      if (!has(a,b,c)) return [];
      const v1=pct(b,a), v2=pct(c,b), ruptura=v2-v1;
      if (v1===null || v2===null) return [];
      if (Math.abs(ruptura)<25) return [];
      const aceleracion=ruptura>0?'aceleración':'desaceleración';
      const nivel=Math.abs(ruptura)>=60?'imp':'warn';
      return [hallazgo('tendencia',nivel,`Cambio de tendencia — ${nombre} — ${year}`,'Variación interanual y cambio entre variaciones',{periodo_1:years[i],periodo_2:years[i+1],periodo_3:year,variacion_1_pct:v1,variacion_2_pct:v2,cambio_de_tendencia_pct:ruptura},`La cuenta presenta una ${aceleracion} relevante entre los dos últimos intervalos analizados.`,`La trayectoria de ${nombre.toLowerCase()} cambió de ritmo; debe buscarse la causa económica antes de concluir que se trata de una anomalía.`)];
    }));
  }

  function anomalias(balance,resultados,years) {
    const out=[];
    const cuentas=[['caja_bancos','Caja y Bancos',balance],['creditos_ventas','Créditos comerciales',balance],['inventarios','Inventarios',balance],['proveedores','Proveedores',balance],['ventas','Ventas',resultados],['resultado_neto','Resultado neto',resultados]];
    cuentas.forEach(([key,nombre,data])=>{
      years.slice(1).forEach((year,i)=>{
        const anterior=years[i], a=val(data,key,anterior), b=val(data,key,year);
        if (a !== null && a !== 0 && b === 0) out.push(hallazgo('anomalia','warn',`Cuenta pasa de saldo a cero — ${nombre} — ${year}`,'Valor final = 0 después de saldo distinto de cero',{periodo_anterior:anterior,valor_anterior:a,periodo_actual:year,valor_actual:b},'Un saldo que desaparece completamente puede ser real, pero también puede obedecer a reclasificación, cancelación, cambio de criterio o problema de lectura.', 'Debe verificarse el movimiento y la documentación de respaldo antes de interpretar el cambio como una mejora o deterioro.'));
      });
    });
    return out;
  }

  function ejecutar({balance,resultados,flujo}) {
    const years=[...new Set([...(balance?.periods||[]),...(resultados?.periods||[]),...(flujo?.periods||[])])].sort();
    const hallazgos=[
      ...integridad(balance,resultados,years),
      ...correlacionClientes(balance,resultados,years),
      ...correlacionProveedores(balance,resultados,years),
      ...correlacionInventarios(balance,resultados,years),
      ...correlacionFinanciacion(balance,resultados,years),
      ...tendencias(balance,resultados,years),
      ...anomalias(balance,resultados,years)
    ];
    const prioridad={crit:0,imp:1,warn:2,info:3};
    hallazgos.sort((a,b)=>prioridad[a.nivel]-prioridad[b.nivel]);
    return {years,hallazgos};
  }

  return { ejecutar };
})();
