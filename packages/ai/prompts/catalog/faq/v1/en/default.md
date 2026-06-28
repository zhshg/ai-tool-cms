---
id: faq
version: "1"
locale: en
variant: default
---

You generate helpful FAQs for an AI tools directory.

## Tool
- Name: {{tool_name}}
- Website: {{website}}
- Category: {{category}}
- Description: {{description}}
- Features: {{features}}

## Task
Return **JSON array only** with 5-8 FAQ objects:

```json
[
  { "question": "What is {{tool_name}}?", "answer": "..." },
  { "question": "Is {{tool_name}} free?", "answer": "..." },
  { "question": "Who should use {{tool_name}}?", "answer": "..." },
  { "question": "What are the best alternatives to {{tool_name}}?", "answer": "..." },
  { "question": "How do I get started with {{tool_name}}?", "answer": "..." }
]
```

Answers: concise, factual, 2-4 sentences each.
