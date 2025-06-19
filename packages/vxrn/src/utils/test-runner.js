const FSExtra = require('fs-extra');
const { join, resolve } = require('node:path');
const {
  applyDependencyPatches,
  applyBuiltInPatches,
  _isAlreadyPatchedMap,
  pathsBeingPatched,
  // @ts-ignore
} = require('./patches'); // Adjust path as necessary, assuming patches.ts is compiled to patches.js

const MOCK_NODE_MODULES_PATH = resolve(__dirname, 'test-fixtures', 'mock-node_modules');
const TEST_MODULE_PATH = join(MOCK_NODE_MODULES_PATH, 'patching-test');
const TEST_FILE_PATH = join(TEST_MODULE_PATH, 'testfile.js');
const OG_TEST_FILE_PATH = TEST_FILE_PATH + '.vxrn.ogfile';

// --- Helper Functions ---

async function setupTestEnvironment() {
  // Reset global state
  _isAlreadyPatchedMap.clear();
  pathsBeingPatched.clear();

  // Ensure mock-node_modules and patching-test directory exist
  await FSExtra.ensureDir(TEST_MODULE_PATH);

  // Recreate testfile.js
  await FSExtra.writeFile(TEST_FILE_PATH, '// orig');

  // Delete ogfile if it exists
  if (await FSExtra.exists(OG_TEST_FILE_PATH)) {
    await FSExtra.remove(OG_TEST_FILE_PATH);
  }

  // Unset VXRN_FORCE_PATCH
  delete process.env.VXRN_FORCE_PATCH;
}

async function readFileContent(filePath) {
  if (await FSExtra.exists(filePath)) {
    return FSExtra.readFile(filePath, 'utf-8');
  }
  return null;
}

function setForcePatchEnv(value) {
  if (value) {
    process.env.VXRN_FORCE_PATCH = 'true';
  } else {
    delete process.env.VXRN_FORCE_PATCH;
  }
}

async function runAssertions(testName, expectedContent, expectedOgContent, expectedPatchedMapSize, expectedPathsBeingPatchedSize) {
  const fileContent = await readFileContent(TEST_FILE_PATH);
  const ogFileContent = await readFileContent(OG_TEST_FILE_PATH);

  if (fileContent !== expectedContent) {
    console.error(`[${testName}] TestFile Content FAIL: Expected "${expectedContent}", got "${fileContent}"`);
  } else {
    console.log(`[${testName}] TestFile Content PASS`);
  }

  if (ogFileContent !== expectedOgContent) {
    console.error(`[${testName}] OgFile Content FAIL: Expected "${expectedOgContent}", got "${ogFileContent}"`);
  } else {
    console.log(`[${testName}] OgFile Content PASS`);
  }

  if (_isAlreadyPatchedMap.size !== expectedPatchedMapSize) {
    console.error(`[${testName}] _isAlreadyPatchedMap Size FAIL: Expected ${expectedPatchedMapSize}, got ${_isAlreadyPatchedMap.size}`);
  } else {
    console.log(`[${testName}] _isAlreadyPatchedMap Size PASS`);
  }

  if (pathsBeingPatched.size !== expectedPathsBeingPatchedSize) {
    console.error(`[${testName}] pathsBeingPatched Size FAIL: Expected ${expectedPathsBeingPatchedSize}, got ${pathsBeingPatched.size}`);
  } else {
    console.log(`[${testName}] pathsBeingPatched Size PASS`);
  }
}

// --- Test Cases ---

async function testScenario1_TwoRulesSameFile() {
  const testName = 'Scenario 1: Two patching rules for the same file';
  console.log(`\n--- Running ${testName} ---`);
  await setupTestEnvironment();

  const patches = [
    {
      module: 'patching-test',
      patchFiles: {
        'testfile.js': (contents) => contents + '\n// patch 1',
      },
    },
    {
      module: 'patching-test',
      patchFiles: {
        'testfile.js': (contents) => contents + '\n// patch 2',
      },
    },
  ];

  console.log('Applying patches first time...');
  await applyDependencyPatches(patches, { nodeModulesPath: MOCK_NODE_MODULES_PATH });
  await runAssertions(testName + " - First Run", '// orig\n// patch 1\n// patch 2', '// orig', 1, 1);

  console.log('Applying patches second time (should skip)...');
  const mapSizeBefore = _isAlreadyPatchedMap.size;
  const setSizeBefore = pathsBeingPatched.size;
  pathsBeingPatched.clear(); // clear for this run as it's per-run
  await applyDependencyPatches(patches, { nodeModulesPath: MOCK_NODE_MODULES_PATH });
  await runAssertions(testName + " - Second Run (Skipped)", '// orig\n// patch 1\n// patch 2', '// orig', mapSizeBefore, setSizeBefore -1); // pathsBeingPatched should remain 0 as nothing new is patched

  console.log('Applying patches with VXRN_FORCE_PATCH...');
  setForcePatchEnv(true);
  pathsBeingPatched.clear(); // clear for this run
  _isAlreadyPatchedMap.clear(); // clear this to simulate fresh check
  await applyDependencyPatches(patches, { nodeModulesPath: MOCK_NODE_MODULES_PATH });
  await runAssertions(testName + " - Force Patch", '// orig\n// patch 1\n// patch 2', '// orig', 1, 1);
  setForcePatchEnv(false);

  console.log(`--- ${testName} Complete ---`);
}

async function testScenario2_MergeExtraPatches() {
  const testName = 'Scenario 2: Merging extraPatches';
  console.log(`\n--- Running ${testName} ---`);
  await setupTestEnvironment();

  const builtInPatches = [
    {
      module: 'patching-test',
      patchFiles: {
        'testfile.js': '// built-in patch',
        'version': '1.0.0', // ensure version check is handled if present
      },
    },
  ];

  const extraPatches = {
    'patching-test': {
      'testfile.js': '// extra patch', // This should overwrite the built-in one
      'anotherfile.js': '// new file patch by extra', // This should be added
       optimize: 'exclude',
    },
  };

  const options = { root: process.cwd(), तम: {} }; // Mock options as needed by applyBuiltInPatches

  console.log('Applying built-in and extra patches...');
  // @ts-ignore
  await applyBuiltInPatches(options, extraPatches, builtInPatches);
  // Note: applyBuiltInPatches internally calls applyDependencyPatches.
  // We need to assert the final state of testfile.js
  // And potentially anotherfile.js if we were to create it. For now, focus on testfile.js
  // The current applyBuiltInPatches structure merges patchFiles objects.
  // If a file key is the same, the extraPatch one should win.
  await runAssertions(testName + " - First Run", '// extra patch', '// orig', 1, 1);


  console.log('Applying patches second time (should skip)...');
  const mapSizeBefore = _isAlreadyPatchedMap.size;
  pathsBeingPatched.clear();
  // @ts-ignore
  await applyBuiltInPatches(options, extraPatches, builtInPatches);
  await runAssertions(testName + " - Second Run (Skipped)", '// extra patch', '// orig', mapSizeBefore, 0);


  console.log('Applying patches with VXRN_FORCE_PATCH...');
  setForcePatchEnv(true);
  pathsBeingPatched.clear();
  _isAlreadyPatchedMap.clear();
  // @ts-ignore
  await applyBuiltInPatches(options, extraPatches, builtInPatches);
  await runAssertions(testName + " - Force Patch", '// extra patch', '// orig', 1, 1);
  setForcePatchEnv(false);

  console.log(`--- ${testName} Complete ---`);
}


async function testScenario3_MultipleApplyDependencyPatches() {
  const testName = 'Scenario 3: Calling applyDependencyPatches multiple times with different inputs';
  console.log(`\n--- Running ${testName} ---`);
  await setupTestEnvironment();

  const patches1 = [
    {
      module: 'patching-test',
      patchFiles: { 'testfile.js': (contents) => contents + '\n// first apply' },
    },
  ];
  const patches2 = [
    {
      module: 'patching-test',
      patchFiles: { 'testfile.js': (contents) => contents + '\n// second apply (should be from og)' },
    },
  ];

  console.log('Applying patches1 first time...');
  await applyDependencyPatches(patches1, { nodeModulesPath: MOCK_NODE_MODULES_PATH });
  await runAssertions(testName + " - Patches1 First Run", '// orig\n// first apply', '// orig', 1, 1);

  // Reset pathsBeingPatched for the next distinct call, but _isAlreadyPatchedMap should persist for `testfile.js`
  pathsBeingPatched.clear();
  // _isAlreadyPatchedMap.clear(); // DO NOT CLEAR THIS, to simulate separate calls where previous patching is known

  console.log('Applying patches2 (should apply to original because testfile.js is already considered patched by patches1 run, then force patch will use OG)');
  // This scenario is tricky. If applyDependencyPatches is called with *different* patch rules for the *same file*
  // that was already patched in a *previous* call (even in the same overall script run),
  // the current logic will skip it because `getIsAlreadyPatched(fullPath)` will be true.
  // The `ogfile` will be from the *first* patch application.
  // If we want the second set of patches to apply to the *original*, we need VXRN_FORCE_PATCH.

  await applyDependencyPatches(patches2, { nodeModulesPath: MOCK_NODE_MODULES_PATH });
  // It will skip because testfile.js is already patched by patches1
  await runAssertions(testName + " - Patches2 Second Run (Skipped due to prior patch)", '// orig\n// first apply', '// orig', 1, 0);


  console.log('Applying patches2 with VXRN_FORCE_PATCH (should apply to original)...');
  setForcePatchEnv(true);
  pathsBeingPatched.clear();
  // _isAlreadyPatchedMap.clear(); // Clear to ensure it re-evaluates, or keep to test if force overrides existing map entry
  // Let's keep _isAlreadyPatchedMap to see if VXRN_FORCE_PATCH bypasses its check, it should.
  // The key is that it should read from OG file.
  await applyDependencyPatches(patches2, { nodeModulesPath: MOCK_NODE_MODULES_PATH });
  // Since patches2 is a function (contents) => contents + ..., and it reads from ogfile.
  await runAssertions(testName + " - Patches2 Force Patch", '// orig\n// second apply (should be from og)', '// orig', 1, 1);
  setForcePatchEnv(false);

  console.log(`--- ${testName} Complete ---`);
}


async function main() {
  await testScenario1_TwoRulesSameFile();
  await testScenario2_MergeExtraPatches();
  await testScenario3_MultipleApplyDependencyPatches();
  console.log("\nAll tests complete. Check console output for PASS/FAIL.");
}

main().catch(console.error);
