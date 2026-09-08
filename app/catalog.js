const CATEGORIES = [];
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
