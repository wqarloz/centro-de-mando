import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Exporta todo el registro como CSV con las mismas columnas del
// Google Sheet original — puede volver a importarse sin fricción.
export const dynamic = "force-dynamic";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ESTATUS_ETIQUETA: Record<string, string> = {
  PROSPECTO: "Prospecto",
  CONFIRMADO: "Confirmado",
  FACTURADO: "Facturado",
  CANCELADO: "Cancelado",
};

const escapar = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Reconstruye "15 - 19 Noviembre" a partir de las fechas ordenables. */
function fechasComoSheet(
  inicio: Date | null,
  fin: Date | null,
  texto: string | null
): string {
  if (texto) return texto;
  if (!inicio) return "";
  const f = fin && fin.toDateString() !== inicio.toDateString() ? fin : null;
  const anio =
    inicio.getFullYear() !== new Date().getFullYear()
      ? ` ${inicio.getFullYear()}`
      : "";
  if (!f) return `${inicio.getDate()} ${MESES[inicio.getMonth()]}${anio}`;
  if (f.getMonth() === inicio.getMonth()) {
    return `${inicio.getDate()} - ${f.getDate()} ${MESES[f.getMonth()]}${anio}`;
  }
  return `${inicio.getDate()} ${MESES[inicio.getMonth()]} - ${f.getDate()} ${MESES[f.getMonth()]}${anio}`;
}

export async function GET() {
  const filas = await db.evento.findMany({
    orderBy: { createdAt: "desc" },
  });

  const ENCABEZADOS = [
    "ID Evento",
    "Estatus",
    "Cliente / Empresa",
    "Nombre del Contacto",
    "Número del Cliente",
    "Correo del Contacto",
    "Fechas Seleccionadas",
    "Total de Días",
    "Hora de Inicio",
    "Hora de Fin",
    "Tipo de Bloque",
    "Tema / Industria",
    "Modalidad",
    "Tarifa Total",
    "Anticipo Pagado",
    "Saldo Pendiente",
    "Fecha Límite de Pago",
    "Link a Glosario",
  ];

  const lineas = [ENCABEZADOS.join(",")];
  for (const e of filas) {
    const modalidad =
      e.modalidad === "REMOTO"
        ? "Remoto"
        : e.modalidad === "FORANEO"
          ? e.ciudad
            ? `Foráneo, ${e.ciudad}`
            : "Foráneo"
          : "Presencial CDMX";
    lineas.push(
      [
        e.idEvento,
        ESTATUS_ETIQUETA[e.estatus] ?? e.estatus,
        e.cliente,
        e.contacto,
        e.telefono,
        e.correo,
        fechasComoSheet(e.fechaInicio, e.fechaFin, e.fechasTexto),
        e.dias,
        e.horaInicio,
        e.horaFin,
        e.tipoBloque,
        e.tema,
        modalidad,
        e.tarifa,
        e.anticipo ?? 0,
        e.saldo ?? 0,
        e.fechaLimitePago,
        e.linkGlosario,
      ]
        .map(escapar)
        .join(",")
    );
  }

  // BOM para que Excel respete los acentos y la ñ.
  const csv = "\uFEFF" + lineas.join("\r\n");
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eventos-interpretacion-${fecha}.csv"`,
    },
  });
}
