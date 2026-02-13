import { describe, it, expect } from "vitest";
import {
  extractClassObjects,
  resolveAreaClass,
  buildAreaEntries,
  resolveCities,
  resolveLatestTime,
  resolveAgeSelection,
  extractDataValues,
  valuesByArea,
} from "../../src/estat/meta";
import { CliError } from "../../src/errors";

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
    expect(() => resolveAreaClass(classObjs)).toThrow(CliError);
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
    expect(() => resolveCities(["存在しない市"], entries)).toThrow(CliError);
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
    expect(() => resolveLatestTime(classObjs, "9999999999")).toThrow(CliError);
  });

  it("時間軸がないメタ情報はエラー", () => {
    const noTimeClassObjs = extractClassObjects({
      CLASS_INF: { CLASS_OBJ: [areaClassObj, ageClassObj] },
    });
    expect(() => resolveLatestTime(noTimeClassObjs)).toThrow(CliError);
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
    expect(() => resolveAgeSelection(noAgeClassObjs)).toThrow(CliError);
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
});
