import sys

try:
    from speechbrain.inference import SpeakerRecognition
except Exception:
    pass

for k in list(sys.modules.keys()):
    if "speechbrain.integrations" in k:
        del sys.modules[k]

import traceback
try:
    import main
    print("SUCCESS")
except Exception as e:
    print("CRASHED:")
    print(traceback.format_exc())
