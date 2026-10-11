/**
 * ============================================================================
 * STUDENT RESULT PORTAL - GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * ============================================================================
 * 
 * Google Sheet Expected Headers in Row 1:
 * [RollNo, DOB, Name, Math, Science, English, Total]
 * 
 * Instructions:
 * 1. Open your Google Sheet containing student examination results.
 * 2. Click Extensions > Apps Script.
 * 3. Replace the entire content of Code.gs with this file.
 * 4. In the Apps Script editor, click '+' next to Files > HTML and name it "index".
 * 5. Paste the contents of index.html into it.
 * 6. Click Deploy > New deployment:
 *    - Type: Web app
 *    - Description: Student Result Portal
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy and share the generated Web App URL!
 */

/** Application Configuration */
const CONFIG = {
  SHEET_NAME: 'Sheet1',          // Target sheet name; falls back to active sheet if not matched
  PASSING_MARKS_PER_SUBJECT: 35, // Minimum marks needed to pass individual subject
  MAX_MARKS_PER_SUBJECT: 100,    // Maximum marks per subject
  TOTAL_SUBJECTS: 3,             // Math, Science, English
  INSTITUTION_NAME: 'Academic Institution',
  ACADEMIC_YEAR: '2025–2026',
  EXAM_SESSION: 'Examination Session 2025–2026'
};

/**
 * Handles HTTP GET requests.
 * - Serves the index.html web page when visited in a browser.
 * - Also supports JSON API queries via query params (?rollNo=101&dob=2005-06-15).
 */
function doGet(e) {
  // Support direct API / URL parameter lookups
  if (e && e.parameter && (e.parameter.rollNo || e.parameter.action === 'search')) {
    const rollNo = e.parameter.rollNo || '';
    const dob = e.parameter.dob || '';
    const result = searchStudent(rollNo, dob);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Serve the HTML frontend
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Student Examination Result Portal')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;text-align:center;">' +
      '<h2 style="color:#0f172a;margin-bottom:8px;">Configuration Notice</h2>' +
      '<p style="color:#64748b;line-height:1.6;">Could not find <strong>index.html</strong> in your Apps Script project. Please create an HTML file named <code>index</code> and paste the index.html code into it.</p>' +
      '<p style="color:#e11d48;font-size:14px;background:#ffe4e6;padding:8px 12px;border-radius:6px;display:inline-block;">' + err.message + '</p>' +
      '</div>'
    );
  }
}

/**
 * Handles HTTP POST requests for external API integration.
 */
function doPost(e) {
  try {
    let rollNo = '';
    let dob = '';

    if (e && e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        rollNo = body.rollNo || body.roll;
        dob = body.dob || body.birthDate;
      } catch (parseErr) {
        // Fallback to url-encoded parameter parse
        if (e.parameter) {
          rollNo = e.parameter.rollNo;
          dob = e.parameter.dob;
        }
      }
    } else if (e && e.parameter) {
      rollNo = e.parameter.rollNo;
      dob = e.parameter.dob;
    }

    const result = searchStudent(rollNo, dob);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Failed to process POST request: ' + err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Primary RPC function invoked by google.script.run from index.html.
 * Searches the Google Sheet by student Roll Number and Date of Birth (DOB).
 * 
 * @param {string|number} rollNoInput - Roll number entered by student.
 * @param {string} dobInput - Date of birth entered by student (YYYY-MM-DD or formatted string).
 * @returns {Object} JSON response object with success status and detailed marksheet data or error.
 */
function searchStudent(rollNoInput, dobInput) {
  try {
    // 1. Validate inputs
    if (rollNoInput === null || rollNoInput === undefined || String(rollNoInput).trim() === '') {
      return {
        success: false,
        message: 'Please provide a valid Roll Number.'
      };
    }

    if (dobInput === null || dobInput === undefined || String(dobInput).trim() === '') {
      return {
        success: false,
        message: 'Please provide a valid Date of Birth.'
      };
    }

    const searchRoll = String(rollNoInput).trim().toLowerCase();
    const searchDobNormalized = normalizeDateString(dobInput);

    // 2. Access the target Spreadsheet
    const sheet = getTargetSheet();
    if (!sheet) {
      return {
        success: false,
        message: 'Unable to access student database sheet. Please ensure the sheet exists.'
      };
    }

    // 3. Fetch data
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow < 2) {
      return {
        success: false,
        message: 'Student database is empty. No records found.'
      };
    }

    // Read both underlying values and user-visible display values for accurate date matching
    const dataRange = sheet.getRange(1, 1, lastRow, lastColumn);
    const rawValues = dataRange.getValues();
    const displayValues = dataRange.getDisplayValues();

    // 4. Match Column Headers dynamically with positional fallback
    // Expected headers: [RollNo, DOB, Name, Math, Science, English, Total]
    const headerRow = rawValues[0].map(h => String(h || '').trim().toLowerCase());
    
    let colIndex = {
      rollNo: findHeaderIndex(headerRow, ['rollno', 'roll_no', 'roll no', 'roll number', 'roll']),
      dob: findHeaderIndex(headerRow, ['dob', 'date of birth', 'birthdate', 'birth date', 'birth_date']),
      name: findHeaderIndex(headerRow, ['name', 'student name', 'candidate name', 'student_name']),
      math: findHeaderIndex(headerRow, ['math', 'mathematics', 'maths']),
      science: findHeaderIndex(headerRow, ['science', 'sci']),
      english: findHeaderIndex(headerRow, ['english', 'eng']),
      total: findHeaderIndex(headerRow, ['total', 'total marks', 'total_marks', 'aggregate'])
    };

    // If headers were not found by label, fall back to exact default positions
    if (colIndex.rollNo === -1 && headerRow.length >= 2) colIndex.rollNo = 0;
    if (colIndex.dob === -1 && headerRow.length >= 2) colIndex.dob = 1;
    if (colIndex.name === -1 && headerRow.length >= 3) colIndex.name = 2;
    if (colIndex.math === -1 && headerRow.length >= 4) colIndex.math = 3;
    if (colIndex.science === -1 && headerRow.length >= 5) colIndex.science = 4;
    if (colIndex.english === -1 && headerRow.length >= 6) colIndex.english = 5;
    if (colIndex.total === -1 && headerRow.length >= 7) colIndex.total = 6;

    if (colIndex.rollNo === -1 || colIndex.dob === -1) {
      return {
        success: false,
        message: 'Required columns (RollNo, DOB) could not be located in Row 1. Expected headers: [RollNo, DOB, Name, Math, Science, English, Total].'
      };
    }

    const timeZone = sheet.getParent() ? sheet.getParent().getSpreadsheetTimeZone() : Session.getScriptTimeZone();

    // 5. Search for matching record
    let matchedIndex = -1;

    for (let r = 1; r < rawValues.length; r++) {
      const cellRollRaw = rawValues[r][colIndex.rollNo];
      if (cellRollRaw === null || cellRollRaw === undefined || String(cellRollRaw).trim() === '') {
        continue;
      }

      const cellRoll = String(cellRollRaw).trim().toLowerCase();
      const cellDobRaw = rawValues[r][colIndex.dob];
      const cellDobDisplay = displayValues[r][colIndex.dob];

      if (cellRoll === searchRoll) {
        if (isDobMatch(cellDobRaw, cellDobDisplay, searchDobNormalized, dobInput, timeZone)) {
          matchedIndex = r;
          break;
        }
      }
    }

    if (matchedIndex === -1) {
      return {
        success: false,
        message: 'No student record found matching Roll Number "' + rollNoInput + '" and Date of Birth "' + dobInput + '". Please verify your credentials.'
      };
    }

    const matchedRaw = rawValues[matchedIndex];
    const matchedDisplay = displayValues[matchedIndex];

    // 6. Build Result Data
    const candidateName = colIndex.name !== -1 && matchedRaw[colIndex.name] !== undefined
      ? String(matchedRaw[colIndex.name]).trim()
      : 'Student Candidate';

    const mathMarks = parseSubjectMarks(colIndex.math !== -1 ? matchedRaw[colIndex.math] : 0);
    const scienceMarks = parseSubjectMarks(colIndex.science !== -1 ? matchedRaw[colIndex.science] : 0);
    const englishMarks = parseSubjectMarks(colIndex.english !== -1 ? matchedRaw[colIndex.english] : 0);

    const computedTotal = mathMarks + scienceMarks + englishMarks;
    const sheetTotalRaw = colIndex.total !== -1 ? matchedRaw[colIndex.total] : null;
    const sheetTotal = parseSubjectMarks(sheetTotalRaw);
    const finalTotal = (!isNaN(sheetTotal) && sheetTotal > 0) ? sheetTotal : computedTotal;

    const maxTotalMarks = CONFIG.MAX_MARKS_PER_SUBJECT * CONFIG.TOTAL_SUBJECTS; // 300
    const percentageNum = Math.round(((finalTotal / maxTotalMarks) * 100) * 100) / 100;
    const percentageStr = percentageNum.toFixed(2);

    const subjects = [
      {
        code: 'MATH-101',
        name: 'Mathematics',
        maxMarks: CONFIG.MAX_MARKS_PER_SUBJECT,
        passMarks: CONFIG.PASSING_MARKS_PER_SUBJECT,
        marksObtained: mathMarks,
        grade: calculateSubjectGrade(mathMarks, CONFIG.MAX_MARKS_PER_SUBJECT),
        status: mathMarks >= CONFIG.PASSING_MARKS_PER_SUBJECT ? 'PASS' : 'FAIL'
      },
      {
        code: 'SCI-102',
        name: 'Science',
        maxMarks: CONFIG.MAX_MARKS_PER_SUBJECT,
        passMarks: CONFIG.PASSING_MARKS_PER_SUBJECT,
        marksObtained: scienceMarks,
        grade: calculateSubjectGrade(scienceMarks, CONFIG.MAX_MARKS_PER_SUBJECT),
        status: scienceMarks >= CONFIG.PASSING_MARKS_PER_SUBJECT ? 'PASS' : 'FAIL'
      },
      {
        code: 'ENG-103',
        name: 'English',
        maxMarks: CONFIG.MAX_MARKS_PER_SUBJECT,
        passMarks: CONFIG.PASSING_MARKS_PER_SUBJECT,
        marksObtained: englishMarks,
        grade: calculateSubjectGrade(englishMarks, CONFIG.MAX_MARKS_PER_SUBJECT),
        status: englishMarks >= CONFIG.PASSING_MARKS_PER_SUBJECT ? 'PASS' : 'FAIL'
      }
    ];

    const allPassed = subjects.every(s => s.status === 'PASS');
    const isDistinction = allPassed && percentageNum >= 75;
    const overallGrade = calculateOverallGrade(percentageNum, allPassed);
    const resultStatus = allPassed ? (isDistinction ? 'PASSED WITH DISTINCTION' : 'PASSED') : 'FAILED';

    const formattedDob = formatDisplayDate(matchedRaw[colIndex.dob], matchedDisplay[colIndex.dob], timeZone, dobInput);

    return {
      success: true,
      data: {
        rollNo: String(matchedRaw[colIndex.rollNo]).trim(),
        dob: formattedDob,
        name: candidateName,
        subjects: subjects,
        totalMarks: finalTotal,
        maxTotalMarks: maxTotalMarks,
        percentage: percentageStr,
        grade: overallGrade,
        status: resultStatus,
        isPassed: allPassed,
        isDistinction: isDistinction,
        declarationDate: Utilities.formatDate(new Date(), timeZone || 'GMT', 'MMMM dd, yyyy'),
        academicYear: CONFIG.ACADEMIC_YEAR,
        institutionName: CONFIG.INSTITUTION_NAME,
        examSession: CONFIG.EXAM_SESSION
      }
    };

  } catch (error) {
    Logger.log('Error in searchStudent: ' + error.toString());
    return {
      success: false,
      message: 'Server error processing request: ' + error.message
    };
  }
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Accesses the active sheet or opens by SHEET_ID script property.
 */
function getTargetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    return ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getActiveSheet();
  }

  const scriptProp = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (scriptProp) {
    const openedSs = SpreadsheetApp.openById(scriptProp);
    return openedSs.getSheetByName(CONFIG.SHEET_NAME) || openedSs.getActiveSheet();
  }

  return null;
}

/**
 * Searches header row array for any of the given candidate names.
 */
function findHeaderIndex(headers, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    const idx = headers.indexOf(aliases[i]);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Safely parses marks into clean numbers.
 */
function parseSubjectMarks(val) {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

/**
 * Robust date comparison checking Date objects, normalized ISO strings, and raw text.
 */
function isDobMatch(cellRaw, cellDisplay, searchNormalized, rawInput, timeZone) {
  // If cell is a JavaScript Date object
  if (Object.prototype.toString.call(cellRaw) === '[object Date]' && !isNaN(cellRaw.getTime())) {
    const cellIso = Utilities.formatDate(cellRaw, timeZone || 'GMT', 'yyyy-MM-dd');
    if (cellIso === searchNormalized) return true;
  }

  // Check normalized strings
  const rawNormalized = normalizeDateString(String(cellRaw || ''));
  if (rawNormalized && rawNormalized === searchNormalized) return true;

  const displayNormalized = normalizeDateString(String(cellDisplay || ''));
  if (displayNormalized && displayNormalized === searchNormalized) return true;

  // Direct case-insensitive string equality
  const sRaw = String(cellRaw || '').trim().toLowerCase();
  const sDisplay = String(cellDisplay || '').trim().toLowerCase();
  const sInput = String(rawInput || '').trim().toLowerCase();
  if (sRaw === sInput || sDisplay === sInput) return true;

  // Numeric digit comparison (e.g. 20050615 or 15062005)
  const cellDigits = sDisplay.replace(/\D/g, '');
  const inputDigits = sInput.replace(/\D/g, '');
  if (cellDigits.length >= 8 && cellDigits === inputDigits) return true;

  return false;
}

/**
 * Normalizes varied date string formats (YYYY-MM-DD, DD/MM/YYYY, etc.) into YYYY-MM-DD.
 */
function normalizeDateString(str) {
  if (!str) return '';
  const trimmed = String(str).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
  if (ymd) {
    return ymd[1] + '-' + ymd[2].padStart(2, '0') + '-' + ymd[3].padStart(2, '0');
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
  if (dmy) {
    return dmy[3] + '-' + dmy[2].padStart(2, '0') + '-' + dmy[1].padStart(2, '0');
  }

  // MM-DD-YYYY or MM/DD/YYYY
  const mdy = trimmed.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
  if (mdy && parseInt(mdy[1], 10) <= 12 && parseInt(mdy[2], 10) > 12) {
    return mdy[3] + '-' + mdy[1].padStart(2, '0') + '-' + mdy[2].padStart(2, '0');
  }

  return trimmed.replace(/\s+/g, '').toLowerCase();
}

/**
 * Nicely formats date for display on marksheet (e.g. "15 June 2005").
 */
function formatDisplayDate(cellRaw, cellDisplay, timeZone, fallback) {
  try {
    if (Object.prototype.toString.call(cellRaw) === '[object Date]' && !isNaN(cellRaw.getTime())) {
      return Utilities.formatDate(cellRaw, timeZone || 'GMT', 'dd MMMM yyyy');
    }

    const norm = normalizeDateString(String(cellDisplay || cellRaw || fallback));
    const parts = norm.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return day + ' ' + monthNames[month] + ' ' + year;
      }
    }
    return String(cellDisplay || cellRaw || fallback);
  } catch (e) {
    return String(cellDisplay || cellRaw || fallback);
  }
}

/**
 * Grade thresholds per subject.
 */
function calculateSubjectGrade(marks, maxMarks) {
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
}

/**
 * Overall performance grade with division naming.
 */
function calculateOverallGrade(pct, allPassed) {
  if (!allPassed) return 'F (Needs Improvement)';
  if (pct >= 90) return 'A+ (Distinction / Outstanding)';
  if (pct >= 80) return 'A (First Division with Distinction)';
  if (pct >= 60) return 'B (First Division)';
  if (pct >= 50) return 'C (Second Division)';
  if (pct >= 35) return 'D (Third Division)';
  return 'F (Fail)';
}

/**
 * Diagnostic test function runnable directly in the Apps Script editor.
 */
function testSearch() {
  const sampleRoll = '101';
  const sampleDob = '2005-06-15';
  const res = searchStudent(sampleRoll, sampleDob);
  Logger.log('Test Output: ' + JSON.stringify(res, null, 2));
}

/**
 * ============================================================================
 * ONE-CLICK SHEET AUTO-SETUP
 * Select "setupSheet" in the top toolbar dropdown and click "Run" once!
 * ============================================================================
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Please open this script from inside a Google Sheet (Extensions > Apps Script).');
  }

  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName(CONFIG.SHEET_NAME);
  }

  // Clear existing data and populate headers + 5 sample records
  sheet.clear();

  const sampleData = [
    ['RollNo', 'DOB', 'Name', 'Math', 'Science', 'English', 'Total'],
    ['101', '2005-06-15', 'Aarav Sharma', 92, 88, 85, 265],
    ['102', '2005-08-22', 'Priya Patel', 78, 82, 74, 234],
    ['103', '2005-11-03', 'Rohan Verma', 64, 59, 68, 191],
    ['104', '2005-02-14', 'Sneha Nair', 95, 96, 91, 282],
    ['105', '2005-09-30', 'Vikram Singh', 42, 28, 51, 121]
  ];

  // Force DOB column to plain text so Google Sheets doesn't mangle date formats
  sheet.getRange(2, 2, sampleData.length - 1, 1).setNumberFormat('@');

  // Write all rows at once
  sheet.getRange(1, 1, sampleData.length, sampleData[0].length).setValues(sampleData);

  // Style the Header Row
  const headerRange = sheet.getRange(1, 1, 1, sampleData[0].length);
  headerRange
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, sampleData[0].length);

  Logger.log('✅ Sheet initialized! Test with RollNo: 101 and DOB: 2005-06-15');
}
