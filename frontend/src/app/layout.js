import "./globals.css";

export const metadata = {
  title: "Smart Factory Operations Platform",
  description: "Maintenance management application"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
