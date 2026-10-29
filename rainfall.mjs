/** Strict local daily-rainfall interchange; never infer units or fill missing days. */
export const MAX_CSV_BYTES = 65536;
export function parseRainfallCSV(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_CSV_BYTES) throw new Error('Choose a UTF-8 CSV no larger than 64 KiB.');
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const cells = (line, row) => {
    const fields = line.split(',').map(s => s.trim());
    if (fields.length !== 2) throw new Error(`Row ${row}: expected exactly two columns, date and rain_mm.`);
    return fields.map(s => {
      if (/^"[^"\r\n]*"$/.test(s)) return s.slice(1,-1).trim();
      if (s.includes('"')) throw new Error(`Row ${row}: use plain or double-quoted date and rain_mm cells.`);
      return s;
    });
  };
  if (cells(lines[0],1).join(',') !== 'date,rain_mm') throw new Error('Use the header date,rain_mm. Rainfall must be daily totals in millimetres, not inches.');
  if (lines.length < 2 || lines.length > 367) throw new Error('Include 1 to 366 daily rows after the header.');
  const dates=[], rainfall=[];let previous;
  for (let i=1;i<lines.length;i++) {
    const [date,rain]=cells(lines[i],i+1);
    const timestamp=Date.parse(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0,10)!==date) throw new Error(`Row ${i+1}: date must be a real date in YYYY-MM-DD format.`);
    if (previous!==undefined && timestamp-previous!==86400000) throw new Error(`Row ${i+1}: dates must be consecutive and oldest first, with no duplicates or missing days. Include 0 only for a known zero-rain day.`);
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(rain) || !Number.isFinite(Number(rain)) || Number(rain)>500) throw new Error(`Row ${i+1}: rain_mm must be a number from 0 to 500. Blank, negative, unknown, and trace values are not assumed to be zero.`);
    dates.push(date);rainfall.push(Number(rain));previous=timestamp;
  }
  return {dates,rainfall};
}
export const TEMPLATE = 'date,rain_mm\r\n2026-10-01,0\r\n2026-10-02,8.5\r\n2026-10-03,0\r\n';
