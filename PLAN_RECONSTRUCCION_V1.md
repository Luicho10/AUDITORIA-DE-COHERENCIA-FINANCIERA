# Reconstrucción V1 — Auditoría de Coherencia Financiera

## Punto de partida
Commit limpio V0.7: `14fcaca3a6e0c407ddbd2976eba8620d7a8a6604`.

## Etapas
1. **Ingesta única y lectura:** aceptar un único Excel/PDF y conservar la estructura cruda de hojas/secciones.
2. **Normalización verificable:** identificar períodos y cuentas sin emitir conclusiones.
3. **Pruebas contables básicas:** ecuación patrimonial y conciliación de resultados.
4. **Pruebas cruzadas:** clientes/ventas, inventarios/costo, proveedores/compras, deuda/intereses, caja/flujo, PPE/CAPEX/financiamiento.
5. **Auditoría ejecutiva:** clasificar CONCILIADO, CORRELACIÓN, PARA INDAGAR, HALLAZGO e INCONSISTENCIA.

## Regla de trabajo
No se integra una etapa posterior hasta que la anterior muestre datos reales y verificables en pantalla.
No se crean motores paralelos ni se agregan puentes de ejecución para ocultar fallas de una etapa anterior.
