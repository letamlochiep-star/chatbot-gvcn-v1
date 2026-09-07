/**
 * DANH MỤC QUY CHUẨN NỀ NẾP & THI ĐUA LỚP 8A6 (V2.5)
 * Gồm 6 nhóm quy định và 40 mã quy chuẩn chuẩn hóa
 */

export interface CompetitionCatalogItem {
  code: string;
  group: string;
  description: string;
  plus: number;
  minus: number;
  minPoints?: number;
  maxPoints?: number;
  serious: boolean;
  keywords?: string[];
}

export const COMPETITION_GROUPS = [
  "Chuyên cần",
  "Học tập",
  "Nề nếp – Tác phong",
  "Vệ sinh – Tài sản",
  "Ứng xử – Đoàn kết",
  "Trách nhiệm – Phong trào",
] as const;

export const DEFAULT_STUDENT_TEAMS: Record<string, number> = {
  "1": 3,
  "2": 4,
  "3": 2,
  "4": 1,
  "5": 2,
  "6": 4,
  "7": 1,
  "8": 1,
  "9": 1,
  "10": 4,
  "11": 4,
  "12": 3,
  "13": 1,
  "14": 2,
  "15": 2,
  "16": 3,
  "17": 3,
  "18": 4,
  "19": 2,
  "20": 4,
  "21": 2,
  "22": 2,
  "23": 4,
  "24": 1,
  "25": 3,
  "26": 4,
  "27": 4,
  "28": 3,
  "29": 1,
  "30": 2,
  "31": 3,
  "32": 1,
  "33": 4,
  "34": 1,
  "35": 1,
  "36": 3,
  "37": 3,
  "38": 1,
  "39": 3,
  "40": 4,
  "41": 4,
  "42": 2,
  "43": 2,
  "44": 1,
  "45": 2,
};

export function getStudentTeam(stt: string | number): number {
  const s = String(stt);
  if (DEFAULT_STUDENT_TEAMS[s]) return DEFAULT_STUDENT_TEAMS[s];
  const num = parseInt(s, 10);
  return isNaN(num) ? 1 : ((num % 4) + 1);
}

export const COMPETITION_CATALOG: CompetitionCatalogItem[] = [
  {
    "code": "CC01",
    "group": "Chuyên cần",
    "description": "Cả tuần đầy đủ, đúng giờ",
    "plus": 2,
    "minus": 0,
    "serious": false,
    "keywords": [
      "đầy đủ đúng giờ",
      "ca tuan dung gio",
      "chuyen can",
      "di hoc day du"
    ]
  },
  {
    "code": "CC02",
    "group": "Chuyên cần",
    "description": "Đi học muộn",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "đi học muộn",
      "di muon",
      "muộn",
      "trễ",
      "di tre",
      "muon 5 phut",
      "muon 7 phut",
      "muon 10 phut"
    ]
  },
  {
    "code": "CC03",
    "group": "Chuyên cần",
    "description": "Nghỉ học không phép",
    "plus": 0,
    "minus": 5,
    "serious": false,
    "keywords": [
      "nghỉ không phép",
      "vắng không phép",
      "nghi hoc khong phep",
      "khong phep",
      "vang khong phep"
    ]
  },
  {
    "code": "CC04",
    "group": "Chuyên cần",
    "description": "Bỏ tiết",
    "plus": 0,
    "minus": 5,
    "serious": false,
    "keywords": [
      "bỏ tiết",
      "bo tiet",
      "tron tiet"
    ]
  },
  {
    "code": "CC05",
    "group": "Chuyên cần",
    "description": "Vào lớp/chậm tập trung sau ra chơi",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "vào lớp muộn sau ra chơi",
      "chậm tập trung",
      "cham tap trung",
      "sau gio ra choi"
    ]
  },
  {
    "code": "HT01",
    "group": "Học tập",
    "description": "Phát biểu xây dựng bài tốt",
    "plus": 1,
    "minus": 0,
    "serious": false,
    "keywords": [
      "phát biểu",
      "xây dựng bài",
      "phat bieu tot",
      "dong gop y kien",
      "hang hai phat bieu"
    ]
  },
  {
    "code": "HT02",
    "group": "Học tập",
    "description": "Trả lời khó/cách làm sáng tạo",
    "plus": 2,
    "minus": 0,
    "serious": false,
    "keywords": [
      "trả lời khó",
      "cách làm sáng tạo",
      "giai hay",
      "cau hoi kho",
      "sang tao"
    ]
  },
  {
    "code": "HT03",
    "group": "Học tập",
    "description": "Được giáo viên tuyên dương",
    "plus": 2,
    "minus": 0,
    "serious": false,
    "keywords": [
      "tuyên dương",
      "khen",
      "giao vien khen",
      "tuyen duong",
      "thay khen",
      "co khen"
    ]
  },
  {
    "code": "HT04",
    "group": "Học tập",
    "description": "Có tiến bộ rõ rệt",
    "plus": 2,
    "minus": 0,
    "serious": false,
    "keywords": [
      "tiến bộ rõ rệt",
      "tien bo",
      "co gang",
      "tien bo ro ret"
    ]
  },
  {
    "code": "HT05",
    "group": "Học tập",
    "description": "Điểm kiểm tra 9,5–10",
    "plus": 3,
    "minus": 0,
    "serious": false,
    "keywords": [
      "điểm 10",
      "điểm 9.5",
      "kiem tra 10 diem",
      "diem cao",
      "10 diem",
      "9.5 diem"
    ]
  },
  {
    "code": "HT06",
    "group": "Học tập",
    "description": "Quên sách/vở/dụng cụ",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "quên sách",
      "quên vở",
      "quên dụng cụ",
      "thieu sach vo",
      "quen do dung",
      "quen sgk"
    ]
  },
  {
    "code": "HT07",
    "group": "Học tập",
    "description": "Không chuẩn bị bài/không làm bài tập",
    "plus": 0,
    "minus": 2,
    "serious": false,
    "keywords": [
      "không làm bài tập",
      "chưa chuẩn bị bài",
      "khong lam bai tap",
      "chua soan bai",
      "quen bai tap"
    ]
  },
  {
    "code": "HT08",
    "group": "Học tập",
    "description": "Không hoàn thành nhiệm vụ học tập",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "không hoàn thành nhiệm vụ",
      "khong lam nhiem vu",
      "chua xong bai",
      "nhiem vu hoc tap"
    ]
  },
  {
    "code": "HT09",
    "group": "Học tập",
    "description": "Không ghi bài/không tham gia học tập",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "không ghi bài",
      "khong ghi bai",
      "khong tham gia hoc tap",
      "khong chep bai"
    ]
  },
  {
    "code": "HT10",
    "group": "Học tập",
    "description": "Gian lận/nhìn bài/trao đổi bài",
    "plus": 0,
    "minus": 5,
    "serious": true,
    "keywords": [
      "gian lận",
      "nhìn bài",
      "trao đổi bài",
      "quay cop",
      "gian lan thi cu",
      "chep bai ban"
    ]
  },
  {
    "code": "NN01",
    "group": "Nề nếp – Tác phong",
    "description": "Nói chuyện riêng trong giờ",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "nói chuyện riêng",
      "noi chuyen",
      "mat trat tu",
      "noi chuyen trong gio"
    ]
  },
  {
    "code": "NN02",
    "group": "Nề nếp – Tác phong",
    "description": "Làm việc riêng/mất tập trung",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "làm việc riêng",
      "mất tập trung",
      "ngu gat",
      "lam viec rieng",
      "mat tap trung"
    ]
  },
  {
    "code": "NN03",
    "group": "Nề nếp – Tác phong",
    "description": "Gây ồn ảnh hưởng lớp",
    "plus": 0,
    "minus": 2,
    "serious": false,
    "keywords": [
      "gây ồn",
      "ồn ào",
      "lam on anh huong lop",
      "la het"
    ]
  },
  {
    "code": "NN04",
    "group": "Nề nếp – Tác phong",
    "description": "Đùa giỡn trong giờ",
    "plus": 0,
    "minus": 2,
    "serious": false,
    "keywords": [
      "đùa giỡn",
      "dua gion trong gio",
      "nghich ngoi",
      "treu choc trong gio"
    ]
  },
  {
    "code": "NN05",
    "group": "Nề nếp – Tác phong",
    "description": "Sử dụng điện thoại sai quy định",
    "plus": 0,
    "minus": 3,
    "serious": false,
    "keywords": [
      "điện thoại",
      "dien thoai",
      "dung dien thoai sai quy dinh",
      "choi dien thoai"
    ]
  },
  {
    "code": "NN06",
    "group": "Nề nếp – Tác phong",
    "description": "Sai đồng phục/tác phong",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "sai đồng phục",
      "không đeo khăn quàng",
      "khong mang phu hieu",
      "sai tac phong",
      "dong phuc"
    ]
  },
  {
    "code": "NN07",
    "group": "Nề nếp – Tác phong",
    "description": "Tự ý đổi chỗ/rời vị trí/ra lớp",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "tự ý đổi chỗ",
      "rời vị trí",
      "tu y ra khoi lop",
      "doi cho",
      "tu y ra ngoai"
    ]
  },
  {
    "code": "NN08",
    "group": "Nề nếp – Tác phong",
    "description": "Không chấp hành yêu cầu giáo viên",
    "plus": 0,
    "minus": 3,
    "serious": true,
    "keywords": [
      "không chấp hành",
      "chống đối",
      "cai loi giao vien",
      "khong nghe loi",
      "khong chap hanh"
    ]
  },
  {
    "code": "VS01",
    "group": "Vệ sinh – Tài sản",
    "description": "Trực nhật hoàn thành tốt",
    "plus": 2,
    "minus": 0,
    "serious": false,
    "keywords": [
      "trực nhật tốt",
      "truc nhat sach",
      "hoan thanh truc nhat",
      "truc nhat xuat sac"
    ]
  },
  {
    "code": "VS02",
    "group": "Vệ sinh – Tài sản",
    "description": "Chủ động giữ lớp sạch đẹp",
    "plus": 1,
    "minus": 0,
    "serious": false,
    "keywords": [
      "nhặt rác",
      "giữ vệ sinh",
      "ke ban ghe",
      "giu lop sach dep",
      "sach se"
    ]
  },
  {
    "code": "VS03",
    "group": "Vệ sinh – Tài sản",
    "description": "Không trực nhật",
    "plus": 0,
    "minus": 3,
    "serious": false,
    "keywords": [
      "không trực nhật",
      "bo truc nhat",
      "quen truc nhat",
      "khong lam truc nhat"
    ]
  },
  {
    "code": "VS04",
    "group": "Vệ sinh – Tài sản",
    "description": "Trực nhật/vệ sinh chưa đầy đủ",
    "plus": 0,
    "minus": 1,
    "serious": false,
    "keywords": [
      "trực nhật chưa sạch",
      "ve sinh chua day du",
      "chua do rac",
      "truc nhat so sai"
    ]
  },
  {
    "code": "VS05",
    "group": "Vệ sinh – Tài sản",
    "description": "Xả rác/làm bẩn lớp",
    "plus": 0,
    "minus": 2,
    "serious": false,
    "keywords": [
      "xả rác",
      "xa rac",
      "lam ban lop",
      "vut rac bua bai",
      "boc vo keo"
    ]
  },
  {
    "code": "TS01",
    "group": "Vệ sinh – Tài sản",
    "description": "Làm hư hỏng tài sản",
    "plus": 0,
    "minus": 5,
    "minPoints": 3,
    "maxPoints": 10,
    "serious": true,
    "keywords": [
      "làm hỏng tài sản",
      "hư bàn ghế",
      "pha hoai tai san",
      "ve bay len ban",
      "hong thiet bi"
    ]
  },
  {
    "code": "UX01",
    "group": "Ứng xử – Đoàn kết",
    "description": "Giúp bạn trong học tập",
    "plus": 1,
    "minus": 0,
    "serious": false,
    "keywords": [
      "giúp bạn học tập",
      "chi bai cho ban",
      "giup do ban",
      "huong dan ban hoc"
    ]
  },
  {
    "code": "UX02",
    "group": "Ứng xử – Đoàn kết",
    "description": "Hành động đẹp/trung thực",
    "plus": 2,
    "minus": 0,
    "serious": false,
    "keywords": [
      "hành động đẹp",
      "trung thực",
      "nhat duoc cua roi",
      "tra lai cua roi",
      "thanh that"
    ]
  },
  {
    "code": "UX03",
    "group": "Ứng xử – Đoàn kết",
    "description": "Hỗ trợ/hòa giải/bảo vệ bạn đúng cách",
    "plus": 2,
    "minus": 0,
    "serious": false,
    "keywords": [
      "hòa giải",
      "bảo vệ bạn",
      "giup ban khi kho khan",
      "hoa giai mau thuan",
      "doan ket"
    ]
  },
  {
    "code": "UX04",
    "group": "Ứng xử – Đoàn kết",
    "description": "Nói tục/trêu chọc bạn",
    "plus": 0,
    "minus": 2,
    "serious": false,
    "keywords": [
      "nói tục",
      "chửi thề",
      "trêu chọc bạn",
      "treu choc",
      "noi bay",
      "chui bay"
    ]
  },
  {
    "code": "UX05",
    "group": "Ứng xử – Đoàn kết",
    "description": "Xúc phạm/đồn sai sự thật",
    "plus": 0,
    "minus": 4,
    "serious": true,
    "keywords": [
      "xúc phạm bạn",
      "đồn sai sự thật",
      "noi xau",
      "xuc pham",
      "lan truyen tin don"
    ]
  },
  {
    "code": "UX06",
    "group": "Ứng xử – Đoàn kết",
    "description": "Bắt nạt/bắt nạt trên mạng",
    "plus": 0,
    "minus": 8,
    "serious": true,
    "keywords": [
      "bắt nạt",
      "bat nat",
      "cyberbullying",
      "bat nat tren mang",
      "co lap ban"
    ]
  },
  {
    "code": "UX07",
    "group": "Ứng xử – Đoàn kết",
    "description": "Đánh nhau/bạo lực",
    "plus": 0,
    "minus": 10,
    "serious": true,
    "keywords": [
      "đánh nhau",
      "danh nhau",
      "bao luc",
      "xo xat",
      "gay go danh nhau"
    ]
  },
  {
    "code": "TN01",
    "group": "Trách nhiệm – Phong trào",
    "description": "Hoàn thành tốt nhiệm vụ được giao",
    "plus": 1,
    "minus": 0,
    "serious": false,
    "keywords": [
      "hoàn thành nhiệm vụ",
      "lam tot nhiem vu",
      "trach nhiem tot",
      "nhiem vu duoc giao"
    ]
  },
  {
    "code": "TN02",
    "group": "Trách nhiệm – Phong trào",
    "description": "Không hoàn thành/quên nhiệm vụ",
    "plus": 0,
    "minus": 2,
    "serious": false,
    "keywords": [
      "quên nhiệm vụ",
      "không làm nhiệm vụ",
      "bo be nhiem vu",
      "khong hoan thanh nhiem vu"
    ]
  },
  {
    "code": "PT01",
    "group": "Trách nhiệm – Phong trào",
    "description": "Tham gia đầy đủ hoạt động tập thể",
    "plus": 1,
    "minus": 0,
    "serious": false,
    "keywords": [
      "tham gia phong trào",
      "hoạt động tập thể",
      "tham gia day du",
      "phong trao lop"
    ]
  },
  {
    "code": "PT02",
    "group": "Trách nhiệm – Phong trào",
    "description": "Đóng góp nổi bật/đạt thành tích",
    "plus": 3,
    "minus": 0,
    "minPoints": 2,
    "maxPoints": 5,
    "serious": false,
    "keywords": [
      "đạt giải",
      "thành tích xuất sắc",
      "dong gop noi bat",
      "giai nhat",
      "giai nhi",
      "giai ba"
    ]
  }
];

export function normalizeVietnamese(str: string): string {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

/**
 * Tìm mã sự việc theo mã hoặc từ khóa
 */
export function findCatalogItemByCode(code: string): CompetitionCatalogItem | undefined {
  const clean = code.trim().toUpperCase();
  return COMPETITION_CATALOG.find((item) => item.code.toUpperCase() === clean);
}

/**
 * Nhận dạng sự việc qua ngôn ngữ tự nhiên Chatbot AI
 */
export function parseNaturalLanguageEvent(
  text: string,
  students: { studentId: string; fullName: string; team?: number }[]
): {
  matched: boolean;
  suggestion?: {
    studentId: string;
    studentName: string;
    team: number;
    code: string;
    group: string;
    description: string;
    plus: number;
    minus: number;
    serious: boolean;
    confidence: number;
    note: string;
  };
  message?: string;
} {
  const raw = text.trim();
  const normText = normalizeVietnamese(raw);

  if (!normText) {
    return { matched: false, message: "Vui lòng nhập nội dung mô tả sự việc." };
  }

  // 1. Tìm học sinh khớp nhất
  let matchedStudent: { studentId: string; fullName: string; team?: number } | null = null;
  let maxScore = 0;

  for (const s of students) {
    const normName = normalizeVietnamese(s.fullName);
    const nameParts = normName.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1]; // Tên chính (ví dụ: An, Bảo, Quân, Hương...)

    // Khớp họ tên đầy đủ
    if (normText.includes(normName)) {
      matchedStudent = s;
      maxScore = 100;
      break;
    }

    // Khớp tên đệm + tên chính (ví dụ: Bảo Hân, Gia Bảo, Minh Hiếu)
    if (nameParts.length >= 2) {
      const shortName = nameParts.slice(-2).join(" ");
      if (normText.includes(shortName)) {
        if (maxScore < 80) {
          matchedStudent = s;
          maxScore = 80;
        }
      }
    }

    // Khớp tên chính (ví dụ: Minh, Huy, Lan, Khang...)
    const nameRegex = new RegExp(`\\b${lastName}\\b`, "i");
    if (nameRegex.test(normText)) {
      if (maxScore < 50) {
        matchedStudent = s;
        maxScore = 50;
      }
    }
  }

  if (!matchedStudent && students.length > 0) {
    // Thử tìm theo ID học sinh (ví dụ HS011, 11, STT 11)
    const idMatch = raw.match(/\b(?:HS|STT)?\s*0*([1-9][0-9]?)\b/i);
    if (idMatch) {
      const num = parseInt(idMatch[1], 10);
      const found = students.find((s) => {
        const sNum = parseInt(s.studentId.replace(/\D/g, ""), 10);
        return sNum === num;
      });
      if (found) {
        matchedStudent = found;
        maxScore = 90;
      }
    }
  }

  // 2. Tìm mã quy định trong catalog khớp nhất
  let matchedItem: CompetitionCatalogItem | null = null;
  let bestItemScore = 0;

  for (const item of COMPETITION_CATALOG) {
    // 2.1 Khớp trực tiếp mã (CC02, HT01...)
    const codeRegex = new RegExp(`\\b${item.code}\\b`, "i");
    if (codeRegex.test(raw)) {
      matchedItem = item;
      bestItemScore = 100;
      break;
    }

    // 2.2 Khớp từ khóa keywords
    if (item.keywords && item.keywords.length > 0) {
      for (const kw of item.keywords) {
        const normKw = normalizeVietnamese(kw);
        if (normText.includes(normKw)) {
          if (bestItemScore < 85) {
            matchedItem = item;
            bestItemScore = 85;
          }
        }
      }
    }

    // 2.3 Khớp mô tả description
    const normDesc = normalizeVietnamese(item.description);
    const descWords = normDesc.split(/\s+/).filter((w) => w.length > 2);
    let matchWordCount = 0;
    for (const w of descWords) {
      if (normText.includes(w)) matchWordCount++;
    }
    if (descWords.length > 0 && matchWordCount >= 2) {
      const score = (matchWordCount / descWords.length) * 60;
      if (score > bestItemScore) {
        bestItemScore = score;
        matchedItem = item;
      }
    }
  }

  // Nhận diện đặc thù các từ thông dụng nếu chưa khớp
  if (!matchedItem) {
    if (normText.includes("muon") || normText.includes("tre")) {
      matchedItem = findCatalogItemByCode("CC02") || null;
    } else if (normText.includes("phat bieu") || normText.includes("xay dung bai")) {
      matchedItem = findCatalogItemByCode("HT01") || null;
    } else if (normText.includes("10 diem") || normText.includes("diem 10") || normText.includes("9.5 diem")) {
      matchedItem = findCatalogItemByCode("HT05") || null;
    } else if (normText.includes("khong truc nhat") || normText.includes("quen truc nhat") || normText.includes("bo truc nhat")) {
      matchedItem = findCatalogItemByCode("VS03") || null;
    } else if (normText.includes("truc nhat tot") || normText.includes("truc nhat sach")) {
      matchedItem = findCatalogItemByCode("VS01") || null;
    } else if (normText.includes("dong phuc") || normText.includes("khan quang")) {
      matchedItem = findCatalogItemByCode("NN06") || null;
    } else if (normText.includes("noi chuyen") || normText.includes("mat trat tu")) {
      matchedItem = findCatalogItemByCode("NN01") || null;
    } else if (normText.includes("lam viec rieng")) {
      matchedItem = findCatalogItemByCode("NN02") || null;
    } else if (normText.includes("quen sach") || normText.includes("quen vo") || normText.includes("quen dung cu")) {
      matchedItem = findCatalogItemByCode("HT06") || null;
    } else if (normText.includes("chua lam bai") || normText.includes("khong lam bai")) {
      matchedItem = findCatalogItemByCode("HT07") || null;
    } else if (normText.includes("dien thoai")) {
      matchedItem = findCatalogItemByCode("NN05") || null;
    } else if (normText.includes("giup ban")) {
      matchedItem = findCatalogItemByCode("UX01") || null;
    } else if (normText.includes("noi tuc") || normText.includes("chui the")) {
      matchedItem = findCatalogItemByCode("UX04") || null;
    } else if (normText.includes("danh nhau")) {
      matchedItem = findCatalogItemByCode("UX07") || null;
    }
  }

  if (matchedStudent && matchedItem) {
    return {
      matched: true,
      suggestion: {
        studentId: matchedStudent.studentId,
        studentName: matchedStudent.fullName,
        team: matchedStudent.team || 1,
        code: matchedItem.code,
        group: matchedItem.group,
        description: matchedItem.description,
        plus: matchedItem.plus,
        minus: matchedItem.minus,
        serious: matchedItem.serious,
        confidence: Math.round(((maxScore + (bestItemScore || 75)) / 200) * 100) / 100,
        note: raw,
      },
    };
  }

  if (matchedStudent && !matchedItem) {
    return {
      matched: false,
      message: `Đã nhận diện học sinh: ${matchedStudent.fullName}, nhưng chưa xác định được mã nề nếp/khen thưởng tương ứng trong 40 mã quy chuẩn. Vui lòng nêu rõ hành vi (ví dụ: "đi học muộn", "phát biểu bài", "quên bài tập").`,
    };
  }

  if (!matchedStudent && matchedItem) {
    return {
      matched: false,
      message: `Đã nhận diện sự việc: ${matchedItem.code} - ${matchedItem.description}, nhưng chưa rõ tên học sinh nào. Hãy nêu họ tên học sinh trong câu.`,
    };
  }

  return {
    matched: false,
    message: 'Chưa nhận diện được học sinh và nội dung nề nếp. Ví dụ: "Minh đi học muộn", "Lan phát biểu xây dựng bài tốt", "Huy không trực nhật".',
  };
}
