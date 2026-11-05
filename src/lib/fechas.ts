// Fechas "de exhibición" del Centro de Mando.
// La cocina (SSR) y el comedor (navegador) viven en zonas horarias distintas:
// el servidor en UTC, el cliente en México. Si cada quien imprime una fecha
// con su propio reloj de pared, los textos no coinciden y la hidratación
// revienta ("Hydration failed"). Estas funciones fijan UNA sola lectura.

/**
 * Convierte el instante ISO de un evento (p. ej. "2026-11-16T00:00:00.000Z")
 * en una fecha "de exhibición": el día de calendario UTC del instante, al
 * mediodía local de quien la mire. Con eso, servidor y cliente imprimen
 * exactamente el mismo "16 nov" sin importar su zona horaria.
 */
export function fechaDisplay(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    12,
    0,
    0,
    0
  );
}
