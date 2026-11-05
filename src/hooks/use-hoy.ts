"use client";

import { useEffect, useState } from "react";

/**
 * El "hoy" del reloj del cliente (su ciudad, su calendario).
 *
 * Durante el primer pintado — tanto en la cocina (SSR) como en el comedor
 * (primera hidratación del navegador) — vale `null`: ambos entregan así el
 * mismo HTML, sin desajuste. En cuanto el componente se monta, el reloj se
 * pone en hora con la fecha real del usuario.
 */
export function useHoy(): Date | null {
  const [hoy, setHoy] = useState<Date | null>(null);
  useEffect(() => {
    setHoy(new Date());
  }, []);
  return hoy;
}
