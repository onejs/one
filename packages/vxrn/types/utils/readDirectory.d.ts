/**
 * `readDirectory()` reads a directory's files and optionally filters for asset files.
 *
 * @param {string} dirPath - The path of the directory to read.
 * @param {boolean} onlyAssets - Optional. If `true`, returns only assets. Default is `false`.
 *
 * @returns {Promise<string[]>} - Promise resolving to an array of file paths.
 */
declare const readDirectory: (dirPath: string, onlyAssets?: boolean) => Promise<string[]>;
export default readDirectory;
//# sourceMappingURL=readDirectory.d.ts.map