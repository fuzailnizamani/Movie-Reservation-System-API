export default function DataTable({ columns, rows, renderRow, empty = 'No records found.' }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map(renderRow) : <tr><td className="table-empty" colSpan={columns.length}>{empty}</td></tr>}</tbody></table></div>;
}
