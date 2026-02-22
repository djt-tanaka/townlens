/**
 * 政令指定都市の区再編マッピング。
 *
 * 2024年1月1日施行の浜松市区再編に対応する。
 * e-Stat の国勢調査データ（人口）は新コードに更新済みだが、
 * 社会・人口統計体系（犯罪・教育・医療・交通）は旧コードのままの場合がある。
 *
 * このモジュールは新コード→旧コードの展開と、
 * 旧コードデータの新コードへの集約を提供する。
 *
 * @see https://www.city.hamamatsu.shizuoka.jp/ksh/imf/tkdk.html
 */

/** 旧区の情報 */
export interface OldWardEntry {
  /** 5桁エリアコード */
  readonly code: string;
  /** 旧区名 */
  readonly name: string;
  /** 令和2年国勢調査の人口（加重平均計算用） */
  readonly censusPopulation: number;
}

/** 区再編マッピングの1エントリ */
export interface WardReorganizationEntry {
  /** 新区の5桁エリアコード */
  readonly newCode: string;
  /** 新区名 */
  readonly newName: string;
  /** 構成元の旧区一覧 */
  readonly oldWards: ReadonlyArray<OldWardEntry>;
}

/**
 * 浜松市 区再編マッピング（2024年1月1日施行）
 *
 * 旧7区 → 新3区:
 *   中央区(22138) ← 中区(22131) + 東区(22132) + 西区(22133) + 南区(22134)
 *   浜名区(22139) ← 北区(22135) + 浜北区(22136)
 *   天竜区(22140) ← 天竜区(22137)
 *
 * 注: 北区の三方原地区は実際には中央区に編入されたが、
 * e-Stat のデータは旧区単位でしか取得できないため、
 * 北区(22135)全体を浜名区に割り当てる。
 */
const HAMAMATSU_REORGANIZATION: ReadonlyArray<WardReorganizationEntry> = [
  {
    newCode: "22138",
    newName: "浜松市中央区",
    oldWards: [
      { code: "22131", name: "中区", censusPopulation: 234839 },
      { code: "22132", name: "東区", censusPopulation: 131277 },
      { code: "22133", name: "西区", censusPopulation: 113455 },
      { code: "22134", name: "南区", censusPopulation: 100612 },
    ],
  },
  {
    newCode: "22139",
    newName: "浜松市浜名区",
    oldWards: [
      { code: "22135", name: "北区", censusPopulation: 92548 },
      { code: "22136", name: "浜北区", censusPopulation: 99960 },
    ],
  },
  {
    newCode: "22140",
    newName: "浜松市天竜区",
    oldWards: [
      { code: "22137", name: "天竜区", censusPopulation: 27632 },
    ],
  },
];

/** 全ての区再編マッピング（将来の再編にも対応可能） */
const ALL_REORGANIZATIONS: ReadonlyArray<WardReorganizationEntry> =
  HAMAMATSU_REORGANIZATION;

/** 新コード → 旧区一覧のインデックス */
const NEW_TO_OLD_MAP: ReadonlyMap<string, WardReorganizationEntry> = new Map(
  ALL_REORGANIZATIONS.map((entry) => [entry.newCode, entry]),
);

/** 旧コード → 新コードの逆引きインデックス */
const OLD_TO_NEW_MAP: ReadonlyMap<string, string> = new Map(
  ALL_REORGANIZATIONS.flatMap((entry) =>
    entry.oldWards.map((old) => [old.code, entry.newCode]),
  ),
);

/**
 * 新コードが区再編によるものかを判定する。
 */
export function isReorganizedCode(code: string): boolean {
  return NEW_TO_OLD_MAP.has(code.slice(0, 5));
}

/**
 * 旧コードが再編で廃止されたものかを判定する。
 */
export function isAbolishedCode(code: string): boolean {
  return OLD_TO_NEW_MAP.has(code.slice(0, 5));
}

/** エリアコード展開の結果 */
export interface CodeExpansion {
  /** 展開後のエリアコード（元のコード + 追加された旧コード） */
  readonly expandedCodes: ReadonlyArray<string>;
  /** 新コード → 旧コード一覧のマッピング（再編が適用されたコードのみ） */
  readonly newToOldMapping: ReadonlyMap<string, WardReorganizationEntry>;
}

/**
 * エリアコードを展開し、再編された新コードに対応する旧コードを追加する。
 *
 * 例: [22138, 22139, 22140, 13101]
 *   → [22138, 22139, 22140, 13101, 22131, 22132, 22133, 22134, 22135, 22136, 22137]
 *
 * 旧コードが既に含まれている場合は重複追加しない。
 */
export function expandAreaCodes(
  areaCodes: ReadonlyArray<string>,
): CodeExpansion {
  const codeSet = new Set(areaCodes);
  const expandedCodes = [...areaCodes];
  const newToOldMapping = new Map<string, WardReorganizationEntry>();

  for (const code of areaCodes) {
    const entry = NEW_TO_OLD_MAP.get(code.slice(0, 5));
    if (!entry) continue;

    newToOldMapping.set(code.slice(0, 5), entry);
    for (const old of entry.oldWards) {
      if (!codeSet.has(old.code)) {
        expandedCodes.push(old.code);
        codeSet.add(old.code);
      }
    }
  }

  return { expandedCodes, newToOldMapping };
}

/**
 * 旧コードの生データ（件数等）を新コードに集約する（合算）。
 *
 * 小学校数・病院数など、実数を合算すべき指標に使用する。
 * 集約結果は元の dataMap に新コードのエントリとして追加される。
 * 新コードのデータが既に存在する場合は上書きしない。
 */
export function aggregateRawValues(
  dataMap: Map<string, number | null>,
  mapping: ReadonlyMap<string, WardReorganizationEntry>,
): void {
  for (const [newCode, entry] of mapping) {
    // 新コードのデータが既にある場合はスキップ（APIが新コードに対応済み）
    if (dataMap.has(newCode)) continue;

    let sum = 0;
    let hasAny = false;
    for (const old of entry.oldWards) {
      const value = dataMap.get(old.code);
      if (value !== null && value !== undefined) {
        sum += value;
        hasAny = true;
      }
    }

    if (hasAny) {
      dataMap.set(newCode, sum);
    }
  }
}

/**
 * 旧コードの人口比率データ（千人当たり等）を新コードに集約する（人口加重平均）。
 *
 * 犯罪率など、既に人口比に変換済みの値を集約する場合に使用する。
 * 旧区の国勢調査人口で加重平均を取る。
 */
export function aggregatePerCapitaValues(
  dataMap: Map<string, number | null>,
  mapping: ReadonlyMap<string, WardReorganizationEntry>,
): void {
  for (const [newCode, entry] of mapping) {
    if (dataMap.has(newCode)) continue;

    let weightedSum = 0;
    let totalPopulation = 0;
    let hasAny = false;

    for (const old of entry.oldWards) {
      const value = dataMap.get(old.code);
      if (value !== null && value !== undefined) {
        weightedSum += value * old.censusPopulation;
        totalPopulation += old.censusPopulation;
        hasAny = true;
      }
    }

    if (hasAny && totalPopulation > 0) {
      dataMap.set(newCode, weightedSum / totalPopulation);
    }
  }
}

/**
 * 旧コードのブールデータを新コードに集約する（いずれかが true なら true）。
 */
export function aggregateBooleanValues(
  dataMap: Map<string, boolean>,
  mapping: ReadonlyMap<string, WardReorganizationEntry>,
): void {
  for (const [newCode, entry] of mapping) {
    if (dataMap.has(newCode)) continue;

    let result = false;
    let hasAny = false;

    for (const old of entry.oldWards) {
      const value = dataMap.get(old.code);
      if (value !== undefined) {
        result = result || value;
        hasAny = true;
      }
    }

    if (hasAny) {
      dataMap.set(newCode, result);
    }
  }
}

/**
 * 展開された populationMap を作成する。
 * 旧コードの人口情報（国勢調査データ）を追加する。
 */
export function expandPopulationMap(
  populationMap: ReadonlyMap<string, number>,
  mapping: ReadonlyMap<string, WardReorganizationEntry>,
): Map<string, number> {
  const expanded = new Map(populationMap);
  for (const entry of mapping.values()) {
    for (const old of entry.oldWards) {
      if (!expanded.has(old.code)) {
        expanded.set(old.code, old.censusPopulation);
      }
    }
  }
  return expanded;
}
