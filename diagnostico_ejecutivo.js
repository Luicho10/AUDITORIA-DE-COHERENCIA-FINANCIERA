/* DIAGNÓSTICO FINAL — VISTA ÚNICA PARA ANÁLISIS CREDITICIO
   Oculta las tablas técnicas y muestra solamente lo que el usuario necesita para decidir.
*/
(function(){
 const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function technicalRows(){return [...document.querySelectorAll('#auditoria tr')].map(tr=>{const c=[...tr.children].map(x=>x.innerText.trim());return{test:c[0]||'',detail:c[2]||'',result:(c[3]||'').toUpperCase()};}).filter(x=>x.test&&x.result&&x.result!=='RESULTADO');}
 function getHallazgos(){return [...document.querySelectorAll('#hallazgosCrediticios .actionable')].map(a=>{const h=a.querySelector('.diag-head b:last-of-type')||a.querySelector('.diag-head b');const ps=[...a.querySelectorAll('p')].map(x=>x.innerText.trim());return{title:h?.innerText?.trim()||'Señal financiera',what:ps.find(x=>x.startsWith('Qué detectó:'))?.replace('Qué detectó:','').trim()||'',why:ps.find(x=>x.startsWith('Por qué importa'))?.replace(/^Por qué importa para el crédito:\s*/,'').trim()||'',check:ps.find(x=>x.startsWith('Qué revisar primero:'))?.replace('Qué revisar primero:','').trim()||'',request:ps.find(x=>x.startsWith('Qué pedir al cliente'))?.replace(/^Qué pedir al cliente, solo si hace falta:\s*/,'').trim()||'',level:a.querySelector('.priority')?.innerText?.trim()||'MEDIA'};});}
 function hideTechnical(){
   const a=$('auditoria');if(!a)return;
   [...a.children].forEach(el=>{if(el.id!=='diagnosticoFinal')el.style.display='none';});
   a.style.display='block';
 }
 function render(){
   const a=$('auditoria');if(!a)return;
   const rows=technicalRows();
   const hall=getHallazgos();
   const current=$('ejercicio')?.value||'período actual';
   const bad=rows.filter(x=>x.result==='INCONSISTENCIA');
   const ind=rows.filter(x=>x.result==='PARA INDAGAR');
   let grade='EXCELENTE',gclass='g-excellent',summary='No se detectaron anomalías relevantes en los controles realizados.';
   if(bad.length>=2){grade='MALO';gclass='g-bad';summary='Existen varias inconsistencias que deben resolverse antes de considerar normal la información.';}
   else if(bad.length===1){grade='REGULAR';gclass='g-warn';summary='Existe una inconsistencia relevante que debe explicarse antes de aumentar o mantener el riesgo sin revisión.';}
   else if(ind.length>=2||hall.length>=2){grade='REGULAR';gclass='g-warn';summary='Existen varias señales financieras que requieren revisión para determinar si afectan la capacidad de pago.';}
   else if(ind.length===1||hall.length===1){grade='BIEN';gclass='g-good';summary='No hay una inconsistencia principal, pero existe una señal puntual que conviene comprobar.';}
   const items=[];
   bad.slice(0,3).forEach(x=>items.push({level:'ALTA',title:x.test,what:'La prueba no cierra matemáticamente.',why:'La diferencia debe explicarse antes de usar el dato para evaluar crédito.',check:x.detail,request:'Primero revisar las cuentas que forman la relación; no pedir documentación adicional todavía.'}));
   hall.slice(0,3).forEach(x=>items.push(x));
   ind.slice(0,3).forEach(x=>{if(!items.some(y=>y.title===x.test))items.push({level:'MEDIA',title:x.test,what:'La relación presenta una señal fuera de lo esperado.',why:'No demuestra un error, pero puede afectar la lectura de liquidez, endeudamiento o capital de trabajo.',check:x.detail,request:'Solo pedir documentación si Balance, Resultados y Flujo no permiten explicar la señal.'});});
   const unique=[];items.forEach(x=>{if(!unique.some(y=>y.title===x.title))unique.push(x);});
   const s=document.createElement('section');s.id='diagnosticoFinal';s.className='card';
   s.innerHTML=`<h2>DIAGNÓSTICO FINANCIERO — ${esc(current)}</h2><div class="body final-dashboard">
     <div class="final-grade ${gclass}"><div class="final-small">RESULTADO PARA ANÁLISIS DE CRÉDITO</div><div class="final-value">${grade}</div><div class="final-summary">${esc(summary)}</div></div>
     <div class="final-rule"><b>Cómo usarlo:</b> el sistema no dice que exista fraude ni pasivo omitido. Busca relaciones que no se explican razonablemente con los tres estados financieros. Los años anteriores sirven solamente para comparar; las alertas corresponden al período actual.</div>
     ${unique.length?`<h3>LO QUE REALMENTE TENÉS QUE MIRAR</h3><div class="final-alerts">${unique.slice(0,5).map((x,i)=>`<article class="final-alert ${x.level==='ALTA'?'final-high':'final-medium'}"><div class="final-alert-head"><b>${i+1}. ${esc(x.title)}</b><span>${esc(x.level)}</span></div><p><b>Qué detectó:</b> ${esc(x.what)}</p><p><b>Por qué importa:</b> ${esc(x.why)}</p><p><b>Cuentas a relacionar:</b> ${esc(x.check)}</p><p><b>Qué hacer:</b> ${esc(x.request)}</p></article>`).join('')}</div>`:`<div class="final-ok"><b>NO HAY ALERTAS QUE JUSTIFIQUEN PROFUNDIZAR.</b><br>Con la información cargada, las relaciones principales son razonables.</div>`}
     <div class="final-decision"><b>CRITERIO DE DECISIÓN</b><br><span><b>EXCELENTE:</b> sin alertas relevantes.</span> <span><b>BIEN:</b> señal puntual explicable.</span> <span><b>REGULAR:</b> revisar antes de decidir.</span> <span><b>MALO:</b> inconsistencias relevantes; no conviene aumentar la línea hasta aclararlas.</span></div>
   </div>`;
   a.insertBefore(s,a.firstChild);hideTechnical();
 }
 function init(){const b=$('leer');if(!b)return;b.addEventListener('click',()=>{setTimeout(render,5200);});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
