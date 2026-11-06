# SecureBank – React + Vite

## Run locally
1. Install Node.js (LTS).
2. Open this folder in VS Code.
3. Open Terminal in this folder and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open the local URL printed by Vite (usually http://localhost:5173).

## Demo credentials
- Customer: `customer123` / `customer123`
- Admin: `admin` / `admin123`

## Modules
- Home / Services
- Customer registration and login
- Admin login and dashboard
- Customer dashboard
- My Accounts
- Money Transfer
- Transaction History with search and type filters
- My Profile

## Local Storage
Customer records and transactions are stored in browser Local Storage under `securebank_customers_v2`. Login session keys are `loggedIn`, `role`, and `currentCustomer`.

## GitHub and Vercel
Push the project folder to GitHub, then import that repository at https://vercel.com/new.
Vercel settings:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Important limitation
This is an academic frontend demonstration. Local Storage is not secure authentication or a real banking backend. Do not use real credentials or real financial information.
