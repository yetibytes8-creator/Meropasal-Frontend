import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { plans as plansApi, type ApiPlan } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Coffee, Package, Sparkles } from "lucide-react";
import cafeLogo from "@/assets/cafe-logo.png";

function planIcon(access: string) {
  if (access === "cafe") return <Coffee className="w-8 h-8" />;
  if (access === "inventory") return <Package className="w-8 h-8" />;
  return <Sparkles className="w-8 h-8" />;
}

const PricingPage = () => {
  const navigate = useNavigate();
  const [allPlans, setAllPlans] = useState<ApiPlan[]>([]);

  useEffect(() => {
    plansApi.list(true).then(setAllPlans).catch(() => {/* show empty */});
  }, []);

  const trialPlans  = allPlans.filter((p) => p.type === "trial");
  const paidPlans   = allPlans.filter((p) => p.type === "paid");
  const comboplan   = paidPlans.find((p) => p.module_access === "combo");
  const regularPlans = paidPlans.filter((p) => p.module_access !== "combo");

  return (
    <div className="min-h-screen bg-background cafe-pattern">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <img src={cafeLogo} alt="Mero Pasal" width={64} height={64} className="mx-auto mb-4 drop-shadow-md" />
          <h1 className="text-4xl font-display font-bold tracking-tight mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start with a free trial, upgrade anytime. No credit card required for trials.
          </p>
        </div>

        {/* Free trials */}
        {trialPlans.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-center mb-4 text-muted-foreground">Start Free</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              {trialPlans.map((plan) => (
                <Card key={plan.id} className="border-border/60 hover:border-primary/40 transition-all cursor-pointer" onClick={() => navigate("/signup")}>
                  <CardContent className="pt-6 text-center">
                    <div className="text-primary mb-3">{planIcon(plan.module_access)}</div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{plan.duration_days} days free • No card required</p>
                    <Button variant="outline" size="sm" className="mt-4 w-full">Start Free Trial</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Paid plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {regularPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onSelect={() => navigate("/signup")} />
          ))}
          {comboplan && <PlanCard plan={comboplan} highlight onSelect={() => navigate("/signup")} />}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-primary hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
};

function PlanCard({ plan, highlight = false, onSelect }: { plan: ApiPlan; highlight?: boolean; onSelect: () => void }) {
  return (
    <Card className={`hover:shadow-lg transition-all relative ${highlight ? "border-2 border-primary/50" : "border-border/60"}`}>
      {highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Best Value</Badge>}
      <CardHeader className="text-center">
        <div className="text-primary mb-2">{planIcon(plan.module_access)}</div>
        <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold text-foreground">Rs. {Number(plan.price).toLocaleString()}</span>
          <span className="text-muted-foreground">/month</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-6">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-success shrink-0" /><span>{f}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={onSelect}>Subscribe</Button>
      </CardContent>
    </Card>
  );
}

export default PricingPage;
