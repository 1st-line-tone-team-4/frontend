import { useState } from 'react'
import iconSearch from '@/assets/icons/search.svg'
import iconCheck from '@/assets/icons/check-white.svg'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import Screen, { PageTitle } from '@/components/Screen'
import { lectures } from '@/data/lectures'

// 02-1 강의 검색
export default function LectureSearchPage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(1)
  const selectedLecture = lectures.find((lecture) => lecture.id === selected)
  const results = lectures.filter((l) => l.title.includes(query.trim()))

  return (
    <Screen
      header={{ title: '자료 업로드' }}
      bottom={
        <>
          <Button
            to="/lectures/exam"
            state={{ lecture: selectedLecture }}
            variant={selectedLecture ? 'primary' : 'disabled'}
          >
            이 강의로 시작하기
          </Button>
        </>
      }
    >
      <PageTitle
        title="파일 없이 시작해 볼까요?"
        desc="원하는 강의를 선택하면 파일 없이도 개념 학습을 시작할 수 있어요."
      />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center gap-[10px] rounded-xl bg-cool px-[14px] py-3"
      >
        <img src={iconSearch} alt="" className="size-[18px]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="강의 이름을 검색해 보세요"
          className="min-w-0 flex-1 bg-transparent text-[15px] leading-[1.3] font-medium outline-none placeholder:text-muted"
        />
        <button type="submit" className="text-sm leading-[1.3] font-bold text-primary">
          검색
        </button>
      </form>

      <div className="flex items-center justify-between pt-1 leading-[1.3]">
        <p className="text-sm font-bold">검색 결과 {results.length}개</p>
        <p className="text-xs text-sub">시작할 강의 1개를 선택해 주세요</p>
      </div>

      <ul className="flex flex-col gap-[10px]">
        {results.map((l) => {
          const on = selected === l.id
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setSelected(l.id)}
                className={`flex w-full flex-col gap-1 rounded-[14px] px-4 py-[14px] text-left ${
                  on
                    ? 'border-[1.5px] border-primary bg-primary-soft'
                    : 'border border-line bg-white'
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-[15px] leading-[1.4] font-bold tracking-[-0.15px]">
                    {l.title}
                  </span>
                  {on ? (
                    <Chip tone="solid">
                      <img src={iconCheck} alt="" className="size-[11px]" />
                      선택됨
                    </Chip>
                  ) : (
                    <Chip tone="outline">선택</Chip>
                  )}
                </span>
                <span className="text-[13px] leading-[1.45] text-sub">{l.desc}</span>
                <span className="text-xs leading-[1.4] font-medium text-muted">{l.meta}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-xs leading-[1.4] text-muted">
        학습용 샘플 강의예요. 개인 파일은 필요하지 않아요.
      </p>
    </Screen>
  )
}
