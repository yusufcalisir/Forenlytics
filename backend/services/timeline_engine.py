import pandas as pd
import logging
import time
from typing import Dict, Any
import uuid

logger = logging.getLogger("forenlytics.timeline")

class TimelineEngine:
    def __init__(self):
        pass

    def get_unified_timeline(self, hts_analyzer=None, gps_analyzer=None) -> Dict[str, Any]:
        start = time.time()
        try:
            hts_df = hts_analyzer.df if hts_analyzer else None
            gps_df = gps_analyzer.df if gps_analyzer else None

            has_hts = hts_df is not None and not hts_df.empty
            has_gps = gps_df is not None and not gps_df.empty

            if not has_hts and not has_gps:
                return {"error": "NO_DATA", "message": "No data available in either HTS or GPS modules. Please upload target logs in those modules first."}

            events = []

            # 1. Process HTS Events
            if has_hts:
                for _, row in hts_df.iterrows():
                    events.append({
                        "id": str(uuid.uuid4()),
                        "timestamp": row['timestamp'],
                        "type": "HTS",
                        "layer": "communication",
                        "title": f"Signal: {row['caller_number']} -> {row['receiver_number']}",
                        "metadata": {
                            "caller": str(row['caller_number']),
                            "receiver": str(row['receiver_number']),
                            "base_station": str(row['base_station_id'])
                        },
                        "linked_events": [],
                        "is_anomaly": False
                    })

            # 2. Process GPS Events
            if has_gps:
                # Downsample to 1 point per 5 minutes for the timeline feed, but keep anomalies if possible. 
                gps_df_copy = gps_df.copy()
                gps_df_copy['5m'] = gps_df_copy['timestamp'].dt.floor('5min')
                thinned_gps = gps_df_copy.drop_duplicates(subset=['5m'])
                
                for _, row in thinned_gps.iterrows():
                    events.append({
                        "id": str(uuid.uuid4()),
                        "timestamp": row['timestamp'],
                        "type": "GPS",
                        "layer": "movement",
                        "title": "Movement Detected",
                        "metadata": {
                            "latitude": round(float(row['latitude']), 5),
                            "longitude": round(float(row['longitude']), 5)
                        },
                        "linked_events": [],
                        "is_anomaly": False
                    })

                # Add stops as explicit events
                gps_analysis = gps_analyzer.get_analysis() if gps_analyzer else {}
                if "stops" in gps_analysis:
                    for stop in gps_analysis["stops"]:
                        events.append({
                            "id": str(uuid.uuid4()),
                            "timestamp": pd.to_datetime(stop['start_time']),
                            "type": "EVT",
                            "layer": "manual",
                            "title": "Stationary Stop",
                            "metadata": {
                                "duration": f"{stop['duration_minutes']} mins",
                                "latitude": stop['latitude'],
                                "longitude": stop['longitude']
                            },
                            "linked_events": [],
                            "is_anomaly": False
                        })

            if not events:
                return {"error": "NO_DATA", "message": "Processing completed but no valid events were generated."}

            # Sort chronological
            timeline_df = pd.DataFrame(events)
            timeline_df = timeline_df.sort_values('timestamp').reset_index(drop=True)

            # Convert to list of dicts for easy manipulation
            events_list = timeline_df.to_dict('records')
            
            # Correlation Engine & Anomaly Detection
            correlated_count = 0
            anomaly_count = 0
            insights = []
            
            for i in range(len(events_list)):
                current = events_list[i]
                
                # Check neighbors within a 10 minute window
                for j in range(max(0, i - 10), min(len(events_list), i + 10)):
                    if i == j: continue
                    neighbor = events_list[j]
                    
                    time_diff = abs((current['timestamp'] - neighbor['timestamp']).total_seconds()) / 60.0
                    
                    if time_diff <= 10:
                        # Correlate HTS and GPS
                        if (current['type'] == 'HTS' and neighbor['type'] in ['GPS', 'EVT']) or \
                           (current['type'] in ['GPS', 'EVT'] and neighbor['type'] == 'HTS'):
                            if neighbor['id'] not in current['linked_events']:
                                current['linked_events'].append(neighbor['id'])
                                correlated_count += 1
                                
                # Anomaly Rule: Communication Burst
                if current['type'] == 'HTS':
                    burst_count = 0
                    for j in range(i + 1, min(len(events_list), i + 20)):
                        if events_list[j]['type'] == 'HTS':
                            if (events_list[j]['timestamp'] - current['timestamp']).total_seconds() / 60.0 <= 10:
                                burst_count += 1
                    if burst_count >= 3:
                        current['is_anomaly'] = True
                        if len(insights) < 10 and not any("Communication burst" in ins for ins in insights):
                            insights.append("Communication burst detected (multiple calls within 10 minutes).")
                            anomaly_count += 1

                # Anomaly Rule: Rapid movement after call
                if current['type'] == 'HTS':
                    for j in range(i + 1, min(len(events_list), i + 5)):
                        if events_list[j]['type'] == 'GPS':
                            diff_mins = (events_list[j]['timestamp'] - current['timestamp']).total_seconds() / 60.0
                            if diff_mins <= 5:
                                current['is_anomaly'] = True
                                events_list[j]['is_anomaly'] = True
                                if len(insights) < 10 and not any("Movement shortly after communication" in ins for ins in insights):
                                    insights.append("Movement observed shortly after communication event.")
                                    anomaly_count += 1

            # Time Cluster Engine
            clusters = []
            current_cluster = []
            
            for evt in events_list:
                if not current_cluster:
                    current_cluster.append(evt)
                else:
                    last_evt = current_cluster[-1]
                    diff = (evt['timestamp'] - last_evt['timestamp']).total_seconds() / 60.0
                    if diff <= 60: # 1 hour gap to break cluster
                        current_cluster.append(evt)
                    else:
                        if len(current_cluster) >= 3:
                            clusters.append({
                                "start": current_cluster[0]['timestamp'].strftime('%Y-%m-%d %H:%M:%S'),
                                "end": current_cluster[-1]['timestamp'].strftime('%Y-%m-%d %H:%M:%S'),
                                "intensity_score": len(current_cluster),
                                "event_count": len(current_cluster)
                            })
                        current_cluster = [evt]
                        
            if len(current_cluster) >= 3:
                clusters.append({
                    "start": current_cluster[0]['timestamp'].strftime('%Y-%m-%d %H:%M:%S'),
                    "end": current_cluster[-1]['timestamp'].strftime('%Y-%m-%d %H:%M:%S'),
                    "intensity_score": len(current_cluster),
                    "event_count": len(current_cluster)
                })

            # Story Mode Generation
            story_parts = []
            story_parts.append(f"Analysis encompasses {len(events_list)} events.")
            if clusters:
                story_parts.append(f"We identified {len(clusters)} distinct periods of concentrated activity.")
                largest_cluster = max(clusters, key=lambda x: x['intensity_score'])
                story_parts.append(f"The most intense activity occurred between {largest_cluster['start']} and {largest_cluster['end']}, containing {largest_cluster['event_count']} events.")
            
            if anomaly_count > 0:
                story_parts.append(f"The system detected {anomaly_count} anomalous sequences, including sudden movements and communication bursts.")
                
            if correlated_count > 0:
                story_parts.append("There are strong correlations between communication events and physical relocations, suggesting coordinated activity.")
                
            story = " ".join(story_parts)

            # Cleanup timestamps for JSON serialization
            for evt in events_list:
                evt['timestamp'] = evt['timestamp'].strftime('%Y-%m-%dT%H:%M:%SZ')

            elapsed = round(time.time() - start, 3)
            logger.info(f"Timeline reconstruction unified {len(events_list)} events in {elapsed}s")

            return {
                "events": events_list,
                "clusters": clusters,
                "insights": insights,
                "story": story,
                "statistics": {
                    "total_events": len(events_list),
                    "correlated_events": correlated_count // 2, # div 2 because bidirectional links
                    "anomaly_count": anomaly_count
                }
            }

        except Exception as e:
            logger.exception("Timeline reconstruction engine failed")
            return {"error": "PROCESSING_ERROR", "message": f"Timeline generation failed: {str(e)}"}

