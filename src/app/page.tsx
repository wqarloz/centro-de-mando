import { db } from "@/lib/db";
import CommandCenter from "@/components/command-center";
import { aEventoDTO } from "@/lib/estatus";

export const dynamic = "force-dynamic";

export default async function Home() {
  const filas = await db.evento.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <CommandCenter eventosIniciales={filas.map(aEventoDTO)} />;
}
