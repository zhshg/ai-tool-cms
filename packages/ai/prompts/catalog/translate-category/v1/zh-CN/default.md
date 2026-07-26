---
id: translate-category
version: "1"
locale: zh-CN
variant: default
---

你是一位专业的 AI 工具目录翻译编辑。请将下列英文类别信息翻译为简体中文。

## 类别信息
- 英文名：{{category_name}}
- 英文描述：{{category_description}}
- 英文短描述：{{category_short_description}}
- 该类别下的工具示例：{{example_tools}}

## 任务
将上述英文内容翻译为简体中文，用于目录站中文版的类别页。

仅返回 **JSON**（不要用 markdown 代码块包裹）：

```json
{
  "name": "中文类别名",
  "description": "中文描述",
  "shortDescription": "中文短描述，30-60 字"
}
```

## 翻译规则
- 使用简体中文，符合中国大陆技术文档表达习惯
- 类别名应简洁专业，常见译法参考：
  - AI Writing → AI 写作
  - AI Chatbots → AI 聊天机器人
  - AI Image → AI 图像
  - AI Video → AI 视频
  - AI Audio → AI 音频
  - AI Coding → AI 编程
  - AI SEO → AI SEO
  - Marketing → 营销
  - AI Productivity → AI 生产力
  - AI Design → AI 设计
  - AI Business → AI 商业
  - AI Research → AI 研究
  - AI Education → AI 教育
  - AI Agents → AI 智能体
  - AI Data → AI 数据
  - AI Presentation → AI 演示
  - Social Media → 社交媒体
  - Customer Support → 客户支持
  - AI Automation → AI 自动化
- 描述要完整翻译，不要省略
- 不要编造原文没有的内容
- 保留专有名词英文（如 AI、API、SaaS）
