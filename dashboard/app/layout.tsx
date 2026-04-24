import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { AppProviders } from "@/components/providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
