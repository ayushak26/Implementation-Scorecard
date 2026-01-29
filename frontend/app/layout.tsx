// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SDGProvider } from "./components/SDGContext";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "Implementation Scorecard",
  description: "BioRadar Implementation Scorecard - A tool to assess Sustainable Development Goals performance",
  icons: {
    icon: '/favicon.ico?v=2',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <SDGProvider>
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </SDGProvider>
      </body>
    </html>
  );
}