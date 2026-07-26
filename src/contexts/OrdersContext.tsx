import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { orders as ordersApi, tables as tablesApi } from "@/lib/api";
import { fromApiOrder, fromApiTable } from "@/lib/transforms";
import type { Order, Table } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface OrdersContextType {
  allOrders: Order[];
  setAllOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  allTables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  closeTable: (tableId: string, paymentMethod: NonNullable<Order["paymentMethod"]>, splitPayment?: Order["splitPayment"]) => Promise<Order | null>;
  loading: boolean;
  reload: () => void;
}

const OrdersContext = createContext<OrdersContextType | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allTables, setTables] = useState<Table[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    Promise.all([ordersApi.list(), tablesApi.list()])
      .then(([apiOrders, apiTables]) => {
        setAllOrders(apiOrders.map(fromApiOrder));
        setTables(apiTables.map(fromApiTable));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const closeTable = async (tableId: string, paymentMethod: NonNullable<Order["paymentMethod"]>, splitPayment?: Order["splitPayment"]): Promise<Order | null> => {
    const table = allTables.find((t) => t.id === tableId);
    if (!table?.orderId) return null;
    const order = allOrders.find((item) => item.id === table.orderId);
    if (!order) return null;
    let paidOrder: Order = { ...order, status: "completed", paymentMethod, splitPayment };

    setAllOrders((prev) =>
      prev.map((o) => o.id === table.orderId ? paidOrder : o)
    );
    setTables((prev) =>
      prev.map((t) => t.id === tableId ? { ...t, status: "available" as const, orderId: undefined } : t)
    );

    const numericOrderId = Number(table.orderId);
    if (!Number.isFinite(numericOrderId)) return paidOrder;

    try {
      const updated = await ordersApi.update(numericOrderId, {
        status: "completed",
        payment_method: paymentMethod,
        split_cash: splitPayment?.cash ?? null,
        split_online: splitPayment?.online ?? null,
      });
      paidOrder = fromApiOrder(updated);
      setAllOrders((prev) => prev.map((o) => o.id === table.orderId ? paidOrder : o));
    } catch { /* keep UI unchanged on failure */ }

    return paidOrder;
  };

  return (
    <OrdersContext.Provider value={{ allOrders, setAllOrders, allTables, setTables, closeTable, loading, reload: load }}>
      {children}
    </OrdersContext.Provider>
  );
}

export const useOrders = () => {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
};
