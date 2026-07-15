import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, Link as LinkIcon, Plus, Printer, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { tables as tablesApi, type ApiTable } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { esc } from "@/lib/html-escape";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const filename = (table: ApiTable) => `menu-qr-table-${table.number}.png`;

const sortTables = (items: ApiTable[]) => [...items].sort((a, b) => a.number - b.number);

export default function QRCodesPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [allTables, setAllTables] = useState<ApiTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [tableSeats, setTableSeats] = useState("4");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    tablesApi.list()
      .then((serverTables) => {
        if (!mounted) return;
        setAllTables(sortTables(serverTables));
      })
      .catch((err) => {
        if (!mounted) return;
        setAllTables([]);
        toast.error(err instanceof Error ? err.message : "Backend unavailable. Please start the API server.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const makeMenuUrl = useCallback((table: ApiTable) => {
    const params = new URLSearchParams({ business: user?.id ?? "", table: String(table.id) });
    return `${window.location.origin}/qr-menu?${params.toString()}`;
  }, [user?.id]);

  const visibleTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTables;
    return allTables.filter((table) => `table ${table.number}`.toLowerCase().includes(q) || String(table.number).includes(q));
  }, [allTables, search]);

  const nextTableNumber = useMemo(() => (
    allTables.length > 0 ? Math.max(...allTables.map((table) => table.number)) + 1 : 1
  ), [allTables]);

  const openAddTable = () => {
    setTableNumber(String(nextTableNumber));
    setTableSeats("4");
    setAddOpen(true);
  };

  const handleAddTable = async () => {
    const number = parseInt(tableNumber, 10);
    const seats = parseInt(tableSeats, 10);
    if (!number || number < 1) { toast.error("Table number must be at least 1"); return; }
    if (allTables.some((table) => table.number === number)) { toast.error(`Table ${number} already exists`); return; }
    if (!seats || seats < 1) { toast.error("Seats must be at least 1"); return; }
    if (seats > 50) { toast.error("Seats cannot exceed 50"); return; }
    setSaving(true);
    try {
      const created = await tablesApi.create({ number, seats, status: "available" });
      setAllTables((prev) => {
        const next = sortTables([...prev.filter((table) => table.number !== created.number), created]);
        return next;
      });
      setAddOpen(false);
      toast.success(`Table ${created.number} QR added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save table. Please check the backend server.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (allTables.length === 0) {
      setQrMap({});
      return;
    }
    let cancelled = false;
    Promise.all(
      allTables.map(async (table) => [
        table.id,
        await QRCode.toDataURL(makeMenuUrl(table), { margin: 1, width: 320 }),
      ] as const),
    ).then((pairs) => {
      if (!cancelled) setQrMap(Object.fromEntries(pairs));
    }).catch(() => toast.error("Could not generate QR codes"));
    return () => { cancelled = true; };
  }, [allTables, makeMenuUrl, user?.id]);

  const copyUrl = async (table: ApiTable) => {
    await navigator.clipboard.writeText(makeMenuUrl(table));
    toast.success(`Table ${table.number} menu link copied`);
  };

  const downloadQrCard = async (table: ApiTable, announce = true) => {
    const qr = qrMap[table.id] || await QRCode.toDataURL(makeMenuUrl(table), { margin: 1, width: 320 });
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f6f2ee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.font = "700 38px Arial";
    ctx.fillText("Welcome To", 450, 150);
    ctx.font = "800 64px Arial";
    ctx.fillText(settings.businessName || "Restaurant", 450, 225);

    ctx.strokeStyle = "#e11d2e";
    ctx.lineWidth = 8;
    ctx.strokeRect(225, 345, 450, 450);
    ctx.fillStyle = "#e11d2e";
    ctx.roundRect(350, 300, 200, 76, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 32px Arial";
    ctx.fillText(`TABLE ${table.number}`, 450, 350);

    const qrImg = await loadImage(qr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(282, 405, 336, 336);
    ctx.drawImage(qrImg, 300, 423, 300, 300);

    ctx.fillStyle = "#111111";
    ctx.font = "400 32px Arial";
    ctx.fillText("Scan To Explore Our Menu", 450, 895);
    ctx.font = "700 24px Arial";
    ctx.fillText(`Powered by ${settings.businessName || "Mero Pasal"}`, 450, 1040);
    ctx.fillStyle = "#1d4ed8";
    ctx.font = "500 24px Arial";
    ctx.fillText(makeMenuUrl(table), 450, 1165);

    const link = document.createElement("a");
    link.download = filename(table);
    link.href = canvas.toDataURL("image/png");
    link.click();
    if (announce) toast.success(`Table ${table.number} QR downloaded`);
  };

  const downloadAll = async () => {
    for (const table of visibleTables) await downloadQrCard(table, false);
    toast.success(`Downloaded ${visibleTables.length} QR card${visibleTables.length === 1 ? "" : "s"}`);
  };

  const printQrCard = (table: ApiTable) => {
    const qr = qrMap[table.id];
    if (!qr) return;
    const w = window.open("", "_blank", "width=520,height=760");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Table ${table.number} QR</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;background:#f6f2ee;color:#111}
        .poster{width:420px;margin:20px auto;text-align:center;padding:44px 24px;background:#f6f2ee}
        h1{font-size:22px;margin:0}.name{font-size:38px;font-weight:800;margin:12px 0 36px}
        .qrbox{border:4px solid #e11d2e;border-radius:16px;width:260px;height:260px;margin:0 auto;position:relative;padding:26px;background:#fff}
        .label{position:absolute;left:50%;top:-24px;transform:translateX(-50%);background:#e11d2e;color:white;border-radius:10px;padding:12px 20px;font-weight:800}
        img{width:100%;height:100%}.caption{font-size:18px;margin-top:30px}.powered{margin-top:64px;font-weight:700}
      </style></head><body>
      <main class="poster">
        <h1>Welcome To</h1><p class="name">${esc(settings.businessName || "Restaurant")}</p>
        <div class="qrbox"><div class="label">TABLE ${table.number}</div><img src="${qr}" alt="QR"/></div>
        <p class="caption">Scan To Explore Our Menu</p><p class="powered">Powered by ${esc(settings.businessName || "Mero Pasal")}</p>
      </main></body></html>`);
    w.document.close();
    w.setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-header">QR Codes</h1>
          <p className="page-description">Printable menu QR cards for each table and cabin</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search table..." className="pl-9" />
          </div>
          <Button variant="outline" onClick={openAddTable} className="h-11 rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Add Table / QR
          </Button>
          <Button onClick={downloadAll} disabled={visibleTables.length === 0} className="h-11 rounded-xl gap-2">
            <Download className="h-4 w-4" />
            Download All QR
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-primary" />
        <h2 className="text-lg font-semibold text-primary">Restaurant Table & Space</h2>
        <Badge variant="secondary">{visibleTables.length} Table{visibleTables.length === 1 ? "" : "s"}</Badge>
      </div>

      {loading ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Loading QR codes...</CardContent></Card>
      ) : visibleTables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
            <p>No tables found. Add tables here, then QR cards will appear instantly.</p>
            <Button onClick={openAddTable} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Add First Table QR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleTables.map((table) => (
            <Card key={table.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-[#f6f2ee] px-6 py-10 text-center">
                  <p className="text-lg font-bold text-foreground">Welcome To</p>
                  <p className="mt-3 text-3xl font-extrabold text-foreground">{settings.businessName || "Restaurant"}</p>
                  <div className="relative mx-auto mt-12 flex h-56 w-56 items-center justify-center rounded-2xl border-4 border-primary bg-white p-5 shadow-sm">
                    <span className="absolute -top-6 rounded-xl bg-primary px-5 py-2 text-sm font-extrabold text-primary-foreground shadow">
                      TABLE {table.number}
                    </span>
                    {qrMap[table.id] ? (
                      <img src={qrMap[table.id]} alt={`Table ${table.number} menu QR`} className="h-full w-full object-contain" />
                    ) : (
                      <QrCode className="h-24 w-24 text-muted-foreground" />
                    )}
                  </div>
                  <p className="mt-8 text-base font-medium text-foreground">Scan To Explore Our Menu</p>
                  <p className="mt-14 text-sm font-semibold text-foreground">Powered by {settings.businessName || "Mero Pasal"}</p>
                </div>
                <div className="flex items-center gap-2 border-t bg-card p-3">
                  <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => copyUrl(table)} title="Copy link">
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <button
                    onClick={() => window.open(makeMenuUrl(table), "_blank")}
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-primary"
                    title={makeMenuUrl(table)}
                  >
                    {makeMenuUrl(table)}
                  </button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => copyUrl(table)} title="Copy link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => window.open(makeMenuUrl(table), "_blank")} title="Open menu">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => downloadQrCard(table)} title="Download QR">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => printQrCard(table)} title="Print QR">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Table QR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
              Table save भएपछि QR card automatically generate हुन्छ।
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Table Number</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder={String(nextTableNumber)}
                />
              </div>
              <div className="space-y-2">
                <Label>Seats</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="50"
                  value={tableSeats}
                  onChange={(e) => setTableSeats(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddTable} disabled={saving} className="h-11 w-full rounded-xl gap-2">
              <QrCode className="h-4 w-4" />
              {saving ? "Adding..." : "Add Table & QR"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
