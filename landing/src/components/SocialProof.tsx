import { Star, Users } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

const SocialProof = () => {
  return (
    <section className="py-16 bg-secondary/30">
      <div className="container px-4">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i}
                    className="w-10 h-10 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center"
                  >
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm font-medium">+50 usuários ativos</p>
              </div>
            </div>
            
            <div className="text-center md:text-left">
              <p className="text-2xl md:text-3xl font-bold text-foreground">
                +50 usuários já controlam suas finanças com{" "}
                <span className="text-primary">clareza total</span>
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default SocialProof;
