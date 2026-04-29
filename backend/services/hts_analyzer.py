import pandas as pd
import io
import logging
import time
import networkx as nx
from networkx.algorithms import community
from typing import Dict, Any, Optional

from services.column_mapper import (
    auto_map_columns, apply_mapping,
    HTS_PROFILES, HTS_REQUIRED,
)

logger = logging.getLogger("forenlytics.hts")

MAX_ROWS = 50000

# Canonical columns required by every downstream module
REQUIRED_COLS = HTS_REQUIRED


class HTSAnalyzer:
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self._cache: Dict[str, Any] | None = None
        # Temporary storage for the "needs mapping" flow
        self._pending_df: Optional[pd.DataFrame] = None
        self._detected_profile: str = "GENERIC"
        self._mapping_confidence: float = 0.0

    def _invalidate_cache(self):
        self._cache = None

    # ─── CSV reading helpers ────────────────────────────

    @staticmethod
    def _read_csv(file_content: bytes) -> pd.DataFrame:
        """Read CSV with automatic delimiter detection."""
        try:
            return pd.read_csv(io.BytesIO(file_content), sep=None, engine="python")
        except Exception:
            return pd.read_csv(io.BytesIO(file_content))

    # ─── Main ingestion entry-point ─────────────────────

    def ingest_csv(self, file_content: bytes) -> Dict[str, Any]:
        """
        Parse a CSV, auto-detect country profile and columns.
        Returns success, needs_mapping, or error payload.
        """
        self._invalidate_cache()
        self._pending_df = None
        start = time.time()

        try:
            if not file_content or len(file_content) < 10:
                return {"error": "File is empty or too small to be a valid CSV."}

            df = self._read_csv(file_content)

            if df.empty:
                return {"error": "CSV file contains no data rows."}

            # Enforce row limit
            if len(df) > MAX_ROWS:
                df = df.head(MAX_ROWS)
                logger.warning(f"HTS dataset truncated to {MAX_ROWS} rows")

            # Normalize column names (lowercase, underscores)
            df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(r"[\s\-\.]+", "_", regex=True)

            # Run the column mapper with profile detection
            result = auto_map_columns(df, {}, REQUIRED_COLS, profiles=HTS_PROFILES)

            self._detected_profile = result.get("profile", "GENERIC")
            self._mapping_confidence = result.get("confidence", 0.0)

            if result["status"] == "needs_mapping":
                # Store the raw DataFrame so we can finalize later
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
                    "profile": result.get("profile", "GENERIC"),
                    "profile_name": result.get("profile_name", "Unknown"),
                    "confidence": self._mapping_confidence,
                    "processing_time_seconds": elapsed,
                }

            # All columns resolved — finalize
            df = apply_mapping(df, result["mapping"])
            return self._finalize(df, start)

        except pd.errors.EmptyDataError:
            return {"error": "CSV file is empty or has no parseable data."}
        except pd.errors.ParserError as e:
            return {"error": f"CSV parsing failed: {str(e)}"}
        except Exception as e:
            self.df = None
            logger.exception("HTS ingestion failed")
            return {"error": f"Unexpected error during ingestion: {str(e)}"}

    # ─── Manual mapping confirmation ────────────────────

    def confirm_mapping(self, mapping: Dict[str, str]) -> Dict[str, Any]:
        """
        Called by the API when the user manually maps columns.
        ``mapping`` is {original_col_name: canonical_col_name}.
        """
        self._invalidate_cache()
        start = time.time()

        if self._pending_df is None:
            return {"error": "No pending data. Please upload a file first."}

        # Validate that all required columns are covered
        mapped_canonical = set(mapping.values())
        missing = [r for r in REQUIRED_COLS if r not in mapped_canonical]
        if missing:
            return {"error": f"Missing mappings for: {', '.join(missing)}"}

        df = apply_mapping(self._pending_df, mapping)
        self._pending_df = None
        return self._finalize(df, start)

    # ─── Shared finalization (sanitize + validate) ──────

    def _finalize(self, df: pd.DataFrame, start: float) -> Dict[str, Any]:
        """Sanitize, validate, store the DataFrame, return success payload."""
        try:
            # Sanitize string columns
            for col in ["caller_number", "receiver_number", "base_station_id"]:
                if col in df.columns:
                    df[col] = df[col].astype(str).str.strip()

            # Parse and validate timestamps
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", dayfirst=True)
            invalid_ts_count = int(df["timestamp"].isna().sum())
            df = df.dropna(subset=["timestamp"])

            if df.empty:
                self.df = None
                return {"error": "All timestamps were invalid. Check the timestamp column format."}

            # Deduplicate
            before_dedup = len(df)
            df = df.drop_duplicates()
            dupes_removed = before_dedup - len(df)

            # Validate caller/receiver are non-empty
            df = df[df["caller_number"].str.len() > 0]
            df = df[df["receiver_number"].str.len() > 0]

            if df.empty:
                self.df = None
                return {"error": "No valid records remain after sanitization."}

            # Sort
            df = df.sort_values("timestamp").reset_index(drop=True)

            self.df = df

            elapsed = round(time.time() - start, 3)
            logger.info(f"HTS ingested {len(df)} rows in {elapsed}s (invalid_ts={invalid_ts_count}, dupes={dupes_removed})")

            return {
                "status": "success",
                "rows_processed": len(df),
                "invalid_timestamps_dropped": invalid_ts_count,
                "duplicates_removed": dupes_removed,
                "profile": self._detected_profile,
                "confidence": self._mapping_confidence,
                "processing_time_seconds": elapsed,
            }
        except Exception as e:
            self.df = None
            logger.exception("HTS finalization failed")
            return {"error": f"Unexpected error during finalization: {str(e)}"}

    # ─── Analysis (unchanged downstream) ────────────────

    def get_analysis_payload(self) -> Dict[str, Any]:
        if self.df is None or self.df.empty:
            return {"error": "No data available. Please upload an HTS CSV dump first."}

        # Return cached result if available
        if self._cache is not None:
            return self._cache

        start = time.time()
        try:
            df = self.df

            # 1. Total Calls
            total_calls = int(len(df))

            # 2. Total Calls per Number (vectorized)
            caller_counts = df['caller_number'].value_counts()
            receiver_counts = df['receiver_number'].value_counts()
            total_per_number = caller_counts.add(receiver_counts, fill_value=0).sort_values(ascending=False)
            unique_numbers = int(len(total_per_number))

            top_numbers_dict = [{"number": str(k), "calls": int(v)} for k, v in total_per_number.head(10).items()]

            # 3. Most frequent connections (pairs) — vectorized groupby
            pair_counts = df.groupby(['caller_number', 'receiver_number']).size().reset_index(name='count')
            pair_counts = pair_counts.sort_values(by='count', ascending=False)
            top_pairs = [
                {"source": str(row['caller_number']), "target": str(row['receiver_number']), "weight": int(row['count'])}
                for _, row in pair_counts.head(10).iterrows()
            ]

            top_pair_info = {"source": "N/A", "target": "N/A", "weight": 0}
            if top_pairs:
                top_pair_info = top_pairs[0]

            # 4. Time-based clustering (vectorized)
            hours = df['timestamp'].dt.floor('h')
            time_clusters = hours.value_counts().sort_index()
            timeline_data = [
                {"time": ts.strftime('%Y-%m-%d %H:%M'), "count": int(count)}
                for ts, count in time_clusters.items()
            ]

            # 5. Base Station Frequency
            base_stations = df['base_station_id'].value_counts()
            top_stations = [{"station_id": str(k), "count": int(v)} for k, v in base_stations.head(10).items()]

            # 6. Raw Data Snippet (last 100 rows)
            raw_rows = df.sort_values('timestamp', ascending=False).head(100).copy()
            raw_rows['timestamp'] = raw_rows['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')
            raw_data = raw_rows.fillna('').to_dict(orient='records')

            elapsed = round(time.time() - start, 3)
            logger.info(f"HTS analysis completed in {elapsed}s for {total_calls} records")

            result = {
                "summary": {
                    "total_calls": total_calls,
                    "unique_numbers": unique_numbers,
                    "top_pair": top_pair_info,
                },
                "visualizations": {
                    "top_numbers": top_numbers_dict,
                    "top_stations": top_stations,
                    "timeline": timeline_data,
                    "top_pairs": top_pairs
                },
                "raw_data": raw_data
            }

            self._cache = result
            return result

        except Exception as e:
            logger.exception("HTS analysis failed")
            return {"error": f"Analysis processing failed: {str(e)}"}

    def get_graph_analysis(self) -> Dict[str, Any]:
        if self.df is None or self.df.empty:
            return {"error": "No data available. Please upload an HTS CSV dump first."}

        start = time.time()
        try:
            df = self.df

            # Aggregate edges: caller -> receiver and count frequency
            edges_df = df.groupby(['caller_number', 'receiver_number']).size().reset_index(name='weight')

            # Build directed graph
            G = nx.DiGraph()
            
            for _, row in edges_df.iterrows():
                G.add_edge(str(row['caller_number']), str(row['receiver_number']), weight=int(row['weight']))
                
            # Compute Centralities
            # Degree Centrality (normalized)
            degree_centrality = nx.degree_centrality(G)
            
            # Betweenness Centrality (approximated for speed if graph is very large, but we'll try exact first, or cap k)
            k_samples = min(len(G.nodes), 100) # limit to 100 nodes for betweenness sampling if graph is huge
            betweenness = nx.betweenness_centrality(G, k=k_samples, weight='weight')
            
            # Community Detection (using greedy modularity as it works on directed graphs if converted to undirected, or Louvain)
            # Louvain requires an undirected graph
            G_undirected = G.to_undirected()
            communities = community.louvain_communities(G_undirected, weight='weight')
            
            # Map nodes to their community index
            node_community_map = {}
            for i, comm in enumerate(communities):
                for node in comm:
                    node_community_map[node] = i
                    
            # Identify highest centrality node (hub)
            most_central_node = max(degree_centrality.items(), key=lambda x: x[1])[0] if degree_centrality else None
            
            nodes_list = []
            for node in G.nodes():
                in_deg = G.in_degree(node)
                out_deg = G.out_degree(node)
                deg = G.degree(node)
                
                nodes_list.append({
                    "id": node,
                    "label": node,
                    "metrics": {
                        "degree": int(deg),
                        "in_degree": int(in_deg),
                        "out_degree": int(out_deg),
                        "centrality": float(degree_centrality.get(node, 0)),
                        "betweenness": float(betweenness.get(node, 0))
                    },
                    "cluster": node_community_map.get(node, 0)
                })

            edges_list = [
                {
                    "source": u,
                    "target": v,
                    "weight": d['weight']
                }
                for u, v, d in G.edges(data=True)
            ]

            density = nx.density(G)
            avg_degree = sum(dict(G.degree()).values()) / len(G) if len(G) > 0 else 0

            # Insights
            largest_community = max(communities, key=len) if communities else set()
            
            insights = {
                "hub": most_central_node,
                "total_clusters": len(communities),
                "largest_cluster_size": len(largest_community)
            }

            elapsed = round(time.time() - start, 3)
            logger.info(f"HTS graph analysis completed in {elapsed}s: {len(G.nodes)} nodes, {len(G.edges)} edges")

            return {
                "nodes": nodes_list,
                "edges": edges_list,
                "graph_metrics": {
                    "density": density,
                    "avg_degree": avg_degree,
                    "most_central_node": most_central_node
                },
                "insights": insights
            }

        except Exception as e:
            logger.exception("HTS graph processing failed")
            return {"error": f"Graph processing failed: {str(e)}"}
