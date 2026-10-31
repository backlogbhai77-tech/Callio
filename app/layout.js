import "./globals.css";
import PWARegister from "../components/PWARegister";

export const metadata = {
  title: "Callio — Just a voice away",
  description: "Private voice conversations with the people who matter.",
  manifest: "/manifest.webmanifest",
  applicationName: "Callio",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Callio" },
  icons: { icon: "/callio-icon.svg", apple: "/callio-icon.svg" }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><PWARegister />{children}</body>
    </html>
  );
}
