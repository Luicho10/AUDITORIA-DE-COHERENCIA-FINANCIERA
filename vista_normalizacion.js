/* Vista dinámica del control de lectura.
   No altera la normalización ni el motor de auditoría.
   Presenta cada período como columna y coloca debajo el valor correspondiente. */
(function(){
  const escapeHtml = s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const moneyValue = n => new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(n)||0);

  window.summaryHtml = function(type,n){
    const names={balance:'BALANCE GENERAL',resultados:'ESTADO DE RESULTADOS',flujo:'FLUJO DE EFECTIVO'};
    const periods=Array.isArray(n?.periods) ? n.periods : [];
    const entries=Object.entries(n?.matched || {});

    const periodHeaders = periods.map(y => `<th class="period-head">${escapeHtml(y)}</th>`).join('');

    const rows = entries.map(([key,x]) => {
      const values = periods.map(y => {
        const value = x?.values?.[y];
        return `<td class="period-value">${value == null ? '—' : moneyValue(value)}</td>`;
      }).join('');

      return `<tr>
        <td><b>${escapeHtml(key)}</b></td>
        <td>${escapeHtml(x?.label || '')}</td>
        <td>${escapeHtml(x?.alias || '')}</td>
        <td class="confidence">${Number(x?.score || 0)}%</td>
        ${values}
      </tr>`;
    }).join('');

    const colspan = 4 + periods.length;

    return `<div class="alert ok">
      <strong>${names[type] || type}</strong>
      <div>Hoja: <b>${escapeHtml(n?.sheet || '')}</b> · Períodos: <b>${periods.join(', ') || 'No identificados'}</b></div>
      <div>Categorías normalizadas: <b>${entries.length}</b></div>
    </div>
    <div class="normalization-table-wrap">
      <table class="table normalization-table">
        <thead>
          <tr>
            <th rowspan="2">Categoría</th>
            <th rowspan="2">Cuenta detectada</th>
            <th rowspan="2">Coincidencia</th>
            <th rowspan="2">Confianza</th>
            ${periods.length ? `<th colspan="${periods.length}" class="period-group">PERÍODOS</th>` : ''}
          </tr>
          <tr>${periodHeaders}</tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="${colspan}">No se encontraron cuentas normalizables.</td></tr>`}
        </tbody>
      </table>
    </div>`;
  };
})();
