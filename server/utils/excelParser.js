const XLSX = require('xlsx');

// Takes the uploaded file's Buffer (multer memoryStorage — no disk needed on serverless).
function parseQuestionsFromExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
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
