import {
  Download,
  Table2,
} from "lucide-react";

function StructuredExtraction({
  panelRef,
  extractionPrompt,
  rows,
  onExtractionPromptChange,
  onSort,
  onExportCsv,
}) {
  return (
    <section className="extraction-panel" ref={panelRef}>
      <header className="panel-header">
        <div>
          <p className="eyebrow">Structured Extraction</p>
          <h2>Extract review-ready fields</h2>
        </div>
        <button
          className="secondary-action"
          type="button"
          onClick={onExportCsv}
        >
          <Download size={17} />
          Export CSV
        </button>
      </header>

      <div className="extract-control">
        <label htmlFor="extract-prompt">
          What do you want to extract?
        </label>
        <div>
          <input
            id="extract-prompt"
            value={extractionPrompt}
            onChange={(event) =>
              onExtractionPromptChange(event.target.value)
            }
            placeholder="Example: all dates and dollar amounts"
          />
          <button className="primary-action" type="button">
            <Table2 size={17} />
            Extract
          </button>
        </div>
      </div>

      <div className="extraction-table-wrap">
        <table className="extraction-table">
          <thead>
            <tr>
              {["field", "value", "type", "source"].map((key) => (
                <th key={key}>
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                  >
                    {key}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.field}-${row.source}`}>
                <td>{row.field}</td>
                <td>{row.value}</td>
                <td>{row.type}</td>
                <td>{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default StructuredExtraction;
