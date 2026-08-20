/* IMPORTADOR UNIFICADO - AUDITORIA DE COHERENCIA FINANCIERA
   Una sola carga: Excel / CSV / PDF.
   Detecta y separa Balance, Estado de Resultados y Flujo de Efectivo.
   No depende exclusivamente del nombre de la hoja: analiza su contenido.
*/
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function setStatus(text){const el=$('su');if(el)el.textContent=text;}
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  function rowText(row){return(row||[]).map(x=>norm(x)).filter(Boolean).join(' ');}
  function sheet(name,rows,type){return{name,rows,_type:type};}

  function classify(text,name=''){
    const s=norm(text), n=norm(name), score={balance:0,resultados:0,flujo:0};
    if(/balance general|estado de situacion patrimonial|situacion patrimonial/.test(s)||/balance|situacion patrimonial/.test(n))score.balance+=20;
    if(/estado de resultados|estado de resultado|ganancias y perdidas/.test(s)||/resultado|ganancias|perdidas/.test(n))score.resultados+=20;
    if(/flujo de efectivo|flujo de caja|actividades operativas|actividades de inversion|actividades de financiacion/.test(s)||/flujo|cash flow/.test(n))score.flujo+=20;
    // Indicadores distintivos del contenido. Esto permite detectar hojas con nombres
    // genéricos como "EF Y ERR", "Hoja1" o "Datos".
    const hit=(re,w,t)=>{const m=s.match(re);if(m)score[t]+=m.length*w;};
    hit(/\b(ventas netas|ventas|ingresos por ventas)\b/g,5,'resultados');
    hit(/\b(costo de ventas|costo de mercaderias|resultado bruto)\b/g,6,'resultados');
    hit(/\b(ebitda|ebit|resultado operativo|intereses financieros|resultado neto)\b/g,5,'resultados');
    hit(/\b(activo corriente|pasivo corriente|total activo|total pasivo|patrimonio neto)\b/g,6,'balance');
    hit(/\b(inventarios|proveedores|creditos comerciales|capital social)\b/g,4,'balance');
    hit(/\b(cobros a clientes|pagos a proveedores|actividades operativas|actividades de inversion|actividades de financiacion)\b/g,7,'flujo');
    hit(/\b(capex|prestamos recibidos|prestamos pagados|flujo neto de efectivo|efectivo final)\b/g,6,'flujo');
    const ordered=Object.entries(score).sort((a,b)=>b[1]-a[1]);
    return ordered[0][1]>0&&ordered[0][1]>=ordered[1][1]*1.15?ordered[0][0]:null;
  }

  function splitCombinedSheet(sh){
    const rows=sh.rows||[],starts=[];
    rows.forEach((r,i)=>{
      const t=rowText(r);
      if(/^(?:\d+[.)]?\s*)?(balance general|estado de situacion patrimonial|situacion patrimonial)\s*$/.test(t))starts.push({i,type:'balance'});
      else if(/^(?:\d+[.)]?\s*)?(estado de resultados|estado de resultado|ganancias y perdidas|estado de perdidas y ganancias)\s*$/.test(t))starts.push({i,type:'resultados'});
      else if(/^(?:\d+[.)]?\s*)?(estado de flujo de efectivo|flujo de efectivo|estado de flujo de caja|flujo de caja)\s*$/.test(t))starts.push({i,type:'flujo'});
    });
    if(starts.length<2)return[sh];
    return starts.map((s,k)=>{const end=k+1<starts.length?starts[k+1].i:rows.length;return sheet(sh.name+' · '+s.type.toUpperCase(),rows.slice(s.i,end),s.type);});
  }

  async function readExcel(file){
    if(!window.XLSX)throw new Error('No se pudo cargar el lector Excel.');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellNF:true,cellText:false,raw:true,blankrows:true});
    const raw=wb.SheetNames.map(n=>sheet(n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:true,blankrows:true}),null));
    return{name:file.name,sheets:raw.flatMap(splitCombinedSheet)};
  }

  function csvRows(s){return s.split(/\r?\n/).filter(x=>x.trim()).map(line=>{let a=[],cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if((c===','||c===';')&&!q){a.push(cur);cur='';}else cur+=c;}a.push(cur);return a;});}

  async function readPdf(file){
    if(window.pdfjsReady)await window.pdfjsReady;
    if(!window.pdfjsLib)throw new Error('No se pudo cargar el lector PDF.');
    const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,sheets=[];
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p),content=await page.getTextContent(),items=(content.items||[]).filter(x=>String(x.str||'').trim()),byY={};
      items.forEach(it=>{const y=Math.round(it.transform?.[5]??0);(byY[y]||(byY[y]=[])).push({x:it.transform?.[4]??0,str:String(it.str||'').trim()});});
      const ys=Object.keys(byY).map(Number).sort((a,b)=>b-a),rows=ys.map(y=>byY[y].sort((a,b)=>a.x-b.x).map(x=>x.str)).filter(r=>r.length),base=sheet('Página '+p,rows,null);
      splitCombinedSheet(base).forEach(x=>{if(!x._type)x._type=classify(rowText(x.rows),x.name);sheets.push(x);});
    }
    return{name:file.name,sheets};
  }

  async function readSingle(file){
    const n=file.name.toLowerCase();
    if(n.endsWith('.pdf'))return readPdf(file);
    if(n.endsWith('.csv'))return{name:file.name,sheets:splitCombinedSheet(sheet('CSV',csvRows(await file.text()),null))};
    return readExcel(file);
  }

  function classifySheets(doc){
    const groups={balance:[],resultados:[],flujo:[]};
    (doc.sheets||[]).forEach(sh=>{
      const type=sh._type||classify(rowText(sh.rows),sh.name);
      if(type)groups[type].push({...sh,_type:type});
    });
    return groups;
  }

  function mergeSheets(doc,sheets,type){
    if(!sheets.length)return null;
    if(sheets.length===1)return{name:doc.name,sheets:[sheets[0]]};
    const rows=[];
    sheets.forEach((sh,i)=>{if(i)rows.push([`SECCION ${type.toUpperCase()} - ${sh.name}`]);rows.push(...sh.rows);});
    return{name:doc.name,sheets:[{name:type.toUpperCase()+' CONSOLIDADO',rows}]};
  }

  function normalizeAll(doc){
    const groups=classifySheets(doc),out={balance:null,resultados:null,flujo:null};
    ['balance','resultados','flujo'].forEach(type=>{
      const merged=mergeSheets(doc,groups[type],type);if(!merged)return;
      try{out[type]=AuditoriaNormalizador.normalize(merged,type);}catch(e){console.error('Normalización '+type,e);}
    });
    // Último respaldo para documentos realmente combinados en una única sección.
    if(!out.balance||!out.resultados){
      try{const c=AuditoriaNormalizador.normalizeCombined(doc);if(!out.balance)out.balance=c.balance;if(!out.resultados)out.resultados=c.resultados;}catch(e){console.error('Normalización combinada',e);}
    }
    return out;
  }

  function allPeriods(n){return[...new Set(Object.values(n).filter(Boolean).flatMap(x=>x.periods||[]))].sort();}

  function renderControl(normalized){
    const names={balance:'BALANCE GENERAL',resultados:'ESTADO DE RESULTADOS',flujo:'FLUJO DE EFECTIVO'};
    const blocks=Object.entries(normalized).filter(([,n])=>n).map(([type,n])=>`<div class="alert ok"><strong>${names[type]}</strong><div>Hoja / sección: <b>${esc(n.sheet||'Detectada')}</b> · Períodos: <b>${esc((n.periods||[]).join(', ')||'No identificados')}</b> · Cuentas reconocidas: <b>${Object.keys(n.matched||{}).length}</b></div></div>`).join('');
    $('controlBody').innerHTML=`<div class="audit-current"><b>ARCHIVO ÚNICO PROCESADO</b><br>El sistema recibió un solo archivo y clasificó cada hoja/sección por su contenido. Los estados detectados se separan internamente antes de ejecutar las pruebas cruzadas.</div>${blocks||'<div class="alert crit"><strong>NO SE PUDO IDENTIFICAR UN ESTADO FINANCIERO</strong><div>Revise el contenido del archivo.</div></div>'}`;
    $('control').classList.remove('hidden');
  }

  async function processUnified(){
    try{
      const file=$('archivoUnico')?.files?.[0];
      if(!file){setStatus('Seleccione un Excel, CSV o PDF.');return;}
      setStatus('Leyendo y separando automáticamente los estados...');
      const doc=await readSingle(file),normalized=normalizeAll(doc),periods=allPeriods(normalized);
      window.__NORMALIZED_UNIFICADO=normalized;
      window.NORMALIZED=normalized;
      window.DATA={balance:doc,resultados:doc,flujo:doc};
      $('periodos').value=periods.join(', ');$('ejercicio').value=periods.at(-1)||'';
      renderControl(normalized);
      if(window.__AUDITORIA_UI_RUN)window.__AUDITORIA_UI_RUN();
      setStatus(`Archivo procesado: ${file.name}. Estados separados automáticamente.`);
    }catch(e){console.error(e);$('controlBody').innerHTML=`<div class="alert crit"><strong>ERROR DE LECTURA</strong><div>${esc(e.message)}</div></div>`;$('control').classList.remove('hidden');setStatus('No fue posible procesar el archivo.');}
  }

  function install(){
    const input=$('archivoUnico'),old=$('leer');if(!input||!old)return;
    const clone=old.cloneNode(true);old.replaceWith(clone);clone.textContent='LEER Y ANALIZAR ARCHIVO ÚNICO';clone.addEventListener('click',processUnified);
    input.addEventListener('change',e=>setStatus(e.target.files[0]?e.target.files[0].name:'Sin archivo. Cargue un único Excel o PDF.'));
    $('quitarUnico')?.addEventListener('click',()=>{input.value='';setStatus('Sin archivo. Cargue un único Excel o PDF.');$('control').classList.add('hidden');$('auditoria').classList.add('hidden');});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80));else setTimeout(install,80);
})();
