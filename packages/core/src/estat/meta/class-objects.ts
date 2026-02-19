import { arrify, textFrom } from "../../utils";
import type { ClassItem, ClassObj } from "./types";

export function extractClassObjects(metaInfo: any): ClassObj[] {
  const classObjs = arrify(metaInfo?.CLASS_INF?.CLASS_OBJ);
  return classObjs
    .map((classObj): ClassObj | null => {
      const id = textFrom(classObj?.["@id"]);
      if (!id) {
        return null;
      }

      const items = arrify(classObj?.CLASS)
        .map((item): ClassItem | null => {
          const code = textFrom(item?.["@code"]);
          if (!code) {
            return null;
          }
          return {
            code,
            name: textFrom(item?.["@name"])
          };
        })
        .filter((item): item is ClassItem => item !== null);

      return {
        id,
        name: textFrom(classObj?.["@name"]),
        items
      };
    })
    .filter((item): item is ClassObj => item !== null);
}
