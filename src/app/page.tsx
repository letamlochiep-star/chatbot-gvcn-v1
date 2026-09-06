"use client";

import React, { useState, useEffect, useRef } from "react";
import { AuthSession, StudentRecord, StudentSummary } from "@/lib/types";
import { StudentDetailView } from "@/components/StudentDetailView";
import { StudentPortalView } from "@/components/StudentPortalView";
import { AuthModal } from "@/components/AuthModal";
import { TeacherInboxModal } from "@/components/TeacherInboxModal";
import { AttendanceConductModal } from "@/components/AttendanceConductModal";
import { SpecialWatchlistModal } from "@/components/SpecialWatchlistModal";
import { BirthdayCalendarModal } from "@/components/BirthdayCalendarModal";
import { UpdatedProfilesModal } from "@/components/UpdatedProfilesModal";
import { ParentDirectoryModal } from "@/components/ParentDirectoryModal";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface MessageItem {
  id: string;
  type: "user" | "bot";
  text?: string;
  isIntro?: boolean;
  matches?: StudentSummary[];
  singleStudent?: StudentRecord;
  isError?: boolean;
  timestamp?: number;
}

interface StudentOption {
  stt: string;
  hoVaTen: string;
  gioiTinh: string;
  ngaySinh: string;
}

const DEFAULT_INTRO_MESSAGE: MessageItem = {
  id: "intro",
  type: "bot",
  isIntro: true,
  text: "Xin chào Thầy/Cô! Thầy/Cô có thể chọn trực tiếp học sinh từ Menu thả xuống hoặc tra cứu theo STT / họ tên.",
};

const CHAT_STORAGE_KEY = "chat_history_teacher_8a6_v1";

export default function HomePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([DEFAULT_INTRO_MESSAGE]);
  const [modalStudent, setModalStudent] = useState<StudentRecord | null>(null);
  const [fetchingDetailStt, setFetchingDetailStt] = useState<string | null>(null);
  const [showUpdatedProfilesModal, setShowUpdatedProfilesModal] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showParentDirectoryModal, setShowParentDirectoryModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  // State cho Dropdown chọn học sinh theo tên (không cần gõ)
  const [studentList, setStudentList] = useState<StudentOption[]>([]);
  const [selectedStt, setSelectedStt] = useState<string>("");
  const [sortMode, setSortMode] = useState<"stt" | "name">("stt");

  const streamEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/messages?countOnly=true");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && typeof data.unreadCount === "number") {
          setUnreadInboxCount(data.unreadCount);
        }
      }
    } catch {}
  };

  const fetchStudentList = async () => {
    try {
      const res = await fetch("/api/student/list");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.students)) {
          setStudentList(data.students);
        }
      }
    } catch (e) {
      console.error("Lỗi tải danh sách học sinh dropdown:", e);
    }
  };

  // 1. Kiểm tra phiên đăng nhập & khôi phục lịch sử chat từ localStorage
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setSession(data.user);
          }
        }
      } catch {
        // Unauthenticated
      } finally {
        setCheckingAuth(false);
      }

      // Tải số lượng tin nhắn chưa đọc
      fetchUnreadCount();

      // Tải danh sách học sinh cho Dropdown
      fetchStudentList();

      // Khôi phục lịch sử chat đã lưu
      try {
        const savedChat = localStorage.getItem(CHAT_STORAGE_KEY);
        if (savedChat) {
          const parsed = JSON.parse(savedChat);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.error("Lỗi đọc lịch sử chat từ localStorage:", e);
      }
    }

    init();

    // 1. Lắng nghe realtime tin nhắn để cập nhật badge số tin chưa đọc (nếu có Firebase)
    let unsub: (() => void) | undefined;
    const db = getFirebaseDb();
    if (db) {
      try {
        unsub = onSnapshot(collection(db, "messages"), (snap) => {
          let count = 0;
          snap.forEach((doc) => {
            const d = doc.data();
            if (d.sender === "student" && d.status === "unread") {
              count++;
            }
          });
          setUnreadInboxCount(count);
        });
      } catch {}
    }

    // 2. Auto-Polling 3s cập nhật huy hiệu số tin chưa đọc
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchUnreadCount();
    }, 3000);

    return () => {
      if (unsub) unsub();
      clearInterval(interval);
    };
  }, []);

  // 2. Lưu tin nhắn chat vào localStorage mỗi khi có thay đổi
  useEffect(() => {
    if (messages.length > 0 && typeof window !== "undefined") {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error("Lỗi lưu lịch sử chat:", e);
      }
    }
  }, [messages]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (session?.role !== "student") {
      streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, session?.role]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession(null);
    } catch {
      setSession(null);
    }
  };

  const handleClearChatHistory = () => {
    if (window.confirm("Thầy/Cô có muốn xóa toàn bộ lịch sử tra cứu trên màn hình này không?")) {
      const reset = [DEFAULT_INTRO_MESSAGE];
      setMessages(reset);
      try {
        localStorage.removeItem(CHAT_STORAGE_KEY);
      } catch {}
    }
  };

  const executeSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q || loading) return;

    // Thêm tin nhắn của User
    const userMsgId = `user-${Date.now()}`;
    const userMsg: MessageItem = { id: userMsgId, type: "user", text: q, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (res.status === 401) {
        setSession(null);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            type: "bot",
            isError: true,
            text: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            type: "bot",
            isError: true,
            text: data.message || "Không thể thực hiện tra cứu vào lúc này.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      // 1. Không có kết quả
      if (!data.matches || data.matches.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            type: "bot",
            text: data.message || "Không tìm thấy học sinh phù hợp. Hãy kiểm tra lại STT hoặc cụm họ tên.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      // 2. Đúng 1 kết quả
      if (data.matches.length === 1 && data.singleStudent) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            type: "bot",
            text: "Đã tìm thấy hồ sơ. Thông tin học sinh như sau:",
            singleStudent: data.singleStudent,
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      // 3. Nhiều kết quả
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          type: "bot",
          text: "Tôi tìm thấy nhiều học sinh phù hợp. Hãy chọn đúng học sinh trong danh sách bên dưới.",
          matches: data.matches,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          type: "bot",
          isError: true,
          text: "Hệ thống tạm thời chưa đọc được dữ liệu lớp 8A6. Vui lòng thử lại hoặc liên hệ quản trị viên.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleOpenStudentDetail = async (stt: string) => {
    setFetchingDetailStt(stt);
    try {
      const res = await fetch(`/api/student/${stt}`);
      const data = await res.json();
      if (res.ok && data.ok && data.student) {
        setModalStudent(data.student);
      } else {
        alert(data.message || "Không thể tải chi tiết học sinh.");
      }
    } catch {
      alert("Lỗi tải chi tiết học sinh.");
    } finally {
      setFetchingDetailStt(null);
    }
  };

  // Cập nhật thông tin học sinh khi giáo viên lưu đánh giá
  const handleStudentUpdate = (updated: StudentRecord) => {
    if (modalStudent && modalStudent.stt === updated.stt) {
      setModalStudent(updated);
    }

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.singleStudent && msg.singleStudent.stt === updated.stt) {
          return {
            ...msg,
            singleStudent: updated,
          };
        }
        return msg;
      })
    );
  };

  const handleSelectStudent = (stt: string) => {
    setSelectedStt(stt);
    if (!stt) return;
    const found = studentList.find((s) => s.stt === stt);
    if (found) {
      executeSearch(found.stt);
    }
  };

  const sortedStudents = React.useMemo(() => {
    return [...studentList].sort((a, b) => {
      if (sortMode === "name") {
        const getLastName = (name: string) => {
          const parts = name.trim().split(/\s+/);
          return parts[parts.length - 1] || "";
        };
        const lastNameA = getLastName(a.hoVaTen);
        const lastNameB = getLastName(b.hoVaTen);
        const cmp = lastNameA.localeCompare(lastNameB, "vi");
        if (cmp !== 0) return cmp;
        return a.hoVaTen.localeCompare(b.hoVaTen, "vi");
      }
      const numA = parseInt(a.stt, 10);
      const numB = parseInt(b.stt, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.stt.localeCompare(b.stt);
    });
  }, [studentList, sortMode]);

  const useSample = (val: string) => {
    setQuery(val);
    executeSearch(val);
  };

  return (
    <div className="max-w-[1320px] mx-auto p-2 sm:p-4 md:p-6 min-h-screen">
      {/* AUTH MODAL KHI CHƯA ĐĂNG NHẬP */}
      {!checkingAuth && !session && (
        <AuthModal onSuccess={(user) => setSession(user)} />
      )}

      {/* 1. SỔ LƯU TRỮ THÔNG TIN HỌC SINH ĐÃ CẬP NHẬT */}
      {showUpdatedProfilesModal && (
        <UpdatedProfilesModal
          onClose={() => setShowUpdatedProfilesModal(false)}
          onOpenStudentProfile={(stt) => handleOpenStudentDetail(stt)}
        />
      )}

      {/* 2. HÒM THƯ TIẾP NHẬN Ý KIẾN HỌC SINH DÀNH CHO GVCN */}
      {showInboxModal && (
        <TeacherInboxModal
          onClose={() => {
            setShowInboxModal(false);
            fetchUnreadCount();
          }}
          onOpenStudentProfile={(stt) => handleOpenStudentDetail(stt)}
        />
      )}

      {/* 3. MODAL DANH SÁCH HỌC SINH CẦN QUAN TÂM ĐẶC BIỆT */}
      {showWatchlistModal && (
        <SpecialWatchlistModal
          onClose={() => setShowWatchlistModal(false)}
          onOpenStudentProfile={(stt) => handleOpenStudentDetail(stt)}
        />
      )}

      {/* 4. MODAL DANH BẠ ĐIỆN THOẠI BỐ HOẶC MẸ */}
      {showParentDirectoryModal && (
        <ParentDirectoryModal
          onClose={() => setShowParentDirectoryModal(false)}
          onOpenStudentProfile={(stt) => handleOpenStudentDetail(stt)}
        />
      )}

      {/* TIỆN ÍCH MỞ RỘNG: ĐIỂM DANH & SỔ NỀ NẾP */}
      {showAttendanceModal && (
        <AttendanceConductModal
          onClose={() => setShowAttendanceModal(false)}
          onOpenStudentProfile={(stt) => handleOpenStudentDetail(stt)}
        />
      )}

      {/* TIỆN ÍCH MỞ RỘNG: LỊCH SINH NHẬT 12 THÁNG */}
      {showBirthdayModal && (
        <BirthdayCalendarModal
          onClose={() => setShowBirthdayModal(false)}
          onOpenStudentProfile={(stt) => handleOpenStudentDetail(stt)}
        />
      )}

      {/* NẾU LÀ HỌC SINH ĐĂNG NHẬP -> HIỂN THỊ CỔNG HỌC SINH (STUDENT PORTAL) */}
      {session && session.role === "student" ? (
        <StudentPortalView session={session} onLogout={handleLogout} />
      ) : (
        /* NẾU LÀ GIÁO VIÊN / ADMIN -> HIỂN THỊ WORKSPACE TRA CỨU 8A6 */
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4 md:gap-6">
          {/* MODAL CHI TIẾT HỌC SINH */}
          {modalStudent && (
            <StudentDetailView
              student={modalStudent}
              onClose={() => setModalStudent(null)}
              isModal={true}
              isTeacher={true}
              onStudentUpdate={handleStudentUpdate}
            />
          )}

          {/* DESKTOP SIDEBAR (ẨN TRÊN MOBILE ĐỂ TỐI ƯU KHÔNG GIAN) */}
          <aside className="hidden lg:flex bg-gradient-to-br from-[#124f83] via-primary to-[#2d82bf] text-white rounded-3xl p-5 shadow-xl flex-col justify-between self-start sticky top-6 min-h-[calc(100vh-48px)]">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-2xl mb-4 backdrop-blur-md">
                🎓
              </div>

              <h2 className="text-base font-bold uppercase tracking-wide leading-tight">
                THCS Quang Trung
              </h2>
              <div className="text-[11px] text-blue-100 uppercase tracking-wider mt-0.5 font-semibold">
                Xuân Hương - Đà Lạt
              </div>

              <div className="h-px bg-white/20 my-4" />

              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-2.5">
                CÔNG CỤ GIÁO VIÊN 8A6
              </div>

              {/* Bộ 4 công cụ chính đúng theo yêu cầu */}
              <div className="space-y-2.5 mb-3">
                {/* 1. Lưu trữ thông tin học sinh đã cập nhật */}
                <button
                  type="button"
                  onClick={() => setShowUpdatedProfilesModal(true)}
                  className="w-full text-left p-2.5 bg-white text-[#123f62] hover:bg-blue-50 font-bold rounded-2xl text-xs transition shadow-md flex items-start gap-2.5 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-primary flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                    📂
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs leading-tight text-[#0e3b5e]">
                      1. Lưu trữ thông tin học sinh đã cập nhật
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5 font-normal leading-tight">
                      Sổ theo dõi hồ sơ & tâm tư đã cập nhật
                    </div>
                  </div>
                </button>

                {/* 2. Tin nhắn từ học sinh */}
                <button
                  type="button"
                  onClick={() => setShowInboxModal(true)}
                  className="w-full text-left p-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl text-xs transition border border-white/25 flex items-start gap-2.5 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                    📬
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs leading-tight">
                        2. Tin nhắn từ học sinh
                      </span>
                      {unreadInboxCount > 0 ? (
                        <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold animate-pulse shrink-0">
                          {unreadInboxCount} mới
                        </span>
                      ) : (
                        <span className="text-[10px] text-blue-200">0 tin</span>
                      )}
                    </div>
                    <div className="text-[10px] text-blue-100 mt-0.5 font-normal leading-tight">
                      Hòm thư tiếp nhận ý kiến & phản hồi 8A6
                    </div>
                  </div>
                </button>

                {/* 3. Những đối tượng học sinh cần chú ý và quan tâm nhất */}
                <button
                  type="button"
                  onClick={() => setShowWatchlistModal(true)}
                  className="w-full text-left p-2.5 bg-amber-400/20 hover:bg-amber-400/30 text-white font-bold rounded-2xl text-xs transition border border-amber-300/40 flex items-start gap-2.5 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-400/30 text-amber-200 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                    ⚡
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs leading-tight text-amber-100">
                      3. Đối tượng HS cần chú ý & quan tâm nhất
                    </div>
                    <div className="text-[10px] text-amber-200/80 mt-0.5 font-normal leading-tight">
                      Chính sách, sức khỏe, học lực, tâm tư riêng
                    </div>
                  </div>
                </button>

                {/* 4. Danh bạ điện thoại của bố hoặc mẹ */}
                <button
                  type="button"
                  onClick={() => setShowParentDirectoryModal(true)}
                  className="w-full text-left p-2.5 bg-emerald-400/20 hover:bg-emerald-400/30 text-white font-bold rounded-2xl text-xs transition border border-emerald-300/40 flex items-start gap-2.5 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-400/30 text-emerald-200 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                    📞
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs leading-tight text-emerald-100">
                      4. Danh bạ điện thoại của bố hoặc mẹ
                    </div>
                    <div className="text-[10px] text-emerald-200/80 mt-0.5 font-normal leading-tight">
                      Gọi điện, Zalo, sao chép & tin nhắn mẫu 1-chạm
                    </div>
                  </div>
                </button>
              </div>

              <div className="h-px bg-white/20 my-3" />

              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-2">
                TIỆN ÍCH BỔ SỢ
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-4">
                <button
                  onClick={() => setShowAttendanceModal(true)}
                  className="py-2 px-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>📋</span> Điểm danh
                </button>
                <button
                  onClick={() => setShowBirthdayModal(true)}
                  className="py-2 px-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>🎂</span> Sinh nhật
                </button>
              </div>
            </div>

            {/* Sidebar Footer & Auth Status */}
            <div className="mt-6 pt-3 border-t border-white/20 text-[11px] text-blue-100">
              {session ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[150px]">👤 {session.name}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded-md font-bold text-[9px]">
                      GVCN
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full py-1.5 px-3 bg-white/15 hover:bg-white/25 rounded-lg text-white font-bold transition text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div>Chưa xác thực quyền truy cập</div>
              )}
            </div>
          </aside>

          {/* RIGHT MAIN WORKSPACE */}
          <main className="flex flex-col gap-3 sm:gap-4 min-w-0">
            {/* MOBILE COMPACT TOP BAR (HIỂN THỊ TRÊN ĐIỆN THOẠI) */}
            <div className="lg:hidden bg-gradient-to-r from-[#124f83] to-primary text-white p-3 rounded-2xl shadow-md space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">🎓</span>
                  <div className="min-w-0">
                    <h2 className="text-xs font-bold uppercase truncate">
                      THCS Quang Trung · Lớp 8A6
                    </h2>
                    <div className="text-[10px] text-blue-100 truncate">
                      GVCN: {session?.name || "Giáo viên"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                  title="Đăng xuất"
                >
                  🚪
                </button>
              </div>

              {/* Mobile 4 Core Buttons */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  onClick={() => setShowUpdatedProfilesModal(true)}
                  className="py-1.5 px-2 bg-white text-primary rounded-xl text-[11px] font-bold shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>📂</span> 1. HS đã cập nhật
                </button>
                <button
                  onClick={() => setShowInboxModal(true)}
                  className="py-1.5 px-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer relative"
                >
                  <span>📬</span> 2. Tin nhắn HS
                  {unreadInboxCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold animate-pulse">
                      {unreadInboxCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowWatchlistModal(true)}
                  className="py-1.5 px-2 bg-amber-400 text-amber-950 rounded-xl text-[11px] font-bold shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>⚡</span> 3. Cần chú ý nhất
                </button>
                <button
                  onClick={() => setShowParentDirectoryModal(true)}
                  className="py-1.5 px-2 bg-emerald-500 text-white rounded-xl text-[11px] font-bold shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>📞</span> 4. Danh bạ Bố/Mẹ
                </button>
              </div>

              {/* Mobile sub actions */}
              <div className="flex items-center justify-between pt-0.5 text-[11px] border-t border-white/20">
                <span className="text-[10px] text-blue-100">Tiện ích:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowAttendanceModal(true)}
                    className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-medium cursor-pointer"
                  >
                    📋 Điểm danh
                  </button>
                  <button
                    onClick={() => setShowBirthdayModal(true)}
                    className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-medium cursor-pointer"
                  >
                    🎂 Sinh nhật
                  </button>
                </div>
              </div>
            </div>

            {/* HERO BANNER VỚI 4 CÔNG CỤ NHANH */}
            <section className="bg-white border border-line rounded-2xl md:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    CỔNG QUẢN LÝ & CỐ VẤN HỌC SINH 8A6
                  </div>
                  <h1 className="text-lg sm:text-2xl font-bold text-[#123f62] mt-0.5 uppercase tracking-tight">
                    TRA CỨU & ĐỒNG HÀNH HỌC SINH 8A6
                  </h1>
                  <p className="text-xs text-brandText-muted mt-0.5 hidden sm:block">
                    Tra cứu hồ sơ 49 trường, điểm danh 1 chạm, theo dõi nề nếp, sinh nhật và phân tích AI.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearChatHistory}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-brandText-muted rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                    title="Xóa lịch sử hội thoại trên màn hình"
                  >
                    <span>🗑️</span> Xóa hội thoại
                  </button>
                </div>
              </div>

              {/* Quick Action Chips trên Desktop / Tablet */}
              <div className="hidden sm:flex items-center gap-2 pt-1 border-t border-line/60 overflow-x-auto pb-0.5">
                <span className="text-[11px] font-bold text-[#466d87] uppercase shrink-0">Bộ 4 công cụ trọng tâm:</span>
                <button
                  type="button"
                  onClick={() => setShowUpdatedProfilesModal(true)}
                  className="px-3 py-1.5 bg-[#f0f8ff] hover:bg-[#e0f0fe] text-primary border border-[#cde2f2] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>📂</span> 1. Lưu trữ TT học sinh đã cập nhật
                </button>
                <button
                  type="button"
                  onClick={() => setShowInboxModal(true)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 relative"
                >
                  <span>📬</span> 2. Tin nhắn từ học sinh
                  {unreadInboxCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold animate-pulse">
                      {unreadInboxCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWatchlistModal(true)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>⚡</span> 3. Những đối tượng HS cần chú ý & quan tâm nhất
                </button>
                <button
                  type="button"
                  onClick={() => setShowParentDirectoryModal(true)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>📞</span> 4. Danh bạ điện thoại của bố hoặc mẹ
                </button>
                <div className="h-4 w-px bg-line shrink-0 mx-1" />
                <button
                  onClick={() => setShowAttendanceModal(true)}
                  className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-medium transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>📋</span> Điểm danh
                </button>
                <button
                  onClick={() => setShowBirthdayModal(true)}
                  className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-medium transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>🎂</span> Sinh nhật
                </button>
              </div>
            </section>

            {/* WORKSPACE & CHATBOT */}
            <section className="bg-white border border-line rounded-2xl md:rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1">
              {/* SEARCH & DROPDOWN SELECTION BAR */}
              <div className="p-3 sm:p-5 bg-white border-b border-line space-y-3">
                {/* 1. KHU VỰC DROPDOWN CHỌN HỌC SINH THEO TÊN (KHÔNG CẦN GÕ TÊN) */}
                <div className="bg-gradient-to-r from-[#eef7ff] via-[#f4faff] to-[#e8f4fc] border-2 border-[#b5daf6] rounded-2xl p-3 sm:p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label
                      htmlFor="student-dropdown-select"
                      className="text-xs sm:text-sm font-bold text-[#103d61] flex items-center gap-2"
                    >
                      <span className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-xs shadow-sm">
                        👤
                      </span>
                      <span>LỰA CHỌN HỌC SINH THEO TÊN (KHÔNG CẦN GÕ):</span>
                    </label>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-[#466d87] font-semibold hidden sm:inline">Sắp xếp:</span>
                      <button
                        type="button"
                        onClick={() => setSortMode("stt")}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          sortMode === "stt"
                            ? "bg-primary text-white shadow-sm"
                            : "bg-white text-[#3e6888] hover:bg-blue-50 border border-[#d1e5f5]"
                        }`}
                      >
                        Theo STT (1-45)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortMode("name")}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          sortMode === "name"
                            ? "bg-primary text-white shadow-sm"
                            : "bg-white text-[#3e6888] hover:bg-blue-50 border border-[#d1e5f5]"
                        }`}
                      >
                        Tên A → Z
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <select
                        id="student-dropdown-select"
                        value={selectedStt}
                        onChange={(e) => handleSelectStudent(e.target.value)}
                        className="w-full h-11 sm:h-12 pl-3.5 pr-10 bg-white border-2 border-primary hover:border-primary-hover focus:border-primary focus:ring-4 focus:ring-primary/20 text-[#123f62] font-bold text-xs sm:text-sm rounded-xl appearance-none outline-none transition cursor-pointer shadow-sm"
                      >
                        <option value="">
                          {studentList.length > 0
                            ? `▼ Bấm vào đây để chọn học sinh (Tổng số ${studentList.length} em)...`
                            : "Đang tải danh sách học sinh lớp 8A6..."}
                        </option>
                        {sortedStudents.map((s) => (
                          <option key={s.stt} value={s.stt} className="py-1">
                            STT {s.stt.padStart(2, "0")}. {s.hoVaTen} {s.gioiTinh ? `— (${s.gioiTinh})` : ""} {s.ngaySinh ? `— ${s.ngaySinh}` : ""}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-primary text-sm font-black">
                        ▼
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedStt}
                      onClick={() => {
                        if (selectedStt) {
                          handleOpenStudentDetail(selectedStt);
                        }
                      }}
                      className="h-11 sm:h-12 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                      title="Mở bảng thông tin chi tiết đầy đủ của học sinh này"
                    >
                      <span>📑</span> Mở Hồ Sơ Đầy Đủ
                    </button>
                  </div>

                  <div className="text-[11px] text-[#4a7291] mt-2 flex items-center gap-1.5 flex-wrap">
                    <span>💡</span>
                    <span>Chỉ cần chọn tên trong menu thả xuống ở trên, hệ thống sẽ tự động tra cứu và hiển thị ngay hồ sơ chi tiết!</span>
                  </div>
                </div>

                {/* 2. HOẶC GÕ TÌM KIẾM TÙY CHỌN */}
                <div>
                  <div className="text-[11px] font-bold text-[#62849e] uppercase mb-1 flex items-center justify-between">
                    <span>HOẶC GÕ TỪ KHÓA TÌM KIẾM (TÙY CHỌN):</span>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      executeSearch(query);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Nhập số thứ tự hoặc họ tên để tìm kiếm nhanh..."
                      className="flex-1 h-10 sm:h-11 px-3.5 sm:px-4 border border-[#c9deed] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-medium transition bg-[#fbfdff]"
                    />

                    <button
                      type="submit"
                      disabled={loading || !query.trim()}
                      className="h-10 sm:h-11 px-4 bg-gradient-to-r from-primary to-primary-hover text-white font-bold rounded-xl shadow-sm hover:shadow transition text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        "TÌM KIẾM"
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* CHAT STREAM AREA (TỰ ĐỘNG LƯU VÀO LOCALSTORAGE) */}
              <div className="p-3 sm:p-5 bg-gradient-to-b from-[#f8fcff] to-white flex-1 min-h-[320px] sm:min-h-[380px] max-h-[560px] overflow-y-auto space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#345e7a] uppercase mb-0.5">
                  <span>HỘI THOẠI TRA CỨU (TỰ ĐỘNG LƯU)</span>
                  <span className="text-[10px] text-emerald-600 font-normal lowercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    đã đồng bộ
                  </span>
                </div>

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.type === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Text Bubble */}
                    {msg.text && (
                      <div
                        className={`max-w-[90%] sm:max-w-[80%] md:max-w-[75%] p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                          msg.type === "user"
                            ? "bg-gradient-to-r from-primary to-primary-hover text-white rounded-br-none"
                            : msg.isIntro
                            ? "bg-[#f3f9fe] text-[#3e647e] border border-[#d8e8f4] rounded-bl-none font-medium"
                            : msg.isError
                            ? "bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-none"
                            : "bg-white text-[#23445d] border border-[#d8e8f4] rounded-bl-none font-medium"
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}

                    {/* Single Student Profile Card */}
                    {msg.singleStudent && (
                      <div className="w-full mt-2 animate-fadeIn">
                        <StudentDetailView
                          student={msg.singleStudent}
                          isTeacher={true}
                          onStudentUpdate={handleStudentUpdate}
                        />
                      </div>
                    )}

                    {/* Multiple Matches Student List */}
                    {msg.matches && msg.matches.length > 0 && (
                      <div className="w-full mt-2 space-y-2 max-w-2xl">
                        {msg.matches.map((m) => (
                          <div
                            key={m.id}
                            className="p-3 bg-white border border-[#d6e6f2] hover:border-primary rounded-xl flex items-center justify-between gap-2.5 shadow-sm transition"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm text-primary-dark truncate">
                                {m.name}
                              </div>
                              <div className="text-[11px] text-brandText-muted mt-0.5 flex gap-2.5 flex-wrap">
                                <span>STT: <strong>{m.stt}</strong></span>
                                <span>Sinh: {m.birthDate || "—"}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleOpenStudentDetail(m.stt)}
                              disabled={fetchingDetailStt === m.stt}
                              className="px-2.5 py-1.5 sm:px-3 bg-primary-soft hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              {fetchingDetailStt === m.stt ? "ĐANG TẢI..." : "XEM HỒ SƠ ▾"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Spinner when loading */}
                {loading && (
                  <div className="flex items-start">
                    <div className="bg-white border border-[#d8e8f4] p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-xs text-brandText-muted">
                      <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span>Đang tra cứu dữ liệu 8A6...</span>
                    </div>
                  </div>
                )}

                <div ref={streamEndRef} />
              </div>
            </section>
          </main>
        </div>
      )}
    </div>
  );
}
