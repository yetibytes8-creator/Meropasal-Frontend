import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import cafeLogo from "@/assets/cafe-logo.png";

const MAX_RESET_ATTEMPTS = 5;
const RESET_LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      const mins = Math.ceil((lockoutUntil! - Date.now()) / 60000);
      setError(`Too many requests. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
      return;
    }
    setLoading(true);
    setError("");
    // Always show success to prevent email enumeration — never reveal whether
    // the email exists in the system.
    await resetPassword(email.trim().toLowerCase());
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_RESET_ATTEMPTS) {
      setLockoutUntil(Date.now() + RESET_LOCKOUT_MS);
    }
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cafe-pattern p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img src={cafeLogo} alt="Mero Pasal" width={64} height={64} className="mx-auto mb-4 drop-shadow-md" />
          <h1 className="text-2xl font-display font-bold tracking-tight">Reset Password</h1>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display">Forgot Password</CardTitle>
            <CardDescription>
              {sent ? "Check your email for a reset link" : "Enter your email to receive a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">We've sent a password reset link to <strong>{email}</strong>.</p>
                <Button variant="outline" onClick={() => navigate("/login")} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" maxLength={254} autoComplete="email" required />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" size="lg" disabled={loading || isLocked}>
                  {loading ? "Sending..." : isLocked ? "Too many requests — wait" : "Send Reset Link"}
                </Button>
                <button type="button" onClick={() => navigate("/login")} className="text-xs text-center text-primary hover:underline w-full block">
                  Back to Login
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
