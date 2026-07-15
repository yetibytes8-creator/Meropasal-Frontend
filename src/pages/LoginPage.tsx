import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import cafeLogo from "@/assets/cafe-logo.png";
import yetibytesLogo from "@/assets/yetibytes-logo.png";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

const TEST_ACCOUNTS = [
  { label: "Yeti Bytes", email: "superadmin@yetibyts.com", password: "SuperAdmin@1234", color: "bg-indigo-500/10 text-indigo-700 border-indigo-200" },
  { label: "Client Admin", email: "admin@test.com", password: "Admin@1234", color: "bg-purple-500/10 text-purple-700 border-purple-200" },
  { label: "Restaurant", email: "restaurant@test.com", password: "Test@1234", color: "bg-orange-500/10 text-orange-700 border-orange-200" },
  { label: "Inventory", email: "inventory@test.com", password: "Test@1234", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { label: "Combo", email: "combo@test.com", password: "Test@1234", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
] as const;

function PasswordInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 pl-10 pr-10"
        maxLength={128}
        autoComplete="current-password"
        required
      />
      <button
        type="button"
        onClick={() => setShow((current) => !current)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const { staffSignIn } = useStaffAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [testOpen, setTestOpen] = useState(false);

  const locked = lockoutUntil !== null && Date.now() < lockoutUntil;

  const completeLogin = async (nextEmail: string, nextPassword: string) => {
    if (locked) {
      const minutes = Math.ceil((lockoutUntil! - Date.now()) / 60000);
      setError(`Too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`);
      return;
    }

    setLoading(true);
    setError("");

    const adminResult = await signIn(nextEmail, nextPassword);
    if (!adminResult.error) {
      setAttempts(0);
      setLockoutUntil(null);
      navigate("/", { replace: true });
      setLoading(false);
      return;
    }

    const staffResult = await staffSignIn(nextEmail, nextPassword);
    if (!staffResult.error) {
      setAttempts(0);
      setLockoutUntil(null);
      navigate("/", { replace: true });
      setLoading(false);
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= MAX_ATTEMPTS) {
      setLockoutUntil(Date.now() + LOCKOUT_MS);
      setError("Too many failed attempts. Login locked for 5 minutes.");
    } else {
      setError(`Invalid email or password. ${MAX_ATTEMPTS - nextAttempts} attempt${MAX_ATTEMPTS - nextAttempts !== 1 ? "s" : ""} left.`);
    }
    setLoading(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await completeLogin(email.trim().toLowerCase(), password);
  };

  const quickLogin = async (account: typeof TEST_ACCOUNTS[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    await completeLogin(account.email, account.password);
  };

  return (
    <div className="min-h-screen bg-background cafe-pattern p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-[28px] border bg-card shadow-2xl lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#fff5ef] via-white to-[#eefbf3] p-6 sm:p-8 lg:min-h-full lg:p-10">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-[#128c3a] to-[#111827]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.08)_0%,rgba(255,255,255,0)_42%,rgba(18,140,58,0.10)_100%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </button>

            <div className="mt-10 flex items-center gap-4">
              <img src={cafeLogo} alt="Mero Pasal" className="h-16 w-16 rounded-2xl object-contain shadow-sm" />
              <div>
                <p className="text-sm font-semibold text-primary">Mero Pasal</p>
                <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  One login opens the right workspace.
                </h2>
              </div>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm">
                <UtensilsCrossed className="mb-3 h-5 w-5 text-primary" />
                <p className="font-semibold text-foreground">Restaurant access</p>
                <p className="mt-1 text-xs leading-relaxed">Orders, tables, QR menu, kitchen and billing.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm">
                <Package className="mb-3 h-5 w-5 text-[#128c3a]" />
                <p className="font-semibold text-foreground">Inventory access</p>
                <p className="mt-1 text-xs leading-relaxed">POS, purchases, stock, suppliers and reports.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm">
                <Users className="mb-3 h-5 w-5 text-[#1f4b7a]" />
                <p className="font-semibold text-foreground">Role based staff</p>
                <p className="mt-1 text-xs leading-relaxed">Staff opens only the pages assigned by admin.</p>
              </div>
            </div>
          </div>

          <div className="relative mt-8 rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Powered by</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-16 w-24 items-center justify-center rounded-2xl bg-[#0b0b0b] px-2 shadow-inner">
                <img src={yetibytesLogo} alt="YetiBytes Tech Private Limited" className="max-h-12 w-auto object-contain" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">YetiBytes Tech Private Limited</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Designed and developed for modern Nepali businesses.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center bg-gradient-to-b from-white to-muted/30 p-5 sm:p-8">
          <div className="w-full max-w-md animate-fade-in">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-primary">Client Login</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Sign in to your business</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the ID and password provided during setup. We will open the modules allowed for this account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 shadow-lg">
              <div className="space-y-2">
                <Label htmlFor="email">Email / Login ID</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@company.com"
                    className="h-12 pl-10"
                    maxLength={254}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordInput id="password" value={password} onChange={setPassword} />
              </div>

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

              <Button type="submit" size="lg" className="mt-5 w-full gap-2" disabled={loading || locked}>
                <ShieldCheck className="h-4 w-4" />
                {loading ? "Signing in..." : locked ? "Locked - try later" : "Sign In"}
              </Button>

              <div className="mt-5 flex flex-col gap-2 border-t pt-4 text-center text-xs text-muted-foreground">
                <span>Trial ko lagi naya account banauna milcha.</span>
                <button type="button" onClick={() => navigate("/signup")} className="font-semibold text-primary hover:underline">
                  Start free trial
                </button>
              </div>
            </form>

            {import.meta.env.DEV && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setTestOpen((current) => !current)}
                  className="flex w-full items-center justify-center gap-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="h-px flex-1 bg-border" />
                  <span className="font-medium">Test Accounts {testOpen ? "▲" : "▼"}</span>
                  <span className="h-px flex-1 bg-border" />
                </button>

                {testOpen && (
                  <div className="mt-2 space-y-2 rounded-2xl border bg-card p-4 shadow-lg">
                    {TEST_ACCOUNTS.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => quickLogin(account)}
                        disabled={loading}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all disabled:opacity-50",
                          account.color
                        )}
                      >
                        <span className="flex-1">
                          <span className="block text-xs font-semibold leading-tight">{account.label}</span>
                          <span className="mt-0.5 block text-[11px] font-normal opacity-70">{account.email}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] opacity-60">{account.password}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
