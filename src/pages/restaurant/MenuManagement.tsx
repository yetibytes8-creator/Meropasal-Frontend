import { useEffect, useMemo, useRef, useState } from "react";
import {
  comboOffers as comboOffersApi,
  menuItems as menuItemsApi,
  ingredients as ingredientsApi,
  type ApiComboOffer,
  type ApiMenuItemIngredient,
} from "@/lib/api";
import { fromApiMenuItem, fromApiIngredient } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { applyMenuImageFallback, menuFoodImage } from "@/lib/menuImages";
import { Plus, Search, Pencil, Trash2, Upload, ImageIcon, FolderPlus, Save, X, Tags, Megaphone } from "lucide-react";
import type { MenuItem } from "@/types";
import { toast } from "sonner";
import { readQrMenuAds, writeQrMenuAds, type QrMenuAd } from "@/lib/qrMenuAds";

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

interface CategoryEntry { name: string; image?: string }
interface ComboLine { menuItemId: string; menuItemName: string; quantity: string }
type ItemMode = "normal" | "offer";

const DEFAULT_MENU_CATEGORIES: CategoryEntry[] = [
  { name: "Coffee" },
  { name: "Tea" },
  { name: "Khaja" },
  { name: "Meals" },
  { name: "Snacks" },
  { name: "Desserts" },
  { name: "Combo" },
];

const DEFAULT_SUB_MENUS: Record<string, string[]> = {
  Coffee: ["Hot Coffee", "Cold Coffee", "Espresso", "Latte"],
  Tea: ["Black Tea", "Milk Tea", "Lemon Tea", "Masala Tea", "Green Tea"],
  Chiya: ["Black Tea", "Milk Tea", "Lemon Tea", "Masala Tea", "Green Tea"],
  Khaja: ["Momo", "Chowmein", "Sekuwa", "Chatpate", "Samosa"],
  Meals: ["Breakfast", "Lunch", "Dinner", "Thakali", "Set Meal"],
  Snacks: ["Fried Snacks", "Bakery", "Quick Bites", "Noodles"],
  Desserts: ["Cake", "Pastry", "Ice Cream", "Sweets"],
  Combo: ["Tea Combo", "Khaja Combo", "Family Combo", "Lunch Combo"],
};

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

const hasItemOffer = (item: MenuItem) => Number(item.originalPrice || 0) > item.price;

const MenuManagement = () => {
  const [items, setItems] = useList(() =>
    menuItemsApi.list().then((r) => r.map(fromApiMenuItem))
  );
  const [combos, setCombos] = useList(() => comboOffersApi.list());
  const [allIngredients] = useList(() =>
    ingredientsApi.list().then((r) => r.map(fromApiIngredient))
  );
  const [recipe, setRecipe] = useState<ApiMenuItemIngredient[]>([]);
  const [recipeForm, setRecipeForm] = useState({ ingredientId: "", quantity: "" });
  const [categories, setCategories] = useState<CategoryEntry[]>(DEFAULT_MENU_CATEGORIES);
  useEffect(() => {
    const itemCategories = [...new Set(items.map((i) => i.category).filter(Boolean))];
    if (itemCategories.length === 0) return;
    setCategories((prev) => {
      const existing = new Set(prev.map((category) => category.name));
      const missing = itemCategories.filter((name) => !existing.has(name)).map((name) => ({ name }));
      return missing.length ? [...prev, ...missing] : prev;
    });
  }, [items]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSubCategory, setFilterSubCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editCombo, setEditCombo] = useState<ApiComboOffer | null>(null);
  const [qrAds, setQrAds] = useState<QrMenuAd[]>(() => readQrMenuAds());
  const [adForm, setAdForm] = useState<QrMenuAd>({ id: "", title: "", subtitle: "", image: "", link: "", active: true, sortOrder: 1 });
  const [itemMode, setItemMode] = useState<ItemMode>("normal");
  const [form, setForm] = useState({ name: "", category: "", subCategory: "", price: "", originalPrice: "", offerLabel: "", description: "", image: "" });
  const [catForm, setCatForm] = useState<{ name: string; image: string; editing: string | null }>({ name: "", image: "", editing: null });
  const [comboForm, setComboForm] = useState({ name: "", category: "", description: "", price: "", originalPrice: "", image: "", available: true });
  const [comboLines, setComboLines] = useState<ComboLine[]>([{ menuItemId: "", menuItemName: "", quantity: "1" }]);
  const fileRef = useRef<HTMLInputElement>(null);
  const catFileRef = useRef<HTMLInputElement>(null);
  const comboFileRef = useRef<HTMLInputElement>(null);
  const adFileRef = useRef<HTMLInputElement>(null);

  const subCategories = uniqueSorted(items.map((i) => i.subCategory || ""));
  const subMenusByCategory = useMemo(() => {
    const map = new Map<string, string[]>();
    categories.forEach((category) => {
      const fromDefaults = DEFAULT_SUB_MENUS[category.name] || [];
      const fromItems = items
        .filter((item) => item.category === category.name)
        .map((item) => item.subCategory || "");
      map.set(category.name, uniqueSorted([...fromDefaults, ...fromItems]));
    });
    return map;
  }, [categories, items]);
  const formSubMenus = subMenusByCategory.get(form.category) || [];
  const menuStructure = useMemo(() => {
    return categories.map((category) => {
      const categoryItems = items.filter((item) => item.category === category.name);
      const previewItem = categoryItems.find((item) => item.image) || categoryItems[0];
      const subMenus = uniqueSorted([
        ...(DEFAULT_SUB_MENUS[category.name] || []),
        ...categoryItems.map((item) => item.subCategory || ""),
      ]);
      return {
        ...category,
        itemCount: categoryItems.length,
        previewImage: menuFoodImage(previewItem?.name || "", category.name, category.image || previewItem?.image),
        subMenus: subMenus.map((subMenu) => ({
          name: subMenu,
          count: categoryItems.filter((item) => (item.subCategory || "") === subMenu).length,
        })),
      };
    });
  }, [categories, items]);

  const subMenuPreviews = useMemo(() => {
    return subCategories.map((name) => {
      const item = items.find((entry) => entry.subCategory === name);
      return {
        name,
        count: items.filter((entry) => entry.subCategory === name).length,
        image: menuFoodImage(item?.name || name, item?.category || name, item?.image),
      };
    });
  }, [items, subCategories]);

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    const matchSearch = i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || (i.subCategory || "").toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || i.category === filterCategory;
    const matchSub = filterSubCategory === "all" || i.subCategory === filterSubCategory;
    return matchSearch && matchCat && matchSub;
  });

  const openAdd = (mode: ItemMode = "normal") => {
    setEditItem(null);
    setItemMode(mode);
    setForm({ name: "", category: categories[0]?.name || DEFAULT_MENU_CATEGORIES[0].name, subCategory: "", price: "", originalPrice: "", offerLabel: "", description: "", image: "" });
    setRecipe([]);
    setRecipeForm({ ingredientId: "", quantity: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setItemMode(hasItemOffer(item) ? "offer" : "normal");
    setForm({
      name: item.name,
      category: item.category,
      subCategory: item.subCategory || "",
      price: String(item.price),
      originalPrice: item.originalPrice ? String(item.originalPrice) : "",
      offerLabel: item.offerLabel || "",
      description: item.description || "",
      image: item.image || "",
    });
    setRecipeForm({ ingredientId: "", quantity: "" });
    menuItemsApi.listIngredients(Number(item.id)).then(setRecipe).catch(() => setRecipe([]));
    setDialogOpen(true);
  };

  const openAddCombo = () => {
    setEditCombo(null);
    setComboForm({ name: "", category: categories[0]?.name || "Combo", description: "", price: "", originalPrice: "", image: "", available: true });
    setComboLines([{ menuItemId: "", menuItemName: "", quantity: "1" }]);
    setComboDialogOpen(true);
  };

  const openEditCombo = (combo: ApiComboOffer) => {
    setEditCombo(combo);
    setComboForm({
      name: combo.name,
      category: combo.category,
      description: combo.description,
      price: String(combo.price),
      originalPrice: String(combo.original_price || ""),
      image: combo.image || "",
      available: combo.available,
    });
    setComboLines(combo.items.length
      ? combo.items.map((item) => ({
          menuItemId: item.menu_item_id ? String(item.menu_item_id) : "",
          menuItemName: item.menu_item_name,
          quantity: String(item.quantity),
        }))
      : [{ menuItemId: "", menuItemName: "", quantity: "1" }]);
    setComboDialogOpen(true);
  };

  const addRecipeIngredient = async () => {
    if (!editItem) return;
    if (!recipeForm.ingredientId) { toast.error("Select an ingredient"); return; }
    const qty = parseFloat(recipeForm.quantity);
    if (!recipeForm.quantity || qty <= 0) { toast.error("Quantity must be greater than 0"); return; }
    const ing = allIngredients.find((i) => i.id === recipeForm.ingredientId);
    if (!ing) return;
    try {
      await menuItemsApi.addIngredient(Number(editItem.id), { ingredient_id: Number(ing.id), quantity: qty, unit: ing.unit });
      setRecipe(await menuItemsApi.listIngredients(Number(editItem.id)));
      setRecipeForm({ ingredientId: "", quantity: "" });
    } catch (err) { toast.error((err as Error).message); }
  };

  const removeRecipeIngredient = async (ingredientId: number) => {
    if (!editItem) return;
    try {
      await menuItemsApi.removeIngredient(Number(editItem.id), ingredientId);
      setRecipe((prev) => prev.filter((r) => r.ingredient_id !== ingredientId));
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>, target: "item" | "cat" | "combo" | "ad") => {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    if (target === "item") setForm((p) => ({ ...p, image: dataUrl }));
    else if (target === "cat") setCatForm((p) => ({ ...p, image: dataUrl }));
    else if (target === "combo") setComboForm((p) => ({ ...p, image: dataUrl }));
    else setAdForm((p) => ({ ...p, image: dataUrl }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error("Price must be greater than 0"); return; }
    if (!form.category) { toast.error("Please select a category"); return; }
    const sellingPrice = parseFloat(form.price);
    const originalPrice = itemMode === "offer" ? Number(form.originalPrice) || 0 : 0;
    const offerLabel = itemMode === "offer" ? form.offerLabel.trim() : "";
    if (itemMode === "offer" && originalPrice > 0 && originalPrice <= sellingPrice) {
      toast.error("Original price should be greater than offer price");
      return;
    }
    try {
      if (editItem) {
        const updated = await menuItemsApi.update(Number(editItem.id), {
          name: form.name, category: form.category, price: sellingPrice,
          original_price: originalPrice, offer_label: offerLabel,
          sub_category: form.subCategory.trim(), description: form.description, image: form.image || null,
        });
        setItems((prev) => prev.map((i) => i.id === editItem.id ? fromApiMenuItem(updated) : i));
        toast.success("Item updated");
      } else {
        const created = await menuItemsApi.create({
          name: form.name, category: form.category, price: sellingPrice,
          original_price: originalPrice, offer_label: offerLabel,
          sub_category: form.subCategory.trim(), description: form.description, image: form.image || null, available: true,
        });
        const newItem = fromApiMenuItem(created);
        setItems((prev) => [...prev, newItem]);
        if (!categories.some((c) => c.name === created.category)) {
          setCategories((prev) => [...prev, { name: created.category }]);
        }
        toast.success("Item added");
      }
    } catch (err) { toast.error((err as Error).message); return; }
    setDialogOpen(false);
  };

  const updateComboLine = (index: number, patch: Partial<ComboLine>) => {
    setComboLines((prev) => prev.map((line, idx) => {
      if (idx !== index) return line;
      const next = { ...line, ...patch };
      if (patch.menuItemId) {
        const item = items.find((menuItem) => menuItem.id === patch.menuItemId);
        if (item) next.menuItemName = item.name;
      }
      return next;
    }));
  };

  const saveCombo = async () => {
    if (!comboForm.name.trim()) { toast.error("Combo name is required"); return; }
    const price = parseFloat(comboForm.price);
    if (!comboForm.price || price <= 0) { toast.error("Combo price must be greater than 0"); return; }
    const item_inputs = comboLines
      .map((line) => ({
        menu_item_id: line.menuItemId ? Number(line.menuItemId) : null,
        menu_item_name: line.menuItemName.trim(),
        quantity: Math.max(1, Number(line.quantity) || 1),
      }))
      .filter((line) => line.menu_item_id || line.menu_item_name);
    if (item_inputs.length === 0) { toast.error("Add at least one combo item"); return; }

    const payload = {
      name: comboForm.name.trim(),
      category: comboForm.category.trim() || "Combo",
      description: comboForm.description.trim(),
      price,
      original_price: Number(comboForm.originalPrice) || price,
      image: comboForm.image || null,
      available: comboForm.available,
      valid_from: null,
      valid_until: null,
      item_inputs,
    };

    try {
      if (editCombo) {
        const updated = await comboOffersApi.update(editCombo.id, payload);
        setCombos((prev) => prev.map((combo) => combo.id === editCombo.id ? updated : combo));
        toast.success("Combo offer updated");
      } else {
        const created = await comboOffersApi.create(payload);
        setCombos((prev) => [...prev, created]);
        toast.success("Combo offer added");
      }
      setComboDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };

  const deleteCombo = async (comboId: number) => {
    try { await comboOffersApi.delete(comboId); } catch { /* ignore */ }
    setCombos((prev) => prev.filter((combo) => combo.id !== comboId));
    toast.success("Combo offer deleted");
  };

  const persistQrAds = (ads: QrMenuAd[]) => {
    setQrAds(ads);
    writeQrMenuAds(ads);
  };

  const openAddAd = () => {
    setAdForm({
      id: "",
      title: "",
      subtitle: "",
      image: "",
      link: "",
      active: true,
      sortOrder: qrAds.length + 1,
    });
    setAdDialogOpen(true);
  };

  const openEditAd = (ad: QrMenuAd) => {
    setAdForm(ad);
    setAdDialogOpen(true);
  };

  const saveAd = () => {
    if (!adForm.title.trim()) {
      toast.error("Advertisement title is required");
      return;
    }
    const nextAd: QrMenuAd = {
      ...adForm,
      id: adForm.id || String(Date.now()),
      title: adForm.title.trim(),
      subtitle: adForm.subtitle.trim(),
      link: adForm.link.trim(),
      sortOrder: Number(adForm.sortOrder) || qrAds.length + 1,
    };
    const nextAds = adForm.id
      ? qrAds.map((ad) => ad.id === adForm.id ? nextAd : ad)
      : [...qrAds, nextAd];
    persistQrAds(nextAds);
    setAdDialogOpen(false);
    toast.success("QR menu advertisement saved");
  };

  const deleteAd = (id: string) => {
    persistQrAds(qrAds.filter((ad) => ad.id !== id));
    toast.success("Advertisement removed");
  };

  const toggleCombo = async (combo: ApiComboOffer) => {
    comboOffersApi.update(combo.id, { available: !combo.available }).catch(() => {});
    setCombos((prev) => prev.map((item) => item.id === combo.id ? { ...item, available: !item.available } : item));
  };

  const handleDelete = async (id: string) => {
    try { await menuItemsApi.delete(Number(id)); } catch { /* ignore */ }
    setItems(items.filter((i) => i.id !== id));
    toast.success("Item deleted");
  };
  const toggleAvailable = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    menuItemsApi.update(Number(id), { available: !item.available }).catch(() => {});
    setItems(items.map((i) => i.id === id ? { ...i, available: !i.available } : i));
  };

  const openAddCat = () => { setCatForm({ name: "", image: "", editing: null }); setCatDialogOpen(true); };
  const openEditCat = (c: CategoryEntry) => { setCatForm({ name: c.name, image: c.image || "", editing: c.name }); setCatDialogOpen(true); };
  const saveCategory = () => {
    if (!catForm.name.trim()) { toast.error("Category name required"); return; }
    if (catForm.editing) {
      setCategories(categories.map(c => c.name === catForm.editing ? { name: catForm.name, image: catForm.image || undefined } : c));
      if (catForm.editing !== catForm.name) {
        setItems(items.map(i => i.category === catForm.editing ? { ...i, category: catForm.name } : i));
      }
      toast.success("Category updated");
    } else {
      if (categories.some(c => c.name === catForm.name)) { toast.error("Category exists"); return; }
      setCategories([...categories, { name: catForm.name, image: catForm.image || undefined }]);
      toast.success("Category added");
    }
    setCatDialogOpen(false);
  };
  const deleteCategory = (name: string) => {
    if (items.some(i => i.category === name)) { toast.error("Category in use"); return; }
    setCategories(categories.filter(c => c.name !== name));
    toast.success("Category deleted");
  };

  const offerItems = filtered.filter(hasItemOffer);
  const normalItems = filtered.filter((item) => !hasItemOffer(item));

  const renderMenuItemCard = (item: MenuItem) => {
    const hasOffer = hasItemOffer(item);
    const discount = hasOffer ? Math.round(((Number(item.originalPrice) - item.price) / Number(item.originalPrice)) * 100) : 0;

    return (
      <Card key={item.id} className={!item.available ? "opacity-60" : ""}>
        <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted flex items-center justify-center">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, item.name, item.category)} />
          ) : (
            <img src={menuFoodImage(item.name, item.category, null)} alt={item.name} className="w-full h-full object-cover" />
          )}
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{item.name}</CardTitle>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">{item.category}</Badge>
                {item.subCategory && <Badge variant="secondary" className="text-xs">{item.subCategory}</Badge>}
                {hasOffer && <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/10">{item.offerLabel || `${discount}% off`}</Badge>}
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold">Rs. {item.price.toFixed(2)}</span>
              {hasOffer && <p className="text-xs text-muted-foreground line-through">Rs. {Number(item.originalPrice).toFixed(2)}</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {item.description && <p className="text-sm text-muted-foreground mb-3">{item.description}</p>}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={item.available} onCheckedChange={() => toggleAvailable(item.id)} />
              <span className="text-xs text-muted-foreground">{item.available ? "Available" : "Unavailable"}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Menu Management</h1>
          <p className="page-description">Manage your menu items and categories</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <Button
            variant="outline"
            className="h-11 rounded-xl border-2 px-4 text-sm font-semibold shadow-sm hover:border-primary/40 hover:bg-primary/5 sm:min-w-44"
            onClick={openAddCat}
          >
            <FolderPlus className="w-4 h-4 sm:mr-2" />
            <span>Add Category</span>
          </Button>
          <Button
            className="h-11 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--restaurant))] px-5 text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/35 sm:min-w-40"
            onClick={() => openAdd("normal")}
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span>Add Item</span>
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-primary/40 px-5 text-sm font-semibold text-primary shadow-sm hover:bg-primary/5 sm:min-w-40"
            onClick={() => openAdd("offer")}
          >
            <Tags className="w-4 h-4 sm:mr-2" />
            <span>Item Offer</span>
          </Button>
          <Button
            variant="secondary"
            className="col-span-2 h-11 rounded-xl px-5 text-sm font-semibold shadow-sm sm:col-span-1 sm:min-w-40"
            onClick={openAddCombo}
          >
            <Tags className="w-4 h-4 sm:mr-2" />
            <span>Combo Offer</span>
          </Button>
          <Button
            variant="outline"
            className="col-span-2 h-11 rounded-xl border-emerald-300 bg-emerald-50 px-5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 sm:col-span-1 sm:min-w-40"
            onClick={openAddAd}
          >
            <Megaphone className="w-4 h-4 sm:mr-2" />
            <span>QR Ad</span>
          </Button>
        </div>
      </div>

      {/* Categories strip */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2 pr-4">
            {categories.map((c) => (
              <div key={c.name} className="group relative flex-shrink-0 w-24 sm:w-32 rounded-lg border bg-card overflow-hidden hover:border-primary/50 transition">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <img src={menuFoodImage("", c.name, c.image)} alt={c.name} className="w-full h-full object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, "", c.name)} />
                </div>
                <div className="p-2 text-xs font-medium truncate">{c.name}</div>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl" onClick={() => openEditCat(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="destructive" size="icon" className="h-10 w-10 rounded-xl" onClick={() => deleteCategory(c.name)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {subCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Sub Menu</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2 pr-3">
              <button
                type="button"
                onClick={() => setFilterSubCategory("all")}
                className={`flex h-16 min-w-[132px] shrink-0 items-center gap-2 rounded-xl border px-2 text-left transition ${
                  filterSubCategory === "all"
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "bg-card hover:border-primary/50 hover:bg-muted/60"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${filterSubCategory === "all" ? "bg-white/15" : "bg-primary/10"}`}>
                  <Tags className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">All Sub Menu</p>
                  <p className={`text-[11px] ${filterSubCategory === "all" ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{items.length} items</p>
                </div>
              </button>
              {subMenuPreviews.map((sub) => (
                <button
                  key={sub.name}
                  type="button"
                  onClick={() => setFilterSubCategory(sub.name)}
                  className={`flex h-16 min-w-[132px] shrink-0 items-center gap-2 rounded-xl border p-2 text-left transition ${
                    filterSubCategory === sub.name
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "bg-card hover:border-primary/50 hover:bg-muted/60"
                  }`}
                >
                  <img src={sub.image} alt={sub.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, sub.name, sub.name)} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{sub.name}</p>
                    <p className="text-[11px] text-muted-foreground">{sub.count} items</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-emerald-100 bg-emerald-50/40">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-sm">QR Menu Advertisements</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">QR scan garepachi menu ko top area ma offer, event, sponsor, or promotion dekhauna milcha.</p>
          </div>
          <Button type="button" size="sm" className="rounded-xl bg-emerald-700 hover:bg-emerald-800" onClick={openAddAd}>
            <Megaphone className="mr-2 h-4 w-4" /> Add Ad
          </Button>
        </CardHeader>
        <CardContent>
          {qrAds.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
              No QR advertisement yet. Add one to show it in customer QR menu.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {qrAds
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((ad) => (
                  <div key={ad.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${ad.active ? "border-emerald-200" : "opacity-60"}`}>
                    <div className="flex gap-3 p-3">
                      <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50">
                        {ad.image ? (
                          <img src={ad.image} alt={ad.title} className="h-full w-full object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, ad.title, "Offer")} />
                        ) : (
                          <Megaphone className="h-7 w-7 text-emerald-700" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{ad.title}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{ad.subtitle || "No subtitle"}</p>
                          </div>
                          <Badge variant={ad.active ? "default" : "secondary"} className={ad.active ? "bg-emerald-700" : ""}>
                            {ad.active ? "Active" : "Hidden"}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Priority {ad.sortOrder}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEditAd(ad)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive" onClick={() => deleteAd(ad.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full">
          <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} {itemMode === "offer" ? "Item Offer" : "Menu Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 rounded-xl border bg-muted/30 p-1">
              <Button
                type="button"
                variant={itemMode === "normal" ? "default" : "ghost"}
                className="h-10 rounded-lg shadow-none"
                onClick={() => {
                  setItemMode("normal");
                  setForm((prev) => ({ ...prev, originalPrice: "", offerLabel: "" }));
                }}
              >
                Normal Item
              </Button>
              <Button
                type="button"
                variant={itemMode === "offer" ? "default" : "ghost"}
                className="h-10 rounded-lg shadow-none"
                onClick={() => setItemMode("offer")}
              >
                Offer Item
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                  {form.image ? <img src={form.image} alt="" className="w-full h-full object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, form.name, form.category)} /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleImage(e, "item")} />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Upload</Button>
                {form.image && <Button type="button" variant="ghost" className="h-10 rounded-xl gap-2 px-4" onClick={() => setForm({ ...form, image: "" })}><X className="w-3.5 h-3.5" />Remove</Button>}
              </div>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subCategory: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub Menu</Label>
              <Input value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })} placeholder="e.g. Momo, Chowmein, Black Tea, Milk Tea" />
              {formSubMenus.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formSubMenus.map((name) => (
                    <Button
                      key={name}
                      type="button"
                      variant={form.subCategory === name ? "default" : "outline"}
                      size="sm"
                      className="h-8 rounded-full px-3 text-xs shadow-none"
                      onClick={() => setForm({ ...form, subCategory: name })}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{itemMode === "offer" ? "Offer Price (Rs.)" : "Selling Price (Rs.)"}</Label>
                <Input type="number" inputMode="numeric" step="0.01" min="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              {itemMode === "offer" && (
                <div className="space-y-2">
                  <Label>Original Price</Label>
                  <Input type="number" inputMode="numeric" step="0.01" min="0" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} placeholder="Before discount" />
                </div>
              )}
            </div>
            {itemMode === "offer" && (
              <div className="space-y-2"><Label>Offer Label</Label><Input value={form.offerLabel} onChange={(e) => setForm({ ...form, offerLabel: e.target.value })} placeholder="e.g. Today offer, 10% off, Happy hour" /></div>
            )}
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            {editItem && (
              <div className="space-y-2 border-t pt-4">
                <Label>Recipe — Ingredients Used</Label>
                {recipe.length === 0 && <p className="text-xs text-muted-foreground">No ingredients linked yet.</p>}
                <div className="space-y-2">
                  {recipe.map((r) => {
                    const ing = allIngredients.find((a) => Number(a.id) === r.ingredient_id);
                    return (
                      <div key={r.ingredient_id} className="flex items-center justify-between gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
                        <span>{ing?.name ?? `Ingredient #${r.ingredient_id}`}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{r.quantity} {r.unit}</span>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => removeRecipeIngredient(r.ingredient_id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Ingredient</Label>
                    <Select value={recipeForm.ingredientId} onValueChange={(v) => setRecipeForm({ ...recipeForm, ingredientId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {allIngredients.map((ing) => <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1.5">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min="0.01" step="0.01" value={recipeForm.quantity} onChange={(e) => setRecipeForm({ ...recipeForm, quantity: e.target.value })} />
                  </div>
                  <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={addRecipeIngredient}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            <Button onClick={handleSave} className="w-full gap-2"><Save className="w-4 h-4 shrink-0" />Save Item</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adDialogOpen} onOpenChange={setAdDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-xl sm:w-full">
          <DialogHeader><DialogTitle>{adForm.id ? "Edit" : "Add"} QR Menu Advertisement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
              Customer le QR scan garda search/category ko tala advertisement banner dekhincha. Active off gare hide huncha.
            </div>
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {adForm.image ? (
                    <img src={adForm.image} alt="" className="h-full w-full object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, adForm.title, "Offer")} />
                  ) : (
                    <Megaphone className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <input ref={adFileRef} type="file" accept="image/*" hidden onChange={(e) => handleImage(e, "ad")} />
                <Button type="button" variant="outline" onClick={() => adFileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload</Button>
                {adForm.image && <Button type="button" variant="ghost" className="h-10 rounded-xl gap-2 px-4" onClick={() => setAdForm({ ...adForm, image: "" })}><X className="h-3.5 w-3.5" />Remove</Button>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Title</Label>
                <Input value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} placeholder="e.g. Weekend Special Combo" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Short Detail</Label>
                <Input value={adForm.subtitle} onChange={(e) => setAdForm({ ...adForm, subtitle: e.target.value })} placeholder="e.g. Buy 2 momo get cold drink discount" />
              </div>
              <div className="space-y-2">
                <Label>Link (optional)</Label>
                <Input value={adForm.link} onChange={(e) => setAdForm({ ...adForm, link: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input type="number" min="1" value={adForm.sortOrder} onChange={(e) => setAdForm({ ...adForm, sortOrder: Number(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Show in QR menu</p>
                <p className="text-xs text-muted-foreground">Active हुँदा customer QR menu मा देखिन्छ</p>
              </div>
              <Switch checked={adForm.active} onCheckedChange={(active) => setAdForm({ ...adForm, active })} />
            </div>
            <Button onClick={saveAd} className="w-full gap-2 bg-emerald-700 hover:bg-emerald-800">
              <Save className="h-4 w-4" /> Save Advertisement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <DialogHeader><DialogTitle>{catForm.editing ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                  {catForm.image ? <img src={catForm.image} alt="" className="w-full h-full object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, "", catForm.name)} /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                </div>
                <input ref={catFileRef} type="file" accept="image/*" hidden onChange={(e) => handleImage(e, "cat")} />
                <Button type="button" variant="outline" onClick={() => catFileRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Upload</Button>
                {catForm.image && <Button type="button" variant="ghost" className="h-10 rounded-xl gap-2 px-4" onClick={() => setCatForm({ ...catForm, image: "" })}><X className="w-3.5 h-3.5" />Remove</Button>}
              </div>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Snacks" /></div>
            <Button onClick={saveCategory} className="w-full gap-2"><Save className="w-4 h-4 shrink-0" />Save Category</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={comboDialogOpen} onOpenChange={setComboDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl sm:w-full">
          <DialogHeader><DialogTitle>{editCombo ? "Edit" : "Add"} Combo Offer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                  {comboForm.image ? <img src={comboForm.image} alt="" className="w-full h-full object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, comboForm.name, comboForm.category)} /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                </div>
                <input ref={comboFileRef} type="file" accept="image/*" hidden onChange={(e) => handleImage(e, "combo")} />
                <Button type="button" variant="outline" onClick={() => comboFileRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Upload</Button>
                {comboForm.image && <Button type="button" variant="ghost" className="h-10 rounded-xl gap-2 px-4" onClick={() => setComboForm({ ...comboForm, image: "" })}><X className="w-3.5 h-3.5" />Remove</Button>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input value={comboForm.name} onChange={(e) => setComboForm({ ...comboForm, name: e.target.value })} placeholder="e.g. Tea Khaja Combo" /></div>
              <div className="space-y-2"><Label>Category</Label><Input value={comboForm.category} onChange={(e) => setComboForm({ ...comboForm, category: e.target.value })} placeholder="Combo" /></div>
              <div className="space-y-2"><Label>Offer Price</Label><Input type="number" min="0.01" step="0.01" value={comboForm.price} onChange={(e) => setComboForm({ ...comboForm, price: e.target.value })} /></div>
              <div className="space-y-2"><Label>Original Price</Label><Input type="number" min="0" step="0.01" value={comboForm.originalPrice} onChange={(e) => setComboForm({ ...comboForm, originalPrice: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={comboForm.description} onChange={(e) => setComboForm({ ...comboForm, description: e.target.value })} placeholder="Short combo details" /></div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Combo Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setComboLines((prev) => [...prev, { menuItemId: "", menuItemName: "", quantity: "1" }])}>
                  <Plus className="w-4 h-4" /> Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {comboLines.map((line, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_90px_44px]">
                    <Select value={line.menuItemId || "custom"} onValueChange={(value) => updateComboLine(index, value === "custom" ? { menuItemId: "" } : { menuItemId: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom item</SelectItem>
                        {items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="1" value={line.quantity} onChange={(e) => updateComboLine(index, { quantity: e.target.value })} />
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => setComboLines((prev) => prev.filter((_, idx) => idx !== index))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {!line.menuItemId && (
                      <Input className="sm:col-span-3" value={line.menuItemName} onChange={(e) => updateComboLine(index, { menuItemName: e.target.value })} placeholder="Custom combo item name" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Available</p>
                <p className="text-xs text-muted-foreground">Show this combo in menu and QR menu</p>
              </div>
              <Switch checked={comboForm.available} onCheckedChange={(checked) => setComboForm({ ...comboForm, available: checked })} />
            </div>
            <Button onClick={saveCombo} className="w-full gap-2"><Save className="w-4 h-4 shrink-0" />Save Combo</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Menu Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {menuStructure.map((category) => (
              <div key={category.name} className="overflow-hidden rounded-xl border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md">
                <div className="flex gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCategory(category.name);
                      setFilterSubCategory("all");
                    }}
                    className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-muted text-left"
                  >
                    <img src={category.previewImage} alt={category.name} className="h-full w-full object-cover transition duration-300 hover:scale-105" onError={(e) => applyMenuImageFallback(e.currentTarget, "", category.name)} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2">
                      <p className="truncate text-xs font-semibold text-white">{category.itemCount} items</p>
                    </div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold">{category.name}</p>
                        <p className="text-xs text-muted-foreground">{category.subMenus.length} sub-menu groups</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 rounded-full px-2">{category.itemCount}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {category.subMenus.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No sub-menu yet</span>
                      ) : category.subMenus.slice(0, 5).map((sub) => (
                        <button
                          key={sub.name}
                          type="button"
                          className={`rounded-full border px-2 py-1 text-[11px] font-medium transition ${
                            filterSubCategory === sub.name
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-muted/50 hover:border-primary/50 hover:bg-muted"
                          }`}
                          onClick={() => {
                            setFilterCategory(category.name);
                            setFilterSubCategory(sub.name);
                          }}
                        >
                          {sub.name}
                          {sub.count > 0 && <span className="ml-1 opacity-70">{sub.count}</span>}
                        </button>
                      ))}
                      {category.subMenus.length > 5 && (
                        <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          +{category.subMenus.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubCategory} onValueChange={setFilterSubCategory}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub Menu</SelectItem>
            {subCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {combos.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Combo Offers</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {combos.map((combo) => (
                <div key={combo.id} className={`rounded-xl border bg-card p-3 shadow-sm ${combo.available ? "" : "opacity-60"}`}>
                  <div className="flex gap-3">
                    <div className="h-20 w-20 overflow-hidden rounded-lg bg-muted shrink-0">
                      <img src={menuFoodImage(combo.name, combo.category || "Combo", combo.image)} alt={combo.name} className="h-full w-full object-cover" onError={(e) => applyMenuImageFallback(e.currentTarget, combo.name, combo.category || "Combo")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Badge variant="secondary" className="mb-1">{combo.category || "Combo"}</Badge>
                          <p className="truncate font-semibold">{combo.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">Rs. {Number(combo.price).toLocaleString()}</p>
                          {Number(combo.original_price) > Number(combo.price) && <p className="text-xs text-muted-foreground line-through">Rs. {Number(combo.original_price).toLocaleString()}</p>}
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{combo.description || combo.items.map((item) => `${item.quantity}x ${item.menu_item_name}`).join(", ")}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={combo.available} onCheckedChange={() => toggleCombo(combo)} />
                      <span className="text-xs text-muted-foreground">{combo.available ? "Available" : "Hidden"}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => openEditCombo(combo)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => deleteCombo(combo.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {offerItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Menu Item Offers</h2>
              <p className="text-sm text-muted-foreground">Discounted single items shown with offer priority in QR menu.</p>
            </div>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{offerItems.length} offers</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {offerItems.map(renderMenuItemCard)}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Normal Menu Items</h2>
            <p className="text-sm text-muted-foreground">Regular menu items without discount.</p>
          </div>
          <Badge variant="outline">{normalItems.length} items</Badge>
        </div>
        {normalItems.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No normal menu items found. Click <span className="font-semibold text-foreground">Add Item</span> to create regular menu items.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {normalItems.map(renderMenuItemCard)}
          </div>
        )}
      </section>
    </div>
  );
};

export default MenuManagement;
