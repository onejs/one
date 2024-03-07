import klaw from 'klaw'
import { extname } from 'path'
import { SCALABLE_ASSETS } from './assets'

/**
 * `readDirectory()` reads a directory's files and optionally filters for asset files.
 *
 * @param {string} dirPath - The path of the directory to read.
 * @param {boolean} onlyAssets - Optional. If `true`, returns only assets. Default is `false`.
 *
 * @returns {Promise<string[]>} - Promise resolving to an array of file paths.
 */
const readDirectory = (
  dirPath: string,
  onlyAssets: boolean = false
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const allFiles: string[] = []

    klaw(dirPath)
      .on('data', ({ path, stats }) => {
        if (!stats.isDirectory()) {
          allFiles.push(path)
        }
      })
      .on('end', () => {
        resolve(
          allFiles.filter((fileName: string) => {
            if (onlyAssets) {
              return new RegExp(`\\.(${SCALABLE_ASSETS.join('|')})$`).test(
                extname(fileName)
              )
            }

            return true
          })
        )
      })
      .on('error', () => reject(allFiles))
  })
}

export default readDirectory
