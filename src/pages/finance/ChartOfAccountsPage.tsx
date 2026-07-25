import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { chartAccounts, type ApiChartAccount } from "@/lib/api";
import { useList } from "@/hooks/use-data";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { BookOpenCheck, FolderPlus, FolderTree, Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";

const accountTypes = [
  { value: "asset", label: "Asset", normal: "Debit", range: "1000 - 1999" },
  { value: "liability", label: "Liability", normal: "Credit", range: "2000 - 2999" },
  { value: "equity", label: "Equity", normal: "Credit", range: "3000 - 3999" },
  { value: "income", label: "Income", normal: "Credit", range: "4000 - 4999" },
  { value: "expense", label: "Expense", normal: "Debit", range: "5000 - 5999" },
] as const;

type AccountType = typeof accountTypes[number]["value"];

type CustomAccountCategory = {
  id: string;
  account_type: AccountType;
  group: string;
  sub_group: string;
};

const defaultGroups: Record<AccountType, string[]> = {
  asset: ["Current Assets", "Cash & Bank", "Receivable", "Inventory", "Fixed Assets"],
  liability: ["Current Liabilities", "Payable", "Payroll Liabilities", "Loan Liabilities", "Tax Payable"],
  equity: ["Capital", "Drawings", "Retained Earnings"],
  income: ["Revenue", "Sales", "Service Income", "Other Income"],
  expense: ["Direct Costs", "Purchase", "Operating Expenses", "Payroll Expenses", "Tax Expense", "Discount & Returns"],
};

const defaultSubGroups: Record<string, string[]> = {
  "Current Assets": ["Cash", "Bank", "Customer Receivable", "Tax Receivable"],
  "Cash & Bank": ["Counter Cash", "Bank Account", "Digital Wallet", "Cheque In Hand"],
  Receivable: ["Customer Ledger", "Staff Advance", "TDS Receivable"],
  Inventory: ["Stock In Hand", "Raw Material", "Finished Goods"],
  "Current Liabilities": ["Supplier Payable", "TDS Payable", "VAT Payable"],
  Payable: ["Supplier Ledger", "Expense Payable", "Cheque Payable"],
  "Payroll Liabilities": ["Salary Payable", "Wages Payable", "Staff Loan"],
  Revenue: ["Sales Revenue", "Service Revenue", "Online Sales"],
  Sales: ["Cash Sales", "Credit Sales", "Return Adjustment"],
  "Operating Expenses": ["Rent", "Utilities", "Office Expense", "Repair & Maintenance"],
  Purchase: ["Stock Purchase", "Purchase Return", "Freight Inward"],
  "Direct Costs": ["COGS", "Packing", "Delivery Cost"],
};

const colorByType: Record<AccountType, string> = {
  asset: "bg-sky-50 text-sky-700 border-sky-200",
  liability: "bg-red-50 text-red-700 border-red-200",
  equity: "bg-violet-50 text-violet-700 border-violet-200",
  income: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expense: "bg-amber-50 text-amber-700 border-amber-200",
};

const typeLabel = (type: AccountType) => accountTypes.find((item) => item.value === type)?.label ?? type;
const normalBalance = (type: AccountType) => accountTypes.find((item) => item.value === type)?.normal ?? "-";

const emptyForm = {
  code: "",
  name: "",
  account_type: "asset" as AccountType,
  group: "",
  sub_group: "",
  opening_debit: "0",
  opening_credit: "0",
  is_active: true,
};

const emptyCategoryForm = {
  account_type: "asset" as AccountType,
  group: "",
  sub_group: "",
};

const CUSTOM_COA_CATEGORIES_KEY = "mero-pasal-custom-coa-categories";

const readCustomCategories = (): CustomAccountCategory[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_COA_CATEGORIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCustomCategories = (categories: CustomAccountCategory[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_COA_CATEGORIES_KEY, JSON.stringify(categories));
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useList(() => chartAccounts.list());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiChartAccount | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "all">("all");
  const [customCategories, setCustomCategories] = useState<CustomAccountCategory[]>(() => readCustomCategories());
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);

  const groupsForType = useMemo(
    () => Array.from(new Set([
      ...(defaultGroups[form.account_type] ?? []),
      ...customCategories.filter((c) => c.account_type === form.account_type).map((c) => c.group).filter(Boolean),
      ...accounts.filter((a) => a.account_type === form.account_type).map((a) => a.group).filter(Boolean),
    ])).sort(),
    [accounts, customCategories, form.account_type],
  );

  const subGroupsForGroup = useMemo(
    () => Array.from(new Set([
      ...(defaultSubGroups[form.group] ?? []),
      ...customCategories.filter((c) => c.account_type === form.account_type && c.group === form.group).map((c) => c.sub_group).filter(Boolean),
      ...accounts.filter((a) => a.account_type === form.account_type && a.group === form.group).map((a) => a.sub_group).filter(Boolean),
    ])).sort(),
    [accounts, customCategories, form.account_type, form.group],
  );

  const filteredAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesType = typeFilter === "all" || account.account_type === typeFilter;
      const matchesQuery = !q ||
        account.code.toLowerCase().includes(q) ||
        account.name.toLowerCase().includes(q) ||
        account.group.toLowerCase().includes(q) ||
        (account.sub_group || "").toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [accounts, query, typeFilter]);

  const hierarchy = useMemo(() => {
    const tree = new Map<AccountType, Map<string, Map<string, ApiChartAccount[]>>>();
    filteredAccounts.forEach((account) => {
      if (!tree.has(account.account_type)) tree.set(account.account_type, new Map());
      const group = account.group || "Ungrouped";
      const subGroup = account.sub_group || "General Ledger";
      const groupMap = tree.get(account.account_type)!;
      if (!groupMap.has(group)) groupMap.set(group, new Map());
      const subMap = groupMap.get(group)!;
      subMap.set(subGroup, [...(subMap.get(subGroup) || []), account]);
    });
    return accountTypes
      .filter((type) => tree.has(type.value))
      .map((type) => ({
        ...type,
        groups: Array.from(tree.get(type.value)!.entries()).map(([groupName, subMap]) => ({
          groupName,
          total: Array.from(subMap.values()).reduce((sum, rows) => sum + rows.length, 0),
          subGroups: Array.from(subMap.entries()).map(([subGroupName, rows]) => ({
            subGroupName,
            rows: rows.sort((a, b) => a.code.localeCompare(b.code)),
          })),
        })),
      }));
  }, [filteredAccounts]);

  const summary = accountTypes.map((type) => {
    const rows = accounts.filter((account) => account.account_type === type.value);
    const groupCount = new Set(rows.map((row) => row.group).filter(Boolean)).size;
    const subGroupCount = new Set(rows.map((row) => row.sub_group).filter(Boolean)).size;
    return { ...type, count: rows.length, groupCount, subGroupCount };
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openCategoryCreate = (accountType: AccountType = "asset", group = "") => {
    setCategoryForm({ account_type: accountType, group, sub_group: "" });
    setCategoryOpen(true);
  };

  const saveCategory = () => {
    const group = categoryForm.group.trim();
    const subGroup = categoryForm.sub_group.trim();
    if (!group) {
      toast.error("Group name is required");
      return;
    }
    const exists = customCategories.some((category) =>
      category.account_type === categoryForm.account_type &&
      category.group.toLowerCase() === group.toLowerCase() &&
      category.sub_group.toLowerCase() === subGroup.toLowerCase()
    );
    if (exists) {
      toast.error("This group/sub-group already exists");
      return;
    }
    const next = [
      ...customCategories,
      { id: String(Date.now()), account_type: categoryForm.account_type, group, sub_group: subGroup },
    ];
    setCustomCategories(next);
    writeCustomCategories(next);
    setCategoryOpen(false);
    toast.success(subGroup ? "Sub-group created" : "Group created");
  };

  const openEdit = (account: ApiChartAccount) => {
    setEditing(account);
    setForm({
      code: account.code,
      name: account.name,
      account_type: account.account_type,
      group: account.group || "",
      sub_group: account.sub_group || "",
      opening_debit: String(account.opening_debit || 0),
      opening_credit: String(account.opening_credit || 0),
      is_active: account.is_active,
    });
    setOpen(true);
  };

  const saveAccount = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and ledger name are required");
      return;
    }
    if (!form.group.trim()) {
      toast.error("Group is required");
      return;
    }
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      account_type: form.account_type,
      group: form.group.trim(),
      sub_group: form.sub_group.trim(),
      opening_debit: Number(form.opening_debit) || 0,
      opening_credit: Number(form.opening_credit) || 0,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        const updated = await chartAccounts.update(editing.id, payload);
        setAccounts((prev) => prev.map((account) => account.id === editing.id ? updated : account));
        toast.success("Ledger updated");
      } else {
        const created = await chartAccounts.create(payload);
        setAccounts((prev) => [...prev, created]);
        toast.success("Ledger added");
      }
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header">Chart of Accounts</h1>
          <p className="page-description">Group, sub-group, and ledger setup for accounting entries</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => openCategoryCreate()} className="gap-2">
            <FolderPlus className="h-4 w-4" /> Create Category
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Ledger
          </Button>
        </div>
      </div>

      <FinanceStatementHeader
        title="Chart of Accounts"
        subtitle="Structured account map used for ledger, day book, and financial reports"
        periodLabel="Active account map"
        reportNo="COA"
        basis="Account type, group, sub-group and ledger classification"
      >
        <div className="coa-print-report hidden print:block">
          <h3 className="coa-print-section-title">Account Structure Summary</h3>
          <table className="coa-print-table">
            <thead>
              <tr>
                <th>Account Type</th>
                <th>Ledgers</th>
                <th>Groups</th>
                <th>Sub Groups</th>
                <th>Normal Balance</th>
                <th>Code Range</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.value}>
                  <td>{row.label}</td>
                  <td>{row.count}</td>
                  <td>{row.groupCount}</td>
                  <td>{row.subGroupCount}</td>
                  <td>{row.normal}</td>
                  <td>{row.range}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="coa-print-section-title">Group / Sub Group Master</h3>
          <table className="coa-print-table coa-group-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Group</th>
                <th>Sub Groups</th>
              </tr>
            </thead>
            <tbody>
              {accountTypes.flatMap((type) => {
                const groups = Array.from(new Set([
                  ...(defaultGroups[type.value] ?? []),
                  ...customCategories.filter((category) => category.account_type === type.value).map((category) => category.group),
                  ...accounts.filter((account) => account.account_type === type.value).map((account) => account.group).filter(Boolean),
                ])).sort();
                return groups.map((group) => {
                  const subGroups = Array.from(new Set([
                    ...(defaultSubGroups[group] ?? []),
                    ...customCategories.filter((category) => category.account_type === type.value && category.group === group).map((category) => category.sub_group).filter(Boolean),
                    ...accounts.filter((account) => account.account_type === type.value && account.group === group).map((account) => account.sub_group).filter(Boolean),
                  ])).sort();
                  return (
                    <tr key={`${type.value}-${group}`}>
                      <td>{type.label}</td>
                      <td>{group}</td>
                      <td>{subGroups.length ? subGroups.join(", ") : "-"}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>

          <h3 className="coa-print-section-title">Ledger Account List</h3>
          <table className="coa-print-table coa-ledger-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Ledger Name</th>
                <th>Type</th>
                <th>Group</th>
                <th>Sub Group</th>
                <th>Normal</th>
                <th>Opening Dr</th>
                <th>Opening Cr</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.code}</td>
                  <td>{account.name}</td>
                  <td>{typeLabel(account.account_type)}</td>
                  <td>{account.group || "-"}</td>
                  <td>{account.sub_group || "-"}</td>
                  <td>{normalBalance(account.account_type)}</td>
                  <td>Rs. {Number(account.opening_debit || 0).toLocaleString()}</td>
                  <td>Rs. {Number(account.opening_credit || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7}>Total Ledgers</td>
                <td>{filteredAccounts.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </FinanceStatementHeader>

      <Card className="print:hidden">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FolderTree className="h-4 w-4" />Account Structure Summary</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summary.map((row) => (
            <div key={row.value} className="rounded-xl border bg-card p-4">
              <Badge variant="outline" className={colorByType[row.value]}>{row.label}</Badge>
              <p className="mt-3 text-2xl font-bold">{row.count}</p>
              <p className="text-xs text-muted-foreground">{row.groupCount} groups • {row.subGroupCount} sub-groups • {row.normal}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{row.range}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base"><FolderPlus className="h-4 w-4" />Group / Sub Group Master</CardTitle>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => openCategoryCreate()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {accountTypes.map((type) => {
            const groups = Array.from(new Set([
              ...(defaultGroups[type.value] ?? []),
              ...customCategories.filter((category) => category.account_type === type.value).map((category) => category.group),
              ...accounts.filter((account) => account.account_type === type.value).map((account) => account.group).filter(Boolean),
            ])).sort();
            return (
              <div key={type.value} className="rounded-xl border bg-card p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge variant="outline" className={colorByType[type.value]}>{type.label}</Badge>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => openCategoryCreate(type.value)}>
                    <Plus className="mr-1 h-3 w-3" /> Group
                  </Button>
                </div>
                <div className="space-y-2">
                  {groups.map((group) => {
                    const subGroups = Array.from(new Set([
                      ...(defaultSubGroups[group] ?? []),
                      ...customCategories.filter((category) => category.account_type === type.value && category.group === group).map((category) => category.sub_group).filter(Boolean),
                      ...accounts.filter((account) => account.account_type === type.value && account.group === group).map((account) => account.sub_group).filter(Boolean),
                    ])).sort();
                    return (
                      <div key={group} className="rounded-lg border bg-muted/20 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{group}</p>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => openCategoryCreate(type.value, group)}>
                            <Plus className="mr-1 h-3 w-3" /> Sub
                          </Button>
                        </div>
                        {subGroups.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {subGroups.slice(0, 5).map((subGroup) => (
                              <Badge key={subGroup} variant="secondary" className="max-w-full truncate text-[10px]">{subGroup}</Badge>
                            ))}
                            {subGroups.length > 5 && <Badge variant="outline" className="text-[10px]">+{subGroups.length - 5}</Badge>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px] print:hidden">
        <Input placeholder="Search code, ledger, group, sub-group..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AccountType | "all")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Account Types</SelectItem>
            {accountTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {hierarchy.map((type) => (
          <Card key={type.value} className="overflow-hidden print:hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4" />{type.label}</span>
                <Badge variant="outline" className={colorByType[type.value]}>{normalBalance(type.value)} normal</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {type.groups.map((group) => (
                <div key={group.groupName} className="rounded-xl border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
                    <div>
                      <p className="font-semibold">{group.groupName}</p>
                      <p className="text-xs text-muted-foreground">{group.total} ledgers</p>
                    </div>
                    <Badge variant="secondary">{group.subGroups.length} sub-groups</Badge>
                  </div>
                  <div className="divide-y">
                    {group.subGroups.map((subGroup) => (
                      <div key={subGroup.subGroupName} className="p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-muted-foreground">{subGroup.subGroupName}</p>
                          <Badge variant="outline">{subGroup.rows.length}</Badge>
                        </div>
                        <div className="overflow-x-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Ledger Name</TableHead>
                                <TableHead>Opening Dr</TableHead>
                                <TableHead>Opening Cr</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {subGroup.rows.map((account) => (
                                <TableRow key={account.id}>
                                  <TableCell className="font-mono text-sm">{account.code}</TableCell>
                                  <TableCell className="font-medium">{account.name}</TableCell>
                                  <TableCell>Rs. {Number(account.opening_debit || 0).toLocaleString()}</TableCell>
                                  <TableCell>Rs. {Number(account.opening_credit || 0).toLocaleString()}</TableCell>
                                  <TableCell><Badge variant={account.is_active ? "default" : "secondary"}>{account.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEdit(account)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="print:hidden">
        <CardHeader><CardTitle className="text-base">Flat Ledger List</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Ledger</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Sub Group</TableHead>
                <TableHead>Normal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono text-sm">{account.code}</TableCell>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell><Badge variant="outline" className={colorByType[account.account_type]}>{typeLabel(account.account_type)}</Badge></TableCell>
                  <TableCell>{account.group || "-"}</TableCell>
                  <TableCell>{account.sub_group || "-"}</TableCell>
                  <TableCell>{normalBalance(account.account_type)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5}>Total Ledgers</TableCell>
                <TableCell className="text-right">{filteredAccounts.length}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full">
          <DialogHeader><DialogTitle>Create Group / Sub Group</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
              Group only save garda main category create huncha. Sub Group pani rakhe tyo group vitra ledger category ready huncha.
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={categoryForm.account_type} onValueChange={(value) => setCategoryForm({ ...categoryForm, account_type: value as AccountType, group: "", sub_group: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{accountTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Input
                list="coa-category-groups"
                value={categoryForm.group}
                onChange={(e) => setCategoryForm({ ...categoryForm, group: e.target.value })}
                placeholder="e.g. Cash & Bank, Purchase, Payroll Liabilities"
              />
              <datalist id="coa-category-groups">
                {Array.from(new Set([
                  ...(defaultGroups[categoryForm.account_type] ?? []),
                  ...customCategories.filter((category) => category.account_type === categoryForm.account_type).map((category) => category.group),
                  ...accounts.filter((account) => account.account_type === categoryForm.account_type).map((account) => account.group).filter(Boolean),
                ])).sort().map((group) => <option key={group} value={group} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Sub Group (optional)</Label>
              <Input
                value={categoryForm.sub_group}
                onChange={(e) => setCategoryForm({ ...categoryForm, sub_group: e.target.value })}
                placeholder="e.g. Bank Account, Supplier Ledger, VAT Payable"
              />
            </div>
            <Button onClick={saveCategory} className="w-full gap-2">
              <Save className="h-4 w-4" /> Save Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl sm:w-full">
          <DialogHeader><DialogTitle>{editing ? "Edit Ledger" : "Add Ledger"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={form.account_type} onValueChange={(value) => setForm({ ...form, account_type: value as AccountType, group: "", sub_group: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{accountTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ledger Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 1010" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Ledger Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nabil Bank Account" />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Input list="coa-groups" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value, sub_group: "" })} placeholder="e.g. Cash & Bank" />
                <datalist id="coa-groups">{groupsForType.map((group) => <option key={group} value={group} />)}</datalist>
              </div>
              <div className="space-y-2">
                <Label>Sub Group</Label>
                <Input list="coa-sub-groups" value={form.sub_group} onChange={(e) => setForm({ ...form, sub_group: e.target.value })} placeholder="e.g. Bank Account" />
                <datalist id="coa-sub-groups">{subGroupsForGroup.map((subGroup) => <option key={subGroup} value={subGroup} />)}</datalist>
              </div>
              <div className="space-y-2">
                <Label>Opening Debit</Label>
                <Input type="number" min="0" value={form.opening_debit} onChange={(e) => setForm({ ...form, opening_debit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Opening Credit</Label>
                <Input type="number" min="0" value={form.opening_credit} onChange={(e) => setForm({ ...form, opening_credit: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Active Ledger</p>
                <p className="text-xs text-muted-foreground">Inactive ledger report मा रहन्छ तर new posting मा hide गर्न सकिन्छ</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(is_active) => setForm({ ...form, is_active })} />
            </div>
            <Button onClick={saveAccount} className="w-full gap-2">
              <Save className="h-4 w-4" /> Save Ledger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
