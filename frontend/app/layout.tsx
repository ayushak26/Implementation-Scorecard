// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SDGProvider } from "./components/SDGContext";

export const metadata: Metadata = {
  title: "SDG Assessment Tool",
  description: "A tool to assess Sustainable Development Goals performance",
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