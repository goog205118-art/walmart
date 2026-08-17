import { db } from './db';

/**
 * fupan.txt 手动复盘记录的结构化种子数据（2026-03 ~ 2026-10 沃尔玛家居广告）
 * 按 date 去重，已存在的日期不会重复导入
 */
export const SEED_REFLECTIONS = [
  {
    date: '2026-03-03',
    metrics: { impressions: '700', spend: '0.2', ctr: '0.13', cpc: '0.2', orders: '0', roas: '' },
    goal: {
      projectGoal: 'walmart家居广告：通过广告达到日均三单转化',
      corePhaseGoal: '达到合理点击率（20-25曝光×3）从而促成每日三单的成单效果',
      budget: '每日$15，每次点击 cpc 设置$0.2（已消耗$0.2预算）'
    },
    result: {
      isCompleted: '否',
      status: '差，700+曝光 1次点击，CTR 0.13%',
      gap: '预期60-75点击，实际1点击；预期3单/day，实际0。现阶段点击率不足',
      highlights: '',
      newGoals: '新增目标：CTR 从 0.13% 提升至 1%'
    },
    analysis: {
      keyEvents: '1. 选择利润较高的为投放品（由成本底线原因）\n2. 选择以降低cpc预算从而达到高点击低定价方案\n3. 迫于预算 cpc 选择0.2（较低）',
      subjective: 'cpc定价低，过于纠结利润导致错误判断',
      objective: '广告策略方案？或部分页面吸引力不够？'
    },
    insight: {
      countermeasures: '中风险：基于自然流转化较高预期（数据为4-5%销售转化），提升cpc价格至0.3-0.4（$15/day）；低风险：单纯增加竞价倍数，搜索竞价增加21%仍不超预算，使商品到达更好的推荐位提供点击',
      summary: '3天内成效差则停止低预算跑量；开始准备测试新的广告竞价方案，完善沃尔玛广告信息差；继续记录广告数据。最后：上述一般决策交由AI导致缺乏数据比对，停止AI决策，AI只罗列方案模型，捏紧决策权；对于行业模型思维需加强'
    },
    aiSummary: '',
    aiExtractNote: ''
  },
  {
    date: '2026-03-04',
    metrics: { impressions: '900', spend: '0.72', ctr: '0.31', cpc: '0.24', orders: '0', roas: '' },
    goal: {
      projectGoal: 'CTR提升至0.5%-2%之间',
      corePhaseGoal: '提升点击率',
      budget: '每日$15，cpc设置$0.2，新增搜索框竞价倍率20%，平均单次点击成本$0.24，当前消耗$0.72'
    },
    result: {
      isCompleted: '否',
      status: '差，900曝光 3次点击，CTR 0.31%。搜索框竞价目前有作用，点击全部来自搜索框',
      gap: '提升不明显。调整搜索框倍率后提升明显但数据支撑低：点击1→3，CTR 0.13%→0.31%，其中搜索框CTR 1.03%。点击率提升依旧不足',
      highlights: '',
      newGoals: '新增目标：记录广告关键词参数进行关键词筛选，为下一步手动广告准备'
    },
    analysis: {
      keyEvents: '1. 更改搜索竞价+20%\n2. 其余不变',
      subjective: '按效果来说有效但提升有限，没有合适数据支撑；轮播图曝光占大头但CTR极低',
      objective: '依旧cpc价格低 / 主图吸引力不够？/ 划线促销失效'
    },
    insight: {
      countermeasures: '增加搜索竞价倍率有效但缺少多天数据支撑，保留测试；在原基础上优化更换场景主图或白底主图测试；尝试是否能重开划线促销；预准备提高cpc价格模式但原每日$15不变，测试迭代数据',
      summary: '两天内成效提升不明显则停止该跑量；若搜索框倍率成功，尝试扩大倍率并记录效果；继续准备高cpc高转化方案，测试是否达到自然流转化5%；继续记录广告迭代数据。学习平台官方广告模式方案，准备第三天数据生成后筛选关键词（1-2周）为手动广告准备'
    },
    aiSummary: '',
    aiExtractNote: ''
  },
  {
    date: '2026-03-05',
    metrics: { impressions: '1470', spend: '', ctr: '0.41', cpc: '0.22', orders: '0', roas: '' },
    goal: {
      projectGoal: 'CTR提升至0.5%-2%之间',
      corePhaseGoal: '提升点击促成转化，收集核心关键词',
      budget: '每日$15，cpc $0.2，搜索竞价倍率20%，单次点击$0.22'
    },
    result: {
      isCompleted: '否',
      status: '较差，1.47k曝光 6次点击，纯天然CTR 0.41%，移动端搜索占最大',
      gap: '有提升。未调整参数：点击6，CTR 0.41%，0.65%的搜索CTR。点击率仍然不足',
      highlights: '',
      newGoals: '准备尝试优惠券促销'
    },
    analysis: {
      keyEvents: '不变',
      subjective: '轮播图占领大部分曝光但不产生点击',
      objective: '轮播位置质量过低'
    },
    insight: {
      countermeasures: '调整搜索竞价从20%→50%，观察参数变化',
      summary: '尝试用搜索位顶替轮播位；关键词仍未生成，暂作准备'
    },
    aiSummary: '',
    aiExtractNote: ''
  },
  {
    date: '2026-03-08',
    metrics: { impressions: '', spend: '3', ctr: '0.5', cpc: '', orders: '0', roas: '' },
    goal: {
      projectGoal: '转化1-3单/day',
      corePhaseGoal: 'CTR提升至稳定0.5%-2%之间，转化出单',
      budget: '投入预算$15/day，当前最高日预算$6，平均$2-3'
    },
    result: {
      isCompleted: '部分完成',
      status: '（3-6至3-8合并复盘）目标CTR已连续3天达到及格线，3月8日单日点击22。目标完成情况较差：转化未出',
      gap: '原定结果25-30点击转化1单，当前50+点击理想1-2单，未达到',
      highlights: '亮点：点击率较稳步提升；不足：未能通过点击带来转化',
      newGoals: '新增目标：稳步提高转化，尝试按推荐cpc+1-20%价格跑词，0.4cpc'
    },
    analysis: {
      keyEvents: '1. 提高竞价倍率至50%\n2. 主图调整为场景渲染图',
      subjective: '未触及了解完整广告策略与店铺运营打法体系，导致目前只执行自我理解的最保守方案，跑量数据低看不清整盘数据；未转化主观原因是划线促销消失，暂时无法开启且未找到其他促销模式，以及低价广告策略原因',
      objective: '跑量不出原因：内容差（未优化）、广告价格低；标题、描述未进一步对标竞对优化，是否价格原因暂未确定；不转化原因：未触及真需求用户、内容质量、痛点吸引低'
    },
    insight: {
      countermeasures: '最小执行：立即找到投广商品的关键词竞品、高销竞品，参考关键词和标题是否有优化空间',
      summary: '经验总结：提高行业知识面模型体系，针对性学习广告策略和商品策略'
    },
    aiSummary: '',
    aiExtractNote: ''
  },
  {
    date: '2026-03-09',
    metrics: { impressions: '800', spend: '', ctr: '0.67', cpc: '0.4', orders: '1', roas: '3.85' },
    goal: {
      projectGoal: '转化1-3单/day，平均1单广告支出尽量<$5',
      corePhaseGoal: '达成成单',
      budget: '$15/day，当前cpc调整至0.4左右尝试'
    },
    result: {
      isCompleted: '部分完成',
      status: '一般，已达成成单。7、9日均有一单，但从开广告起转化价格超出利润',
      gap: '已达成广告出单目标，但单量小无法稳定计算',
      highlights: '亮点：点击率稳步提升，同时带来了成单；不足：切换无倍率加上增加cpc竞价至0.4后单日展现量下降，从1-2k降至800，点击8个带来一单，当前测试仅一天暂无法准确解释',
      newGoals: '新增目标：扩展成单量，提高ROAS'
    },
    analysis: {
      keyEvents: '1. 提高了cpc价格\n2. 正在优化标题内容等结构\n（当前大多数据已出：新增ROAS $3.85，当天点击率0.94，总点击0.67%）',
      subjective: '主要广告算法标签已经锚定，但仍有空跑关键词',
      objective: '影响转化在价格、质量、物流方面，其中主要在质量方面待提升（其中两个已解决）'
    },
    insight: {
      countermeasures: '',
      summary: ''
    },
    aiSummary: '',
    aiExtractNote: ''
  },
  {
    date: '2026-10-14',
    metrics: { impressions: '', spend: '', ctr: '0.75', cpc: '', orders: '1', roas: '' },
    goal: {
      projectGoal: '达到ROAS 6%转化，确保成本',
      corePhaseGoal: '1. 提高点击率0.5%-3%；2. 提高转化率6%',
      budget: '$15/day'
    },
    result: {
      isCompleted: '否',
      status: '未完成，进行中。点击0.9-0.6，平均25-30点击1次转化，转化率3%——客观转化达标，结合实际未达标，仍然负成本',
      gap: 'CTR达标，仍有提升空间；转化率未达标',
      highlights: '亮点：每日平均1广告单；不足：广告效果停滞在当前节点，虽每日平均1单但无法稳定',
      newGoals: ''
    },
    analysis: {
      keyEvents: '1. 之前广告商品为高利润品，缩减广告预算；当前加入8件所有品类尝试效果\n2. 增加cpc 0.4，但由于超预算且无实质提升，2天后关闭',
      subjective: '形成差距原因：没有确切的提升指标，完全属于尝试状态',
      objective: '/'
    },
    insight: {
      countermeasures: '确立系统性通用性指标，以达标制提升',
      summary: '做下一步落地计划：以完成目标为导向，拆解分支'
    },
    aiSummary: '',
    aiExtractNote: ''
  }
];

/** 导入种子数据，按日期跳过已存在记录，返回 {imported, skipped} */
export async function importSeedData() {
  const existingDates = new Set((await db.reflections.toArray()).map((r) => r.date));
  let imported = 0;
  let skipped = 0;
  for (const record of SEED_REFLECTIONS) {
    if (existingDates.has(record.date)) {
      skipped++;
      continue;
    }
    await db.reflections.add({ ...record, createdAt: Date.now(), updatedAt: Date.now() });
    imported++;
  }
  return { imported, skipped };
}
