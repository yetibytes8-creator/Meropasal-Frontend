import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, MapPin, Phone, Search, ShoppingBag, Sparkles, Table2 } from "lucide-react";
import { publicMenu, type ApiPublicMenu } from "@/lib/api";
import { applyMenuImageFallback, menuFoodImage } from "@/lib/menuImages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
    <main className="min-h-screen bg-[#fffaf7] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <section className="relative overflow-hidden bg-primary px-3 pb-10 pt-4 text-primary-foreground sm:px-6 sm:pb-16 sm:pt-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {data.business.logo ? (
                <img src={data.business.logo} alt={data.business.business_name} className="h-11 w-11 rounded-xl bg-white object-contain p-1 shadow-sm sm:h-16 sm:w-16 sm:rounded-2xl" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 sm:h-16 sm:w-16 sm:rounded-2xl">
                  <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium opacity-90 sm:text-sm">Welcome to</p>
                <h1 className="line-clamp-2 break-words text-2xl font-extrabold leading-tight sm:text-5xl">{data.business.business_name}</h1>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs sm:mt-4 sm:gap-2 sm:text-sm">
              {data.table && (
                <Badge className="h-7 gap-1 rounded-full bg-white px-2.5 text-primary hover:bg-white sm:h-9 sm:px-3">
                  <Table2 className="h-3.5 w-3.5" />
                  Table {data.table.number}
                </Badge>
              )}
              {data.business.address && (
                <span className="inline-flex min-h-7 max-w-full items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 sm:min-h-9 sm:px-3">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{data.business.address}</span>
                </span>
              )}
              {data.business.phone && (
                <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 sm:min-h-9 sm:px-3">
                  <Phone className="h-3.5 w-3.5" />
                  {data.business.phone}
                </span>
              )}
            </div>
          </div>
          <div className="hidden grid-cols-2 gap-2 rounded-2xl bg-white/15 p-2 text-sm backdrop-blur sm:grid md:min-w-64">
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <Sparkles className="mb-1 h-4 w-4" />
              <p className="text-lg font-bold">{(data.items.length + data.combos.length).toLocaleString()}</p>
              <p className="text-xs opacity-85">Menu choices</p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <Clock className="mb-1 h-4 w-4" />
              <p className="text-lg font-bold">Open</p>
              <p className="text-xs opacity-85">Ready to serve</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-2.5 pb-6 sm:px-6">
        <div className="sticky top-0 z-10 -mt-6 rounded-xl border bg-white/95 p-2 shadow-sm backdrop-blur sm:-mt-8 sm:rounded-2xl sm:p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tea, snacks, meals..." className="h-10 rounded-xl border-border/80 bg-white pl-11 text-sm shadow-none sm:h-12 sm:text-base" />
            </div>
          </div>
          <div className="mt-2 grid auto-cols-[8.25rem] grid-flow-col gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:auto-cols-[9.5rem] lg:flex lg:flex-wrap lg:overflow-visible lg:pb-0">
              {categoryPreviews.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className={`flex h-12 min-w-0 shrink-0 snap-start items-center gap-2 rounded-xl border p-1.5 text-left transition sm:h-14 ${
                    category === entry.name
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-white hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  onClick={() => setCategory(entry.name)}
                >
                  <img src={entry.image} alt={entry.label} className="h-9 w-9 shrink-0 rounded-lg object-cover sm:h-10 sm:w-10" onError={(e) => applyMenuImageFallback(e.currentTarget, entry.label, entry.label)} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold capitalize sm:text-sm">{entry.label}</span>
                    <span className={`block text-[10px] sm:text-[11px] ${category === entry.name ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{entry.count} items</span>
                  </span>
                </button>
              ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 sm:mt-5">
          <div>
            <p className="text-xs font-medium text-primary sm:text-sm">{category === "all" ? "Full menu" : category}</p>
            <h2 className="text-lg font-extrabold tracking-tight sm:text-2xl">Choose your order</h2>
          </div>
          <Badge variant="outline" className="h-7 rounded-full bg-white px-2.5 text-xs sm:h-8 sm:px-3 sm:text-sm">
            {totalVisible} items
          </Badge>
        </div>

        {combos.length > 0 && (
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Combo Offers</h2>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{combos.length} offers</Badge>
            </div>
            <div className="grid grid-cols-1 gap-2.5 min-[390px]:grid-cols-2 min-[620px]:grid-cols-3 md:grid-cols-4 md:gap-3 xl:grid-cols-5">
              {combos.map((combo) => (
                <Card key={`combo-${combo.id}`} className="group overflow-hidden rounded-xl border-primary/20 bg-white shadow-sm">
                  <div className="relative aspect-[5/3] overflow-hidden bg-muted sm:aspect-[4/3]">
                    <img src={menuFoodImage(combo.name, combo.category || "Combo", combo.image)} alt={combo.name} className="h-full w-full object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, combo.name, combo.category || "Combo")} />
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
                  <h2 className="text-lg font-extrabold">{category === "offers" ? "Menu Item Offers" : "Menu Items"}</h2>
                  <Badge variant="outline" className="hidden rounded-full bg-white sm:inline-flex">{items.filter(itemHasOffer).length} priority offers</Badge>
                </div>
                {itemSections.map((section) => (
                  <section key={section.categoryName} className="space-y-3 sm:space-y-4">
                    <div className="flex items-end justify-between gap-3 border-b pb-2">
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
                        <div className="grid grid-cols-1 gap-2.5 min-[390px]:grid-cols-2 min-[620px]:grid-cols-3 md:grid-cols-4 md:gap-3 xl:grid-cols-5">
                          {subSection.list.map((item) => (
                            <Card key={item.id} className={`group overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md ${itemHasOffer(item) ? "border-primary/35 ring-1 ring-primary/10" : ""}`}>
                              <div className="relative aspect-[5/3] overflow-hidden bg-muted sm:aspect-[4/3]">
                                <img
                                  src={menuFoodImage(item.name, item.category, item.image)}
                                  alt={item.name}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                  onError={(e) => applyMenuImageFallback(e.currentTarget, item.name, item.category)}
                                />
                                <div className="absolute right-1.5 top-1.5 rounded-full bg-white/95 px-2 py-0.5 text-xs font-extrabold text-primary shadow-sm sm:right-3 sm:top-3 sm:px-3 sm:py-1 sm:text-sm">
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
                                    <h2 className="line-clamp-2 text-sm font-bold leading-snug sm:text-base">{item.name}</h2>
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
