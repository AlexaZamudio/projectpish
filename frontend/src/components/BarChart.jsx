// Gráfica de barras de magnitud (una sola tinta de marca).
// La identidad de cada categoría la dan las etiquetas, no el color.
// data: [{ label, value }]. Si se pasa `baseline`, muestra el % = value / baseline.
export default function BarChart({ data, baseline = null }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="barchart" role="img">
      {data.map((d) => {
        const pct = Math.round((d.value / max) * 100);
        const rel = baseline ? Math.round((d.value / Math.max(1, baseline)) * 100) : null;
        return (
          <div className="barchart-row" key={d.label} title={`${d.label}: ${d.value}`}>
            <div className="barchart-label">{d.label}</div>
            <div className="barchart-track">
              <div className="barchart-fill" style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
            <div className="barchart-num">
              <span className="barchart-value">{d.value}</span>
              {rel !== null && <span className="barchart-pct">{rel}%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
