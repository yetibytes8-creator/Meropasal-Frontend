import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const TrialExpiredPage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cafe-pattern p-4">
      <Card className="w-full max-w-md border-warning/50 shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="font-display text-xl">Trial Expired</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your free trial has expired. Please subscribe to continue using Mero Pasal.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate("/pricing")}>
            View Plans & Subscribe
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialExpiredPage;
