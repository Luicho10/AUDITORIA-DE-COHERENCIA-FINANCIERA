/* ETAPA 1 - LECTOR UNICO / ESTRUCTURA REAL DEL ESTADO */
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const fmt=n=>n===null||n===undefined||n===''?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  let datos={balance:null,resultados:null,flujo:null};

  function yearOf(v){
    if(v instanceof Date&&!isNaN(v))return String(v.getFullYear());
    if(typeof v==='number'&&Number.isFinite(v)){
      if(Number.isInteger(v)&&v>=1900&&v<=2100)return String(v);
      if(v>=30000&&v<=60000){const d=new Date(Date.UTC(1899,11,30)+v*86400000),y=d.getUTCFullYear();if(y>=1900&&y<=2100)return String(y);}
    }
    const m=String(v??'').match(/(?:19|20)\d{2}/);return m?m[0]:null;
  }
  function parseNum(v){
    if(v===null||v===undefined||v==='')return null;
    if(typeof v==='number')return Number.isFinite(v)?v:null;
    const s=String(v).trim().replace(/\s/g,'').replace(/[()]/g,'-');
    const p=/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'.');
    const n=Number(p.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(n)?n:null;
  }
  function cleanLabel(v){return String(v??'').replace(/\s+/g,' ').trim();}
  function section(rows,start,end,type,years){
    const out=[];
    for(let r=start;r<end;r++){
      const label=cleanLabel(rows[r]?.[1]);
      if(!label)continue;
      if(/^\d+\./.test(label)||/^(BALANCE GENERAL|ESTADO DE RESULTADOS|EVOLUCIÓN|VARIACIONES|F L U J O|FLUJO)/i.test(label))continue;
      const values={};years.forEach((y,i)=>values[y]=parseNum(rows[r]?.[[2,5,8][i]]));
      if(!Object.values(values).some(v=>v!==null))continue;
      out.push({row:r+1,label,values,category:category(label,type)});
    }
    return {type,periods:years,rows:out};
  }
  function category(label,type){
    const n=norm(label);
    const exact={
      'disponible (caja y bancos)':'caja_bancos',
      'colocaciones e inversiones financieras - cp':'inversiones_cp',
      'prestamos otorgados - cp':'prestamos_otorgados_cp',
      'creditos comerciales - cp (clientes)':'creditos_clientes_cp',
      '(prevision incobrables)':'prevision_incobrables',
      'intereses devengados a cobrar':'intereses_a_cobrar',
      'deudores varios':'deudores_varios',
      'inventario':'inventarios',
      'anticipos a proveedores':'anticipos_proveedores',
      'gastos pagados por adelantado':'gastos_adelantados',
      'otros activos corrientes':'otros_activos_corrientes',
      'total activo corriente':'total_activo_corriente',
      'colocaciones e inversiones financieras - lp':'inversiones_lp',
      'prestamos otorgados - lp':'prestamos_otorgados_lp',
      'creditos comerciales - lp (clientes)':'creditos_clientes_lp',
      'bonos bursatiles a cobrar':'bonos_a_cobrar',
      'creditos en gestion judicial':'creditos_gestion_judicial',
      'activo fijo (bruto)':'activo_fijo_bruto',
      '(depreciaciones / amortizaciones acumuladas)':'depreciacion_acumulada',
      'cargos diferidos':'cargos_diferidos',
      'otros activos no corrientes':'otros_activos_no_corrientes',
      'total activo no corriente':'total_activo_no_corriente',
      'total activo':'total_activo',
      'deudas financieras - cp':'deuda_financiera_cp',
      'deudas con socios y otras cooperativas - cp':'deuda_socios_cp',
      'deudas comerciales - cp (proveedores)':'proveedores_cp',
      'anticipos de clientes':'anticipos_clientes',
      'provisiones':'provisiones',
      'acreedores varios':'acreedores_varios',
      'bonos bursatiles':'bonos_bursatiles',
      'dividendos a pagar':'dividendos_a_pagar',
      'otros pasivos corrientes':'otros_pasivos_corrientes',
      'total pasivo corriente':'total_pasivo_corriente',
      'deudas financieras - lp':'deuda_financiera_lp',
      'deudas con socios y otras cooperativas - lp':'deuda_socios_lp',
      'deudas comerciales - lp (proveedores)':'proveedores_lp',
      'otros pasivos no corrientes':'otros_pasivos_no_corrientes',
      'total pasivo no corriente':'total_pasivo_no_corriente',
      'total pasivo':'total_pasivo',
      'total previsiones':'total_previsiones',
      'capital':'capital',
      'aportes p/ aumento de capital':'aportes_capital',
      'reserva legal / facultativa':'reserva_legal',
      'reserva de revaluo':'reserva_revaluo',
      'resultados acumulados':'resultados_acumulados',
      'resultado del ejercicio':'resultado_ejercicio',
      'total patrimonio neto':'total_patrimonio',
      'total pasivo + patrimonio neto':'total_pasivo_patrimonio',
      'ventas netas':'ventas_netas',
      'costo de ventas':'costo_ventas',
      'resultado bruto comercial principal':'resultado_bruto_principal',
      'otros ingresos operativos':'otros_ingresos_operativos',
      'otros egresos operativos':'otros_egresos_operativos',
      'resultado bruto comercial secundario':'resultado_bruto_secundario',
      'resultado bruto total':'resultado_bruto_total',
      'gastos operativos, administrativos y de ventas':'gastos_operativos_admin_ventas',
      'gastos operativos, administrativos y de ahorros y creditos':'gastos_operativos_ahorros_creditos',
      'ebitda (flujo operativo puro/caja real)':'ebitda',
      'depreciaciones / amortizaciones':'depreciaciones_amortizaciones',
      'ebit (resultado operativo) (utilidad op contable)':'ebit',
      'intereses financieros pagados':'intereses_pagados',
      'intereses financieros cobrados':'intereses_cobrados',
      'perdidas por diferencia de cambio':'perdida_diferencia_cambio',
      'ganancias por diferencia de cambio':'ganancia_diferencia_cambio',
      'otros egresos no operativos':'otros_egresos_no_operativos',
      'otros ingresos no operativos':'otros_ingresos_no_operativos',
      'resultado antes de impuesto':'resultado_antes_impuesto',
      'impuesto a la renta':'impuesto_renta',
      'capitalizacion de excedentes':'capitalizacion_excedentes',
      'reserva legal':'reserva_legal_resultados',
      'aportes especiales':'aportes_especiales',
      'resultado neto de capitalizaciones':'resultado_neto_capitalizaciones',
      'excedentes capitalizados antes del cierre':'excedentes_capitalizados',
      'resultado neto total del ejercicio':'resultado_neto_total'
    };
    if(type==='flujo'){
      const f={
        'resultado neto':'flujo_resultado_neto','depreciaciones + amortizaciones + previsiones':'flujo_depreciaciones','generacion bruta de fondos':'generacion_bruta_fondos','variacion colocaciones e inversiones financieras cp':'var_inversiones_cp','variacion cuentas a cobrar comerciales cp':'var_clientes_cp','variacion inventario + anticipos a proveedores':'var_inventario_anticipos','variacion gastos pagados por adelantado':'var_gastos_adelantados','variacion otros activos corrientes':'var_otros_activos_corrientes','aplicaciones operativas':'aplicaciones_operativas','variacion cuentas a pagar comerciales cp':'var_proveedores_cp','variacion provisiones':'var_provisiones','variacion otros pasivos corrientes':'var_otros_pasivos_corrientes','generaciones operativas':'generaciones_operativas','generacion (aplicacion) neta operativa':'generacion_neta_operativa','variacion colocaciones e inversiones financieras lp':'var_inversiones_lp','variacion cuentas a cobrar comerciales lp':'var_clientes_lp','variacion inversiones':'var_inversiones','variacion creditos en gestion judicial':'var_creditos_judicial','variacion activo fijo (inversiones y compras)':'var_activo_fijo','variacion cargos diferidos':'var_cargos_diferidos','variacion otros activos no corrientes':'var_otros_activos_nc','pago de dividendos':'pago_dividendos','pago deudas financieras cp':'pago_deuda_fin_cp','pago deudas financieras lp':'pago_deuda_fin_lp','pago deudas comerciales lp':'pago_proveedores_lp','pago deudas con socios y cooperativas cp':'pago_socios_cp','pago deudas con socios y cooperativas lp':'pago_socios_lp','aplicaciones no operativas':'aplicaciones_no_operativas','variacion capital - aportes socios / accionistas':'var_capital','variacion reservas':'var_reservas','variacion activo fijo (ventas)':'var_activo_fijo_ventas','variacion ganancias diferidas':'var_ganancias_diferidas','variacion otros pasivos no corrientes':'var_otros_pasivos_nc','nuevas deudas financieras cp':'nuevas_deudas_fin_cp','nuevas deudas financieras lp':'nuevas_deudas_fin_lp','nuevas deudas comerciales lp':'nuevas_proveedores_lp','nuevas deudas con socios y cooperativas cp':'nuevas_socios_cp','nuevas deudas con socios y cooperativas lp':'nuevas_socios_lp','generaciones no operativas':'generaciones_no_operativas','generacion (aplicacion) neta no operativa':'generacion_neta_no_operativa','variacion neta de caja':'variacion_neta_caja'};
      return f[n]||'flujo_'+n.replace(/[^a-z0-9]+/g,'_');
    }
    return exact[n]||'cuenta_'+n.replace(/[^a-z0-9]+/g,'_');
  }
  async function read(file){
    if(!window.XLSX)throw new Error('No se pudo cargar SheetJS.');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,raw:true,blankrows:true});
    const name=wb.SheetNames.find(n=>norm(n)==='ee ff y eerr')||wb.SheetNames[0];
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null,raw:true,blankrows:true});
    const years=[2,5,8].map(c=>yearOf(rows[4]?.[c])).filter(Boolean);
    if(years.length!==3)throw new Error('No se pudieron identificar las tres columnas de importes 2023, 2024 y 2025.');
    return {name,rows,years};
  }
  function render(data,file){
    const {rows,years}=data;
    const r1=section(rows,9,60,'balance',years);
    const r2=section(rows,63,90,'resultados',years);
    const r3=section(rows,144,187,'flujo',years);
    datos={balance:r1,resultados:r2,flujo:r3};
    const all=[...r1.rows,...r2.rows,...r3.rows];
    const cliente=cleanLabel(rows[2]?.[2]);const ruc=cleanLabel(rows[4]?.[1]);
    if(cliente)$('cliente').value=cliente;if(ruc)$('ruc').value=ruc;$('ejercicio').value=years.at(-1);$('periodos').value=years.join(', ');$('archivoNombre').textContent=file.name;
    const table=(n)=>`<table class="table"><thead><tr><th>Fila</th><th>Cuenta / concepto</th>${years.map(y=>`<th>${y}</th>`).join('')}</tr></thead><tbody>${n.rows.map(x=>`<tr><td>${x.row}</td><td><b>${esc(x.label)}</b><br><small>${esc(x.category)}</small></td>${years.map(y=>`<td>${fmt(x.values[y])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const block=(title,n)=>`<div class="alert ok"><strong>${title}</strong><div>Hoja / sección: <b>${esc(data.name)}</b> · Períodos: <b>${years.join(', ')}</b> · Cuentas/conceptos detectados: <b>${n.rows.length}</b></div></div>${table(n)}`;
    $('controlBody').innerHTML=`<div class="audit-current"><b>ARCHIVO ÚNICO PROCESADO</b><br>${esc(file.name)}. Se conservaron las filas reales del estado; no se descartan cuentas por falta de coincidencia con un catálogo.</div>${block('BALANCE GENERAL',r1)}${block('ESTADO DE RESULTADOS',r2)}${block('FLUJO DE FONDOS COMPARATIVO',r3)}<div class="audit-current"><b>CONTROL DE INTEGRIDAD</b><br>Total detectado: ${all.length} cuentas/conceptos. Los períodos se toman de las columnas de importe del propio Excel.</div>`;
    $('control').classList.remove('hidden');$('auditoria').classList.add('hidden');
  }
  async function process(){
    const input=$('archivoUnico'),file=input?.files?.[0];
    if(!file){$('controlBody').innerHTML='<div class="alert crit"><strong>ERROR DE LECTURA</strong><div>Seleccioná el archivo Excel.</div></div>';$('control').classList.remove('hidden');return;}
    try{render(await read(file),file);}catch(e){console.error(e);$('controlBody').innerHTML=`<div class="alert crit"><strong>ERROR DE LECTURA</strong><div>${esc(e.message)}</div></div>`;$('control').classList.remove('hidden');}
  }
  function init(){
    const input=$('archivoUnico'),leer=$('leer'),limpiar=$('limpiar');if(!input||!leer)return;
    input.addEventListener('change',()=>{$('archivoNombre').textContent=input.files?.[0]?.name||'Sin archivo';});
    leer.addEventListener('click',process);
    limpiar.addEventListener('click',()=>{input.value='';$('archivoNombre').textContent='Sin archivo';$('periodos').value='';$('ejercicio').value='';$('cliente').value='';$('ruc').value='';$('control').classList.add('hidden');$('auditoria').classList.add('hidden');});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
