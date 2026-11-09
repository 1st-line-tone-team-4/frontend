/**
 * 목 모드용 AI 학생(민지) 응답 규칙 · 실제 모드에서는 백엔드 teach-back 세션이 대신해요
 * 기획(A-05): 사용자가 한 단락을 마치면 끼어들 수 있고, 질문은 A-04 약점을 기준으로 만들며 개수 제한이 없음.
 * 학생은 정답을 먼저 알려주거나 설명을 대신 완성하지 않음.
 */
const BANK = [
  {
    tag: '과거 시점 부사',
    keywords: ['yesterday', '어제', '과거 시점', 'ago', 'last', '지난', '과거시제', '과거 시제'],
    questions: [
      '그럼 “I have seen him yesterday.”라고 말해도 되는 거예요? 어제는 과거잖아요.',
      'last week 같은 말이 있으면 현재완료랑 과거시제 중에 뭘 써야 해요?',
    ],
  },
  {
    tag: 'since와 for 구분',
    keywords: ['since', 'for', '기간', '시점', '부터', '동안'],
    questions: [
      '“since 3 years”라고 하면 틀린 거예요? 왜 그런지 궁금해요.',
      '그럼 “last Monday”는 since랑 for 중에 뭐랑 써요? 예시로 알려주실래요?',
    ],
  },
  {
    tag: '현재완료의 형태',
    keywords: ['have', 'has', '과거분사', 'p.p', '피피', '형태'],
    questions: ['주어가 She면 have를 써요, has를 써요? 왜 달라지는 거예요?'],
  },
  {
    tag: '계속 용법',
    keywords: ['계속', '지금까지', '이어', 'how long'],
    questions: ['“How long have you known him?”은 왜 현재완료로 물어봐요?'],
  },
]

const ACKS = [
  '아하, 이제 조금 알 것 같아요! 계속 설명해 주세요.',
  '오, 그렇구나요. 그 다음은요?',
  '이해했어요! 이어서 설명해 주실래요?',
]
const PROBES = [
  '예문 하나만 더 들어주실 수 있어요? 예문으로 들으면 더 잘 이해될 것 같아요.',
  '방금 말씀하신 걸 제가 시험에서 어떻게 알아볼 수 있어요?',
  '그게 왜 그런 건지 이유가 궁금해요.',
]

export const STUDENT_GREETING = (concept = '현재완료') =>
  `처음 배워요. ${concept}가 무엇인지 알려주실래요? 쉬운 말로 설명해 주시면 중간중간 물어볼게요.`

/**
 * state: { asked: string[](이미 한 질문), weak: string[](약점 태그, 우선순위 순), mode: 'explaining'|'answering' }
 * → { kind: 'question'|'ack', text, tag?, nextState }
 */
export function studentReply(userText, state) {
  const t = userText.toLowerCase()
  const asked = state.asked ?? []

  // 질문에 답한 직후 → 짧게 반응하고 설명을 이어가게 해요
  if (state.mode === 'answering') {
    const text = ACKS[asked.length % ACKS.length]
    return { kind: 'ack', text, nextState: { ...state, mode: 'explaining' } }
  }

  const weakFirst = [...BANK].sort((a, b) => {
    const ia = state.weak?.indexOf(a.tag) ?? -1
    const ib = state.weak?.indexOf(b.tag) ?? -1
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  const fresh = (b) => b.questions.find((q) => !asked.includes(q))

  // 1) 방금 말한 내용 중 약점 키워드가 있으면 그 약점을 파고들어요
  // 2) 없으면 아직 안 다룬 약점 순서대로
  const hit =
    weakFirst.find((b) => b.keywords.some((k) => t.includes(k)) && fresh(b)) ??
    weakFirst.find((b) => fresh(b))

  if (hit) {
    const q = fresh(hit)
    return {
      kind: 'question',
      text: `잠깐만요! ${q}`,
      tag: hit.tag,
      nextState: { ...state, asked: [...asked, q], mode: 'answering' },
    }
  }
  const probe = PROBES[asked.length % PROBES.length]
  return {
    kind: 'question',
    text: `잠깐만요! ${probe}`,
    tag: '이해 확인',
    nextState: { ...state, asked: [...asked, probe], mode: 'answering' },
  }
}
