"""
Global Telecom Data Normalization System for Forenlytics.
=========================================================

Supports forensic-grade CSV ingestion from:
  • Turkey   (BTK HTS / Operator CDR exports)
  • USA      (CDR / NELOS / Carrier Logs)
  • UK       (IPA / ICR / ETSI LI XML CSV exports)

Pipeline:
  1.  Parse CSV  (auto-detect delimiter)
  2.  Normalize column headers  (lowercase, underscores)
  3.  Detect country profile  (score each profile against headers)
  4.  Alias-match columns into the UNIFIED SCHEMA
  5.  Content-based inference for any unresolved columns
  6.  Compute mapping confidence  (0–100 %)
  7.  If confidence < 80 % → return needs_mapping with sample data for frontend

UNIFIED STANDARD SCHEMA
────────────────────────
  timestamp          datetime of the event
  caller_number      originating party MSISDN / phone (→ alias: caller)
  receiver_number    terminating party MSISDN / phone (→ alias: receiver)
  duration           call duration in seconds
  direction          inbound / outbound / data
  imei               device IMEI / ESN / MEID
  imsi               SIM IMSI / MIN
  cell_id            cell-level identifier (CGI / E-CGI / LAC-CI)
  base_station_id    site-level / tower identifier
  latitude           base-station or GPS latitude
  longitude          base-station or GPS longitude
  data_volume        data volume in KB / bytes

BACKWARD COMPATIBILITY
──────────────────────
  The HTS analyzer expects: timestamp, caller_number, receiver_number, base_station_id
  The GPS analyzer expects: timestamp, latitude, longitude
  We map to those EXACT names so downstream modules never break.
  Extra schema columns (duration, imei, etc.) are preserved as bonus columns
  in the DataFrame — available for future modules but ignored by current ones.
"""

import re
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field

import pandas as pd

logger = logging.getLogger("forenlytics.column_mapper")


# ═══════════════════════════════════════════════════════════
#  COUNTRY / DATA PROFILES
# ═══════════════════════════════════════════════════════════

@dataclass
class TelecomProfile:
    """Represents a country/format-specific column alias dictionary."""
    code: str                              # TR / US / UK / GENERIC
    name: str                              # Human-readable
    aliases: Dict[str, List[str]]          # canonical → [alias, ...]
    # Header keywords unique to this profile (for auto-detection)
    fingerprints: List[str] = field(default_factory=list)


# ─── Turkey: BTK HTS / Operator CDR Exports ────────────

PROFILE_TR = TelecomProfile(
    code="TR",
    name="Turkey (BTK HTS)",
    fingerprints=[
        "arayan", "aranan", "baz", "istasyon", "tarih",
        "numara", "hucre", "sure", "yon", "imei",
    ],
    aliases={
        "timestamp": [
            "tarih", "zaman", "saat", "tarih_saat", "islem_zamani",
            "islem_zamanı", "kayit_zamani", "baslangic_zamani",
            "arama_zamani", "event_time", "timestamp", "date",
            "datetime", "date_time", "time", "call_time",
        ],
        "caller_number": [
            "arayan", "arayan_no", "arayan_numara", "arayan_numarasi",
            "a_taraf", "a_taraf_no", "a_numarasi", "msisdn_a",
            "caller", "caller_number", "calling_number", "a_party",
            "a_number", "originating_number", "kaynak_numara",
        ],
        "receiver_number": [
            "aranan", "aranan_no", "aranan_numara", "aranan_numarasi",
            "b_taraf", "b_taraf_no", "b_numarasi", "msisdn_b",
            "receiver", "receiver_number", "called_number", "b_party",
            "b_number", "terminating_number", "hedef_numara",
        ],
        "duration": [
            "sure", "süre", "konusma_suresi", "arama_suresi",
            "gorusme_suresi", "duration", "call_duration",
            "elapsed_time", "saniye", "sn",
        ],
        "direction": [
            "yon", "yön", "arama_yonu", "arama_tipi", "islem_tipi",
            "direction", "call_direction", "call_type", "tip", "type",
        ],
        "imei": [
            "imei", "cihaz_imei", "imei_no", "cihaz_no",
            "terminal_id", "device_id",
        ],
        "imsi": [
            "imsi", "imsi_no", "abone_imsi", "subscriber_id",
        ],
        "cell_id": [
            "hucre", "hücre", "hucre_id", "hucre_kodu", "cell_id",
            "cellid", "cgi", "e_cgi", "ecgi", "lac_ci", "lac_cell",
        ],
        "base_station_id": [
            "baz_istasyonu", "baz_istasyon", "baz_istasyon_kodu", "baz",
            "istasyon", "istasyon_id", "site_id", "site", "kule",
            "base_station_id", "base_station", "station_id", "station",
            "tower_id", "tower", "enb_id", "location_area_code", "lac",
        ],
        "latitude": [
            "enlem", "lat", "latitude", "baz_enlem", "istasyon_enlem",
        ],
        "longitude": [
            "boylam", "lon", "lng", "long", "longitude",
            "baz_boylam", "istasyon_boylam",
        ],
        "data_volume": [
            "veri_miktari", "data_hacmi", "veri_hacmi", "indirilen",
            "yuklenen", "data_volume", "bytes", "kb", "mb",
        ],
    },
)


# ─── United States: CDR / NELOS / Carrier Logs ─────────

PROFILE_US = TelecomProfile(
    code="US",
    name="United States (CDR / NELOS)",
    fingerprints=[
        "msisdn", "mdn", "nelos", "switch", "carrier",
        "dialed_digits", "origination", "pani", "esn", "meid",
    ],
    aliases={
        "timestamp": [
            "date_time", "datetime", "timestamp", "start_time",
            "origination_date", "cdr_date", "event_date", "event_time",
            "call_time", "call_date", "record_date", "time", "date",
        ],
        "caller_number": [
            "msisdn", "mdn", "mobile_directory_number", "phone_number",
            "originating_number", "calling_number", "caller",
            "caller_number", "a_party", "a_number", "subscriber_number",
            "source_number", "from_number", "from",
        ],
        "receiver_number": [
            "called_number", "dialed_digits", "target_number",
            "terminating_number", "destination_number", "b_number",
            "b_party", "receiver", "receiver_number", "to_number", "to",
        ],
        "duration": [
            "duration", "call_duration", "elapsed_time", "duration_sec",
            "duration_seconds", "billable_seconds", "talk_time",
        ],
        "direction": [
            "call_direction", "direction", "call_type", "type",
            "record_type", "service_type",
        ],
        "imei": [
            "imei", "esn", "meid", "device_id", "device_identifier",
            "terminal_id", "handset_id",
        ],
        "imsi": [
            "imsi", "min", "subscriber_identity", "sim_id",
        ],
        "cell_id": [
            "cell_site", "cell_id", "sector_id", "cgi", "sac",
            "cell_tower", "serving_cell", "first_cell",
        ],
        "base_station_id": [
            "switch_id", "msc", "tower_id", "site_name", "site_id",
            "base_station", "base_station_id", "station", "tower",
            "nelos_site", "bts_id",
        ],
        "latitude": [
            "lat", "latitude", "cell_lat", "tower_lat", "site_lat",
        ],
        "longitude": [
            "lon", "long", "longitude", "cell_lon", "tower_lon",
            "site_lon", "lng",
        ],
        "data_volume": [
            "data_usage", "bytes_transferred", "kb_transferred",
            "data_volume", "upload_bytes", "download_bytes",
            "total_bytes", "data_mb",
        ],
    },
)


# ─── United Kingdom: IPA / ICR / ETSI LI Exports ───────

PROFILE_UK = TelecomProfile(
    code="UK",
    name="United Kingdom (IPA / ICR / ETSI)",
    fingerprints=[
        "target_identifier", "other_party", "ipa", "icr", "etsi",
        "host_identifier", "subscriber", "communications_data",
        "csp", "service_provider",
    ],
    aliases={
        "timestamp": [
            "event_date_time", "start_date", "timestamp",
            "event_time", "date_time", "datetime",
            "communication_time", "intercept_time", "time", "date",
        ],
        "caller_number": [
            "target_identifier", "subject_msisdn", "subscriber_number",
            "originating_identifier", "calling_number", "caller",
            "caller_number", "a_party", "msisdn", "source_identifier",
        ],
        "receiver_number": [
            "other_party", "called_party", "destination_number",
            "destination_identifier", "host_identifier",
            "receiver", "receiver_number", "b_party",
            "terminating_identifier",
        ],
        "duration": [
            "duration", "call_duration", "event_duration",
            "duration_seconds",
        ],
        "direction": [
            "direction", "service_type", "event_type",
            "communication_type", "record_type",
        ],
        "imei": [
            "imei", "device_identifier", "equipment_identifier",
            "terminal_equipment", "handset_imei",
        ],
        "imsi": [
            "imsi", "subscriber_identity", "sim_identity",
            "subscriber_imsi",
        ],
        "cell_id": [
            "cell_id", "cgi", "e_cgi", "ecgi",
            "cell_reference", "serving_cell_id",
        ],
        "base_station_id": [
            "base_station", "site_reference", "cell_site",
            "base_station_id", "site_id", "station",
            "mast_reference", "tower",
        ],
        "latitude": [
            "latitude", "lat", "cell_latitude", "site_latitude",
        ],
        "longitude": [
            "longitude", "long", "lng", "lon",
            "cell_longitude", "site_longitude",
        ],
        "data_volume": [
            "data_volume", "ip_traffic_volume", "bytes_transferred",
            "octets_transferred", "data_size",
        ],
    },
)


# ─── Generic / GPS-only profile ────────────────────────

PROFILE_GPS = TelecomProfile(
    code="GPS",
    name="GPS Coordinate Data",
    fingerprints=[
        "latitude", "longitude", "lat", "lon", "lng",
        "enlem", "boylam", "gps",
    ],
    aliases={
        "timestamp": [
            "timestamp", "time", "date", "datetime", "date_time",
            "tarih", "zaman", "saat", "zaman_damgasi",
            "event_time", "record_time", "gps_time",
        ],
        "latitude": [
            "latitude", "lat", "enlem", "y",
            "gps_lat", "start_lat", "point_lat",
        ],
        "longitude": [
            "longitude", "lon", "lng", "long", "boylam", "x",
            "gps_lon", "gps_lng", "start_lon", "point_lon",
        ],
    },
)


# All HTS-capable profiles in priority order
HTS_PROFILES = [PROFILE_TR, PROFILE_US, PROFILE_UK]
ALL_PROFILES = [PROFILE_TR, PROFILE_US, PROFILE_UK, PROFILE_GPS]

# Required columns for each module (backward-compatible names)
HTS_REQUIRED = ["timestamp", "caller_number", "receiver_number", "base_station_id"]
GPS_REQUIRED = ["timestamp", "latitude", "longitude"]

# Convenience exports for analyzers
HTS_ALIASES = PROFILE_TR.aliases   # default fallback — will be overridden by detected profile
GPS_ALIASES = PROFILE_GPS.aliases


# ═══════════════════════════════════════════════════════════
#  NORMALIZATION UTILITIES
# ═══════════════════════════════════════════════════════════

def _normalize_col_name(name: str) -> str:
    """Lowercase, strip, replace spaces/dashes/dots with underscores."""
    s = str(name).strip().lower()
    s = re.sub(r"[\s\-\.]+", "_", s)
    # Keep Turkish chars (ç ş ğ ı ö ü) alongside ascii
    s = re.sub(r"[^\w\u00e7\u015f\u011f\u0131\u00f6\u00fc\u00e9]", "", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


# ═══════════════════════════════════════════════════════════
#  PHASE 0: COUNTRY PROFILE DETECTION
# ═══════════════════════════════════════════════════════════

def detect_profile(
    columns: List[str],
    profiles: List[TelecomProfile],
) -> Tuple[TelecomProfile, float]:
    """
    Score each profile against the DataFrame columns.
    Returns (best_profile, confidence_score_0_to_100).
    """
    normalized = [_normalize_col_name(c) for c in columns]

    best_profile = profiles[0]
    best_score = 0.0

    for profile in profiles:
        # Fingerprint hits (unique identifiers for this country)
        fp_hits = sum(1 for fp in profile.fingerprints if any(fp in col for col in normalized))
        fp_score = fp_hits / max(len(profile.fingerprints), 1)

        # Alias coverage (how many canonical fields can be matched)
        alias_hits = 0
        for canonical, alias_list in profile.aliases.items():
            for col in normalized:
                if col in alias_list:
                    alias_hits += 1
                    break
        alias_score = alias_hits / max(len(profile.aliases), 1)

        # Weighted: 40% fingerprint + 60% alias coverage
        score = (fp_score * 40) + (alias_score * 60)

        if score > best_score:
            best_score = score
            best_profile = profile

    logger.info(f"Profile detected: {best_profile.code} ({best_profile.name}) — score={best_score:.1f}%")
    return best_profile, round(best_score, 1)


# ═══════════════════════════════════════════════════════════
#  PHASE 1: ALIAS MATCHING
# ═══════════════════════════════════════════════════════════

def _alias_match(columns: List[str], aliases: Dict[str, List[str]]) -> Dict[str, str]:
    """Returns {original_col_name: canonical_name}."""
    mapping: Dict[str, str] = {}
    used_canonical: set = set()

    for col in columns:
        norm = _normalize_col_name(col)
        for canonical, alias_list in aliases.items():
            if canonical in used_canonical:
                continue
            if norm in alias_list:
                mapping[col] = canonical
                used_canonical.add(canonical)
                break

    return mapping


# ═══════════════════════════════════════════════════════════
#  PHASE 2: CONTENT-BASED INFERENCE
# ═══════════════════════════════════════════════════════════

_SAMPLE_SIZE = 200


def _infer_timestamp_col(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    best, best_score = None, 0.0
    for col in candidates:
        try:
            sample = df[col].astype(str).head(_SAMPLE_SIZE)
            # Use format='mixed' if pandas >= 2.0, else fallback and ignore warning
            try:
                score = pd.to_datetime(sample, errors="coerce", dayfirst=True, format='mixed').notna().mean()
            except (TypeError, ValueError):
                import warnings
                with warnings.catch_warnings():
                    warnings.filterwarnings("ignore", category=UserWarning)
                    score = pd.to_datetime(sample, errors="coerce", dayfirst=True).notna().mean()
            
            if score > 0.6 and score > best_score:
                best, best_score = col, score
        except Exception:
            continue
    return best


def _infer_phone_cols(df: pd.DataFrame, candidates: List[str]) -> List[str]:
    phone_cols = []
    for col in candidates:
        try:
            sample = df[col].astype(str).head(_SAMPLE_SIZE)
            cleaned = sample.str.replace(r"[\+\-\s\(\)]", "", regex=True)
            numeric_ratio = cleaned.str.isnumeric().mean()
            mean_len = cleaned.str.len().mean()
            if numeric_ratio > 0.6 and 4 <= mean_len <= 18:
                phone_cols.append((col, numeric_ratio))
        except Exception:
            continue
    phone_cols.sort(key=lambda x: x[1], reverse=True)
    return [c for c, _ in phone_cols]


def _infer_coord_cols(df: pd.DataFrame, candidates: List[str]) -> List[Tuple[str, str]]:
    coord_candidates = []
    for col in candidates:
        try:
            sample = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(sample) < 5:
                continue
            ratio = len(sample) / min(len(df), _SAMPLE_SIZE)
            if ratio < 0.6:
                continue
            vmin, vmax = sample.min(), sample.max()
            if -90 <= vmin and vmax <= 90:
                coord_candidates.append((col, "lat", abs(vmax - vmin)))
            elif -180 <= vmin and vmax <= 180:
                coord_candidates.append((col, "lon", abs(vmax - vmin)))
        except Exception:
            continue
    return coord_candidates


def _infer_duration_col(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    for col in candidates:
        try:
            sample = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(sample) < 5:
                continue
            ratio = len(sample) / min(len(df), _SAMPLE_SIZE)
            if ratio > 0.7 and sample.min() >= 0 and sample.max() < 100000:
                return col
        except Exception:
            continue
    return None


# ═══════════════════════════════════════════════════════════
#  PUBLIC API
# ═══════════════════════════════════════════════════════════

def auto_map_columns(
    df: pd.DataFrame,
    aliases: Dict[str, List[str]],
    required: List[str],
    profiles: Optional[List[TelecomProfile]] = None,
) -> Dict[str, Any]:
    """
    Full normalization pipeline.

    Returns:
        status            "mapped" | "needs_mapping"
        mapping           {original → canonical}
        detected_columns  [{original, mapped_to, samples}, ...]
        missing           [canonical cols not resolved]
        profile           detected country code (TR/US/UK/GPS)
        confidence        mapping confidence 0–100
    """
    original_cols = list(df.columns)

    # Phase 0 — profile detection
    if profiles:
        profile, profile_score = detect_profile(original_cols, profiles)
        active_aliases = profile.aliases
    else:
        profile = None
        profile_score = 0.0
        active_aliases = aliases

    # Phase 1 — alias matching
    mapping = _alias_match(original_cols, active_aliases)
    mapped_canonical = set(mapping.values())
    unmapped_cols = [c for c in original_cols if c not in mapping]
    missing = [r for r in required if r not in mapped_canonical]

    # Phase 2 — content inference for missing required cols
    if missing:
        if "timestamp" in missing:
            ts_col = _infer_timestamp_col(df, unmapped_cols)
            if ts_col:
                mapping[ts_col] = "timestamp"
                unmapped_cols.remove(ts_col)
                missing.remove("timestamp")

        phone_targets = [m for m in missing if m in ("caller_number", "receiver_number")]
        if phone_targets:
            phone_cols = _infer_phone_cols(df, unmapped_cols)
            for target in phone_targets:
                if phone_cols:
                    col = phone_cols.pop(0)
                    mapping[col] = target
                    unmapped_cols.remove(col)
                    missing.remove(target)

        coord_targets = [m for m in missing if m in ("latitude", "longitude")]
        if coord_targets:
            coord_info = _infer_coord_cols(df, unmapped_cols)
            for target in coord_targets:
                kind = "lat" if target == "latitude" else "lon"
                matches = [c for c in coord_info if c[1] == kind]
                if matches:
                    col = matches[0][0]
                    mapping[col] = target
                    if col in unmapped_cols:
                        unmapped_cols.remove(col)
                    coord_info = [c for c in coord_info if c[0] != col]
                    missing.remove(target)

        if "base_station_id" in missing:
            for col in unmapped_cols:
                try:
                    numeric_ratio = pd.to_numeric(df[col].head(_SAMPLE_SIZE), errors="coerce").notna().mean()
                    if numeric_ratio < 0.95:
                        mapping[col] = "base_station_id"
                        unmapped_cols.remove(col)
                        missing.remove("base_station_id")
                        break
                except Exception:
                    continue
            if "base_station_id" in missing and unmapped_cols:
                col = unmapped_cols.pop(0)
                mapping[col] = "base_station_id"
                missing.remove("base_station_id")

    # Also try to map optional/bonus columns (duration, imei, etc.)
    optional_cols = [k for k in active_aliases if k not in required and k not in mapped_canonical]
    for opt in optional_cols:
        if opt in set(mapping.values()):
            continue
        for col in unmapped_cols[:]:
            norm = _normalize_col_name(col)
            if norm in active_aliases.get(opt, []):
                mapping[col] = opt
                unmapped_cols.remove(col)
                break

    # Content inference for optional: duration
    if "duration" not in set(mapping.values()) and "duration" in active_aliases:
        dur_col = _infer_duration_col(df, unmapped_cols)
        if dur_col:
            mapping[dur_col] = "duration"
            unmapped_cols.remove(dur_col)

    # Compute confidence score
    required_mapped = len([r for r in required if r in set(mapping.values())])
    total_mapped = len(mapping)
    total_cols = len(original_cols)

    # Confidence = 60% required coverage + 25% total coverage + 15% profile score
    req_coverage = (required_mapped / max(len(required), 1)) * 60
    total_coverage = (total_mapped / max(total_cols, 1)) * 25
    prof_contribution = (profile_score / 100) * 15 if profile else 0
    confidence = round(min(100, req_coverage + total_coverage + prof_contribution), 1)

    # Build sample values for frontend
    detected_columns = []
    for col in original_cols:
        sample_vals = df[col].dropna().head(3).astype(str).tolist()
        detected_columns.append({
            "original": col,
            "mapped_to": mapping.get(col),
            "samples": sample_vals,
        })

    profile_code = profile.code if profile else "GENERIC"
    profile_name = profile.name if profile else "Generic CSV"

    if missing or confidence < 80:
        return {
            "status": "needs_mapping",
            "mapping": mapping,
            "detected_columns": detected_columns,
            "missing": missing,
            "profile": profile_code,
            "profile_name": profile_name,
            "confidence": confidence,
        }

    logger.info(
        f"Auto-mapped {total_mapped}/{total_cols} columns "
        f"(profile={profile_code}, confidence={confidence}%)"
    )

    return {
        "status": "mapped",
        "mapping": mapping,
        "detected_columns": detected_columns,
        "missing": [],
        "profile": profile_code,
        "profile_name": profile_name,
        "confidence": confidence,
    }


def apply_mapping(df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
    """Rename columns according to the mapping."""
    rename_map = {orig: canon for orig, canon in mapping.items() if orig in df.columns}
    return df.rename(columns=rename_map)
