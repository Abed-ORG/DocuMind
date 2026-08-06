import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "react-router";
import {
  BarChart3,
  Database,
  FileText,
  Info,
  MessageSquareText,
  PieChart,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "../../../context/AuthContext";
import { getWorkspaceAnalytics } from "../../../services/api";
import { WorkspaceStatusPanel } from "../components/feedback";

const chartColors = [
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-warning)",
  "#64748b",
  "#dc2626",
  "#10b981",
];

const dateRangeOptions = [
  {
    label: "Last 7 days",
    value: 7,
  },
  {
    label: "Last 30 days",
    value: 30,
  },
  {
    label: "Last 90 days",
    value: 90,
  },
];

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(
    value ?? 0
  );
}

function formatChartDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTooltipDate(value) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatQueryCountLabel(value) {
  return `${formatNumber(value)} ${
    value === 1 ? "query" : "queries"
  }`;
}

function titleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getBarWidth(value, maxValue) {
  if (!maxValue) {
    return "0%";
  }

  return `${Math.max(
    8,
    Math.round((value / maxValue) * 100)
  )}%`;
}

function getQuerySummary(series = []) {
  const activeDays = series.filter(
    (item) => item.count > 0
  ).length;
  const totalQueries = series.reduce(
    (sum, item) => sum + item.count,
    0
  );
  const averagePerActiveDay =
    activeDays > 0
      ? totalQueries / activeDays
      : 0;

  return {
    activeDays,
    averagePerActiveDay,
  };
}

function buildDonutGradient(documentTypes = []) {
  const total = documentTypes.reduce(
    (sum, item) => sum + item.count,
    0
  );

  if (!total) {
    return "conic-gradient(#e5e7eb 0 100%)";
  }

  let cursor = 0;
  const segments = documentTypes.map(
    (item, index) => {
      const start = cursor;
      const end =
        cursor + (item.count / total) * 100;
      cursor = end;

      return `${
        chartColors[index % chartColors.length]
      } ${start}% ${end}%`;
    }
  );

  return `conic-gradient(${segments.join(", ")})`;
}

function AnalyticsMetric({
  icon: Icon,
  label,
  value,
}) {
  return (
    <article className="analytics-metric">
      <Icon size={18} />
      <div>
        <strong>{formatNumber(value)}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="chart-empty">
      <BarChart3 size={22} />
      <p>{message}</p>
    </div>
  );
}

function QueryChartTooltip({
  active,
  payload,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="query-tooltip">
      <strong>
        {formatQueryCountLabel(data.count)}
      </strong>
      <span>{data.tooltipDate}</span>
    </div>
  );
}

function InfoTooltip({ label }) {
  return (
    <span
      className="analytics-info"
      tabIndex="0"
      aria-label={label}
    >
      <Info size={14} />
      <span role="tooltip">{label}</span>
    </span>
  );
}

function ChartTitle({
  eyebrow,
  title,
  info,
}) {
  return (
    <div>
      <div className="chart-title-row">
        <p className="eyebrow">{eyebrow}</p>
        <InfoTooltip label={info} />
      </div>
      <h2>{title}</h2>
    </div>
  );
}

function AnalyticsTab() {
  const { workspaceId } = useParams();
  const { token } = useAuth();

  const [dateRange, setDateRange] =
    useState(30);
  const [analytics, setAnalytics] =
    useState(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] =
    useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      if (!token || !workspaceId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response =
          await getWorkspaceAnalytics(
            workspaceId,
            dateRange,
            token
          );

        if (isMounted) {
          setAnalytics(response.analytics);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError.message ||
              "Unable to load analytics."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [
    token,
    workspaceId,
    dateRange,
    reloadKey,
  ]);

  const querySeries = useMemo(
    () => analytics?.queriesOverTime ?? [],
    [analytics?.queriesOverTime]
  );
  const queryChartData = useMemo(
    () =>
      querySeries.map((item) => ({
        ...item,
        dateLabel: formatChartDate(item.date),
        tooltipDate: formatTooltipDate(item.date),
      })),
    [querySeries]
  );
  const querySummary = useMemo(
    () => getQuerySummary(querySeries),
    [querySeries]
  );
  const maxQueryCount = Math.max(
    1,
    ...querySeries.map((item) => item.count)
  );
  const topReferenceCount = Math.max(
    0,
    ...(analytics?.referencedDocuments ?? []).map(
      (item) => item.count
    )
  );
  const topTopicCount = Math.max(
    0,
    ...(analytics?.questionTopics ?? []).map(
      (item) => item.count
    )
  );
  const hasQueryData =
    (analytics?.summary?.totalQueries ?? 0) > 0;
  const hasTypeData =
    (analytics?.documentTypes?.length ?? 0) > 0;
  const donutGradient = buildDonutGradient(
    analytics?.documentTypes ?? []
  );

  if (isLoading) {
    return (
      <WorkspaceStatusPanel
        type="loading"
        title="Loading analytics"
        message="Aggregating workspace activity from your conversations and chunks."
      />
    );
  }

  if (error) {
    return (
      <WorkspaceStatusPanel
        type="error"
        title="Unable to load analytics"
        message={error}
        onRetry={() =>
          setReloadKey((current) => current + 1)
        }
      />
    );
  }

  return (
    <div className="analytics-tab">
      <div className="analytics-filter">
        <label htmlFor="date-range">Date range</label>
        <select
          id="date-range"
          value={dateRange}
          onChange={(event) => {
            setDateRange(Number(event.target.value));
          }}
        >
          {dateRangeOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="analytics-summary-grid">
        <AnalyticsMetric
          icon={MessageSquareText}
          label="Total queries"
          value={analytics?.summary?.totalQueries}
        />
        <AnalyticsMetric
          icon={FileText}
          label="Referenced docs"
          value={
            analytics?.summary
              ?.referencedDocumentCount
          }
        />
        <AnalyticsMetric
          icon={Database}
          label="Indexed chunks"
          value={
            analytics?.summary?.indexedChunkCount
          }
        />
      </div>

      <div className="analytics-grid">
        <article className="chart-card">
          <header>
            <ChartTitle
              eyebrow="Queries"
              title="Total queries over time"
              info="Daily count of user questions sent in this workspace during the selected date range."
            />
            <Sparkles size={20} />
          </header>
          {hasQueryData ? (
            <>
              <div className="query-chart-summary">
                <span>
                  {querySummary.activeDays} active days
                </span>
                <span>
                  {querySummary.averagePerActiveDay.toFixed(
                    1
                  )} avg / active day
                </span>
              </div>
              <div className="query-chart-shell">
                <ResponsiveContainer
                  width="100%"
                  height={250}
                >
                  <ComposedChart
                    data={queryChartData}
                    margin={{
                      top: 16,
                      right: 18,
                      bottom: 12,
                      left: -8,
                    }}
                    barCategoryGap="38%"
                  >
                    <CartesianGrid
                      stroke="#e5e7eb"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      axisLine={false}
                      tickLine={false}
                      interval={
                        dateRange === 7
                          ? 0
                          : "preserveStartEnd"
                      }
                      minTickGap={18}
                      tick={{
                        fill: "#6b7280",
                        fontSize: 12,
                        fontWeight: 720,
                      }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, maxQueryCount]}
                      width={36}
                      tick={{
                        fill: "#6b7280",
                        fontSize: 12,
                        fontWeight: 720,
                      }}
                    />
                    <Tooltip
                      cursor={{
                        fill: "rgba(79, 70, 229, 0.07)",
                      }}
                      content={<QueryChartTooltip />}
                    />
                    <Bar
                      dataKey="count"
                      fill="rgba(79, 70, 229, 0.26)"
                      maxBarSize={34}
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#ffffff",
                        stroke: "#4f46e5",
                        strokeWidth: 3,
                      }}
                      activeDot={{
                        r: 6,
                        fill: "#ffffff",
                        stroke: "#4f46e5",
                        strokeWidth: 3,
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="query-chart-labels">
                <span>
                  {formatChartDate(
                    querySeries[0]?.date
                  )}
                </span>
                <strong>
                  Peak {maxQueryCount}
                </strong>
                <span>
                  {formatChartDate(
                    querySeries[
                      querySeries.length - 1
                    ]?.date
                  )}
                </span>
              </div>
            </>
          ) : (
            <EmptyChart message="No questions in this range." />
          )}
        </article>

        <article className="chart-card">
          <header>
            <ChartTitle
              eyebrow="References"
              title="Most referenced documents"
              info="Documents cited most often by assistant answers in this workspace during the selected date range."
            />
            <FileText size={20} />
          </header>
          {analytics?.referencedDocuments?.length ? (
            <div className="bar-list">
              {analytics.referencedDocuments.map(
                (item) => (
                  <div
                    className="bar-row"
                    key={`${item.documentId}-${item.documentName}`}
                  >
                    <span title={item.documentName}>
                      {item.documentName}
                    </span>
                    <div>
                      <i
                        style={{
                          width: getBarWidth(
                            item.count,
                            topReferenceCount
                          ),
                        }}
                      />
                    </div>
                    <strong>{item.count}</strong>
                  </div>
                )
              )}
            </div>
          ) : (
            <EmptyChart message="No cited documents yet." />
          )}
        </article>

        <article className="chart-card">
          <header>
            <ChartTitle
              eyebrow="Types"
              title="Document type breakdown"
              info="Share of uploaded workspace documents by file format, regardless of the selected date range."
            />
            <PieChart size={20} />
          </header>
          {hasTypeData ? (
            <div className="donut-chart-row">
              <div
                className="donut-chart"
                style={{
                  background: donutGradient,
                }}
                aria-hidden="true"
              />
              <ul className="donut-legend">
                {analytics.documentTypes.map(
                  (item, index) => (
                    <li key={item.format}>
                      <span
                        style={{
                          background:
                            chartColors[
                              index % chartColors.length
                            ],
                        }}
                      />
                      {item.format} {item.percentage}%
                    </li>
                  )
                )}
              </ul>
            </div>
          ) : (
            <EmptyChart message="No documents uploaded yet." />
          )}
        </article>

        <article className="chart-card">
          <header>
            <ChartTitle
              eyebrow="Topics"
              title="Top question topics"
              info="Most repeated meaningful terms in user questions after removing common filler words and document file names."
            />
            <BarChart3 size={20} />
          </header>
          {analytics?.questionTopics?.length ? (
            <div className="topic-list">
              {analytics.questionTopics.map(
                (item, index) => (
                  <div
                    className="topic-row"
                    key={item.topic}
                  >
                    <div>
                      <span className="topic-rank">
                        {index + 1}
                      </span>
                      <strong>
                        {titleCase(item.topic)}
                      </strong>
                      <span className="topic-count">
                        {formatNumber(item.count)} mentions
                      </span>
                    </div>
                    <span className="topic-track">
                      <i
                        style={{
                          width: getBarWidth(
                            item.count,
                            topTopicCount
                          ),
                        }}
                      />
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <EmptyChart message="No repeated topics in this range." />
          )}
        </article>
      </div>
    </div>
  );
}

export default AnalyticsTab;
