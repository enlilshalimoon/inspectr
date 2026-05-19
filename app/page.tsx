import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/marketing/Nav";
import { Hero } from "@/components/marketing/Hero";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { RoiCalculator } from "@/components/marketing/RoiCalculator";
import { ProductWalkthrough } from "@/components/marketing/ProductWalkthrough";
import { ControlSection } from "@/components/marketing/ControlSection";
import { ClientDeliverable } from "@/components/marketing/ClientDeliverable";
import { Pricing } from "@/components/marketing/Pricing";
import { Faq } from "@/components/marketing/Faq";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Footer } from "@/components/marketing/Footer";

export default async function HomePage() {
  // If already signed in, route by onboarding state.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: row } = await supabase
      .from("users")
      .select("onboarding_completed_at")
      .single();
    redirect(row?.onboarding_completed_at ? "/inspections" : "/onboarding");
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Nav />
      <main className="flex-1">
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <RoiCalculator />
        <ProductWalkthrough />
        <ControlSection />
        <ClientDeliverable />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
