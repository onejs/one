// https://github.com/wooorm/xdm#syntax-highlighting-with-the-meta-field

import visit from "unist-util-visit";

const re = /\b([-\w]+)(?:=(?:"([^"]*)"|'([^']*)'|([^"'\s]+)))?/g;

export default (options = {}) => {
  return (tree) => {
    visit(tree, "element", onelement);
  };

  function onelement(node) {
    let match;
    if (node.tagName === "code" && node.data && node.data.meta) {
      re.lastIndex = 0; // Reset regex.

      while ((match = re.exec(node.data.meta))) {
        const key = match[1];
        const value = match[2] || match[3] || match[4] || "";

        // Merge class/className into existing className array to avoid duplicate key warning
        if (key === "class" || key === "className") {
          node.properties.className = [...(node.properties.className || []), value];
        } else {
          node.properties[key] = value;
        }
      }
    }
  }
};
