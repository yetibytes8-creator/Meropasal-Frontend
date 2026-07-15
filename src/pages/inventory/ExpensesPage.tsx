import { useState } from "react";
import { expenses as expensesApi } from "@/lib/api";
import { fromApiExpense } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import type { Expense } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import StatCard from "@/components/StatCard";
import { toast } from "sonner";
import { Plus, Search, Receipt, TrendingDown, Clock, CheckCircle2, X } from "lucide-react";

const categoryLabels: Record<Expense["category"], string> = {
  rent: "Rent",
  utilities: "Utilities",
  supplies: "Supplies",
  marketing: "Marketing",
  maintenance: "Maintenance",
  salary: "Salary",
  other: "Other",
};

const ExpensesPage = () => {
  const [expensesList, setExpensesList] = useList(() =>
    expensesApi.list().then((r) => r.map(fromApiExpense))
  );
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // New expense form
  const [newExpense, setNewExpense] = useState({ category: "supplies" as Expense["category"], description: "", amount: "", paidBy: "" });

  const filtered = expensesList.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) || e.paidBy.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === "all" || e.category === filterCategory;
    const matchesStatus = filterStatus === "all" || e.status === filterStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const totalExpenses = expensesList.reduce((s, e) => s + e.amount, 0);
  const pendingCount = expensesList.filter((e) => e.status === "pending").length;
  const approvedTotal = expensesList.filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0);
  const thisMonthTotal = expensesList.filter((e) => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0);

  const handleAdd = async () => {
    if (!newExpense.description.trim()) { toast.error("Description is required"); return; }
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!newExpense.paidBy.trim()) { toast.error("Paid by is required"); return; }
    try {
      const created = await expensesApi.create({
        category: newExpense.category, description: newExpense.description,
        amount: parseFloat(newExpense.amount), date: new Date().toISOString().split("T")[0],
        paid_by: newExpense.paidBy, status: "pending", receipt: null,
      });
      setExpensesList((prev) => [fromApiExpense(created), ...prev]);
      setNewExpense({ category: "supplies", description: "", amount: "", paidBy: "" });
      setDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleApprove = (id: string) => {
    expensesApi.update(Number(id), { status: "approved" }).catch(() => {});
    setExpensesList((prev) => prev.map((e) => (e.id === id ? { ...e, status: "approved" as const } : e)));
  };

  const handleReject = (id: string) => {
    expensesApi.update(Number(id), { status: "rejected" }).catch(() => {});
    setExpensesList((prev) => prev.map((e) => (e.id === id ? { ...e, status: "rejected" as const } : e)));
  };

  const statusBadge = (status: Expense["status"]) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/10 text-warning border-warning/20",
      approved: "bg-success/10 text-success border-success/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return <Badge variant="outline" className={styles[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Expenses</h1>
          <p className="page-description">Track and manage business expenses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 shrink-0 rounded-xl px-4 font-semibold shadow-sm sm:px-5">
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full">
            <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v as Expense["category"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="What was this expense for?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (Rs. )</Label>
                  <Input type="number" inputMode="numeric" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Paid By</Label>
                  <Input value={newExpense.paidBy} onChange={(e) => setNewExpense({ ...newExpense, paidBy: e.target.value })} placeholder="Staff name" />
                </div>
              </div>
              <Button className="w-full gap-2" onClick={handleAdd}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />Submit Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Expenses" value={`Rs. ${totalExpenses.toLocaleString()}`} icon={<Receipt className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
        <StatCard title="This Month" value={`Rs. ${thisMonthTotal.toLocaleString()}`} icon={<TrendingDown className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard title="Pending Approval" value={pendingCount} icon={<Clock className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
        <StatCard title="Approved Total" value={`Rs. ${approvedTotal.toLocaleString()}`} icon={<CheckCircle2 className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="flex-1 sm:w-40 sm:flex-none"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="flex-1 sm:w-36 sm:flex-none"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.date}</TableCell>
                  <TableCell className="font-medium text-sm">{e.description}</TableCell>
                  <TableCell><Badge variant="secondary">{categoryLabels[e.category]}</Badge></TableCell>
                  <TableCell className="text-sm">{e.paidBy}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">Rs. {e.amount.toLocaleString()}</TableCell>
                  <TableCell>{statusBadge(e.status)}</TableCell>
                  <TableCell>
                    {e.status === "pending" && (
                      <div className="flex gap-1">
                        <Button variant="ghost" className="h-10 rounded-xl px-3 gap-2 text-success" onClick={() => handleApprove(e.id)}>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Approve</span>
                        </Button>
                        <Button variant="ghost" className="h-10 rounded-xl px-3 gap-2 text-destructive" onClick={() => handleReject(e.id)}>
                          <X className="w-3.5 h-3.5 shrink-0" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No expenses found</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;


