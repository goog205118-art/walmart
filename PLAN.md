# GRAI 复盘管理系统 · 完整项目方案

> 基于 `fupan.txt` 手动复盘记录（2026-03 ~ 2026-10，沃尔玛家居广告运营）与现有初版页面代码梳理。
> 目标：把"手写文字过多、步骤繁琐"的手动复盘，升级为可部署到 Vercel 的数字化复盘平台。

---

## 一、现状诊断（现有代码的缺口）

| 现状 | 缺口 |
|---|---|
| 已有 GRAI 四段式表单 | 只能新建，**不能编辑/修改**已保存记录；Result 缺"亮点与不足"字段 |
| IndexedDB (Dexie) 已接入 | 图片以 base64 字符串入库（体积膨胀 33%+）；无图片压缩 |
| 历史归档页 | 仅列表展示，**无日期检索、无筛选、无对比、无详情展开** |
| AI 调用 | 只支持 Gemini 原生协议；无"模型协议"选项；截图提取仅填 4 个指标 |
| 大盘页 | 有基础图表，但 AI 报告不落库、每次重新生成浪费额度 |
| 部署 | 无 vercel.json / SPA 路由配置；无数据备份机制（换域名/清缓存即丢数据） |

---

## 二、功能模块划分

### M1 复盘录入 / 编辑（GraiForm）
- GRAI 四段结构化表单（对齐你的思维导图与 txt 记录的实际写法）：
  - **Goal**：项目目标 / 核心阶段目标 / 投入预算
  - **Result**：是否完成（是/否/部分）/ 完成情况 / 目标差距对比 / **亮点与不足**（现有代码缺失，你的 txt 中高频出现）/ 新增目标
  - **Analysis**：关键事件动作回顾（1/2/3 列表式）/ 主观原因 / 客观原因
  - **Insight**：应对措施（明确"下架/加持/测试"指令）/ 经验总结
- 核心指标栏：日期、曝光(impressions)、花费(spend)、CTR、CPC、转化单量(orders)、ROAS（你的记录里 3-9 起出现 ROAS，现有表单缺失）
- 编辑模式：从历史页/详情页进入，回填数据，覆盖保存
- 图片上传：多图、预览、删除；入库前自动压缩

### M2 历史归档与检索（HistoryView）
- 按日期范围筛选、按"目标是否完成"状态筛选、关键词全文搜索
- 详情展开：完整 GRAI 四段 + 图片画廊 + 指标条
- 对比模式：勾选任意两条记录，并排对比指标与内容差异
- 删除（含关联图片级联删除）

### M3 数据大盘（Dashboard）
- 趋势图表（Recharts）：CTR/CPC 双轴折线、花费/单量柱状、ROAS 曲线、曝光量
- 顶部关键指标卡：近 7 日平均 CTR、累计花费、累计单量、平均 ROAS
- AI 报告区（见 M5），生成结果**缓存入库**，避免重复消耗 token

### M4 AI 设置面板（SettingsView）
- 可配置项：接口 Base URL、API Key、**模型协议**（Gemini 原生 / OpenAI 兼容）、模型名称
- 配置存浏览器本地存储，"测试连接"按钮验证可用性
- 数据备份区：一键导出全部数据为 JSON（图片转 base64 内嵌）、从 JSON 导入恢复

### M5 AI 辅助引擎（lib/ai.js 重构为协议适配器）
1. **截图信息提取**：上传广告后台截图 → Gemini 多模态识别 → 自动填充指标 + 生成"当日数据摘要"文字
2. **单条复盘总结**：对单条记录生成一段式摘要，在历史列表直接展示
3. **全局对比洞察**：汇总全部/近期 N 条复盘 → 输出：
   - 指标变化对比表（Markdown 表格渲染）
   - 动作有效性分析（哪些调整带来了提升）
   - **下架分析**（哪些策略应停止/下架）
   - 改进建议与下一步方向
4. **当日 vs 历史对比**：新建复盘时可选"AI 对照历史"，自动对比最近记录给出即时反馈

### M6 历史数据导入（一次性工具）
- 将 `fupan.txt` 中 6 篇手动复盘（3-3、3-4、3-5、3-(6-8)、3-9、10-14）预结构化为种子数据，首次打开应用时可选一键导入

---

## 三、数据结构设计

### Dexie（IndexedDB）两张表

```js
db.version(2).stores({
  reflections: '++id, date, result.isCompleted, createdAt',
  images: '++id, reflectionId'
});
```

**reflections（复盘记录）**
```json
{
  "id": 1,
  "date": "2026-03-04",
  "createdAt": 1772000000000,
  "updatedAt": 1772000000000,
  "metrics": {
    "impressions": "900", "spend": "0.72", "ctr": "0.31",
    "cpc": "0.24", "orders": "0", "roas": ""
  },
  "goal":    { "projectGoal": "", "corePhaseGoal": "", "budget": "" },
  "result":  { "isCompleted": "否", "status": "", "gap": "",
               "highlights": "", "newGoals": "" },
  "analysis":{ "keyEvents": "", "subjective": "", "objective": "" },
  "insight": { "countermeasures": "", "summary": "" },
  "aiSummary": "（AI 单条总结缓存，可空）",
  "aiExtractNote": "（截图提取的文字摘要，可空）"
}
```

**images（截图，独立表避免记录体过大）**
```json
{ "id": 1, "reflectionId": 1, "blob": "<Blob 压缩后 JPEG/WebP>", "width": 1600, "size": 183000 }
```

**localStorage `aiSettings`**
```json
{ "baseUrl": "https://generativelanguage.googleapis.com",
  "apiKey": "...", "protocol": "gemini", "model": "gemini-2.5-flash" }
```

---

## 四、图片存储方案对比（需你确认）

| 方案 | 优点 | 缺点 / 限制 | 适合度 |
|---|---|---|---|
| **A. IndexedDB 存压缩 Blob（推荐）** | 零成本、零配置、离线可用、隐私好（广告后台截图属敏感经营数据）；压缩后单图约 100–300KB | 数据绑定浏览器+域名，清缓存/换浏览器会丢 → 需配合 JSON 导出备份；Chrome 配额一般数百 MB~GB 级，个人复盘场景足够 | ★★★★★ |
| B. 免费图床（SM.MS 等） | 本地库小、图片有外链可分享 | **隐私风险**（截图含店铺经营数据，公开图床可能被索引）；免费额度小（SM.MS 5GB）、可能失效跑路；需处理 CORS | ★★ |
| C. 云存储（Cloudflare R2 / Vercel Blob / Supabase） | 真正的云端、跨设备同步 | 需注册配置密钥；前端直连暴露密钥需额外做签名代理，复杂度明显上升；超出"微型系统"定位 | ★★★ |
| D. A + C 混合（本地优先，可选云同步） | 兼顾简单与跨设备 | 分两期实施，一期先做 A + 备份导出 | ★★★★（二期候选） |

**我的建议：一期采用方案 A**（IndexedDB Blob + 入库前 canvas 压缩至最长边 1600px / JPEG 0.8），配合 M4 的 JSON 导出/导入做备份兜底。你确认后我按此实施；若你更在意跨设备查看，可直接上 C。

---

## 五、AI 接入设计

- 前台直连，无后端。协议适配器按 `protocol` 分发：
  - `gemini`：`POST {baseUrl}/v1beta/models/{model}:generateContent?key=...`，图片走 `inline_data`（base64）
  - `openai`：`POST {baseUrl}/v1/chat/completions`，Bearer 鉴权，图片走 `image_url` dataURL
- 国内网络访问 Google API 需代理 → Base URL 可填你的反代地址，这正是保留 URL 配置项的原因
- 默认推荐模型：`gemini-2.5-flash`（多模态 + 免费额度够用）

---

## 六、Vercel 部署

- 纯静态 SPA：`vite build` → `dist/`，Vercel 导入仓库选 Vite 预设即可，零配置
- 提供 `vercel.json`（SPA fallback 重写 + 静态资源缓存头）
- 无需任何服务端环境变量（API Key 存在用户浏览器）

---

## 七、开发实施顺序

1. 数据层升级（db v2 迁移、图片压缩工具、导入导出）
2. AI 协议适配器 + 设置面板（含测试连接）
3. GraiForm 完善（编辑模式、新字段、截图提取增强）
4. HistoryView 重写（检索/筛选/详情/对比）
5. Dashboard 增强（ROAS/曝光图、指标卡、AI 报告缓存）
6. fupan.txt 种子数据导入工具
7. vercel.json + 构建验证 + 本地端到端测试

---

## 待你确认的 3 个问题

1. **图片存储**：采用方案 A（本地 IndexedDB + 压缩 + 备份导出）？还是直接上云存储（C/D）？
2. **模型协议**：除 Gemini 原生外，是否需要保留 OpenAI 兼容协议选项（方便日后接 DeepSeek/通义等）？（建议保留，成本极低）
3. **历史数据**：是否将 fupan.txt 的 6 篇旧复盘做成种子数据一键导入？
