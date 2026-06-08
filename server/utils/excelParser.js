const XLSX = require('xlsx');

function parseQuestionsFromExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Row 0 = topic/title (skip). Questions start from row 1.
  const questions = [];
  rows.slice(1).forEach((row, idx) => {
    const ar = row[0] ? String(row[0]).trim() : null;  // Col A = Arabic
    const en = row[1] ? String(row[1]).trim() : null;  // Col B = English (optional)
    if (!ar && !en) return;
    questions.push({
      question_text: en || ar,   // fallback to Arabic if no English
      question_ar:   ar || null,
      order_index:   idx,
    });
  });
  return questions;
}

module.exports = { parseQuestionsFromExcel };
