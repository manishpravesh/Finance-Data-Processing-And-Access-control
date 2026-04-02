import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

type Role = "VIEWER" | "ANALYST" | "ADMIN";
type RecordType = "INCOME" | "EXPENSE";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

type FinancialRecord = {
  id: string;
  amount: number;
  type: RecordType;
  category: string;
  date: string;
  notes?: string | null;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role?: Role;
  };
};

type SummaryResponse = {
  totals: {
    income: number;
    expenses: number;
    netBalance: number;
  };
  categoryTotals: Array<{
    category: string;
    income: number;
    expense: number;
    net: number;
  }>;
  recentActivity: FinancialRecord[];
};

type TrendResponse = {
  months: number;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
};

type RecordListResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: FinancialRecord[];
};

type RecordFilters = {
  type: "" | "income" | "expense";
  category: string;
  startDate: string;
  endDate: string;
};

type NewRecordForm = {
  amount: string;
  type: "income" | "expense";
  category: string;
  date: string;
  notes: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function App() {
  const [token, setToken] = useState<string>(
    localStorage.getItem("token") ?? "",
  );
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AppUser;
    } catch {
      return null;
    }
  });
  const [loginEmail, setLoginEmail] = useState("admin@finance.local");
  const [loginPassword, setLoginPassword] = useState("Admin@123");
  const [loginLoading, setLoginLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trends, setTrends] = useState<TrendResponse | null>(null);
  const [records, setRecords] = useState<RecordListResponse | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);

  const [filters, setFilters] = useState<RecordFilters>({
    type: "",
    category: "",
    startDate: "",
    endDate: "",
  });

  const [newRecordForm, setNewRecordForm] = useState<NewRecordForm>({
    amount: "",
    type: "expense",
    category: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VIEWER" as Role,
  });

  const isAdmin = currentUser?.role === "ADMIN";

  const summaryCards = useMemo(() => {
    if (!summary) {
      return [
        { label: "Total Income", value: "$0.00" },
        { label: "Total Expenses", value: "$0.00" },
        { label: "Net Balance", value: "$0.00" },
      ];
    }

    return [
      { label: "Total Income", value: currency(summary.totals.income) },
      { label: "Total Expenses", value: currency(summary.totals.expenses) },
      { label: "Net Balance", value: currency(summary.totals.netBalance) },
    ];
  }, [summary]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUser?.role]);

  const apiFetch = async <T,>(
    path: string,
    options?: RequestInit,
    accessToken?: string,
  ): Promise<T> => {
    const requestToken = accessToken ?? token;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
        ...(options?.headers ?? {}),
      },
    });

    const payload = (await response.json()) as {
      success: boolean;
      data: T;
      error?: { message?: string };
    };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error?.message ?? "Request failed");
    }

    return payload.data;
  };

  const loadDashboardData = async (): Promise<void> => {
    if (!token) {
      return;
    }

    setDashboardLoading(true);
    setError("");

    try {
      const [summaryData, trendsData, recordsData, usersData] =
        await Promise.all([
          apiFetch<SummaryResponse>("/api/dashboard/summary"),
          apiFetch<TrendResponse>("/api/dashboard/trends?months=6"),
          apiFetch<RecordListResponse>(buildRecordQuery(filters)),
          isAdmin ? apiFetch<AppUser[]>("/api/users") : Promise.resolve([]),
        ]);

      setSummary(summaryData);
      setTrends(trendsData);
      setRecords(recordsData);
      setUsers(usersData);
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleLogin = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setLoginLoading(true);
    setError("");

    try {
      const data = await apiFetch<{ token: string; user: AppUser }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
          }),
        },
        "",
      );

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setCurrentUser(null);
    setSummary(null);
    setTrends(null);
    setRecords(null);
    setUsers([]);
  };

  const applyFilters = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    try {
      setError("");
      const recordsData = await apiFetch<RecordListResponse>(
        buildRecordQuery(filters),
      );
      setRecords(recordsData);
    } catch (requestError) {
      setError(toMessage(requestError));
    }
  };

  const createRecord = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    try {
      setError("");
      await apiFetch<FinancialRecord>("/api/records", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(newRecordForm.amount),
          type: newRecordForm.type,
          category: newRecordForm.category,
          date: new Date(newRecordForm.date).toISOString(),
          notes: newRecordForm.notes || undefined,
        }),
      });

      setNewRecordForm((prev) => ({
        ...prev,
        amount: "",
        category: "",
        notes: "",
      }));

      await loadDashboardData();
    } catch (requestError) {
      setError(toMessage(requestError));
    }
  };

  const createUser = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    try {
      setError("");
      await apiFetch<AppUser>("/api/users", {
        method: "POST",
        body: JSON.stringify(newUserForm),
      });

      setNewUserForm({
        name: "",
        email: "",
        password: "",
        role: "VIEWER",
      });

      const updatedUsers = await apiFetch<AppUser[]>("/api/users");
      setUsers(updatedUsers);
    } catch (requestError) {
      setError(toMessage(requestError));
    }
  };

  const updateUser = async (user: AppUser): Promise<void> => {
    try {
      setError("");
      await apiFetch<AppUser>(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: user.role,
          isActive: user.isActive,
        }),
      });

      const updatedUsers = await apiFetch<AppUser[]>("/api/users");
      setUsers(updatedUsers);
    } catch (requestError) {
      setError(toMessage(requestError));
    }
  };

  if (!token || !currentUser) {
    return (
      <main className="shell">
        <section className="login-card reveal">
          <p className="eyebrow">Finance Control Panel</p>
          <h1>Launch Backend Dashboard</h1>
          <p className="subtle">
            Deploy backend on Render, deploy this UI on Vercel, and verify
            role-based financial workflows in minutes.
          </p>

          <form className="stack" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="hint">
            Seed users: admin@finance.local / Admin@123, analyst@finance.local /
            Analyst@123, viewer@finance.local / Viewer@123
          </p>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar reveal">
        <div>
          <p className="eyebrow">Finance Data Processing and Access Control</p>
          <h1>Operational Dashboard</h1>
        </div>
        <div className="profile">
          <div>
            <strong>{currentUser.name}</strong>
            <p>
              {currentUser.role} · {currentUser.email}
            </p>
          </div>
          <button className="ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <p className="error reveal">{error}</p>}

      <section className="grid metrics reveal stagger-1">
        {summaryCards.map((item) => (
          <article key={item.label} className="metric-card">
            <p>{item.label}</p>
            <h2>{item.value}</h2>
          </article>
        ))}
      </section>

      <section className="grid two reveal stagger-2">
        <article className="panel">
          <h3>Record Filters</h3>
          <form className="filter-grid" onSubmit={applyFilters}>
            <select
              aria-label="Filter by record type"
              value={filters.type}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  type: event.target.value as RecordFilters["type"],
                }))
              }
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input
              placeholder="Category"
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  category: event.target.value,
                }))
              }
            />
            <input
              type="date"
              aria-label="Filter start date"
              value={filters.startDate}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  startDate: event.target.value,
                }))
              }
            />
            <input
              type="date"
              aria-label="Filter end date"
              value={filters.endDate}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, endDate: event.target.value }))
              }
            />
            <button type="submit">Apply Filters</button>
          </form>
        </article>

        <article className="panel">
          <h3>Monthly Trends (6 months)</h3>
          <ul className="trend-list">
            {trends?.monthlyTrends.map((item) => (
              <li key={item.month}>
                <span>{item.month}</span>
                <span>{currency(item.net)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid two reveal stagger-3">
        <article className="panel">
          <h3>Financial Records</h3>
          <p className="subtle">{records?.total ?? 0} records found</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {records?.items.map((record) => (
                  <tr key={record.id}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{record.type}</td>
                    <td>{record.category}</td>
                    <td>{currency(record.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <h3>Category Totals</h3>
          <ul className="trend-list">
            {summary?.categoryTotals.map((category) => (
              <li key={category.category}>
                <span>{category.category}</span>
                <span>{currency(category.net)}</span>
              </li>
            ))}
          </ul>
          <h3>Recent Activity</h3>
          <ul className="trend-list">
            {summary?.recentActivity.map((item) => (
              <li key={item.id}>
                <span>
                  {item.category} · {new Date(item.date).toLocaleDateString()}
                </span>
                <span>{currency(item.amount)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {isAdmin && (
        <section className="grid two reveal stagger-4">
          <article className="panel">
            <h3>Create Financial Record</h3>
            <form className="stack" onSubmit={createRecord}>
              <input
                type="number"
                placeholder="Amount"
                value={newRecordForm.amount}
                onChange={(event) =>
                  setNewRecordForm((prev) => ({
                    ...prev,
                    amount: event.target.value,
                  }))
                }
                required
              />
              <select
                aria-label="New record type"
                value={newRecordForm.type}
                onChange={(event) =>
                  setNewRecordForm((prev) => ({
                    ...prev,
                    type: event.target.value as NewRecordForm["type"],
                  }))
                }
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <input
                placeholder="Category"
                value={newRecordForm.category}
                onChange={(event) =>
                  setNewRecordForm((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
                }
                required
              />
              <input
                type="date"
                aria-label="New record date"
                value={newRecordForm.date}
                onChange={(event) =>
                  setNewRecordForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
                required
              />
              <textarea
                placeholder="Notes"
                value={newRecordForm.notes}
                onChange={(event) =>
                  setNewRecordForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                rows={3}
              />
              <button type="submit">Create Record</button>
            </form>
          </article>

          <article className="panel">
            <h3>Create User</h3>
            <form className="stack" onSubmit={createUser}>
              <input
                placeholder="Name"
                value={newUserForm.name}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newUserForm.email}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={newUserForm.password}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                required
              />
              <select
                aria-label="New user role"
                value={newUserForm.role}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    role: event.target.value as Role,
                  }))
                }
              >
                <option value="VIEWER">Viewer</option>
                <option value="ANALYST">Analyst</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button type="submit">Create User</button>
            </form>

            <h3>Manage Users</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>
                        <select
                          aria-label={`Role for ${user.name}`}
                          value={user.role}
                          onChange={(event) => {
                            const role = event.target.value as Role;
                            setUsers((prev) =>
                              prev.map((item) =>
                                item.id === user.id ? { ...item, role } : item,
                              ),
                            );
                          }}
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="ANALYST">Analyst</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td>
                        <label className="inline-switch">
                          <input
                            type="checkbox"
                            checked={user.isActive}
                            onChange={(event) => {
                              const isActive = event.target.checked;
                              setUsers((prev) =>
                                prev.map((item) =>
                                  item.id === user.id
                                    ? { ...item, isActive }
                                    : item,
                                ),
                              );
                            }}
                          />
                          <span>{user.isActive ? "Active" : "Inactive"}</span>
                        </label>
                      </td>
                      <td>
                        <button
                          className="small"
                          onClick={() => void updateUser(user)}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {dashboardLoading && <p className="subtle">Refreshing data...</p>}
    </main>
  );
}

const currency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
};

const buildRecordQuery = (filters: RecordFilters): string => {
  const params = new URLSearchParams({
    page: "1",
    pageSize: "20",
  });

  if (filters.type) {
    params.set("type", filters.type);
  }
  if (filters.category.trim()) {
    params.set("category", filters.category.trim());
  }
  if (filters.startDate) {
    params.set("startDate", new Date(filters.startDate).toISOString());
  }
  if (filters.endDate) {
    params.set("endDate", new Date(filters.endDate).toISOString());
  }

  return `/api/records?${params.toString()}`;
};

const toMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
};

export default App;
