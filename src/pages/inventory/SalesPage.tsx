import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { esc } from "@/lib/html-escape";
import { products as productsApi, saleReturns as saleReturnsApi, sales as salesApi, type ApiSale } from "@/lib/api";
import { fromApiProduct } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Printer, Download,
  Receipt, Package, Banknote, Percent, CreditCard, Smartphone,
  ScanBarcode, X, ChevronRight, User, Tag, History, SplitSquareHorizontal, RefreshCcw, ArrowLeftRight, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { balanceMoneyInput, formatMoneyInput, parseMoneyInput, sanitizeMoneyInput } from "@/lib/moneyInput";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { useSettings } from "@/contexts/SettingsContext";
import { postInventorySaleToAccounts } from "@/lib/accountingAutoPost";
import { productImage } from "@/lib/productImages";
import type { Product, BusinessSettings } from "@/types";

interface CartItem { product: Product; quantity: number; }

interface SaleRecord {
  id: string; billNumber: string;
  items: { name: string; sku: string; productId?: string; quantity: number; price: number; subtotal: number }[];
  subtotal: number; discountPercent: number; discountAmount: number;
  discountLabel?: string;
  taxPercent: number; taxAmount: number; grandTotal: number;
  paymentMethod: "cash" | "card" | "mobile" | "split";
  splitPayment?: { cash: number; online: number };
  date: string; customerName?: string; status: "completed" | "refunded";
}

type SaleReturnAction = "refund" | "exchange" | "damaged_return";

const saleRecordFromApi = (sale: ApiSale): SaleRecord => ({
  id: String(sale.id),
  billNumber: sale.bill_number || `MP-${sale.id}`,
  items: sale.items.map((item) => ({
    name: item.product_name,
    sku: item.product_id ? String(item.product_id) : "-",
    productId: item.product_id ? String(item.product_id) : undefined,
    quantity: item.quantity,
    price: Number(item.price),
    subtotal: item.quantity * Number(item.price),
  })),
  subtotal: Number(sale.total),
  discountPercent: 0,
  discountAmount: 0,
  taxPercent: 0,
  taxAmount: 0,
  grandTotal: Number(sale.total),
  paymentMethod: sale.payment_method,
  splitPayment:
    sale.split_cash != null && sale.split_online != null
      ? { cash: Number(sale.split_cash), online: Number(sale.split_online) }
      : undefined,
  date: sale.created_at || sale.date,
  customerName: sale.customer_name ?? undefined,
  status: sale.status,
});

const generateInvoiceHTML = (sale: SaleRecord, s: BusinessSettings) => {
  const logoHtml = s.logo
    ? `<img src="${esc(s.logo)}" style="max-width:100px;display:block;margin:0 auto 6px auto;" alt="logo"/>`
    : "";
  const showPaymentQr = s.paymentQr?.showOnBill && s.paymentQr?.image && (sale.paymentMethod === "mobile" || sale.paymentMethod === "split");
  const paymentQrHtml = showPaymentQr
    ? `<div class="qr"><img src="${esc(s.paymentQr.image!)}" alt="payment qr"/><p>Scan to pay${s.paymentQr.provider ? ` via ${esc(s.paymentQr.provider)}` : ""}</p>${s.paymentQr.accountName ? `<p>${esc(s.paymentQr.accountName)}</p>` : ""}${s.paymentQr.accountNumber ? `<p>${esc(s.paymentQr.accountNumber)}</p>` : ""}</div>`
    : "";
  return `<!DOCTYPE html><html><head><link rel="icon" type="image/png" href="/logo.png?v=mero-pasal-print" /><title>Bill #${esc(sale.billNumber)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;max-width:350px;margin:0 auto;padding:16px;color:#333;font-size:12px}.header{text-align:center;margin-bottom:12px}.shop-name{font-size:20px;font-weight:bold;letter-spacing:1px}.tagline{font-size:10px;color:#666;margin-top:2px}.line{border-top:1px dashed #999;margin:8px 0}.info{display:flex;justify-content:space-between;font-size:11px;margin:2px 0}table{width:100%;border-collapse:collapse;margin:6px 0}th{text-align:left;font-size:11px;padding:4px 2px;border-bottom:1px solid #999}th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:right}td{padding:3px 2px;font-size:11px}td:nth-child(2),td:nth-child(3),td:nth-child(4){text-align:right}.summary-row{display:flex;justify-content:space-between;padding:2px 0;font-size:12px}.total-row{font-size:16px;font-weight:bold;border-top:2px solid #333;padding-top:6px;margin-top:4px}.qr{text-align:center;border:1px dashed #999;padding:8px;margin:10px auto;max-width:170px}.qr img{width:135px;height:135px;object-fit:contain}.qr p{font-size:10px;margin-top:2px}.footer{text-align:center;margin-top:12px;font-size:10px;color:#666}</style></head><body>
<div class="header">${logoHtml}<div class="shop-name">${esc(s.businessName.toUpperCase())}</div><div class="tagline">${esc(s.address)}</div>${s.taxNumber ? `<div class="tagline">PAN/VAT: ${esc(s.taxNumber)}</div>` : ""}</div>
<div class="line"></div>
<div class="info"><span>Bill #: ${esc(sale.billNumber)}</span><span>${new Date(sale.date).toLocaleDateString()}</span></div>
<div class="info"><span>Time: ${new Date(sale.date).toLocaleTimeString()}</span><span>Payment: ${esc(sale.paymentMethod)}</span></div>
${sale.customerName ? `<div class="info"><span>Customer: ${esc(sale.customerName)}</span></div>` : ""}
<div class="line"></div>
<table><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
${sale.items.map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.quantity)}</td><td>Rs.  ${i.price.toFixed(2)}</td><td>Rs.  ${i.subtotal.toFixed(2)}</td></tr>`).join("")}
</table>
<div class="line"></div>
<div class="summary-row"><span>Subtotal:</span><span>Rs.  ${sale.subtotal.toFixed(2)}</span></div>
${sale.discountAmount > 0 ? `<div class="summary-row"><span>Discount${sale.discountLabel ? ` (${esc(sale.discountLabel)})` : ""}:</span><span>-Rs.  ${sale.discountAmount.toFixed(2)}</span></div>` : ""}
${sale.taxAmount > 0 ? `<div class="summary-row"><span>VAT/Tax (${esc(sale.taxPercent)}%):</span><span>+Rs.  ${sale.taxAmount.toFixed(2)}</span></div>` : ""}
<div class="summary-row total-row"><span>GRAND TOTAL:</span><span>Rs.  ${sale.grandTotal.toFixed(2)}</span></div>
<div class="line"></div>
${sale.splitPayment ? `<div class="summary-row"><span>Cash:</span><span>Rs. ${sale.splitPayment.cash.toFixed(2)}</span></div><div class="summary-row"><span>Online/QR:</span><span>Rs. ${sale.splitPayment.online.toFixed(2)}</span></div>` : ""}
${paymentQrHtml}
<div class="footer"><p>${esc(s.receiptFooter || `Thank you for shopping at ${s.businessName}!`)}</p><p>Visit again</p></div>
</body></html>`;
};

const QUICK_DISCOUNTS = [0, 5, 10, 15, 20];
const DISCOUNT_MODES = [
  { id: "percent" as const, label: "%" },
  { id: "amount" as const, label: "Rs." },
];

const PAYMENT_METHODS = [
  { id: "cash" as const, label: "Cash", icon: Banknote, active: "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500", inactive: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
  { id: "card" as const, label: "Card", icon: CreditCard, active: "bg-blue-500 hover:bg-blue-600 text-white border-blue-500", inactive: "border-blue-200 text-blue-700 hover:bg-blue-50" },
  { id: "mobile" as const, label: "eSewa / QR", icon: Smartphone, active: "bg-purple-500 hover:bg-purple-600 text-white border-purple-500", inactive: "border-purple-200 text-purple-700 hover:bg-purple-50" },
  { id: "split" as const, label: "Split", icon: SplitSquareHorizontal, active: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500", inactive: "border-amber-200 text-amber-700 hover:bg-amber-50" },
];

const SalesPage = () => {
  const { settings } = useSettings();
  const [products, setProducts] = useList(() =>
    productsApi.list().then((r) => r.map(fromApiProduct))
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");
  const [discountInput, setDiscountInput] = useState("");
  const taxPercent = settings.taxRate;
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile" | "split">("cash");
  const [splitCash, setSplitCash] = useState("");
  const [splitOnline, setSplitOnline] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [checkoutPreviewOpen, setCheckoutPreviewOpen] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<SaleRecord | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [mobileView, setMobileView] = useState<"products" | "cart">("products");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnSale, setReturnSale] = useState<SaleRecord | null>(null);
  const [returnForm, setReturnForm] = useState({
    itemIndex: "0",
    quantity: "1",
    action: "refund" as SaleReturnAction,
    refundAmount: "0.00",
    reason: "",
    restockReturned: true,
    exchangeProductId: "",
    exchangeQuantity: "1",
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const addToCartRef = useRef<(p: Product) => void>(() => {});

  useEffect(() => {
    salesApi.list()
      .then((list) => setSalesHistory(list.map(saleRecordFromApi)))
      .catch(() => {});
  }, []);

  // Barcode scanner
  const handleBarcodeScan = useCallback((barcode: string) => {
    const match = products.find(p => p.sku.toLowerCase() === barcode.toLowerCase());
    if (match) {
      addToCartRef.current(match);
      setLastScannedCode(barcode);
      setTimeout(() => setLastScannedCode(""), 2000);
    } else {
      toast.error(`No product found for barcode: ${barcode}`);
      setSearch(barcode);
    }
  }, [products]);
  useBarcodeScanner(handleBarcodeScan);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()],
    [products],
  );

  useEffect(() => {
    if (activeCategory !== "All" && !categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "All") list = list.filter(p => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return list;
  }, [products, search, activeCategory]);

  // Cart calculations
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discountValue = parseMoneyInput(discountInput);
  const normalizedDiscountValue =
    discountMode === "percent"
      ? Math.min(100, Math.max(0, discountValue))
      : Math.min(subtotal, Math.max(0, discountValue));
  const discountAmount =
    discountMode === "percent"
      ? (subtotal * normalizedDiscountValue) / 100
      : normalizedDiscountValue;
  const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const discountLabel =
    discountAmount <= 0
      ? ""
      : discountMode === "percent"
        ? `${Number(normalizedDiscountValue.toFixed(2))}%`
        : `Rs. ${discountAmount.toFixed(2)}`;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = taxEnabled ? (afterDiscount * taxPercent) / 100 : 0;
  const grandTotal = afterDiscount + taxAmount;

  const addToCart = (product: Product) => {
    const existing = cart.find(c => c.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) { toast.error(`Only ${product.stock} in stock!`); return; }
      setCart(cart.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (product.stock <= 0) { toast.error(`${product.name} is out of stock!`); return; }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };
  addToCartRef.current = addToCart;

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty > item.product.stock) { toast.error(`Only ${item.product.stock} in stock!`); return item; }
        return { ...item, quantity: newQty };
      }).filter(item => item.quantity > 0)
    );
  };

  const setExactQuantity = (productId: string, raw: string) => {
    const qty = parseInt(raw, 10);
    setCart(prev =>
      prev.map(item => {
        if (item.product.id !== productId) return item;
        if (Number.isNaN(qty) || qty < 1) return item;
        if (qty > item.product.stock) { toast.error(`Only ${item.product.stock} in stock!`); return { ...item, quantity: item.product.stock }; }
        return { ...item, quantity: qty };
      })
    );
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(c => c.product.id !== productId));
  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setDiscountMode("percent");
    setDiscountInput("");
    setPaymentMethod("cash");
    setSplitCash("");
    setSplitOnline("");
  };

  const selectSplitPayment = () => {
    setPaymentMethod("split");
    setSplitCash(formatMoneyInput(grandTotal / 2));
    setSplitOnline(formatMoneyInput(grandTotal / 2));
  };

  const handleDiscountModeChange = (mode: "percent" | "amount") => {
    setDiscountMode(mode);
    if (!discountAmount) {
      setDiscountInput("");
      return;
    }
    if (mode === "percent") {
      setDiscountInput(String(Number(discountPercent.toFixed(2))));
    } else {
      setDiscountInput(formatMoneyInput(discountAmount));
    }
  };

  const handleDiscountBlur = () => {
    if (!discountInput) return;
    if (discountMode === "percent") {
      setDiscountInput(String(Number(normalizedDiscountValue.toFixed(2))));
      return;
    }
    setDiscountInput(normalizedDiscountValue ? formatMoneyInput(normalizedDiscountValue) : "");
  };

  useEffect(() => {
    if (paymentMethod === "split" && cart.length > 0) {
      setSplitOnline(balanceMoneyInput(grandTotal, splitCash));
    }
  }, [cart.length, grandTotal, paymentMethod, splitCash]);

  const openCheckoutPreview = () => {
    if (cart.length === 0) { toast.error("Cart is empty!"); return; }
    if (paymentMethod === "split") {
      const c = parseMoneyInput(splitCash);
      const o = parseMoneyInput(splitOnline);
      if (Math.abs(c + o - grandTotal) > 0.01) {
        toast.error(`Cash + Online must equal Rs. ${grandTotal.toFixed(2)}`);
        return;
      }
    }
    setCheckoutPreviewOpen(true);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error("Cart is empty!"); return; }

    let splitPayment: SaleRecord["splitPayment"];
    if (paymentMethod === "split") {
      const c = parseMoneyInput(splitCash);
      const o = parseMoneyInput(splitOnline);
      if (Math.abs(c + o - grandTotal) > 0.01) {
        toast.error(`Cash + Online must equal Rs. ${grandTotal.toFixed(2)}`);
        return;
      }
      splitPayment = { cash: c, online: o };
    }

    let created: ApiSale;
    try {
      created = await salesApi.create({
        total: grandTotal,
        date: new Date().toISOString().split("T")[0],
        payment_method: paymentMethod,
        split_cash: splitPayment?.cash ?? null,
        split_online: splitPayment?.online ?? null,
        customer_name: customerName.trim() || null,
        items: cart.map(c => ({
          product_id: Number(c.product.id),
          product_name: c.product.name,
          quantity: c.quantity,
          price: c.product.price,
        })),
      });
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }

    const sale: SaleRecord = {
      id: String(created.id), billNumber: created.bill_number || `MP-${created.id}`,
      items: cart.map(c => ({ name: c.product.name, sku: c.product.sku, productId: c.product.id, quantity: c.quantity, price: c.product.price, subtotal: c.product.price * c.quantity })),
      subtotal, discountPercent, discountAmount, discountLabel, taxPercent: taxEnabled ? taxPercent : 0,
      taxAmount, grandTotal, paymentMethod, splitPayment, date: created.created_at || new Date().toISOString(),
      customerName: customerName.trim() || undefined, status: created.status,
    };
    productsApi.list().then((list) => setProducts(list.map(fromApiProduct))).catch(() => {});
    setSalesHistory(prev => [sale, ...prev]);
    setCurrentInvoice(sale);
    setInvoiceDialog(true);
    setCheckoutPreviewOpen(false);
    postInventorySaleToAccounts(sale).catch(() => toast.warning("Sale saved, finance auto-entry pending"));
    clearCart();
    setMobileView("products");
    toast.success(`Bill complete भयो: ${sale.billNumber}`);
  };

  const handlePrint = (sale: SaleRecord) => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(generateInvoiceHTML(sale, settings));
    w.document.close();
    w.setTimeout(() => w.print(), 300);
  };

  const handleDownload = (sale: SaleRecord) => {
    const blob = new Blob([generateInvoiceHTML(sale, settings)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bill-${sale.billNumber}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefund = async (sale: SaleRecord) => {
    if (sale.status === "refunded") return;
    try {
      const refunded = await salesApi.refund(Number(sale.id));
      setSalesHistory((prev) =>
        prev.map((item) =>
          item.id === sale.id ? { ...item, status: refunded.status } : item
        )
      );
      productsApi.list().then((list) => setProducts(list.map(fromApiProduct))).catch(() => {});
      toast.success(`${sale.billNumber} refunded, stock returned, and finance posted`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const selectedReturnItem = returnSale?.items[Number(returnForm.itemIndex)] || null;

  const openReturnDialog = (sale: SaleRecord) => {
    const firstReturnableIndex = sale.items.findIndex((item) => item.productId);
    const index = firstReturnableIndex >= 0 ? firstReturnableIndex : 0;
    const item = sale.items[index];
    setReturnSale(sale);
    setReturnForm({
      itemIndex: String(index),
      quantity: "1",
      action: "refund",
      refundAmount: formatMoneyInput(item?.price || 0),
      reason: "",
      restockReturned: true,
      exchangeProductId: "",
      exchangeQuantity: "1",
    });
    setReturnDialogOpen(true);
  };

  const updateReturnQuantity = (raw: string) => {
    const clean = raw.replace(/[^0-9]/g, "");
    const qty = Math.max(1, Number(clean || "1"));
    setReturnForm((prev) => ({
      ...prev,
      quantity: clean,
      refundAmount: selectedReturnItem ? formatMoneyInput(selectedReturnItem.price * qty) : prev.refundAmount,
    }));
  };

  const handleReturnExchange = async () => {
    if (!returnSale || !selectedReturnItem) return;
    if (!selectedReturnItem.productId) {
      toast.error("Yo bill item ko product link vetiyena.");
      return;
    }

    const quantity = Number(returnForm.quantity || "0");
    const exchangeQuantity = Number(returnForm.exchangeQuantity || "0");
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > selectedReturnItem.quantity) {
      toast.error(`Return quantity 1 dekhi ${selectedReturnItem.quantity} samma hunu parcha.`);
      return;
    }
    if (returnForm.action === "exchange") {
      if (!returnForm.exchangeProductId) {
        toast.error("Exchange product choose garnus.");
        return;
      }
      if (returnForm.exchangeProductId === selectedReturnItem.productId) {
        toast.error("Same product exchange garna mildaina.");
        return;
      }
      if (!Number.isInteger(exchangeQuantity) || exchangeQuantity <= 0) {
        toast.error("Exchange quantity valid hunu parcha.");
        return;
      }
    }

    try {
      await saleReturnsApi.create({
        sale_id: Number(returnSale.id),
        product_id: Number(selectedReturnItem.productId),
        return_type: returnForm.action,
        quantity,
        refund_amount: parseMoneyInput(returnForm.refundAmount),
        restock_returned: returnForm.action === "damaged_return" ? false : returnForm.restockReturned,
        exchange_product_id: returnForm.action === "exchange" ? Number(returnForm.exchangeProductId) : null,
        exchange_quantity: returnForm.action === "exchange" ? exchangeQuantity : 0,
        reason: returnForm.reason.trim() || "Customer return",
      });
      productsApi.list().then((list) => setProducts(list.map(fromApiProduct))).catch(() => {});
      setReturnDialogOpen(false);
      toast.success("Return / exchange saved, stock and finance updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // -- Product Panel --------------------------------------------------------
  const ProductPanel = () => (
    <div className="flex h-full flex-col gap-3">
      {/* Search */}
      <div className="relative rounded-[1.4rem] border border-emerald-100 bg-card p-2 shadow-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-700" />
        <Input
          ref={searchRef}
          data-barcode-target="true"
          placeholder="Search by name or scan barcode..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-12 border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <ScrollArea className="w-full" type="scroll">
        <div className="flex gap-2 pb-1 w-max">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "min-h-10 rounded-2xl border px-4 py-2 text-xs font-black whitespace-nowrap transition-all",
                activeCategory === cat
                  ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                  : "border-emerald-100 bg-card text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Package className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredProducts.map(product => {
              const cartItem = cart.find(c => c.product.id === product.id);
              const inCart = !!cartItem;
              const outOfStock = product.stock <= 0;
              const lowStock = product.stock > 0 && product.stock <= product.minStock;
              const resolvedImage = productImage(product.name, product.category, product.image);

              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && addToCart(product)}
                  disabled={outOfStock}
                  className={cn(
                    "group relative flex min-h-[210px] flex-col overflow-hidden rounded-[1.35rem] border text-left transition-all",
                    outOfStock
                      ? "opacity-60 cursor-not-allowed border-border bg-muted/30"
                      : inCart
                        ? "border-emerald-600 bg-emerald-50 shadow-md ring-1 ring-emerald-200"
                        : "border-emerald-100 bg-card hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
                  )}
                >
                  {/* Cart quantity badge */}
                  {inCart && (
                    <span className="absolute right-2 top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white shadow">
                      {cartItem.quantity}
                    </span>
                  )}

                  {/* Out-of-stock overlay */}
                  {outOfStock && (
                    <span className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 text-[10px] font-bold text-destructive uppercase tracking-wide">
                      Out of Stock
                    </span>
                  )}

                  {/* Image */}
                  <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-emerald-50 to-slate-100 sm:h-32">
                    <img
                      src={resolvedImage}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.src = productImage(product.name, product.category, null);
                      }}
                    />
                    <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-emerald-800 shadow-sm">
                      {product.category}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col p-3">
                    <span className="line-clamp-2 min-h-10 text-sm font-black leading-tight text-foreground">{product.name}</span>
                    <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">{product.sku}</p>
                    <div className="mt-auto flex items-end justify-between gap-1 pt-3">
                      <span>
                        <span className="block text-[10px] font-bold uppercase text-muted-foreground">Price</span>
                        <span className="text-base font-black text-emerald-700">Rs. {product.price.toFixed(2)}</span>
                      </span>
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-black",
                        outOfStock ? "bg-destructive/10 text-destructive" :
                        lowStock ? "bg-warning/10 text-warning" :
                        "bg-emerald-50 text-emerald-700"
                      )}>
                        {product.stock} left
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // -- Cart Panel -----------------------------------------------------------
  const CartPanel = () => (
    <Card className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-emerald-100 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-6.5rem)]">
      {/* Cart header */}
      <CardHeader className="shrink-0 border-b bg-gradient-to-r from-emerald-50 to-background px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <span className="rounded-xl bg-emerald-700 p-2 text-white"><ShoppingCart className="h-4 w-4" /></span>
            Order
            {cartCount > 0 && (
              <Badge className="bg-red-600 text-white text-xs px-1.5">{cartCount}</Badge>
            )}
          </CardTitle>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
              <Trash2 className="w-3 h-3" />Clear
            </button>
          )}
        </div>
      </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-3">
        {/* Cart items */}
        <div
          className={cn(
            "space-y-2 overflow-y-auto pr-1",
            cart.length === 0
              ? "flex min-h-44 items-center justify-center"
              : "max-h-[38vh] min-h-0 lg:max-h-[34vh] xl:max-h-[36vh]",
          )}
        >
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <p className="text-base font-black text-foreground">Cart is empty</p>
              <p className="text-xs mt-0.5">Product card click garepachi yaha item auncha</p>
            </div>
          ) : cart.map(item => (
            <div key={item.product.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl border border-emerald-100 bg-card p-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-bold leading-tight">{item.product.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rs. {item.product.price.toFixed(2)}
                  <span className="ml-1.5 font-bold text-emerald-700">= Rs. {(item.product.price * item.quantity).toFixed(2)}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5">
                <button onClick={() => updateQuantity(item.product.id, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => setExactQuantity(item.product.id, e.target.value)}
                  className="w-9 rounded border-0 bg-transparent text-center text-sm font-black tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
                <button onClick={() => updateQuantity(item.product.id, 1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button onClick={() => removeFromCart(item.product.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <>
            {/* Customer */}
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 shadow-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="h-7 border-0 p-0 text-sm focus-visible:ring-0 bg-transparent"
              />
            </div>

            {/* Discount */}
            <div className="space-y-3 rounded-2xl border bg-background p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Discount</span>
                </div>
                {discountAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountMode("percent");
                      setDiscountInput("");
                    }}
                    className="text-xs font-semibold text-destructive hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-[auto,1fr] gap-2">
                <div className="flex rounded-xl border bg-muted p-1">
                  {DISCOUNT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleDiscountModeChange(mode.id)}
                      className={cn(
                        "h-9 min-w-12 rounded-md px-3 text-xs font-bold transition-colors",
                        discountMode === mode.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    autoComplete="off"
                    placeholder={discountMode === "percent" ? "Percent discount" : "Amount discount"}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(sanitizeMoneyInput(e.target.value))}
                    onBlur={handleDiscountBlur}
                    className="h-11 rounded-xl pr-12 text-base font-semibold"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    {discountMode === "percent" ? "%" : "Rs."}
                  </span>
                </div>
              </div>

              <div className="flex gap-1.5">
                {QUICK_DISCOUNTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDiscountMode("percent");
                      setDiscountInput(d === 0 ? "" : String(d));
                    }}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                      discountMode === "percent" && normalizedDiscountValue === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {d === 0 ? "No discount" : `${d}%`}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {discountAmount > 0 ? `Applied ${discountLabel}` : "No discount applied"}
                </span>
                <span className="font-bold text-emerald-600">-Rs. {discountAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Tax toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">VAT {taxPercent}%</span>
              </div>
              <button
                onClick={() => setTaxEnabled(v => !v)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  taxEnabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform ring-0 transition-transform",
                  taxEnabled ? "translate-x-4" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Price breakdown */}
            <div className="rounded-2xl bg-emerald-50/70 p-3 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">Rs.  {subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Discount ({discountLabel})</span>
                  <span className="font-medium">-Rs.  {discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxEnabled && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>VAT ({taxPercent}%)</span>
                  <span className="font-medium text-foreground">+Rs.  {taxAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1" />
                    <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Total</span>
                <span className="text-2xl font-black text-emerald-700">Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => m.id === "split" ? selectSplitPayment() : setPaymentMethod(m.id)}
                  className={cn(
                    "flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 py-3 text-xs font-bold transition-all",
                    paymentMethod === m.id ? m.active : `bg-card ${m.inactive}`
                  )}
                >
                  <m.icon className="w-5 h-5" />
                  <span className="leading-none text-[11px]">{m.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === "split" && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border bg-amber-50 border-amber-200 p-3">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-amber-700">Cash (Rs.)</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    autoComplete="off"
                    autoFocus
                    value={splitCash}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const value = sanitizeMoneyInput(e.target.value);
                      setSplitCash(value);
                      setSplitOnline(balanceMoneyInput(grandTotal, value));
                    }}
                    onBlur={(e) => {
                      const value = formatMoneyInput(parseMoneyInput(e.target.value));
                      setSplitCash(value);
                      setSplitOnline(balanceMoneyInput(grandTotal, value));
                    }}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-amber-700">Online/QR (Rs.)</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    autoComplete="off"
                    value={splitOnline}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const value = sanitizeMoneyInput(e.target.value);
                      setSplitOnline(value);
                      setSplitCash(balanceMoneyInput(grandTotal, value));
                    }}
                    onBlur={(e) => {
                      const value = formatMoneyInput(parseMoneyInput(e.target.value));
                      setSplitOnline(value);
                      setSplitCash(balanceMoneyInput(grandTotal, value));
                    }}
                    className="h-9 bg-white"
                  />
                </div>
                <p className="col-span-2 text-[11px] text-amber-700/80">Cash + Online must equal Rs. {grandTotal.toFixed(2)}</p>
              </div>
            )}

            {/* Checkout */}
            <Button
              className="h-14 w-full rounded-2xl bg-red-600 text-base font-black gap-2 shadow-lg hover:bg-red-700"
              onClick={openCheckoutPreview}
            >
              <Receipt className="w-5 h-5" />
              Preview Bill - Rs.  {grandTotal.toFixed(2)}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  const todaySales = salesHistory.filter(s => s.status !== "refunded" && new Date(s.date).toDateString() === new Date().toDateString());

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-20 md:pb-0 md:h-[calc(100vh-5rem)]">

      {/* -- Header -- */}
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <h1 className="page-header">Point of Sale</h1>
          <p className="page-description hidden sm:block">Fast billing - scanner ready</p>
        </div>
        <div className="flex items-center gap-2">
          {lastScannedCode && (
            <Badge className="bg-success/15 text-success border-success/30 gap-1.5 text-xs animate-fade-in">
              <ScanBarcode className="w-3 h-3" />Scanned
            </Badge>
          )}
          <Badge variant="outline" className="gap-1.5 text-xs hidden sm:flex">
            <ScanBarcode className="w-3 h-3 text-muted-foreground" />Scanner Ready
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
            {todaySales.length > 0 && (
              <Badge className="ml-1 h-4 px-1 text-[10px]">{todaySales.length}</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* -- Mobile: tab switch -- */}
      <div className="lg:hidden flex h-12 shrink-0 gap-1 rounded-2xl border bg-card p-1 shadow-sm">
        <button
          onClick={() => setMobileView("products")}
          className={cn(
            "flex-1 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2",
            mobileView === "products" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          )}
        >
          <Package className="w-4 h-4" />Products
        </button>
        <button
          onClick={() => setMobileView("cart")}
          className={cn(
            "relative flex-1 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2",
            mobileView === "cart" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute right-6 top-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* -- Main layout -- */}
      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:gap-4">

        {/* Products - shown on mobile only when products tab is active */}
        <div className={cn("lg:flex lg:flex-col", mobileView === "products" ? "flex h-full flex-col" : "hidden")}>
          {ProductPanel()}
        </div>

        {/* Cart - shown on mobile only when cart tab is active */}
        <div className={cn(mobileView === "cart" ? "block h-full" : "hidden lg:block")}>
          {CartPanel()}
        </div>
      </div>

      {/* -- Sales History Dialog -- */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl sm:w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />Sales History
              <Badge variant="secondary" className="ml-1">{todaySales.length} today</Badge>
            </DialogTitle>
          </DialogHeader>
          {salesHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No sales yet today</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {salesHistory.map(sale => (
                  <div key={sale.id} className={cn("rounded-lg border bg-card p-3 space-y-2", sale.status === "refunded" && "opacity-70")}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary text-sm">{sale.billNumber}</span>
                      <span className={cn("font-bold text-primary", sale.status === "refunded" && "line-through text-muted-foreground")}>Rs.  {sale.grandTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{sale.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize text-xs">{sale.paymentMethod}</Badge>
                        <Badge variant="outline" className={cn("capitalize text-xs", sale.status === "refunded" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-success/10 text-success border-success/20")}>{sale.status}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(sale.date).toLocaleTimeString()}</span>
                        {sale.customerName && <span className="text-xs text-muted-foreground">{sale.customerName}</span>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handlePrint(sale)}><Printer className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleDownload(sale)}><Download className="w-3.5 h-3.5" /></Button>
                        {sale.status !== "refunded" && (
                          <>
                            <Button variant="ghost" size="icon" title="Return / Exchange" className="h-10 w-10 rounded-xl text-amber-700 hover:text-amber-700" onClick={() => openReturnDialog(sale)}><ArrowLeftRight className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" title="Full refund" className="h-10 w-10 rounded-xl text-destructive hover:text-destructive" onClick={() => handleRefund(sale)}><RefreshCcw className="w-3.5 h-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesHistory.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-sm font-bold text-primary">{sale.billNumber}</TableCell>
                        <TableCell className="text-sm max-w-[180px]">
                          <span className="line-clamp-2 text-muted-foreground">{sale.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(sale.date).toLocaleTimeString()}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs">{sale.paymentMethod}</Badge></TableCell>
                        <TableCell className="text-sm">{sale.customerName || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize text-xs", sale.status === "refunded" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-success/10 text-success border-success/20")}>
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold text-primary", sale.status === "refunded" && "line-through text-muted-foreground")}>Rs.  {sale.grandTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handlePrint(sale)}><Printer className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleDownload(sale)}><Download className="w-3.5 h-3.5" /></Button>
                          {sale.status !== "refunded" && (
                            <>
                              <Button variant="ghost" size="icon" title="Return / Exchange" className="h-10 w-10 rounded-xl text-amber-700 hover:text-amber-700" onClick={() => openReturnDialog(sale)}><ArrowLeftRight className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" title="Full refund" className="h-10 w-10 rounded-xl text-destructive hover:text-destructive" onClick={() => handleRefund(sale)}><RefreshCcw className="w-3.5 h-3.5" /></Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* -- Return / Exchange Dialog -- */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-amber-700" />
              Return / Exchange
            </DialogTitle>
          </DialogHeader>
          {returnSale && (
            <div className="space-y-4 pt-1">
              <div className="rounded-xl border bg-muted/40 p-3">
                <p className="text-sm font-bold text-primary">{returnSale.billNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {returnSale.customerName || "Walk-in customer"} - Rs. {returnSale.grandTotal.toFixed(2)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Bill Item</Label>
                  <Select
                    value={returnForm.itemIndex}
                    onValueChange={(value) => {
                      const item = returnSale.items[Number(value)];
                      setReturnForm((prev) => ({
                        ...prev,
                        itemIndex: value,
                        quantity: "1",
                        refundAmount: formatMoneyInput(item?.price || 0),
                      }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {returnSale.items.map((item, index) => (
                        <SelectItem key={`${item.productId || item.sku}-${index}`} value={String(index)} disabled={!item.productId}>
                          {item.quantity}x {item.name} - Rs. {item.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Action</Label>
                  <Select
                    value={returnForm.action}
                    onValueChange={(value) => setReturnForm((prev) => ({
                      ...prev,
                      action: value as SaleReturnAction,
                      restockReturned: value === "damaged_return" ? false : prev.restockReturned,
                      refundAmount: value === "exchange" ? "0.00" : prev.refundAmount,
                    }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refund">Refund / Return</SelectItem>
                      <SelectItem value="exchange">Exchange</SelectItem>
                      <SelectItem value="damaged_return">Damaged / No Restock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Quantity</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={selectedReturnItem?.quantity || 1}
                    value={returnForm.quantity}
                    onChange={(e) => updateReturnQuantity(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Refund Amount (Rs.)</Label>
                  <Input
                    inputMode="decimal"
                    value={returnForm.refundAmount}
                    onChange={(e) => setReturnForm((prev) => ({ ...prev, refundAmount: sanitizeMoneyInput(e.target.value) }))}
                    onBlur={(e) => setReturnForm((prev) => ({ ...prev, refundAmount: formatMoneyInput(parseMoneyInput(e.target.value)) }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Stock</Label>
                  <label className={cn(
                    "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm",
                    returnForm.action === "damaged_return" ? "bg-muted text-muted-foreground" : "bg-background",
                  )}>
                    <Checkbox
                      checked={returnForm.restockReturned}
                      disabled={returnForm.action === "damaged_return"}
                      onCheckedChange={(checked) => setReturnForm((prev) => ({ ...prev, restockReturned: checked === true }))}
                    />
                    Stock ma firta halne
                  </label>
                </div>

                {returnForm.action === "exchange" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Exchange Product</Label>
                      <Select
                        value={returnForm.exchangeProductId}
                        onValueChange={(value) => setReturnForm((prev) => ({ ...prev, exchangeProductId: value }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
                        <SelectContent>
                          {products
                            .filter((product) => product.id !== selectedReturnItem?.productId)
                            .map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - Stock {product.stock}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Exchange Qty</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={returnForm.exchangeQuantity}
                        onChange={(e) => setReturnForm((prev) => ({ ...prev, exchangeQuantity: e.target.value.replace(/[^0-9]/g, "") }))}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Reason</Label>
                  <Input
                    placeholder="Bigrera, wrong item, customer exchange..."
                    value={returnForm.reason}
                    onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
                <Button className="gap-2" onClick={handleReturnExchange}>
                  <Save className="w-4 h-4" />
                  Save Return
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* -- Checkout Preview Dialog -- */}
      <Dialog open={checkoutPreviewOpen} onOpenChange={setCheckoutPreviewOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Bill Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{settings.businessName || "Mero Pasal"}</p>
                  <p className="text-xs text-muted-foreground">{settings.taxNumber ? `PAN/VAT: ${settings.taxNumber}` : "PAN/VAT: Not set"}</p>
                  <p className="text-xs text-muted-foreground">{customerName.trim() || "Walk-in customer"}</p>
                </div>
                <Badge variant="outline" className="capitalize">{paymentMethod}</Badge>
              </div>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-[1fr_56px_92px] bg-muted/60 px-3 py-2 text-xs font-bold text-muted-foreground">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y">
                {cart.map((item) => (
                  <div key={item.product.id} className="grid grid-cols-[1fr_56px_92px] items-center px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Rs. {item.product.price.toFixed(2)} each</p>
                    </div>
                    <span className="text-center font-semibold">{item.quantity}</span>
                    <span className="text-right font-semibold">Rs. {(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-3 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({discountLabel})</span>
                  <span>-Rs. {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({taxEnabled ? taxPercent : 0}%)</span>
                <span>+Rs. {taxAmount.toFixed(2)}</span>
              </div>
              {paymentMethod === "split" && (
                <div className="flex justify-between text-amber-700">
                  <span>Cash / Online</span>
                  <span>{parseMoneyInput(splitCash).toFixed(2)} / {parseMoneyInput(splitOnline).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setCheckoutPreviewOpen(false)}>
                Edit Bill
              </Button>
              <Button className="gap-2" onClick={handleCheckout}>
                <Receipt className="w-4 h-4" />
                Confirm & Save Bill
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* -- Invoice Dialog -- */}
      <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Receipt className="w-5 h-5" />Sale Complete!
            </DialogTitle>
          </DialogHeader>
          {currentInvoice && (
            <div className="space-y-4">
              {/* Receipt header */}
              <div className="text-center space-y-0.5 py-2 rounded-xl bg-muted/40">
                <h3 className="text-lg font-bold">MERO PASAL</h3>
                <p className="text-xs text-muted-foreground">Bill #{currentInvoice.billNumber}</p>
                <p className="text-xs text-muted-foreground">{new Date(currentInvoice.date).toLocaleString()}</p>
                {currentInvoice.customerName && (
                  <p className="text-xs font-medium">{currentInvoice.customerName}</p>
                )}
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-1.5">
                {currentInvoice.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                    <span className="font-medium">Rs.  {item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Summary */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>Rs.  {currentInvoice.subtotal.toFixed(2)}</span>
                </div>
                {currentInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({currentInvoice.discountLabel || `${Number(currentInvoice.discountPercent.toFixed(2))}%`})</span>
                    <span>-Rs.  {currentInvoice.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {currentInvoice.taxAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT ({currentInvoice.taxPercent}%)</span>
                    <span>+Rs.  {currentInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-1 border-t">
                  <span>Grand Total</span>
                  <span className="text-primary">Rs.  {currentInvoice.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment</span>
                  <span className="capitalize font-medium">{currentInvoice.paymentMethod}</span>
                </div>
                {currentInvoice.splitPayment && (
                  <div className="flex justify-between text-xs text-amber-700">
                    <span>Cash / Online</span>
                    <span className="font-medium">{currentInvoice.splitPayment.cash.toFixed(2)} / {currentInvoice.splitPayment.online.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {settings.paymentQr?.showOnBill && settings.paymentQr?.image && (currentInvoice.paymentMethod === "mobile" || currentInvoice.paymentMethod === "split") && (
                <div className="rounded-xl border bg-white p-3 text-center">
                  <img src={settings.paymentQr.image} alt="Payment QR" className="mx-auto h-32 w-32 object-contain" />
                  <p className="mt-2 text-xs font-semibold">Scan to pay via {settings.paymentQr.provider}</p>
                  {settings.paymentQr.accountName && <p className="text-xs text-muted-foreground">{settings.paymentQr.accountName}</p>}
                  {settings.paymentQr.accountNumber && <p className="text-xs text-muted-foreground">{settings.paymentQr.accountNumber}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button className="gap-2" onClick={() => handlePrint(currentInvoice)}>
                  <Printer className="w-4 h-4" />Print
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => handleDownload(currentInvoice)}>
                  <Download className="w-4 h-4" />Download
                </Button>
              </div>

              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setInvoiceDialog(false)}>
                <ChevronRight className="w-4 h-4 mr-1" />Continue Selling
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesPage;
