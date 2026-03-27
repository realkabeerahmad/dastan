import { Inter, Outfit } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { getSession } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mulk Property Management",
  description: "Modern Property Management system",
};

export default async function RootLayout({ children }) {
  const session = await getSession();
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        {session ? (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar session={session} />
            <div style={{ flex: 1, marginLeft: "260px" }}>
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
