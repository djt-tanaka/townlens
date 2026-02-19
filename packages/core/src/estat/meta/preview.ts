import type { ClassObj } from "./types";

export function formatSelectionPreview(classObjs: ClassObj[]): string {
  const previews = classObjs
    .filter((classObj) => classObj.id.startsWith("cat"))
    .slice(0, 5)
    .map((classObj) => {
      const sample = classObj.items.slice(0, 5).map((item) => `${item.code}:${item.name}`).join(" | ");
      return `${classObj.id}(${classObj.name}) => ${sample}`;
    });

  return previews.join("\n");
}
