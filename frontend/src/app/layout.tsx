import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVA Physics — AI Physics Teacher",
  description:
    "An infinite AI physics teacher powered by NOVA. Learn from beginner mechanics to advanced quantum field theory with dynamic lessons, animations, and real-time explanations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ background: "#060810" }}>
        {children}
      </body>
    </html>
  );
}
