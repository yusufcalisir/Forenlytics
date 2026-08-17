import io
import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger("forenlytics.report")


class ReportGenerator:
    """Generates structured intelligence summaries and official PDF dockets for audio forensics."""

    def generate_json_summary(
        self,
        audio_compare: Optional[Dict[str, Any]] = None,
        audio_deepfake: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        try:
            has_compare = audio_compare is not None and "similarity_score" in audio_compare
            has_deepfake = audio_deepfake is not None and "deepfake_score" in audio_deepfake

            # Speaker comparison data
            sim_score = audio_compare.get("similarity_score", 0) if has_compare else 0
            conf_level = audio_compare.get("confidence_level", "N/A") if has_compare else "N/A"
            engine_scores = audio_compare.get("engine_scores", {}) if has_compare else {}
            breakdown = audio_compare.get("breakdown", []) if has_compare else []

            # Deepfake detection data
            df_score = audio_deepfake.get("deepfake_score", 0) if has_deepfake else 0
            df_label = audio_deepfake.get("label", "N/A") if has_deepfake else "N/A"
            df_conf = audio_deepfake.get("confidence", "N/A") if has_deepfake else "N/A"
            df_metrics = audio_deepfake.get("metrics", {}) if has_deepfake else {}
            df_interp = audio_deepfake.get("interpretation", "No deepfake analysis performed.") if has_deepfake else "No deepfake analysis performed."

            # Construct summary observations
            obs_parts = []
            if has_compare:
                obs_parts.append(
                    f"Acoustic biometric fusion yielded an overall speaker similarity score of {sim_score}% "
                    f"({conf_level} confidence) across Microsoft WavLM, Wav2Vec2, and physiological pitch/formant telemetry."
                )
            if has_deepfake:
                obs_parts.append(
                    f"Synthetic vocoder artifact analysis classified the specimen as '{df_label}' "
                    f"(Anomaly Index: {df_score}%, Confidence: {df_conf})."
                )
            if not has_compare and not has_deepfake:
                obs_parts.append("No active audio comparison or deepfake analysis data recorded for this session.")

            return {
                "case_summary": {
                    "has_speaker_comparison": has_compare,
                    "has_deepfake_analysis": has_deepfake,
                    "generated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                    "target_platform": "Forenlytics Neural Audio Forensics Suite"
                },
                "speaker_verification": {
                    "similarity_score": sim_score,
                    "confidence_level": conf_level,
                    "engine_scores": {
                        "wavlm": round(engine_scores.get("wavlm", 0), 1) if engine_scores.get("wavlm") is not None else None,
                        "embedding": round(engine_scores.get("embedding", 0), 1),
                        "biometric": round(engine_scores.get("biometric", 0), 1),
                        "signal": round(engine_scores.get("signal", 0), 1),
                    },
                    "breakdown": breakdown
                },
                "deepfake_diagnostics": {
                    "deepfake_score": df_score,
                    "label": df_label,
                    "confidence": df_conf,
                    "metrics": df_metrics,
                    "interpretation": df_interp
                },
                "final_summary": {
                    "observation": " ".join(obs_parts)
                }
            }
        except Exception as e:
            logger.exception("Audio report summary generation failed")
            return {
                "case_summary": {"has_speaker_comparison": False, "has_deepfake_analysis": False},
                "speaker_verification": {"similarity_score": 0, "confidence_level": "ERROR"},
                "deepfake_diagnostics": {"deepfake_score": 0, "label": "ERROR"},
                "final_summary": {"observation": f"Report generation encountered an error: {str(e)}"}
            }

    def generate_pdf(
        self,
        audio_compare: Optional[Dict[str, Any]] = None,
        audio_deepfake: Optional[Dict[str, Any]] = None
    ) -> io.BytesIO:
        start = time.time()
        try:
            try:
                from reportlab.lib.pagesizes import letter
                from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
                from reportlab.lib import colors
                has_reportlab = True
            except ImportError:
                has_reportlab = False

            data = self.generate_json_summary(audio_compare, audio_deepfake)
            buffer = io.BytesIO()

            if not has_reportlab:
                # Fallback simple PDF format byte stream if reportlab is not installed
                logger.warning("reportlab not installed, generating plain text fallback stream.")
                text_content = f"FORENLYTICS AUDIO FORENSIC DOCKET\nGenerated: {data['case_summary']['generated_at']}\n\n"
                text_content += f"Observation: {data['final_summary']['observation']}\n"
                buffer.write(text_content.encode("utf-8"))
                buffer.seek(0)
                return buffer

            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=54,
                leftMargin=54,
                topMargin=54,
                bottomMargin=36
            )
            styles = getSampleStyleSheet()

            # Custom styles
            title_style = ParagraphStyle(
                name='DocTitle',
                parent=styles['Heading1'],
                fontName='Helvetica-Bold',
                fontSize=18,
                leading=22,
                alignment=1,
                spaceAfter=15,
                textColor=colors.HexColor("#0f172a")
            )
            subtitle_style = ParagraphStyle(
                name='DocSubtitle',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=9,
                alignment=1,
                spaceAfter=20,
                textColor=colors.HexColor("#64748b")
            )
            section_style = ParagraphStyle(
                name='SecHeader',
                parent=styles['Heading2'],
                fontName='Helvetica-Bold',
                fontSize=11,
                spaceBefore=14,
                spaceAfter=8,
                textColor=colors.HexColor("#0284c7")
            )
            body_style = ParagraphStyle(
                name='BodyTextCustom',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=9,
                leading=13,
                textColor=colors.HexColor("#334155")
            )

            flowables = []

            # Header
            flowables.append(Paragraph("FORENLYTICS AUDIO FORENSIC INTELLIGENCE DOCKET", title_style))
            flowables.append(Paragraph(f"Official Neural Biometric & Synthetics Analysis Record • Generated {data['case_summary']['generated_at']}", subtitle_style))
            flowables.append(Spacer(1, 8))

            # A. Examination Metadata
            flowables.append(Paragraph("A. FORENSIC EXAMINATION METADATA", section_style))
            meta_data = [
                ["Platform Suite", "Forenlytics Audio Forensic Engine v2.0"],
                ["Biometric Models", "Microsoft WavLM Large + Facebook Wav2Vec2-XLSR"],
                ["Synthetic Anomaly Detection", "Vocoder Artifact Scan (Temporal Variance, ZCR, Spectral Rolloff)"],
                ["Target Session Status", "Active In-Memory Ephemeral Analysis"]
            ]
            t_meta = Table(meta_data, colWidths=[200, 304])
            t_meta.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            flowables.append(t_meta)

            # B. Speaker Verification
            sv = data["speaker_verification"]
            flowables.append(Paragraph("B. SPEAKER VERIFICATION & NEURAL BIOMETRIC MATCH", section_style))
            eng = sv["engine_scores"]
            wavlm_val = f"{eng['wavlm']}%" if eng['wavlm'] is not None else "OFFLINE"
            sv_data = [
                ["Composite Similarity Score", f"{sv['similarity_score']}%"],
                ["Forensic Confidence Level", str(sv['confidence_level'])],
                ["Microsoft WavLM Neural Score", wavlm_val],
                ["Wav2Vec2 Embedding Alignment", f"{eng.get('embedding', 0)}%"],
                ["Physiological Biometric Telemetry", f"{eng.get('biometric', 0)}%"],
                ["Spectral Signal Consistency", f"{eng.get('signal', 0)}%"]
            ]
            t_sv = Table(sv_data, colWidths=[200, 304])
            t_sv.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                ('PADDING', (0, 0), (-1, -1), 5),
            ]))
            flowables.append(t_sv)

            # C. Deepfake Diagnostics
            df = data["deepfake_diagnostics"]
            flowables.append(Paragraph("C. DEEPFAKE & SYNTHETIC ANOMALY EVALUATION", section_style))
            df_metrics = df.get("metrics", {})
            df_data = [
                ["Anomaly Classification Verdict", str(df['label'])],
                ["Synthetic Anomaly Probability", f"{df['deepfake_score']}%"],
                ["Diagnostic Confidence", str(df['confidence'])],
                ["Zero-Crossing Rate (ZCR) Variance", str(df_metrics.get('zcr_variance', 'N/A'))],
                ["Spectral Rolloff Variance", str(df_metrics.get('rolloff_variance', 'N/A'))],
                ["Embedding Temporal Variance", str(df_metrics.get('embedding_variance', 'N/A'))]
            ]
            t_df = Table(df_data, colWidths=[200, 304])
            t_df.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                ('PADDING', (0, 0), (-1, -1), 5),
            ]))
            flowables.append(t_df)

            # D. Expert Forensic Summary
            flowables.append(Paragraph("D. FORENSIC SYNTHESIS & OPINION", section_style))
            flowables.append(Paragraph(data["final_summary"]["observation"], body_style))
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph(f"<b>Diagnostic Note:</b> {df['interpretation']}", body_style))

            # Build PDF
            doc.build(flowables)
            buffer.seek(0)
            elapsed = round(time.time() - start, 3)
            logger.info(f"Audio Forensic PDF docket generated in {elapsed}s")
            return buffer

        except Exception as e:
            logger.exception("Audio Forensic PDF generation failed")
            buffer = io.BytesIO()
            buffer.write(f"PDF generation failed: {str(e)}".encode("utf-8"))
            buffer.seek(0)
            return buffer


report_generator = ReportGenerator()
