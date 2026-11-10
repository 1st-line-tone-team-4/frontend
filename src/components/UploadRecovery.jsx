import Button from './Button'

export default function UploadRecovery({ upload, onSuccess }) {
  const op = upload.operation
  if (!op || op.stage === 'accepted') return null
  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-2 rounded-xl border border-line p-3 text-sm"
    >
      <p>
        {op.file.name} · {upload.isPending ? '업로드 처리 중' : '이전 업로드 결과 확인 필요'}
      </p>
      <p className="text-xs text-sub">
        뒤로 가거나 대기를 중단해도 서버 처리가 계속될 수 있어요. 같은 업로드를 이어서 확인하며, 새
        분석을 중복 생성하지 않아요. 새로고침 후에는 내 자료에서 상태를 확인해 주세요.
      </p>
      {upload.isPending ? (
        <Button variant="secondary" onClick={upload.cancelObservation}>
          로컬 대기 중단
        </Button>
      ) : (
        <>
          <Button
            onClick={() =>
              upload.resume({ onSuccess, onError: (e) => !e.canceled && alert(e.message) })
            }
          >
            업로드 결과 확인 / 이어서 진행
          </Button>
          <Button variant="secondary" to="/materials">
            내 자료에서 확인
          </Button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  '서버에 남아 있는 업로드는 삭제되지 않아요. 내 자료에서 결과를 확인했나요? 새 업로드는 별도 분석 비용이 발생할 수 있어요.',
                )
              )
                upload.dismiss()
            }}
          >
            이 업로드 대기 닫기
          </button>
        </>
      )}
    </section>
  )
}
