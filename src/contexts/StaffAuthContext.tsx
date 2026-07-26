import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { staff as staffApi } from "@/lib/api";
import { fromApiStaff } from "@/lib/transforms";
import type { Staff } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface StaffAuthContextType {
  allStaff: Staff[];
  addStaff: (member: Staff & { password?: string }) => Promise<void>;
  updateStaff: (member: Staff & { password?: string }) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  staffUser: Staff | null;
  staffSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  staffSignOut: () => void;
  updateStaffPassword: (id: string, currentPassword: string, newPassword: string) => Promise<void>;
  loading: boolean;
}

const StaffAuthContext = createContext<StaffAuthContextType | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [staffUser, setStaffUser] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    staffApi.list()
      .then((list) => setAllStaff(list.map(fromApiStaff)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const addStaff = async (member: Staff & { password?: string }) => {
    const created = await staffApi.create({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      department: member.department,
      join_date: member.joinDate,
      salary: member.salary,
      status: member.status,
      avatar: member.avatar ?? null,
      permissions: member.permissions ?? { mode: "role", allowedPages: [] },
      password: member.password,
    });
    setAllStaff((prev) => [...prev, fromApiStaff(created)]);
  };

  const updateStaff = async (member: Staff & { password?: string }) => {
    const updated = await staffApi.update(Number(member.id), {
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      department: member.department,
      join_date: member.joinDate,
      salary: member.salary,
      status: member.status,
      avatar: member.avatar ?? null,
      permissions: member.permissions ?? { mode: "role", allowedPages: [] },
      password: member.password || undefined,
    });
    const mapped = fromApiStaff(updated);
    setAllStaff((prev) => prev.map((s) => s.id === member.id ? mapped : s));
    if (staffUser?.id === member.id) setStaffUser(mapped);
  };

  const removeStaff = async (id: string) => {
    await staffApi.delete(Number(id));
    setAllStaff((prev) => prev.filter((s) => s.id !== id));
    if (staffUser?.id === id) setStaffUser(null);
  };

  const staffSignIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const member = await staffApi.login(email, password);
      setStaffUser(fromApiStaff(member));
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  const staffSignOut = () => setStaffUser(null);

  const updateStaffPassword = async (id: string, currentPassword: string, newPassword: string) => {
    await staffApi.changePassword(Number(id), currentPassword, newPassword);
  };

  return (
    <StaffAuthContext.Provider
      value={{ allStaff, addStaff, updateStaff, removeStaff, staffUser, staffSignIn, staffSignOut, updateStaffPassword, loading }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error("useStaffAuth must be used within StaffAuthProvider");
  return ctx;
}
