import "./globals.css";

export const metadata = {
  title: "Callio — Just a voice away",
  description: "Private voice conversations with the people who matter."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
