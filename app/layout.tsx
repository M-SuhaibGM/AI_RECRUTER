// @ts-ignore: CSS module declarations may be missing in this environment
import "./globals.css"
import { Toaster } from "sonner";
import ClientWrapper from "@/components/ui/ClientWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next"



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
    <html lang="en" suppressHydrationWarning >
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
