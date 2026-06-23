/* Tiny client-side CSV export — no dependencies. */

const escapeCell = v => {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * downloadCsv('clients.csv', [{ name: 'Sam', amount: 5000 }, ...])
 * Headers are inferred from the first row.
 */
export const downloadCsv = (filename, rows) => {
  if (!rows?.length) {
    alert('No data to export.')
    return
  }
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escapeCell(r[h])).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
