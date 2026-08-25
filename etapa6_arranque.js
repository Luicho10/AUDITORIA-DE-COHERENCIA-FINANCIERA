/* ORQUESTADOR - ETAPA 6 / PRUEBAS CRUZADAS
   Ejecuta las pruebas cruzadas después de que la Etapa 3 haya terminado de renderizar.
*/
(function(){
  const $=id=>document.getElementById(id);
  async function ejecutar(){
    const auditoria=$('auditoria');
    if(!auditoria||typeof window.ejecutarPruebasCruzadas!=='function')return;
    try{
      await window.ejecutarPruebasCruzadas();
      auditoria.classList.remove('hidden');
    }catch(e){
      console.error('Error al ejecutar Etapa 6:',e);
      auditoria.classList.remove('hidden');
    }
  }
  function init(){
    const boton=$('leer');
    if(!boton)return;
    boton.addEventListener('click',()=>setTimeout(ejecutar,550));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
