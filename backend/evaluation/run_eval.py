"""
Forenlytics Empirical Evaluation & Recalibration Runner
======================================================
Executes actual production forensic pipelines against standard benchmark datasets,
computes EER, ROC/AUC, DET curves, and derives empirical weights and operating thresholds.
"""

import os
import sys
import time
import json
import logging
from typing import Dict, Any, List, Tuple, Optional
import numpy as np

# Ensure backend root is on sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.audio import speechbrain_compat
from services.audio.facade import audio_facade
from services.audio.fusion_engine import fusion_engine
from services.audio.engine_deepfake import deepfake_engine
from evaluation.dataset_loader import dataset_loader
from evaluation.metrics import (
    compute_eer, compute_roc_auc, compute_operating_points, evaluate_feature_matrix
)

# Output directory for results
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("forenlytics.eval.runner")


def run_speaker_verification_evaluation(n_pairs: int = 200) -> Dict[str, Any]:
    logger.info(f"=== Starting Speaker Verification Evaluation (N={n_pairs} pairs) ===")
    pairs = dataset_loader.prepare_speaker_verification_pairs(n_pairs=n_pairs)

    labels = []
    composite_scores = []
    dim_scores_matrix = {
        "neural_identity": [],
        "formants": [],
        "pitch": [],
        "spectral_mfcc": [],
        "rhythm": [],
        "energy": []
    }

    t0 = time.time()
    for idx, p in enumerate(pairs):
        if (idx + 1) % 25 == 0 or idx == 0:
            logger.info(f"  Evaluating speaker pair {idx+1}/{len(pairs)}...")

        res = audio_facade.analyze_pair(p["file1_bytes"], p["file2_bytes"])
        if "error" in res:
            logger.warning(f"  Pair {idx+1} skipped due to error: {res['error']}")
            continue

        label = p["label"]
        labels.append(label)
        composite_scores.append(res["similarity_score"])

        ds = res.get("dimension_scores", {})
        for dim_k in dim_scores_matrix:
            val = ds.get(dim_k)
            dim_scores_matrix[dim_k].append(val if val is not None else 50.0)

    elapsed = round(time.time() - t0, 2)
    logger.info(f"Completed speaker verification inference in {elapsed}s across {len(labels)} valid pairs.")

    # 1. Composite Score Metrics
    comp_arr = np.array(composite_scores, dtype=float)
    lbl_arr = np.array(labels, dtype=int)

    fused_eer, fused_opt_thresh, fused_curve = compute_eer(comp_arr, lbl_arr)
    fused_auc = compute_roc_auc(comp_arr, lbl_arr)
    fused_ops = compute_operating_points(comp_arr, lbl_arr)

    # 2. Individual Dimensions Metrics
    dim_results = evaluate_feature_matrix(dim_scores_matrix, labels)

    # 3. Compute Inverse-EER Optimal Weights
    # Weight w_i is inversely proportional to dimension EER (lower EER = higher weight)
    inv_eers = {}
    for k, v in dim_results.items():
        eer_val = max(1.0, v["eer_pct"])  # avoid division by 0
        inv_eers[k] = 1.0 / eer_val

    sum_inv = sum(inv_eers.values())
    calibrated_weights = {k: round(v / sum_inv, 3) for k, v in inv_eers.items()}

    # Ensure weights sum to exactly 1.0
    weight_diff = round(1.0 - sum(calibrated_weights.values()), 3)
    calibrated_weights["neural_identity"] = round(calibrated_weights["neural_identity"] + weight_diff, 3)

    return {
        "benchmark_name": "LibriSpeech Clean Speech Calibration Benchmark",
        "sample_size": len(labels),
        "genuine_pairs": int(np.sum(lbl_arr == 1)),
        "impostor_pairs": int(np.sum(lbl_arr == 0)),
        "evaluation_date": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "fused_composite": {
            "eer_pct": fused_eer,
            "auc": fused_auc,
            "optimal_threshold": fused_opt_thresh,
            "operating_points": fused_ops,
            "curve_samples": fused_curve[::20],  # downsampled curve for frontend plotting
        },
        "dimensions": dim_results,
        "calibrated_weights_proposed": calibrated_weights,
    }


def run_deepfake_evaluation(n_samples: int = 150) -> Dict[str, Any]:
    logger.info(f"=== Starting Deepfake & Splicing Evaluation (N={n_samples} samples) ===")
    samples = dataset_loader.prepare_deepfake_benchmark(n_samples=n_samples)

    labels = []
    composite_scores = []
    signal_scores_matrix = {
        "neural_model": [],
        "vocoder_artifacts": [],
        "spectral_consistency": [],
        "prosody_naturalness": []
    }
    categories_pred = []
    categories_truth = []
    splice_detection_hits = 0
    total_spliced_samples = 0

    t0 = time.time()
    for idx, s in enumerate(samples):
        if (idx + 1) % 25 == 0 or idx == 0:
            logger.info(f"  Evaluating deepfake sample {idx+1}/{len(samples)}...")

        res = audio_facade.detect_deepfake(s["file_bytes"])
        if "error" in res:
            logger.warning(f"  Sample {idx+1} skipped due to error: {res['error']}")
            continue

        label = s["label"]
        labels.append(label)
        composite_scores.append(res["deepfake_score"])
        categories_pred.append(res["manipulation_category"])
        categories_truth.append(s["category_ground_truth"])

        sigs = res.get("signals", {})
        for sig_k in signal_scores_matrix:
            val = sigs.get(sig_k, {}).get("score")
            signal_scores_matrix[sig_k].append(val if val is not None else 20.0)

        # Splice detection accuracy against known ground truth
        if s["is_spliced"]:
            total_spliced_samples += 1
            has_suspect = len(res.get("suspect_intervals", [])) > 0
            has_marker = len(res.get("boundary_timestamps", [])) > 0
            is_flagged = res.get("manipulation_category") == "SPLICED_PARTIAL" or has_suspect or has_marker
            if is_flagged:
                splice_detection_hits += 1

    elapsed = round(time.time() - t0, 2)
    logger.info(f"Completed deepfake inference in {elapsed}s across {len(labels)} valid samples.")

    # 1. Composite Metrics
    comp_arr = np.array(composite_scores, dtype=float)
    lbl_arr = np.array(labels, dtype=int)

    fused_eer, fused_opt_thresh, fused_curve = compute_eer(comp_arr, lbl_arr)
    fused_auc = compute_roc_auc(comp_arr, lbl_arr)
    fused_ops = compute_operating_points(comp_arr, lbl_arr)

    # 2. Individual Signals Metrics
    signal_results = evaluate_feature_matrix(signal_scores_matrix, labels)

    # 3. Category Metrics
    cat_pred_arr = np.array(categories_pred)
    cat_true_arr = np.array(categories_truth)
    category_acc = float(np.mean(cat_pred_arr == cat_true_arr) * 100.0)
    splice_recall = float((splice_detection_hits / total_spliced_samples * 100.0)) if total_spliced_samples > 0 else 0.0

    return {
        "benchmark_name": "Synthetic Speech & Splicing Calibration Benchmark",
        "sample_size": len(labels),
        "bona_fide_samples": int(np.sum(lbl_arr == 0)),
        "synthetic_samples": int(np.sum(lbl_arr == 1)),
        "spliced_samples": total_spliced_samples,
        "evaluation_date": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "fused_composite": {
            "eer_pct": fused_eer,
            "auc": fused_auc,
            "optimal_threshold": fused_opt_thresh,
            "operating_points": fused_ops,
            "curve_samples": fused_curve[::20],
        },
        "signals": signal_results,
        "category_accuracy_pct": round(category_acc, 2),
        "splice_localization_recall_pct": round(splice_recall, 2),
    }


def main():
    logger.info("================================================================")
    logger.info("   FORENLYTICS EMPIRICAL ACCURACY & CALIBRATION HARNESS         ")
    logger.info("================================================================")

    # 1. Evaluate Speaker Verification
    speaker_results = run_speaker_verification_evaluation(n_pairs=160)

    # 2. Evaluate Deepfake Detection
    deepfake_results = run_deepfake_evaluation(n_samples=120)

    # 3. Combine Master Evaluation Result
    master_results = {
        "platform": "Forenlytics Neural Audio Forensic Intelligence Suite v2.0",
        "evaluation_timestamp": time.time(),
        "evaluation_date_str": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "speaker_verification": speaker_results,
        "deepfake_diagnostics": deepfake_results,
    }

    # Save to disk
    out_file = os.path.join(RESULTS_DIR, "evaluation_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(master_results, f, indent=2)

    logger.info(f"Evaluation results successfully saved to: {out_file}")

    # Print Summary Report
    print("\n" + "="*70)
    print("                 FORENLYTICS EMPIRICAL BENCHMARK REPORT         ")
    print("="*70)
    print(f"Evaluation Date : {master_results['evaluation_date_str']}")
    print("-" * 70)
    print("1. SPEAKER VERIFICATION (6-DIMENSIONAL FUSION):")
    print(f"   • Composite Fused EER : {speaker_results['fused_composite']['eer_pct']}%  (AUC: {speaker_results['fused_composite']['auc']})")
    print(f"   • Optimal Threshold   : {speaker_results['fused_composite']['optimal_threshold']}%")
    print(f"   • Dimension Breakdown :")
    for d_k, d_v in speaker_results["dimensions"].items():
        print(f"     - {d_k:<18} : EER = {d_v['eer_pct']:>5.1f}% | AUC = {d_v['auc']:>5.3f}")
    print(f"   • Proposed Weights    : {speaker_results['calibrated_weights_proposed']}")

    print("-" * 70)
    print("2. DEEPFAKE & SPLICING DETECTION (4-SIGNAL SUITE):")
    print(f"   • Composite Anomaly EER: {deepfake_results['fused_composite']['eer_pct']}%  (AUC: {deepfake_results['fused_composite']['auc']})")
    print(f"   • Optimal Threshold    : {deepfake_results['fused_composite']['optimal_threshold']}%")
    print(f"   • Splice Recall (Cut)   : {deepfake_results['splice_localization_recall_pct']}%")
    print(f"   • Signal Breakdown     :")
    for s_k, s_v in deepfake_results["signals"].items():
        print(f"     - {s_k:<20} : EER = {s_v['eer_pct']:>5.1f}% | AUC = {s_v['auc']:>5.3f}")

    print("="*70 + "\n")


if __name__ == "__main__":
    main()
