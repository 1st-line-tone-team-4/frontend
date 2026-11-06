import iconClock from '@/assets/icons/clock.svg'
import iconCalendar from '@/assets/icons/calendar-sm.svg'
import iconImage from '@/assets/icons/image.svg'
import iconCheck from '@/assets/icons/check-primary.svg'
import iconEye from '@/assets/icons/eye.svg'
import iconAward from '@/assets/icons/award-primary.svg'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Chip from '@/components/Chip'
import { Field, Input, Select } from '@/components/Field'
import Screen, { PageTitle } from '@/components/Screen'

// 16 점수 인증 (출시 예정 · 미리보기)
export default function ScoreVerifyPage() {
  return (
    <Screen
      header={{ title: '점수 인증', dday: 'D-5' }}
      bottom={<Button variant="disabled">인증 신청 · 출시 후 이용 가능</Button>}
      className="gap-[18px]"
    >
      <PageTitle title="시험 결과를 인증해요" desc="출시 예정 기능의 신청 화면 예시예요.">
        <div className="pt-[2px]">
          <Chip tone="cool">
            <img src={iconClock} alt="" className="size-[11px]" />
            출시 예정 · 미리보기
          </Chip>
        </div>
      </PageTitle>

      <Field label="시험 키워드" strong>
        <Select options={['토익', '토플', '텝스']} />
      </Field>
      <Field label="취득 점수 · 나만 볼 수 있어요" strong>
        <Input defaultValue="925점" />
      </Field>
      <Field label="시험 응시일" strong>
        <Input defaultValue="2026년 10월 25일" icon={iconCalendar} />
      </Field>

      <div className="flex flex-col gap-[6px]">
        <p className="text-[13px] leading-[1.3] font-bold">성적표 업로드</p>
        <div className="flex items-center gap-3 rounded-xl border border-line px-[14px] py-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-cool">
            <img src={iconImage} alt="" className="size-[17.28px]" />
          </span>
          <span className="flex-1 text-sm leading-[1.3] font-medium">토익_성적표.jpg</span>
          <Chip>
            <img src={iconCheck} alt="" className="size-[11px]" />
            첨부됨
          </Chip>
        </div>
        <p className="text-xs leading-[1.4] text-sub">성적과 응시일을 확인할 수 있는 성적표를 올려요.</p>
      </div>

      <div className="flex flex-col gap-[6px] rounded-[14px] bg-cool px-4 py-[14px]">
        <div>
          <Chip tone="white">
            <img src={iconClock} alt="" className="size-[11px]" />
            검수 대기 · 예시
          </Chip>
        </div>
        <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">제출 즉시 인증되지는 않아요</p>
        <p className="text-[13px] leading-[1.55] text-sub">
          성적표 검수 후 인증 여부를 안내해요.
          <br />
          출시 전에는 실제 신청을 받지 않아요.
        </p>
      </div>

      <Card tone="gradient" className="gap-2">
        <p className="flex items-center gap-[6px] text-sm leading-[1.4] font-bold">
          <img src={iconEye} alt="" className="size-4" />
          공개되는 정보는 점수 구간뿐이에요
        </p>
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-[10px] py-[5px] text-xs leading-[1.3] font-bold text-primary">
            <img src={iconAward} alt="" className="size-[13px]" />
            토익 900점 이상 · 인증자 수 집계
          </span>
        </div>
        <p className="text-[13px] leading-[1.55] text-sub">
          이름, 정확한 점수와 성적표는 공개하지 않아요. 공개 배지는 점수 구간과 집계 인원만 보여요.
        </p>
      </Card>
    </Screen>
  )
}
