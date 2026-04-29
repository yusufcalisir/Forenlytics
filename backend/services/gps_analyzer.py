import pandas as pd
import numpy as np
import io
import json
import math
import logging
import time
from typing import Dict, Any, Optional

from services.column_mapper import (
    auto_map_columns, apply_mapping,
    GPS_ALIASES, GPS_REQUIRED, PROFILE_GPS,
)

logger = logging.getLogger("forenlytics.gps")

MAX_ROWS = 50000
MAX_DISPLAY_POINTS = 3000

# Canonical columns required by every downstream module
REQUIRED_COLS = GPS_REQUIRED


class GPSAnalyzer:
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self._cache: Dict[str, Any] | None = None
        # Temporary storage for the "needs mapping" flow
        self._pending_df: Optional[pd.DataFrame] = None

    def _invalidate_cache(self):
        self._cache = None

    @staticmethod
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @staticmethod
    def haversine_vectorized(lat1, lon1, lat2, lon2):
        """Fully vectorized haversine using numpy for 10k+ points."""
        R = 6371
        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = np.sin(dlat / 2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2)**2
        return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

    # ─── CSV / JSON reading helpers ─────────────────────

    @staticmethod
    def _read_file(file_content: bytes, filename: str) -> pd.DataFrame:
        if filename.endswith('.json'):
            data = json.loads(file_content.decode('utf-8'))
            if not isinstance(data, list):
                raise ValueError("JSON must be an array of objects.")
            return pd.DataFrame(data)
        else:
            try:
                return pd.read_csv(io.BytesIO(file_content), sep=None, engine="python")
            except Exception:
                return pd.read_csv(io.BytesIO(file_content))

    # ─── Main ingestion entry-point ─────────────────────

    def ingest_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        self._invalidate_cache()
        self._pending_df = None
        start = time.time()

        try:
            if not file_content or len(file_content) < 10:
                return {"error": "File is empty or too small to be valid data."}

            try:
                df = self._read_file(file_content, filename)
            except json.JSONDecodeError as e:
                return {"error": f"Invalid JSON file: {str(e)}"}
            except UnicodeDecodeError as e:
                return {"error": f"Invalid file encoding: {str(e)}"}
            except ValueError as e:
                return {"error": str(e)}
            except pd.errors.EmptyDataError:
                return {"error": "CSV file is empty."}
            except pd.errors.ParserError as e:
                return {"error": f"CSV parsing failed: {str(e)}"}

            if df.empty:
                return {"error": "File contains no data rows."}

            # Normalize column names
            df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(r"[\s\-\.]+", "_", regex=True)

            # Run the column mapper
            result = auto_map_columns(df, GPS_ALIASES, REQUIRED_COLS, profiles=[PROFILE_GPS])

            if result["status"] == "needs_mapping":
                self._pending_df = df
                elapsed = round(time.time() - start, 3)
                return {
                    "status": "needs_mapping",
                    "detected_columns": result["detected_columns"],
                    "missing": result["missing"],
                    "auto_mapping": {
                        orig: canon
                        for orig, canon in result["mapping"].items()
                    },
                    "required_columns": REQUIRED_COLS,
                    "profile": result.get("profile", "GPS"),
                    "confidence": result.get("confidence", 0.0),
                    "processing_time_seconds": elapsed,
                }

            df = apply_mapping(df, result["mapping"])
            return self._finalize(df, start)

        except Exception as e:
            self.df = None
            logger.exception("GPS ingestion failed")
            return {"error": f"Unexpected error during ingestion: {str(e)}"}

    # ─── Manual mapping confirmation ────────────────────

    def confirm_mapping(self, mapping: Dict[str, str]) -> Dict[str, Any]:
        self._invalidate_cache()
        start = time.time()

        if self._pending_df is None:
            return {"error": "No pending data. Please upload a file first."}

        mapped_canonical = set(mapping.values())
        missing = [r for r in REQUIRED_COLS if r not in mapped_canonical]
        if missing:
            return {"error": f"Missing mappings for: {', '.join(missing)}"}

        df = apply_mapping(self._pending_df, mapping)
        self._pending_df = None
        return self._finalize(df, start)

    # ─── Shared finalization ────────────────────────────

    def _finalize(self, df: pd.DataFrame, start: float) -> Dict[str, Any]:
        try:
            # Parse timestamps
            df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce', dayfirst=True)
            df = df.dropna(subset=['timestamp'])

            # Validate and coerce coordinates to numeric
            df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
            df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
            df = df.dropna(subset=['latitude', 'longitude'])

            # Validate coordinate ranges
            invalid_lat = (df['latitude'] < -90) | (df['latitude'] > 90)
            invalid_lon = (df['longitude'] < -180) | (df['longitude'] > 180)
            invalid_coords = int((invalid_lat | invalid_lon).sum())
            df = df[~invalid_lat & ~invalid_lon]

            if df.empty:
                self.df = None
                return {"error": "No valid GPS records remain after coordinate validation."}

            # Deduplicate
            before_dedup = len(df)
            df = df.drop_duplicates(subset=['timestamp', 'latitude', 'longitude'])
            dupes_removed = before_dedup - len(df)

            # Sort by timestamp
            df = df.sort_values(by='timestamp').reset_index(drop=True)

            # Enforce row limit
            original_count = len(df)
            if len(df) > MAX_ROWS:
                df = df.head(MAX_ROWS)
                logger.warning(f"GPS dataset truncated to {MAX_ROWS} rows")

            self.df = df

            elapsed = round(time.time() - start, 3)
            logger.info(f"GPS ingested {len(df)} rows in {elapsed}s (invalid_coords={invalid_coords}, dupes={dupes_removed})")

            return {
                "status": "success",
                "rows_processed": len(df),
                "original_rows": original_count,
                "invalid_coordinates_dropped": invalid_coords,
                "duplicates_removed": dupes_removed,
                "processing_time_seconds": elapsed,
            }
        except Exception as e:
            self.df = None
            logger.exception("GPS finalization failed")
            return {"error": f"Unexpected error during finalization: {str(e)}"}

    # ─── Analysis (unchanged downstream) ────────────────

    def get_analysis(self) -> Dict[str, Any]:
        if self.df is None or self.df.empty:
            return {"error": "No GPS data loaded."}

        if self._cache is not None:
            return self._cache

        start = time.time()
        try:
            df = self.df.copy()

            # Time differences
            time_diffs = df['timestamp'].diff().dt.total_seconds()
            time_diffs_hours = time_diffs / 3600.0

            # Vectorized total distance using numpy
            lats = df['latitude'].values
            lons = df['longitude'].values
            distances = self.haversine_vectorized(lats[:-1], lons[:-1], lats[1:], lons[1:])
            total_distance = float(np.nansum(distances))

            # Speeds (km/h)
            valid_times = time_diffs_hours.values[1:]
            speeds = np.zeros_like(distances)
            with np.errstate(divide='ignore', invalid='ignore'):
                speeds = np.where(valid_times > 0, distances / valid_times, 0)

            speed_anomalies = []
            teleports = 0
            
            anomaly_indices = np.where(speeds > 150)[0]
            for i in anomaly_indices:
                # Teleport check: > 10 km in < 1 minute
                is_teleport = distances[i] > 10 and valid_times[i] < (1/60)
                if is_teleport:
                    teleports += 1
                
                speed_anomalies.append({
                    "start_timestamp": str(df.iloc[i]['timestamp']),
                    "end_timestamp": str(df.iloc[i+1]['timestamp']),
                    "speed_kmh": round(float(speeds[i]), 1),
                    "distance_km": round(float(distances[i]), 2),
                    "is_teleport": bool(is_teleport)
                })

            # Missing data gaps > 1 hour
            missing_data_gaps = int(np.sum(valid_times > 1.0))

            # Movement Score Calculation (0-100)
            score = 100
            score -= len(speed_anomalies) * 5
            score -= teleports * 10
            score -= missing_data_gaps * 2
            score = max(0, min(100, score))

            # Stop detection
            stops = []
            current_cluster = []

            for i in range(len(df)):
                row = df.iloc[i]
                if not current_cluster:
                    current_cluster.append(row)
                    continue

                last_row = current_cluster[-1]
                dist = self.haversine(last_row['latitude'], last_row['longitude'], row['latitude'], row['longitude'])

                if dist < 0.05:
                    current_cluster.append(row)
                else:
                    if len(current_cluster) > 1:
                        time_diff = current_cluster[-1]['timestamp'] - current_cluster[0]['timestamp']
                        if time_diff.total_seconds() > 300:
                            stops.append({
                                "latitude": float(current_cluster[0]['latitude']),
                                "longitude": float(current_cluster[0]['longitude']),
                                "start_time": str(current_cluster[0]['timestamp']),
                                "end_time": str(current_cluster[-1]['timestamp']),
                                "duration_minutes": round(float(time_diff.total_seconds() / 60), 1)
                            })
                    current_cluster = [row]

            # Evaluate last cluster
            if len(current_cluster) > 1:
                time_diff = current_cluster[-1]['timestamp'] - current_cluster[0]['timestamp']
                if time_diff.total_seconds() > 300:
                    stops.append({
                        "latitude": float(current_cluster[0]['latitude']),
                        "longitude": float(current_cluster[0]['longitude']),
                        "start_time": str(current_cluster[0]['timestamp']),
                        "end_time": str(current_cluster[-1]['timestamp']),
                        "duration_minutes": round(float(time_diff.total_seconds() / 60), 1)
                    })

            # Top area (vectorized groupby)
            lat_grid = df['latitude'].round(2)
            lng_grid = df['longitude'].round(2)
            grid_counts = pd.DataFrame({'lat_grid': lat_grid, 'lng_grid': lng_grid}).groupby(['lat_grid', 'lng_grid']).size().reset_index(name='count')
            top_grid = grid_counts.sort_values(by='count', ascending=False).iloc[0]
            most_visited_areas = [{"lat": float(top_grid['lat_grid']), "lng": float(top_grid['lng_grid']), "count": int(top_grid['count'])}]

            # Build point array (downsample for frontend rendering)
            points = df[['latitude', 'longitude', 'timestamp']].copy()
            if len(points) > MAX_DISPLAY_POINTS:
                skip_rate = len(points) // MAX_DISPLAY_POINTS
                points = points.iloc[::skip_rate].reset_index(drop=True)
            
            points['timestamp'] = points['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')
            points_list = points.to_dict('records')

            elapsed = round(time.time() - start, 3)
            logger.info(f"GPS analysis completed in {elapsed}s ({len(df)} points, {len(stops)} stops, score={score})")

            result = {
                "total_distance_km": round(total_distance, 2),
                "total_stops": len(stops),
                "stop_locations": stops,
                "speed_anomalies": speed_anomalies,
                "most_visited_areas": most_visited_areas,
                "route_summary": [{"points_count": len(points_list)}],
                "movement_score": score,
                
                # Payload elements specifically needed by frontend
                "stops": stops,
                "points": points_list,
                "summary": {
                    "total_distance_km": round(total_distance, 2),
                    "total_stops": len(stops),
                    "top_area": {"lat": float(top_grid['lat_grid']), "lng": float(top_grid['lng_grid'])}
                }
            }

            self._cache = result
            return result

        except Exception as e:
            logger.exception("GPS analysis failed")
            return {"error": f"Analysis processing failed: {str(e)}"}
