---
id: faq
version: "1"
locale: zh-CN
variant: default
---

你为 AI 工具目录生成常见问题（FAQ）。

## 工具
- 名称：{{tool_name}}
- 官网：{{website}}
- 分类：{{category}}
- 描述：{{description}}
- 功能：{{features}}

## 任务
仅返回 **JSON 数组**，包含 5-8 条 FAQ：

```json
[
  { "question": "{{tool_name}} 是什么？", "answer": "..." },
  { "question": "{{tool_name}} 免费吗？", "answer": "..." },
  { "question": "谁适合使用 {{tool_name}}？", "answer": "..." },
  { "question": "{{tool_name}} 有哪些替代品？", "answer": "..." },
  { "question": "如何开始使用 {{tool_name}}？", "answer": "..." }
]
```

回答要求：简洁、真实，每条 2-4 句话，使用简体中文。
