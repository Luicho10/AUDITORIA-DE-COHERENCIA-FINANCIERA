const MotorCoherenciaFinanciera = (() => {
  const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const fmt = v => (num(v) ?? 0).toLocaleString('es-PY', { maximumFractionDigits: 0 });
  const pct = (final, inicial) => num(inicial) === null || num(inicial) === 0 || num(final) === null ? null : (num(final) / num(inicial) - 1) * 100;
  const val = (data, key, year) => data?.matched?.[key]?.values?.[year] ?? null;
  const hallazgo = (nivel, titulo, formula, valores, interpretacion) => ({ nivel, titulo, formula, valores, interpretacion });

  function integridad(balance, years) {
    return years.flatMap(year => {
      const activo=val(balance,'total_activo',year), pasivo=val(balance,'total_pasivo',year), patrimonio=val(balance,'total_patrimonio',year);
      if ([activo,pasivo,patrimonio].some(x=>x===null)) return [];
      const diferencia=activo-pasivo-patrimonio;
      return Math.abs(diferencia)>0.5 ? [hallazgo('crit',`Ecuación patrimonial inconsistente — ${year}`,'Activo − Pasivo − Patrimonio = 0',{activo,pasivo,patrimonio,diferencia},`La diferencia de Gs. ${fmt(diferencia)} impide considerar conciliada la ecuación patrimonial.`)] : [];
    });
  }

  function proveedores(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i];
      const pi=val(balance,'proveedores',anterior), pf=val(balance,'proveedores',year), costo=val(resultados,'costo_ventas',year), ii=val(balance,'inventarios',anterior), inf=val(balance,'inventarios',year);
      if ([pi,pf,costo,ii,inf].some(x=>x===null)) return [];
      const compras=costo+inf-ii;
      const pagosEstimados=pi+compras-pf;
      return [hallazgo('info',`Movimiento estimado de proveedores — ${year}`,'Compras = Costo de ventas + Inventario final − Inventario inicial; Pagos estimados = Proveedores iniciales + Compras − Proveedores finales',{proveedores_inicial:pi,costo_ventas:costo,inventario_inicial:ii,inventario_final:inf,compras_estimadas:compras,proveedores_final:pf,pagos_estimados:pagosEstimados},'Reconstrucción analítica. No implica error: debe contrastarse con pagos de obligaciones anteriores, impuestos, reclasificaciones y otras compras.')];
    });
  }

  function clientes(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i], ci=val(balance,'creditos_ventas',anterior), cf=val(balance,'creditos_ventas',year), ventas=val(resultados,'ventas',year);
      if ([ci,cf,ventas].some(x=>x===null)) return [];
      const cobranzas=ci+ventas-cf;
      return [hallazgo('info',`Cobranza estimada de clientes — ${year}`,'Cobranza = Créditos iniciales + Ventas − Créditos finales',{clientes_inicial:ci,ventas,clientes_final:cf,cobranza_estimada:cobranzas},'Permite contrastar la cobranza reconstruida con referencias bancarias, IVA u otra evidencia disponible.')];
    });
  }

  function inventarios(balance,resultados,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i], ii=val(balance,'inventarios',anterior), inf=val(balance,'inventarios',year), costo=val(resultados,'costo_ventas',year);
      if ([ii,inf,costo].some(x=>x===null)) return [];
      const variacion=pct(inf,ii);
      const base=(Math.abs(ii)+Math.abs(inf))/2;
      const cobertura=base ? Math.abs(costo)/base : null;
      const nivel=Math.abs(variacion||0)>=60?'warn':'info';
      return [hallazgo(nivel,`Inventarios vs. costo de ventas — ${year}`,'Variación de inventario = (Inventario final / Inventario inicial − 1) × 100',{inventario_inicial:ii,inventario_final:inf,variacion,costo_ventas:costo,rotacion_aproximada:cobertura},'Una variación fuerte orienta la indagación sobre compras, despacho, existencias físicas, valuación y rotación.')];
    });
  }

  function ppe(balance,flujo,years) {
    return years.slice(1).flatMap((year,i) => {
      const anterior=years[i], pi=val(balance,'ppe',anterior), pf=val(balance,'ppe',year), capex=val(flujo,'capex',year);
      if ([pi,pf].some(x=>x===null)) return [];
      const incremento=pf-pi;
      if (Math.abs(incremento)<0.5) return [];
      return [hallazgo('warn',`Variación de propiedad, planta y equipo — ${year}`,'Incremento PPE = PPE final − PPE inicial',{ppe_inicial:pi,ppe_final:pf,incremento,capex_informado:capex},'El aumento debe correlacionarse con adquisiciones, depreciaciones, bajas y origen de fondos. Si no existe flujo formal, queda como prueba de indagación.')];
    });
  }

  function tendencias(balance,resultados,years) {
    const cuentas=[['ventas','Ventas',resultados],['inventarios','Inventarios',balance],['proveedores','Proveedores',balance],['caja_bancos','Caja y Bancos',balance],['resultado_ejercicio','Resultado del ejercicio',balance]];
    return cuentas.flatMap(([key,nombre,data]) => years.length<3 ? [] : years.slice(2).flatMap((year,i) => {
      const a=val(data,key,years[i]), b=val(data,key,years[i+1]), c=val(data,key,year);
      if ([a,b,c].some(x=>x===null)) return [];
      const v1=pct(b,a), v2=pct(c,b), ruptura=v2-v1;
      return Math.abs(ruptura)>=40 ? [hallazgo('warn',`Ruptura de tendencia — ${nombre} — ${year}`,'Variación = (valor final / valor inicial − 1) × 100',{periodos:[years[i],years[i+1],year],variacion_periodo_1:v1,variacion_periodo_2:v2,ruptura},'La aceleración o desaceleración entre períodos merece revisión. Es un indicio, no una conclusión de error.')]:[];
    }));
  }

  function ejecutar({balance,resultados,flujo}) {
    const years=[...new Set([...(balance?.periods||[]),...(resultados?.periods||[]),...(flujo?.periods||[])])].sort();
    return { years, hallazgos:[...integridad(balance,years),...proveedores(balance,resultados,years),...clientes(balance,resultados,years),...inventarios(balance,resultados,years),...ppe(balance,flujo,years),...tendencias(balance,resultados,years)] };
  }
  return { ejecutar };
})();
