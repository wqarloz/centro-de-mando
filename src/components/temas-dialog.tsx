"use client";

// Galería de temas del Centro de Mando.
// Cada tarjeta muestra una miniatura real del panel con la paleta aplicada
// (variables CSS acotadas al contenedor), y "Aplicar" viste la app entera
// al instante — sin recargar, sin perder nada.

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Check, Moon, Palette, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  aCSSVars,
  aplicarTema,
  CLAVES_TEMA,
  ETIQUETA_FUENTE,
  SUPERFICIE_TARJETA,
  TEMAS,
  TEMA_DEFECTO,
  type Modo,
  type Tema,
} from "@/lib/temas";
import { useToast } from "@/hooks/use-toast";

/** Miniatura del Centro de Mando vestida con la paleta del tema. */
function VistaPrevia({ tema, modo }: { tema: Tema; modo: Modo }) {
  const paleta = tema[modo];
  const estilo = {
    ...(aCSSVars(paleta) as Record<string, string>),
    ...SUPERFICIE_TARJETA,
  } as CSSProperties;

  return (
    <div
      style={estilo}
      className="radio-tarjeta border border-linea-fuerte bg-fondo p-3.5"
    >
      {/* Resplandor decorativo del tema */}
      <div
        aria-hidden
        className="pointer-events-none mb-2 h-12 rounded-lg bg-[radial-gradient(80%_100%_at_50%_0%,var(--brillo),transparent)]"
      />

      <p className="text-[8px] font-medium uppercase tracking-[0.22em] text-acento/80">
        Panel operativo
      </p>
      <p className="font-display text-lg font-semibold leading-tight text-tinta">
        Centro de Mando
      </p>

      {/* Mini estadísticas */}
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-linea-suave bg-tarjeta-baja p-2">
          <p className="text-[7px] font-medium uppercase tracking-wider text-tinta-muda">
            Prospectos
          </p>
          <p className="font-display text-sm text-estado-prospecto">1</p>
        </div>
        <div className="rounded-lg border border-linea-suave bg-tarjeta-baja p-2">
          <p className="text-[7px] font-medium uppercase tracking-wider text-tinta-muda">
            Saldo por cobrar
          </p>
          <p className="font-display text-sm text-acento-claro">$ 4,500</p>
        </div>
      </div>

      {/* Mini tarjeta de evento */}
      <div className="mt-1.5 rounded-lg border border-linea bg-gradient-to-b from-tarjeta to-tarjeta-baja p-2.5">
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-xs font-semibold text-tinta">AdWeek</p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-estado-prospecto/25 bg-estado-prospecto/10 px-1.5 py-0.5 text-[8px] font-medium text-estado-prospecto">
            <span className="h-1 w-1 rounded-full bg-estado-prospecto" />
            Prospecto
          </span>
        </div>
        <p className="mt-1 text-[9px] text-tinta-muda">15 – 19 nov · 5 días · EN↔ES</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="font-display text-base leading-none text-tinta">
            $ 4,500{" "}
            <span className="text-[7px] uppercase tracking-wider text-tinta-muda">
              MXN
            </span>
          </p>
          <span className="inline-flex h-6 items-center rounded-md bg-exito px-2 text-[9px] font-semibold text-exito-tinta">
            Confirmar
          </span>
        </div>
      </div>

      {/* Muestras de la paleta */}
      <div className="mt-2.5 flex items-center gap-1.5">
        {[paleta.fondo, paleta.tarjeta, paleta.acento, paleta.acentoClaro, paleta.tinta].map(
          (c, i) => (
            <span
              key={`muestra-${i}`}
              className="h-3 w-3 rounded-full border border-linea-fuerte"
              style={{ backgroundColor: c }}
            />
          )
        )}
      </div>
    </div>
  );
}

function TarjetaTema({
  tema,
  modo,
  esActual,
  onAplicar,
}: {
  tema: Tema;
  modo: Modo;
  esActual: boolean;
  onAplicar: (tema: Tema, modo: Modo) => void;
}) {
  return (
    <div className="radio-tarjeta border border-linea-suave bg-tarjeta-baja p-3">
      <VistaPrevia tema={tema} modo={modo} />
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-tinta">{tema.nombre}</p>
          {esActual ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-acento/40 bg-acento/10 px-2 py-0.5 text-[9px] font-medium text-acento-claro">
              <Check className="h-2.5 w-2.5" aria-hidden />
              En uso
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-tinta-muda">
          {tema.descripcion}
        </p>
        <p className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-acento/70">
          {tema.inspiracion} · tipografía {ETIQUETA_FUENTE[tema[modo].fuente]}
        </p>
        {tema.nota ? (
          <p className="mt-1.5 text-[10px] italic text-tinta-muda">{tema.nota}</p>
        ) : null}
        <Button
          onClick={() => onAplicar(tema, modo)}
          variant={esActual ? "outline" : "default"}
          disabled={esActual}
          className="mt-3 h-9 w-full rounded-lg text-xs font-semibold"
        >
          {esActual ? "Este es tu tema" : `Aplicar ${tema.nombre}`}
        </Button>
      </div>
    </div>
  );
}

export default function TemasDialog() {
  const [abierto, setAbierto] = useState(false);
  // Elección guardada: al primer pintado (cocina y comedor por igual) se usa
  // el atuendo por defecto — así el HTML inicial siempre coincide y no hay
  // "hydration mismatch". Tras montar, un efecto lee la nevera del navegador
  // (localStorage) y se sincroniza con lo que el usuario había elegido.
  const [actual, setActual] = useState<{ id: string; modo: Modo }>({
    id: TEMA_DEFECTO,
    modo: "oscuro",
  });
  useEffect(() => {
    try {
      const id = localStorage.getItem(CLAVES_TEMA.tema) ?? TEMA_DEFECTO;
      const modo = (localStorage.getItem(CLAVES_TEMA.modo) as Modo | null) ?? "oscuro";
      setActual({ id, modo });
    } catch {
      // Nevera vacía o ilegible: se queda el atuendo por defecto.
    }
  }, []);
  const { toast } = useToast();

  const aplicar = (tema: Tema, modo: Modo) => {
    aplicarTema(tema.id, modo);
    setActual({ id: tema.id, modo });
    toast({
      title: "Tema aplicado",
      description: `${tema.nombre} · modo ${modo}. Puedes cambiarlo cuando quieras — nada más cambia.`,
    });
  };

  const cambiarModo = (modo: Modo) => {
    const tema = TEMAS.find((t) => t.id === actual.id) ?? TEMAS[0];
    aplicar(tema, modo);
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-1.5 rounded-lg border-linea-fuerte bg-tarjeta px-3.5 text-xs font-medium text-tinta-suave hover:border-acento/40 hover:bg-tarjeta-baja hover:text-acento-claro"
        >
          <Palette className="h-3.5 w-3.5" aria-hidden />
          Temas
        </Button>
      </DialogTrigger>

      <DialogContent
        style={SUPERFICIE_TARJETA}
        className="max-h-[88vh] overflow-y-auto radio-tarjeta border-linea-fuerte bg-tarjeta-baja text-tinta-suave sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-tinta">
            El atuendo del Centro de Mando
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-tinta-muda">
            Ocho formas de vestir la misma app. Nada de cómo funciona cambia —
            solo la pintura de las paredes. Elige un tema y se aplica al
            instante; tu elección se recuerda.
          </DialogDescription>

          {/* Modo: oscuro / claro */}
          <div
            role="tablist"
            aria-label="Modo de color"
            className="grid w-full max-w-52 grid-cols-2 rounded-full border border-linea-fuerte bg-panel p-1"
          >
            {(["oscuro", "claro"] as Modo[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={actual.modo === m}
                onClick={() => cambiarModo(m)}
                className="relative inline-flex h-8 items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-acento/50"
              >
                {actual.modo === m ? (
                  <motion.span
                    layoutId="indicador-modo"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    aria-hidden
                    className="absolute inset-0 rounded-full border border-acento/40 bg-acento/12"
                  />
                ) : null}
                <span
                  className={`relative z-10 inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    actual.modo === m ? "text-acento-claro" : "text-tinta-muda"
                  }`}
                >
                  {m === "oscuro" ? (
                    <Moon className="h-3 w-3" aria-hidden />
                  ) : (
                    <Sun className="h-3 w-3" aria-hidden />
                  )}
                  {m === "oscuro" ? "Oscuro" : "Claro"}
                </span>
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TEMAS.map((t) => (
            <TarjetaTema
              key={t.id}
              tema={t}
              modo={actual.modo}
              esActual={t.id === actual.id}
              onAplicar={aplicar}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
