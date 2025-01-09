export function getPageName(filePath) {
  const relativePath = filePath.split("/pages/")[1];
  return relativePath.replace(/\.[^/.]+$/, "");
}
