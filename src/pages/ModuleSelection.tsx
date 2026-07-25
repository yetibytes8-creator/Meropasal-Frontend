import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coffee, LogOut, Sparkles, Crown, Clock } from "lucide-react";
import { getBusinessProfileFromSystemConfig } from "@/lib/businessProfiles";

const ModuleSelection = () => {
  const { user, profile, subscription, signOut, setActiveModule, canAccessModule, isTrialExpired, systemConfig } = useAuth();
  const navigate = useNavigate();
  const businessProfile = getBusinessProfileFromSystemConfig(systemConfig, subscription?.plan?.module_access);
  const BusinessIcon = businessProfile.icon;

  const selectModule = (module: "restaurant" | "inventory") => {
    if (!canAccessModule(module)) {
      navigate("/access-denied");
      return;
    }
    setActiveModule(module);
    navigate(`/${module}`);
  };

  const statusBadge = () => {
    if (!subscription) return null;
    const colors: Record<string, string> = {
      trial: "bg-info/10 text-info",
      active: "bg-success/10 text-success",
      expired: "bg-destructive/10 text-destructive",
      cancelled: "bg-muted text-muted-foreground",
      payment_pending: "bg-warning/10 text-warning",
    };
    return (
      <Badge className={`${colors[subscription.status] || ""} border-0`}>
        {subscription.status === "trial" && <Clock className="w-3 h-3 mr-1" />}
        {subscription.status === "active" && <Crown className="w-3 h-3 mr-1" />}
        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
      </Badge>
    );
  };

  const daysLeft = subscription?.end_date
    ? Math.max(0, Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cafe-pattern px-3 py-4 sm:p-4 overflow-x-hidden">
      <div className="w-full max-w-3xl min-w-0 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="mb-1 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Mero Pasal</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <p className="text-muted-foreground text-sm truncate max-w-[220px] sm:max-w-none">Namaste, {profile?.full_name || user?.email}!</p>
              {statusBadge()}
            </div>
            {subscription?.status === "trial" && daysLeft !== null && (
              <p className="text-xs text-warning mt-1">
                {daysLeft > 0 ? `${daysLeft} days left in trial` : "Trial expired"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate("/account")}>
              Account
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {isTrialExpired() && (
          <div className="mb-6 p-4 rounded-lg bg-warning/10 border border-warning/30 text-center">
            <p className="text-sm font-medium text-warning">Your free trial has expired.</p>
            <Button size="sm" className="mt-2" onClick={() => navigate("/pricing")}>
              Upgrade Now
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg group border-border/60 ${
              !canAccessModule("restaurant") ? "opacity-60" : "hover:border-restaurant/50"
            } min-w-0`}
            onClick={() => selectModule("restaurant")}
          >
            <CardHeader className="text-center py-6 sm:py-10">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-restaurant/10 mx-auto mb-4 group-hover:bg-restaurant/20 transition-colors">
                <Coffee className="w-8 h-8 sm:w-10 sm:h-10 text-restaurant" />
              </div>
              <CardTitle className="text-xl font-display">Restaurant / Cafe</CardTitle>
              <CardDescription className="mt-2">
                Menu, order, table, kitchen display, billing, customer, and staff
              </CardDescription>
              {!canAccessModule("restaurant") && (
                <Badge variant="outline" className="mt-3 text-muted-foreground">
                  <Sparkles className="w-3 h-3 mr-1" /> Upgrade Required
                </Badge>
              )}
            </CardHeader>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg group border-border/60 ${
              !canAccessModule("inventory") ? "opacity-60" : "hover:border-inventory/50"
            } min-w-0`}
            onClick={() => selectModule("inventory")}
          >
            <CardHeader className="text-center py-6 sm:py-10">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-inventory/10 mx-auto mb-4 group-hover:bg-inventory/20 transition-colors">
                <BusinessIcon className="w-8 h-8 sm:w-10 sm:h-10 text-inventory" />
              </div>
              <CardTitle className="text-xl font-display">{businessProfile.inventoryLabel}</CardTitle>
              <CardDescription className="mt-2">
                {businessProfile.description}
              </CardDescription>
              {!canAccessModule("inventory") && (
                <Badge variant="outline" className="mt-3 text-muted-foreground">
                  <Sparkles className="w-3 h-3 mr-1" /> Upgrade Required
                </Badge>
              )}
            </CardHeader>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default ModuleSelection;
