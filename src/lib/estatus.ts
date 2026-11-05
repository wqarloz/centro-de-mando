// Tipos, configuración de estatus y utilidades del Centro de Mando.
// Seguro para cliente (sin imports de servidor).

export type Estatus = "PROSPECTO" | "CONFIRMADO" | "FACTURADO" | "CANCELADO";

export const ESTATUS_VALIDOS: Estatus[] = [
  "PROSPECTO",
  "CONFIRMADO",
  "FACTURADO",
  "CANCELADO",
];

export type Modalidad = "PRESENCIAL_CDMX" | "REMOTO" | "FORANEO";

export const MODALIDADES_VALIDAS: Modalidad[] = [
  "PRESENCIAL_CDMX",
  "REMOTO",
  "FORANEO",
];

export type EventoDTO = {
  id: string;
  idEvento: string | null;
  cliente: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  idiomas: string | null;
  estatus: Estatus;
  fechasTexto: string | null;
  fechaInicio: string | null; // ISO
  fechaFin: string | null;
  fechasExtra: string | null;
  dias: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  horario: string | null;
  tipoBloque: string | null;
  tema: string | null;
  modalidad: Modalidad;
  ciudad: string | null;
  tarifa: number;
  anticipo: number | null;
  saldo: number | null;
  fechaLimitePago: string | null;
  linkGlosario: string | null;
  notas: string | null;
};

// Los colores de estatus siguen al tema activo (variables CSS).
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
  FACTURADO: {
    label: "Facturado",
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
  fechasTexto: string | null;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  fechasExtra: string | null;
  dias: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  horario: string | null;
  tipoBloque: string | null;
  tema: string | null;
  modalidad: string;
  ciudad: string | null;
  tarifa: number;
  anticipo: number | null;
  saldo: number | null;
  fechaLimitePago: string | null;
  linkGlosario: string | null;
  notas: string | null;
};

/** Traduce una fila de la base al formato que viaja al comedor (DTO). */
export function aEventoDTO(e: EventoFila): EventoDTO {
  return {
    id: e.id,
    idEvento: e.idEvento,
    cliente: e.cliente,
    contacto: e.contacto,
    telefono: e.telefono,
    correo: e.correo,
    idiomas: e.idiomas,
    estatus: e.estatus as Estatus,
    fechasTexto: e.fechasTexto,
    fechaInicio: e.fechaInicio ? new Date(e.fechaInicio).toISOString() : null,
    fechaFin: e.fechaFin ? new Date(e.fechaFin).toISOString() : null,
    fechasExtra: e.fechasExtra,
    dias: e.dias,
    horaInicio: e.horaInicio,
    horaFin: e.horaFin,
    horario: e.horario,
    tipoBloque: e.tipoBloque,
    tema: e.tema,
    modalidad: e.modalidad as Modalidad,
    ciudad: e.ciudad,
    tarifa: e.tarifa,
    anticipo: e.anticipo,
    saldo: e.saldo,
    fechaLimitePago: e.fechaLimitePago,
    linkGlosario: e.linkGlosario,
    notas: e.notas,
  };
}
