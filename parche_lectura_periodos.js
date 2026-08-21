/* PARCHE DE LECTURA - preserva encabezados de períodos antes de separar secciones */
(function(){
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const yearsInRow=row=>[...new Set((row||[]).flatMap(v=>window.AuditoriaNormalizador?.extractYears(v)||[]))];
  const rowText=row=>(row||[]).map(norm).filter(Boolean).join(' ');
  const setStatus=t=>{const e=document.getElementById('su');if(e)e.textContent=t;};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function splitWithHeaders(sh){
    const rows=sh.rows||[],starts=[];
    rows.forEach((r,i)=>{
      const t=rowText(r);
      if(/^(?:\d+[.)]?\s*)?(balance general|estado de situacion patrimonial|situacion patrimonial)\s*$/.test(t))starts.push({i,type:'balance'});
      else if(/^(?:\d+[.)]?\s*)?(estado de resultados|estado de resultado|ganancias y perdidas|estado de perdidas y ganancias)\s*$/.test(t))starts.push({i,type:'resultados'});
      else if(/^(?:\d+[.)]?\s*)?(estado de flujo de efectivo|flujo de efectivo|estado de flujo de caja|flujo de caja)\s*$/.test(t))starts.push({i,type:'flujo'});
    });
    if(starts.length<2)return[sh];
    const first=starts[0].i,headerRows=[];
    for(let i=0;i<first;i++)if(yearsInRow(rows[i]).length>=1)headerRows.push(rows[i]);
    const preserved=headerRows.slice(-4);
    return starts.map((s,k)=>{
      const end=k+1<starts.length?starts[k+1].i:rows.length;
      return {name:sh.name+' · '+s.type.toUpperCase(),rows:[...preserved,...rows.slice(s.i,end)],_type:s.type};
    });
  }

  function classifySimple(sh){
    const s=norm((sh.rows||[]).slice(0,250).map(rowText).join(' ')),n=norm(sh.name),scores={balance:0,resultados:0,flujo:0};
    if(/balance general|situacion patrimonial|activo corriente|pasivo corriente|patrimonio neto/.test(s)||/balance|situacion patrimonial/.test(n))scores.balance+=10;
    if(/estado de resultados|ventas netas|costo de ventas|resultado bruto|resultado neto/.test(s)||/resultado|ganancias|perdidas/.test(n))scores.resultados+=10;
    if(/flujo de efectivo|cobros a clientes|pagos a proveedores|flujo neto de efectivo/.test(s)||/flujo|cash flow/.test(n))scores.flujo+=10;
    const best=Object.entries(scores).sort((a,b)=>b[1]-a[1]);return best[0][1]>0?best[0][0]:null;
  }

  function processExcel(file){
    if(!window.XLSX||!window.AuditoriaNormalizador)throw new Error('No se pudo cargar el lector Excel o el normalizador.');
    return file.arrayBuffer().then(buf=>{
      const wb=XLSX.read(buf,{type:'array',cellDates:true,cellNF:true,cellText:false,raw:true,blankrows:true});
      const raw=wb.SheetNames.map(n=>({name:n,rows:XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:true,blankrows:true})}));
      const sheets=raw.flatMap(splitWithHeaders),groups={balance:[],resultados:[],flujo:[]};
      sheets.forEach(sh=>{const type=sh._type||classifySimple(sh);if(type)groups[type].push({...sh,_type:type});});
      const normalized={balance:null,resultados:null,flujo:null};
      ['balance','resultados','flujo'].forEach(type=>{
        const list=groups[type];if(!list.length)return;const rows=[];
        list.forEach((sh,i)=>{if(i)rows.push([`SECCION ${type.toUpperCase()} - ${sh.name}`]);rows.push(...sh.rows);});
        try{normalized[type]=AuditoriaNormalizador.normalize({name:file.name,sheets:[{name:type.toUpperCase()+' CONSOLIDADO',rows}]},type);}catch(e){console.error(e);}
      });
      if(!normalized.balance||!normalized.resultados){
        try{const sh=raw.find(x=>/balance|resultado|situacion/.test(norm(x.name)))||raw[0];const c=AuditoriaNormalizador.normalizeCombined({name:file.name,sheets:[sh]});if(!normalized.balance)normalized.balance=c.balance;if(!normalized.resultados)normalized.resultados=c.resultados;}catch(e){console.error(e);}
      }
      return normalized;
    });
  }

  function allPeriods(n){return[...new Set(Object.values(n).filter(Boolean).flatMap(x=>x.periods||[]))].sort();}
  function render(normalized){
    const names={balance:'BALANCE GENERAL',resultados:'ESTADO DE RESULTADOS',flujo:'FLUJO DE EFECTIVO'};
    const blocks=Object.entries(normalized).filter(([,n])=>n).map(([type,n])=>`<div class="alert ok"><strong>${names[type]}</strong><div>Hoja / sección: <b>${esc(n.sheet||'Detectada')}</b> · Períodos: <b>${esc((n.periods||[]).join(', ')||'No identificados')}</b> · Cuentas reconocidas: <b>${Object.keys(n.matched||{}).length}</b></div></div>`).join('');
    const body=document.getElementById('controlBody');if(body)body.innerHTML=`<div class="audit-current"><b>ARCHIVO ÚNICO PROCESADO</b><br>El sistema recibió un solo archivo y clasificó cada hoja/sección por su contenido. Los encabezados de períodos se conservan al separar estados.</div>${blocks||'<div class="alert crit"><strong>NO SE PUDO IDENTIFICAR UN ESTADO FINANCIERO</strong><div>Revise el contenido del archivo.</div></div>'}`;
    document.getElementById('control')?.classList.remove('hidden');
  }
  function install(){
    const btn=document.getElementById('leer');if(!btn)return;
    btn.addEventListener('click',async e=>{
      const file=document.getElementById('archivoUnico')?.files?.[0];
      if(!file||!/\.(xlsx|xls|xlsm)$/i.test(file.name))return;
      e.preventDefault();e.stopImmediatePropagation();
      try{
        setStatus('Leyendo Excel y conservando los encabezados de períodos...');
        const normalized=await processExcel(file),periods=allPeriods(normalized);
        window.__NORMALIZED_UNIFICADO=normalized;window.NORMALIZED=normalized;window.DATA={balance:{name:file.name},resultados:{name:file.name},flujo:{name:file.name}};
        const p=document.getElementById('periodos'),ej=document.getElementById('ejercicio');if(p)p.value=periods.join(', ');if(ej)ej.value=periods.at(-1)||'';
        render(normalized);if(window.__AUDITORIA_UI_RUN)window.__AUDITORIA_UI_RUN();setStatus(`Archivo procesado: ${file.name}. Estados separados automáticamente.`);
      }catch(err){console.error(err);const b=document.getElementById('controlBody');if(b)b.innerHTML=`<div class="alert crit"><strong>ERROR DE LECTURA</strong><div>${esc(err.message)}</div></div>`;document.getElementById('control')?.classList.remove('hidden');setStatus('No fue posible procesar el archivo.');}
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,180));else setTimeout(install,180);
})();
