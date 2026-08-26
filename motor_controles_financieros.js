/* DIAGNÓSTICO CREDITICIO FINAL — SOLO PERÍODO ACTUAL
   El período más reciente determina la conclusión.
   Los períodos anteriores se usan únicamente como referencia de tendencia/deterioro.
   Cada alerta debe explicar: cálculo → relación entre cuentas → significado → impacto crediticio → acción mínima.
*/
(function(){
 const $=id=>document.getElementById(id);
 const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const N=v=>{if(v==null||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v).trim().replace(/\s/g,'').replace(/[()]/g,'-');if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'.');const x=Number(s.replace(/[^0-9eE+\-.]/g,''));return Number.isFinite(x)?x:null};
 const money=x=>x==null?'—':new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(x);
 const pct=x=>x==null||!Number.isFinite(x)?'—':(x*100).toFixed(1)+'%';
 const A={
  activo:['total activo','activo total'],
  pasivo:['total pasivo','pasivo total'],
  patrimonio:['patrimonio neto','total patrimonio neto','patrimonio'],
  caja:['disponible (caja y bancos)','disponible caja y bancos','caja y bancos','disponible','caja'],
  clientes:['creditos comerciales - cp (clientes)','creditos comerciales cp (clientes)','creditos comerciales - cp','creditos comerciales cp','clientes'],
  inventario:['inventario','inventarios'],
  proveedores:['deudas comerciales - cp (proveedores)','deudas comerciales cp (proveedores)','deudas comerciales - cp','deudas comerciales cp','proveedores'],
  acreedores:['acreedores varios','otras cuentas por pagar','otros acreedores'],
  impuestos:['impuestos por pagar','tributos por pagar','impuestos y tasas por pagar'],
  deuda:['deudas financieras - cp','deudas financieras cp','deuda financiera - cp','deuda financiera cp','deudas financieras - lp','deudas financieras lp','deuda financiera - lp','deuda financiera lp'],
  ventas:['ventas netas','ventas'],
  costo:['costo de ventas','costos de ventas'],
  intereses:['intereses financieros pagados','intereses financieros','intereses pagados'],
  resultado:['resultado neto','resultado del ejercicio','ganancia del ejercicio','perdida del ejercicio'],
  flowClientes:['variacion cuentas a cobrar comerciales cp','variacion cuentas a cobrar comerciales'],
  flowNet:['variacion neta de caja']
 };
 function read(){
  const f=$('archivoUnico')?.files?.[0];
  if(!f||!window.XLSX)return Promise.resolve(null);
  return f.arrayBuffer().then(b=>{
   const wb=XLSX.read(b,{type:'array',raw:true,blankrows:true});
   const name=wb.SheetNames.find(x=>norm(x)==='ee ff y eerr')||wb.SheetNames[0];
   return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null,raw:true,blankrows:true});
  });
 }
 function find(r,ls){
  const w=ls.map(norm);
  for(let i=0;i<r.length;i++){
   const c=[0,1,2,3].map(j=>norm(r[i]?.[j]));
   if(w.some(x=>c.includes(x)))return i;
  }
  for(let i=0;i<r.length;i++){
   const c=[0,1,2,3].map(j=>norm(r[i]?.[j]));
   if(w.some(x=>c.some(z=>z===x||z.startsWith(x+' ')||z.endsWith(' '+x))))return i;
  }
  return -1;
 }
 function get(r,map){const d={};for(const[k,ls]of Object.entries(map)){const i=find(r,ls);d[k]=i<0?null:[2,5,8].map(c=>N(r[i]?.[c]))}return d}
 const v=(d,k,i)=>d[k]?.[i],has=x=>x!=null&&Number.isFinite(x);
 function periodIndex(){
  const current=String($('ejercicio')?.value||'').trim();
  const periods=String($('periodos')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
  const i=periods.indexOf(current);
  return {current:current||periods.at(-1)||'último período disponible',i:i>=0?i:periods.length-1,p:i>0?i-1:(periods.length>1?periods.length-2:-1)};
 }
 function analyze(d){
  const {current,i,p}=periodIndex();
  const a=[];
  if(i<0)return {current,a};
  const act=v(d,'activo',i),pas=v(d,'pasivo',i),pat=v(d,'patrimonio',i);
  if(has(act)&&has(pas)&&has(pat)){
   const dif=act-pas-pat;
   if(Math.abs(dif)>Math.max(Math.abs(act)*.005,1))a.push(['ALTA','Balance no cierra',`Activo G. ${money(act)} − Pasivo + Patrimonio G. ${money(pas+pat)} = diferencia G. ${money(dif)}.`,`La ecuación patrimonial no cierra. Antes de evaluar solvencia hay que aclarar si existe una cuenta omitida, un signo incorrecto o una clasificación que no corresponde.`,`Activo ↔ Pasivo ↔ Patrimonio.`,`Primero corregir o explicar la diferencia en los estados. No aumentar la línea mientras el balance no cierre.`]);
  }
  const sales=v(d,'ventas',i),sales0=v(d,'ventas',p),cost=v(d,'costo',i),cost0=v(d,'costo',p),cli=v(d,'clientes',i),cli0=v(d,'clientes',p),inv=v(d,'inventario',i),inv0=v(d,'inventario',p),prov=v(d,'proveedores',i),prov0=v(d,'proveedores',p),pas0=v(d,'pasivo',p),debt=v(d,'deuda',i),inter=v(d,'intereses',i),res=v(d,'resultado',i),cash=v(d,'caja',i),cash0=v(d,'caja',p),flowCli=v(d,'flowClientes',i);

  if(has(sales)&&has(sales0)&&sales0!==0){
   const g=(sales-sales0)/Math.abs(sales0);
   if(g<-.15)a.push(['MEDIA','Ventas: deterioro de actividad',`Ventas ${current} G. ${money(sales)} frente a G. ${money(sales0)} en el período anterior: variación ${pct(g)}.`,`La actividad comercial disminuyó de forma relevante. Si la caída se mantiene, puede reducir la generación de fondos disponible para atender la deuda.`,`Ventas ↔ Resultado ↔ Flujo.`,`Comparar con los 12 últimos IVA y con el flujo. Si el deterioro es real, no aumentar la exposición sin considerarlo.`]);
  }

  /* CLIENTES: esta es la explicación que debe entender el analista. */
  if(has(cli)&&has(sales)&&sales>0){
   const days=cli/sales*365;
   const days0=has(cli0)&&has(sales0)&&sales0>0?cli0/sales0*365:null;
   const clientGrowth=has(cli0)&&cli0!==0?(cli-cli0)/Math.abs(cli0):null;
   const salesGrowth=has(sales0)&&sales0!==0?(sales-sales0)/Math.abs(sales0):null;
   const clientVariation=has(cli0)?cli-cli0:null;
   const flowOK=has(flowCli)&&has(clientVariation)&&Math.abs(flowCli-clientVariation)<=1;
   if(days>90||(days0!=null&&days>days0*1.5&&days>45)){
    const calc=`Clientes ${current} G. ${money(cli)} ÷ Ventas ${current} G. ${money(sales)} × 365 = ${days.toFixed(1)} días equivalentes de saldo`+(days0!=null?`; período anterior: G. ${money(cli0)} ÷ G. ${money(sales0)} × 365 = ${days0.toFixed(1)} días`:'.');
    let relation=`Clientes aumentaron ${clientGrowth==null?'—':pct(clientGrowth)} y las ventas ${salesGrowth==null?'—':(salesGrowth>=0?'aumentaron ':'disminuyeron ')+pct(Math.abs(salesGrowth))}.`;
    if(clientVariation!=null)relation+=` El saldo de clientes aumentó G. ${money(clientVariation)}, equivalente al ${pct(clientVariation/Math.max(Math.abs(sales),1))} de las ventas ${current}.`;
    if(flowOK){
      relation+=` El Flujo muestra la misma variación de cuentas a cobrar: G. ${money(flowCli)}. En un aumento de cuentas por cobrar, ese importe se trata como una salida/uso de efectivo en el flujo indirecto: la venta existe contablemente, pero todavía no ingresó el dinero.`;
    }else if(has(flowCli)){
      relation+=` El Flujo muestra una variación de cuentas a cobrar de G. ${money(flowCli)}, mientras el Balance muestra un aumento de G. ${money(clientVariation??0)}; la diferencia de G. ${money(flowCli-(clientVariation??0))} también debe explicarse.`;
    }
    let why;
    if(clientGrowth!=null&&salesGrowth!=null&&clientGrowth>salesGrowth*3){
      why=`Los créditos a clientes crecieron mucho más rápido que las ventas. En términos sencillos: la empresa generó ventas por G. ${money(sales)}, pero durante ${current} aumentó en G. ${money(clientVariation||0)} el importe que quedó pendiente de cobro. Ese aumento no significa que la empresa haya perdido ese dinero; significa que una parte mayor de los recursos quedó inmovilizada en cuentas por cobrar en lugar de convertirse en efectivo. Esto reduce la conversión de ventas en caja y puede aumentar la necesidad de financiamiento.`;
    }else{
      why=`El saldo de clientes aumentó en relación con las ventas. Esto no demuestra por sí solo un problema de cobranza; la señal es relevante porque una mayor parte del capital queda temporalmente en cuentas por cobrar y no en efectivo.`;
    }
    a.push(['MEDIA','Clientes: aumento de plazo',calc,relation+' '+why,'Clientes ↔ Ventas ↔ Flujo. El IVA se incorpora solamente cuando existe una base IVA identificable en el archivo.','Primero comparar automáticamente Clientes, Ventas y Flujo. Solo si la información disponible no explica el aumento: pedir detalle de deuda de clientes.']);
   }
  }

  if(has(inv)&&has(cost)&&cost>0){
   const rot=cost/inv,rot0=has(inv0)&&has(cost0)&&cost0>0?cost0/inv0:null;
   if(rot<1.5||(rot0!=null&&rot<rot0*.6))a.push(['MEDIA','Inventario: rotación deteriorada',`Inventario ${current} G. ${money(inv)} ÷ Costo de ventas G. ${money(cost)} = ${rot.toFixed(2)} veces`+(rot0!=null?` frente a ${rot0.toFixed(2)} veces en el período anterior`:'.'),`El inventario está consumiendo más capital en relación con el costo vendido. Puede tratarse de crecimiento normal del negocio, pero si la rotación empeora puede dificultar la conversión del stock en efectivo.`,`Inventario ↔ Costo de ventas ↔ Ventas ↔ Caja.`,`Primero comprobar la tendencia con los estados e IVA. Pedir detalle de inventario solamente si la señal sigue siendo material.`]);
  }

  if(has(prov)&&has(prov0)&&has(cost)&&has(inv)&&has(inv0)){
   const compras=cost+inv-inv0,dp=prov-prov0;
   if(compras>0&&dp<0&&Math.abs(dp)>compras*.25)a.push(['MEDIA','Proveedores: compras importantes con menor deuda',`Compras reconstruidas = Costo de ventas G. ${money(cost)} + (Inventario final G. ${money(inv)} − inicial G. ${money(inv0)}) = G. ${money(compras)}. Proveedores disminuyeron G. ${money(Math.abs(dp))}.`,`Se observa un volumen importante de compras mientras la deuda con proveedores disminuye. Esto puede ser perfectamente posible si se pagó durante el año o si parte de las compras fue al contado, pero también obliga a comprobar si existen obligaciones en acreedores u otras cuentas.`,`Costo de ventas ↔ Inventario ↔ Proveedores ↔ Caja ↔ Deuda.`,`Primero relacionar con el Flujo y los saldos de Caja/Deuda. Si no se explica, pedir detalle de deuda con proveedores.`]);
  }

  if(has(pas)&&has(pas0)&&has(sales)&&has(sales0)&&sales0!==0&&pas0!==0){
   const gs=(sales-sales0)/Math.abs(sales0),gp=(pas-pas0)/Math.abs(pas0),r=pas/sales,r0=pas0/sales0;
   if(gs>.15&&gp<-.15&&r<r0*.7)a.push(['ALTA','Posible omisión o subregistro de pasivos',`Ventas aumentaron ${pct(gs)}, pero el Pasivo disminuyó ${pct(Math.abs(gp))}. Pasivo/Ventas pasó de ${pct(r0)} a ${pct(r)}.`,`El negocio crece mientras las obligaciones registradas disminuyen. Esto no demuestra por sí solo un pasivo omitido, pero la relación es suficientemente anormal para comprobar si existen obligaciones en proveedores, acreedores, impuestos o bancos que no estén reflejadas.`,`Ventas ↔ Pasivo ↔ Proveedores ↔ Acreedores ↔ Impuestos ↔ Deuda financiera ↔ Flujo.`,`Primero revisar los saldos ya cargados. Si no existe una explicación, pedir detalle de deuda con proveedores y referencias bancarias.`]);
  }

  if(has(inter)&&has(debt)&&debt===0&&inter!==0)a.push(['ALTA','Intereses sin deuda financiera al cierre',`Intereses registrados G. ${money(inter)} y deuda financiera al cierre G. 0.`,`Puede existir deuda cancelada durante el año, intereses devengados de períodos anteriores u otra obligación financiera que no aparece en el saldo final.`,`Intereses ↔ Deuda financiera ↔ Flujo de deuda.`,`Revisar primero los movimientos del año. Solo si no cierran, pedir detalle de deuda o referencia bancaria.`]);

  if(has(res)&&has(cash)&&has(cash0)&&res>0&&cash<cash0){
   const ca=(cash0-cash)/Math.max(res,1);
   if(ca>.5)a.push(['MEDIA','Resultado positivo pero Caja disminuye',`Resultado positivo G. ${money(res)} mientras Caja/Bancos disminuye G. ${money(cash0-cash)}.`,`La utilidad contable no se convirtió íntegramente en efectivo. El sistema debe identificar si el efectivo fue absorbido por clientes, inventario, inversiones o pagos de deuda.`,`Resultado ↔ Clientes ↔ Inventario ↔ Deuda ↔ Flujo.`,`Revisar el puente de efectivo antes de decidir. No pedir documentación adicional si el propio flujo explica el movimiento.`]);
  }
  return {current,a};
 }
 function grade(a){
  const high=a.filter(x=>x[0]==='ALTA').length,med=a.filter(x=>x[0]==='MEDIA').length;
  if(high>=2)return ['MALO','Existen varias señales relevantes del período actual. Deben aclararse antes de considerar un aumento de exposición.','g-bad'];
  if(high===1)return ['REGULAR','Existe una señal relevante que puede afectar la evaluación crediticia y debe aclararse antes de decidir.','g-warn'];
  if(med>=2)return ['REGULAR','Existen varias señales del período actual que requieren revisión antes de ampliar la exposición.','g-warn'];
  if(med===1)return ['BIEN','Existe una señal puntual para revisar, pero no se observa una inconsistencia principal generalizada.','g-good'];
  return ['EXCELENTE','Con la información disponible no se detectan anomalías relevantes en el período actual.','g-excellent'];
 }
 function render(r){
  const d=get(r,A),result=analyze(d),a=result.a,g=grade(a);
  const s=document.createElement('section');s.className='card';s.id='diagnosticoFinal';
  const alerts=a.slice(0,5);
  s.innerHTML=`<h2>4. CONCLUSIÓN CREDITICIA — ${esc(result.current)}</h2><div class="body"><div class="final-grade ${g[2]}"><small>RESULTADO DEL PERÍODO ACTUAL</small><strong>${esc(g[0])}</strong><span>${esc(g[1])}</span><div class="final-note"><b>Regla:</b> el período actual determina la conclusión. Los períodos anteriores sirven únicamente para comparar tendencia y deterioro.</div></div>${alerts.length?`<h3>ALERTAS QUE REALMENTE IMPORTAN</h3><div class="final-alerts">${alerts.map((x,j)=>`<article class="final-alert"><div><b>${j+1}. ${esc(x[1])}</b><em>${esc(x[0])}</em></div><p><b>Qué calculó:</b> ${esc(x[2])}</p><p><b>Qué encontró al relacionar las cuentas:</b> ${esc(x[3])}</p><p><b>Qué significa para el crédito:</b> ${esc(x[3])}</p><p><b>Cuentas relacionadas automáticamente:</b> ${esc(x[4])}</p><p><b>Qué hacer:</b> ${esc(x[5])}</p></article>`).join('')}</div>`:'<div class="final-ok"><b>Sin alertas relevantes.</b><br>Los controles principales del período actual no muestran una señal que justifique profundizar.</div>'}</div>`;
  const aud=$('auditoria');
  if(aud){const old=$('diagnosticoFinal');if(old)old.remove();aud.appendChild(s)}else document.body.appendChild(s);
 }
 function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>setTimeout(()=>read().then(r=>{if(r)render(r)}),650))}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
