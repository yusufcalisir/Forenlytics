import sys
from types import ModuleType
sys.modules['speechbrain.integrations.k2_fsa'] = ModuleType('speechbrain.integrations.k2_fsa')
import traceback
try:
    import main
    print("SUCCESS")
except Exception as e:
    print("CRASHED:")
    print(traceback.format_exc())
