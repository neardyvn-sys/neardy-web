export const AVATAR_COLORS = [
  "from-violet-500 to-purple-700",
  "from-cyan-500 to-blue-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-indigo-500 to-blue-700",
  "from-fuchsia-500 to-pink-600",
  "from-sky-500 to-cyan-600",
  "from-violet-600 to-indigo-700",
  "from-teal-500 to-emerald-600",
];

export const FEATURES = [
  {
    icon: "📍",
    title: "Khám phá xung quanh",
    desc: "Tìm những người đang ở gần bạn theo thời gian thực",
  },
  {
    icon: "💬",
    title: "Kết nối ngay lập tức",
    desc: "Nhắn tin và kết bạn chỉ trong vài giây",
  },
  {
    icon: "🎯",
    title: "Lọc theo sở thích",
    desc: "Chỉ hiện người online hoặc tìm kiếm theo tên",
  },
];

export const TAB_TITLES: Record<string, string> = {
  nearby: "Gần đây",
  messages: "Tin nhắn",
  contacts: "Danh bạ",
  feed: "Tường nhà",
  profile: "Cá nhân",
};

export const COVER_OPTIONS = [
  "linear-gradient(135deg, #2d1b69, #0f1a3d)",
  "linear-gradient(135deg, #0c4a6e, #0a0c14)",
  "linear-gradient(135deg, #1a1a2e, #6c63ff44)",
  "linear-gradient(135deg, #134e4a, #0a0c14)",
  "linear-gradient(135deg, #4c1d95, #be185d55)",
];

export const MY_PHOTOS = [
  "photo-1554118811-1e0d58224f24",
  "photo-1507525428034-b723cf961d3e",
  "photo-1476480862126-209bfaa8edc8",
  "photo-1580582932707-520aed937b7b",
  "photo-1561070791-2526d30994b5",
  "photo-1456513080510-7bf3a84b82f8",
];

export const MY_VIDEOS = [
  { thumb: "photo-1542751371-adc38448a05e", title: "Buổi sáng ở Hà Nội", duration: "0:42" },
  { thumb: "photo-1569050467447-ce54b3bbc37d", title: "Nấu ăn cuối tuần", duration: "1:15" },
  { thumb: "photo-1434030216411-0b793f4b4173", title: "Học tiếng Anh", duration: "2:03" },
];

export const AUTH_STORAGE_KEY = "neardy_auth_user";
export const FRIENDS_STORAGE_KEY = "neardy_friends";
export const COVER_STORAGE_KEY = "neardy_cover_index";
