Extract structured product attributes for {{tool_name}}.

## Raw context
- Website: {{website}}
- Category: {{category}}
- Description: {{description}}
- Known features: {{features}}

## Task
Return **JSON only**:

```json
{
  "features": ["feature1", "feature2"],
  "pricing": { "model": "FREE|FREEMIUM|PAID|CONTACT", "notes": "" },
  "platforms": ["web", "ios", "api"],
  "languages": ["en", "zh"],
  "integrations": ["slack", "zapier"],
  "targetUsers": ["marketers", "developers"],
  "useCases": ["content writing", "code assist"]
}
```

Only include fields you can infer; use empty arrays if unknown.
