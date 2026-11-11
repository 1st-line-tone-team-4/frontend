// Operation state is deliberately memory-only: never persist files, signed URLs,
// bearer tokens or provider keys. The caller owns its authenticated session.
export function validateUploadFile(file) {
  const allowed = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg']
  if (!file || !allowed.includes(file.type))
    throw new Error('PDF, UTF-8 텍스트, PNG 또는 JPEG 파일을 선택해 주세요.')
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new Error('파일 크기는 0바이트보다 크고 20 MiB 이하여야 해요.')
  if (!file.name || file.name.length > 255) throw new Error('파일 이름은 255자 이하여야 해요.')
}

export function newUploadOperation(file, modelId, newKey) {
  validateUploadFile(file)
  if (!modelId) throw new Error('연결 설정에서 분석 모델과 API 키를 먼저 선택해 주세요.')
  return {
    file,
    modelId,
    createKey: newKey(),
    completeKey: newKey(),
    stage: 'create',
    material: null,
    job: null,
    uploadUrl: null,
    expiresAt: null,
  }
}

export async function runUploadOperation(
  op,
  api,
  { signal, check = () => {}, changed = () => {} } = {},
) {
  const guard = () => {
    check()
    if (signal?.aborted)
      throw Object.assign(new Error('로컬 대기를 중단했어요. 서버 작업은 계속될 수 있어요.'), {
        canceled: true,
      })
  }
  const update = (values) => {
    guard()
    Object.assign(op, values)
    changed(op)
  }
  const options = (idempotencyKey) => ({ signal, modelId: op.modelId, idempotencyKey })
  const reconcile = async () => {
    guard()
    const material = await api.getMaterial(op.material.id, { signal })
    guard()
    if (material.latest_job_id || material.processing_status !== 'upload_pending') {
      update({ material, stage: 'accepted' })
      return true
    }
    return false
  }
  const complete = async () => {
    update({ stage: 'complete' })
    const { job } = await api.completeMaterialUpload(op.material.id, options(op.completeKey))
    update({ job: { ...job, model_id: op.modelId }, stage: 'accepted' })
  }

  guard()
  if (op.stage === 'accepted') return op.material
  if (!op.material) {
    const result = await api.createMaterialUpload(op.file, options(op.createKey))
    update({
      material: result.material,
      uploadUrl: result.upload_url,
      expiresAt: result.expires_at,
      stage: 'put',
    })
  }
  // A lost PUT acknowledgement is not permission to overwrite the object.
  // Probe completion first. UPLOAD_MISSING proves the object was not visible;
  // the subsequent immutable PUT is still safe if the old request finishes late.
  if (op.stage === 'put_unknown' || op.stage === 'complete') {
    if (await reconcile()) return op.material
    try {
      await complete()
      return op.material
    } catch (error) {
      if (error.code !== 'UPLOAD_MISSING') throw error
      update({ stage: 'put' })
    }
  }
  if (op.stage === 'put') {
    if (op.expiresAt && Date.parse(op.expiresAt) <= Date.now())
      throw Object.assign(
        new Error(
          '업로드 URL이 만료됐어요. 내 자료에서 이 업로드를 확인한 뒤 새 업로드를 시작해 주세요.',
        ),
        { code: 'UPLOAD_EXPIRED' },
      )
    update({ stage: 'put_unknown' })
    try {
      await api.putFileToSignedUrl(op.uploadUrl, op.file, { signal })
    } catch (error) {
      if (error.code !== 'UPLOAD_EXISTS') throw error
      // Existing bytes are immutable and belong to this operation's material.
    }
    update({ stage: 'complete' })
  }
  await complete()
  return op.material
}
