import { useState, useEffect, useMemo } from "react";

const INITIAL_PRODUCTS = [];
const INITIAL_SALES = [];
const CATEGORIES = ["Descartável", "Pod Fechado", "Pod Aberto", "Acessório"];

const Icon = ({ path, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const ICONS = {
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  products: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8L6 7h12l-2-4z",
  sales: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  package: "M12 2l9 4.5v9L12 20l-9-4.5v-9L12 2zM12 2v18M3 6.5l9 4.5 9-4.5",
  cart: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
};

const formatCurrency = (val) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const formatDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

// localStorage helpers
const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};
const save = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [products, setProducts] = useState(() => load("podctrl_products", INITIAL_PRODUCTS));
  const [sales, setSales] = useState(() => load("podctrl_sales", INITIAL_SALES));
  const [modal, setModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saleForm, setSaleForm] = useState({ productId: "", qty: 1, price: "", date: new Date().toISOString().slice(0, 10) });
  const [productForm, setProductForm] = useState({ name: "", flavor: "", cost: "", price: "", stock: "", category: "Descartável" });
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);

  // Persist on change
  useEffect(() => { save("podctrl_products", products); }, [products]);
  useEffect(() => { save("podctrl_sales", sales); }, [sales]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((s, v) => s + v.price * v.qty, 0);
    const totalCost = sales.reduce((s, v) => s + v.cost * v.qty, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalUnits = sales.reduce((s, v) => s + v.qty, 0);
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const lowStock = products.filter((p) => p.stock <= 5);
    return { totalRevenue, totalCost, totalProfit, totalUnits, margin, lowStock };
  }, [sales, products]);

  const salesByProduct = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      if (!map[s.productId]) map[s.productId] = { name: s.productName, flavor: s.flavor, qty: 0, revenue: 0, profit: 0 };
      map[s.productId].qty += s.qty;
      map[s.productId].revenue += s.price * s.qty;
      map[s.productId].profit += (s.price - s.cost) * s.qty;
    });
    return Object.values(map).sort((a, b) => b.profit - a.profit);
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (filter === "all") return [...sales].reverse();
    const now = new Date();
    return [...sales].reverse().filter((s) => {
      const d = new Date(s.date + "T00:00:00");
      if (filter === "week") { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
      if (filter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [sales, filter]);

  const openAddSale = () => {
    const first = products[0];
    setSaleForm({ productId: first?.id || "", qty: 1, price: first?.price || "", date: new Date().toISOString().slice(0, 10) });
    setModal("addSale");
  };

  const handleSaleProductChange = (id) => {
    const p = products.find((x) => x.id === Number(id));
    setSaleForm((f) => ({ ...f, productId: id, price: p?.price || "" }));
  };

  const submitSale = () => {
    const p = products.find((x) => x.id === Number(saleForm.productId));
    if (!p) return;
    if (p.stock < saleForm.qty) { showToast("Estoque insuficiente!", "error"); return; }
    const newSale = { id: Date.now(), productId: p.id, productName: p.name, flavor: p.flavor, qty: Number(saleForm.qty), price: Number(saleForm.price), cost: p.cost, date: saleForm.date };
    setSales((prev) => [...prev, newSale]);
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, stock: x.stock - Number(saleForm.qty) } : x));
    setModal(null);
    showToast("Venda registrada!");
  };

  const openAddProduct = () => {
    setProductForm({ name: "", flavor: "", cost: "", price: "", stock: "", category: "Descartável" });
    setSelectedProduct(null);
    setModal("addProduct");
  };

  const openEditProduct = (p) => {
    setProductForm({ name: p.name, flavor: p.flavor, cost: p.cost, price: p.price, stock: p.stock, category: p.category });
    setSelectedProduct(p);
    setModal("editProduct");
  };

  const submitProduct = () => {
    if (!productForm.name || !productForm.cost || !productForm.price || productForm.stock === "") {
      showToast("Preencha todos os campos!", "error"); return;
    }
    const entry = { name: productForm.name, flavor: productForm.flavor, cost: Number(productForm.cost), price: Number(productForm.price), stock: Number(productForm.stock), category: productForm.category };
    if (modal === "editProduct" && selectedProduct) {
      setProducts((prev) => prev.map((x) => x.id === selectedProduct.id ? { ...x, ...entry } : x));
      showToast("Produto atualizado!");
    } else {
      setProducts((prev) => [...prev, { id: Date.now(), ...entry }]);
      showToast("Produto adicionado!");
    }
    setModal(null);
  };

  const deleteProduct = (id) => { setProducts((prev) => prev.filter((x) => x.id !== id)); showToast("Produto removido."); };
  const deleteSale = (id) => {
    const s = sales.find((x) => x.id === id);
    if (s) setProducts((prev) => prev.map((x) => x.id === s.productId ? { ...x, stock: x.stock + s.qty } : x));
    setSales((prev) => prev.filter((x) => x.id !== id));
    showToast("Venda removida.");
  };

  const NAV = [
    { id: "dashboard", label: "Início", icon: ICONS.dashboard },
    { id: "products", label: "Produtos", icon: ICONS.package },
    { id: "sales", label: "Vendas", icon: ICONS.cart },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0a0a0f", minHeight: "100dvh", color: "#e8e8f0", paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { overscroll-behavior: none; }
        ::-webkit-scrollbar { display: none; }
        input, select, button { -webkit-appearance: none; outline: none; font-family: 'DM Sans', sans-serif; }
        .card { background: #111118; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; }
        .stat-card { background: #111118; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 18px; }
        .btn-primary { background: linear-gradient(135deg, #6366f1, #818cf8); border: none; color: white; padding: 13px 20px; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; transition: opacity .15s; }
        .btn-primary:active { opacity: .75; }
        .btn-sm { background: linear-gradient(135deg, #6366f1, #818cf8); border: none; color: white; padding: 10px 16px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; }
        .btn-ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #aaa; padding: 10px 14px; border-radius: 10px; cursor: pointer; font-size: 13px; }
        .btn-danger { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.2); color: #f87171; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: flex-end; justify-content: center; z-index: 100; backdrop-filter: blur(6px); }
        .modal { background: #14141e; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px 24px 0 0; padding: 28px 20px 40px; width: 100%; max-height: 92dvh; overflow-y: auto; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 7px; }
        .field input, .field select { width: 100%; background: #0f0f18; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px 14px; color: #e8e8f0; font-size: 16px; transition: border-color .15s; }
        .field input:focus, .field select:focus { border-color: #6366f1; }
        .field select option { background: #14141e; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge-green { background: rgba(34,197,94,0.15); color: #4ade80; }
        .badge-yellow { background: rgba(234,179,8,0.15); color: #facc15; }
        .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
        .badge-blue { background: rgba(99,102,241,0.15); color: #818cf8; }
        .tab-pill { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 7px 16px; font-size: 13px; cursor: pointer; color: #666; white-space: nowrap; }
        .tab-pill.active { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.3); color: #818cf8; }
        .row-item { border-bottom: 1px solid rgba(255,255,255,0.04); }
        .row-item:last-child { border-bottom: none; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(13,13,20,0.95); border-top: 1px solid rgba(255,255,255,0.06); display: flex; padding: 10px 0 calc(10px + env(safe-area-inset-bottom)); backdrop-filter: blur(20px); z-index: 50; }
        .nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; padding: 6px; color: #555; font-size: 11px; font-weight: 500; transition: color .15s; }
        .nav-btn.active { color: #818cf8; }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .animate-in { animation: slideUp .25s ease forwards; }
        @keyframes sheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        .modal { animation: sheetUp .3s cubic-bezier(.32,.72,0,1) forwards; }
        @keyframes toastIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        .toast { animation: toastIn .2s ease; }
        .grid-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .section-title { font-size: 11px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 14px; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: toast.type === "error" ? "#2d1a1a" : "#1a2d20", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.4)"}`, borderRadius: 40, padding: "10px 20px", fontSize: 14, fontWeight: 600, color: toast.type === "error" ? "#f87171" : "#4ade80", whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "calc(env(safe-area-inset-top) + 16px) 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 700, color: "#fff" }}>
          POD<span style={{ color: "#6366f1" }}>CTRL</span>
        </div>
        {(tab === "sales" || tab === "dashboard") && products.length > 0 && (
          <button className="btn-sm" onClick={openAddSale}>
            <Icon path={ICONS.plus} size={14} /> Venda
          </button>
        )}
        {tab === "products" && (
          <button className="btn-sm" onClick={openAddProduct}>
            <Icon path={ICONS.plus} size={14} /> Produto
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 20px 0" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="animate-in">
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontFamily: "'Space Grotesk'", fontWeight: 700, color: "#fff" }}>Dashboard</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>Visão geral da loja</div>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Receita Total", value: formatCurrency(stats.totalRevenue), color: "#818cf8" },
                { label: "Lucro Líquido", value: formatCurrency(stats.totalProfit), color: "#4ade80" },
                { label: "Custo Total", value: formatCurrency(stats.totalCost), color: "#fb923c" },
                { label: "Unidades Vendidas", value: stats.totalUnits, color: "#f472b6" },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk'" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Margem */}
            {sales.length > 0 && (
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "#888" }}>Margem de Lucro</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#4ade80" }}>{stats.margin.toFixed(1)}%</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(stats.margin, 100)}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #4ade80)", borderRadius: 4 }} />
                </div>
              </div>
            )}

            {/* Low stock */}
            {stats.lowStock.length > 0 && (
              <div className="card" style={{ padding: 16, marginBottom: 16, borderColor: "rgba(234,179,8,0.2)" }}>
                <div className="section-title" style={{ color: "#facc15", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon path={ICONS.alert} size={12} color="#facc15" /> Estoque Baixo
                </div>
                {stats.lowStock.map((p) => (
                  <div key={p.id} className="row-item" style={{ padding: "10px 0", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, color: "#ccc" }}>{p.name}</span>
                    <span className={`badge ${p.stock === 0 ? "badge-red" : "badge-yellow"}`}>{p.stock} un.</span>
                  </div>
                ))}
              </div>
            )}

            {/* Top products */}
            {salesByProduct.length > 0 && (
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div className="section-title">Top Produtos</div>
                {salesByProduct.slice(0, 5).map((p, i) => (
                  <div key={i} className="row-item" style={{ padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `hsl(${i * 60 + 240}, 60%, 35%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{i + 1}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>{p.qty} un.</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>{formatCurrency(p.profit)}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>lucro</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Últimas vendas */}
            {sales.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <div className="section-title">Últimas Vendas</div>
                {[...sales].reverse().slice(0, 5).map((s) => (
                  <div key={s.id} className="row-item" style={{ padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd" }}>{s.productName}</div>
                      <div style={{ fontSize: 12, color: "#555" }}>{formatDate(s.date)} · {s.qty}x</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#818cf8" }}>{formatCurrency(s.price * s.qty)}</div>
                      <div style={{ fontSize: 11, color: "#4ade80" }}>+{formatCurrency((s.price - s.cost) * s.qty)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sales.length === 0 && products.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#444" }}>
                <Icon path={ICONS.package} size={48} color="#2a2a3a" />
                <p style={{ marginTop: 16, fontSize: 15 }}>Comece cadastrando seus produtos</p>
                <button className="btn-primary" style={{ marginTop: 16, width: "auto", padding: "12px 24px" }} onClick={() => setTab("products")}>Cadastrar Produto</button>
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS */}
        {tab === "products" && (
          <div className="animate-in">
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontFamily: "'Space Grotesk'", fontWeight: 700, color: "#fff" }}>Produtos</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{products.length} modelos</div>
            </div>

            {products.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#444" }}>
                <Icon path={ICONS.package} size={48} color="#2a2a3a" />
                <p style={{ marginTop: 16, fontSize: 15 }}>Nenhum produto ainda</p>
                <button className="btn-primary" style={{ marginTop: 16, width: "auto", padding: "12px 24px" }} onClick={openAddProduct}>+ Adicionar Produto</button>
              </div>
            )}

            {products.map((p) => {
              const profit = p.price - p.cost;
              const margin = p.price > 0 ? ((profit / p.price) * 100).toFixed(0) : 0;
              return (
                <div key={p.id} className="card row-item" style={{ padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{p.flavor}</div>
                    </div>
                    <span className={`badge ${p.stock === 0 ? "badge-red" : p.stock <= 5 ? "badge-yellow" : "badge-green"}`}>{p.stock} un.</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
                      { label: "Custo", value: formatCurrency(p.cost), color: "#fb923c" },
                      { label: "Venda", value: formatCurrency(p.price), color: "#818cf8" },
                      { label: `Lucro ${margin}%`, value: formatCurrency(profit), color: "#4ade80" },
                    ].map((x) => (
                      <div key={x.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>{x.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: x.color }}>{x.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-ghost" style={{ flex: 1, display: "flex", justifyContent: "center", gap: 6 }} onClick={() => openEditProduct(p)}>
                      <Icon path={ICONS.edit} size={14} /> Editar
                    </button>
                    <button className="btn-danger" onClick={() => deleteProduct(p.id)}>
                      <Icon path={ICONS.trash} size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SALES */}
        {tab === "sales" && (
          <div className="animate-in">
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontFamily: "'Space Grotesk'", fontWeight: 700, color: "#fff" }}>Vendas</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{sales.length} registros</div>
            </div>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
              {[["all", "Todas"], ["month", "Este Mês"], ["week", "Esta Semana"]].map(([v, l]) => (
                <button key={v} className={`tab-pill ${filter === v ? "active" : ""}`} onClick={() => setFilter(v)}>{l}</button>
              ))}
            </div>

            {/* Summary */}
            {filteredSales.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div className="stat-card">
                  <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>RECEITA</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#818cf8" }}>{formatCurrency(filteredSales.reduce((s, v) => s + v.price * v.qty, 0))}</div>
                </div>
                <div className="stat-card">
                  <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>LUCRO</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80" }}>{formatCurrency(filteredSales.reduce((s, v) => s + (v.price - v.cost) * v.qty, 0))}</div>
                </div>
              </div>
            )}

            {filteredSales.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#444" }}>
                <Icon path={ICONS.cart} size={48} color="#2a2a3a" />
                <p style={{ marginTop: 16, fontSize: 15 }}>Nenhuma venda no período</p>
              </div>
            )}

            {filteredSales.map((s) => {
              const total = s.price * s.qty;
              const profit = (s.price - s.cost) * s.qty;
              return (
                <div key={s.id} className="card" style={{ padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{s.productName}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{s.flavor} · {formatDate(s.date)}</div>
                    </div>
                    <button className="btn-danger" style={{ padding: "6px 10px" }} onClick={() => deleteSale(s.id)}>
                      <Icon path={ICONS.trash} size={13} />
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#666" }}>{s.qty}x · {formatCurrency(s.price)} un.</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#818cf8" }}>{formatCurrency(total)}</div>
                      <div style={{ fontSize: 12, color: "#4ade80" }}>+{formatCurrency(profit)} lucro</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {NAV.map((item) => (
          <button key={item.id} className={`nav-btn ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
            <Icon path={item.icon} size={22} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* MODAL: Add/Edit Product */}
      {(modal === "addProduct" || modal === "editProduct") && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 700, color: "#fff" }}>
                {modal === "editProduct" ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "#aaa", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon path={ICONS.x} size={16} />
              </button>
            </div>
            <div className="field"><label>Nome do Modelo *</label><input placeholder="ex: LOST Mary BM600" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="field"><label>Sabor</label><input placeholder="ex: Blueberry Ice" value={productForm.flavor} onChange={e => setProductForm(f => ({ ...f, flavor: e.target.value }))} /></div>
            <div className="field"><label>Categoria</label><select value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="grid-fields">
              <div className="field"><label>Custo (R$) *</label><input type="number" inputMode="decimal" placeholder="0,00" value={productForm.cost} onChange={e => setProductForm(f => ({ ...f, cost: e.target.value }))} /></div>
              <div className="field"><label>Preço Venda (R$) *</label><input type="number" inputMode="decimal" placeholder="0,00" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} /></div>
            </div>
            <div className="field"><label>Estoque *</label><input type="number" inputMode="numeric" placeholder="0" value={productForm.stock} onChange={e => setProductForm(f => ({ ...f, stock: e.target.value }))} /></div>
            {productForm.cost && productForm.price && Number(productForm.price) > 0 && (
              <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#818cf8" }}>
                Lucro: <strong>{formatCurrency(Number(productForm.price) - Number(productForm.cost))}</strong> por unidade ({((Number(productForm.price) - Number(productForm.cost)) / Number(productForm.price) * 100).toFixed(1)}% margem)
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={submitProduct}><Icon path={ICONS.check} size={15} /> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Sale */}
      {modal === "addSale" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 700, color: "#fff" }}>Registrar Venda</h2>
              <button onClick={() => setModal(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "#aaa", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon path={ICONS.x} size={16} />
              </button>
            </div>
            <div className="field">
              <label>Produto</label>
              <select value={saleForm.productId} onChange={e => handleSaleProductChange(e.target.value)}>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — {p.flavor} ({p.stock} em estoque)</option>)}
              </select>
            </div>
            <div className="grid-fields">
              <div className="field"><label>Quantidade</label><input type="number" inputMode="numeric" min="1" value={saleForm.qty} onChange={e => setSaleForm(f => ({ ...f, qty: Number(e.target.value) }))} /></div>
              <div className="field"><label>Preço (R$)</label><input type="number" inputMode="decimal" value={saleForm.price} onChange={e => setSaleForm(f => ({ ...f, price: e.target.value }))} /></div>
            </div>
            <div className="field"><label>Data</label><input type="date" value={saleForm.date} onChange={e => setSaleForm(f => ({ ...f, date: e.target.value }))} /></div>
            {saleForm.price && saleForm.productId && (() => {
              const p = products.find(x => x.id === Number(saleForm.productId));
              const profit = (Number(saleForm.price) - (p?.cost || 0)) * saleForm.qty;
              const total = Number(saleForm.price) * saleForm.qty;
              return (
                <div style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
                    <span style={{ color: "#777" }}>Total</span>
                    <span style={{ color: "#818cf8", fontWeight: 700 }}>{formatCurrency(total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: "#777" }}>Lucro</span>
                    <span style={{ color: "#4ade80", fontWeight: 700 }}>+{formatCurrency(profit)}</span>
                  </div>
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={submitSale}><Icon path={ICONS.check} size={15} /> Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
