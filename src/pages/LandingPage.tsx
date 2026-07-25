import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Coffee, BarChart3, ShieldCheck, Zap,
  ArrowRight, Check, Star, ChefHat, Warehouse, CreditCard,
  Clock, Smartphone, Menu, X, Sparkles, TrendingUp, Activity,
  Package, Bell, Users, QrCode, Receipt, BarChart2,
  ClipboardList, ChevronRight, MapPin, Phone, Mail,
  Facebook, Instagram, Youtube,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import dashboardImg from "@/assets/dashboard-preview.jpg";
import cafeWorkflowImg from "@/assets/landing-cafe-workflow.jpg";
import inventoryWorkflowImg from "@/assets/landing-inventory-workflow.jpg";
import financeWorkflowImg from "@/assets/landing-finance-workflow.jpg";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Features", to: "/features" },
  { label: "Modules", to: "/modules" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const features = [
  { icon: Zap, title: "Real-Time Dashboard", desc: "Live analytics, order tracking, and business insights at a glance." },
  { icon: ShieldCheck, title: "Role-Based Access", desc: "Admin, Manager, Cashier, Kitchen — each role sees only what they need." },
  { icon: BarChart3, title: "Advanced Reports", desc: "Sales trends, expense breakdowns, and profit analytics with beautiful charts." },
  { icon: CreditCard, title: "Billing & Invoicing", desc: "Automated invoicing, payment tracking, and subscription management." },
  { icon: QrCode, title: "QR Menu & Tables", desc: "Contactless QR ordering, table layout management, and reservations." },
  { icon: Smartphone, title: "Multi-Device Ready", desc: "Works beautifully on desktop, tablet, mobile, and kitchen display screens." },
];

const cafeFeatures = [
  "Menu management with categories",
  "Table management & reservations",
  "Kitchen display system (KDS)",
  "Order tracking & POS",
  "Customer loyalty programs",
  "Staff scheduling & roles",
];

const inventoryFeatures = [
  "Product & stock management",
  "Supplier management",
  "Purchase order tracking",
  "Low-stock alerts & notifications",
  "Expense tracking & reports",
  "Barcode scanning support",
];

const plans = [
  {
    name: "Free Trial", price: "0", period: "14 days",
    desc: "Try any module free for 14 days. No credit card required.",
    features: ["Choose Cafe or Inventory", "Full feature access", "14-day duration", "No commitment"],
    cta: "Start Free Trial", popular: false,
  },
  {
    name: "Cafe Plan", price: "29", period: "/month",
    desc: "Everything you need to run your cafe smoothly.",
    features: ["Full Cafe module access", "Unlimited orders", "Kitchen display", "Staff management", "Reports & analytics", "Priority support"],
    cta: "Subscribe Now", popular: true,
  },
  {
    name: "Inventory Plan", price: "29", period: "/month",
    desc: "Complete inventory and stock management solution.",
    features: ["Full Inventory module access", "Unlimited products", "Supplier management", "Purchase orders", "Expense tracking", "Advanced reports"],
    cta: "Subscribe Now", popular: false,
  },
  {
    name: "Combo Plan", price: "49", period: "/month",
    desc: "Get both modules at a discounted price.",
    features: ["Cafe + Inventory access", "Everything in both plans", "Cross-module reports", "Unlimited staff", "Priority support", "Early access to features"],
    cta: "Get Combo", popular: false,
  },
];

const testimonials = [
  { name: "Aarav Sharma", role: "Cafe Owner, Kathmandu", text: "Mero Pasal transformed how we run our cafe. Orders are faster, inventory is tracked, and I finally have real business insights.", stars: 5 },
  { name: "Priya Thapa", role: "Restaurant Manager", text: "The kitchen display and table management features alone saved us hours every week. Staff love it and customers notice the speed.", stars: 5 },
  { name: "Rajesh Khadka", role: "Shop Owner, Pokhara", text: "Finally an inventory system that's simple and powerful. The low-stock alerts have prevented so many costly stockouts.", stars: 5 },
  { name: "Sunita Gurung", role: "Bakery Owner, Lalitpur", text: "Setup took less than 10 minutes. QR menus are a hit with customers and billing is 3x faster than before.", stars: 5 },
  { name: "Bibek Rai", role: "Store Manager, Biratnagar", text: "The reports section gives me a clear picture of my business every morning. I can't imagine running the shop without it now.", stars: 5 },
  { name: "Anita Karki", role: "Restaurant Owner, Bhaktapur", text: "Combo plan is worth every rupee. Managing both the kitchen and stock from one place is a game-changer.", stars: 5 },
];

const brandStrip = ["Himalayan Java", "Bakery Café", "Pasal Mart", "Newa Kitchen", "Thakali House", "Café Soma", "Le Sherpa", "Roadhouse", "Spice Garden", "Urban Bites"];

const steps = [
  {
    step: "01",
    icon: Coffee,
    title: "Choose Your Module",
    desc: "Pick Cafe, Inventory, or Combo based on how your business runs today.",
    badge: "Start",
    details: ["Cafe", "Inventory", "Combo"],
  },
  {
    step: "02",
    icon: ClipboardList,
    title: "Set Up Your Business",
    desc: "Add menu items, tables, products, suppliers, taxes, and billing settings in one place.",
    badge: "Setup",
    details: ["Menu", "Products", "Tables"],
  },
  {
    step: "03",
    icon: Users,
    title: "Invite Your Team",
    desc: "Give staff the right access for counter sales, kitchen, stock, accounts, and admin work.",
    badge: "Team",
    details: ["Owner", "Cashier", "Kitchen"],
  },
  {
    step: "04",
    icon: TrendingUp,
    title: "Run & Improve",
    desc: "Track live orders, stock movement, dues, refunds, and profit reports every day.",
    badge: "Growth",
    details: ["Orders", "Stock", "Reports"],
  },
];

const visualStories = [
  {
    title: "Cafe orders stay moving",
    desc: "Counter sales, kitchen queue, receipts, and daily insights stay connected from the same dashboard.",
    image: cafeWorkflowImg,
    icon: ChefHat,
    accent: "text-[hsl(var(--restaurant))]",
    bg: "bg-[hsl(var(--restaurant)/0.12)]",
  },
  {
    title: "Stock is always visible",
    desc: "Products, supplier boxes, low-stock alerts, and purchase planning are easy to scan before the rush.",
    image: inventoryWorkflowImg,
    icon: Warehouse,
    accent: "text-[hsl(var(--inventory))]",
    bg: "bg-[hsl(var(--inventory)/0.12)]",
  },
  {
    title: "Money gets clearer",
    desc: "Revenue, invoices, dues, and reports give owners a daily picture of what is happening.",
    image: financeWorkflowImg,
    icon: BarChart3,
    accent: "text-[hsl(var(--finance))]",
    bg: "bg-[hsl(var(--finance)/0.12)]",
  },
];

const footerLinks = {
  Product: [
    { label: "Order Management", to: "/features" },
    { label: "Inventory Tracking", to: "/features" },
    { label: "Table Management", to: "/features" },
    { label: "Kitchen Display", to: "/features" },
    { label: "Analytics & Reports", to: "/features" },
    { label: "Pricing", to: "/pricing" },
  ],
  Resources: [
    { label: "How it Works", to: "/how-it-works" },
    { label: "Testimonials", to: "/features" },
    { label: "Module Comparison", to: "/modules" },
    { label: "Free Trial", to: "/signup" },
  ],
  Company: [
    { label: "About Us", to: "/about" },
    { label: "Contact", to: "/contact" },
    { label: "Customer Stories", to: "/features" },
    { label: "Start Trial", to: "/signup" },
  ],
};

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navbar */}
      <nav className={`sticky top-0 z-50 border-b supports-[backdrop-filter]:backdrop-blur-xl transition-all duration-300 ${scrolled ? "border-border/60 bg-background/90 shadow-sm" : "border-border/30 bg-background/80 shadow-sm"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/30 blur-md group-hover:bg-primary/50 transition-colors" />
              <Coffee className="relative h-7 w-7 text-primary transition-transform group-hover:rotate-12" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">Mero Pasal</span>
          </Link>

          <div className="hidden items-center gap-4 xl:gap-6 lg:flex">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:bottom-[-4px] after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
            <Button asChild className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              <Link to="/signup">Start Free Trial <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>

          <button className="lg:hidden text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border bg-background px-4 pb-4 pt-2 lg:hidden animate-fade-in">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className="block py-2 text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>{l.label}</Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="outline" asChild><Link to="/login">Log in</Link></Button>
              <Button asChild><Link to="/signup">Start 14-Day Free Trial</Link></Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section id="home" className="relative scroll-mt-20 overflow-hidden bg-slate-950">
        <img
          src={cafeWorkflowImg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[center_35%] opacity-20 motion-safe:animate-hero-pan sm:opacity-25"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(2,6,23,0.66)_44%,hsl(var(--background))_96%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.78),transparent_50%,rgba(2,6,23,0.42))]" />

        <div className="relative mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pt-14">
          <div className="relative mx-auto max-w-3xl text-center">
            <Reveal>
              <Badge variant="secondary" className="mb-3 px-4 py-1.5 text-sm font-medium border border-white/20 bg-white/10 text-white backdrop-blur">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Nepal's Trusted Business Management Platform
              </Badge>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-xl sm:text-4xl lg:text-6xl">
                Run Your{" "}
                <span className="bg-gradient-to-r from-primary via-[hsl(var(--cafe-warm))] to-[hsl(var(--restaurant))] bg-clip-text text-transparent">Cafe</span>{" "}
                &amp;{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--inventory))] via-primary to-[hsl(var(--cafe-warm))] bg-clip-text text-transparent">Inventory</span>
                <br />Like a Pro
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-white/78 sm:text-base">
                The all-in-one management platform for cafes, restaurants, and retail shops in Nepal. Track orders, manage stock, and grow your business — all from one beautiful dashboard.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button size="lg" className="group w-full px-8 text-base shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 sm:w-auto" asChild>
                  <Link to="/signup">Start 14-Day Free Trial <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full px-8 text-base backdrop-blur sm:w-auto" asChild>
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>
              <p className="mt-2 text-sm text-white/65">No credit card required · Cancel anytime · Prices in NPR</p>
            </Reveal>

            {/* Order type breakdown — Restrox-inspired */}
            <Reveal delay={320} className="pointer-events-none absolute left-1/2 top-full z-30 mt-3 hidden w-full max-w-md -translate-x-1/2 px-4 sm:block">
              <div className="flex w-full flex-col gap-2 rounded-2xl border border-white/15 bg-white/15 p-4 text-white shadow-2xl backdrop-blur-md">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/65 uppercase tracking-widest">Live Order Breakdown</span>
                  <span className="flex items-center gap-1 text-xs text-success font-medium"><span className="h-2 w-2 rounded-full bg-success animate-pulse inline-block" />Live</span>
                </div>
                {[
                  { label: "Dine-in", pct: 48, color: "bg-primary" },
                  { label: "Takeout", pct: 32, color: "bg-[hsl(var(--inventory))]" },
                  { label: "Delivery", pct: 20, color: "bg-[hsl(var(--cafe-warm))]" },
                ].map((o) => (
                  <div key={o.label} className="flex items-center gap-3">
                    <span className="w-16 text-right text-xs text-white/70">{o.label}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-white/15 h-2">
                      <div className={`h-full rounded-full ${o.color} motion-safe:animate-bar-fill`} style={{ width: `${o.pct}%` }} />
                    </div>
                    <span className="w-9 text-xs font-semibold">{o.pct}%</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Dashboard Showcase */}
          <Reveal delay={380} className="mt-12 sm:mt-14">
            <div className="relative mx-auto w-full max-w-4xl px-2 sm:px-6 lg:px-0">
              <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-gradient-to-r from-primary/20 via-[hsl(var(--restaurant)/0.25)] to-[hsl(var(--inventory)/0.2)] blur-3xl opacity-60 sm:-inset-x-10 sm:-inset-y-6" />
              <div className="relative">
                <div className="absolute left-2 top-4 z-20 flex items-center gap-2 rounded-xl border border-border/60 bg-card/90 p-2 shadow-xl backdrop-blur-md animate-float sm:left-3 sm:top-8 sm:gap-3 sm:p-3 lg:-left-8">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/15 text-success sm:h-9 sm:w-9">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">Today's Sales</div>
                    <div className="text-xs font-bold sm:text-sm">Rs. 24,580</div>
                  </div>
                </div>
                <div className="absolute right-2 top-1/3 z-20 flex items-center gap-2 rounded-xl border border-border/60 bg-card/90 p-2 shadow-xl backdrop-blur-md animate-float sm:right-3 sm:gap-3 sm:p-3 lg:-right-8" style={{ animationDelay: "1.5s" }}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary sm:h-9 sm:w-9">
                    <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">Active Orders</div>
                    <div className="text-xs font-bold sm:text-sm">38 Live</div>
                  </div>
                </div>
                <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border/60 bg-card/90 p-2 shadow-xl backdrop-blur-md animate-float sm:bottom-4 sm:left-1/4 sm:translate-x-0 sm:gap-3 sm:p-3" style={{ animationDelay: "3s" }}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--restaurant)/0.15)] text-[hsl(var(--restaurant))] sm:h-9 sm:w-9">
                    <ChefHat className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">Kitchen Queue</div>
                    <div className="text-xs font-bold sm:text-sm">7 items</div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl ring-1 ring-primary/10 sm:rounded-2xl">
                  <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  <img
                    src={dashboardImg}
                    alt="Mero Pasal dashboard preview"
                    width={1920}
                    height={1080}
                    className="block h-auto w-full"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Stats bar */}
          <Reveal delay={460}>
            <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-3 sm:mt-10 sm:gap-6 rounded-2xl border border-border/50 bg-card/70 p-4 sm:p-6 shadow-sm backdrop-blur-sm">
              {[
                { value: "7,500+", label: "Businesses" },
                { value: "2M+", label: "Orders Processed" },
                { value: "99.9%", label: "Uptime" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-display text-3xl font-bold text-primary sm:text-4xl">{s.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Brand marquee */}
        <div className="relative mt-10 border-y border-border/40 bg-muted/30 py-5 sm:mt-12 sm:py-6">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">Trusted by growing businesses across Nepal</p>
          <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
            <div className="flex shrink-0 animate-marquee items-center gap-12 pr-12">
              {[...brandStrip, ...brandStrip].map((b, i) => (
                <span key={i} className="font-display text-lg font-semibold text-muted-foreground/70 whitespace-nowrap">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Visual workflow stories */}
      <section id="about" className="relative scroll-mt-20 border-t border-border/50 bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">About Mero Pasal</Badge>
              <h2 className="font-display text-3xl font-bold sm:text-5xl">Looks simple. Works everywhere.</h2>
              <p className="mt-4 text-muted-foreground">Mero Pasal is built for Nepali businesses that need billing, inventory, restaurant operations, and finance in one clean system.</p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {visualStories.map((story, i) => (
              <Reveal key={story.title} delay={i * 120}>
                <div className="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
                  <div className="relative aspect-[16/11] overflow-hidden">
                    <img
                      src={story.image}
                      alt={story.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className={`absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg ${story.bg} bg-white/90 shadow-lg backdrop-blur`}>
                      <story.icon className={`h-5 w-5 ${story.accent}`} />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold">{story.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{story.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative scroll-mt-20 overflow-hidden border-t border-border/50 bg-background py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 cafe-pattern opacity-40" />
        <div className="pointer-events-none absolute right-0 top-12 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">How it works</Badge>
              <h2 className="font-display text-3xl font-bold sm:text-5xl">Start fast, then run the whole business from one place</h2>
              <p className="mt-4 text-muted-foreground">A clean setup flow for cafe, inventory, finance, staff roles, orders, dues, refunds, and daily reports.</p>
            </div>
          </Reveal>

          <div className="relative mt-12 grid items-start gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {steps.map((s, i) => (
                <Reveal key={s.step} delay={i * 90}>
                  <div className="group relative h-full overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10">
                    <div className="absolute right-4 top-4 font-display text-5xl font-bold text-muted/70 transition-colors group-hover:text-primary/10">{s.step}</div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="mt-4 text-xs">{s.badge}</Badge>
                    <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.details.map((item) => (
                        <span key={item} className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">{item}</span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={180}>
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-2xl shadow-primary/10">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--restaurant))] to-[hsl(var(--inventory))]" />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Badge className="mb-3 bg-success/15 text-success hover:bg-success/15">Live workflow</Badge>
                    <h3 className="font-display text-2xl font-bold">Today at Mero Pasal</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Each module updates the same owner dashboard.</p>
                  </div>
                  <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 sm:flex">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    { icon: Receipt, label: "Counter orders", value: "38 active", color: "text-[hsl(var(--restaurant))]", bg: "bg-[hsl(var(--restaurant)/0.12)]" },
                    { icon: Package, label: "Stock movement", value: "12 low alerts", color: "text-[hsl(var(--inventory))]", bg: "bg-[hsl(var(--inventory)/0.12)]" },
                    { icon: CreditCard, label: "Dues & refunds", value: "Rs. 18,400", color: "text-[hsl(var(--finance))]", bg: "bg-[hsl(var(--finance)/0.12)]" },
                    { icon: BarChart2, label: "Daily profit", value: "+18.6%", color: "text-primary", bg: "bg-primary/10" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/70 p-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}>
                          <item.icon className={`h-5 w-5 ${item.color}`} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-xs text-muted-foreground">Auto synced</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border/50 pt-5 text-center">
                  {[
                    ["10 min", "setup"],
                    ["3 roles", "ready"],
                    ["1 view", "reports"],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <div className="font-display text-xl font-bold text-primary">{value}</div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>

                <Button size="lg" className="mt-6 w-full shadow-lg shadow-primary/20" asChild>
                  <Link to="/signup">Start Free Setup <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="relative scroll-mt-20 border-t border-border/50 bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Features</Badge>
              <h2 className="font-display text-3xl font-bold sm:text-5xl">Everything You Need to <span className="text-primary">Manage Your Business</span></h2>
              <p className="mt-4 text-muted-foreground">Powerful tools designed for simplicity and speed.</p>
            </div>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <Card className="group relative h-full overflow-hidden border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardContent className="relative p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/30">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Feature deep-dive: Order Management */}
      <section className="border-t border-border/50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div>
                <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Order Management</Badge>
                <h2 className="font-display text-3xl font-bold sm:text-4xl">Real-Time Orders, <span className="text-primary">Zero Confusion</span></h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">Orders placed at the table or counter go straight to the kitchen display. Your staff always knows what to cook, and customers get faster service.</p>
                <ul className="mt-6 space-y-3">
                  {["Live kitchen display with priority queue", "Table-wise and counter order tracking", "Instant status updates (New → Cooking → Ready)", "Order history and reprinting receipts"].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15"><Check className="h-3 w-3 text-primary" /></div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8" asChild>
                  <Link to="/signup">Try Order Management Free <ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={cafeWorkflowImg} alt="Cafe order workflow" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg backdrop-blur">
                    Orders, billing, and kitchen queue in sync
                  </div>
                </div>
                <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-semibold text-sm">Live Orders</span>
                  <span className="flex items-center gap-1.5 text-xs text-success font-medium"><span className="h-2 w-2 rounded-full bg-success animate-pulse" />Live</span>
                </div>
                <div className="space-y-3">
                  {[
                    { id: "#1042", table: "Table 3", items: "Momo × 2, Chiya × 1", status: "Cooking", statusColor: "bg-warning/15 text-warning" },
                    { id: "#1041", table: "Counter", items: "Burger × 1, Cold Coffee × 2", status: "Ready", statusColor: "bg-success/15 text-success" },
                    { id: "#1040", table: "Table 7", items: "Dal Bhat × 3", status: "New", statusColor: "bg-primary/15 text-primary" },
                    { id: "#1039", table: "Table 1", items: "Thukpa × 2, Lassi × 2", status: "Delivered", statusColor: "bg-muted text-muted-foreground" },
                  ].map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/40 px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{o.id}</span>
                          <span className="text-xs text-muted-foreground">{o.table}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{o.items}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${o.statusColor}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[{ label: "Total Today", value: "142" }, { label: "Avg. Time", value: "8 min" }, { label: "Revenue", value: "Rs. 38.2K" }].map((s) => (
                    <div key={s.label} className="rounded-lg bg-muted/60 p-3 text-center">
                      <div className="text-lg font-bold">{s.value}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Feature deep-dive: Inventory */}
      <section className="border-t border-border/50 bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal delay={120} className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={inventoryWorkflowImg} alt="Inventory and stock workflow" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg backdrop-blur">
                    Scan stock, receive purchases, and avoid shortages
                  </div>
                </div>
                <div className="p-6">
                <div className="mb-4 font-semibold text-sm">Inventory Overview</div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: "Total Items", value: "1,248", icon: Package, color: "text-primary bg-primary/10" },
                    { label: "In Stock", value: "1,192", icon: Check, color: "text-success bg-success/10" },
                    { label: "Low Stock", value: "42", icon: Bell, color: "text-warning bg-warning/10" },
                    { label: "Suppliers", value: "28", icon: Users, color: "text-info bg-info/10" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/40 p-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                        <s.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-lg font-bold leading-tight">{s.value}</div>
                        <div className="text-[10px] text-muted-foreground">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Low Stock Alerts</div>
                  {[
                    { name: "Tomato (1kg)", stock: 3, max: 20, color: "bg-destructive" },
                    { name: "Chicken Breast", stock: 5, max: 30, color: "bg-warning" },
                    { name: "Coffee Beans", stock: 8, max: 50, color: "bg-warning" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="w-32 truncate text-xs">{item.name}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.stock / item.max) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs text-muted-foreground">{item.stock}/{item.max}</span>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            </Reveal>
            <Reveal className="order-1 lg:order-2">
              <div>
                <Badge variant="outline" className="mb-4 border-[hsl(var(--inventory)/0.5)] text-[hsl(var(--inventory))]">Inventory Management</Badge>
                <h2 className="font-display text-3xl font-bold sm:text-4xl">Never Run Out of <span className="text-[hsl(var(--inventory))]">Stock Again</span></h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">Track every product in real time. Get instant alerts before you run out so you can reorder on time and keep your business running smoothly.</p>
                <ul className="mt-6 space-y-3">
                  {["Real-time stock level tracking", "Automatic low-stock alerts via notification", "Supplier management and purchase orders", "Expense tracking linked to purchases"].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--inventory)/0.15)]"><Check className="h-3 w-3 text-[hsl(var(--inventory))]" /></div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 bg-[hsl(var(--inventory))] hover:bg-[hsl(var(--inventory)/0.9)] text-white shadow-lg shadow-[hsl(var(--inventory)/0.3)]" asChild>
                  <Link to="/signup">Try Inventory Free <ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Feature deep-dive: Analytics */}
      <section className="border-t border-border/50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div>
                <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Analytics & Reports</Badge>
                <h2 className="font-display text-3xl font-bold sm:text-4xl">Data-Driven Decisions, <span className="text-primary">Every Day</span></h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">See exactly what's selling, when your busiest hours are, and where your money is going. Make smarter decisions backed by real numbers.</p>
                <ul className="mt-6 space-y-3">
                  {["Daily, weekly, and monthly sales reports", "Top-selling items and category breakdown", "Staff performance and shift reports", "Expense vs. revenue profit analysis"].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15"><Check className="h-3 w-3 text-primary" /></div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8" asChild>
                  <Link to="/signup">See Your Reports <ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={financeWorkflowImg} alt="Finance and analytics workflow" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg backdrop-blur">
                    Revenue, dues, invoices, and cashflow at a glance
                  </div>
                </div>
                <div className="p-6">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-sm">Sales This Week</span>
                  <span className="flex items-center gap-1 text-xs text-success font-medium"><TrendingUp className="h-3 w-3" />+14.2%</span>
                </div>
                <p className="mb-5 text-xs text-muted-foreground">Compared to last week</p>
                {/* Simulated bar chart */}
                <div className="flex items-end justify-between gap-1.5 h-28">
                  {[
                    { day: "Mon", h: 55 }, { day: "Tue", h: 70 }, { day: "Wed", h: 45 },
                    { day: "Thu", h: 80 }, { day: "Fri", h: 95 }, { day: "Sat", h: 100 }, { day: "Sun", h: 72 },
                  ].map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t-md bg-primary/80 transition-all motion-safe:animate-bar-rise" style={{ height: `${d.h}%` }} />
                      <span className="text-[9px] text-muted-foreground">{d.day}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/50 pt-4">
                  {[
                    { label: "Total Revenue", value: "Rs. 1.82L" },
                    { label: "Avg/Day", value: "Rs. 26K" },
                    { label: "Best Day", value: "Saturday" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-sm font-bold">{s.value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="relative scroll-mt-20 border-t border-border/50 bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Modules</Badge>
              <h2 className="font-display text-3xl font-bold sm:text-5xl">Two Powerful Modules,<br />One Beautiful Platform</h2>
              <p className="mt-4 text-muted-foreground">Choose the module that fits your business, or get both with Combo.</p>
            </div>
          </Reveal>
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <Reveal>
              <Card className="group h-full overflow-hidden border-border/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[hsl(var(--restaurant)/0.2)]">
                <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--restaurant)/0.15)] via-[hsl(var(--restaurant)/0.05)] to-transparent p-6 sm:p-8">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(var(--restaurant)/0.2)] blur-3xl transition-all duration-500 group-hover:scale-125" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--restaurant))] text-[hsl(var(--restaurant-foreground))] shadow-lg shadow-[hsl(var(--restaurant)/0.4)] transition-transform group-hover:rotate-6 group-hover:scale-110">
                      <ChefHat className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold">Cafe Management</h3>
                      <p className="text-sm text-muted-foreground">For cafes, restaurants & food businesses</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 sm:p-8">
                  <ul className="space-y-3">
                    {cafeFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--restaurant)/0.15)]">
                          <Check className="h-3 w-3 text-[hsl(var(--restaurant))]" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-6 w-full bg-[hsl(var(--restaurant))] hover:bg-[hsl(var(--restaurant)/0.9)] text-[hsl(var(--restaurant-foreground))] shadow-lg shadow-[hsl(var(--restaurant)/0.3)]" asChild>
                    <Link to="/signup">Try Cafe Module Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={120}>
              <Card className="group h-full overflow-hidden border-border/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[hsl(var(--inventory)/0.2)]">
                <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--inventory)/0.15)] via-[hsl(var(--inventory)/0.05)] to-transparent p-6 sm:p-8">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(var(--inventory)/0.2)] blur-3xl transition-all duration-500 group-hover:scale-125" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--inventory))] text-[hsl(var(--inventory-foreground))] shadow-lg shadow-[hsl(var(--inventory)/0.4)] transition-transform group-hover:rotate-6 group-hover:scale-110">
                      <Warehouse className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold">Inventory Management</h3>
                      <p className="text-sm text-muted-foreground">For retail shops, stores & warehouses</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 sm:p-8">
                  <ul className="space-y-3">
                    {inventoryFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--inventory)/0.15)]">
                          <Check className="h-3 w-3 text-[hsl(var(--inventory))]" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-6 w-full bg-[hsl(var(--inventory))] hover:bg-[hsl(var(--inventory)/0.9)] text-[hsl(var(--inventory-foreground))] shadow-lg shadow-[hsl(var(--inventory)/0.3)]" asChild>
                    <Link to="/signup">Try Inventory Module Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-t border-border/50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Pricing</Badge>
              <h2 className="font-display text-3xl font-bold sm:text-5xl">Simple, Transparent Pricing</h2>
              <p className="mt-4 text-muted-foreground">Start free for 14 days, upgrade when you're ready. No hidden fees.</p>
            </div>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 80}>
                <Card className={`relative flex h-full flex-col border-border/50 transition-all duration-300 hover:-translate-y-1 ${plan.popular ? "ring-2 ring-primary shadow-xl shadow-primary/20 scale-[1.02]" : "hover:shadow-lg"}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-primary text-primary-foreground px-3 shadow-lg shadow-primary/30">★ Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display text-5xl font-bold">Rs. {Number(plan.price).toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{plan.desc}</p>
                    <ul className="mt-6 flex-1 space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button className="mt-6 w-full" variant={plan.popular ? "default" : "outline"} asChild>
                      <Link to="/signup">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="scroll-mt-20 border-t border-border/50 bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Testimonials</Badge>
              <h2 className="font-display text-3xl font-bold sm:text-5xl">Loved by Business Owners</h2>
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <span className="text-2xl font-bold">4.8</span>
                <span className="text-muted-foreground text-sm">/ 5 · from 500+ reviews</span>
              </div>
            </div>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <Card className="h-full border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="mb-3 flex gap-0.5">
                      {Array.from({ length: t.stars }).map((_, idx) => (
                        <Star key={idx} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">"{t.text}"</p>
                    <div className="mt-5 flex items-center gap-3 border-t border-border/40 pt-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[hsl(var(--cafe-warm))] text-sm font-semibold text-primary-foreground shadow-md">
                        {t.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 border-t border-border/50 bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <div>
                <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Contact</Badge>
                <h2 className="font-display text-3xl font-bold sm:text-5xl">Need setup for your shop?</h2>
                <p className="mt-4 max-w-xl text-muted-foreground">
                  We can configure Mero Pasal for restaurant, pharmacy, clothes, hardware, grocery, electronics, or mixed inventory business.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Phone, label: "Call", value: "9867077179", href: "tel:9867077179" },
                    { icon: Mail, label: "Email", value: "info@yetibytes.com.np", href: "mailto:info@yetibytes.com.np" },
                    { icon: MapPin, label: "Location", value: "Kathmandu, Nepal", href: "/contact" },
                    { icon: Sparkles, label: "Website", value: "yetibytes.com.np", href: "https://yetibytes.com.np" },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                      className="group rounded-xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/10"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <item.icon className="h-5 w-5" />
                      </span>
                      <span className="mt-3 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.label}</span>
                      <span className="mt-1 block text-sm font-semibold">{item.value}</span>
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xl shadow-primary/10">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    "Business type configuration",
                    "Restaurant QR menu setup",
                    "Inventory category setup",
                    "Finance/account opening balance",
                    "Printer and invoice format",
                    "Staff role and access setup",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/70 p-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl bg-primary/10 p-5">
                  <p className="text-sm font-semibold text-primary">Implementation flow</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    First we choose business type, then configure modules, branches, users, products, accounts, bills, printers, and reports according to the client.
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button className="flex-1" asChild>
                    <Link to="/signup">Start Free Trial</Link>
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <a href="tel:9867077179">Call Now</a>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl cafe-gradient p-10 text-center text-primary-foreground shadow-2xl shadow-primary/20 sm:p-14">
              <div className="pointer-events-none absolute inset-0 cafe-pattern opacity-40" />
              <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl animate-glow-pulse" />
              <div className="relative">
                <Coffee className="mx-auto mb-4 h-12 w-12 opacity-90" />
                <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to Transform Your Business?</h2>
                <p className="mx-auto mt-3 max-w-md text-base opacity-90">
                  Join 7,500+ businesses already using Mero Pasal. Start your 14-day free trial — no credit card needed.
                </p>
                <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button size="lg" variant="secondary" className="w-full shadow-xl sm:w-auto" asChild>
                    <Link to="/signup">Get 14 Days Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button size="lg" variant="ghost" className="w-full text-primary-foreground hover:bg-primary-foreground/15 sm:w-auto" asChild>
                    <Link to="/login">Log In</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <Coffee className="h-6 w-6 text-primary" />
                <span className="font-display text-lg font-bold">Mero Pasal</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
                Nepal's all-in-one business management platform for cafes, restaurants, and retail shops.
              </p>
              <div className="mt-5 flex gap-3">
                {[
                  { icon: Facebook, label: "Facebook" },
                  { icon: Instagram, label: "Instagram" },
                  { icon: Youtube, label: "YouTube" },
                ].map(({ icon: Icon, label }) => (
                  <a key={label} href="#" aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
              <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" /> Kathmandu, Nepal</div>
                <a href="tel:9867077179" className="flex items-center gap-2 transition-colors hover:text-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-primary" /> 9867077179
                </a>
                <a href="mailto:info@yetibytes.com.np" className="flex items-center gap-2 transition-colors hover:text-foreground">
                  <Mail className="h-4 w-4 shrink-0 text-primary" /> info@yetibytes.com.np
                </a>
                <a href="https://yetibytes.com.np" target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80">
                  yetibytes.com.np
                </a>
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([group, links]) => (
              <div key={group}>
                <h4 className="mb-4 text-sm font-semibold">{group}</h4>
                <ul className="space-y-2.5">
                  {links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 sm:flex-row">
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Mero Pasal. Powered by YetiBytes.</p>
            <div className="flex gap-5 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
