// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SDGProvider } from "./components/SDGContext";

export const metadata: Metadata = {
  title: "Implementation Scorecard",
  description: "BioRadar Implementation Scorecard - A tool to assess Sustainable Development Goals performance",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SDGProvider>{children}</SDGProvider>
      </body>
    </html>
  );
}