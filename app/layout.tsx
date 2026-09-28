// @ts-ignore: CSS module declarations may be missing in this environment
import "./globals.css"
import { Toaster } from "sonner";
import ClientWrapper from "@/components/ui/ClientWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next"

import { Inter, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata = {
  title: "AI Recruiter",
  description:
    "AI-driven interview manager that simplifies scheduling, evaluation, and candidate tracking.",
  icons: {
    icon: "/logo.png", // your logo in /public
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable} ${display.variable}`} >
      <body className="antialiased" suppressHydrationWarning >
        <ClientWrapper>
          {children}
          <SpeedInsights />
          <Toaster position="top-center" />
        </ClientWrapper>
      </body>
    </html>
  );
}
