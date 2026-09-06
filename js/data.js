// ============================================================================
// 실시간 경매 플랫폼 - 현실적인 국내 중고/한정판 거래 모의 데이터 (Humanized)
// ============================================================================

const INITIAL_AUCTIONS = [
  {
    id: 1,
    title: "애플워치 울트라 2 티타늄 49mm 급처 (풀박스 S급, 애케플 27년)",
    category: "digital",
    seller: {
      name: "판교테크_민우",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      rating: 4.9,
      mannerTemp: 98.5,
      reviewsCount: 42,
      isVerified: true,
      tradeLocation: "판교역 / 강남역 직거래 또는 우체국 택배",
      location: "경기도 성남시 분당구"
    },
    images: [
      "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1510017803434-a899398421b3?w=800&auto=format&fit=crop&q=80"
    ],
    startingPrice: 650000,
    currentPrice: 840000,
    minStep: 10000,
    maxPrice: 1400000,
    endTime: Date.now() + 1000 * 60 * 38 + 1000 * 20, // 약 38분 뒤 마감
    bidsCount: 14,
    views: 420,
    likes: 35,
    description: `작년 11월에 애플스토어에서 정가 주고 구매했는데, 손목이 얇아서 기본 시리즈로 넘어가려고 정리합니다.
실착 5회 미만이고 구매하자마자 링케 강화유리랑 베젤 케이스 씌우고 다녀서 찍힘이나 생활 기스 전혀 없는 S급 상태입니다.

- 배터리 효율 100% (사이클 12회)
- 애플케어플러스 2027년 5월까지 넉넉하게 남아있어 양도해 드립니다.
- 정품 오션밴드 블루(미사용급) + 충전 마그네틱 케이블 + 풀박스 구성 그대로 드려요.

직거래는 판교역이나 강남역 인근에서 가능하고, 택배거래 시 에어캡 3중으로 안전하게 포장해서 우체국 당일 접수해 드립니다. 쿨거래 환영합니다!`,
    bidHistory: [
      { id: 101, bidder: "얼리어답터*", amount: 840000, time: "방금 전", isUser: false },
      { id: 102, bidder: "강남비더*", amount: 820000, time: "2분 전", isUser: false },
      { id: 103, bidder: "사과수집가*", amount: 790000, time: "7분 전", isUser: false },
      { id: 104, bidder: "시계매니아*", amount: 750000, time: "16분 전", isUser: false },
      { id: 105, bidder: "테크조아*", amount: 680000, time: "35분 전", isUser: false }
    ]
  },
  {
    id: 2,
    title: "소니 WH-1000XM5 노이즈캔슬링 헤드폰 블랙 (실사용 1달)",
    category: "digital",
    seller: {
      name: "마포사운드",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
      rating: 4.8,
      mannerTemp: 99.0,
      reviewsCount: 68,
      isVerified: true,
      tradeLocation: "합정역 / 홍대입구역 직거래",
      location: "서울시 마포구"
    },
    images: [
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80"
    ],
    startingPrice: 280000,
    currentPrice: 345000,
    minStep: 5000,
    maxPrice: 550000,
    endTime: Date.now() + 1000 * 60 * 110,
    bidsCount: 9,
    views: 215,
    likes: 24,
    description: `에어팟 맥스랑 병행해서 쓰다가 결국 이어폰 위주로만 듣게 돼서 방출합니다.
실내 스터디카페에서만 가끔 착용했고 헤드밴드나 이어패드 꺼짐/가죽 벗겨짐 일절 없습니다.
- 소니 코리아 정품 등록 가능
- 전용 하드 케이스, 오디오 AUX 케이블, C타입 정품 충전선, 정품 박스 풀세트
직거래는 합정역이나 상수역 근처에서 가능합니다.`,
    bidHistory: [
      { id: 201, bidder: "음악소년*", amount: 345000, time: "1분 전", isUser: false },
      { id: 202, bidder: "소니홀릭*", amount: 330000, time: "11분 전", isUser: false },
      { id: 203, bidder: "베이스킹*", amount: 310000, time: "35분 전", isUser: false }
    ]
  },
  {
    id: 3,
    title: "후지필름 X100V 실버 (컷수 1,240회, 정품 풀박스 + 악세서리)",
    category: "camera",
    seller: {
      name: "분당스냅_현",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
      rating: 5.0,
      mannerTemp: 100.0,
      reviewsCount: 25,
      isVerified: true,
      tradeLocation: "분당 서현역 / 정자역 직거래",
      location: "경기도 성남시 분당구"
    },
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80"
    ],
    startingPrice: 1800000,
    currentPrice: 2280000,
    minStep: 20000,
    maxPrice: 3200000,
    endTime: Date.now() + 1000 * 60 * 14 + 1000 * 45, // 14분 뒤 마감 (긴박!)
    bidsCount: 22,
    views: 940,
    likes: 81,
    description: `개인 소장용으로 아끼던 후지필름 X100V 실버 바디입니다.
메인 바디가 따로 있어 서브로 가끔 여행 갈 때만 챙겨가서 컷수 1200대 초반으로 매우 적습니다.
- 액정 강화유리 부착 완료, 렌즈 알 먼지/스크래치 무
- 정품 렌즈 어댑터 링 + 정품 사각 후드
- 림즈(LIM'S) 천연 가죽 속사 케이스
- 호야 UV 필터 및 정품 추가 배터리 1개 포함 (총 배터리 2개)
고가 제품 특성상 분당 인근 직거래 권장하며, 택배 거래도 꼼꼼히 포장해 드립니다.`,
    bidHistory: [
      { id: 301, bidder: "스냅작가*", amount: 2280000, time: "30초 전", isUser: false },
      { id: 302, bidder: "클래식렌즈*", amount: 2240000, time: "4분 전", isUser: false },
      { id: 303, bidder: "후지색감*", amount: 2180000, time: "9분 전", isUser: false }
    ]
  },
  {
    id: 4,
    title: "[KREAM 검수완료] 조던 1 x 트래비스 스캇 리버스 모카 270",
    category: "fashion",
    seller: {
      name: "성수스니커즈",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
      rating: 4.9,
      mannerTemp: 99.4,
      reviewsCount: 91,
      isVerified: true,
      tradeLocation: "성수역 인근 직거래 / 우체국 안심택배",
      location: "서울시 성동구"
    },
    images: [
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80"
    ],
    startingPrice: 1200000,
    currentPrice: 1540000,
    minStep: 10000,
    maxPrice: 2400000,
    endTime: Date.now() + 1000 * 60 * 65,
    bidsCount: 17,
    views: 580,
    likes: 53,
    description: `크림(KREAM)에서 직접 합격 검수받은 100% 정품 미착용 새상품(Deadstock)입니다.
신발 보관용 제습제 넣어서 변색 방지 지퍼백에 밀봉 보관했습니다.
- 정품 크림 검수택 및 보증서 그대로 부착
- 속지, 여분 슈레이스 3종, 박스 모서리 찌그러짐 없는 양품
직거래는 성수역 또는 뚝섬역 가능합니다.`,
    bidHistory: [
      { id: 401, bidder: "신발덕후*", amount: 1540000, time: "3분 전", isUser: false },
      { id: 402, bidder: "스캇러버*", amount: 1500000, time: "18분 전", isUser: false }
    ]
  },
  {
    id: 5,
    title: "플스5 슬림 디스크 + 듀얼센스 2개 + 인기 타이틀 3종 일괄",
    category: "digital",
    seller: {
      name: "용산겜돌이",
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
      rating: 4.7,
      mannerTemp: 96.8,
      reviewsCount: 18,
      isVerified: false,
      tradeLocation: "용산역 / 신용산역 직거래",
      location: "서울시 용산구"
    },
    images: [
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80"
    ],
    startingPrice: 450000,
    currentPrice: 530000,
    minStep: 10000,
    maxPrice: 850000,
    endTime: Date.now() + 1000 * 60 * 160,
    bidsCount: 8,
    views: 290,
    likes: 27,
    description: `올해 초에 구매했는데 야근이 많아 실플레이 10시간도 채 못하고 모셔두다 판매합니다.
- 슬림 디스크 본체 풀박스
- 듀얼센스 정품 2개 (화이트 1개 + 미드나잇 블랙 1개)
- 타이틀: 스파이더맨 2, 갓 오브 워 라그나로크, FC 24 (전부 한국어판 디스크)
기기 초기화 및 최신 펌웨어 업데이트 완료해 두었습니다. 가져가셔서 바로 즐기시면 됩니다!`,
    bidHistory: [
      { id: 501, bidder: "콘솔매니아*", amount: 530000, time: "5분 전", isUser: false }
    ]
  }
];

// 카테고리 정보
const CATEGORIES = [
  { id: "all", name: "전체" },
  { id: "digital", name: "디지털/가전" },
  { id: "camera", name: "카메라/렌즈" },
  { id: "fashion", name: "명품/스니커즈" },
  { id: "collect", name: "한정판/아트" }
];
