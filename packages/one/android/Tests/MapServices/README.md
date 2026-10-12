# map search contract control

Run `python3 packages/one/android/Tests/MapServices/search-contract.py` from this tree. The control compiles the full actual hybrid with cached Kotlin 2.2.0 and deterministic Android/Nitro boundary doubles. It requires existing Gradle compiler jars and downloads nothing.

`--ref 9d598ab9d13b95ac3ca7ebe3850e6fb85c7ca3a9` compiles the pre-correction hybrid: empty and null resolve, then the IOException rejection assertion fails. The corrected hybrid passes empty, null, IOException and invalid-query cases with one promise settlement in each. Saved JSON receipts record both source hashes and outcomes.

This is JVM behavior evidence for the approved catch correction. It does not exercise Android Handler scheduling, installed Geocoder providers, an APK, or native acceptance. Existing system runtime gates remain open.
