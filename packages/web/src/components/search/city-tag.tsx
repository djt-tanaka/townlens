"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CityTagProps {
  readonly name: string;
  readonly prefecture: string;
  readonly onRemove: () => void;
}

/** 選択済み都市のタグ表示。削除ボタン付き */
export function CityTag({ name, prefecture, onRemove }: CityTagProps) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <span>
        {prefecture} {name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
        aria-label={`${name}を削除`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
