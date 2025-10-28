import "./globals.css";
import Providers from "./components/Providers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SDG Assessment Tool",
  description: "A tool to assess Sustainable Development Goals performance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}