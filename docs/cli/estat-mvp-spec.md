# e-Stat City Report MVP Spec

## Goal
- Input municipality names from CLI.
- Fetch and aggregate latest population statistics via e-Stat API.
- Output PDF report that compares:
  - Population total
  - Population age 0-14
  - 0-14 ratio

## Commands
- `estat-report init`
- `estat-report search --keyword "<検索語>"`
- `estat-report report --cities "<市区町村名,市区町村名,...>" [--statsDataId <ID>] [--profile <name>] [--out <path>]`

## API
- Use e-Stat `getStatsData` for actual statistical values.
- Require `ESTAT_APP_ID` from environment.
- Resolve municipality code (`cdArea`) from `getMetaInfo` area metadata.
- Resolve age categories (total / 0-14) heuristically from metadata classifications.

## Cache
- Cache `getMetaInfo` at `./.cache/estat/meta_<statsDataId>.json` with TTL=7 days.

## Error Handling
- Fail fast with actionable hints for:
  - missing `ESTAT_APP_ID`
  - missing statsDataId
  - unresolved municipality
  - unresolved age category
