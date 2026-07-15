# Mero Pasal Client Flow And Backend Plan

This document is the client-ready operating flow for the cafe, inventory, finance, and super-admin system.

## 1. Login And Workspace Flow

1. User opens Mero Pasal.
2. User selects workspace:
   - Restaurant / Cafe
   - Inventory / Shop
3. User selects account type:
   - Admin / Owner: full business access
   - Staff: role-based access
4. After login:
   - Super admin goes to Super Admin.
   - Cafe-only plan goes to Restaurant.
   - Inventory-only plan goes to Inventory.
   - Combo plan opens the active selected workspace directly.

Client rule: do not show two different module selection screens after login.

## 2. Restaurant Core Flow

Restaurant flow should feel like this:

1. Setup business profile:
   - Business name, logo, PAN/VAT, phone, email, address
   - Branches and tables
   - Payment QR and bank details
2. Build catalog:
   - Category: Khaja, Chiya, Meals, Snacks, Desserts, Drinks
   - Sub category/name: Momo, Chowmein, Milk Tea, Black Tea, Lemon Tea
   - Menu items with selling price, optional original price, offer label, image
   - Combo offers and daily offers
3. QR menu:
   - Add tables
   - Generate table QR automatically
   - Customer scans QR and opens menu
   - Mobile QR menu should show compact 2-column cards
4. Order:
   - Dine-in/table order
   - Token/customer-name order
   - Delivery order
   - Choose catalog category first, then item
5. Kitchen:
   - Pending, preparing, ready, completed
6. Billing:
   - Completed order must create bill/payment entry
   - Discount percent or amount
   - VAT/PAN bill format
   - Cash, card, QR/eSewa, split payment
   - Print invoice/receipt with logo, header, footer, terms, bank/QR
7. Refund/return:
   - Overpaid cash refund
   - Item returned refund
   - Cancelled order refund
   - Refund should post to finance as payment out / sales return

## 3. Inventory Core Flow

1. Product setup:
   - Category, sub category, unit, barcode, stock alert level
2. Purchase:
   - Supplier, bill number, purchase date, payment method
   - Stock increases
   - Accounting entry: inventory asset increases, cash/bank/payable changes
3. POS sale:
   - Search or scan item
   - Discount percent/amount in one typing flow
   - VAT if enabled
   - Payment method and invoice print
   - Stock decreases
4. Return/refund:
   - Sales return increases stock
   - Refund posts to cash/bank out
5. Reports:
   - Stock report
   - Purchase report
   - Sales report
   - Low stock alert

## 4. Finance / Accountant Flow

An accountant needs the following daily workflow:

1. Chart of accounts:
   - Assets: cash, bank, inventory, receivable
   - Liabilities: payable, tax payable, loan
   - Equity: owner capital, drawings
   - Income: sales, service income, other income
   - Expenses: salary, rent, utilities, packaging, discount, tax
2. Transaction entry:
   - Date, branch, voucher no
   - Account group/sub-group
   - Payment method: cash, bank, cheque, QR, card
   - Bank/cheque reference
   - Debit and credit sides
3. Daily reports:
   - Day book
   - Cash and bank position
   - Transaction ledger
   - Trial balance
   - Profit and loss
   - Balance sheet
4. Branch reporting:
   - Branch-wise sales
   - Branch-wise cash/bank
   - Branch-wise expenses
   - Consolidated company report
5. Tax:
   - VAT/PAN setup
   - TDS where applicable
   - Tax summary for accountant review

## 5. Super Admin / System Configuration

When super admin adds a company:

1. Company profile:
   - Logo, company name, business type, plan, expiry, max users
2. Module access:
   - Restaurant
   - Inventory
   - Finance/accounting
   - Branch management
   - Delivery
   - Staff and roles
3. Plan rules:
   - Trial
   - Active
   - Payment pending
   - Expired/cancelled
4. Feature flags:
   - Enable/disable finance
   - Enable/disable inventory
   - Enable/disable QR menu
   - Enable/disable branch mode
   - Enable/disable print templates

## 6. Backend Requirements

Important backend endpoints must return JSON, never the Vite HTML page.

Required endpoints:

- Auth: login, me, signup, logout, reset password
- Business settings: profile, logo, PAN/VAT, payment QR
- Branches: list, create, update, delete
- Tables: list, create, update, delete
- Menu categories: list, create, update, delete
- Menu items: list, create, update, delete
- Orders: create, update status, complete, cancel
- Billing: create bill, pay bill, print invoice data, refund
- Inventory products: list, create, update, delete
- Purchases: create purchase, supplier payment
- Sales POS: create sale, return sale
- Finance:
  - chart of accounts
  - journal entries
  - cash/bank ledger
  - day book
  - trial balance
  - profit and loss
  - balance sheet
- Super admin:
  - companies
  - plans
  - module configuration
  - subscriptions

## 7. Demo Readiness Checklist

Before showing client:

1. Login should not show duplicate module screens.
2. QR table add must work even if backend is temporarily down.
3. Print should show only report/invoice content, not sidebar or dashboard UI.
4. Pinned reports must open real report views.
5. Restaurant completed order must appear in billing.
6. POS discount must accept two-digit percent in one typing flow.
7. Settings save should not fail due oversized logo payload.
8. Public QR menu should load menu items and offers.
9. Finance reports should be printable in clean A4 format.
10. Super admin should clearly control company module access.
