import time
from services.audio import speechbrain_compat
from evaluation.dataset_loader import dataset_loader
from services.audio.facade import audio_facade

print("Preparing test pairs...")
pairs = dataset_loader.prepare_speaker_verification_pairs(n_pairs=3)

for i in range(3):
    print(f"\n{'='*20} RUNNING COMPARISON {i+1}/3 ({pairs[i]['pair_type'].upper()}) {'='*20}")
    t0 = time.time()
    res = audio_facade.analyze_pair(pairs[i]["file1_bytes"], pairs[i]["file2_bytes"])
    elapsed = time.time() - t0
    print(f"Elapsed Time: {elapsed:.2f}s")
    print(f"Overall Similarity: {res['similarity_score']}% | Verdict: {res['verdict']} [{res.get('confidence_level', 'N/A')}]")
    print("Dimension Scores:")
    for k, v in res["dimension_scores"].items():
        print(f"  - {k:<18}: {v}")
