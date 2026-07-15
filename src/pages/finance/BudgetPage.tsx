import { useState } from "react";
import { budgets as budgetsApi, expenses as expensesApi, type ApiBudget } from "@/lib/api";
import { useList } from "@/hooks/use-data";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, PiggyBank, Pencil } from "lucide-react";
import type { Expense } from "@/types";
import { fromApiExpense } from "@/lib/transforms";

const CATEGORY_LABELS: Record<ApiBudget["category"], string> = {
  rent: "Rent", utilities: "Utilities", supplies: "Supplies",
  marketing: "Marketing", maintenance: "Maintenance", salary: "Salary", other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  rent: "bg-blue-500", utilities: "bg-yellow-500", supplies: "bg-green-500",
  marketing: "bg-purple-500", maintenance: "bg-orange-500", salary: "bg-red-500", other: "bg-gray-400",
};

const thisMonth = new Date().toISOString().slice(0, 7);

const BudgetPage = () => {
  const [month, setMonth] = useState(thisMonth);
  const [budgetList, setBudgetList] = useList(() => budgetsApi.list(thisMonth), []);
  const [expenses, setExpenses] = useList(() => expensesApi.list().then((r) => r.map(fromApiExpense)));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<ApiBudget | null>(null);
  const [form, setForm] = useState({ category: "rent" as ApiBudget["category"], amount: "" });

  // Reload budgets when month changes
  const loadBudgets = async () => {
    try {
      const result = await budgetsApi.list(month);
      setBudgetList(result);
    } catch { /* ignore */ }
  };

  const monthExpenses = expenses.filter((e: Expense) => e.date.startsWith(month));
  const actualByCategory = monthExpenses.reduce<Record<string, number>>((acc, e: Expense) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const totalBudget = budgetList.reduce((s, b) => s + Number(b.amount), 0);
  const totalActual = Object.values(actualByCategory).reduce((s, v) => s + v, 0);

  const openAdd = () => { setEditBudget(null); setForm({ category: "rent", amount: "" }); setDialogOpen(true); };
  const openEdit = (b: ApiBudget) => { setEditBudget(b); setForm({ category: b.category, amount: String(b.amount) }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    try {
      if (editBudget) {
        const updated = await budgetsApi.update(editBudget.id, { amount: parseFloat(form.amount) });
        setBudgetList((prev) => prev.map((b) => b.id === editBudget.id ? updated : b));
        toast.success("Budget updated");
      } else {
        const created = await budgetsApi.create({ category: form.category, month, amount: parseFloat(form.amount) });
        setBudgetList((prev) => [...prev, created]);
        toast.success("Budget set");
      }
      setDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Budget</h1>
          <p className="page-description">Set monthly spending limits and track actuals</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setTimeout(loadBudgets, 0); }} className="w-36 h-9" />
          <Button size="sm" className="gap-1.5" onClick={openAdd}>
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Set Budget</span>
          </Button>
        </div>
      </div>

      <FinanceStatementHeader
        title="Budget Control Statement"
        subtitle="Monthly budget, actual spent, and remaining balance by category"
        periodLabel={`Month ${month}`}
        reportNo={`BUD-${month.replace("-", "")}`}
        basis="Budget entries compared with recorded expenses"
      />

      {/* Category breakdown */}
      {budgetList.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">No budgets set for this month</p>
            <Button variant="outline" className="mt-4 gap-1.5" onClick={openAdd}>
              <Plus className="w-4 h-4" />Set First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Budget Details</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual Spent</TableHead>
                  <TableHead className="text-right">Remaining / Over</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetList.map((b) => {
                  const actual = actualByCategory[b.category] || 0;
                  const budget = Number(b.amount);
                  const over = actual > budget;
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 font-medium">
                          <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[b.category]}`} />
                          {CATEGORY_LABELS[b.category]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-finance">Rs. {budget.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-semibold ${over ? "text-destructive" : "text-foreground"}`}>Rs. {actual.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-semibold ${over ? "text-destructive" : "text-success"}`}>
                        Rs. {Math.abs(budget - actual).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {over
                          ? <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Over Budget</Badge>
                          : <Badge variant="outline" className="bg-success/10 text-success border-success/20">Within Budget</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">Rs. {totalBudget.toLocaleString()}</TableCell>
                  <TableCell className="text-right">Rs. {totalActual.toLocaleString()}</TableCell>
                  <TableCell className="text-right">Rs. {Math.abs(totalBudget - totalActual).toLocaleString()}</TableCell>
                  <TableCell colSpan={2}>{totalActual > totalBudget ? "Over budget" : "Remaining budget"}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-full">
          <DialogHeader><DialogTitle>{editBudget ? "Edit Budget" : "Set Budget"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!editBudget && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ApiBudget["category"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Monthly Budget (Rs. )</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave}>{editBudget ? "Update" : "Set Budget"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetPage;
