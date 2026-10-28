import type { Metadata, Viewport } from "next";
import { Bree_Serif, Manrope, Poppins, Roboto } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

// GoogleFonts.manrope / GoogleFonts.breeSerif (lib/main.dart theme, app_typography.dart)
const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope", display: "swap" });
const poppins = Poppins({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins", display: "swap" });
// CanvasKit's fallback face: used by RichText (no DefaultTextStyle => platform default font)
const roboto = Roboto({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "700"], variable: "--font-roboto", display: "swap" });
const bree = Bree_Serif({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-bree", display: "swap" });

// Copied from web/index.html (title / description / OG); page content is unchanged by the migration
export const metadata: Metadata = {
  title: "Saborly – Comida Halal a Domicilio en Barcelona y Sabadell",
  description:
    "Pide comida halal online en Saborly. Pizzas, burgers, combos y más con entrega a domicilio o recogida en Barcelona (Poblenou) y Sabadell. ¡Rápido, fácil y delicioso!",
  icons: { icon: [{ url: "/favicon.png", sizes: "32x32" }, { url: "/icons/Icon-192.png", sizes: "192x192" }], apple: "/icons/Icon-192.png" },
  manifest: "/manifest.json",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5, themeColor: "#FF1744" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${manrope.variable} ${bree.variable} ${poppins.variable} ${roboto.variable}`}>
      <head>
        <link rel="preload" href="/fonts/MaterialIcons-Regular.otf" as="font" type="font/otf" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
