"""
Forensic Report Generator
===========================
Generates structured JSON summaries and official PDF Audio Forensic Dockets.
Designed for zero-persistence environments — all output is in-memory only.
"""

import io
import hashlib
import logging
import time
from typing import Dict, Any, Optional, List

logger = logging.getLogger("forenlytics.report")

FORENSIC_DISCLAIMER = (
    "This official forensic docket is compiled by the Forenlytics Neural Audio Forensic Intelligence Suite. "
    "All similarity scores, synthetic anomaly indices, and acoustic classifications are probabilistic indicators "
    "derived through multi-dimensional signal processing and deep neural sequence models. Empirically calibrated on "
    "standard speech corpora (LibriSpeech clean benchmark, N=160 pairs, Composite EER=6.25%, AUC=0.988; VITS Neural TTS "
    "& Splicing 3-class benchmark, N=120 samples, Composite EER=20.0%, AUC=0.870, Splice Localization Recall=90.0%). These findings do not "
    "constitute absolute judicial proof of speaker identity or audio authenticity, and should be evaluated in "
    "conjunction with independent expert analysis."
)


class ReportGenerator:
    """Generates structured intelligence summaries and official PDF dockets for audio forensics."""

    def generate_json_summary(
        self,
        audio_compare: Optional[Dict[str, Any]] = None,
        audio_deepfake: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        try:
            has_compare = audio_compare is not None and "similarity_score" in audio_compare
            has_deepfake = audio_deepfake is not None and "deepfake_score" in audio_deepfake

            # ── Speaker comparison data ────────────────────────────────────
            sim_score = audio_compare.get("similarity_score", 0) if has_compare else 0
            verdict = audio_compare.get("verdict", "N/A") if has_compare else "N/A"
            conf_level = audio_compare.get("confidence_level", "N/A") if has_compare else "N/A"
            engine_scores = audio_compare.get("engine_scores", {}) if has_compare else {}
            dim_scores = audio_compare.get("dimension_scores", {}) if has_compare else {}
            disagreements = audio_compare.get("disagreements", []) if has_compare else []
            dim_telemetry = audio_compare.get("dimension_telemetry", []) if has_compare else []
            breakdown = audio_compare.get("breakdown", []) if has_compare else []
            file_meta = audio_compare.get("file_metadata", {}) if has_compare else {}
            preprocessing_steps = audio_compare.get("preprocessing_steps", []) if has_compare else []
            threshold_note = audio_compare.get("threshold_note", "") if has_compare else ""
            pitch_contours = audio_compare.get("pitch_contours", {}) if has_compare else {}
            formant_data = audio_compare.get("formant_data", {}) if has_compare else {}
            rhythm_data = audio_compare.get("rhythm_data", {}) if has_compare else {}
            spectral_data = audio_compare.get("spectral_data", {}) if has_compare else {}

            # ── Deepfake data ──────────────────────────────────────────────
            df_score = audio_deepfake.get("deepfake_score", 0) if has_deepfake else 0
            df_label = audio_deepfake.get("label", "N/A") if has_deepfake else "N/A"
            df_conf = audio_deepfake.get("confidence", "N/A") if has_deepfake else "N/A"
            df_category = audio_deepfake.get("manipulation_category", "N/A") if has_deepfake else "N/A"
            df_cat_label = audio_deepfake.get("category_label", "N/A") if has_deepfake else "N/A"
            df_signals = audio_deepfake.get("signals", {}) if has_deepfake else {}
            df_intervals = audio_deepfake.get("suspect_intervals", []) if has_deepfake else []
            df_boundaries = audio_deepfake.get("boundary_timestamps", []) if has_deepfake else []
            df_disagreements = audio_deepfake.get("disagreements", []) if has_deepfake else []
            df_metrics = audio_deepfake.get("metrics", {}) if has_deepfake else {}
            df_meta = audio_deepfake.get("file_metadata", {}) if has_deepfake else {}
            df_interp = audio_deepfake.get(
                "interpretation",
                "Interpretation not available for this analysis."
            ) if has_deepfake else "No deepfake analysis performed."

            # Case Reference ID
            gen_time_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
            case_seed = f"{gen_time_str}_{sim_score}_{df_score}"
            docket_id = f"FLX-{hashlib.sha256(case_seed.encode()).hexdigest()[:8].upper()}"

            # ── Observations ───────────────────────────────────────────────
            obs_parts = []
            if has_compare:
                obs_parts.append(
                    f"Acoustic multi-dimensional fusion yielded an overall speaker similarity score of {sim_score}% "
                    f"with verdict '{verdict}' (Confidence: {conf_level}). The examination evaluated neural transformer "
                    f"speaker embeddings (35%), vocal tract LPC formant resonances (20%), pitch F0 intonation dynamics (15%), "
                    f"13-band spectral MFCC fingerprints (15%), and temporal rhythm cadence (10%)."
                )
                if disagreements:
                    obs_parts.append(
                        f"Notice: {len(disagreements)} acoustic contradiction flag(s) were identified during cross-channel "
                        "evaluation. Physiological markers and neural representations exhibited divergent alignment."
                    )
            if has_deepfake:
                obs_parts.append(
                    f"Multi-signal synthetic speech screening classified the target specimen as '{df_label}' "
                    f"({df_cat_label}, Anomaly Index: {df_score}%, Confidence: {df_conf}). "
                    f"{df_interp}"
                )
                if df_intervals:
                    iv_str = ", ".join([f"{iv['t_start']}s–{iv['t_end']}s" for iv in df_intervals[:4]])
                    obs_parts.append(f"Suspicious synthetic speech intervals were temporally localized at: [{iv_str}].")
                if df_boundaries:
                    bd_str = ", ".join([f"{b}s" for b in df_boundaries[:4]])
                    obs_parts.append(f"Acoustic splice boundary markers detected at: [{bd_str}].")

            if not has_compare and not has_deepfake:
                obs_parts.append(
                    "No active audio comparison or deepfake analysis data recorded for this session."
                )

            return {
                "case_summary": {
                    "docket_id":               docket_id,
                    "case_title":              "Acoustic Biometric & Synthetic Speech Forensic Examination",
                    "has_speaker_comparison":  has_compare,
                    "has_deepfake_analysis":   has_deepfake,
                    "generated_at":            gen_time_str,
                    "target_platform":         "Forenlytics Neural Audio Forensics Suite v2.0",
                    "forensic_disclaimer":     FORENSIC_DISCLAIMER,
                },
                "speaker_verification": {
                    "similarity_score":   sim_score,
                    "verdict":            verdict,
                    "confidence_level":   conf_level,
                    "threshold_note":     threshold_note,
                    "dimension_scores":   dim_scores,
                    "disagreements":      disagreements,
                    "dimension_telemetry": dim_telemetry,
                    "engine_scores": {
                        "wavlm":      round(engine_scores.get("wavlm", 0) or 0, 1),
                        "embedding":  round(engine_scores.get("embedding", 0), 1),
                        "biometric":  round(engine_scores.get("biometric", 0), 1),
                        "signal":     round(engine_scores.get("signal", 0), 1),
                    },
                    "breakdown":          breakdown,
                    "file_metadata":      file_meta,
                    "pitch_contours":     pitch_contours,
                    "formant_data":       formant_data,
                    "rhythm_data":        rhythm_data,
                    "spectral_data":      spectral_data,
                    "preprocessing_steps": preprocessing_steps,
                },
                "deepfake_diagnostics": {
                    "deepfake_score":        df_score,
                    "label":                 df_label,
                    "confidence":            df_conf,
                    "manipulation_category": df_category,
                    "category_label":        df_cat_label,
                    "interpretation":        df_interp,
                    "signals":               df_signals,
                    "suspect_intervals":     df_intervals,
                    "boundary_timestamps":   df_boundaries,
                    "disagreements":         df_disagreements,
                    "metrics":               df_metrics,
                    "file_metadata":         df_meta,
                },
                "final_summary": {
                    "observation": " ".join(obs_parts)
                },
            }
        except Exception as e:
            logger.exception("Audio report summary generation failed")
            return {
                "case_summary": {
                    "docket_id": "FLX-ERR-000",
                    "case_title": "Forensic Examination Record (Error Fallback)",
                    "has_speaker_comparison": False,
                    "has_deepfake_analysis": False,
                    "generated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                },
                "speaker_verification": {"similarity_score": 0, "verdict": "ERROR", "confidence_level": "ERROR"},
                "deepfake_diagnostics": {"deepfake_score": 0, "label": "ERROR", "interpretation": "Report generation error."},
                "final_summary": {"observation": f"Report generation encountered an error: {e}"},
            }

    def generate_pdf(
        self,
        audio_compare: Optional[Dict[str, Any]] = None,
        audio_deepfake: Optional[Dict[str, Any]] = None,
    ) -> io.BytesIO:
        t_start = time.time()
        try:
            try:
                from reportlab.lib.pagesizes import letter
                from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                from reportlab.platypus import (
                    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                    HRFlowable, KeepTogether
                )
                from reportlab.lib import colors
                has_reportlab = True
            except ImportError:
                has_reportlab = False

            data = self.generate_json_summary(audio_compare, audio_deepfake)
            buffer = io.BytesIO()

            if not has_reportlab:
                logger.warning("reportlab not installed — generating plain text fallback.")
                text = (
                    f"FORENLYTICS AUDIO FORENSIC DOCKET [{data['case_summary']['docket_id']}]\n"
                    f"Generated: {data['case_summary']['generated_at']}\n\n"
                    f"Observation: {data['final_summary']['observation']}\n\n"
                    f"DISCLAIMER: {FORENSIC_DISCLAIMER}\n"
                )
                buffer.write(text.encode("utf-8"))
                buffer.seek(0)
                return buffer

            # Printable width: Letter = 612 pt wide. Margins = 40 pt each side -> 532 pt content width.
            PAGE_WIDTH = 532
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=40,
                leftMargin=40,
                topMargin=40,
                bottomMargin=36,
            )
            styles = getSampleStyleSheet()

            # ── Custom Paragraph Styles with strict leading & word-wrap ──
            title_style = ParagraphStyle(
                "DocTitle", parent=styles["Heading1"],
                fontName="Helvetica-Bold", fontSize=15, leading=18,
                alignment=0, spaceAfter=2, textColor=colors.HexColor("#0f172a"),
            )
            subtitle_style = ParagraphStyle(
                "DocSubtitle", parent=styles["Normal"],
                fontName="Helvetica", fontSize=8, leading=11,
                alignment=0, spaceAfter=4, textColor=colors.HexColor("#475569"),
            )
            badge_style = ParagraphStyle(
                "DocketBadge", parent=styles["Normal"],
                fontName="Helvetica-Bold", fontSize=8.5, leading=10,
                alignment=2, textColor=colors.HexColor("#0284c7"),
            )
            section_style = ParagraphStyle(
                "SecHeader", parent=styles["Heading2"],
                fontName="Helvetica-Bold", fontSize=9.5, leading=13,
                spaceBefore=10, spaceAfter=4, textColor=colors.HexColor("#0369a1"),
            )
            cell_bold = ParagraphStyle(
                "CellBold", parent=styles["Normal"],
                fontName="Helvetica-Bold", fontSize=8, leading=10.5,
                textColor=colors.HexColor("#0f172a"),
            )
            cell_normal = ParagraphStyle(
                "CellNormal", parent=styles["Normal"],
                fontName="Helvetica", fontSize=8, leading=10.5,
                textColor=colors.HexColor("#334155"),
            )
            cell_mono = ParagraphStyle(
                "CellMono", parent=styles["Normal"],
                fontName="Courier", fontSize=7.5, leading=9.5,
                textColor=colors.HexColor("#1e293b"),
            )
            cell_score_high = ParagraphStyle(
                "CellScoreHigh", parent=styles["Normal"],
                fontName="Helvetica-Bold", fontSize=8.5, leading=10.5,
                textColor=colors.HexColor("#059669"),
            )
            cell_score_warn = ParagraphStyle(
                "CellScoreWarn", parent=styles["Normal"],
                fontName="Helvetica-Bold", fontSize=8.5, leading=10.5,
                textColor=colors.HexColor("#dc2626"),
            )
            narrative_style = ParagraphStyle(
                "Narrative", parent=styles["Normal"],
                fontName="Helvetica", fontSize=8, leading=11.5,
                textColor=colors.HexColor("#1e293b"),
            )
            caution_style = ParagraphStyle(
                "CautionText", parent=styles["Normal"],
                fontName="Helvetica-Oblique", fontSize=7.5, leading=10.5,
                textColor=colors.HexColor("#64748b"),
            )
            alert_box_title = ParagraphStyle(
                "AlertBoxTitle", parent=styles["Normal"],
                fontName="Helvetica-Bold", fontSize=8.5, leading=11,
                textColor=colors.HexColor("#991b1b"),
            )
            alert_box_text = ParagraphStyle(
                "AlertBoxText", parent=styles["Normal"],
                fontName="Helvetica", fontSize=7.5, leading=10.5,
                textColor=colors.HexColor("#7f1d1d"),
            )

            # Helper to wrap text into Paragraphs safely for Tables
            def wrap_p(val, style=cell_normal):
                if isinstance(val, Paragraph):
                    return val
                return Paragraph(str(val) if val is not None else "—", style)

            def build_table(rows, col_widths, is_header=True):
                wrapped_rows = []
                for r_idx, row in enumerate(rows):
                    wrapped_row = []
                    for c_idx, cell in enumerate(row):
                        if r_idx == 0 and is_header:
                            st = cell_bold
                        elif c_idx == 0:
                            st = cell_bold
                        else:
                            st = cell_normal
                        wrapped_row.append(wrap_p(cell, st))
                    wrapped_rows.append(wrapped_row)

                t = Table(wrapped_rows, colWidths=col_widths)
                t_style = [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("PADDING", (0, 0), (-1, -1), 4),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
                if is_header:
                    t_style.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")))
                # Alternating row shading
                for i in range(1 if is_header else 0, len(rows)):
                    if i % 2 == 1:
                        t_style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc")))
                t.setStyle(TableStyle(t_style))
                return t

            flowables = []

            # ── 1. Header Banner ──────────────────────────────────────────
            header_table = Table(
                [
                    [
                        Paragraph("FORENLYTICS AUDIO FORENSIC INTELLIGENCE DOCKET", title_style),
                        Paragraph(f"DOCKET REF: <b>{data['case_summary']['docket_id']}</b>", badge_style)
                    ],
                    [
                        Paragraph("OFFICIAL MULTI-SIGNAL NEURAL BIOMETRIC & SYNTHETIC SPEECH RECORD", subtitle_style),
                        Paragraph(f"GENERATED: {data['case_summary']['generated_at']}", badge_style)
                    ]
                ],
                colWidths=[360, 172]
            )
            header_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 0),
            ]))
            flowables.append(header_table)
            flowables.append(Spacer(1, 4))
            flowables.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=6))

            # ── 2. Examination Overview & Custody Metadata ────────────────
            flowables.append(Paragraph("1.0 FORENSIC EXAMINATION METADATA & CHAIN OF CUSTODY", section_style))
            flowables.append(build_table(
                [
                    ["Parameter", "Forensic Configuration & System State"],
                    ["Analysis Suite", "Forenlytics Multi-Dimensional Neural Audio Suite v2.0"],
                    ["Speaker Verification Engine", "Microsoft WavLM-Base-Plus-SV + SpeechBrain ECAPA-TDNN (512-D Cosine Projection)"],
                    ["Synthetic Voice Detector", "Wav2Vec2 SOTA Classifier + 3-Indicator Acoustic / Prosodic Heuristic Suite"],
                    ["Acoustic Ingestion Standard", "16,000 Hz Mono PCM • Adaptive 20ms Frame-Energy VAD • RMS -20 dBFS Normalization"],
                    ["Data Custody Policy", "Zero Persistence — entirely processed in ephemeral volatile RAM; no audio persisted on disk"],
                ],
                col_widths=[140, 392],
                is_header=True
            ))

            # ── 3. File Metadata & Cryptographic Hashes ───────────────────
            sv = data["speaker_verification"]
            fm = sv.get("file_metadata", {})
            df = data["deepfake_diagnostics"]
            df_fm = df.get("file_metadata", {})

            if fm or df_fm:
                flowables.append(Spacer(1, 4))
                if fm and "audio_1" in fm and "audio_2" in fm:
                    f1 = fm["audio_1"]
                    f2 = fm["audio_2"]
                    custody_rows = [
                        ["Custody Property", "Target Sample (Specimen A)", "Comparison Sample (Specimen B)"],
                        ["SHA-256 Hash", f1.get("sha256", "N/A")[:36] + "...", f2.get("sha256", "N/A")[:36] + "..."],
                        ["Raw File Duration", f"{f1.get('raw_duration_sec', 'N/A')}s", f"{f2.get('raw_duration_sec', 'N/A')}s"],
                        ["Active Speech Duration", f"{f1.get('speech_duration_sec', 'N/A')}s (Voiced)", f"{f2.get('speech_duration_sec', 'N/A')}s (Voiced)"],
                        ["Sampling Frequency", f"{f1.get('sample_rate', 16000)} Hz", f"{f2.get('sample_rate', 16000)} Hz"],
                    ]
                    flowables.append(build_table(custody_rows, col_widths=[130, 201, 201], is_header=True))
                elif df_fm:
                    custody_rows = [
                        ["Custody Property", "Inspected Target Specimen"],
                        ["SHA-256 Hash", df_fm.get("sha256", "N/A")],
                        ["Raw File Duration", f"{df_fm.get('raw_duration_sec', 'N/A')}s"],
                        ["Active Speech Duration", f"{df_fm.get('speech_duration_sec', 'N/A')}s (Voiced)"],
                        ["Sampling Frequency", f"{df_fm.get('sample_rate', 16000)} Hz"],
                    ]
                    flowables.append(build_table(custody_rows, col_widths=[140, 392], is_header=True))

            # ── 4. Section 2.0: Speaker Comparison Findings ────────────────
            if data["case_summary"]["has_speaker_comparison"]:
                flowables.append(Spacer(1, 6))
                flowables.append(Paragraph("2.0 SIX-DIMENSIONAL SPEAKER VERIFICATION MATRIX", section_style))

                dim_s = sv.get("dimension_scores", {})
                eng_s = sv.get("engine_scores", {})
                pitch_cmp = sv.get("pitch_contours", {}).get("comparison", {})
                formant_cmp = sv.get("formant_data", {}).get("comparison", {})
                rhythm_cmp = sv.get("rhythm_data", {}).get("comparison", {})

                def fmt(v):
                    return f"{v:.1f}%" if v is not None else "N/A"

                sv_matrix = [
                    ["Acoustic Dimension", "Weight", "Score", "Analytical Finding & Physiological Significance"],
                    [
                        "1. Neural Identity", "35%", fmt(dim_s.get("neural_identity")),
                        f"WavLM-SV: {eng_s.get('wavlm', 0):.1f}% | ECAPA: {eng_s.get('embedding', 0):.1f}%. Deep latent space speaker identity projection."
                    ],
                    [
                        "2. Vocal Tract LPC Formants", "20%", fmt(dim_s.get("formants")),
                        f"LPC Order 16 Polynomial Roots (F1-F4). {formant_cmp.get('interpretation', 'Vocal tract resonance match.')}"
                    ],
                    [
                        "3. Pitch & Intonation F0", "15%", fmt(dim_s.get("pitch")),
                        f"pYIN Tracking (60-500Hz). Micro-jitter & pitch contour correlation: {pitch_cmp.get('pitch_correlation', 0):.2f}."
                    ],
                    [
                        "4. Spectral MFCC Fingerprint", "15%", fmt(dim_s.get("spectral_mfcc")),
                        f"13-Band Mel-frequency cepstral envelope, spectral centroid, and crest factor timbre distribution."
                    ],
                    [
                        "5. Speaking Rhythm & Cadence", "10%", fmt(dim_s.get("rhythm")),
                        f"Syllable onset tempo & speech-to-pause ratio. {rhythm_cmp.get('interpretation', 'Cadence profile match.')}"
                    ],
                    [
                        "6. Energy Dynamics", "5%", fmt(dim_s.get("energy")),
                        "Frame-to-frame RMS energy variability and dynamic range modulation."
                    ],
                    [
                        "COMPOSITE BIOMETRIC MATCH", "100%", f"{sv.get('similarity_score', 0)}%",
                        f"Official Verdict: {sv.get('verdict', 'N/A')} (Confidence: {sv.get('confidence_level', 'N/A')})"
                    ],
                ]
                flowables.append(build_table(sv_matrix, col_widths=[125, 45, 60, 302], is_header=True))

                # Disagreements Alert Box
                disagreements = sv.get("disagreements", [])
                if disagreements:
                    flowables.append(Spacer(1, 4))
                    alert_content = [
                        [Paragraph("⚠ FORENSIC CONTRADICTION ALERTS DETECTED", alert_box_title)],
                    ]
                    for d in disagreements:
                        msg = f"• <b>[{d.get('type', 'Contradiction')}]</b> {d.get('message', '')}"
                        alert_content.append([Paragraph(msg, alert_box_text)])

                    alert_table = Table(alert_content, colWidths=[PAGE_WIDTH])
                    alert_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef2f2")),
                        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#ef4444")),
                        ("PADDING", (0, 0), (-1, -1), 5),
                    ]))
                    flowables.append(alert_table)

            # ── 5. Section 3.0: Deepfake & Synthetic Evaluation ────────────
            if data["case_summary"]["has_deepfake_analysis"]:
                flowables.append(Spacer(1, 6))
                flowables.append(Paragraph("3.0 MULTI-SIGNAL DEEPFAKE & TEMPORAL SPLICING DIAGNOSTICS", section_style))

                df_signals = df.get("signals", {})
                s1 = df_signals.get("neural_model", {})
                s2 = df_signals.get("vocoder_artifacts", {})
                s3 = df_signals.get("prosody_naturalness", {})
                s4 = df_signals.get("spectral_consistency", {})

                df_matrix = [
                    ["Diagnostic Signal", "Signal Type", "Score", "Detection Methodology & Specific Sub-Checks"],
                    [
                        "Signal 1: Primary Neural Model", "Trained Model", f"{s1.get('score', 0):.1f}%",
                        "Fine-tuned Wav2Vec2 sequence classifier trained on modern TTS & voice cloning architectures."
                    ],
                    [
                        "Signal 2: Vocoder Artifacts", "Acoustic Heuristic", f"{s2.get('score', 0):.1f}%",
                        "Scans for GAN vocoder transposition ripple (>6.5kHz), phase coherence variance, and HNR anomalies."
                    ],
                    [
                        "Signal 3: Prosody Naturalness", "Statistical Heuristic", f"{s3.get('score', 0):.1f}%",
                        "Measures F0 pitch entropy (spline flatness), micro-jitter flutter, and metronomic rhythm regularity."
                    ],
                    [
                        "Signal 4: Spectral Splicing", "Temporal Heuristic", f"{s4.get('score', 0):.1f}%",
                        "Cross-window MFCC delta (>2.5σ baseline) and room-tone noise floor continuity for splice boundaries."
                    ],
                    [
                        "OVERALL SYNTHETIC ANOMALY INDEX", "Multi-Signal Composite", f"{df.get('deepfake_score', 0)}%",
                        f"Verdict: {df.get('label', 'N/A')} | Category: {df.get('category_label', df.get('manipulation_category', 'N/A'))}"
                    ]
                ]
                flowables.append(build_table(df_matrix, col_widths=[125, 80, 55, 272], is_header=True))

                # Temporal Localized Intervals & Splice Boundaries
                df_intervals = df.get("suspect_intervals", [])
                df_boundaries = df.get("boundary_timestamps", [])

                if df_intervals or df_boundaries:
                    flowables.append(Spacer(1, 4))
                    loc_rows = [["Temporal Analysis Finding", "Timestamps & Span Details"]]
                    if df_intervals:
                        iv_text = ", ".join([f"<b>{iv['t_start']}s – {iv['t_end']}s</b> ({iv.get('duration_sec', '')}s)" for iv in df_intervals[:4]])
                        loc_rows.append(["Localized Suspicious Segments", f"High anomaly index concentrated at: {iv_text}"])
                    if df_boundaries:
                        bd_text = ", ".join([f"<b>{b}s</b>" for b in df_boundaries[:6]])
                        loc_rows.append(["Splice Boundary Markers (✂)", f"Acoustic environment discontinuities flagged at: {bd_text}"])

                    flowables.append(build_table(loc_rows, col_widths=[140, 392], is_header=True))

                # Synthetic Disagreement Flags
                df_disagreements = df.get("disagreements", [])
                if df_disagreements:
                    flowables.append(Spacer(1, 4))
                    df_alert_content = [
                        [Paragraph("⚠ SYNTHETIC SIGNAL DISAGREEMENT FLAGS", alert_box_title)],
                    ]
                    for dd in df_disagreements:
                        df_alert_content.append([Paragraph(f"• {dd.get('message', '')}", alert_box_text)])

                    df_alert_table = Table(df_alert_content, colWidths=[PAGE_WIDTH])
                    df_alert_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffbeb")),
                        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#f59e0b")),
                        ("PADDING", (0, 0), (-1, -1), 5),
                    ]))
                    flowables.append(df_alert_table)

            # ── 6. Section 4.0: Forensic Synthesis & Summary ───────────────
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph("4.0 FORENSIC SYNTHESIS & EXPERT SUMMARY", section_style))
            flowables.append(Paragraph(data["final_summary"]["observation"], narrative_style))

            # ── 7. Legal Disclaimer ─────────────────────────────────────────
            flowables.append(Spacer(1, 8))
            flowables.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=4))
            flowables.append(Paragraph("5.0 EVIDENTIARY LIMITATIONS & METHODOLOGICAL DISCLAIMER", section_style))
            flowables.append(Paragraph(FORENSIC_DISCLAIMER, caution_style))

            doc.build(flowables)
            buffer.seek(0)
            elapsed = round(time.time() - t_start, 3)
            logger.info(f"High-fidelity PDF docket generated in {elapsed}s")
            return buffer

        except Exception as e:
            logger.exception("PDF generation failed")
            buffer = io.BytesIO()
            buffer.write(f"PDF generation failed: {e}".encode("utf-8"))
            buffer.seek(0)
            return buffer


report_generator = ReportGenerator()
