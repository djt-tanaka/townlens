export interface ClassItem {
  code: string;
  name: string;
}

export interface ClassObj {
  id: string;
  name: string;
  items: ClassItem[];
}

export interface AreaEntry {
  code: string;
  name: string;
}

export interface CityResolution {
  input: string;
  resolvedName: string;
  code: string;
}

export interface TimeSelection {
  classId: string;
  code: string;
  label: string;
}

export interface AgeSelection {
  classId: string;
  paramName: string;
  total: ClassItem;
  kids: ClassItem;
}

export interface DataValue {
  area?: string;
  time?: string;
  cats: Record<string, string>;
  value: number | null;
}
