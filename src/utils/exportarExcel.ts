// xlsx se carga de forma dinámica: solo se descarga cuando el usuario exporta a Excel.
export async function exportToExcel(rows: Record<string, unknown>[], filename: string) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
