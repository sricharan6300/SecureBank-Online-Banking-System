import React, { useEffect, useMemo, useState } from "react";

const STORE = "securebank_customers_v2";
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const readCustomers = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};
const makeAccount = (customers) => {
  let account;
  do { account = "4582" + Math.floor(10000000 + Math.random() * 90000000); }
  while (customers.some(c => c.accountNumber === account));
  return account;
};
const seed = () => {
  if (localStorage.getItem(STORE) === null) {
    localStorage.setItem(STORE, JSON.stringify([{
      fullName: "Rahul Kumar", username: "customer123", email: "demo@example.com",
      phone: "9876543210", accountType: "Savings", city: "Vijayawada",
      password: "customer123", accountNumber: "458210000001", balance: 125450,
      transactions: []
    }]));
  }
};
seed();

function App() {
  const [customers, setCustomers] = useState(readCustomers);
  const [user, setUser] = useState(() => {
    const name = localStorage.getItem("currentCustomer");
    return readCustomers().find(c => c.username === name) || null;
  });
  const [role, setRole] = useState(() => localStorage.getItem("role") || "");
  const [page, setPage] = useState(() => location.hash.replace("#", "") || (localStorage.getItem("loggedIn") === "true" ? (localStorage.getItem("role") === "admin" ? "admin" : "dashboard") : "home"));
  const [notice, setNotice] = useState("");

  const persist = (next) => {
    setCustomers(next);
    localStorage.setItem(STORE, JSON.stringify(next));
    if (user) {
      const updated = next.find(c => c.username === user.username);
      if (updated) setUser(updated);
    }
  };
  const go = (next) => { setPage(next); location.hash = next; setNotice(""); window.scrollTo(0, 0); };
  const login = (username, password, loginRole) => {
    if (loginRole === "admin") {
      if (username === "admin" && password === "admin123") {
        setRole("admin"); setUser(null);
        localStorage.setItem("loggedIn", "true"); localStorage.setItem("role", "admin");
        localStorage.removeItem("currentCustomer"); go("admin"); return true;
      }
      return false;
    }
    const found = customers.find(c => c.username.toLowerCase() === username.trim().toLowerCase() && c.password === password);
    if (!found) return false;
    setRole("customer"); setUser(found);
    localStorage.setItem("loggedIn", "true"); localStorage.setItem("role", "customer");
    localStorage.setItem("currentCustomer", found.username); go("dashboard"); return true;
  };
  const logout = () => {
    localStorage.removeItem("loggedIn"); localStorage.removeItem("role"); localStorage.removeItem("currentCustomer");
    setUser(null); setRole(""); go("home");
  };

  useEffect(() => {
    const onHash = () => setPage(location.hash.replace("#", "") || "home");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const protectedCustomer = ["dashboard", "accounts", "transfer", "transactions", "profile"];
    if (protectedCustomer.includes(page) && (!user || role !== "customer" || localStorage.getItem("loggedIn") !== "true")) go("login");
    if (page === "admin" && (role !== "admin" || localStorage.getItem("loggedIn") !== "true")) go("login");
  }, [page, user, role]);

  const updateUser = (updated) => {
    const next = customers.map(c => c.username === updated.username ? updated : c);
    persist(next);
  };

  const register = (data) => {
    if (customers.some(c => c.username.toLowerCase() === data.username.toLowerCase())) return "Username already exists.";
    if (customers.some(c => c.email.toLowerCase() === data.email.toLowerCase())) return "Email is already registered.";
    const { confirm, ...customerData } = data;
    const next = [...customers, { ...customerData, accountNumber: makeAccount(customers), balance: 0, transactions: [] }];
    persist(next); return "";
  };

  const transfer = (recipientName, account, ifsc, amount, description) => {
    if (!user) return "Please log in again.";
    const value = Number(amount);
    if (!recipientName.trim()) return "Enter recipient name.";
    if (!/^\d{8,18}$/.test(account)) return "Enter a valid recipient account number.";
    if (ifsc.trim().length < 6) return "Enter a valid IFSC code.";
    if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== value * 100) return "Enter a valid amount.";
    if (account === user.accountNumber) return "You cannot transfer to your own account.";
    if (value > user.balance) return "Insufficient balance.";
    const receiver = customers.find(c => c.accountNumber === account);
    if (receiver && receiver.fullName.toLowerCase() !== recipientName.trim().toLowerCase()) return "Recipient name does not match.";
    const id = "#TXN" + Date.now();
    const date = new Date().toLocaleDateString("en-IN");
    const next = customers.map(c => {
      if (c.username === user.username) return { ...c, balance: Math.round((c.balance - value) * 100) / 100,
        transactions: [{ id, description: (description || "Money Transfer") + " to " + recipientName, date, type: "Debit", amount: value, status: "Completed" }, ...(c.transactions || [])] };
      if (receiver && c.username === receiver.username) return { ...c, balance: Math.round((c.balance + value) * 100) / 100,
        transactions: [{ id, description: "Received from " + user.fullName, date, type: "Credit", amount: value, status: "Completed" }, ...(c.transactions || [])] };
      return c;
    });
    persist(next); return "";
  };

  const common = { go, logout, user, customers, notice, setNotice };
  return <div className="app-shell">
    {page === "home" && <Home go={go} />}
    {page === "login" && <Login go={go} login={login} />}
    {page === "register" && <Register go={go} register={register} />}
    {page === "admin" && <Admin {...common} />}
    {page === "dashboard" && <Dashboard {...common} />}
    {page === "accounts" && <Accounts {...common} />}
    {page === "transfer" && <Transfer {...common} transfer={transfer} />}
    {page === "transactions" && <Transactions {...common} />}
    {page === "profile" && <Profile {...common} updateUser={updateUser} />}
    {!["home","login","register","admin","dashboard","accounts","transfer","transactions","profile"].includes(page) && <Home go={go} />}
  </div>;
}

function Brand() { return <div className="brand"><span className="brand-icon">₹</span> SecureBank</div>; }
function Home({ go }) {
  return <><header className="topbar"><Brand /><nav><button className="navlink" onClick={() => go("home")}>Home</button><a href="#features">Features</a><button className="navlink" onClick={() => go("login")}>Login</button><button className="btn small" onClick={() => go("register")}>Register</button></nav></header>
    <main><section className="hero"><div><span className="eyebrow">SECURE • SIMPLE • SMART BANKING</span><h1>Your Banking,<br/><span>Made Simple.</span></h1><p>Manage your accounts, transfer money, check transactions and access your banking services from one simple platform.</p><div className="actions"><button className="btn" onClick={() => go("login")}>Login to Banking</button><button className="btn outline" onClick={() => go("register")}>Open an Account</button></div><small>🔒 Academic frontend demonstration using Local Storage</small></div><div className="hero-card"><div className="card-top">SecureBank <span>◈</span></div><div className="card-number">4582&nbsp; 7845&nbsp; 1203</div><div className="card-bottom"><span>ACCOUNT HOLDER<br/><b>SECUREBANK CUSTOMER</b></span><b>VISA</b></div></div></section>
    <section id="features" className="feature-section"><span className="eyebrow">BANKING SERVICES</span><h2>Everything You Need in One Place</h2><div className="feature-grid">{[["₹","Account Management","View account details and balance."],["↗","Money Transfer","Transfer money using a simple interface."],["≡","Transactions","Review your banking activity."],["👤","Profile Management","Update your personal information."],["📊","Financial Overview","Get a quick account overview."],["🔒","Role-based Access","Separate customer and admin areas."]].map(x=><article className="feature" key={x[1]}><div>{x[0]}</div><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div></section></main>
    <footer>© 2026 SecureBank · Student project demonstration</footer></>;
}
function Login({ go, login }) {
  const [kind, setKind] = useState("customer"), [username, setUsername] = useState(""), [password, setPassword] = useState(""), [error, setError] = useState("");
  const submit = e => { e.preventDefault(); if (!login(username, password, kind)) setError("Invalid " + kind + " username or password."); };
  return <AuthLayout go={go}><form className="form-card" onSubmit={submit}><button type="button" className="back" onClick={() => go("home")}>← Back to Home</button><span className="eyebrow">SECURE ONLINE BANKING</span><h2>Welcome Back</h2><p className="muted">Login to access your SecureBank account.</p><label>Login Type</label><div className="role-switch"><button type="button" className={kind==="customer"?"selected":""} onClick={() => {setKind("customer");setError("");}}>👤 Customer</button><button type="button" className={kind==="admin"?"selected":""} onClick={() => {setKind("admin");setError("");}}>🛡 Admin</button></div><label>Username</label><input required value={username} onChange={e=>setUsername(e.target.value)} placeholder={"Enter "+kind+" username"}/><label>Password</label><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password"/>{error && <p className="error">{error}</p>}<button className="btn full">Login to Account</button><p className="center muted">Don't have an account? <button type="button" className="textbtn" onClick={() => go("register")}>Create Account</button></p><div className="demo-hint">Demo customer: <b>customer123 / customer123</b><br/>Demo admin: <b>admin / admin123</b></div></form></AuthLayout>;
}
function AuthLayout({ children, go }) { return <div className="auth-layout"><aside className="auth-side"><Brand/><div><span className="eyebrow">SECURE ONLINE BANKING</span><h1>Banking that puts <span>you in control.</span></h1><p>Access your account, manage your money and perform banking activities from one place.</p><ul><li>✓ Secure account access</li><li>✓ Easy money transfers</li><li>✓ Transaction history</li><li>✓ Simple banking dashboard</li></ul></div></aside><main className="auth-main">{children}</main></div>; }
function Register({ go, register }) {
  const [form, setForm] = useState({fullName:"",username:"",email:"",phone:"",accountType:"Savings",city:"",password:"",confirm:""});
  const [error,setError] = useState(""), [success,setSuccess] = useState("");
  const change = e => setForm({...form,[e.target.name]:e.target.value});
  const submit = e => { e.preventDefault(); setError(""); setSuccess("");
    if (!/^\d{10}$/.test(form.phone)) return setError("Enter a valid 10-digit phone number.");
    if (form.password.length < 6) return setError("Password must contain at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    const message = register(form); if (message) return setError(message);
    setSuccess("Account created successfully with ₹0.00 opening balance. You can now login.");
  };
  return <AuthLayout><form className="form-card wide" onSubmit={submit}><button type="button" className="back" onClick={() => go("home")}>← Back to Home</button><span className="eyebrow">NEW CUSTOMER</span><h2>Create Your Account</h2><p className="muted">Enter your details to create a demo banking account.</p><div className="form-grid">{[["fullName","Full Name","text"],["username","Username","text"],["email","Email Address","email"],["phone","Phone Number","tel"],["city","City","text"],["password","Password","password"],["confirm","Confirm Password","password"]].map(([name,label,type])=><div key={name}><label>{label}</label><input required type={type} name={name} value={form[name]} onChange={change} /></div>)}<div><label>Account Type</label><select name="accountType" value={form.accountType} onChange={change}><option>Savings</option><option>Current</option></select></div></div><label className="terms"><input type="checkbox" required/> I agree to the terms and conditions.</label>{error && <p className="error">{error}</p>}{success && <p className="success">{success}</p>}<button className="btn full">Create Bank Account</button><p className="center muted">Already registered? <button type="button" className="textbtn" onClick={() => go("login")}>Login here</button></p></form></AuthLayout>;
}
function Layout({ children, title, user, logout, go, admin=false }) {
  const links = admin ? [["admin","Dashboard"],["admin#customers","Customers"],["admin#transactions","Transactions"],["admin#reports","Reports"]] : [["dashboard","Dashboard"],["accounts","My Accounts"],["transfer","Money Transfer"],["transactions","Transactions"],["profile","My Profile"]];
  return <div className="dashboard-layout"><aside className="sidebar"><Brand/>{admin && <span className="admin-label">ADMIN PANEL</span>}<div className="side-links">{links.map(([id,label])=><button key={id} className={(title===label || (id==="admin"&&title==="Admin Dashboard"))?"active":""} onClick={()=>go(id.split("#")[0])}>{label}</button>)}</div><button className="logout" onClick={logout}>↪ Logout</button></aside><main className="dash-main"><header className="dash-header"><div><span className="eyebrow">{admin?"ADMINISTRATION":"SECUREBANK CUSTOMER"}</span><h1>{title}</h1></div><div className="user-chip"><span className="avatar">{admin?"A":(user?.fullName?.[0]||"C")}</span><div><b>{admin?"Administrator":user?.fullName}</b><small>{admin?"System Admin":"Customer"}</small></div></div></header>{children}</main></div>;
}
function Dashboard({ user, go, logout }) {
  const tx = user?.transactions || [];
  return <Layout title="Dashboard" user={user} go={go} logout={logout}><div className="stats"><Stat label="Available Balance" value={money(user?.balance)} /><Stat label="Account Number" value={user?.accountNumber || "—"}/><Stat label="Account Type" value={user?.accountType || "Savings"}/></div><section className="panel"><h2>Quick Actions</h2><div className="quick-grid">{[["↗","Transfer Money","transfer"],["▣","My Accounts","accounts"],["≡","Transactions","transactions"],["👤","My Profile","profile"]].map(([icon,name,id])=><button className="quick" key={id} onClick={()=>go(id)}><span>{icon}</span><b>{name}</b><small>Open {name.toLowerCase()}</small></button>)}</div></section><section className="panel"><h2>Recent Transactions</h2><TransactionTable transactions={tx.slice(0,5)}/></section></Layout>;
}
function Stat({label,value}) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div>; }
function Accounts({ user, go, logout }) { return <Layout title="My Accounts" user={user} go={go} logout={logout}><div className="account-hero"><span>SAVINGS / CURRENT ACCOUNT · ACTIVE</span><small>Available Balance</small><h2>{money(user?.balance)}</h2><p>Account Number: <b>{user?.accountNumber}</b></p></div><section className="panel"><h2>Account Information</h2><Info label="Account Holder" value={user?.fullName}/><Info label="Account Type" value={user?.accountType}/><Info label="Account Status" value="Active"/><Info label="Email" value={user?.email}/><Info label="Branch" value={user?.city}/><Info label="Currency" value="INR (₹)"/></section><section className="panel"><h2>Account Services</h2><div className="quick-grid"><button className="quick" onClick={()=>go("transfer")}>↗ Transfer Money</button><button className="quick" onClick={()=>go("transactions")}>≡ Transaction History</button></div></section></Layout>; }
function Info({label,value}) { return <div className="info-row"><span>{label}</span><b>{value || "—"}</b></div>; }
function Transfer({ user, go, logout, transfer }) {
  const [form,setForm]=useState({recipientName:"",account:"",ifsc:"",amount:"",description:""}),[message,setMessage]=useState(""),[ok,setOk]=useState(false);
  const change=e=>setForm({...form,[e.target.name]:e.target.value});
  const submit=e=>{e.preventDefault();const result=transfer(form.recipientName,form.account,form.ifsc,form.amount,form.description);setMessage(result || "Transfer completed successfully (demo).");setOk(!result);if(!result)setForm({recipientName:"",account:"",ifsc:"",amount:"",description:""});};
  return <Layout title="Money Transfer" user={user} go={go} logout={logout}><div className="two-col"><form className="panel" onSubmit={submit}><h2>Transfer Money</h2><p className="muted">Send money to another bank account.</p><label>Recipient Name</label><input required name="recipientName" value={form.recipientName} onChange={change}/><label>Recipient Account Number</label><input required name="account" value={form.account} onChange={change}/><label>IFSC Code</label><input required name="ifsc" value={form.ifsc} onChange={change}/><label>Amount (₹)</label><input required type="number" min="0.01" step="0.01" name="amount" value={form.amount} onChange={change}/><label>Description</label><input name="description" value={form.description} onChange={change}/>{message && <p className={ok?"success":"error"}>{message}</p>}<button className="btn full">Transfer Money</button></form><section className="panel"><h2>Available Balance</h2><h2 className="balance">{money(user?.balance)}</h2><p className="muted">Please verify recipient details before transferring.</p><ul className="tips"><li>Enter a valid account number.</li><li>Check the IFSC code.</li><li>Ensure sufficient balance.</li><li>Transfers in this project are simulated locally.</li></ul></section></div></Layout>;
}
function TransactionTable({transactions=[]}) { return <div className="table-wrap"><table><thead><tr><th>Transaction ID</th><th>Description</th><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>{transactions.length===0?<tr><td colSpan="6" className="empty">No transactions yet.</td></tr>:transactions.map((t,i)=><tr key={t.id||i}><td>{t.id}</td><td>{t.description}</td><td>{t.date}</td><td><span className={t.type==="Credit"?"credit":"debit"}>{t.type}</span></td><td className={t.type==="Credit"?"credit":"debit"}>{t.type==="Credit"?"+ ":"- "}{money(t.amount)}</td><td><span className="pill">{t.status||"Completed"}</span></td></tr>)}</tbody></table></div>; }
function Transactions({user,go,logout}) { const [filter,setFilter]=useState("all"),[search,setSearch]=useState(""); const tx=user?.transactions||[]; const filtered=tx.filter(t=>(filter==="all"||t.type.toLowerCase()===filter)&&JSON.stringify(t).toLowerCase().includes(search.toLowerCase())); const credits=tx.filter(t=>t.type==="Credit").reduce((a,t)=>a+Number(t.amount),0), debits=tx.filter(t=>t.type==="Debit").reduce((a,t)=>a+Number(t.amount),0);
  return <Layout title="Transactions" user={user} go={go} logout={logout}><div className="stats"><Stat label="Total Credits" value={money(credits)}/><Stat label="Total Debits" value={money(debits)}/><Stat label="Transactions" value={tx.length}/></div><section className="panel"><h2>Transaction History</h2><div className="toolbar"><input placeholder="Search transactions..." value={search} onChange={e=>setSearch(e.target.value)}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All Transactions</option><option value="credit">Credits</option><option value="debit">Debits</option></select></div><TransactionTable transactions={filtered}/></section></Layout>;
}
function Profile({user,go,logout,updateUser}) { const [form,setForm]=useState({fullName:user?.fullName||"",email:user?.email||"",phone:user?.phone||"",city:user?.city||""}),[message,setMessage]=useState(""); const change=e=>setForm({...form,[e.target.name]:e.target.value}); const submit=e=>{e.preventDefault();if(!/^\d{10}$/.test(form.phone)){setMessage("Enter a valid 10-digit phone number.");return;}updateUser({...user,...form});setMessage("Profile updated successfully.");}; return <Layout title="My Profile" user={user} go={go} logout={logout}><div className="two-col"><section className="panel"><h2>{user?.fullName}</h2><Info label="Customer ID" value={user?.username}/><Info label="Account Number" value={user?.accountNumber}/><Info label="Account Type" value={user?.accountType}/><Info label="Status" value="Active"/></section><form className="panel" onSubmit={submit}><h2>Personal Information</h2>{[["fullName","Full Name"],["email","Email"],["phone","Phone"],["city","City"]].map(([name,label])=><React.Fragment key={name}><label>{label}</label><input required name={name} value={form[name]} onChange={change}/></React.Fragment>)}{message&&<p className={message.includes("success")?"success":"error"}>{message}</p>}<button className="btn full">Save Changes</button></form></div></Layout>; }
function Admin({customers,go,logout}) { const [search,setSearch]=useState(""); const filtered=customers.filter(c=>(c.fullName+c.username+c.accountNumber).toLowerCase().includes(search.toLowerCase())); const allTx=customers.flatMap(c=>(c.transactions||[]).map(t=>({...t,customer:c.fullName}))); return <Layout title="Admin Dashboard" admin go={go} logout={logout}><div className="stats"><Stat label="Total Customers" value={customers.length}/><Stat label="Total Accounts" value={customers.length}/><Stat label="Total Transactions" value={allTx.length}/><Stat label="System Status" value="Online"/></div><section className="panel" id="customers"><h2>Customer Management</h2><div className="toolbar"><input placeholder="Search customers..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Username</th><th>Account Number</th><th>Type</th><th>Balance</th><th>Status</th></tr></thead><tbody>{filtered.map(c=><tr key={c.username}><td>{c.fullName}</td><td>{c.username}</td><td>{c.accountNumber}</td><td>{c.accountType}</td><td>{money(c.balance)}</td><td><span className="pill">Active</span></td></tr>)}</tbody></table></div></section><section className="panel" id="transactions"><h2>Recent Transactions</h2><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Description</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead><tbody>{allTx.length===0?<tr><td colSpan="5" className="empty">No transactions available.</td></tr>:allTx.slice(0,10).map((t,i)=><tr key={t.id+i}><td>{t.customer}</td><td>{t.description}</td><td>{t.type}</td><td>{money(t.amount)}</td><td>{t.date}</td></tr>)}</tbody></table></div></section><section className="panel" id="reports"><h2>Reports</h2><p>Total customer balances: <b>{money(customers.reduce((a,c)=>a+Number(c.balance||0),0))}</b></p><p>Total recorded transactions: <b>{allTx.length}</b></p></section></Layout>; }

export default App;
