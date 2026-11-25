import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TypeScript Practices",
  description: "TypeScript project practices and declaration-file guidelines, with examples, source links, a REST API, and an open source MCP server.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
