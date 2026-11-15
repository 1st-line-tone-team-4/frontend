// 오늘 할 일(solve) ↔ 문제 세트 연결 · 완료 판정
//
// 백엔드 진행도(completed_count)는 task_id 로 연결된 세트만 세요.
// 그런데 문제 수가 남은 목표보다 많으면 task_id 를 보낼 수 없어서(명세) 연결되지 않아요.
// 그래서 프론트에서는 '같은 개념(버전)으로 만든 세트'도 이 할 일의 세트로 보고,
// 그 세트를 끝까지 풀었으면 할 일을 완료로 표시해요.

const sameIds = (a = [], b = []) => a.length === b.length && a.every((id) => b.includes(id))

// 이 할 일로 만든 세트 (task_id 연결 또는 같은 개념 집합) · 상태와 무관하게 모두
export const setsForTask = (task, sets = []) =>
  task
    ? sets.filter(
        (s) => s.task_id === task.id || sameIds(s.concept_version_ids, task.concept_version_ids),
      )
    : []

// 'done' 완료 · 'started' 풀이 중 · 'todo' 아직
// next_ordinal === null 이면 세트의 모든 문제를 풀었어요
export function quizProgress(task, sets) {
  const ready = setsForTask(task, sets).filter((s) => s.status === 'ready')
  if (task.status === 'completed' || ready.some((s) => s.next_ordinal === null)) return 'done'
  if (task.completed_count > 0 || ready.some((s) => s.next_ordinal > 1)) return 'started'
  return 'todo'
}

// 이어 풀 세트: 이 할 일의 세트 중 아직 다 풀지 않은 것 (목록은 최근 순)
export const resumableSet = (task, sets) =>
  setsForTask(task, sets).find((s) => s.status === 'ready' && s.next_ordinal !== null)
