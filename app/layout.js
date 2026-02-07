import "./globals.css";
import { Sora } from "next/font/google";
import AppShell from "./components/app-shell";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "Gem Layout",
  description: "Base layout with sidebar rail and top bar.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={sora.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
