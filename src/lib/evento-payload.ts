// Validación y normalización del payload de un evento.
// Compartido por POST (crear) y PUT (editar) para que ambos calculen
// igual los campos derivados: horario, días, tipo de bloque y saldo.
import { ESTATUS_VALIDOS, MODALIDADES_VALIDAS } from "./estatus";

const textoLimpio = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s === "" ? null : s;
};

const aFecha = (v: unknown): Date | null => {
  if (typeof v !== "string" || v.trim() === "") return null;
  // Las fechas de solo día ("2026-11-16") se anclan al mediodía UTC: el día
  // de calendario se conserva idéntico en cualquier zona horaria (UTC puro
  // las dejaría a medianoche, y en México se verían un día antes).
  const s = v.trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00Z`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const minutos = (h: string | null): number | null => {
  if (!h || !/^\d{1,2}:\d{2}$/.test(h)) return null;
  const [H, M] = h.split(":").map(Number);
  return H * 60 + M;
};

const diasEntre = (inicio: Date, fin: Date) =>
  Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1;

export type PayloadEvento = {
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
  anticipo: number;
  saldo: number;
  fechaLimitePago: string | null;
  linkGlosario: string | null;
  notas: string | null;
};

export type ResultadoPayload =
  | { ok: true; data: PayloadEvento }
  | { ok: false; error: string };

export function parsearEventoPayload(
  body: Record<string, unknown> | null
): ResultadoPayload {
  if (!body) return { ok: false, error: "Cuerpo inválido" };

  const cliente = textoLimpio(body.cliente);
  if (!cliente) {
    return { ok: false, error: "El cliente es obligatorio" };
  }

  const tarifaNum = Number(body.tarifa);
  if (!Number.isFinite(tarifaNum) || tarifaNum < 0) {
    return { ok: false, error: "Tarifa inválida" };
  }

  const estatus = (ESTATUS_VALIDOS as string[]).includes(body.estatus as string)
    ? (body.estatus as string)
    : "PROSPECTO";
  const modalidad = (MODALIDADES_VALIDAS as string[]).includes(
    body.modalidad as string
  )
    ? (body.modalidad as string)
    : "PRESENCIAL_CDMX";

  const horaInicio = textoLimpio(body.horaInicio);
  const horaFin = textoLimpio(body.horaFin);
  const horario =
    horaInicio && horaFin ? `${horaInicio} - ${horaFin}` : horaInicio || null;

  const anticipoNum = Number(body.anticipo);
  const anticipo =
    Number.isFinite(anticipoNum) && anticipoNum >= 0 ? anticipoNum : 0;
  const saldo = Math.max(tarifaNum - anticipo, 0);

  const fechaInicio = aFecha(body.fechaInicio);
  const fechaFin = aFecha(body.fechaFin);
  const dias =
    fechaInicio && fechaFin
      ? diasEntre(fechaInicio, fechaFin)
      : fechaInicio
        ? 1
        : null;

  const hi = minutos(horaInicio);
  const hf = minutos(horaFin);
  const tipoBloque =
    hi !== null && hf !== null && hf > hi
      ? hf - hi >= 360
        ? "Jornada Completa"
        : hf - hi >= 180
          ? "Medio Día"
          : "Por Hora"
      : null;

  return {
    ok: true,
    data: {
      cliente,
      contacto: textoLimpio(body.contacto),
      telefono: textoLimpio(body.telefono),
      correo: textoLimpio(body.correo),
      idiomas: textoLimpio(body.idiomas),
      estatus,
      fechasTexto: textoLimpio(body.fechasTexto),
      fechaInicio,
      fechaFin,
      fechasExtra: textoLimpio(body.fechasExtra),
      dias,
      horaInicio,
      horaFin,
      horario,
      tipoBloque,
      tema: textoLimpio(body.tema),
      modalidad,
      ciudad: modalidad === "FORANEO" ? textoLimpio(body.ciudad) : null,
      tarifa: tarifaNum,
      anticipo,
      saldo,
      fechaLimitePago: textoLimpio(body.fechaLimitePago),
      linkGlosario: textoLimpio(body.linkGlosario),
      notas: textoLimpio(body.notas),
    },
  };
}
