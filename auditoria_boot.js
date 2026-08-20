/* Puente seguro de auditoría.
   No depende del estado interno de app.js: observa las tablas normalizadas y
   ejecuta el motor cuando Balance y/o Resultados ya están visibles. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const num=s=>{
    if(s==null)return null;
    let x=String(s).trim().replace(/\s/g,'');
    if(!x||x==='—'||x==='-')return null;
    if(/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(x))x=x.replace(/\./g,'').replace(',','.');
    else x=x.replace(/\./g,'').replace(',','.');
    const n=Number(x.replace(/[^0-9eE+\-.]/g,''));
    return Number.isFinite(n)?n:null;
  };
  const money=n=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  function leerTabla(t){
    const trs=[...t.querySelectorAll('tbody tr')];
    const allHeads=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim());
    const periods=allHeads.filter(x=>/^(19|20)\d{2}$/.test(x));
    const rows={};
    trs.forEach(tr=>{
      const td=[...tr.children];
      if(td.length<5)return;
      const key=td[0].textContent.trim();
      if(!key)return;
      const values={};
      periods.forEach((y,i)=>values[y]=td[4+i]?num(td[4+i].textContent):null);
      rows[key]={label:td[1]?.textContent.trim()||key,values};
    });
    return {periods,rows};
  }
  function recoger(){
    const out={balance:null,resultados:null};
    document.querySelectorAll('.normalization-table').forEach(t=>{
      const box=t.closest('.normalization-table-wrap');
      const alert=box?.previousElementSibling;
      const title=(alert?.querySelector('strong')?.textContent||'').toUpperCase();
      if(title.includes('BALANCE'))out.balance=leerTabla(t);
      if(title.includes('RESULTADOS'))out.resultados=leerTabla(t);
    });
    return out;
  }
  function resumen(a){
    const crit=a.filter(x=>x.nivel==='crit'),imp=a.filter(x=>x.nivel==='imp'),warn=a.filter(x=>x.nivel==='warn');
    if(crit.length)return 'Se detectaron inconsistencias que deben verificarse antes de considerar confiable la lectura financiera.';
    if(imp.length)return 'La información presenta señales relevantes que no deben interpretarse como errores contables automáticos, pero sí requieren indagación y contraste.';
    if(warn.length)return 'No aparecen inconsistencias críticas, pero existen relaciones financieras que requieren revisión para determinar si responden a la operación normal.';
    return 'Con los datos disponibles no se identificaron señales que superen los umbrales de auditoría configurados.';
  }
  function render(){
    if(!window.MotorCoherenciaFinanciera)return;
    const data=recoger();
    if(!data.balance&&!data.resultados)return;
    let r;
    try{r=window.MotorCoherenciaFinanciera.ejecutar(data);}catch(e){
      const host=document.getElementById('auditoria');
      if(host){host.classList.remove('hidden');host.innerHTML='<section class="card"><h2>4. AUDITORÍA DE COHERENCIA FINANCIERA</h2><div class="body"><div class="alert crit"><strong>ERROR DEL MOTOR DE AUDITORÍA</strong><div>'+esc(e.message)+'</div></div></div></section>';}return;
    }
    const all=r.hallazgos||[];
    const crit=all.filter(x=>x.nivel==='crit'),imp=all.filter(x=>x.nivel==='imp'),warn=all.filter(x=>x.nivel==='warn'),info=all.filter(x=>x.nivel==='info');
    const relevantes=[...crit,...imp,...warn];
    const audit=document.getElementById('auditoria');
    if(!audit)return;
    const cards=relevantes.length?relevantes.map(x=>`<div class="audit-finding ${esc(x.nivel)}"><div class="finding-title">${esc(x.titulo)}</div><div class="finding-formula"><b>Prueba:</b> ${esc(x.formula||'')}</div><div class="finding-values"><b>Valores utilizados:</b><pre>${esc(JSON.stringify(x.valores||{},null,2))}</pre></div><div class="finding-interpretation"><b>Conclusión:</b> ${esc(x.interpretacion||'')}</div></div>`).join(''):'<div class="alert ok"><strong>NO SE DETECTARON SEÑALES RELEVANTES</strong><div>Las pruebas ejecutadas no superaron los umbrales definidos.</div></div>';
    const tendencias=info.filter(x=>/Margen|Cambio|Variación|Ecuación/.test(x.titulo||''));
    const trendHtml=tendencias.length?`<div class="audit-subtitle">Indicadores de contexto</div><div class="audit-context">${tendencias.map(x=>`<div><b>${esc(x.titulo)}</b><br><span>${esc(x.interpretacion||'')}</span></div>`).join('')}</div>`:'';
    audit.innerHTML=`<section class="card audit-card"><h2>4. AUDITORÍA DE COHERENCIA FINANCIERA</h2><div class="body"><div class="kpis"><div class="kpi critical"><span>Críticas</span><b>${crit.length}</b></div><div class="kpi important"><span>Importantes</span><b>${imp.length}</b></div><div class="kpi inquiry"><span>Para indagar</span><b>${warn.length}</b></div><div class="kpi context"><span>Contexto</span><b>${info.length}</b></div><div class="kpi periods"><span>Períodos</span><b>${r.years?.length||0}</b></div></div><div class="audit-periods"><b>Períodos analizados:</b> ${(r.years||[]).join(', ')||'—'}</div><div class="audit-executive"><b>LECTURA ANALÍTICA</b><p>${esc(resumen(all))}</p></div><div class="audit-subtitle">Hallazgos que requieren atención</div>${cards}${trendHtml}</div></section>`;
    audit.classList.remove('hidden');
  }
  let timer=null;
  function schedule(){clearTimeout(timer);timer=setTimeout(render,80)}
  const obs=new MutationObserver(schedule);
  function init(){const c=document.getElementById('control');if(c)obs.observe(c,{childList:true,subtree:true});schedule();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('auditoria:actualizar',schedule);
})();
