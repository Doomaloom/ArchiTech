import "./globals.css";

export const metadata = {
  title: "ProtoBop",
  description: "ProtoBop workspace for AI-assisted site generation and iteration.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
