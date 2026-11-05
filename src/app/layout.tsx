import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono, Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Tipografías de los temas alternativos (sans contundente / redondeada amable).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Centro de Mando · Interpretación",
  description:
    "Panel operativo para la gestión de servicios de interpretación de idiomas: eventos, estatus y finanzas en un solo lugar.",
  keywords: ["interpretación", "idiomas", "CRM", "panel operativo"],
};

export const viewport: Viewport = {
  themeColor: "#0A0A0C",
};

/**
 * Antes de que se pinte cualquier cosa, reaplica el tema guardado
 * (si el usuario ya eligió uno) para que no haya parpadeo.
 */
const SCRIPT_TEMA = `(function(){try{var m=localStorage.getItem("cm-modo");if(m!==null)document.documentElement.classList.toggle("dark",m!=="claro");var v=JSON.parse(localStorage.getItem("cm-vars")||"null");if(v)for(var k in v)document.documentElement.style.setProperty(k,v[k]);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      // Las variables de tipografía viven en <html> para que la cadena
      // --fuente-display → --font-playfair/--font-archivo/--font-nunito
      // resuelva correctamente en todo el árbol (incluidos los temas).
      className={`dark ${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${archivo.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-fondo antialiased">
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
