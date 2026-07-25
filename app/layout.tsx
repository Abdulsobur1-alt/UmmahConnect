import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Ummah Connect - Where your deen and your career are never in conflict.",
  description:
    "The global professional network for Muslim professionals and creatives. Connect with people in your niche, find halal opportunities, and grow your career — guided by your values.",
  keywords: [
    "Muslim professional network",
    "halal careers",
    "Islamic networking",
    "Muslim community",
    "professional networking",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>
        <div className="app-shell">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
