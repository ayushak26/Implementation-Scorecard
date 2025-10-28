import "./globals.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SDG Assessment Tool",
  description: "A tool to assess Sustainable Development Goals performance",
};

export default function ServerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}