export function replaceLoader({ code, loaderData }: { code: string; loaderData: object }) {
  const stringifiedData = JSON.stringify(loaderData);

  const out = (() => {
    if (!code.includes("__vxrn__loader__")) {
      return code + `\nexport const loader = () => (${stringifiedData})`;
    }
    return code.replace(
      /["']__vxrn__loader__['"]/,
      // make sure this ' ' is added in front,
      // minifiers will do `return"something"
      // but if its null then it becomes returnnull
      " " + stringifiedData.replace(/\$/g, "$$$$"),
    );
  })();

  return out;
}
