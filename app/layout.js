import "./globals.css";
import PWARegister from "../components/PWARegister";

export const metadata = {
  title: "Callio — Just a voice away",
  description: "Private voice conversations with the people who matter.",
  manifest: "/manifest.webmanifest",
  applicationName: "Callio",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Callio" },
  icons: { icon: "/callio-icon.svg", apple: "/callio-icon-192.png" }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b10"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><PWARegister />{children}</body>
    </html>
  );
}
