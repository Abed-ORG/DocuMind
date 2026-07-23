import {
  BarChart3,
  FileText,
  PieChart,
  Sparkles,
} from "lucide-react";

import { referencedDocs } from "./workspaceData";

function AnalyticsTab() {
  return (
    <div className="analytics-tab">
      <div className="analytics-filter">
        <label htmlFor="date-range">Date range</label>
        <select id="date-range" defaultValue="30">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="analytics-grid">
        <article className="chart-card">
          <header>
            <div>
              <p className="eyebrow">Queries</p>
              <h2>Total queries over time</h2>
            </div>
            <Sparkles size={20} />
          </header>
          <svg
            className="line-chart"
            viewBox="0 0 420 180"
            role="img"
            aria-label="Line chart showing queries increasing"
          >
            <polyline
              points="10,145 80,116 150,128 220,88 290,72 360,42 410,54"
            />
            <circle cx="360" cy="42" r="5" />
          </svg>
        </article>

        <article className="chart-card">
          <header>
            <div>
              <p className="eyebrow">References</p>
              <h2>Most referenced documents</h2>
            </div>
            <FileText size={20} />
          </header>
          <div className="bar-list">
            {referencedDocs.map((item) => (
              <div className="bar-row" key={item.label}>
                <span>{item.label}</span>
                <div>
                  <i style={{ width: `${item.value}%` }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="chart-card">
          <header>
            <div>
              <p className="eyebrow">Types</p>
              <h2>Document type breakdown</h2>
            </div>
            <PieChart size={20} />
          </header>
          <div className="donut-chart-row">
            <div className="donut-chart" />
            <ul className="donut-legend">
              <li><span className="legend-indigo" />PDF 48%</li>
              <li><span className="legend-teal" />DOCX 22%</li>
              <li><span className="legend-amber" />CSV 18%</li>
              <li><span className="legend-gray" />TXT 12%</li>
            </ul>
          </div>
        </article>

        <article className="chart-card">
          <header>
            <div>
              <p className="eyebrow">Satisfaction</p>
              <h2>User satisfaction ratings</h2>
            </div>
            <BarChart3 size={20} />
          </header>
          <div className="satisfaction-card">
            <strong>4.6/5</strong>
            <p>Average answer rating from 38 responses.</p>
            <div className="rating-bars">
              {[92, 78, 42, 18].map((value) => (
                <span key={value}>
                  <i style={{ width: `${value}%` }} />
                </span>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export default AnalyticsTab;
