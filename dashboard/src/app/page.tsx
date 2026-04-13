"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Order {
  id: number;
  retailcrm_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  status: string;
  city: string;
  address: string;
  total_amount: number;
  items: string | OrderItem[] | null;
  utm_source: string;
  created_at: string;
}

interface OrderItem {
  productName?: string;
  quantity?: number;
  initialPrice?: number;
}

const CHART_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#ec4899",
];

const SOURCE_COLORS: Record<string, string> = {
  instagram: "#ec4899",
  google: "#3b82f6",
  tiktok: "#14b8a6",
  direct: "#6366f1",
  referral: "#f59e0b",
  unknown: "#64748b",
};

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  tiktok: "TikTok",
  direct: "Прямой",
  referral: "Реферал",
  unknown: "Неизвестно",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  process: "В обработке",
  pending: "В ожидании",
  paid: "Оплачен",
  complete: "Завершен",
  completed: "Завершен",
  delivered: "Доставлен",
  success: "Успешно",
  cancel: "Отменен",
  cancelled: "Отменен",
  return: "Возврат",
  failed: "Ошибка",
};

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "16px",
  color: "#e2e8f0",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.25)",
  padding: "10px 12px",
};

function formatKZT(amount: number): string {
  return (
    new Intl.NumberFormat("ru-KZ", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount)) + " KZT"
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    notation: "compact",
    maximumFractionDigits: value >= 100_000 ? 1 : 0,
  }).format(value);
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  const percentage = value * 100;
  return `${percentage.toFixed(percentage >= 10 ? 0 : 1)}%`;
}

function formatChartDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function formatFullDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Нет данных"
    : date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function formatTableDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Нет данных"
    : date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function normaliseLabel(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function toDisplayLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function parseItems(items: Order["items"]): OrderItem[] {
  if (!items) {
    return [];
  }

  if (Array.isArray(items)) {
    return items;
  }

  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDelta(change: number | null): string {
  if (change === null || !Number.isFinite(change)) {
    return "Базовый период";
  }

  const prefix = change > 0 ? "+" : "";
  return `${prefix}${(change * 100).toFixed(1)}%`;
}

function formatChange(change: number | null): string {
  if (change === null || !Number.isFinite(change)) {
    return "Недостаточно данных";
  }

  const prefix = change > 0 ? "+" : "";
  return `${prefix}${(change * 100).toFixed(1)}% к пред. 7 дням`;
}

function getSourceColor(source: string, index: number): string {
  return SOURCE_COLORS[source.toLowerCase()] || CHART_COLORS[index % CHART_COLORS.length];
}

function getSourceLabel(source: string): string {
  const key = source.toLowerCase();
  return SOURCE_LABELS[key] || toDisplayLabel(source);
}

function getStatusTone(status: string): string {
  const value = status.toLowerCase();

  if (
    value.includes("deliver") ||
    value.includes("достав") ||
    value.includes("paid") ||
    value.includes("оплач") ||
    value.includes("complete") ||
    value.includes("заверш") ||
    value.includes("success")
  ) {
    return "status-chip status-chip--success";
  }

  if (
    value.includes("cancel") ||
    value.includes("отмен") ||
    value.includes("fail") ||
    value.includes("ошиб") ||
    value.includes("return") ||
    value.includes("возврат")
  ) {
    return "status-chip status-chip--danger";
  }

  if (
    value.includes("new") ||
    value.includes("нов") ||
    value.includes("process") ||
    value.includes("обработ") ||
    value.includes("pending") ||
    value.includes("ожидан")
  ) {
    return "status-chip status-chip--info";
  }

  return "status-chip status-chip--neutral";
}

function getStatusLabel(status: string): string {
  const normalised = status.toLowerCase();
  const translated = Object.entries(STATUS_LABELS).find(([token]) =>
    normalised.includes(token)
  )?.[1];

  return translated || toDisplayLabel(status);
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchOrders() {
      try {
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (!active) {
          return;
        }

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setOrders((data as Order[]) || []);
      } catch (err) {
        if (active) {
          setError(String(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      active = false;
    };
  }, []);

  const analytics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    const highValueOrders = orders.filter(
      (order) => (Number(order.total_amount) || 0) >= 50_000
    ).length;
    const highValueRevenue = orders.reduce((sum, order) => {
      const amount = Number(order.total_amount) || 0;
      return amount >= 50_000 ? sum + amount : sum;
    }, 0);

    const cityCountMap: Record<string, number> = {};
    const cityRevenueMap: Record<string, number> = {};
    const sourceMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    const trendMap: Record<string, { orders: number; revenue: number }> = {};
    const productMap: Record<string, { count: number; revenue: number }> = {};

    orders.forEach((order) => {
      const amount = Number(order.total_amount) || 0;
      const city = normaliseLabel(order.city, "Неизвестный город");
      const source = normaliseLabel(order.utm_source, "Прямой");
      const status = normaliseLabel(order.status, "Неизвестно");

      cityCountMap[city] = (cityCountMap[city] || 0) + 1;
      cityRevenueMap[city] = (cityRevenueMap[city] || 0) + amount;
      sourceMap[source] = (sourceMap[source] || 0) + 1;
      statusMap[status] = (statusMap[status] || 0) + 1;

      const dateKey = order.created_at ? order.created_at.split("T")[0] : "";
      if (dateKey) {
        if (!trendMap[dateKey]) {
          trendMap[dateKey] = { orders: 0, revenue: 0 };
        }
        trendMap[dateKey].orders += 1;
        trendMap[dateKey].revenue += amount;
      }

      parseItems(order.items).forEach((item) => {
        const productName = normaliseLabel(item.productName, "Неизвестный товар");
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.initialPrice) || 0;

        if (!productMap[productName]) {
          productMap[productName] = { count: 0, revenue: 0 };
        }

        productMap[productName].count += quantity;
        productMap[productName].revenue += price * quantity;
      });
    });

    const cityRevenueData = Object.entries(cityRevenueMap)
      .map(([name, revenue]) => ({
        name,
        revenue,
        value: cityCountMap[name] || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const sourceData = Object.entries(sourceMap)
      .map(([name, value]) => ({
        name,
        label: getSourceLabel(name),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const statusData = Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const trendData = Object.entries(trendMap)
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const productData = Object.entries(productMap)
      .map(([name, data]) => ({
        name: name.length > 24 ? `${name.slice(0, 24)}...` : name,
        fullName: name,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const last7Days = trendData.slice(-7);
    const previous7Days = trendData.slice(-14, -7);
    const last7Revenue = last7Days.reduce((sum, day) => sum + day.revenue, 0);
    const previous7Revenue = previous7Days.reduce((sum, day) => sum + day.revenue, 0);
    const last7Orders = last7Days.reduce((sum, day) => sum + day.orders, 0);
    const previous7Orders = previous7Days.reduce((sum, day) => sum + day.orders, 0);

    const revenueMomentum =
      previous7Revenue > 0 ? (last7Revenue - previous7Revenue) / previous7Revenue : null;
    const ordersMomentum =
      previous7Orders > 0 ? (last7Orders - previous7Orders) / previous7Orders : null;

    const activeDays = trendData.length;
    const avgDailyRevenue = activeDays ? totalRevenue / activeDays : 0;

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      highValueOrders,
      highValueRevenueShare: totalRevenue ? highValueRevenue / totalRevenue : 0,
      cityRevenueData,
      sourceData,
      statusData,
      trendData,
      productData,
      last7Days,
      last7Revenue,
      last7Orders,
      revenueMomentum,
      ordersMomentum,
      activeDays,
      avgDailyRevenue,
      latestOrder: orders[0] || null,
      topCity: cityRevenueData[0],
      topSource: sourceData[0],
      topProduct: productData[0],
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="dashboard-state">
        <div className="dashboard-state-card dashboard-state-card--center">
          <div className="dashboard-spinner" />
          <h1>Загружаем аналитическую панель</h1>
          <p>Подготавливаем динамику выручки, активность заказов и ключевые товары.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-state">
        <div className="dashboard-state-card">
          <p className="dashboard-state__label">Ошибка подключения</p>
          <h1>Не удалось загрузить панель</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="dashboard-state">
        <div className="dashboard-state-card">
          <p className="dashboard-state__label">Данных пока нет</p>
          <h1>Заказы не найдены</h1>
          <p>Добавьте данные о заказах в Supabase, и панель заполнится автоматически.</p>
        </div>
      </div>
    );
  }

  const {
    totalOrders,
    totalRevenue,
    avgOrderValue,
    highValueOrders,
    highValueRevenueShare,
    cityRevenueData,
    sourceData,
    statusData,
    trendData,
    productData,
    last7Days,
    last7Revenue,
    last7Orders,
    revenueMomentum,
    ordersMomentum,
    activeDays,
    avgDailyRevenue,
    latestOrder,
    topCity,
    topSource,
    topProduct,
  } = analytics;

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <div className="dashboard-hero__content">
          <p className="dashboard-eyebrow">Панель аналитики GBC</p>
          <h1 className="dashboard-hero__title">
            Командный центр для продаж и заказов.
          </h1>
          <p className="dashboard-hero__description">
            Следите за выручкой, каналами привлечения, географией и спросом на товары
            в одной структурированной панели для быстрых ежедневных решений.
          </p>

          <div className="dashboard-hero__meta">
            <span className="dashboard-live-badge">
              <span className="dashboard-live-dot" />
              Живые данные
            </span>
            <span className="dashboard-meta-pill">
              Последний заказ {latestOrder?.created_at ? formatFullDate(latestOrder.created_at) : "Нет данных"}
            </span>
          </div>
        </div>

        <aside className="dashboard-hero__panel" aria-label="Сводка по выручке">
          <div>
            <p className="dashboard-panel-label">Сводка по выручке</p>
            <div className="dashboard-panel-value">{formatKZT(totalRevenue)}</div>
            <p className="dashboard-panel-trend">{formatChange(revenueMomentum)}</p>
          </div>

          <div className="dashboard-panel-grid">
            <MiniMetric label="Доля выручки 50K+" value={formatPercent(highValueRevenueShare)} />
            <MiniMetric label="Ср. дневная выручка" value={formatKZT(avgDailyRevenue)} />
            <MiniMetric label="Лучший источник" value={topSource ? topSource.label : "Нет данных"} />
            <MiniMetric label="Лучший город" value={topCity ? topCity.name : "Нет данных"} />
          </div>
        </aside>
      </section>

      <section className="dashboard-stats-grid" aria-label="Основные показатели">
        <StatCard
          label="Всего заказов"
          value={String(totalOrders)}
          meta={`${last7Orders} за последние 7 активных дней`}
          tone="#3b82f6"
        />
        <StatCard
          label="Общая выручка"
          value={formatKZT(totalRevenue)}
          meta={formatChange(revenueMomentum)}
          tone="#14b8a6"
        />
        <StatCard
          label="Средний чек"
          value={formatKZT(avgOrderValue)}
          meta={`${activeDays} активных дней в истории`}
          tone="#8b5cf6"
        />
        <StatCard
          label="Крупные заказы"
          value={String(highValueOrders)}
          meta={`${formatPercent(highValueOrders / totalOrders)} от всех заказов`}
          tone="#ef4444"
        />
      </section>

      <section className="dashboard-highlight-grid" aria-label="Ключевые акценты">
        <InsightTile
          title="Лучший город"
          value={topCity ? topCity.name : "Нет данных"}
          description={
            topCity
              ? `${topCity.value} заказов | ${formatKZT(topCity.revenue)}`
              : "Данные по городам появятся после добавления заказов."
          }
          tone="#3b82f6"
        />
        <InsightTile
          title="Лучший источник"
          value={topSource ? topSource.label : "Нет данных"}
          description={
            topSource
              ? `${topSource.value} атрибутированных заказов`
              : "Атрибуция источников появится после настройки."
          }
          tone="#14b8a6"
        />
        <InsightTile
          title="Топ товар"
          value={topProduct ? topProduct.fullName : "Нет данных о товарах"}
          description={
            topProduct
              ? `${formatKZT(topProduct.revenue)} • ${topProduct.count} продано`
              : "Рейтинг товаров появится, когда в заказах будут позиции товаров."
          }
          tone="#8b5cf6"
        />
        <InsightTile
          title="Динамика за 7 дней"
          value={formatDelta(ordersMomentum)}
          description={`${last7Orders} заказов и ${formatKZT(last7Revenue)} за последние 7 активных дней.`}
          tone="#f59e0b"
        />
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <p className="dashboard-section__eyebrow">Динамика</p>
            <h2 className="dashboard-section__title">Выручка и поток заказов</h2>
            <p className="dashboard-section__description">
              Дневная динамика по всей доступной истории заказов.
            </p>
          </div>
        </div>

        <div className="dashboard-grid dashboard-grid--trend">
          <article className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h3 className="dashboard-card__title">Выручка по дням</h3>
                <p className="dashboard-card__description">
                  Здесь удобно видеть всплески, просадки и сезонность выручки.
                </p>
              </div>
              <span className="dashboard-card__badge">{formatKZT(last7Revenue)} за 7 дней</span>
            </div>

            <div className="dashboard-chart dashboard-chart--large">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={22}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCompact(Number(value))}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number | string) => formatKZT(Number(value))}
                    labelFormatter={(label) => formatFullDate(`${String(label)}T00:00:00`)}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Выручка"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#dashboardRevenueGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <div className="dashboard-stack">
            <article className="dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <h3 className="dashboard-card__title">Темп последних заказов</h3>
                  <p className="dashboard-card__description">
                    Дневной объем заказов за последние 7 активных дней.
                  </p>
                </div>
              </div>

              <div className="dashboard-chart dashboard-chart--compact">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7Days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number | string) => `${value} заказов`}
                      labelFormatter={(label) => formatFullDate(`${String(label)}T00:00:00`)}
                    />
                    <Bar dataKey="orders" name="Заказы" fill="#6366f1" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <h3 className="dashboard-card__title">Статусы заказов</h3>
                  <p className="dashboard-card__description">
                    Текущий баланс по этапам обработки заказов.
                  </p>
                </div>
              </div>

              <ul className="dashboard-progress-list">
                {statusData.slice(0, 5).map((item, index) => {
                  const share = totalOrders ? (item.value / totalOrders) * 100 : 0;

                  return (
                    <li key={`${item.name}-${index}`} className="dashboard-progress-list__item">
                      <div className="dashboard-progress-list__row">
                        <span>{getStatusLabel(item.name)}</span>
                        <strong>{item.value}</strong>
                      </div>
                      <div className="dashboard-progress-track">
                        <span style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <p className="dashboard-section__eyebrow">Источники</p>
            <h2 className="dashboard-section__title">
              Откуда приходят заказы и где формируется выручка
            </h2>
            <p className="dashboard-section__description">
              Каналы привлечения и вклад городов в одном понятном блоке.
            </p>
          </div>
        </div>

        <div className="dashboard-grid dashboard-grid--dual">
          <article className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h3 className="dashboard-card__title">Топ городов по выручке</h3>
                <p className="dashboard-card__description">
                  Города с наибольшей выручкой в текущем наборе данных.
                </p>
              </div>
              <span className="dashboard-card__badge">{topCity ? topCity.name : "Нет данных"}</span>
            </div>

            <div className="dashboard-chart dashboard-chart--medium">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cityRevenueData}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCompact(Number(value))}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number | string) => formatKZT(Number(value))}
                  />
                  <Bar dataKey="revenue" name="Выручка" fill="#14b8a6" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h3 className="dashboard-card__title">Структура источников</h3>
                <p className="dashboard-card__description">
                  Вклад маркетинговых каналов по атрибутированным заказам.
                </p>
              </div>
              <span className="dashboard-card__badge">
                {topSource ? `Лидер канала: ${topSource.label}` : "Нет данных"}
              </span>
            </div>

            <div className="dashboard-source-layout">
              <div className="dashboard-chart dashboard-chart--medium">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={64}
                      outerRadius={104}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={getSourceColor(entry.name, index)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number | string) => `${value} заказов`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="dashboard-ranking-list">
                {sourceData.map((source, index) => (
                  <li key={`${source.name}-${index}`} className="dashboard-ranking-list__item">
                    <span
                      className="dashboard-ranking-list__swatch"
                      style={{ backgroundColor: getSourceColor(source.name, index) }}
                    />
                    <div className="dashboard-ranking-list__content">
                      <span className="dashboard-ranking-list__label">{source.label}</span>
                      <span className="dashboard-ranking-list__meta">
                        {totalOrders ? formatPercent(source.value / totalOrders) : "0%"} от всех заказов
                      </span>
                    </div>
                    <strong className="dashboard-ranking-list__value">{source.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <p className="dashboard-section__eyebrow">Товары</p>
            <h2 className="dashboard-section__title">Топ товаров по выручке</h2>
            <p className="dashboard-section__description">
              Сфокусированный обзор товаров, которые приносят больше всего выручки.
            </p>
          </div>
          <span className="dashboard-section__note">
            Лидер продаж {topProduct ? topProduct.fullName : "Нет данных"}
          </span>
        </div>

        <article className="dashboard-card">
          <div className="dashboard-chart dashboard-chart--product">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productData}
                layout="vertical"
                margin={{ top: 4, right: 14, left: 18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="4 4" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatCompact(Number(value))}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | string) => formatKZT(Number(value))}
                  labelFormatter={(label) =>
                    productData.find((item) => item.name === label)?.fullName || String(label)
                  }
                />
                <Bar dataKey="revenue" name="Выручка" fill="#8b5cf6" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <p className="dashboard-section__eyebrow">Операции</p>
            <h2 className="dashboard-section__title">Последние заказы</h2>
            <p className="dashboard-section__description">
              Последние клиентские заказы со статусом, источником и суммой в одном списке.
            </p>
          </div>
          <span className="dashboard-section__note">Показываем последние 12 заказов</span>
        </div>

        <article className="dashboard-card">
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th scope="col">Клиент</th>
                  <th scope="col">Город</th>
                  <th scope="col">Сумма</th>
                  <th scope="col">Источник</th>
                  <th scope="col">Статус</th>
                  <th scope="col">Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 12).map((order, index) => {
                  const sourceName = normaliseLabel(order.utm_source, "Прямой");
                  const sourceColor = getSourceColor(sourceName, index);

                  return (
                    <tr key={order.id}>
                      <td>
                        <div className="dashboard-customer">
                          <span className="dashboard-customer__name">
                            {normaliseLabel(
                              `${order.first_name} ${order.last_name}`.trim(),
                              "Неизвестный клиент"
                            )}
                          </span>
                          <span className="dashboard-customer__id">
                            {normaliseLabel(order.retailcrm_id, String(order.id))}
                          </span>
                        </div>
                      </td>
                      <td>{normaliseLabel(order.city, "Неизвестный город")}</td>
                      <td className="dashboard-table__value">
                        {formatKZT(Number(order.total_amount) || 0)}
                      </td>
                      <td>
                        <span
                          className="source-chip"
                          style={{
                            backgroundColor: `${sourceColor}14`,
                            borderColor: `${sourceColor}33`,
                            color: sourceColor,
                          }}
                        >
                          {getSourceLabel(sourceName)}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusTone(normaliseLabel(order.status, "Неизвестно"))}>
                          {getStatusLabel(normaliseLabel(order.status, "Неизвестно"))}
                        </span>
                      </td>
                      <td>{formatTableDate(order.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <footer className="dashboard-footer">
        Панель создана для более понятной ежедневной работы с Next.js, Supabase и Recharts.
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string;
  meta: string;
  tone: string;
}) {
  return (
    <article className="dashboard-stat-card" style={{ "--card-accent": tone } as CSSProperties}>
      <p className="dashboard-stat-card__label">{label}</p>
      <p className="dashboard-stat-card__value">{value}</p>
      <p className="dashboard-stat-card__meta">{meta}</p>
    </article>
  );
}

function InsightTile({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: string;
}) {
  return (
    <article className="dashboard-insight-card" style={{ "--tile-accent": tone } as CSSProperties}>
      <p className="dashboard-insight-card__title">{title}</p>
      <strong className="dashboard-insight-card__value">{value}</strong>
      <p className="dashboard-insight-card__description">{description}</p>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-mini-metric">
      <span className="dashboard-mini-metric__label">{label}</span>
      <strong className="dashboard-mini-metric__value">{value}</strong>
    </div>
  );
}
