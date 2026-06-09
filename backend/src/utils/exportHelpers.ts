import { Response } from 'express';

export function escapeCsv(value: unknown) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function sendCsv(res: Response, filename: string, headers: string[], rows: unknown[][]) {
  const content = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(content);
}

export function sendExcel(res: Response, filename: string, headers: string[], rows: unknown[][]) {
  const xmlRows = rows
    .map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(String(cell ?? ''))}</Data></Cell>`).join('')}</Row>`)
    .join('');
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Row>${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;
  res.setHeader('Content-Type', 'application/vnd.ms-excel');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(xml);
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
