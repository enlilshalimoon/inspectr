import type { Metadata } from "next";
import { Nav } from "@/components/marketing/Nav";
import { Pricing } from "@/components/marketing/Pricing";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Lookover pricing for home inspectors. 14-day free trial, no card needed.",
};

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main>
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
