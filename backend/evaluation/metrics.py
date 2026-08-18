"""
Forensic Evaluation Metrics
============================
Computes Equal Error Rate (EER), ROC/AUC, Detection Error Tradeoff (DET),
False Acceptance Rate (FAR), and False Rejection Rate (FRR).
"""

import numpy as np
from typing import Dict, Any, List, Tuple, Optional


def compute_roc_auc(scores: np.ndarray, labels: np.ndarray) -> float:
    """
    Compute Area Under the ROC Curve (AUC) using trapezoidal rule.
    labels: 1 for positive class (e.g. genuine match / synthetic), 0 for negative.
    scores: higher score indicates higher likelihood of positive class.
    """
    pos_mask = (labels == 1)
    neg_mask = (labels == 0)
    n_pos = np.sum(pos_mask)
    n_neg = np.sum(neg_mask)

    if n_pos == 0 or n_neg == 0:
        return 0.5

    # Rank-sum calculation (Mann-Whitney U statistic)
    ranks = np.argsort(np.argsort(scores))
    pos_rank_sum = np.sum(ranks[pos_mask])
    u = pos_rank_sum - (n_pos * (n_pos - 1)) / 2.0
    auc = float(u / (n_pos * n_neg))
    return round(auc, 4)


def compute_eer(
    scores: np.ndarray,
    labels: np.ndarray,
    n_thresholds: int = 1000
) -> Tuple[float, float, List[Dict[str, float]]]:
    """
    Compute Equal Error Rate (EER) where FAR == FRR.
    Returns:
        eer (float): Equal error rate percentage (e.g. 4.2%).
        optimal_threshold (float): Score threshold at the EER crossover.
        curve_data (list): List of points [{threshold, far, frr, accuracy}].
    """
    pos_scores = scores[labels == 1]
    neg_scores = scores[labels == 0]

    if len(pos_scores) == 0 or len(neg_scores) == 0:
        return 50.0, 50.0, []

    min_s = float(np.min(scores))
    max_s = float(np.max(scores))
    thresholds = np.linspace(min_s, max_s, n_thresholds)

    far_list = []
    frr_list = []
    curve_data = []

    for t in thresholds:
        # For genuine / synthetic (labels=1): FRR = fraction with score < threshold
        frr = float(np.mean(pos_scores < t))
        # For impostor / bona-fide (labels=0): FAR = fraction with score >= threshold
        far = float(np.mean(neg_scores >= t))

        far_list.append(far)
        frr_list.append(frr)

        # Accuracy
        acc = float((np.sum(pos_scores >= t) + np.sum(neg_scores < t)) / len(labels))

        curve_data.append({
            "threshold": round(float(t), 2),
            "far": round(far * 100.0, 2),
            "frr": round(frr * 100.0, 2),
            "accuracy": round(acc * 100.0, 2),
        })

    far_arr = np.array(far_list)
    frr_arr = np.array(frr_list)

    # Find crossover point where abs(FAR - FRR) is minimized
    diff = np.abs(far_arr - frr_arr)
    idx = int(np.argmin(diff))

    eer = float((far_arr[idx] + frr_arr[idx]) / 2.0 * 100.0)
    optimal_threshold = float(thresholds[idx])

    return round(eer, 2), round(optimal_threshold, 2), curve_data


def compute_operating_points(
    scores: np.ndarray,
    labels: np.ndarray,
    target_fars: Tuple[float, ...] = (0.001, 0.01, 0.05)
) -> Dict[str, Dict[str, float]]:
    """
    Compute operational decision thresholds for forensic use at target False Alarm Rates
    (e.g., FAR <= 0.1%, FAR <= 1%, FAR <= 5%).
    """
    pos_scores = scores[labels == 1]
    neg_scores = scores[labels == 0]

    operating_points = {}

    for target_far in target_fars:
        # Threshold at which neg_scores >= threshold is at most target_far
        if len(neg_scores) == 0:
            continue

        # Sort neg_scores descending
        sorted_neg = np.sort(neg_scores)
        cutoff_idx = int((1.0 - target_far) * len(sorted_neg))
        cutoff_idx = min(cutoff_idx, len(sorted_neg) - 1)
        thresh = float(sorted_neg[cutoff_idx])

        actual_far = float(np.mean(neg_scores >= thresh) * 100.0)
        actual_frr = float(np.mean(pos_scores < thresh) * 100.0) if len(pos_scores) > 0 else 100.0

        label_key = f"FAR_{int(target_far*1000)}bps" if target_far < 0.01 else f"FAR_{int(target_far*100)}pct"
        operating_points[label_key] = {
            "threshold": round(thresh, 2),
            "target_far_pct": round(target_far * 100.0, 2),
            "actual_far_pct": round(actual_far, 2),
            "actual_frr_pct": round(actual_frr, 2),
        }

    return operating_points


def evaluate_feature_matrix(
    scores_dict: Dict[str, List[float]],
    labels: List[int]
) -> Dict[str, Any]:
    """
    Evaluates each dimension / signal independently and returns a comprehensive report.
    """
    labels_arr = np.array(labels, dtype=int)
    results = {}

    for name, s_list in scores_dict.items():
        s_arr = np.array([s if s is not None else 0.0 for s in s_list], dtype=float)
        auc = compute_roc_auc(s_arr, labels_arr)
        eer, opt_t, curve = compute_eer(s_arr, labels_arr)
        op_points = compute_operating_points(s_arr, labels_arr)

        results[name] = {
            "dimension": name,
            "eer_pct": eer,
            "auc": auc,
            "optimal_threshold": opt_t,
            "operating_points": op_points,
            "mean_positive_score": round(float(np.mean(s_arr[labels_arr == 1])), 2) if np.sum(labels_arr == 1) > 0 else 0.0,
            "mean_negative_score": round(float(np.mean(s_arr[labels_arr == 0])), 2) if np.sum(labels_arr == 0) > 0 else 0.0,
        }

    return results
