/* ORQUESTADOR - ETAPA 6 / PRUEBAS CRUZADAS
   Ejecuta las pruebas cruzadas después de que la Etapa 3 haya terminado de renderizar.
*/
(function(){
  const $=id=>document.getElementById(id);
  function ejecutar(){
    const auditoria=$('auditoria');
    if(!auditoria||typeof window.ejecutarPruebasCruzadas!=='function')return;
    window.ejecutarPruebasCruzadas();
    setTimeout(()=>auditoria.classList.remove('hidden'),80);
  }
  function init(){
    const boton=$('leer');
    if(!boton)return;
    boton.addEventListener('click',()=>setTimeout(ejecutar,550));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
