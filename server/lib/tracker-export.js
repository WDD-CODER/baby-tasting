import ExcelJS from 'exceljs'

const BORDER = { style: 'thin', color: { argb: 'FFD9D9D9' } }

// A workbook for the sheets of `buildExportSheets` (spec-server-data §5.1-5.2): right-to-left, styled header, bordered cells.
export function buildWorkbook(sheets, now = new Date()) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Baby Tracker PWA'
  workbook.created = now
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name, { views: [{ rightToLeft: true }] })
    ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width }))
    const header = ws.getRow(1)
    header.height = 25
    header.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5F5B' } }
    header.alignment = { vertical: 'middle', horizontal: 'center' }
    for (const data of sheet.rows) {
      const row = ws.addRow(data)
      if (typeof data.durationHours === 'number') row.getCell('durationHours').numFmt = '0.0'
      if (typeof data.consumedPct === 'string' && data.consumedPct.endsWith('%') && parseInt(data.consumedPct, 10) < 75) {
        const cell = row.getCell('consumedPct')
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }
        cell.font = { color: { argb: 'FF9C0006' }, bold: true }
      }
      row.eachCell((cell) => {
        cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })
    }
  }
  return workbook
}
