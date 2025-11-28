import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import Benefits from "@/components/Benefits";
import Demo from "@/components/Demo";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Security from "@/components/Security";
import FAQ from "@/components/FAQ";
import Pricing from "@/components/Pricing";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="overflow-x-hidden">
      <Hero />
      <SocialProof />
      <Benefits />
      <Demo />
      <HowItWorks />
      <Features />
      <Security />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
};

export default Index;
