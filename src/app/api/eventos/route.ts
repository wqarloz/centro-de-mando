import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { aEventoDTO } from "@/lib/estatus";
import { parsearEventoPayload } from "@/lib/evento-payload";

// Creación de eventos — la puerta de entrada al registro.
// Cada evento nuevo recibe un código corto único (p.ej. "EV-4F2A").
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const parsed = parsearEventoPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Tres intentos por si el código generado choca con uno existente.
  for (let intento = 0; intento < 3; intento++) {
    const idEvento = "EV-" + randomBytes(2).toString("hex").toUpperCase();
    try {
      const creado = await db.evento.create({
        data: { ...parsed.data, idEvento },
      });
      return NextResponse.json(aEventoDTO(creado), { status: 201 });
    } catch (e) {
      const codigo = (e as { code?: string }).code;
      if (codigo === "P2002" && intento < 2) continue; // choque de código, reintentar
      throw e;
    }
  }
  return NextResponse.json(
    { error: "No se pudo asignar un código único" },
    { status: 500 }
  );
}

// Listado completo (útil para depuración y futuras vistas)
export async function GET() {
  const eventos = await db.evento.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(eventos.map(aEventoDTO));
}
