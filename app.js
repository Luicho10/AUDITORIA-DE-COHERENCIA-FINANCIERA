const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);
let DATA={balance:null,resultados:null,flujo:null},NORMALIZED={balance:null,resultados:null,flujo:null};

/* ============================================================
   NORMALIZADOR INTEGRADO
   La aplicación no depende de que normalizador.js haya cargado.
   Los