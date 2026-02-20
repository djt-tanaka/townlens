/**
 * report コマンドのオプション型定義。
 * 各モードハンドラで共有する。
 */

export interface ReportOptions {
  readonly cities?: string;
  readonly mesh?: string;
  readonly stations?: string;
  readonly radius: string;
  readonly meshStatsId?: string;
  readonly statsDataId?: string;
  readonly profile?: string;
  readonly out?: string;
  readonly classId?: string;
  readonly totalCode?: string;
  readonly kidsCode?: string;
  readonly timeCode?: string;
  readonly scored?: boolean;
  readonly preset: string;
  readonly year?: string;
  readonly quarter?: string;
  readonly propertyType: string;
  readonly budgetLimit?: string;
  readonly price: boolean;
  readonly crime: boolean;
  readonly crimeStatsId?: string;
  readonly disaster: boolean;
  readonly education: boolean;
  readonly interactive?: boolean;
}
