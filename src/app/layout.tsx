import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Poker Nights",
  description: "Track buy-ins, cash-outs, and lifetime stats for the Monday night crew.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Poker Nights",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#04341c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let player = null;
  if (user) {
    const { data } = await supabase
      .from("players")
      .select("id, display_name, is_admin")
      .eq("auth_user_id", user.id)
      .single();
    player = data;
  }

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Nav player={player} />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-24">{children}</main>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
