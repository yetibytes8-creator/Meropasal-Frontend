import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { plans as plansApi, type ApiPlan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, User, Coffee, Package, Sparkles, ShieldCheck } from "lucide-react";
import cafeLogo from "@/assets/cafe-logo.png";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8,           label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p),         label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p),         label: "One lowercase letter" },
  { test: (p: string) => /\d/.test(p),            label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

function passwordStrength(p: string) {
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}

function planIcon(access: string) {
  if (access === "cafe") return <Coffee className="w-5 h-5" />;
  if (access === "inventory") return <Package className="w-5 h-5" />;
  return <Sparkles className="w-5 h-5" />;
}

const SignupPage = () => {
  const { requestTrialOtp, signUp } = useAuth();
  const navigate = useNavigate();
  const [allPlans, setAllPlans] = useState<ApiPlan[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [pwError, setPwError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    plansApi.list(true).then(setAllPlans).catch(() => {/* show empty */});
  }, []);

  const trialPlans = allPlans.filter((p) => p.type === "trial");
  const paidPlans  = allPlans.filter((p) => p.type === "paid");
  const selectedPlan = allPlans.find((p) => p.id === selectedPlanId);
  const selectedTrialPlan = selectedPlan?.type === "trial";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) { setError("Please select a plan"); return; }
    setLoading(true);
    setError("");

    if (selectedTrialPlan && !otpSent) {
      const { error: err } = await requestTrialOtp(email);
      if (err) setError(err);
      else setOtpSent(true);
      setLoading(false);
      return;
    }

    if (selectedTrialPlan && otpCode.trim().length !== 6) {
      setError("Please enter the 6 digit code sent to your email");
      setLoading(false);
      return;
    }

    const { error: err } = await signUp(email, password, fullName, String(selectedPlanId), otpCode);
    if (err) setError(err);
    else navigate("/modules");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cafe-pattern p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-6">
          <img src={cafeLogo} alt="Mero Pasal" width={64} height={64} className="mx-auto mb-3 drop-shadow-md" />
          <h1 className="text-2xl font-display font-bold tracking-tight">Create Your Account</h1>
          <p className="text-muted-foreground text-sm mt-1">Start managing your business with Mero Pasal</p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display">{step === 1 ? "Your Details" : "Choose a Plan"}</CardTitle>
            <CardDescription>{step === 1 ? "Enter your information to get started" : "Select a plan that fits your needs"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="name" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" maxLength={100} autoComplete="name" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" maxLength={254} autoComplete="email" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => { setPassword(e.target.value); setPwError(""); }} className="pl-10" maxLength={128} autoComplete="new-password" required />
                    </div>
                    {password && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength(password) >= i ? i <= 2 ? "bg-destructive" : i <= 3 ? "bg-warning" : "bg-success" : "bg-muted"}`} />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                          {PASSWORD_RULES.map((r) => (
                            <p key={r.label} className={`text-[11px] flex items-center gap-1 ${r.test(password) ? "text-success" : "text-muted-foreground"}`}>
                              <span>{r.test(password) ? "✓" : "○"}</span>{r.label}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                  </div>

                  <Button type="button" className="w-full" size="lg" onClick={() => {
                    const failed = PASSWORD_RULES.find((r) => !r.test(password));
                    if (failed) { setPwError(failed.label + " is required"); return; }
                    setStep(2);
                  }} disabled={!fullName || !email || !password}>
                    Continue to Plan Selection
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Free Trials (7 days)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {trialPlans.map((plan) => (
                        <div key={plan.id} onClick={() => { setSelectedPlanId(plan.id); setOtpSent(false); setOtpCode(""); }} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPlanId === plan.id ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-primary">{planIcon(plan.module_access)}</span>
                            <span className="font-medium text-sm">{plan.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Free for {plan.duration_days} days</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Paid Plans</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {paidPlans.map((plan) => (
                        <div key={plan.id} onClick={() => { setSelectedPlanId(plan.id); setOtpSent(false); setOtpCode(""); }} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPlanId === plan.id ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-primary">{planIcon(plan.module_access)}</span>
                            <span className="font-medium text-sm">{plan.name}</span>
                          </div>
                          <p className="text-lg font-bold">Rs. {Number(plan.price).toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedTrialPlan && otpSent && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Email verification required</p>
                          <p className="text-xs text-muted-foreground">We sent a 6 digit code to {email}. Enter it below to activate your free trial.</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="otp">Verification Code</Label>
                        <Input
                          id="otp"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="6 digit code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        />
                      </div>
                      <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={async () => {
                        setLoading(true);
                        setError("");
                        const { error: err } = await requestTrialOtp(email);
                        if (err) setError(err);
                        setLoading(false);
                      }}>
                        Resend code
                      </Button>
                    </div>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                    <Button type="submit" className="flex-1" size="lg" disabled={loading || !selectedPlanId}>
                      {loading ? "Please wait..." : selectedTrialPlan && !otpSent ? "Send Email Code" : "Create Account"}
                    </Button>
                  </div>
                </>
              )}
            </form>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="text-primary hover:underline">Sign in</button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
