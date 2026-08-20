/* IMPORTADOR UNIFICADO - AUDITORIA DE COHERENCIA FINANCIERA
   Una sola carga: Excel / CSV / PDF.
   Detecta Balance, Estado de Resultados y Flujo de Efectivo por contenido.
   No altera el motor de auditoría: entrega NORMALIZED con la misma estructura existente.
*/
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=n=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
  const state={file:null,raw:null};

  function setStatus(text){const el=$('su');if(el)el.textContent=text;}

  function classify(text){
    const s=String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,' ');
    const score={balance:0,resultados:0,flujo:0};
    if(/balance general|estado de situacion patrimonial|situacion patrimonial|activo corriente|pasivo corriente|patrimonio neto/.test(s))score.balance+=10;
    if(/estado de resultados|estado de resultado|ganancias y perdidas|ventas netas|costo de ventas|resultado bruto/.test(s))score.resultados+=10;
    if(/flujo de efectivo|flujo de caja|actividades operativas|actividades de inversion|actividades de financiacion|efectivo al cierre/.test(s))score.flujo+=10;
    return Object.entries(score).sort((a,b)=>b[1]-a[1])[0][1]>0?Object.entries(score).sort((a,b)=>b[1]-a[1])[0][0]:null;
  }

  function normalizeSheetRows(name,rows){return {name,rows};}

  async function readExcel(file){
    if(!window.XLSX)throw new Error('No se pudo cargar el lector Excel.');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellNF:true,cellText:false,raw:true,blankrows:true});
    return {name:file.name,sheets:wb.SheetNames.map(n=>normalizeSheetRows(n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:true,blankrows:true})))};
  }

  function csvRows(s){return s.split(/\r?\n/).filter(x=>x.trim()).map(line=>{let a=[],cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if((c===','||c===';')&&!q){a.push(cur);cur=''}else cur+=c}a.push(cur);return a});}

  async function readPdf(file){
    if(!window.pdfjsLib)throw new Error('No se pudo cargar el lector PDF.');
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
    const sheets=[];
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p);
      const content=await page.getTextContent();
      const items=(content.items||[]).filter(x=>String(x.str||'').trim());
      const lines=[];
      let current=[],lastY=null;
      items.forEach(it=>{
        const y=it.transform?.[5]??0;
        if(lastY!==null&&Math.abs(y-lastY)>4){if(current.length)lines.push(current);current=[];}
        current.push(String(it.str||'').trim());lastY=y;
      });
      if(current.length)lines.push(current);
      const rows=lines.map(parts=>parts).filter(r=>r.length);
      const text=rows.flat().join(' ');
      sheets.push(normalizeSheetRows('Página '+p,rows));
      sheets[sheets.length-1]._type=classify(text);
    }
    return {name:file.name,sheets};
  }

  async function readSingle(file){
    const name=file.name.toLowerCase();
    if(name.endsWith('.pdf'))return readPdf(file);
    if(name.endsWith('.csv'))return {name:file.name,sheets:[normalizeSheetRows('CSV',csvRows(await file.text()))]};
    return readExcel(file);
  }

  function classifySheets(doc){
    const groups={balance:[],resultados:[],flujo:[]};
    (doc.sheets||[]).forEach(sh=>{
      const text=sh.rows.slice(0,250).flat().join(' ');
      const byContent=classify(text);
      const byName=classify(sh.name);
      const type=sh._type||byContent||byName;
      if(type)groups[type].push(sh);
    });
    return groups;
  }

  function mergeSheets(doc,sheets,type){
    if(!sheets.length)return null;
    if(sheets.length===1)return {name:doc.name,sheets:[sheets[0]]};
    // Concatenamos hojas del mismo estado; el normalizador sigue identificando períodos y cuentas.
    const rows=[];sheets.forEach((sh,i)=>{if(i)rows.push([`SECCION ${type.toUpperCase()} - ${sh.name}`]);rows.push(...sh.rows);});
    return {name:doc.name,sheets:[{name:type.toUpperCase()+' CONSOLIDADO',rows}]};
  }

  function normalizeAll(doc){
    const groups=classifySheets(doc);
    const out={balance:null,resultados:null,flujo:null};
    ['balance','resultados','flujo'].forEach(type=>{
      const merged=mergeSheets(doc,groups[type],type);
      if(!merged)return;
      try{out[type]=AuditoriaNormalizador.normalize(merged,type);}catch(e){out[type]=null;}
    });
    // Caso frecuente: un Excel tiene Balance y Resultados dentro de una misma hoja.
    if(!out.balance&&!out.resultados&&groups.balance.length===1){
      try{const combined=AuditoriaNormalizador.normalizeCombined(doc);out.balance=combined.balance;out.resultados=combined.resultados;}catch(e){}
    }
    return out;
  }

  function allPeriods(n){return [...new Set(Object.values(n).filter(Boolean).flatMap(x=>x.periods||[]))].sort();}

  function renderControl(normalized){
    const names={balance:'BALANCE GENERAL',resultados:'ESTADO DE RESULTADOS',flujo:'FLUJO DE EFECTIVO'};
    const blocks=Object.entries(normalized).filter(([,n])=>n).map(([type,n])=>{
      const count=Object.keys(n.matched||{}).length;
      return `<div class="alert ok"><strong>${names[type]}</strong><div>Hoja / sección: <b>${esc(n.sheet||'Detectada')}</b> · Períodos: <b>${esc((n.periods||[]).join(', ')||'No identificados')}</b> · Cuentas reconocidas: <b>${count}</b></div></div>`;
    }).join('');
    $('controlBody').innerHTML=`<div class="audit-current"><b>ARCHIVO ÚNICO PROCESADO</b><br>El sistema recibió un solo archivo y clasificó automáticamente sus hojas/páginas por contenido. Los estados detectados se separan internamente antes de ejecutar las pruebas cruzadas.</div>${blocks||'<div class="alert crit"><strong>NO SE PUDO IDENTIFICAR UN ESTADO FINANCIERO</strong><div>Revise que el archivo contenga Balance, Estado de Resultados o Flujo de Efectivo.</div></div>'}`;
    $('control').classList.remove('hidden');
  }

  async function processUnified(){
    try{
      const file=$('archivoUnico')?.files?.[0];
      if(!file){setStatus('Seleccione un Excel, CSV o PDF.');return;}
      setStatus('Leyendo y separando automáticamente los estados...');
      const doc=await readSingle(file);
      state.file=file;state.raw=doc;
      const normalized=normalizeAll(doc);
      window.NORMALIZED=normalized;
      window.DATA={balance:doc,resultados:doc,flujo:doc};
      const periods=allPeriods(normalized);
      $('periodos').value=periods.join(', ');$('ejercicio').value=periods.at(-1)||'';
      renderControl(normalized);
      if(typeof window.renderAudit==='function')window.renderAudit();
      else if(window.MotorCoherenciaFinanciera?.ejecutar){
        const r=window.MotorCoherenciaFinanciera.ejecutar(normalized);
        const a=r.hallazgos||[];$('auditoria').classList.remove('hidden');
        $('auditoria').innerHTML=`<section class="card"><h2>4. AUDITORÍA DE COHERENCIA FINANCIERA</h2><div class="body"><div class="alert ok"><strong>ANÁLISIS EJECUTADO</strong><div>${a.length} pruebas/hallazgos procesados.</div></div></div></section>`;
      }
      setStatus(`Archivo procesado: ${file.name}. Estados separados automáticamente.`);
    }catch(e){$('controlBody').innerHTML=`<div class="alert crit"><strong>ERROR DE LECTURA</strong><div>${esc(e.message)}</div></div>`;$('control').classList.remove('hidden');setStatus('No fue posible procesar el archivo.');}
  }

  function install(){
    const old=$('leer');if(!old)return;
    const section=old.closest('.card');
    const box=section?.querySelector('.filebox');
    if(box)box.innerHTML=`<div class="unified-upload"><strong>ESTADOS FINANCIEROS</strong><input id="archivoUnico" type="file" accept=".xlsx,.xls,.xlsm,.csv,.pdf"><span id="su">Sin archivo. Cargue un único Excel o PDF.</span><button id="quitarUnico" class="btn secondary" type="button">QUITAR ARCHIVO</button></div>`;
    const text=section?.querySelector('.actions p');if(text)text.innerHTML='<b>Una sola carga.</b> El sistema identifica y separa automáticamente Balance General, Estado de Resultados y Flujo de Efectivo. Si el flujo no existe, la auditoría trabaja con las reconstrucciones disponibles a partir de Balance + Resultados y sus variaciones históricas.';
    const clone=old.cloneNode(true);old.replaceWith(clone);clone.textContent='LEER Y ANALIZAR ARCHIVO ÚNICO';clone.addEventListener('click',processUnified);
    $('archivoUnico')?.addEventListener('change',e=>setStatus(e.target.files[0]?e.target.files[0].name:'Sin archivo. Cargue un único Excel o PDF.'));
    $('quitarUnico')?.addEventListener('click',()=>{const i=$('archivoUnico');if(i)i.value='';setStatus('Sin archivo. Cargue un único Excel o PDF.');$('control').classList.add('hidden');$('auditoria').classList.add('hidden');});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,50));else setTimeout(install,50);
})();
