# questionnaire_parser.py

import logging
import re
from dataclasses import dataclass, asdict
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple, Union
from io import BytesIO

import openpyxl
from openpyxl.utils import get_column_letter

# ============================== Logging ==============================
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("QuestionnaireParser")

# ============================== Constants ==============================
# Canonical SDG descriptions (keep exactly as provided)
SDG_DESCRIPTIONS: Dict[int, str] = {
    1: "No Poverty",
    2: "Zero Hunger",
    3: "Good Health & Well-being",
    4: "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all",
    5: "Gender Equality",
    6: "Clean Water & Sanitation",
    7: "Affordable and Clean Energy",
    8: "Decent Work & Economic Growth",
    9: "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation",
    10: "Reduce inequality within and among countries",
    11: "Make cities and human settlements inclusive, safe, resilient and sustainable",
    12: "Ensure sustainable consumption and production patterns",
    13: "Climate Action",
    14: "Life Below Water",
    15: "Life on Land",
    16: "Peace, Justice and Strong Institutions",
    17: "Partnerships for the Goals",
}

# Sectors
ALLOWED_SECTORS_CANON = {"Textiles", "Fertilizers", "Packaging"}

# Common variants → canonical sector
SECTOR_SYNONYMS: Dict[str, str] = {
    # Textiles
    "textile": "Textiles",
    "textiles": "Textiles",
    "textil": "Textiles",
    "fabric": "Textiles",
    "garment": "Textiles",
    "apparel": "Textiles",
    # Fertilizers
    "fertilizer": "Fertilizers",
    "fertilizers": "Fertilizers",
    "fert": "Fertilizers",
    # Packaging
    "packaging": "Packaging",
    "package": "Packaging",
    "packing": "Packaging",
    "pack": "Packaging",
}

# Score rubric
RUBRIC_CANON: Dict[int, str] = {
    0: "N/A",
    1: "Issue identified, but no plans for further actions",
    2: "Issue identified, starts planning further actions",
    3: "Action plan with clear targets and deadlines in place",
    4: "Action plan operational - some progress in established targets",
    5: "Action plan operational - achieving the target set",
}

# Phrases to infer scores when numbers aren't present
RUBRIC_PHRASES: Dict[int, List[str]] = {
    0: ["n/a", "na", "not applicable"],
    1: ["issue identified", "no plans"],
    2: ["starts planning", "planning further actions"],
    3: ["action plan", "clear targets", "deadlines"],
    4: ["operational", "some progress"],
    5: ["operational", "achieving the target", "achieving target"],
}

# SDG block markers: "SDG" title at B1, then B2,B8,...,B98 for SDG 1..17
SDG_MARKERS: Dict[int, int] = {
    1: 2,
    2: 8,
    3: 14,
    4: 20,
    5: 26,
    6: 32,
    7: 38,
    8: 44,
    9: 50,
    10: 56,
    11: 62,
    12: 68,
    13: 74,
    14: 80,
    15: 86,
    16: 92,
    17: 98,
}
SDG_TITLE_ROW = 1  # row with the title "SDG" in column B


# ============================== Data Model ==============================
@dataclass
class QuestionnaireRow:
    sdg_number: Optional[int] = None
    sdg_description: Optional[str] = None
    sector: Optional[str] = None
    sdg_target: Optional[str] = None
    sustainability_dimension: Optional[str] = None
    kpi: Optional[str] = None
    question: Optional[str] = None
    score: Optional[int] = None
    score_description: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    comment: Optional[str] = None


# ============================== Parser ==============================
class QuestionnaireParser:
    """
    What this parser does (simple):
      • Detects header row (flexible names)
      • Slices rows into SDG blocks using fixed B-column markers
      • Pulls sector per SDG from column C @ each SDG header row
        (fallback C3, then sheet name)
      • Extracts score from text or phrases
      • Works with 'Textile_revised', 'Fertilizer_revised', 'Packaging_revised'
      • Lets you pick a sheet by name, fuzzy name (e.g. "packaging"), or "3" (3rd sheet)
      • Supports both file paths (str) and BytesIO objects for serverless deployment
    """

    REQUIRED_HEADERS: Dict[str, List[str]] = {
        "sdg_target": ["sdg target", "sdg target (short)"],
        "sustainability_dimension": ["sustainability dimension", "dimension"],
        "kpi": ["kpi", "indicator", "metric"],
        "question": ["question", "assessment question", "assessment"],
        "scoring": ["scoring", "scores", "score"],
        "source": ["source", "reference"],
        "notes": ["notes", "note"],
        "status": ["status"],
        "comment": ["comment", "comments"],
    }

    def __init__(self, file_source: Union[str, BytesIO], sheet_names: Optional[List[str]] = None):
        """
        Initialize parser with either a file path or BytesIO object.
        
        Args:
            file_source: Either a file path (str) or BytesIO object containing Excel data
            sheet_names: Optional list of sheet names to process
        """
        self.file_source = file_source
        self._requested_sheets = sheet_names or [
            "Textile_revised",
            "Fertilizer_revised",
            "Packaging_revised",
        ]

        try:
            # Load workbook from either file path or BytesIO
            if isinstance(file_source, BytesIO):
                # Reset pointer to beginning for BytesIO
                file_source.seek(0)
                self.wb = openpyxl.load_workbook(file_source, data_only=True)
                logger.info(f"Loaded Excel from BytesIO | Sheets: {self.wb.sheetnames}")
            else:
                self.wb = openpyxl.load_workbook(file_source, data_only=True)
                logger.info(f"Loaded Excel: {file_source} | Sheets: {self.wb.sheetnames}")
        except Exception as e:
            logger.exception(f"Failed to load workbook: {e}")
            raise

        # Resolve names/indices to actual workbook sheet names
        self.sheet_names = self._normalize_sheet_list(self._requested_sheets)
        logger.info(f"Using sheets: {self.sheet_names}")

    # -------------------- helpers: normalization --------------------
    @staticmethod
    def _norm(v: Any) -> Optional[str]:
        if v is None:
            return None
        s = re.sub(r"\s+", " ", str(v).strip())
        return s if s else None

    @staticmethod
    def _norm_key(s: Optional[str]) -> Optional[str]:
        if s is None:
            return None
        s = re.sub(r"[^a-z0-9]+", "_", str(s).strip().lower()).strip("_")
        return s or None

    # -------------------- helpers: sheet resolution --------------------
    def _resolve_sheet_name(self, desired: str) -> Optional[str]:

        # Handle None or empty input
        if not desired or desired is None:
            return None
    
        try:
            low = desired.strip().lower()
        except (AttributeError, TypeError):
            return None
    
        avail = self.wb.sheetnames
    
        # Exact match (case-insensitive)
        for a in avail:
            if a.lower() == low:
                return a
    
        # Fuzzy match
        best_match, best_score = None, 0.0
        for a in avail:
            score = SequenceMatcher(None, low, a.lower()).ratio()
            if score > best_score:
                best_score = score
                best_match = a
    
        # Accept if score > 0.6
        if best_score > 0.6:
            return best_match
    
        return None

    def _normalize_sheet_list(self, sheets: List[str]) -> List[str]:
        out: List[str] = []
        for s in sheets:
            resolved = self._resolve_sheet_name(s)
            if resolved:
                out.append(resolved)
            else:
                logger.warning(f"Sheet '{s}' not found by name/index/fuzzy; skipping.")
        # If nothing resolved, fall back to all sheets
        return out or self.wb.sheetnames

    # -------------------- headers + ranges --------------------
    def _detect_header_row_and_map(self, ws) -> Tuple[int, Dict[str, int]]:
        max_scan_rows = min(30, ws.max_row)
        best_row, best_hit, best_map = None, -1, {}
        variants = {k: {v.lower() for v in vals} for k, vals in self.REQUIRED_HEADERS.items()}

        for r in range(1, max_scan_rows + 1):
            vals = [self._norm(c.value) for c in ws[r]]
            if all(v is None for v in vals):
                continue
            cand_map: Dict[str, int] = {}
            for idx, val in enumerate(vals):
                if not val:
                    continue
                low = val.lower()
                for k, alts in variants.items():
                    if low in alts and k not in cand_map:
                        cand_map[k] = idx
            hits = len(cand_map)
            if hits > best_hit:
                best_row, best_hit, best_map = r, hits, cand_map

        if best_row is None or best_hit == 0:
            logger.error("Could not detect a header row with required columns. Check your sheet headers.")
            raise ValueError("Header row not found")

        for k, col in best_map.items():
            addr = f"{get_column_letter(col+1)}{best_row}"
            logger.debug(f"Header map: {k} -> {addr} ('{ws.cell(best_row, col+1).value}')")

        missing = [k for k in self.REQUIRED_HEADERS if k not in best_map]
        if missing:
            logger.warning(f"Header detected at R{best_row}; missing headers: {missing}")
        else:
            logger.info(f"Header detected at R{best_row}; all required headers mapped.")

        return best_row, best_map

    def _build_sdg_ranges(self, ws) -> Dict[int, Tuple[int, int]]:
        total_rows = ws.max_row
        ranges: Dict[int, Tuple[int, int]] = {}
        for sdg in range(1, 18):
            start = SDG_MARKERS[sdg]
            end = (SDG_MARKERS[sdg + 1] - 1) if sdg < 17 else total_rows
            ranges[sdg] = (start, end)

        # Sanity logs
        b1 = self._norm(ws.cell(row=SDG_TITLE_ROW, column=2).value)
        if not b1 or "sdg" not in (b1.lower() if b1 else ""):
            logger.warning(f"B1 expected to contain 'SDG', found: {b1!r}")
        for sdg, (r1, r2) in ranges.items():
            header_label = self._norm(ws.cell(row=r1, column=2).value)
            logger.debug(f"{ws.title}: SDG {sdg} block B{r1}='{header_label}' rows={r1}-{r2}")
        return ranges

    # -------------------- sector helpers --------------------
    def _canonicalize_sector(self, raw: Optional[str]) -> Optional[str]:
        """Return 'Textiles'/'Fertilizers'/'Packaging' or None."""
        if not raw:
            return None
        # remove the label "Sector:"
        s = re.sub(r"\bsector\b\s*[:\-–|]?\s*", "", str(raw), flags=re.IGNORECASE)
        tokens = re.split(r"[,/;|]+", s)
        candidates: List[str] = []

        for t in tokens if tokens else [s]:
            tt = re.sub(r"\bsector\b", "", t, flags=re.IGNORECASE).strip()
            if not tt:
                continue
            low = tt.lower()

            # exact synonym
            if low in SECTOR_SYNONYMS:
                candidates.append(SECTOR_SYNONYMS[low])
                continue

            # fuzzy near-miss
            best_match, best_ratio = None, 0.0
            for key, canon in SECTOR_SYNONYMS.items():
                ratio = SequenceMatcher(None, low, key).ratio()
                if ratio > best_ratio:
                    best_match, best_ratio = canon, ratio
            if best_match and best_ratio >= 0.80:
                candidates.append(best_match)

        uniq: List[str] = []
        for c in candidates:
            if c in ALLOWED_SECTORS_CANON and c not in uniq:
                uniq.append(c)

        if not uniq:
            return None
        if len(uniq) > 1:
            logger.warning(f"Multiple sector candidates {uniq}; selecting '{uniq[0]}'")
        return uniq[0]

    def _extract_sector_default(self, ws, sheet_name: Optional[str]) -> Optional[str]:
        """C3 first; then guess from sheet name."""
        try:
            raw = self._norm(ws["C3"].value)
        except Exception:
            raw = None
        canon = self._canonicalize_sector(raw)

        if not canon and sheet_name:
            name = sheet_name.lower()
            if "textile" in name:
                canon = "Textiles"
            elif "fertilizer" in name or "fertilis" in name:
                canon = "Fertilizers"
            elif "packag" in name:  # covers packaging/package/packed
                canon = "Packaging"

        logger.info(f"Default sector resolved: {canon!r} (C3 raw={raw!r}, sheet_name={sheet_name!r})")
        return canon

    def _extract_sector_by_sdg(
        self, ws, sdg_ranges: Dict[int, Tuple[int, int]], sheet_name: Optional[str]
    ) -> Dict[int, Optional[str]]:
        default_sector = self._extract_sector_default(ws, sheet_name)
        by_sdg: Dict[int, Optional[str]] = {}
        for sdg, (start_row, _) in sdg_ranges.items():
            raw = self._norm(ws.cell(row=start_row, column=3).value)  # Column C on SDG header row
            canon = self._canonicalize_sector(raw) or default_sector
            by_sdg[sdg] = canon
            logger.debug(f"[{ws.title}] SDG {sdg}: C{start_row} raw={raw!r} -> sector={canon!r} (fallback={default_sector!r})")
        return by_sdg

    # -------------------- scoring helpers --------------------
    @staticmethod
    def _clean_scoring_text(txt: str) -> str:
        # Remove leading number/colon/dash like "3 -", "(2) :", "4:"
        return re.sub(r"^\s*\(?\d+\)?\s*[:\-–\.]\s*", "", txt).strip()

    def _extract_score_number(self, scoring_val: Optional[str]) -> Optional[int]:
        """Try to get 0–5 from the scoring cell."""
        if not scoring_val:
            return None
        txt = str(scoring_val).strip()

        # Leading number
        m = re.match(r"^\s*\(?([0-5])\)?(?:\s*[:\-\–\.\)]|\s)", txt)
        if m:
            return int(m.group(1))

        # If exactly one rubric-like "N:" appears
        nums = re.findall(r"(?<!\d)([0-5])\s*[:\-\–\.\)]", txt)
        uniq = sorted({int(n) for n in nums})
        if len(uniq) == 1:
            return uniq[0]
        if len(uniq) > 1:
            return None  # too many numbers; don't guess

        # Phrase mapping
        low = re.sub(r"\s+", " ", txt).lower()
        if re.search(r"\b(n/?a|not applicable)\b", low):
            return 0

        def phrase_score(targets: List[str]) -> int:
            s = 0
            for ph in targets:
                if ph in low:
                    s += 2
                else:
                    r = SequenceMatcher(None, ph, low).ratio()
                    if r > 0.6:
                        s += 1
            return s

        best_num, best_s = None, -1
        for num, phrases in RUBRIC_PHRASES.items():
            ps = phrase_score(phrases)
            if ps > best_s:
                best_num, best_s = num, ps
        return best_num if best_s >= 2 else None

    def _derive_score_description(self, scoring_cell: Optional[str], score: Optional[int]) -> Optional[str]:
        if score is not None:
            return RUBRIC_CANON.get(score)
        if scoring_cell:
            return self._clean_scoring_text(str(scoring_cell))
        return None

    # -------------------- row extraction --------------------
    def _sheet_rows(
        self,
        ws,
        header_row: int,
        col_map: Dict[str, int],
        sdg_ranges: Dict[int, Tuple[int, int]],
        sector_by_sdg: Dict[int, Optional[str]],
    ) -> List[Dict]:
        records: List[Dict] = []
        data_start = header_row + 1
        data_end = ws.max_row

        # row -> sdg_number
        row_to_sdg: Dict[int, int] = {}
        for sdg, (r1, r2) in sdg_ranges.items():
            for r in range(r1, r2 + 1):
                row_to_sdg[r] = sdg

        def get_cell_str(r: int, key: str) -> Optional[str]:
            if key not in col_map:
                return None
            cidx = col_map[key] + 1
            return self._norm(ws.cell(row=r, column=cidx).value)

        for r in range(data_start, data_end + 1):
            row_vals = [c.value for c in ws[r]]
            if all(v is None for v in row_vals):
                continue

            sdg_number = row_to_sdg.get(r)
            if sdg_number is None:
                continue

            sector = sector_by_sdg.get(sdg_number)
            if sector is None:
                logger.warning(
                    f"[{ws.title}] R{r} SDG{sdg_number}: sector is None — check C{sdg_ranges[sdg_number][0]} and C3 / sheet name."
                )

            scoring_cell = get_cell_str(r, "scoring")
            score = self._extract_score_number(scoring_cell)
            score_desc = self._derive_score_description(scoring_cell, score)

            row = QuestionnaireRow(
                sdg_number=sdg_number,
                sdg_description=SDG_DESCRIPTIONS.get(sdg_number),
                sector=sector,
                sdg_target=get_cell_str(r, "sdg_target"),
                sustainability_dimension=get_cell_str(r, "sustainability_dimension"),
                kpi=get_cell_str(r, "kpi"),
                question=get_cell_str(r, "question"),
                score=score,
                score_description=score_desc,
                source=get_cell_str(r, "source"),
                notes=get_cell_str(r, "notes"),
                status=get_cell_str(r, "status"),
                comment=get_cell_str(r, "comment"),
            )

            # Strict skip: if all "detail" fields are empty, drop it
            empties = [
                row.sustainability_dimension,
                row.kpi,
                row.question,
                row.score,
                row.score_description,
                row.source,
                row.notes,
                row.status,
                row.comment,
            ]
            if all(v in (None, "", []) for v in empties):
                continue

            # Some trace logs per SDG (first few only)
            if len([x for x in records if x.get("sdg_number") == sdg_number]) < 3:
                logger.debug(
                    f"{ws.title}: R{r} SDG{sdg_number} '{row.sdg_description}' "
                    f"sector='{sector}' score={row.score} KPI='{row.kpi}' "
                    f"Q='{(row.question or '')[:60]}'"
                )

            records.append(asdict(row))

        logger.info(f"{ws.title}: collected {len(records)} questionnaire rows")
        return records

    # -------------------- public API --------------------
    def extract_questionnaire_data(self, sheet_name: str) -> Dict[str, Any]:
        resolved = self._resolve_sheet_name(sheet_name)
        if not resolved:
            logger.warning(f"Sheet '{sheet_name}' not found; skipping.")
            return {"rows": [], "sector_by_sdg": {}}

        ws = self.wb[resolved]
        sdg_ranges = self._build_sdg_ranges(ws)
        sector_by_sdg = self._extract_sector_by_sdg(ws, sdg_ranges, resolved)
        header_row, col_map = self._detect_header_row_and_map(ws)
        logger.debug(f"{resolved}: header at R{header_row}, map={col_map}")

        rows = self._sheet_rows(ws, header_row, col_map, sdg_ranges, sector_by_sdg)
        logger.debug(f"{resolved}: sector_by_sdg = {sector_by_sdg}")
        return {"rows": rows, "sector_by_sdg": sector_by_sdg}

    def parse_all_data(self) -> Dict[str, Dict[str, Any]]:
        out: Dict[str, Dict[str, Any]] = {}
        for sheet in self.sheet_names:
            logger.info(f"---- Parsing sheet: {sheet} ----")
            key = self._norm_key(sheet) or sheet
            out[key] = self.extract_questionnaire_data(sheet)
        return out
    
    def close(self):
        """Close the workbook to free resources."""
        if hasattr(self, 'wb'):
            self.wb.close()


# ============================== Convenience Wrappers ==============================
def parse_excel_questionnaire(file_source: Union[str, BytesIO], sheet_names: Optional[List[str]] = None) -> Dict[str, Dict[str, Any]]:
    """
    Parse Excel questionnaire from file path or BytesIO.
    
    Args:
        file_source: Either a file path (str) or BytesIO object
        sheet_names: Optional list of sheet names to process
    
    Returns:
        Dictionary with parsed data for all requested sheets
    """
    parser = QuestionnaireParser(file_source, sheet_names)
    try:
        return parser.parse_all_data()
    finally:
        parser.close()


def extract_questions_for_interactive(file_source: Union[str, BytesIO], sheet_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Extract ONLY questions (no scores) for interactive UI.
    Works with both file paths and BytesIO objects (for Vercel serverless).

    Args:
        file_source: Either a file path (str) or BytesIO object
        sheet_name: Name of sheet to extract, or None to extract all default sheets
    
    Returns:
        Dictionary with questions list and sector information
    """
    
    # Determine which sheets to process
    if sheet_name is None or sheet_name == "":
        # Process all default sector sheets
        sheets_to_process = ["Textile_revised", "Fertilizer_revised", "Packaging_revised"]
    else:
        # User specified a specific sheet
        sheets_to_process = [sheet_name]
    
    # Initialize parser with sheets
    parser = QuestionnaireParser(file_source, sheets_to_process)
    
    # Collect all questions from all processed sheets
    all_questions = []
    last_sector = "General"
    
    for sheet in parser.sheet_names:
        try:
            # Use extract_questionnaire_data for each sheet
            data = parser.extract_questionnaire_data(sheet)
            
            for idx, row in enumerate(data.get("rows", [])):
                if row.get("question"):
                    all_questions.append({
                        "id": row.get("id") or f"q_{len(all_questions) + 1}",
                        "sdg_number": row.get("sdg_number"),
                        "sdg_description": row.get("sdg_description"),
                        "sdg_target": row.get("sdg_target"),
                        "sustainability_dimension": row.get("sustainability_dimension"),
                        "kpi": row.get("kpi"),
                        "question": row.get("question"),
                        "sector": row.get("sector", "Unknown")
                    })
                    last_sector = row.get("sector", last_sector)
        
        except Exception as e:
            logger.warning(f"Failed to extract from sheet '{sheet}': {e}")
            continue
    
    return {
        "questions": all_questions,
        "sector": last_sector
    }


# ============================== CLI ==============================
if __name__ == "__main__":
    xlsx = "backend/data/final.xlsx"  # change if needed
    try:
        parsed = parse_excel_questionnaire(xlsx)
        print(f"Parsed data from {xlsx}:")
        for sheet, data in parsed.items():
            print(f"Sheet: {sheet} | Sector by SDG: {data['sector_by_sdg']}")
    except Exception as e:
        logger.exception(f"CLI error: {e}")