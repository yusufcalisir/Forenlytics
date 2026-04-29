import traceback
try:
    import main
except Exception as e:
    print("CRASHED:")
    print(traceback.format_exc())
