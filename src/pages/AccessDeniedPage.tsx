import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldX, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { ROLE_META, type StaffRole } from "@/lib/rbac";

const AccessDeniedPage = () => {
  const navigate = useNavigate();
  const { staffUser } = useStaffAuth();

  if (staffUser) {
    const meta = ROLE_META[staffUser.role as StaffRole];
    const home = staffUser.department === "inventory" ? "/inventory" : "/restaurant";

    return (
      <div className="min-h-screen flex items-center justify-center bg-background cafe-pattern p-4">
        <Card className="w-full max-w-md shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="font-display text-xl">Page Restricted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Staff identity */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {staffUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{staffUser.name}</p>
                <Badge variant="outline" className={`text-[10px] mt-0.5 border capitalize ${meta?.color}`}>
                  {meta?.label ?? staffUser.role}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Your <strong className="text-foreground">{meta?.label}</strong> role does not have access to this page.
            </p>

            {/* What they can access */}
            {meta?.pages && (
              <div className="rounded-xl bg-success/5 border border-success/20 p-3">
                <p className="text-xs font-semibold text-success mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />Pages you can access
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{meta.pages}</p>
              </div>
            )}

            <Button className="w-full gap-2" onClick={() => navigate(home)}>
              <ArrowLeft className="w-4 h-4" />Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Owner/admin — subscription-level denial
  return (
    <div className="min-h-screen flex items-center justify-center bg-background cafe-pattern p-4">
      <Card className="w-full max-w-md border-destructive/50 shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="font-display text-xl">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            Your current plan does not include this module. Upgrade to the Combo plan for full access.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate("/pricing")}>
            Upgrade Plan
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/modules")} className="text-muted-foreground">
            Back to Modules
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDeniedPage;
