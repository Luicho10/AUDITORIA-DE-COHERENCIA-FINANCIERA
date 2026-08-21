/* Ajustes de normalizacion especificos para conciliaciones profundas */
(function(){
  const n=window.AuditoriaNormalizador;
  if(!n||!n.C)return;
  n.C.balance.intereses_a_pagar=['intereses a pagar','intereses por pagar','intereses devengados a pagar','intereses pendientes de pago'];
})();
