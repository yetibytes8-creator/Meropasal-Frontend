import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  ClipboardList,
  Coffee,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Warehouse,
  Zap,
} from "lucide-react";
import cafeWorkflowImg from "@/assets/landing-cafe-workflow.jpg";
import inventoryWorkflowImg from "@/assets/landing-inventory-workflow.jpg";
import financeWorkflowImg from "@/assets/landing-finance-workflow.jpg";

const pages = {
  "/how-it-works": {
    eyebrow: "Implementation Flow",
    title: "Setup dekhi daily operation samma clear workflow.",
    intro:
      "Mero Pasal client ko business type herera configure huncha: restaurant, pharmacy, clothes, hardware, kirana, electronics or mixed inventory.",
    image: cafeWorkflowImg,
    icon: ClipboardList,
    cards: [
      { title: "1. Client setup", text: "Company, branch, plan, subdomain, logo, VAT/PAN, print template and allowed modules set garne." },
      { title: "2. Business profile", text: "Clothes, pharmacy, hardware, restaurant, grocery jasto profile choose garera field/module auto adjust garne." },
      { title: "3. Staff access", text: "Owner, manager, cashier, accountant, kitchen, delivery and stock role ko access limit garne." },
      { title: "4. Go live", text: "Products/menu, opening balance, stock, printer, reports, QR menu and backup verify garne." },
    ],
  },
  "/features": {
    eyebrow: "Core Features",
    title: "Billing, stock, finance, branch and reports ekai system ma.",
    intro:
      "Real business ma chaina vanera pachi add garnu naparos bhanera core modules connected architecture ma banाइएको छ.",
    image: inventoryWorkflowImg,
    icon: Zap,
    cards: [
      { title: "Sales & billing", text: "POS, table billing, invoice preview, discount, split payment, refund and receipt print." },
      { title: "Inventory", text: "Product, category, supplier, PO, purchase, stock ledger, expiry, return and adjustment." },
      { title: "Finance", text: "Chart of accounts, journal voucher, receipts, payments, bank/cash, tax, ledgers and reports." },
      { title: "Business config", text: "Client ko business type anusar field, modules, reports and sidebar access enable/disable." },
    ],
  },
  "/modules": {
    eyebrow: "Modules",
    title: "Restaurant, inventory and finance modules client anusar on/off.",
    intro:
      "Sabai client lai sabai feature dekhayera confuse garne haina. Super admin bata needed module matra enable huncha.",
    image: financeWorkflowImg,
    icon: Store,
    cards: [
      { title: "Restaurant / Cafe", text: "Menu, combo offer, QR menu, tables, kitchen, delivery, purchase and billing." },
      { title: "Inventory / Shop", text: "Pharmacy, clothes, hardware, grocery, electronics and general retail inventory flow." },
      { title: "Finance / Accounts", text: "Accountant le sales, purchase, bank, cash, cheque, credit, VAT/TDS and reports manage garne." },
      { title: "Super Admin", text: "Company, plan, role, system configuration, revenue, audit and implementation control." },
    ],
  },
  "/about": {
    eyebrow: "About",
    title: "Mero Pasal is built for Nepali SMEs, not generic demo software.",
    intro:
      "Restaurant owner, shop owner, accountant, cashier, stock staff and super admin sabai ko day-to-day work simplify garne objective ho.",
    image: cafeWorkflowImg,
    icon: ShieldCheck,
    cards: [
      { title: "Nepal-ready", text: "NPR, PAN/VAT, Nepali business workflows, branch, printer and local implementation thinking." },
      { title: "Config-first", text: "Each client gets business-type specific setup instead of one messy universal screen." },
      { title: "Operator friendly", text: "Fast POS, searchable products, simple billing, clear sidebars and role-based access." },
      { title: "Owner focused", text: "Finance, reports, due, refund, stock, branch and audit view owner/accountant ko lagi clear." },
    ],
  },
  "/contact": {
    eyebrow: "Contact",
    title: "Setup, implementation or live deployment ko lagi contact.",
    intro:
      "Client onboarding, domain/subdomain, Docker deployment, printer setup, database backup and staff training ko plan yahi bata सुरु हुन्छ.",
    image: inventoryWorkflowImg,
    icon: Phone,
    cards: [
      { title: "Phone", text: "9867077179" },
      { title: "Email", text: "info@yetibytes.com.np" },
      { title: "Website", text: "yetibytes.com.np" },
      { title: "Implementation", text: "Restaurant, inventory, pharmacy, clothes, hardware and kirana setup available." },
    ],
  },
} as const;

const quickModules = [
  { icon: ChefHat, label: "Restaurant", text: "Menu, order, table, kitchen, billing" },
  { icon: Warehouse, label: "Inventory", text: "Stock, purchase, supplier, expiry" },
  { icon: BarChart3, label: "Finance", text: "Ledger, bank, VAT/TDS, reports" },
  { icon: QrCode, label: "QR Menu", text: "Public menu, offers, table order" },
  { icon: Users, label: "Roles", text: "Owner, cashier, accountant, staff" },
  { icon: CreditCard, label: "Payments", text: "Cash, bank, card, credit, refund" },
];

export default function MarketingInfoPage() {
  const location = useLocation();
  const page = pages[location.pathname as keyof typeof pages] ?? pages["/features"];
  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <Coffee className="h-6 w-6 text-primary" />
            Mero Pasal
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
            <Link className="hover:text-primary" to="/">Home</Link>
            <Link className="hover:text-primary" to="/how-it-works">How it works</Link>
            <Link className="hover:text-primary" to="/features">Features</Link>
            <Link className="hover:text-primary" to="/modules">Modules</Link>
            <Link className="hover:text-primary" to="/pricing">Pricing</Link>
            <Link className="hover:text-primary" to="/about">About</Link>
            <Link className="hover:text-primary" to="/contact">Contact</Link>
          </nav>
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-br from-emerald-50 via-background to-red-50 py-14 sm:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {page.eyebrow}
              </Badge>
              <h1 className="font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                {page.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                {page.intro}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link to="/signup">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/contact">Talk to YetiBytes</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <img src={page.image} alt={page.title} className="h-[320px] w-full object-cover sm:h-[420px]" />
                <div className="absolute left-5 top-5 flex items-center gap-3 rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business-ready</p>
                    <p className="font-semibold">Configured per client</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {page.cards.map((card) => (
                <Card key={card.title} className="h-full border-border/70 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">{card.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/50 bg-muted/20 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge variant="outline" className="mb-3 border-primary/30 text-primary">Platform Coverage</Badge>
                <h2 className="font-display text-3xl font-bold">Modules client anusar मिल्ने</h2>
              </div>
              <Button variant="outline" asChild>
                <Link to="/modules">View modules</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quickModules.map((item) => (
                <div key={item.label} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{item.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-5xl rounded-3xl border border-border bg-slate-950 px-6 py-10 text-center text-white shadow-2xl sm:px-10">
            <Package className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h2 className="font-display text-3xl font-bold">Client ko business type choose garera implementation सुरु गरौँ.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Super admin bata company add, module enable, staff role, branch, finance mapping, print template and domain/subdomain setup हुन्छ.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/signup">Start setup</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <a href="tel:9867077179"><Phone className="mr-2 h-4 w-4" />9867077179</a>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white hover:text-slate-950" asChild>
                <a href="mailto:info@yetibytes.com.np"><Mail className="mr-2 h-4 w-4" />Email</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Powered by YetiBytes Tech Private Limited</p>
          <p className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Kathmandu, Nepal</span>
            <span>yetibytes.com.np</span>
            <span>info@yetibytes.com.np</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
