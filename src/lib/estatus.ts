// Tipos, configuración de estatus y utilidades del Centro de Mando.
// Seguro para cliente (sin imports de servidor).

// El ciclo de vida de un evento:
//   PROSPECTO  → cotización enviada, fecha "con lápiz"
//   CONFIRMADO → fecha asegurada, esperando el día de trabajo
//   REALIZADO  → ya trabajado, esperando cerrar el pago
//   PAGADO     → liquidado por completo
//   CANCELADO  → no procedió (con motivo opcional)
export type Estatus =
  | "PROSPECTO"
  | "CONFIRMADO"
  | "REALIZADO"
  | "PAGADO"
  | "CANCELADO";

export const ESTATUS_VALIDOS: Estatus[] = [
  "PROSPECTO",
  "CONFIRMADO",
  "REALIZADO",
  "PAGADO",
  "CANCELADO",
];

/**
 * Estatus legado: los eventos guardados como "FACTURADO" antes de v0.5
 * se exhiben (y viajan al comedor) como REALIZADO, que es su nuevo
 * equivalente: ya trabajado, en espera de cerrar el pago.
 */
export function normalizarEstatus(s: string): Estatus {
  if (s === "FACTURADO") return "REALIZADO";
  return (ESTATUS_VALIDOS as string[]).includes(s) ? (s as Estatus) : "PROSPECTO";
}

export type Modalidad = "PRESENCIAL_CDMX" | "REMOTO" | "FORANEO";

export const MODALIDADES_VALIDAS: Modalidad[] = [
  "PRESENCIAL_CDMX",
  "REMOTO",
  "FORANEO",
];

// ── Idiomas del par ──────────────────────────────────────────────────────────
// Los pares con los que se trabaja; PO - ES está listo para cuando el
// portugués se sume al menú de servicios.
export const IDIOMAS_VALIDOS = ["EN - ES", "PO - ES"] as const;
export type IdiomaPar = (typeof IDIOMAS_VALIDOS)[number];

// ── Impuestos opcionales ─────────────────────────────────────────────────────
// Cálculo informativo: la tarifa es la base (sin IVA) y el IVA se traslada.
// MORAL: además, el cliente retiene 2/3 del IVA (10.6667% de la base)
// y 10% de ISR. FAE: solo el traslado del IVA, sin retenciones.
export type ImpuestosTipo = "MORAL" | "FAE";

export const IMPUESTOS_VALIDOS: ImpuestosTipo[] = ["MORAL", "FAE"];

export const IMPUESTOS_CONFIG: Record<
  ImpuestosTipo,
  { label: string; corto: string; detalle: string }
> = {
  MORAL: {
    label: "Persona moral",
    corto: "Moral",
    detalle: "IVA 16% + ret. IVA 10.6667% + ret. ISR 10%",
  },
  FAE: {
    label: "Física c/ act. empresarial",
    corto: "FAE",
    detalle: "IVA 16%, sin retenciones",
  },
};

export type DesgloseImpuestos = {
  iva: number;
  retIva: number;
  retIsr: number;
  factura: number;
  neto: number;
};

/** Calcula el desglose fiscal a partir de la tarifa (base, sin IVA). */
export function calcularImpuestos(
  tarifa: number,
  tipo: ImpuestosTipo
): DesgloseImpuestos {
  const iva = tarifa * 0.16;
  const factura = tarifa + iva;
  if (tipo === "FAE") {
    return { iva, retIva: 0, retIsr: 0, factura, neto: factura };
  }
  const retIva = tarifa * (10.6667 / 100);
  const retIsr = tarifa * 0.1;
  return { iva, retIva, retIsr, factura, neto: factura - retIva - retIsr };
}

/** Título explicativo del desglose, para tooltips. */
export function tituloImpuestos(tipo: ImpuestosTipo): string {
  return tipo === "MORAL"
    ? "Tarifa + IVA 16% trasladado, menos retenciones (IVA 10.6667% e ISR 10%)"
    : "Tarifa + IVA 16% trasladado, sin retenciones";
}

export type EventoDTO = {
  id: string;
  idEvento: string | null;
  cliente: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  idiomas: string | null;
  estatus: Estatus;
  razonCancelacion: string | null;
  fechasTexto: string | null;
  fechaInicio: string | null; // ISO
  fechaFin: string | null;
  dias: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  horario: string | null;
  tipoBloque: string | null;
  tema: string | null;
  modalidad: Modalidad;
  ciudad: string | null;
  tarifa: number;
  tarifaPorDia: number | null;
  impuestosTipo: ImpuestosTipo | null;
  anticipo: number | null;
  saldo: number | null;
  fechaLimitePago: string | null;
  linkGlosario: string | null;
  notas: string | null;
};

// Los colores de estatus siguen al tema activo (variables CSS).
// REALIZADO usa su propia pintura (azul); PAGADO viste el oro de la casa.
export const ESTATUS_CONFIG: Record<
  Estatus,
  {
    label: string;
    chip: string; // clases del badge
    punto: string; // color del dot
    texto: string;
  }
> = {
  PROSPECTO: {
    label: "Prospecto",
    chip: "border-estado-prospecto/25 bg-estado-prospecto/10 text-estado-prospecto",
    punto: "bg-estado-prospecto",
    texto: "text-estado-prospecto",
  },
  CONFIRMADO: {
    label: "Confirmado",
    chip: "border-estado-confirmado/25 bg-estado-confirmado/10 text-estado-confirmado",
    punto: "bg-estado-confirmado",
    texto: "text-estado-confirmado",
  },
  REALIZADO: {
    label: "Realizado",
    chip: "border-estado-realizado/30 bg-estado-realizado/10 text-estado-realizado",
    punto: "bg-estado-realizado",
    texto: "text-estado-realizado",
  },
  PAGADO: {
    label: "Pagado",
    chip: "border-estado-facturado/30 bg-estado-facturado/10 text-estado-facturado",
    punto: "bg-estado-facturado",
    texto: "text-estado-facturado",
  },
  CANCELADO: {
    label: "Cancelado",
    chip: "border-estado-cancelado/25 bg-estado-cancelado/10 text-estado-cancelado",
    punto: "bg-estado-cancelado",
    texto: "text-estado-cancelado",
  },
};

export const MODALIDAD_CONFIG: Record<
  Modalidad,
  { label: string; conCiudad?: boolean }
> = {
  PRESENCIAL_CDMX: { label: "Presencial" },
  REMOTO: { label: "Remoto" },
  FORANEO: { label: "Foráneo", conCiudad: true },
};

export const formatoTarifa = (n: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(n);

/** Dinero con hasta dos decimales (para impuestos y netos). */
export const formatoDinero = (n: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(n);

export const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Convierte el número tal cual del Sheet en un teléfono válido para wa.me.
 * "5636020401" (10 dígitos, México) → "525636020401".
 * Devuelve null si no hay número utilizable.
 */
export const normalizarWhatsApp = (tel?: string | null): string | null => {
  if (!tel) return null;
  const digitos = tel.replace(/\D/g, "");
  if (digitos.length === 10) return `52${digitos}`; // celular mexicano sin clave lada internacional
  if (digitos.length === 12 && digitos.startsWith("52")) return digitos;
  if (digitos.length === 11 && digitos.startsWith("52")) return digitos;
  if (digitos.length >= 12) return digitos; // ya viene con clave de otro país
  return null;
};

/** Forma de una fila tal como sale de la base de datos (Prisma). */
export type EventoFila = {
  id: string;
  idEvento: string | null;
  cliente: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  idiomas: string | null;
  estatus: string;
  razonCancelacion: string | null;
  fechasTexto: string | null;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  dias: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  horario: string | null;
  tipoBloque: string | null;
  tema: string | null;
  modalidad: string;
  ciudad: string | null;
  tarifa: number;
  tarifaPorDia: number | null;
  impuestosTipo: string | null;
  anticipo: number | null;
  saldo: number | null;
  fechaLimitePago: string | null;
  linkGlosario: string | null;
  notas: string | null;
};

/** Traduce una fila de la base al formato que viaja al comedor (DTO). */
export function aEventoDTO(e: EventoFila): EventoDTO {
  const impuestosTipo =
    e.impuestosTipo && (IMPUESTOS_VALIDOS as string[]).includes(e.impuestosTipo)
      ? (e.impuestosTipo as ImpuestosTipo)
      : null;
  return {
    id: e.id,
    idEvento: e.idEvento,
    cliente: e.cliente,
    contacto: e.contacto,
    telefono: e.telefono,
    correo: e.correo,
    idiomas: e.idiomas,
    estatus: normalizarEstatus(e.estatus),
    razonCancelacion: e.razonCancelacion,
    fechasTexto: e.fechasTexto,
    fechaInicio: e.fechaInicio ? new Date(e.fechaInicio).toISOString() : null,
    fechaFin: e.fechaFin ? new Date(e.fechaFin).toISOString() : null,
    dias: e.dias,
    horaInicio: e.horaInicio,
    horaFin: e.horaFin,
    horario: e.horario,
    tipoBloque: e.tipoBloque,
    tema: e.tema,
    modalidad: e.modalidad as Modalidad,
    ciudad: e.ciudad,
    tarifa: e.tarifa,
    tarifaPorDia: e.tarifaPorDia,
    impuestosTipo,
    anticipo: e.anticipo,
    saldo: e.saldo,
    fechaLimitePago: e.fechaLimitePago,
    linkGlosario: e.linkGlosario,
    notas: e.notas,
  };
}
