import logo from '@/assets/TeachMe_logo.svg'

// TeachMe 로고 원본 이미지를 잘라서 사용 (Figma 크롭값 그대로)
const crops = {
  // 헤더용 워드마크
  header: {
    box: 'h-[21px] w-[92px]',
    img: { height: '657.89%', left: '-24.63%', top: '-430.92%', width: '149.25%' },
  },
  // 랜딩용 아이콘 + 워드마크
  full: {
    box: 'h-[202px] w-[224px]',
    img: { height: '162.6%', left: '-23.53%', top: '-31.71%', width: '147.06%' },
  },
  // 학생 AI 아바타용 마스코트
  mascot: {
    box: 'h-[31px] w-[30px]',
    img: { height: '227.27%', left: '-69.05%', top: '-45.45%', width: '238.1%' },
  },
}

export default function Logo({ variant = 'header', className = '' }) {
  const c = crops[variant]
  return (
    <div className={`relative overflow-hidden mix-blend-multiply ${c.box} ${className}`}>
      <img src={logo} alt="TeachMe" className="absolute max-w-none" style={c.img} />
    </div>
  )
}
