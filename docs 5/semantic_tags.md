# Semantic Tags Guide

This guide explains how to define semantic tags, write rule syntax (including context-aware rules and hierarchical relationships), and test your additions in the Urban Manual stack.

## 1. Define the Tag Taxonomy

1. **Start with core concepts** – list the high-level ideas you want to classify (e.g., `Dining`, `Architecture`, `Nightlife`).
2. **Model hierarchical tags** – express parent ➝ child relationships with dot notation so shared behavior can cascade:
   - `Dining`
   - `Dining.Michelin`
   - `Dining.Michelin.LateNight`
3. **Attach metadata** – for each tag, capture a short description and any feature flags or UI dependencies.
4. **Validate coverage** – ensure every destination category fits at least one tag so rules remain meaningful.

> **Tip:** Keep names stable. UI components and automated enrichment jobs reference tags via their full dotted path.

## 2. Write Context-Aware Rules

Urban Manual evaluates tags by combining deterministic rules with contextual signals (neighboring fields, model outputs, and parent tags).

### Rule Building Blocks

| Syntax | Description | Example |
| --- | --- | --- |
| `contains(field, "value")` | Case-insensitive substring match | `contains(description, "tasting menu")` |
| `equals(field, "value")` | Exact match (after trimming) | `equals(city, "Paris")` |
| `in(field, [values...])` | Membership check | `in(category, ["bar", "speakeasy"])` |
| `score(model, threshold)` | Use ML score from context-aware classifier | `score("vibe_classifier", 0.82)` |
| `tagged(parent_tag)` | True when a parent or sibling tag already matched | `tagged("Dining.Michelin")` |
| `nearby(field, km, "value")` | Geo-aware lookup | `nearby(city, 2, "Shibuya")` |

Rules are expressed in JSON or YAML (depending on the pipeline) using `all`, `any`, and `not` blocks.

```json
{
  "tag": "Dining.Michelin.LateNight",
  "when": {
    "all": [
      { "equals": { "field": "city", "value": "Tokyo" } },
      { "any": [
        { "contains": { "field": "description", "value": "omakase" } },
        { "score": { "model": "dining_context", "gte": 0.9 } }
      ] },
      { "tagged": "Dining.Michelin" }
    ]
  }
}
```

### Context-Aware Example

1. `Dining.Michelin` fires when Michelin status is present or when the culinary model score exceeds `0.88`.
2. `Dining.Michelin.LateNight` only fires if the parent tag is already true **and** either:
   - The description mentions "late night", "after hours", etc.
   - The `hours` field spans midnight.

This layering allows rules to adapt to missing data while still reflecting context.

## 3. Test Your Tags

1. **Unit tests** – add fixtures to `tests/tag_rules/*.spec.ts` (or the equivalent Jest/Vitest file). Cover positive, negative, and edge cases for each rule.
2. **Dry-run the enrichment worker** – from the repo root:
   ```bash
   npm run tags:dry-run -- --only Dining.Michelin
   ```
   Inspect the JSON diff to ensure no unrelated tags changed.
3. **Context regression** – run the ML-assisted evaluator to confirm scores remain stable:
   ```bash
   npm run tags:evaluate -- --model dining_context
   ```
4. **UI verification** – load the admin taxonomy view at `/admin/tags` in the dev server. Ensure hierarchical relationships display correctly and that context-aware rules log their triggers.

## 4. Best Practices Checklist

- Prefer a single source of truth for tag descriptions (`data/tags.json`).
- Keep rule files small—split by domain (`dining.rules.json`, `art.rules.json`).
- Document every new context feature you rely on so data engineers can keep it populated.
- Record manual overrides in `automation/overrides/*.yaml` and keep them in sync with automated rules.

## Additional Resources

- `scripts/print_tags.js` – quick inventory of the current taxonomy.
- `automation/tagging_pipeline.md` – architecture overview for the enrichment worker.
- `tests/tag_rules/README.md` – conventions for writing fixtures and expectations.
