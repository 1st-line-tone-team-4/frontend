// 추가 화면(A-01~A-22) 시안용 더미 데이터 · 시나리오: 지민, 토익 D-5, 단원 3 현재완료

export const FILE = '토익 문법 정리.pdf'

/* ── A-01 · A-02 단원과 개념 ─────────────────── */
export const UNIT = {
  label: '단원 3',
  title: '현재완료',
  file: FILE,
  pages: 'p.24–25',
  minutes: 40,
  summary: [
    '현재완료는 have/has + 과거분사(p.p.)로 만들어요.',
    'since는 시작한 시점, for는 이어진 기간과 함께 써요.',
    '분명한 과거 시점(yesterday, ago)에는 현재완료를 쓰지 않아요.',
  ],
  pitfalls: [
    'yesterday · last week · ago 와 현재완료를 같이 쓰는 실수',
    'since 뒤에 기간(3 years)을 쓰는 실수',
  ],
}

// status: todo(학습 전) | read(학습함) | checked(확인 완료) | taught(설명 완료)
export const CONCEPTS = [
  {
    id: 'c1',
    name: '현재완료의 형태',
    summary: 'have/has + 과거분사로 과거와 지금을 이어요.',
    page: 24,
    examples: 2,
    status: 'read',
    today: true,
    core: {
      title: '과거에서 지금까지 이어져요',
      body: '현재완료는 have/has 뒤에 과거분사(p.p.)를 써요. 과거에 시작된 일이 지금까지 영향을 줄 때 써요.',
      rule: '주어 + have/has + p.p. · 3인칭 단수 주어는 has',
    },
    example: { en: 'I have lived in Seoul for five years.', ko: '나는 5년 동안 서울에 살아 왔다.' },
    steps: [
      '주어가 I 이므로 have 를 써요.',
      'live 의 과거분사 lived 를 붙여요.',
      'for five years 가 이어진 기간을 알려줘요.',
    ],
    point: '형태는 have/has + p.p. 하나만 기억해요.',
    highlight: 'have/has + 과거분사(p.p.)',
  },
  {
    id: 'c2',
    name: 'since와 for 구분',
    summary: 'since는 시작 시점, for는 이어진 기간이에요.',
    page: 24,
    examples: 2,
    status: 'todo',
    today: true,
    core: {
      title: 'since · 시작한 시점 / for · 이어진 기간',
      body: 'since 뒤에는 일이 시작된 때(2021, last Monday)가 오고, for 뒤에는 얼마나 이어졌는지(3 years, two weeks)가 와요.',
      rule: 'since + 시점 · for + 기간',
    },
    example: { en: 'She has worked here since 2021.', ko: '그녀는 2021년부터 여기서 일해 왔다.' },
    steps: [
      '2021 은 시작한 시점이에요.',
      '시점 앞에는 since 를 써요.',
      '지금도 일하고 있으니 현재완료 has worked 예요.',
    ],
    point: '숫자 + 단위(years, days)면 for, 날짜·연도면 since.',
    highlight: 'since + 시점 · for + 기간',
  },
  {
    id: 'c3',
    name: '현재완료의 계속 용법',
    summary: '과거부터 지금까지 계속되는 상태를 말해요.',
    page: 25,
    examples: 1,
    status: 'todo',
    today: false,
    core: {
      title: '지금도 계속되고 있어요',
      body: '계속 용법은 과거에 시작해서 지금도 이어지는 상태나 동작을 나타내요. how long 질문의 답으로 자주 나와요.',
      rule: 'How long have you + p.p.? → I have + p.p. for/since ~',
    },
    example: { en: 'How long have you known him?', ko: '그를 안 지 얼마나 됐니?' },
    steps: ['How long 은 기간을 묻는 말이에요.', '지금도 알고 있으니 현재완료를 써요.'],
    point: 'how long 이 보이면 계속 용법을 먼저 떠올려요.',
    highlight: '과거부터 지금까지 계속',
  },
  {
    id: 'c4',
    name: '과거 시점 부사와의 구분',
    summary: 'yesterday · ago 같은 말에는 과거시제를 써요.',
    page: 25,
    examples: 2,
    status: 'todo',
    today: false,
    core: {
      title: '과거 시점 부사는 주의해요',
      body: 'yesterday, last week, two days ago 처럼 분명한 과거 시점이 있으면 현재완료가 아니라 과거시제를 써요.',
      rule: '분명한 과거 시점 + 과거시제 (현재완료 X)',
    },
    example: { en: 'I finished the report yesterday.', ko: '나는 어제 보고서를 끝냈다.' },
    steps: [
      'yesterday 는 분명한 과거 시점이에요.',
      '그래서 have finished 가 아니라 finished 를 써요.',
    ],
    point: '시점이 콕 집히면 과거시제!',
    highlight: '분명한 과거 시점에는 과거시제',
  },
]

export const STATUS_LABEL = {
  todo: { text: '학습 전', tone: 'cool' },
  read: { text: '학습함', tone: 'primary' },
  checked: { text: '확인 완료', tone: 'secondary' },
  taught: { text: '설명 완료', tone: 'solid' },
}

/* ── A-16 근거 자료 원문 (페이지별 문장) ─────── */
export const SOURCE_PAGES = {
  24: {
    heading: 'Unit 3. 현재완료 (Present Perfect)',
    lines: [
      '1. 형태: have/has + 과거분사(p.p.)',
      '현재완료는 과거에 일어난 일이 현재까지 영향을 미칠 때 사용한다.',
      '용법: 계속 · 경험 · 완료 · 결과',
      '2. since + 시점 · for + 기간',
      'She has worked here since 2021.',
      'I have lived in Seoul for five years.',
    ],
    highlights: ['1. 형태: have/has + 과거분사(p.p.)', '2. since + 시점 · for + 기간'],
  },
  25: {
    heading: 'Unit 3. 현재완료 (계속)',
    lines: [
      '3. 계속 용법: 과거부터 지금까지 계속되는 상태',
      'How long have you known him?',
      '4. 주의: 분명한 과거 시점 부사와 함께 쓰지 않는다.',
      'yesterday, last week, ~ ago, in 2020 → 과거시제',
      'I finished the report yesterday. (O)',
      'I have finished the report yesterday. (X)',
    ],
    highlights: ['4. 주의: 분명한 과거 시점 부사와 함께 쓰지 않는다.'],
  },
}

/* ── 09 · A-04 개념 확인 문제 ─────────────────── */
export const QUIZ = [
  {
    id: 'q1',
    concept: '현재완료의 형태',
    level: '하',
    prompt: '빈칸에 들어갈 가장 알맞은 표현은?',
    sentence: 'They ___ already eaten lunch.',
    choices: ['have', 'has', 'are', 'did'],
    answer: 0,
    explain: '주어가 They 이므로 have + p.p. 를 써요.',
    page: 24,
  },
  {
    id: 'q2',
    concept: 'since와 for 구분',
    level: '중',
    prompt: '빈칸에 들어갈 가장 알맞은 표현은?',
    sentence: 'She ___ here since 2021.',
    choices: ['has worked', 'worked', 'works', 'will work'],
    answer: 0,
    explain: '2021년부터 지금까지 이어지는 일이라 현재완료를 써요.',
    page: 24,
  },
  {
    id: 'q3',
    concept: '과거 시점 부사와의 구분',
    level: '상',
    prompt: '어법상 올바른 문장은?',
    sentence: '다음 중 바른 문장을 고르세요.',
    choices: [
      'I have seen him yesterday.',
      'I saw him yesterday.',
      'I have see him yesterday.',
      'I seen him yesterday.',
    ],
    answer: 1,
    explain: 'yesterday 는 분명한 과거 시점이라 과거시제 saw 를 써요.',
    page: 25,
  },
  {
    id: 'q4',
    concept: 'since와 for 구분',
    level: '중',
    prompt: '빈칸에 들어갈 가장 알맞은 표현은?',
    sentence: 'We have known each other ___ ten years.',
    choices: ['since', 'for', 'ago', 'during'],
    answer: 1,
    explain: 'ten years 는 이어진 기간이라 for 를 써요.',
    page: 24,
  },
  {
    id: 'q5',
    concept: '과거 시점 부사와의 구분',
    level: '상',
    prompt: '빈칸에 들어갈 가장 알맞은 표현은?',
    sentence: 'He ___ the report two days ago.',
    choices: ['has finished', 'finished', 'have finished', 'finishes'],
    answer: 1,
    explain: 'two days ago 는 분명한 과거 시점이에요. 과거시제를 써요.',
    page: 25,
  },
]

/* ── 10 · A-05 설명할 약점 ───────────────────── */
export const WEAKNESSES = [
  { id: 'w1', name: '과거 시점 부사', wrong: 2, page: 25 },
  { id: 'w2', name: 'since와 for 구분', wrong: 1, page: 24 },
]

/* ── A-07 부족한 항목 (12 판정) ───────────────── */
export const REVIEW_ITEMS = [
  {
    id: 'r1',
    verdict: '오류',
    tone: 'error',
    title: '과거 시점 부사와 현재완료',
    quote: '“yesterday 같은 과거 시점 부사와도 쓸 수 있어요.”',
    right: '분명한 과거 시점(yesterday, ago)에는 과거시제를 써요.',
    example: { en: 'I finished it yesterday.', ko: '나는 어제 그것을 끝냈다.' },
    page: 25,
    check: {
      q: 'I have met her last week. 는 바른 문장이다.',
      answer: false,
      explain: 'last week 는 과거 시점이라 met 을 써야 해요.',
    },
  },
  {
    id: 'r2',
    verdict: '누락',
    tone: 'cool',
    title: 'since와 for 구분',
    quote: null,
    right: 'since 뒤에는 시작 시점, for 뒤에는 이어진 기간이 와요.',
    example: { en: 'I have lived here for three years.', ko: '나는 3년 동안 여기 살아 왔다.' },
    page: 24,
    check: {
      q: 'since 뒤에는 기간(3 years)이 온다.',
      answer: false,
      explain: 'since 뒤에는 시점, for 뒤에 기간이 와요.',
    },
  },
  {
    id: 'r3',
    verdict: '부분',
    tone: 'secondary',
    title: '계속 용법 예시',
    quote: '“계속 쓰는 거예요.”',
    right: '과거에 시작해 지금도 이어지는 상태를 예문과 함께 설명해요.',
    example: {
      en: 'She has been sick since Monday.',
      ko: '그녀는 월요일부터 아팠다(지금도 아프다).',
    },
    page: 25,
    check: {
      q: 'How long have you known him? 은 계속 용법이다.',
      answer: true,
      explain: '지금도 알고 있는 상태를 묻고 있어요.',
    },
  },
]

/* ── A-09 ~ A-11 모의고사 ─────────────────────── */
export const MOCK_EXAM = {
  count: 20,
  minutes: 30,
  concepts: 8,
  history: [{ date: '11.04', score: 13, total: 20 }],
}

// 20문항 · QUIZ 를 바탕으로 늘려요
const MOCK_BASE = [
  ...QUIZ,
  {
    id: 'm6',
    concept: '현재시제',
    level: '하',
    prompt: '빈칸에 알맞은 것은?',
    sentence: 'Water ___ at 100°C.',
    choices: ['boil', 'boils', 'boiled', 'has boiled'],
    answer: 1,
    explain: '일반적인 사실은 현재시제, 3인칭 단수 -s.',
    page: 20,
  },
  {
    id: 'm7',
    concept: '과거시제',
    level: '하',
    prompt: '빈칸에 알맞은 것은?',
    sentence: 'I ___ to Busan last year.',
    choices: ['go', 'have gone', 'went', 'goes'],
    answer: 2,
    explain: 'last year 는 과거 시점이에요.',
    page: 21,
  },
  {
    id: 'm8',
    concept: '미래시제',
    level: '중',
    prompt: '빈칸에 알맞은 것은?',
    sentence: 'The meeting ___ tomorrow at 9.',
    choices: ['starts', 'started', 'has started', 'starting'],
    answer: 0,
    explain: '확정된 일정은 현재시제로 미래를 나타내요.',
    page: 22,
  },
  {
    id: 'm9',
    concept: '주어와 동사의 수 일치',
    level: '중',
    prompt: '빈칸에 알맞은 것은?',
    sentence: 'Each of the students ___ a laptop.',
    choices: ['have', 'has', 'are having', 'were'],
    answer: 1,
    explain: 'Each of ~ 는 단수 취급해요.',
    page: 23,
  },
  {
    id: 'm10',
    concept: '현재완료의 계속 용법',
    level: '상',
    prompt: '빈칸에 알맞은 것은?',
    sentence: 'How long ___ you lived here?',
    choices: ['did', 'do', 'have', 'are'],
    answer: 2,
    explain: 'How long + 현재완료 의문문이에요.',
    page: 25,
  },
]
export const MOCK_QUESTIONS = Array.from({ length: 20 }, (_, i) => {
  const b = MOCK_BASE[i % MOCK_BASE.length]
  return { ...b, id: `mock-${i + 1}` }
})

export const MOCK_RESULT = {
  correct: 14,
  total: 20,
  minutes: 24,
  byConcept: [
    { name: '현재시제', rate: 100 },
    { name: '과거시제', rate: 100 },
    { name: '미래시제', rate: 75 },
    { name: '수 일치', rate: 75 },
    { name: '현재완료의 형태', rate: 75 },
    { name: 'since와 for', rate: 50 },
    { name: '계속 용법', rate: 67 },
    { name: '과거 시점 부사', rate: 33 },
  ],
  weak: [
    { name: '과거 시점 부사', page: 25 },
    { name: 'since와 for 구분', page: 24 },
    { name: '현재완료의 계속 용법', page: 25 },
  ],
  prev: { score: 13, total: 20 },
}

/* ── A-12 · A-13 문제은행 ─────────────────────── */
export const BANK_SETS = [
  {
    id: 'b1',
    keyword: '토익 RC',
    title: '과거 시점 부사, 헷갈리는 표현 모음',
    level: '상',
    count: 6,
    solved: 128,
    verified: true,
    concepts: ['과거 시점 부사'],
  },
  {
    id: 'b2',
    keyword: '영문법',
    title: 'since와 for, 알맞은 표현 찾기',
    level: '중',
    count: 5,
    solved: 96,
    verified: true,
    concepts: ['since와 for 구분'],
  },
  {
    id: 'b3',
    keyword: '토익 RC',
    title: '현재완료 vs 과거시제 실전 10제',
    level: '중',
    count: 10,
    solved: 211,
    verified: false,
    concepts: ['과거 시점 부사', '현재완료의 형태'],
  },
  {
    id: 'b4',
    keyword: '토익 LC',
    title: '듣고 고르는 시제 표현',
    level: '하',
    count: 8,
    solved: 54,
    verified: false,
    concepts: ['현재완료의 계속 용법'],
  },
]
