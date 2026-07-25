import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, ExternalLink, MapPin, Megaphone, Phone, Search, ShoppingBag, Sparkles, Table2 } from "lucide-react";
import { publicMenu, type ApiPublicMenu } from "@/lib/api";
import { applyMenuImageFallback, menuFoodImage } from "@/lib/menuImages";
import { activeQrMenuAds, readQrMenuAds, type QrMenuAd } from "@/lib/qrMenuAds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const greenMenuTheme = {
  "--primary": "151 75% 31%",
  "--primary-foreground": "0 0% 100%",
} as CSSProperties & Record<string, string>;

export default function PublicMenuPage() {
  const [params] = useSearchParams();
  const businessId = params.get("business");
  const tableId = params.get("table");
  const [data, setData] = useState<ApiPublicMenu | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const itemHasOffer = (item: ApiPublicMenu["items"][number]) => Number(item.original_price || 0) > Number(item.price);
  const comboHasOffer = (combo: ApiPublicMenu["combos"][number]) => Number(combo.original_price || 0) > Number(combo.price);
  const offerPercent = (price: number, originalPrice: number) =>
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const offerPriority = (hasOffer: boolean) => hasOffer ? 0 : 1;

  useEffect(() => {
    if (!businessId) {
      setError("Menu link is missing business information.");
      return;
    }
    publicMenu.get(businessId, tableId)
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, [businessId, tableId]);

  const categories = useMemo(() => {
    const names = [
      ...(data?.items.map((item) => item.category).filter(Boolean) ?? []),
      ...(data?.combos.map((combo) => combo.category).filter(Boolean) ?? []),
    ];
    const hasOffers = (data?.items ?? []).some(itemHasOffer) || (data?.combos ?? []).some(comboHasOffer);
    return ["all", ...(hasOffers ? ["offers"] : []), ...Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))];
  }, [data]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter((item) => {
      const matchesCategory = category === "all" || (category === "offers" ? itemHasOffer(item) : item.category === category);
      const matchesSearch = !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.sub_category ?? "").toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      const offerSort = offerPriority(itemHasOffer(a)) - offerPriority(itemHasOffer(b));
      if (offerSort !== 0) return offerSort;
      return a.name.localeCompare(b.name);
    });
  }, [data, search, category]);

  const combos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.combos ?? []).filter((combo) => {
      const matchesCategory = category === "all" || (category === "offers" ? comboHasOffer(combo) : combo.category === category);
      const matchesSearch = !q ||
        combo.name.toLowerCase().includes(q) ||
        combo.category.toLowerCase().includes(q) ||
        combo.items.some((item) => item.menu_item_name.toLowerCase().includes(q)) ||
        (combo.description ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      const offerSort = offerPriority(comboHasOffer(a)) - offerPriority(comboHasOffer(b));
      if (offerSort !== 0) return offerSort;
      return a.name.localeCompare(b.name);
    });
  }, [data, search, category]);

  const itemSections = useMemo(() => {
    const categoryMap = new Map<string, Map<string, typeof items>>();
    items.forEach((item) => {
      const categoryName = item.category || "Other";
      const subName = item.sub_category || "Regular";
      if (!categoryMap.has(categoryName)) categoryMap.set(categoryName, new Map());
      const subMap = categoryMap.get(categoryName)!;
      subMap.set(subName, [...(subMap.get(subName) || []), item]);
    });

    return Array.from(categoryMap.entries())
      .sort(([a], [b]) => {
        if (category !== "all" && a === category) return -1;
        if (category !== "all" && b === category) return 1;
        return a.localeCompare(b);
      })
      .map(([categoryName, subMap]) => ({
        categoryName,
        count: Array.from(subMap.values()).reduce((sum, list) => sum + list.length, 0),
        subSections: Array.from(subMap.entries())
          .sort(([a], [b]) => {
            if (a === "Regular") return 1;
            if (b === "Regular") return -1;
            return a.localeCompare(b);
          })
          .map(([subName, list]) => ({ subName, list })),
      }));
  }, [items, category]);

  const categoryPreviews = useMemo(() => {
    return categories.map((name) => {
      if (name === "all") {
        const firstItem = data?.items[0];
        return {
          name,
          label: "All",
          count: (data?.items.length ?? 0) + (data?.combos.length ?? 0),
          image: menuFoodImage(firstItem?.name || "Menu", firstItem?.category || "Menu", firstItem?.image),
        };
      }
      if (name === "offers") {
        const offerItem = data?.items.find(itemHasOffer);
        const offerCombo = data?.combos.find(comboHasOffer);
        return {
          name,
          label: "Offers",
          count: (data?.items.filter(itemHasOffer).length ?? 0) + (data?.combos.filter(comboHasOffer).length ?? 0),
          image: offerItem
            ? menuFoodImage(offerItem.name, offerItem.category, offerItem.image)
            : menuFoodImage(offerCombo?.name || "Offer", offerCombo?.category || "Combo", offerCombo?.image),
        };
      }
      const item = data?.items.find((entry) => entry.category === name);
      const combo = data?.combos.find((entry) => entry.category === name);
      return {
        name,
        label: name,
        count: (data?.items.filter((entry) => entry.category === name).length ?? 0) + (data?.combos.filter((entry) => entry.category === name).length ?? 0),
        image: item
          ? menuFoodImage(item.name, item.category, item.image)
          : menuFoodImage(combo?.name || name, combo?.category || name, combo?.image),
      };
    });
  }, [categories, data]);

  const totalVisible = items.length + combos.length;
  const qrAds = useMemo(() => {
    const apiAds = (data as (ApiPublicMenu & { advertisements?: QrMenuAd[] }) | null)?.advertisements;
    return activeQrMenuAds(apiAds?.length ? apiAds : readQrMenuAds()).slice(0, 3);
  }, [data]);

  if (error) {
    return (
      <main className="min-h-screen bg-background p-4">
        <Card className="mx-auto mt-20 max-w-md">
          <CardContent className="p-8 text-center">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h1 className="text-xl font-bold">Menu not available</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background p-4">
        <Card className="mx-auto mt-20 max-w-md">
          <CardContent className="p-8 text-center text-muted-foreground">Loading menu...</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main style={greenMenuTheme} className="qr-menu-page min-h-screen bg-[#f4fbf6] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-slate-950">
      <section className="qr-menu-hero relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-800 to-green-700 px-3 pb-20 pt-4 text-white sm:px-6 sm:pb-24 sm:pt-6">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(135deg,rgba(255,255,255,.24)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="qr-menu-sweep absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-emerald-950/25 to-transparent" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="qr-menu-enter flex items-center gap-3">
              {data.business.logo ? (
                <img src={data.business.logo} alt={data.business.business_name} className="h-14 w-14 rounded-3xl border-2 border-white bg-white object-contain p-1.5 shadow-2xl shadow-emerald-950/30 sm:h-20 sm:w-20" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/15 shadow-2xl shadow-emerald-950/30 sm:h-20 sm:w-20">
                  <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100 sm:text-sm">Welcome to</p>
                <h1 className="line-clamp-2 break-words text-3xl font-extrabold leading-tight min-[430px]:text-4xl sm:text-6xl">{data.business.business_name}</h1>
              </div>
            </div>
            <div className="qr-menu-enter mt-4 flex flex-wrap gap-1.5 text-xs sm:gap-2 sm:text-sm [animation-delay:80ms]">
              {data.table && (
                <Badge className="h-8 gap-1 rounded-full bg-white px-3 text-emerald-800 shadow-sm hover:bg-white sm:h-9">
                  <Table2 className="h-3.5 w-3.5" />
                  Table {data.table.number}
                </Badge>
              )}
              {data.business.address && (
                <span className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/15 px-3 py-1 backdrop-blur sm:min-h-9">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{data.business.address}</span>
                </span>
              )}
              {data.business.phone && (
                <span className="inline-flex min-h-8 items-center gap-1 rounded-full border border-white/10 bg-white/15 px-3 py-1 backdrop-blur sm:min-h-9">
                  <Phone className="h-3.5 w-3.5" />
                  {data.business.phone}
                </span>
              )}
            </div>
          </div>
          <div className="qr-menu-enter grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-white/12 p-2 text-sm shadow-2xl shadow-emerald-950/20 backdrop-blur md:min-w-72 [animation-delay:120ms]">
            <div className="rounded-2xl bg-white/15 px-4 py-3 transition hover:bg-white/20">
              <Sparkles className="mb-1 h-4 w-4" />
              <p className="text-2xl font-bold">{(data.items.length + data.combos.length).toLocaleString()}</p>
              <p className="text-xs opacity-85">Menu choices</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 transition hover:bg-white/20">
              <Clock className="mb-1 h-4 w-4" />
              <p className="text-2xl font-bold">Open</p>
              <p className="text-xs opacity-85">Ready to serve</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-2.5 pb-6 sm:px-6">
        <div className="qr-menu-enter sticky top-0 z-10 -mt-12 rounded-[1.75rem] border border-emerald-100 bg-white/95 p-2.5 shadow-2xl shadow-emerald-900/12 backdrop-blur sm:-mt-12 sm:p-3 [animation-delay:170ms]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tea, snacks, meals..." className="h-11 rounded-2xl border-emerald-100 bg-emerald-50/35 pl-11 text-sm shadow-none focus-visible:ring-primary sm:h-12 sm:text-base" />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {categoryPreviews.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className={`qr-category-tile flex h-[3.25rem] min-w-0 items-center gap-2 rounded-2xl border p-1.5 text-left transition duration-200 hover:-translate-y-0.5 sm:h-14 ${
                    category === entry.name
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-emerald-900/18"
                      : "border-emerald-100 bg-white hover:border-primary/50 hover:bg-emerald-50"
                  }`}
                  onClick={() => setCategory(entry.name)}
                >
                  <img src={entry.image} alt={entry.label} className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm sm:h-10 sm:w-10" onError={(e) => applyMenuImageFallback(e.currentTarget, entry.label, entry.label)} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold capitalize sm:text-sm">{entry.label}</span>
                    <span className={`block text-[10px] sm:text-[11px] ${category === entry.name ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{entry.count} items</span>
                  </span>
                </button>
              ))}
          </div>
        </div>

        {qrAds.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {qrAds.map((ad) => {
              const content = (
                <div className="group relative flex min-h-28 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-900 via-emerald-700 to-red-600 p-3 text-white shadow-lg shadow-emerald-900/12 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                  <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_28%),linear-gradient(135deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:auto,18px_18px]" />
                  {ad.image ? (
                    <img
                      src={ad.image}
                      alt={ad.title}
                      className="relative z-10 h-24 w-24 shrink-0 rounded-2xl border border-white/25 object-cover shadow-md sm:h-28 sm:w-28"
                      onError={(e) => applyMenuImageFallback(e.currentTarget, ad.title || "Offer", "Offer")}
                    />
                  ) : (
                    <div className="relative z-10 flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-md sm:h-28 sm:w-28">
                      <Megaphone className="h-9 w-9" />
                    </div>
                  )}
                  <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center px-3">
                    <Badge className="mb-2 w-fit rounded-full bg-white px-2 py-0 text-[10px] font-bold text-emerald-800 hover:bg-white">Advertisement</Badge>
                    <h3 className="line-clamp-2 text-base font-extrabold leading-tight sm:text-lg">{ad.title}</h3>
                    {ad.subtitle && <p className="mt-1 line-clamp-2 text-xs text-white/85 sm:text-sm">{ad.subtitle}</p>}
                    {ad.link && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white/90">
                        View details <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
              return ad.link ? (
                <a key={ad.id} href={ad.link} target="_blank" rel="noreferrer" className="block">
                  {content}
                </a>
              ) : (
                <div key={ad.id}>{content}</div>
              );
            })}
          </div>
        )}

        <div className="qr-menu-enter mt-5 flex flex-wrap items-end justify-between gap-3 sm:mt-6 [animation-delay:220ms]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary sm:text-sm">{category === "all" ? "Full menu" : category}</p>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-3xl">Choose your order</h2>
          </div>
          <Badge variant="outline" className="h-8 rounded-full border-emerald-100 bg-white px-3 text-xs shadow-sm sm:h-9 sm:px-4 sm:text-sm">
            {totalVisible} items
          </Badge>
        </div>

        {combos.length > 0 && (
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Combo Offers</h2>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{combos.length} offers</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3 xl:grid-cols-5 2xl:grid-cols-6">
              {combos.map((combo) => (
                <Card key={`combo-${combo.id}`} className="qr-item-card group overflow-hidden rounded-3xl border-primary/20 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/12">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img src={menuFoodImage(combo.name, combo.category || "Combo", combo.image)} alt={combo.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(e) => applyMenuImageFallback(e.currentTarget, combo.name, combo.category || "Combo")} />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/38 to-transparent opacity-80" />
                    {comboHasOffer(combo) && (
                      <div className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
                        {offerPercent(Number(combo.price), Number(combo.original_price))}% off
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5 sm:p-3.5">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <Badge className="mb-1 rounded-md bg-primary px-1.5 py-0 text-[10px] text-primary-foreground sm:mb-2 sm:text-xs">Combo</Badge>
                        <h2 className="line-clamp-2 text-sm font-bold leading-snug sm:text-base">{combo.name}</h2>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-sm font-extrabold text-primary sm:text-base">{data.business.currency_symbol}{Number(combo.price).toLocaleString()}</p>
                        {Number(combo.original_price) > Number(combo.price) && <p className="text-xs text-muted-foreground line-through">{data.business.currency_symbol}{Number(combo.original_price).toLocaleString()}</p>}
                      </div>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
                      {combo.description || combo.items.map((item) => `${item.quantity}x ${item.menu_item_name}`).join(", ")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && combos.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-10 text-center text-muted-foreground">No menu items found.</CardContent>
          </Card>
        ) : (
          <>
            {items.length > 0 && (
              <div className="mt-5 space-y-5 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold sm:text-2xl">{category === "offers" ? "Menu Item Offers" : "Menu Items"}</h2>
                  <Badge variant="outline" className="hidden rounded-full border-emerald-100 bg-white shadow-sm sm:inline-flex">{items.filter(itemHasOffer).length} priority offers</Badge>
                </div>
                {itemSections.map((section) => (
                  <section key={section.categoryName} className="space-y-3 sm:space-y-4">
                    <div className="flex items-end justify-between gap-3 rounded-3xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Category</p>
                        <h3 className="text-lg font-extrabold sm:text-xl">{section.categoryName}</h3>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-2 text-xs sm:px-3">{section.count} items</Badge>
                    </div>
                    {section.subSections.map((subSection) => (
                      <div key={`${section.categoryName}-${subSection.subName}`} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold sm:text-base">{subSection.subName}</h4>
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs text-muted-foreground">{subSection.list.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3 xl:grid-cols-5 2xl:grid-cols-6">
                          {subSection.list.map((item) => (
                            <Card key={item.id} className={`qr-item-card group overflow-hidden rounded-3xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-emerald-900/12 ${itemHasOffer(item) ? "border-primary/35 ring-1 ring-primary/10" : "border-emerald-100"}`}>
                              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                                <img
                                  src={menuFoodImage(item.name, item.category, item.image)}
                                  alt={item.name}
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                  onError={(e) => applyMenuImageFallback(e.currentTarget, item.name, item.category)}
                                />
                                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/28 to-transparent opacity-75" />
                                <div className="absolute right-1.5 top-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-extrabold text-primary shadow-sm sm:right-3 sm:top-3 sm:px-3 sm:py-1 sm:text-sm">
                                  {data.business.currency_symbol}{Number(item.price).toLocaleString()}
                                </div>
                                {itemHasOffer(item) && (
                                  <div className="absolute left-1.5 top-1.5 max-w-[calc(100%-4.75rem)] truncate rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm sm:left-3 sm:top-3 sm:max-w-none sm:px-3 sm:py-1 sm:text-xs">
                                    {item.offer_label || `${offerPercent(Number(item.price), Number(item.original_price))}% off`}
                                  </div>
                                )}
                              </div>
                              <CardContent className="p-2.5 sm:p-3.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="mb-1.5 flex flex-wrap gap-1 sm:mb-2">
                                      <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px] capitalize sm:text-xs">{item.category}</Badge>
                                      {item.sub_category && <Badge variant="outline" className="px-1.5 py-0 text-[10px] capitalize sm:text-xs">{item.sub_category}</Badge>}
                                      {itemHasOffer(item) && <Badge className="hidden bg-primary/10 text-primary hover:bg-primary/10 sm:inline-flex">Offer</Badge>}
                                    </div>
                                    <h2 className="line-clamp-2 min-h-9 text-sm font-bold leading-snug sm:min-h-10 sm:text-base">{item.name}</h2>
                                  </div>
                                </div>
                                {itemHasOffer(item) && (
                                  <p className="mt-1 text-[11px] text-muted-foreground sm:text-sm">
                                    <span className="line-through">{data.business.currency_symbol}{Number(item.original_price).toLocaleString()}</span>
                                    <span className="ml-1 font-semibold text-primary sm:ml-2">Save {data.business.currency_symbol}{(Number(item.original_price) - Number(item.price)).toLocaleString()}</span>
                                  </p>
                                )}
                                {item.description && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground sm:mt-2 sm:text-sm">{item.description}</p>}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </>
        )}

        {data.business.receipt_footer && (
          <p className="mt-8 text-center text-sm text-muted-foreground">{data.business.receipt_footer}</p>
        )}
      </section>
    </main>
  );
}
