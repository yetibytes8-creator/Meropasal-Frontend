import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth as apiAuth, getAccessToken, type ApiUser, type ApiSubscription } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types exposed to the rest of the app
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "superadmin" | "admin" | "user";
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: "trial" | "active" | "expired" | "cancelled" | "payment_pending";
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  payment_provider: string | null;
  plan?: {
    id: string;
    name: string;
    type: string;
    module_access: "cafe" | "inventory" | "combo";
    price: number;
    billing_cycle: string | null;
    duration_days: number | null;
    features: string[];
  };
}

// Minimal user object (id + email) used by components
export interface AuthUser {
  id: string;
  email: string;
}

export type FeatureKey =
  | "restaurant" | "inventory" | "finance" | "branches" | "billing" | "reports"
  | "staff" | "customers" | "qrMenu" | "delivery" | "bankRecon" | "taxes" | "refunds";

export interface CompanySystemConfig {
  features?: Partial<Record<FeatureKey, boolean>>;
  defaultModule?: "restaurant" | "inventory" | "finance";
  [key: string]: unknown;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  subscription: Subscription | null;
  loading: boolean;
  requestTrialOtp: (email: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, planId: string, otpCode?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  confirmPasswordReset: (uid: string, token: string, password: string) => Promise<{ error: string | null }>;
  activeModule: "restaurant" | "inventory" | null;
  setActiveModule: (m: "restaurant" | "inventory" | null) => void;
  systemConfig: CompanySystemConfig;
  canAccessModule: (module: "restaurant" | "inventory") => boolean;
  canAccessFeature: (feature: FeatureKey) => boolean;
  isTrialExpired: () => boolean;
  refreshSubscription: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toProfile(u: ApiUser): Profile {
  return {
    id: String(u.id),
    user_id: String(u.id),
    full_name: u.full_name || null,
    avatar_url: null,
    role: u.role,
  };
}

function toSubscription(s: ApiSubscription): Subscription {
  return {
    id: String(s.id),
    user_id: String(s.user_id),
    plan_id: s.plan ? String(s.plan.id) : "",
    status: s.status,
    start_date: s.start_date,
    end_date: s.end_date,
    auto_renew: s.auto_renew,
    payment_provider: s.payment_provider,
    plan: s.plan
      ? {
          id: String(s.plan.id),
          name: s.plan.name,
          type: s.plan.type,
          module_access: s.plan.module_access,
          price: s.plan.price,
          billing_cycle: s.plan.billing_cycle,
          duration_days: s.plan.duration_days,
          features: s.plan.features,
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_SNAPSHOT_KEY = "mero-pasal-auth-snapshot";

type AuthSnapshot = {
  user: AuthUser;
  profile: Profile;
  subscription: Subscription | null;
  systemConfig?: CompanySystemConfig;
};

function readAuthSnapshot(): AuthSnapshot | null {
  try {
    const raw = localStorage.getItem(AUTH_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as AuthSnapshot) : null;
  } catch {
    return null;
  }
}

function saveAuthSnapshot(snapshot: AuthSnapshot) {
  localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function clearAuthSnapshot() {
  localStorage.removeItem(AUTH_SNAPSHOT_KEY);
}

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("Request timed out")), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [systemConfig, setSystemConfig] = useState<CompanySystemConfig>({});
  const [loading, setLoading]         = useState(true);
  const [activeModule, setActiveModuleState] = useState<"restaurant" | "inventory" | null>(() => {
    const stored = localStorage.getItem("mero-pasal-active-module");
    return stored === "restaurant" || stored === "inventory" ? stored : null;
  });

  const setActiveModule = (module: "restaurant" | "inventory" | null) => {
    setActiveModuleState(module);
    if (module) localStorage.setItem("mero-pasal-active-module", module);
    else localStorage.removeItem("mero-pasal-active-module");
  };

  // Restore session from stored access token on mount
  useEffect(() => {
    const restoreSnapshot = () => {
      const snapshot = readAuthSnapshot();
      if (!snapshot) return false;
      setUser(snapshot.user);
      setProfile(snapshot.profile);
      setSubscription(snapshot.subscription);
      setSystemConfig(snapshot.systemConfig || {});
      return true;
    };

    if (!getAccessToken()) {
      restoreSnapshot();
      setLoading(false);
      return;
    }
    withTimeout(apiAuth.me())
      .then((me) => {
        const nextUser = { id: String(me.id), email: me.email };
        const nextProfile = toProfile(me);
        const nextSubscription = me.subscription ? toSubscription(me.subscription) : null;
        setUser(nextUser);
        setProfile(nextProfile);
        setSubscription(nextSubscription);
        setSystemConfig(me.system_config || {});
        saveAuthSnapshot({ user: nextUser, profile: nextProfile, subscription: nextSubscription, systemConfig: me.system_config || {} });
      })
      .then(undefined, () => {
        restoreSnapshot();
      })
      .catch(() => { /* token expired / invalid — stay logged out */ })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { user: u } = await apiAuth.login(email.trim().toLowerCase(), password);
      const nextUser = { id: String(u.id), email: u.email };
      const nextProfile = toProfile(u);
      let nextSubscription: Subscription | null = null;
      let nextSystemConfig: CompanySystemConfig = u.system_config || {};
      try {
        const me = await withTimeout(apiAuth.me());
        nextSubscription = me.subscription ? toSubscription(me.subscription) : null;
        nextSystemConfig = me.system_config || {};
      } catch {
        nextSubscription = null;
      }
      setUser(nextUser);
      setProfile(nextProfile);
      setSubscription(nextSubscription);
      setSystemConfig(nextSystemConfig);
      saveAuthSnapshot({ user: nextUser, profile: nextProfile, subscription: nextSubscription, systemConfig: nextSystemConfig });
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    planId: string,
    otpCode?: string
  ): Promise<{ error: string | null }> => {
    try {
      const { user: u } = await apiAuth.signup(
        email.trim().toLowerCase(),
        password,
        fullName.trim(),
        Number(planId),
        otpCode?.trim()
      );
      const nextUser = { id: String(u.id), email: u.email };
      const nextProfile = toProfile(u);
      let nextSubscription: Subscription | null = null;
      let nextSystemConfig: CompanySystemConfig = u.system_config || {};
      try {
        const me = await withTimeout(apiAuth.me());
        nextSubscription = me.subscription ? toSubscription(me.subscription) : null;
        nextSystemConfig = me.system_config || {};
      } catch {
        nextSubscription = null;
      }
      setUser(nextUser);
      setProfile(nextProfile);
      setSubscription(nextSubscription);
      setSystemConfig(nextSystemConfig);
      saveAuthSnapshot({ user: nextUser, profile: nextProfile, subscription: nextSubscription, systemConfig: nextSystemConfig });
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  const requestTrialOtp = async (email: string): Promise<{ error: string | null }> => {
    try {
      await apiAuth.requestTrialOtp(email.trim().toLowerCase());
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  const signOut = async () => {
    apiAuth.logout();
    setUser(null);
    setProfile(null);
    setSubscription(null);
    setSystemConfig({});
    setActiveModule(null);
    clearAuthSnapshot();
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    try {
      await apiAuth.resetPassword(email.trim().toLowerCase());
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  const confirmPasswordReset = async (uid: string, token: string, password: string): Promise<{ error: string | null }> => {
    try {
      await apiAuth.confirmPasswordReset(uid, token, password);
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  const refreshSubscription = async () => {
    if (!user) return;
    try {
      const me = await withTimeout(apiAuth.me());
      setSubscription(me.subscription ? toSubscription(me.subscription) : null);
      setSystemConfig(me.system_config || {});
    } catch { /* ignore */ }
  };

  const canAccessFeature = (feature: FeatureKey): boolean => {
    if (isTrialExpired()) return false;
    if (feature === "restaurant" || feature === "inventory") return canAccessModule(feature);
    const value = systemConfig.features?.[feature];
    if (value === false) return false;
    if (feature === "finance") return value !== false;
    return true;
  };

  const canAccessModule = (module: "restaurant" | "inventory"): boolean => {
    if (systemConfig.features?.[module] === false) return false;
    if (!subscription?.plan) return true;
    if (subscription.status === "expired" || subscription.status === "cancelled") return false;
    if (isTrialExpired()) return false;
    const access = subscription.plan.module_access;
    if (access === "combo") return true;
    if (module === "restaurant" && access === "cafe") return true;
    if (module === "inventory" && access === "inventory") return true;
    return false;
  };

  const isTrialExpired = (): boolean => {
    if (!subscription || subscription.status !== "trial") return false;
    if (!subscription.end_date) return false;
    return new Date(subscription.end_date) < new Date();
  };

  return (
    <AuthContext.Provider
      value={{
        user, profile, subscription, loading,
        requestTrialOtp, signUp, signIn, signOut, resetPassword, confirmPasswordReset,
        activeModule, setActiveModule,
        systemConfig,
        canAccessModule, canAccessFeature, isTrialExpired, refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
