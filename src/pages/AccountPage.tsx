import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { auth as apiAuth } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Crown, Clock, User, CreditCard } from "lucide-react";
import { toast } from "sonner";
import cafeLogo from "@/assets/cafe-logo.png";

const AccountPage = () => {
  const { user, profile, subscription, signOut, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—";

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await apiAuth.cancelSubscription();
      await refreshSubscription();
      toast.success("Subscription cancelled");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCancelling(false);
      setCancelOpen(false);
    }
  };

  const statusColors: Record<string, string> = {
    trial: "bg-info/10 text-info",
    active: "bg-success/10 text-success",
    expired: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
    payment_pending: "bg-warning/10 text-warning",
  };

  return (
    <div className="min-h-screen bg-background cafe-pattern p-4 animate-fade-in">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/modules")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src={cafeLogo} alt="" width={32} height={32} />
          <h1 className="text-2xl font-display font-bold">My Account</h1>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <User className="w-5 h-5" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Name</span>
                <span className="font-medium text-sm">{profile?.full_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Email</span>
                <span className="font-medium text-sm">{user?.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Role</span>
                <Badge variant="outline">{profile?.role || "user"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Crown className="w-5 h-5" /> Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Current Plan</span>
                <span className="font-medium text-sm">{subscription?.plan?.name || "None"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Status</span>
                {subscription && (
                  <Badge className={`${statusColors[subscription.status]} border-0`}>
                    {subscription.status === "trial" && <Clock className="w-3 h-3 mr-1" />}
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </Badge>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Module Access</span>
                <span className="font-medium text-sm capitalize">{subscription?.plan?.module_access || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Start Date</span>
                <span className="text-sm">{formatDate(subscription?.start_date || null)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  {subscription?.status === "trial" ? "Trial Ends" : "Next Billing"}
                </span>
                <span className="text-sm">{formatDate(subscription?.end_date || null)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Auto Renew</span>
                <span className="text-sm">{subscription?.auto_renew ? "Yes" : "No"}</span>
              </div>

              <div className="flex gap-3 pt-3">
                <Button size="sm" onClick={() => navigate("/pricing")} className="flex-1">
                  Upgrade Plan
                </Button>
                {subscription?.status === "active" && (
                  <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => setCancelOpen(true)}>
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <CreditCard className="w-5 h-5" /> Billing History
              </CardTitle>
              <CardDescription>Your payment and invoice history</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-6">
                No billing history yet. Your first invoice will appear after subscribing to a paid plan.
              </p>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end your access to {subscription?.plan?.module_access === "combo" ? "both modules" : "this module"} immediately. You can resubscribe anytime from the pricing page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription} disabled={cancelling} className="bg-destructive hover:bg-destructive/90">
              {cancelling ? "Cancelling…" : "Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountPage;
