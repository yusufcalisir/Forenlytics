import io
import logging
import time
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from services.timeline_engine import TimelineEngine

logger = logging.getLogger("forenlytics.report")

class ReportGenerator:
    def __init__(self):
        pass

    def generate_json_summary(self, hts_analyzer=None, gps_analyzer=None) -> Dict[str, Any]:
        try:
            hts = hts_analyzer.get_analysis_payload() if hts_analyzer and hts_analyzer.df is not None else {}
            gps = gps_analyzer.get_analysis() if gps_analyzer and gps_analyzer.df is not None else {}
            engine = TimelineEngine()
            timeline = engine.get_unified_timeline(hts_analyzer, gps_analyzer) if (hts_analyzer and hts_analyzer.df is not None) or (gps_analyzer and gps_analyzer.df is not None) else {}

            # Safe defaults
            hts_summary = hts.get('summary', {})
            gps_summary = gps.get('summary', {})
            events = timeline.get('events', [])
            stats = timeline.get('statistics', {})

            # Time range
            time_range = "N/A"
            if events:
                first_ts = events[0].get('timestamp', 'N/A')
                last_ts = events[-1].get('timestamp', 'N/A')
                time_range = f"{first_ts} to {last_ts}"

            return {
                "case_summary": {
                    "total_hts_records": hts_summary.get('total_calls', 0),
                    "total_gps_points": len(gps_analyzer.df) if gps_analyzer and gps_analyzer.df is not None else 0,
                    "time_range_covered": time_range
                },
                "communication_analysis": {
                    "top_pair": hts_summary.get('top_pair', {"source": "N/A", "target": "N/A"}),
                    "unique_numbers": hts_summary.get('unique_numbers', 0)
                },
                "movement_analysis": {
                    "distance_km": gps_summary.get('total_distance_km', 0),
                    "total_stops": gps_summary.get('total_stops', 0),
                    "most_visited_area": gps_summary.get('top_area', {"lat": "N/A", "lng": "N/A"})
                },
                "timeline_overview": {
                    "total_events": stats.get('total_events', len(events)),
                    "correlated_overlaps": stats.get('correlated_events', 0)
                },
                "final_summary": {
                    "observation": f"A sequential aggregate of {stats.get('total_events', len(events))} procedural entries were derived spanning the designated observation parameters. The intelligence system identified {stats.get('correlated_events', 0)} deterministic geographical timeline overlaps and {stats.get('anomaly_count', 0)} anomalous sequences linking signals directly to tracked behavioral halt metrics."
                }
            }
        except Exception as e:
            logger.exception("Report summary generation failed")
            return {
                "case_summary": {"total_hts_records": 0, "total_gps_points": 0, "time_range_covered": "N/A"},
                "communication_analysis": {"top_pair": {"source": "N/A", "target": "N/A"}, "unique_numbers": 0},
                "movement_analysis": {"distance_km": 0, "total_stops": 0, "most_visited_area": {"lat": "N/A", "lng": "N/A"}},
                "timeline_overview": {"total_events": 0, "correlated_overlaps": 0},
                "final_summary": {"observation": f"Report generation encountered an error: {str(e)}"}
            }

    def generate_pdf(self, hts_analyzer=None, gps_analyzer=None) -> io.BytesIO:
        start = time.time()
        try:
            data = self.generate_json_summary(hts_analyzer, gps_analyzer)
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
            styles = getSampleStyleSheet()

            styles.add(ParagraphStyle(name='TitleFormat', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, spaceAfter=20, alignment=1))
            styles.add(ParagraphStyle(name='SectionHeader', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, spaceBefore=20, spaceAfter=10, textColor=colors.black))

            flowables = []

            flowables.append(Paragraph("FORENLYTICS OFFICIAL DOCKET", styles['TitleFormat']))
            flowables.append(Spacer(1, 12))

            # A. Case Summary
            flowables.append(Paragraph("A. CASE SUMMARY", styles['SectionHeader']))
            case_data = [
                ["Assessed Signals (HTS Log Count)", str(data['case_summary']['total_hts_records'])],
                ["Interpolated Coordinates (GPS Logs)", str(data['case_summary']['total_gps_points'])],
                ["Chronological Bounds Evaluated", str(data['case_summary']['time_range_covered'])]
            ]
            t1 = Table(case_data, colWidths=[220, 230])
            t1.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            flowables.append(t1)

            # B. Comms
            flowables.append(Paragraph("B. COMMUNICATION METAMATRIX", styles['SectionHeader']))
            top_pair = data['communication_analysis']['top_pair']
            comms_data = [
                ["Distinct Network Entities", str(data['communication_analysis']['unique_numbers'])],
                ["Primary Transmission Vector", f"{top_pair.get('source', 'N/A')} -> {top_pair.get('target', 'N/A')}"]
            ]
            t2 = Table(comms_data, colWidths=[220, 230])
            t2.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            flowables.append(t2)

            # C. Movement
            flowables.append(Paragraph("C. MOVEMENT ANALYSIS", styles['SectionHeader']))
            top_area = data['movement_analysis']['most_visited_area']
            area_str = f"Lat: {top_area.get('lat', 'N/A')}, Lng: {top_area.get('lng', 'N/A')}" if isinstance(top_area, dict) else str(top_area)

            gps_data = [
                ["Approximate Ground Track Spanned", f"{data['movement_analysis']['distance_km']} km"],
                ["Registered Stationary Events", str(data['movement_analysis']['total_stops'])],
                ["Primary Geographic Center", area_str]
            ]
            t3 = Table(gps_data, colWidths=[220, 230])
            t3.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            flowables.append(t3)

            # D & E. Timeline
            flowables.append(Paragraph("D &amp; E. TIMELINE HEURISTICS &amp; CORRELATIONS", styles['SectionHeader']))
            time_data = [
                ["Nodes Rendered in Universal Graph", str(data['timeline_overview']['total_events'])],
                ["Critical Synchronized Overlaps", str(data['timeline_overview']['correlated_overlaps'])]
            ]
            t4 = Table(time_data, colWidths=[220, 230])
            t4.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            flowables.append(t4)

            # F. Summary
            flowables.append(Paragraph("F. FACTUAL SYSTEMIC OBSERVATIONS", styles['SectionHeader']))
            flowables.append(Paragraph(data['final_summary']['observation'], styles['Normal']))

            doc.build(flowables)
            buffer.seek(0)

            elapsed = round(time.time() - start, 3)
            logger.info(f"PDF generated in {elapsed}s")

            return buffer

        except Exception as e:
            logger.exception("PDF generation failed")
            # Return a minimal error PDF
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            doc.build([Paragraph(f"Report generation failed: {str(e)}", styles['Normal'])])
            buffer.seek(0)
            return buffer

