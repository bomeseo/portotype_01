/* Fixtures for local prototype sessions. Never represent verified real-world facts. */
const DemoData = {
  create() {
    const now = Date.now();
    const user = {
      id: "me",
      name: "초록수집가",
      bio: "오래 쓸 좋은 물건을 좋아합니다.",
      location: "서울 성동구",
      method: "둘 다",
      phone: "",
      verified: false,
      interests: ["digital", "camera"],
      publicHistory: true,
      showOnline: true,
      dnd: { enabled: false, start: "23:00", end: "08:00" },
      status: "active",
    };
    const auctions = JSON.parse(JSON.stringify(INITIAL_AUCTIONS)).map(
      (a, i) => ({
        ...a,
        sellerId: "seller-" + a.id,
        status: "active",
        createdAt: now - (i + 1) * 3600000,
        condition: i === 3 ? "새 상품" : "거의 새것",
        method: "둘 다",
        location: a.seller.location,
        subcategory: i === 3 ? "스니커즈" : i === 2 ? "카메라" : "디지털",
        brand: ["Apple", "Sony", "Fujifilm", "Nike", "Sony"][i],
        model: [
          "Watch Ultra 2",
          "WH-1000XM5",
          "X100V",
          "Jordan 1",
          "PlayStation 5",
        ][i],
        bidHistory: a.bidHistory.map((b) => ({
          ...b,
          userId: "guest",
          at: now - b.id * 1000,
        })),
      }),
    );
    const sellers = Object.fromEntries(
      auctions.map((a, i) => [
        a.sellerId,
        {
          ...a.seller,
          id: a.sellerId,
          verified: a.seller.isVerified,
          status: "active",
          publicHistory: i !== 2,
          showOnline: true,
          lastSeen: now - i * 7 * 60000,
          demoOnline: i === 0,
          dnd: { enabled: i === 1, start: "00:00", end: "23:59" },
          fraud: i === 4 ? "review" : "clear",
          bio: [
            "아끼던 기기를 좋은 분께 전합니다.",
            "음악과 작은 취향을 나눕니다.",
            "주말마다 사진을 찍어요.",
            "신발을 좋아하는 성수 주민입니다.",
            "게임 이야기 환영합니다.",
          ][i],
        },
      ]),
    );
    auctions.push({
      id: 6,
      title: "주말에 쓰던 소니 헤드폰, 깨끗하게 보관했어요",
      sellerId: "me",
      category: "digital",
      subcategory: "헤드폰",
      images: [INITIAL_AUCTIONS[1].images[0]],
      startingPrice: 180000,
      currentPrice: 180000,
      minStep: 5000,
      endTime: now + 86400000,
      createdAt: now,
      bidsCount: 0,
      views: 12,
      likes: 2,
      description:
        "실내에서만 사용했습니다. 구성품 모두 있고 성수역에서 확인 후 거래할 수 있어요.",
      condition: "사용감 적음",
      method: "직거래",
      location: user.location,
      brand: "Sony",
      model: "WH-1000XM5",
      status: "active",
      bidHistory: [],
    });
    return {
      version: 3,
      user,
      sellers,
      auctions,
      likes: [1, 3],
      blocked: [],
      bids: [],
      chats: [
        {
          id: "chat-1",
          auctionId: 1,
          peerId: "seller-1",
          unread: 1,
          messages: [
            {
              id: "msg-1",
              mine: false,
              text: "안녕하세요! 상품 궁금하신 점 편하게 남겨주세요. 판교역 직거래 가능합니다.",
              at: now - 420000,
              kind: "text",
            },
          ],
        },
      ],
      trades: [
        {
          id: "trade-demo",
          auctionId: 2,
          peerId: "seller-2",
          title: "소니 WH-1000XM5 헤드폰",
          amount: 320000,
          role: "buyer",
          status: "협의 중",
          at: now - 86400000,
          demo: true,
        },
      ],
      reviews: [
        {
          id: "review-1",
          sellerId: "seller-1",
          author: "주말산책",
          rating: 5,
          text: "사진과 상태가 같았고 약속 시간도 잘 지켜주셨어요.",
          at: now - 86400000 * 3,
        },
        {
          id: "review-2",
          sellerId: "seller-1",
          author: "작은취향",
          rating: 5,
          text: "사용법까지 차근차근 알려주셔서 좋았습니다.",
          at: now - 86400000 * 8,
        },
      ],
      reports: [],
      tickets: [],
      notifications: [
        {
          id: "welcome",
          title: "반가워요, 초록수집가님",
          text: "관심 상품을 찜하고 첫 경매에 참여해 보세요.",
          at: now,
          read: false,
        },
      ],
      bannedPhones: ["01000000000"],
    };
  },
};
CATEGORIES.splice(
  0,
  CATEGORIES.length,
  { id: "all", name: "전체" },
  { id: "digital", name: "디지털·가전" },
  { id: "camera", name: "카메라" },
  { id: "fashion", name: "패션" },
  { id: "collect", name: "카드·수집품" },
  { id: "life", name: "생활·취미" },
);
const SUBCATEGORIES = {
  digital: ["전체", "헤드폰", "스마트워치", "게임기"],
  camera: ["전체", "카메라", "렌즈"],
  fashion: ["전체", "후드", "슬리퍼", "스니커즈"],
  collect: ["전체", "트레이딩 카드", "피규어"],
  life: ["전체", "가구", "취미용품"],
};
