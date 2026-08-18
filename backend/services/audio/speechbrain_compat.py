"""
SpeechBrain Compatibility Patch
===============================
Fixes a known bug in SpeechBrain 1.0 where LazyModule raises ImportError
instead of AttributeError on dunder attribute lookups (e.g. __file__),
which breaks inspect.getmodule() inside librosa/lazy_loader.
"""
import importlib

def patch_speechbrain():
    try:
        sbi = importlib.import_module("speechbrain.utils.importutils")
        if hasattr(sbi, "LazyModule"):
            orig_getattr = getattr(sbi.LazyModule, "__getattr__", None)
            if orig_getattr is not None:
                def safe_getattr(self, attr):
                    if attr.startswith("__"):
                        raise AttributeError(f"LazyModule has no attribute {attr}")
                    try:
                        return orig_getattr(self, attr)
                    except ImportError as e:
                        raise AttributeError(str(e))
                sbi.LazyModule.__getattr__ = safe_getattr
    except Exception:
        pass

patch_speechbrain()
