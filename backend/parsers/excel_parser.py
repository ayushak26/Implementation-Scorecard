# questionnaire_parser.py

import openpyxl
import re
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple, Any
import logging
from difflib import SequenceMatcher
from openpyxl.utils import get_column_letter

# -------------------- Logging --------------------
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)
logger = logging.getLogger("QuestionnaireParser")

# -------------------- Constants --------------------
# Canonical SDG descriptions (exact list provided)
SDG_DESCRIPTIONS: Dict[int, str] = {
    1:  "No Poverty",
    2:  "Zero Hunger",
    3:  "Good Health & Well-being",
    4:  "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all",
    5:  "Gender Equality",
    6:  "Clean Water & Sanitation",
    7:  "Affordable and Clean Energy",
    8:  "Decent Work & Economic Growth",
    9:  "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation",
    10: "Reduce inequality within and among countries",
    11: "Make cities and human settlements inclusive, safe, resilient and sustainable",
    12: "Ensure sustainable consumption and production patterns",
    13: "Climate Action",
    14: "Life Below Water",
    15: "Life on Land",
    16: "Peace, Justice and Strong Institutions",
    17: "Partnerships for the Goals",
}

# Sector canon (only these should appear in output)
ALLOWED_SECTORS_CANON = {"Textiles", "Fertilizers"}
SECTOR_SYNONYMS = {
    "textile": "Textiles", "textiles": "Textiles", "textil": "Textiles",
    "fabric": "Textiles", "garment": "Textiles", "apparel": "Textiles",
    "fertilizer": "Fertilizers", "fertilizers": "Fertilizers", "fert": "Fertilizers",
}

# Score rubric (canonical)
RUBRIC_CANON = {
    0: "N/A",
    1: "Issue identified, but no plans for further actions",
    2: "Issue identified, starts planning further actions",
    3: "Action plan with clear targets and deadlines in place",
    4: "Action plan operational - some progress in established targets",
    5: "Action plan operational - achieving the target set",
}

# Phrase helpers for score inference
RUBRIC_PHRASES = {
    0: ["n/a", "na", "not applicable"],
    1: ["issue identified", "no plans"],
    2: ["starts planning", "planning further actions"],
    3: ["action plan", "clear targets", "deadlines"],
    4: ["operational", "some progress"],
    5: ["operational", "achieving the target", "achieving target"],
}

# -------------------- Data Model --------------------
@dataclass
class QuestionnaireRow:
    sdg_number: Optional[int] = None
    sdg_description: Optional[str] = None
    sector: Optional[str] = None
    # sdg + sdg_target_detailed removed per request
    sdg_target: Optional[str] = None
    sustainability_dimension: Optional[str] = None
    kpi: Optional[str] = None
    question: Optional[str] = None
    # scoring_raw removed - replaced by:
    score: Optional[int] = None
    score_description: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    comment: Optional[str] = None

# -------------------- Parser --------------------
class QuestionnaireParser:
    """
    - SDG markers (column B): B1 'SDG' title, then B2, B8, B14, ..., B98 for SDG 1..17.
    - Sector per SDG: column C at each SDG marker row; fallback to C3; final fallback inferred from sheet name.
    - Header autodetection with variants.
    """

    REQUIRED_HEADERS: Dict[str, List[str]] = {
        # "sdg" intentionally NOT required/used
        # sdg_target_detailed removed
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

    # Exact SDG marker rows in column B (1-indexed)
    SDG_MARKERS: Dict[int, int] = {
        1:  2,  2:  8,  3: 14,  4: 20,  5: 26,  6: 32,
        7: 38,  8: 44,  9: 50, 10: 56, 11: 62, 12: 68,
        13: 74, 14: 80, 15: 86, 16: 92, 17: 98
    }
    SDG_TITLE_ROW = 1  # B1 title "SDG"

    def __init__(self, file_path: str, sheet_names: Optional[List[str]] = None):
        self.file_path = file_path
        self.sheet_names = sheet_names or ["Textile_revised", "Fertilizer_revised"]
        try:
            self.wb = openpyxl.load_workbook(file_path, data_only=True)
            logger.info(f"Loaded Excel: {file_path} | Sheets: {self.wb.sheetnames}")
        except Exception as e:
            logger.exception(f"Failed to load workbook: {e}")
            raise

    # ---------- utils ----------
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
            start = self.SDG_MARKERS[sdg]
            end = (self.SDG_MARKERS[sdg + 1] - 1) if sdg < 17 else total_rows
            ranges[sdg] = (start, end)

        # Optional: sanity logging on B markers
        b1 = self._norm(ws.cell(row=self.SDG_TITLE_ROW, column=2).value)
        if not b1 or "sdg" not in b1.lower():
            logger.warning(f"B1 expected to contain 'SDG', found: {b1!r}")
        for sdg, (r1, r2) in ranges.items():
            header_label = self._norm(ws.cell(row=r1, column=2).value)
            logger.debug(f"{ws.title}: SDG {sdg} block B{r1}='{header_label}' rows={r1}-{r2}")
        return ranges

    # ---------- sector canonicalization ----------
    def _canonicalize_sector(self, raw: Optional[str]) -> Optional[str]:
        """Strip 'Sector' labels, dedupe, and return canonical 'Textiles' or 'Fertilizers'."""
        if not raw:
            return None
        s = re.sub(r"\bsector\b\s*[:\-–|]?\s*", "", str(raw), flags=re.IGNORECASE)
        tokens = re.split(r"[,/;|]+", s)
        candidates: List[str] = []

        for t in tokens if tokens else [s]:
            tt = re.sub(r"\bsector\b", "", t, flags=re.IGNORECASE).strip()
            if not tt:
                continue
            low = tt.lower()

            # Exact synonym
            if low in SECTOR_SYNONYMS:
                candidates.append(SECTOR_SYNONYMS[low])
                continue

            # Light fuzzy to catch near-misses
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

    def _extract_sector_default(self, ws, sheet_name: Optional[str] = None) -> Optional[str]:
        """Read C3; if empty/unclear, infer from sheet name."""
        try:
            raw = self._norm(ws["C3"].value)
        except Exception:
            raw = None
        canon = self._canonicalize_sector(raw)

        # Fallback: infer from sheet name
        if not canon and sheet_name:
            name = sheet_name.lower()
            if "textile" in name:
                canon = "Textiles"
            elif "fertilizer" in name or "fertilis" in name:
                canon = "Fertilizers"

        logger.info(f"Default sector resolved: {canon!r} (C3 raw={raw!r}, sheet_name={sheet_name!r})")
        return canon

    def _extract_sector_by_sdg(self, ws, sdg_ranges: Dict[int, Tuple[int, int]], sheet_name: Optional[str]) -> Dict[int, Optional[str]]:
        default_sector = self._extract_sector_default(ws, sheet_name)
        by_sdg: Dict[int, Optional[str]] = {}
        for sdg, (start_row, _) in sdg_ranges.items():
            raw = self._norm(ws.cell(row=start_row, column=3).value)  # Column C at SDG header row
            canon = self._canonicalize_sector(raw) or default_sector
            by_sdg[sdg] = canon
            logger.debug(f"[{ws.title}] SDG {sdg}: C{start_row} raw={raw!r} -> sector={canon!r} (fallback={default_sector!r})")
        return by_sdg

    # ---------- scoring ----------
    def _clean_scoring_text(self, txt: str) -> str:
        # Drop leading numbering like "3 -", "(2)", "4:"
        return re.sub(r"^\s*\(?\d+\)?\s*[:\-–\.]\s*", "", txt).strip()

    def _extract_score_number(self, scoring_val: Optional[str]) -> Optional[int]:
        """Extract 0..5 from scoring cell using number prefixes, single rubric entry, or phrase heuristics."""
        if not scoring_val:
            return None
        txt = str(scoring_val).strip()

        # Leading number
        m = re.match(r"^\s*\(?([0-5])\)?(?:\s*[:\-\–\.\)]|\s)", txt)
        if m:
            return int(m.group(1))

        # Exactly one rubric-like "d:" in the text
        nums = re.findall(r"(?<!\d)([0-5])\s*[:\-\–\.\)]", txt)
        uniq = sorted({int(n) for n in nums})
        if len(uniq) == 1:
            return uniq[0]
        if len(uniq) > 1:
            return None  # avoid guessing when multiple entries included

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

    # ---------- rows ----------
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

        # Map row -> sdg_number
        row_to_sdg: Dict[int, int] = {}
        for sdg, (r1, r2) in sdg_ranges.items():
            for r in range(r1, r2 + 1):
                row_to_sdg[r] = sdg

        for r in range(data_start, data_end + 1):
            row_vals = [c.value for c in ws[r]]
            if all(v is None for v in row_vals):
                continue

            sdg_number = row_to_sdg.get(r)
            if sdg_number is None:
                continue

            def get(key: str) -> Optional[str]:
                if key not in col_map:
                    return None
                cidx = col_map[key] + 1
                return self._norm(ws.cell(row=r, column=cidx).value)

            sector = sector_by_sdg.get(sdg_number)
            if sector is None:
                logger.warning(f"[{ws.title}] R{r} SDG{sdg_number}: sector is None — check C{sdg_ranges[sdg_number][0]} and C3 / sheet name.")

            scoring_cell = get("scoring")
            score = self._extract_score_number(scoring_cell)
            score_desc = self._derive_score_description(scoring_cell, score)

            row = QuestionnaireRow(
                sdg_number=sdg_number,
                sdg_description=SDG_DESCRIPTIONS.get(sdg_number),
                sector=sector,
                sdg_target=get("sdg_target"),
                sustainability_dimension=get("sustainability_dimension"),
                kpi=get("kpi"),
                question=get("question"),
                score=score,
                score_description=score_desc,
                source=get("source"),
                notes=get("notes"),
                status=get("status"),
                comment=get("comment"),
            )

            # Strict skip: if ALL of these are empty -> drop row
            empties = [
                row.sustainability_dimension, row.kpi, row.question,
                row.score, row.score_description, row.source, row.notes, row.status, row.comment
            ]
            if all(v in (None, "", []) for v in empties):
                continue

            # Trace a few examples per SDG
            if len([x for x in records if x.get("sdg_number") == sdg_number]) < 3:
                logger.debug(
                    f"{ws.title}: R{r} SDG{sdg_number} '{row.sdg_description}' "
                    f"sector='{sector}' score={row.score} KPI='{row.kpi}' "
                    f"Q='{(row.question or '')[:60]}'"
                )

            records.append(asdict(row))

        logger.info(f"{ws.title}: collected {len(records)} questionnaire rows")
        return records

    # ---------- public API ----------
    def extract_questionnaire_data(self, sheet_name: str) -> Dict[str, Any]:
        if sheet_name not in self.wb.sheetnames:
            logger.warning(f"Sheet '{sheet_name}' not found; skipping.")
            return {"rows": [], "sector_by_sdg": {}}

        ws = self.wb[sheet_name]
        sdg_ranges = self._build_sdg_ranges(ws)
        sector_by_sdg = self._extract_sector_by_sdg(ws, sdg_ranges, sheet_name)
        header_row, col_map = self._detect_header_row_and_map(ws)
        logger.debug(f"{sheet_name}: header at R{header_row}, map={col_map}")

        rows = self._sheet_rows(ws, header_row, col_map, sdg_ranges, sector_by_sdg)
        logger.debug(f"{sheet_name}: sector_by_sdg = {sector_by_sdg}")
        return {"rows": rows, "sector_by_sdg": sector_by_sdg}

    def parse_all_data(self) -> Dict[str, Dict[str, Any]]:
        out: Dict[str, Dict[str, Any]] = {}
        for sheet in self.sheet_names:
            logger.info(f"---- Parsing sheet: {sheet} ----")
            key = self._norm_key(sheet) or sheet
            out[key] = self.extract_questionnaire_data(sheet)
        return out

# ---------- convenience wrapper ----------
def parse_excel_questionnaire(file_path: str, sheet_names: Optional[List[str]] = None) -> Dict[str, Dict[str, Any]]:
    parser = QuestionnaireParser(file_path, sheet_names)
    return parser.parse_all_data()

# ---------- CLI ----------
if __name__ == "__main__":
    xlsx = "backend/data/IS_Questionnaires_revised_KK.xlsx"  # update as needed
    try:
        parsed = parse_excel_questionnaire(xlsx)
        print(f"Parsed data from {xlsx}:")
        for sheet, data in parsed.items():
            print(f"Sheet: {sheet} | Rows: {len(data['rows'])} | Sector by SDG: {data['sector_by_sdg']}")
            print("Sample rows:")
            for row in data['rows'][:3]:
                print(row)
        
    except Exception as e:
        logger.exception(f"CLI error: {e}")
