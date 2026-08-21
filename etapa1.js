/* ETAPA 1 - LECTOR UNICO AUTOCONTENIDO */
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const money=n=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  let normalized={balance:null,resultados:null,flujo:null};

  function yearOf(v){
    if(v instanceof Date&&!isNaN(v)){const y=v.getFullYear();return y>=1900&&y<=2100?String(y):null;}
    if(typeof v==='number'&&Number.isFinite(v)){
      if(Number.isInteger(v)&&v>=1900&&v<=2100)return String(v);
      if(v>=30000&&v<=60000){const d=new Date(Date.UTC(1899,11,30)+v*86400000),y=d.getUTCFullYear();if(y>=1900&&y<=2100)return String(y);}
    }
    const m=String(v??'').match(/(?:19|20)\d{2}/);return m?m[0]:null;
  }
  function yearsInRow(row){return [...new Set((row||[]).map(yearOf).filter(Boolean))];}
  function number(v){
    if(v instanceof Date||v==null||v==='')return null;
    if(typeof v==='number')return Number.isFinite(v)?v:null;
    let s=String(v).trim().replace(/\s/g,'').replace(/[()]/g,'-');
    if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');
    else if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replace(/,/g,'');
    else s=s.replace(/,/g,'.');
    const n=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(n)?n:null;
  }
  function rowText(r){return(r||[]).map(norm).filter(Boolean).join(' ');}
  function sectionStarts(rows){
    const out=[];
    rows.forEach((r,i)=>{const t=rowText(r);
      if(/^(?:\d+[.)]?\s*)?balance general(?:\s|$)/.test(t)||/estado de situacion patrimonial/.test(t))out.push({row:i,type:'balance'});
      else if(/^(?:\d+[.)]?\s*)?estado de resultados(?:\s|$)/.test(t)||/ganancias y perdidas/.test(t))out.push({row:i,type:'resultados'});
      else if(/^(?:\d+[.)]?\s*)?estado de flujo de efectivo(?:\s|$)/.test(t)||/flujo de efectivo/.test(t))out.push({row:i,type:'flujo'});
    });return out;
  }
  function headerRow(rows,before){
    let best=null;
    for(let i=0;i<Math.min(before,80);i++){const ys=yearsInRow(rows[i]);if(ys.length>=2&&(!best||ys.length>best.ys.length))best={i,ys};}
    return best;
  }
  function splitSheet(sh){
    const starts=sectionStarts(sh.rows);if(!starts.length)return[];
    return starts.map((s,i)=>{const end=i+1<starts.length?starts[i+1].row:sh.rows.length;const h=headerRow(sh.rows,s.row);const pre=h?sh.rows.slice(Math.max(0,h.i-1),Math.min(s.row,h.i+2)):[];return{name:sh.name+' · '+s.type.toUpperCase(),rows:[...pre,...sh.rows.slice(s.row,end)],type:s.type,source:sh.name};});
  }
  const aux=/resumen financiero|ddjj|tabla clima|modelo logit|z[- ]?score|calculo agro|sim\. linea|score|ratio|liquidez|endeudamiento|periodo medio|rotacion|indicadores/;
  function sheetType(sh){
    const n=norm(sh.name),t=rowText(sh.rows.slice(0,100));
    if(aux.test(n))return null;
    if(sh.type)return sh.type;
    if(/balance general|estado de situacion patrimonial/.test(t)||/balance|situacion patrimonial/.test(n))return'balance';
    if(/estado de resultados|ganancias y perdidas/.test(t)||/resultado/.test(n))return'resultados';
    if(/flujo de efectivo|flujo de caja/.test(t)||/flujo/.test(n))return'flujo';
    return null;
  }
  const C={
    balance:{caja_bancos:['caja','caja y bancos','bancos','disponibilidades','efectivo'],creditos_ventas:['creditos por ventas','cuentas por cobrar','clientes','deudores por ventas','creditos comerciales'],inventarios:['inventarios','inventario','existencias','mercaderias','stock'],ppe:['propiedad planta y equipo','propiedad, planta y equipo','bienes de uso','activo fijo','activos fijos','inmovilizado material'],proveedores:['proveedores','cuentas por pagar a proveedores','proveedores nacionales','proveedores del exterior'],prestamos_cp:['prestamos corrientes','prestamos corto plazo','deudas financieras corrientes','prestamos bancarios cp'],prestamos_lp:['prestamos no corrientes','prestamos largo plazo','deudas financieras no corrientes','prestamos bancarios lp'],deudas_fiscales:['deudas fiscales','impuestos a pagar','tributos a pagar'],deudas_sociales:['deudas sociales','sueldos y cargas sociales','cargas sociales'],capital:['capital','capital social'],reservas:['reservas','reservas legales'],resultados_acumulados:['resultados acumulados','resultados no asignados','utilidades acumuladas','perdidas acumuladas'],resultado_ejercicio:['resultado del ejercicio','resultado neto del ejercicio','utilidad del ejercicio','perdida del ejercicio'],total_activo:['total activo','total de activos'],total_pasivo:['total pasivo','total de pasivos'],total_patrimonio:['total patrimonio','patrimonio neto','total patrimonio neto']},
    resultados:{ventas:['ventas','ventas netas','ingresos por ventas','ingresos de actividades ordinarias','ingresos operativos','facturacion'],costo_ventas:['costo de ventas','costo de mercaderias vendidas','costo de mercaderias','costos de ventas'],resultado_bruto:['resultado bruto','utilidad bruta','ganancia bruta','margen bruto'],gastos_comerciales:['gastos de comercializacion','gastos comerciales','gastos de ventas'],gastos_administrativos:['gastos de administracion','gastos administrativos'],diferencia_cambio:['diferencia de cambio','resultado por diferencia de cambio','diferencias de cambio'],intereses_gasto:['intereses','intereses pagados','intereses perdidos','gastos financieros','costos financieros'],intereses_ingreso:['intereses ganados','ingresos financieros'],resultado_antes_impuesto:['resultado antes del impuesto','resultado antes de impuestos','ganancia antes del impuesto'],impuesto_renta:['impuesto a la renta','impuesto a las ganancias'],resultado_neto:['resultado neto','resultado del ejercicio','utilidad neta','ganancia neta','perdida neta']},
    flujo:{}
  };
  function match(text,type){const n=norm(text);let best=null;for(const [key,aliases] of Object.entries(C[type]||{}))for(const alias of aliases){const a=norm(alias);if(n===a||n.includes(a)||a.includes(n)){const score=n===a?100:Math.min(99,a.length/n.length*100);if(!best||score>best.score)best={key,alias,score:Math.round(score)};}}return best&&best.score>=28?best:null;}
  function normalizeSection(sec){
    const h=headerRow(sec.rows,sec.rows.length)||{i:0,ys:[]};
    const header=sec.rows[h.i]||[];const col={};header.forEach((v,i)=>{const y=yearOf(v);if(y&&!col[y])col[y]=i;});
    let periods=Object.keys(col).sort();
    if(periods.length<2){for(const r of sec.rows){const ys=yearsInRow(r);if(ys.length>=2){r.forEach((v,i)=>{const y=yearOf(v);if(y&&!col[y])col[y]=i;});} }periods=Object.keys(col).sort();}
    const matched={},unmapped=[];
    for(const row of sec.rows){const label=(row||[]).map(v=>String(v??'').trim()).filter(v=>v&&!yearOf(v)).sort((a,b)=>b.length-a.length)[0]||'';if(!label)continue;const values={};periods.forEach(y=>values[y]=number(row[col[y]]));if(!Object.values(values).some(v=>v!==null))continue;const m=match(label,sec.type);if(m){if(!matched[m.key])matched[m.key]={label,alias:m.alias,score:m.score,values};}else unmapped.push({label,values});}
    return{sheet:sec.name,periods,matched,unmapped};
  }
  async function read(file){
    if(!window.XLSX)throw new Error('No se pudo cargar SheetJS.');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,raw:true,blankrows:true});
    const sections=[];
    for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:true,blankrows:true});const sh={name,rows};const split=splitSheet(sh);if(split.length)split.forEach(s=>sections.push(s));else{const type=sheetType(sh);if(type)sections.push({...sh,type});}}
    return sections;
  }
  function render(sections,file){
    normalized={balance:null,resultados:null,flujo:null};
    for(const type of ['balance','resultados','flujo']){const sec=sections.find(s=>s.type===type);if(sec)normalized[type]=normalizeSection(sec);}
    const p=[...new Set(Object.values(normalized).filter(Boolean).flatMap(x=>x.periods))].sort();
    $('archivoNombre').textContent=file.name;$('periodos').value=p.join(', ');$('ejercicio').value=p.at(-1)||'';
    const block=(title,n)=>{if(!n)return `<div class="alert warn"><strong>${title}</strong><div>No identificado.</div></div>`;const rows=Object.entries(n.matched).map(([k,x])=>`<tr><td><b>${esc(k)}</b></td><td>${esc(x.label)}</td><td>${n.periods.map(y=>`${y}: ${money(x.values[y])}`).join(' · ')}</td></tr>`).join('');return `<div class="alert ok"><strong>${title}</strong><div>Hoja / sección: <b>${esc(n.sheet)}</b> · Períodos: <b>${esc(n.periods.join(', ')||'No identificados')}</b> · Cuentas reconocidas: <b>${Object.keys(n.matched).length}</b></div></div><table class="table"><thead><tr><th>Categoría</th><th>Cuenta detectada</th><th>Valores</th></tr></thead><tbody>${rows||'<tr><td colspan="3">No se encontraron cuentas normalizables.</td></tr>'}</tbody></table>`;};
    $('controlBody').innerHTML=`<div class="audit-current"><b>ARCHIVO ÚNICO PROCESADO</b><br>${esc(file.name)}. La lectura de esta etapa se limita a identificar y separar los estados financieros.</div>${block('BALANCE GENERAL',normalized.balance)}${block('ESTADO DE RESULTADOS',normalized.resultados)}${normalized.flujo?block('FLUJO DE EFECTIVO',normalized.flujo):''}`;
    $('control').classList.remove('hidden');$('auditoria').classList.add('hidden');
  }
  async function process(){
    const input=$('archivoUnico');const file=input&&input.files&&input.files[0];
    if(!file){$('controlBody').innerHTML='<div class="alert crit"><strong>ERROR DE LECTURA</strong><div>El archivo no fue recibido por el navegador. Seleccioná nuevamente el Excel.</div></div>';$('control').classList.remove('hidden');return;}
    try{render(await read(file),file);}catch(e){console.error(e);$('controlBody').innerHTML=`<div class="alert crit"><strong>ERROR DE LECTURA</strong><div>${esc(e.message)}</div></div>`;$('control').classList.remove('hidden');}
  }
  function init(){
    const input=$('archivoUnico'),leer=$('leer'),limpiar=$('limpiar');
    if(!input||!leer)return;
    input.addEventListener('change',()=>{$('archivoNombre').textContent=input.files&&input.files[0]?input.files[0].name:'Sin archivo';});
    leer.addEventListener('click',process);
    limpiar.addEventListener('click',()=>{input.value='';$('archivoNombre').textContent='Sin archivo';$('periodos').value='';$('ejercicio').value='';$('control').classList.add('hidden');$('auditoria').classList.add('hidden');});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
