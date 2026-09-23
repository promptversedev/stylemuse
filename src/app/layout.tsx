import type { Metadata } from "next";
import "./globals.css";
import { IconSprite } from "@/components/IconSprite";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "StyleMuse — Swap Model & BG",
  description:
    "Pick a model and a background, favorite the ones you like, and show your current pick on other websites.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <IconSprite />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
