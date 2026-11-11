import { useSearchParams } from 'react-router-dom'
import { useStudyPlan } from './useStudyApi'
import { useConcepts, useMaterial, useUnits } from './useMaterialApi'
import { useStudyStore } from '@/stores/useStudyStore'
import {
  resolveContext,
  studyUrl,
  learningLinkContext,
  requiredLearningContext,
} from '@/utils/studyModel'

export function useLearningContext() {
  const [params] = useSearchParams()
  const plan = useStudyPlan()
  const savedMaterialId = useStudyStore((s) => s.materialId)
  const context = resolveContext({
    params,
    tasks: plan.data?.tasks,
    materialIds: plan.data?.material_ids,
    savedMaterialId,
  })
  const material = useMaterial(context.materialId)
  const units = useUnits(context.materialId)
  const concepts = useConcepts(context.materialId)
  const unitId = context.unitId || units.data?.[0]?.id
  const unit = units.data?.find((item) => item.id === unitId)
  const list = (concepts.data ?? []).filter(
    (item) => item.unit_id === unitId && item.current_version?.is_confirmed,
  )
  const requested =
    params.get('concept') || params.get('c') || context.task?.concept_version_ids?.[0]
  const selected = requested
    ? list.find((item) => item.current_version.id === requested || item.concept_id === requested)
    : list[0]
  const base = learningLinkContext(params, {
    materialId: context.materialId,
    unitId,
    planId: plan.data?.id,
    taskId: context.task?.id,
  })
  const resolution = requiredLearningContext(params, {
    plan: plan.data,
    pending: plan.isPending,
    failed: plan.isError,
  })
  const url = (path, extra = {}) => studyUrl(path, { ...base, ...extra })
  const query = resolution.invalidTask
    ? {
        isError: true,
        error: new Error('요청한 과제가 이 학습 계획에 없어요. 오늘 학습에서 다시 선택해 주세요.'),
        refetch: plan.refetch,
      }
    : [plan, material, units, concepts].find((q) => q.isError || q.isLoading) || concepts
  const contextReady =
    !resolution.pending && !resolution.invalidTask && !query.isLoading && !query.isError
  return {
    ...context,
    material,
    units,
    concepts,
    plan,
    unit,
    unitId,
    list,
    selected,
    query,
    contextReady,
    url,
  }
}
