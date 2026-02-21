import { describe, it, expect } from "vitest";
import {
  extractClassObjects,
  resolveAreaClass,
  buildAreaEntries,
  resolveCities,
  isMunicipalityCode,
  resolveLatestTime,
  resolveAgeSelection,
  extractDataValues,
  valuesByArea,
  resolveDefaultFilters,
} from "../../src/estat/meta";
import { AppError } from "../../src/errors";

// テスト用フィクスチャ
const areaClassObj = {
  "@id": "area",
  "@name": "地域事項",
  CLASS: [
    { "@code": "13104", "@name": "新宿区" },
    { "@code": "13113", "@name": "渋谷区" },
    { "@code": "13110", "@name": "目黒区" },
    { "@code": "14100", "@name": "横浜市" },
  ],
};

const timeClassObj = {
  "@id": "time",
  "@name": "時間軸（年次）",
  CLASS: [
    { "@code": "2020000000", "@name": "2020年" },
    { "@code": "2015000000", "@name": "2015年" },
    { "@code": "2010000000", "@name": "2010年" },
  ],
};

const ageClassObj = {
  "@id": "cat01",
  "@name": "年齢５歳階級分類",
  CLASS: [
    { "@code": "000", "@name": "総数" },
    { "@code": "001", "@name": "0～14歳" },
    { "@code": "002", "@name": "15～64歳" },
    { "@code": "003", "@name": "65歳以上" },
  ],
};

const sampleMetaInfo = {
  CLASS_INF: {
    CLASS_OBJ: [areaClassObj, timeClassObj, ageClassObj],
  },
};

describe("extractClassObjects", () => {
  it("メタ情報から分類オブジェクトを抽出する", () => {
    const result = extractClassObjects(sampleMetaInfo);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("area");
    expect(result[0].name).toBe("地域事項");
    expect(result[0].items).toHaveLength(4);
    expect(result[0].items[0]).toEqual({ code: "13104", name: "新宿区" });
  });

  it("CLASS_OBJが単一オブジェクトでも配列として扱う", () => {
    const meta = {
      CLASS_INF: { CLASS_OBJ: areaClassObj },
    };
    const result = extractClassObjects(meta);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("area");
  });

  it("空のメタ情報は空配列を返す", () => {
    expect(extractClassObjects({})).toEqual([]);
    expect(extractClassObjects(null)).toEqual([]);
    expect(extractClassObjects(undefined)).toEqual([]);
  });

  it("IDのないCLASS_OBJは除外する", () => {
    const meta = {
      CLASS_INF: {
        CLASS_OBJ: [
          { "@name": "名前のみ", CLASS: [] },
          areaClassObj,
        ],
      },
    };
    const result = extractClassObjects(meta);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("area");
  });
});

describe("resolveAreaClass", () => {
  it("地域事項の分類を選択する", () => {
    const classObjs = extractClassObjects(sampleMetaInfo);
    const result = resolveAreaClass(classObjs);
    expect(result.id).toBe("area");
    expect(result.name).toBe("地域事項");
  });

  it("地域事項がなければエラーを投げる", () => {
    const classObjs = extractClassObjects({
      CLASS_INF: { CLASS_OBJ: [timeClassObj, ageClassObj] },
    });
    expect(() => resolveAreaClass(classObjs)).toThrow(AppError);
  });
});

describe("buildAreaEntries", () => {
  it("分類オブジェクトからエリアエントリを構築する", () => {
    const classObjs = extractClassObjects(sampleMetaInfo);
    const areaClass = resolveAreaClass(classObjs);
    const entries = buildAreaEntries(areaClass);
    expect(entries).toHaveLength(4);
    expect(entries[0]).toEqual({ code: "13104", name: "新宿区" });
  });
});

describe("isMunicipalityCode", () => {
  it("市区町村コードはtrueを返す", () => {
    expect(isMunicipalityCode("13104")).toBe(true); // 新宿区
    expect(isMunicipalityCode("14100")).toBe(true); // 横浜市
    expect(isMunicipalityCode("14101")).toBe(true); // 横浜市鶴見区
    expect(isMunicipalityCode("01100")).toBe(true); // 札幌市
    expect(isMunicipalityCode("22137")).toBe(true); // 浜松市東区
  });

  it("都道府県コード（3〜5桁目が000）はfalseを返す", () => {
    expect(isMunicipalityCode("01000")).toBe(false); // 北海道
    expect(isMunicipalityCode("13000")).toBe(false); // 東京都
    expect(isMunicipalityCode("25000")).toBe(false); // 滋賀県
    expect(isMunicipalityCode("47000")).toBe(false); // 沖縄県
  });

  it("6桁チェックディジット付き都道府県コードはfalseを返す", () => {
    expect(isMunicipalityCode("010006")).toBe(false); // 北海道
    expect(isMunicipalityCode("130001")).toBe(false); // 東京都
    expect(isMunicipalityCode("250007")).toBe(false); // 滋賀県
    expect(isMunicipalityCode("470007")).toBe(false); // 沖縄県
    expect(isMunicipalityCode("230006")).toBe(false); // 愛知県
  });

  it("6桁チェックディジット付き市区町村コードはtrueを返す", () => {
    expect(isMunicipalityCode("131041")).toBe(true); // 新宿区
    expect(isMunicipalityCode("141003")).toBe(true); // 横浜市
    expect(isMunicipalityCode("011002")).toBe(true); // 札幌市
  });

  it("全国コードはfalseを返す", () => {
    expect(isMunicipalityCode("00000")).toBe(false);
    expect(isMunicipalityCode("000006")).toBe(false); // 6桁版
  });

  it("5桁未満のコードはfalseを返す", () => {
    expect(isMunicipalityCode("0000")).toBe(false);
    expect(isMunicipalityCode("13")).toBe(false);
    expect(isMunicipalityCode("")).toBe(false);
  });
});

describe("resolveCities", () => {
  const entries = [
    { code: "13104", name: "新宿区" },
    { code: "13113", name: "渋谷区" },
    { code: "13110", name: "目黒区" },
    { code: "14100", name: "横浜市" },
  ];

  it("完全一致で解決する", () => {
    const result = resolveCities(["新宿区"], entries);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      input: "新宿区",
      resolvedName: "新宿区",
      code: "13104",
    });
  });

  it("複数都市を同時に解決する", () => {
    const result = resolveCities(["新宿区", "渋谷区", "目黒区"], entries);
    expect(result).toHaveLength(3);
    expect(result[0].code).toBe("13104");
    expect(result[1].code).toBe("13113");
    expect(result[2].code).toBe("13110");
  });

  it("都道府県プレフィックスを除去して一致させる", () => {
    const result = resolveCities(["東京都新宿区"], entries);
    expect(result).toHaveLength(1);
    expect(result[0].resolvedName).toBe("新宿区");
  });

  it("存在しない都市はエラーを投げる", () => {
    expect(() => resolveCities(["存在しない市"], entries)).toThrow(AppError);
  });

  it("ひらがな入力で解決する（読み仮名一致）", () => {
    const result = resolveCities(["しんじゅくく"], entries);
    expect(result).toHaveLength(1);
    expect(result[0].resolvedName).toBe("新宿区");
    expect(result[0].code).toBe("13104");
  });

  it("カタカナ入力で解決する（カナ正規化→読み仮名一致）", () => {
    const result = resolveCities(["シンジュクク"], entries);
    expect(result).toHaveLength(1);
    expect(result[0].resolvedName).toBe("新宿区");
    expect(result[0].code).toBe("13104");
  });

  it("ひらがな入力で複数都市を解決する", () => {
    const result = resolveCities(["しぶやく", "めぐろく"], entries);
    expect(result).toHaveLength(2);
    expect(result[0].resolvedName).toBe("渋谷区");
    expect(result[1].resolvedName).toBe("目黒区");
  });

  it("カタカナ入力で横浜市を解決する", () => {
    const result = resolveCities(["ヨコハマシ"], entries);
    expect(result).toHaveLength(1);
    expect(result[0].resolvedName).toBe("横浜市");
    expect(result[0].code).toBe("14100");
  });
});

describe("resolveLatestTime", () => {
  const classObjs = extractClassObjects(sampleMetaInfo);

  it("最新の時点を自動選択する", () => {
    const result = resolveLatestTime(classObjs);
    expect(result.code).toBe("2020000000");
    expect(result.label).toBe("2020年");
  });

  it("明示コードを指定すると使用する", () => {
    const result = resolveLatestTime(classObjs, "2015000000");
    expect(result.code).toBe("2015000000");
    expect(result.label).toBe("2015年");
  });

  it("存在しないコードはエラー", () => {
    expect(() => resolveLatestTime(classObjs, "9999999999")).toThrow(AppError);
  });

  it("時間軸がないメタ情報はエラー", () => {
    const noTimeClassObjs = extractClassObjects({
      CLASS_INF: { CLASS_OBJ: [areaClassObj, ageClassObj] },
    });
    expect(() => resolveLatestTime(noTimeClassObjs)).toThrow(AppError);
  });
});

describe("resolveAgeSelection", () => {
  const classObjs = extractClassObjects(sampleMetaInfo);

  it("総数と0-14歳を自動検出する", () => {
    const result = resolveAgeSelection(classObjs);
    expect(result.classId).toBe("cat01");
    expect(result.paramName).toBe("cdCat01");
    expect(result.total.name).toBe("総数");
    expect(result.kids.name).toBe("0～14歳");
  });

  it("手動overrideでclassIdを指定できる", () => {
    const result = resolveAgeSelection(classObjs, { classId: "cat01" });
    expect(result.classId).toBe("cat01");
  });

  it("手動overrideでtotalCodeとkidsCodeを指定できる", () => {
    const result = resolveAgeSelection(classObjs, {
      classId: "cat01",
      totalCode: "000",
      kidsCode: "001",
    });
    expect(result.total.code).toBe("000");
    expect(result.kids.code).toBe("001");
  });

  it("年齢分類がない場合はエラー", () => {
    const noAgeClassObjs = extractClassObjects({
      CLASS_INF: { CLASS_OBJ: [areaClassObj, timeClassObj] },
    });
    expect(() => resolveAgeSelection(noAgeClassObjs)).toThrow(AppError);
  });

  it("年齢分類が検出不能な場合のエラーに診断情報が含まれる", () => {
    const industrialMeta = {
      CLASS_INF: {
        CLASS_OBJ: [
          areaClassObj,
          timeClassObj,
          {
            "@id": "cat01",
            "@name": "産業分類",
            CLASS: [
              { "@code": "A", "@name": "農業" },
              { "@code": "B", "@name": "漁業" },
            ],
          },
        ],
      },
    };
    const classObjs = extractClassObjects(industrialMeta);
    try {
      resolveAgeSelection(classObjs);
      expect.fail("エラーが投げられるべき");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const cliError = error as AppError;
      // 診断情報に inspect コマンド案内と推奨IDが含まれる
      expect(cliError.hints.some((h: string) => h.includes("inspect"))).toBe(true);
      expect(cliError.hints.some((h: string) => h.includes("0003448299"))).toBe(true);
      // 候補分類の診断に「総数×」「0-14歳×」が含まれる
      expect(cliError.hints[0]).toContain("×");
    }
  });
});

describe("extractDataValues", () => {
  it("APIレスポンスからデータ値を抽出する", () => {
    const data = {
      GET_STATS_DATA: {
        STATISTICAL_DATA: {
          DATA_INF: {
            VALUE: [
              { "@area": "13104", "@time": "2020000000", "@cat01": "000", $: "346235" },
              { "@area": "13104", "@time": "2020000000", "@cat01": "001", $: "32451" },
            ],
          },
        },
      },
    };
    const result = extractDataValues(data);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      area: "13104",
      time: "2020000000",
      cats: { cat01: "000" },
      value: 346235,
    });
  });

  it("空データは空配列を返す", () => {
    expect(extractDataValues({})).toEqual([]);
    expect(extractDataValues(null)).toEqual([]);
  });

  it('値が "-" の場合は null になる', () => {
    const data = {
      GET_STATS_DATA: {
        STATISTICAL_DATA: {
          DATA_INF: {
            VALUE: [{ "@area": "13104", "@time": "2020000000", $: "-" }],
          },
        },
      },
    };
    const result = extractDataValues(data);
    expect(result[0].value).toBeNull();
  });
});

describe("valuesByArea", () => {
  it("時間コードでフィルタしてエリア別マップを作る", () => {
    const values = [
      { area: "13104", time: "2020000000", cats: {}, value: 100 },
      { area: "13113", time: "2020000000", cats: {}, value: 200 },
      { area: "13104", time: "2015000000", cats: {}, value: 90 },
    ];
    const map = valuesByArea(values, "2020000000");
    expect(map.size).toBe(2);
    expect(map.get("13104")).toBe(100);
    expect(map.get("13113")).toBe(200);
  });

  it("areaがないデータは除外する", () => {
    const values = [
      { area: undefined, time: "2020000000", cats: {}, value: 100 },
    ];
    const map = valuesByArea(values, "2020000000");
    expect(map.size).toBe(0);
  });

  it("値がnullのデータは除外する", () => {
    const values = [
      { area: "13104", time: "2020000000", cats: {}, value: null },
    ];
    const map = valuesByArea(values, "2020000000");
    expect(map.size).toBe(0);
  });

  it("同一areaの重複値がある場合は最初の値を保持する", () => {
    const values = [
      { area: "13104", time: "2020000000", cats: { cat02: "000" }, value: 346235 },
      { area: "13104", time: "2020000000", cats: { cat02: "001" }, value: 170000 },
      { area: "13104", time: "2020000000", cats: { cat02: "002" }, value: 176235 },
    ];
    const map = valuesByArea(values, "2020000000");
    expect(map.size).toBe(1);
    expect(map.get("13104")).toBe(346235);
  });
});

describe("resolveDefaultFilters", () => {
  it("ageSelection以外のcat分類の「総数」コードを検出する", () => {
    const classObjs = extractClassObjects({
      CLASS_INF: {
        CLASS_OBJ: [
          areaClassObj,
          timeClassObj,
          ageClassObj,
          {
            "@id": "cat02",
            "@name": "男女",
            CLASS: [
              { "@code": "000", "@name": "総数" },
              { "@code": "001", "@name": "男" },
              { "@code": "002", "@name": "女" },
            ],
          },
        ],
      },
    });

    const filters = resolveDefaultFilters(classObjs, new Set(["area", "time", "cat01"]));
    expect(filters).toHaveLength(1);
    expect(filters[0]).toEqual({ paramName: "cdCat02", code: "000" });
  });

  it("tab分類の「実数」を検出する", () => {
    const classObjs = extractClassObjects({
      CLASS_INF: {
        CLASS_OBJ: [
          areaClassObj,
          timeClassObj,
          ageClassObj,
          {
            "@id": "tab",
            "@name": "表章項目",
            CLASS: [
              { "@code": "010", "@name": "実数" },
              { "@code": "020", "@name": "構成比" },
            ],
          },
        ],
      },
    });

    const filters = resolveDefaultFilters(classObjs, new Set(["area", "time", "cat01"]));
    expect(filters).toHaveLength(1);
    expect(filters[0]).toEqual({ paramName: "cdTab", code: "010" });
  });

  it("cat02とtabの両方を同時に検出する", () => {
    const classObjs = extractClassObjects({
      CLASS_INF: {
        CLASS_OBJ: [
          areaClassObj,
          timeClassObj,
          ageClassObj,
          {
            "@id": "cat02",
            "@name": "男女",
            CLASS: [
              { "@code": "000", "@name": "総数" },
              { "@code": "001", "@name": "男" },
            ],
          },
          {
            "@id": "tab",
            "@name": "表章項目",
            CLASS: [
              { "@code": "010", "@name": "実数" },
              { "@code": "020", "@name": "構成比" },
            ],
          },
        ],
      },
    });

    const filters = resolveDefaultFilters(classObjs, new Set(["area", "time", "cat01"]));
    expect(filters).toHaveLength(2);
    expect(filters).toContainEqual({ paramName: "cdCat02", code: "000" });
    expect(filters).toContainEqual({ paramName: "cdTab", code: "010" });
  });

  it("デフォルト候補がない分類は除外する", () => {
    const classObjs = extractClassObjects({
      CLASS_INF: {
        CLASS_OBJ: [
          areaClassObj,
          timeClassObj,
          ageClassObj,
          {
            "@id": "cat02",
            "@name": "特殊分類",
            CLASS: [
              { "@code": "A", "@name": "カテゴリA" },
              { "@code": "B", "@name": "カテゴリB" },
            ],
          },
        ],
      },
    });

    const filters = resolveDefaultFilters(classObjs, new Set(["area", "time", "cat01"]));
    expect(filters).toHaveLength(0);
  });

  it("除外対象の分類はフィルタに含めない", () => {
    const classObjs = extractClassObjects({
      CLASS_INF: {
        CLASS_OBJ: [areaClassObj, timeClassObj, ageClassObj],
      },
    });

    const filters = resolveDefaultFilters(classObjs, new Set(["area", "time", "cat01"]));
    expect(filters).toHaveLength(0);
  });
});
