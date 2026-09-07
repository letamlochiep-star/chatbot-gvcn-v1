"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AuthSession,
  StudentRecord,
  StudentExtensionData,
  StudentMessage,
  WeeklyDashboard,
  StudentRankItem,
  CompetitionEvent,
} from "@/lib/types";
import { StudentDetailView } from "./StudentDetailView";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

interface Props {
  session: AuthSession;
  onLogout: () => void;
}

export function StudentPortalView({ session, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<"competition" | "myspace" | "messages" | "profile">(
    "competition"
  );
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [extension, setExtension] = useState<StudentExtensionData>({ stt: session.stt || "" });
  const [messages, setMessages] = useState<StudentMessage[]>([]);

  // Competition & Conduct State
  const [week, setWeek] = useState<number>(1);
  const [dashboard, setDashboard] = useState<WeeklyDashboard | null>(null);
  const [competitionViewMode, setCompetitionViewMode] = useState<"personal" | "team" | "class">(
    "personal"
  );
  const [classSearch, setClassSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingExtension, setSavingExtension] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form My Space
  const [hobbies, setHobbies] = useState("");
  const [dreams, setDreams] = useState("");
  const [personalNote, setPersonalNote] = useState("");

  // Form Tin nhắn
  const [msgContent, setMsgContent] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Tải dữ liệu thi đua tuần
  const fetchCompetitionDashboard = async (targetWeek: number) => {
    try {
      const res = await fetch(`/api/competition?action=dashboard&week=${targetWeek}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.dashboard) {
          setDashboard(data.dashboard);
        }
      }
    } catch (err) {
      console.error("Lỗi tải thi đua học sinh:", err);
    }
  };

  // Tải thông tin học sinh
  useEffect(() => {
    async function loadData() {
      if (!session.stt) return;
      try {
        setLoading(true);

        // 1. Tải hồ sơ học sinh
        const resStudent = await fetch(`/api/student/${session.stt}`);
        if (resStudent.ok) {
          const data = await resStudent.json();
          if (data.ok && data.student) {
            setStudent(data.student);
          }
        }

        // 2. Tải dữ liệu mở rộng
        const resExt = await fetch(`/api/student/extension?stt=${session.stt}`);
        if (resExt.ok) {
          const dataExt = await resExt.json();
          if (dataExt.ok && dataExt.extension) {
            setExtension(dataExt.extension);
            setHobbies(dataExt.extension.hobbies || "");
            setDreams(dataExt.extension.dreams || "");
            setPersonalNote(dataExt.extension.personalNote || "");
          }
        }

        // 3. Tải tin nhắn ban đầu
        const resMsg = await fetch(`/api/messages?stt=${session.stt}`);
        if (resMsg.ok) {
          const dataMsg = await resMsg.json();
          if (dataMsg.ok && dataMsg.messages) {
            setMessages(dataMsg.messages);
          }
        }

        // 4. Tải dữ liệu thi đua nề nếp
        await fetchCompetitionDashboard(week);
      } catch (err) {
        console.error("Lỗi tải dữ liệu cổng học sinh:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Lắng nghe tin nhắn thời gian thực
    let unsub: (() => void) | undefined;
    const db = getFirebaseDb();
    if (db && session.stt) {
      try {
        const cleanStt = session.stt.trim();
        const q = query(collection(db, "messages"), where("stt", "==", cleanStt));
        unsub = onSnapshot(q, (snapshot) => {
          const list: StudentMessage[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as StudentMessage);
          });
          list.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          setMessages(list);
        });
      } catch (e) {
        console.warn("[Firebase] Không thể kết nối Realtime tin nhắn học sinh:", e);
      }
    }

    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (!session.stt) return;
      try {
        const resMsg = await fetch(`/api/messages?stt=${session.stt}`);
        if (resMsg.ok) {
          const dataMsg = await resMsg.json();
          if (dataMsg.ok && dataMsg.messages) {
            setMessages(dataMsg.messages);
          }
        }
      } catch {}
    }, 4000);

    return () => {
      if (unsub) unsub();
      clearInterval(interval);
    };
  }, [session.stt]);

  useEffect(() => {
    fetchCompetitionDashboard(week);
  }, [week]);

  // Thông tin thi đua của cá nhân học sinh
  const myRankItem = useMemo<StudentRankItem | null>(() => {
    if (!dashboard?.ranking || !session.stt) return null;
    const cleanStt = session.stt.trim();
    const numStt = parseInt(cleanStt, 10);
    const targetId = isNaN(numStt) ? `HS${cleanStt}` : `HS${String(numStt).padStart(3, "0")}`;

    return (
      dashboard.ranking.find(
        (r) =>
          r.studentId === targetId ||
          r.studentId === session.stt ||
          r.fullName.toLowerCase().trim() === session.name.toLowerCase().trim()
      ) || null
    );
  }, [dashboard, session.stt, session.name]);

  // Tổ của học sinh hiện tại
  const myTeamNumber = useMemo(() => {
    return myRankItem?.team || session.team || 1;
  }, [myRankItem, session.team]);

  // Danh sách các bạn trong cùng Tổ của học sinh
  const myTeamMembers = useMemo<StudentRankItem[]>(() => {
    if (!dashboard?.ranking) return [];
    return dashboard.ranking
      .filter((r) => r.team === myTeamNumber)
      .sort((a, b) => b.score - a.score || a.minus - b.minus);
  }, [dashboard, myTeamNumber]);

  // Thứ hạng của học sinh trong Tổ
  const myRankInTeam = useMemo(() => {
    if (!myRankItem || myTeamMembers.length === 0) return 1;
    const idx = myTeamMembers.findIndex((m) => m.studentId === myRankItem.studentId);
    return idx !== -1 ? idx + 1 : 1;
  }, [myRankItem, myTeamMembers]);

  // Các sự kiện vi phạm / khen thưởng trong tuần của cá nhân học sinh
  const myEventsThisWeek = useMemo<CompetitionEvent[]>(() => {
    if (!dashboard?.recentEvents || !myRankItem) return [];
    return dashboard.recentEvents.filter(
      (e) =>
        e.studentId === myRankItem.studentId ||
        e.studentName.toLowerCase().trim() === session.name.toLowerCase().trim()
    );
  }, [dashboard, myRankItem, session.name]);

  // Danh sách toàn lớp có tìm kiếm
  const filteredClassRanking = useMemo(() => {
    if (!dashboard?.ranking) return [];
    if (!classSearch.trim()) return dashboard.ranking;
    return dashboard.ranking.filter(
      (r) =>
        r.fullName.toLowerCase().includes(classSearch.toLowerCase()) ||
        r.studentId.toLowerCase().includes(classSearch.toLowerCase()) ||
        `Tổ ${r.team}`.toLowerCase().includes(classSearch.toLowerCase())
    );
  }, [dashboard, classSearch]);

  // Lưu thông tin My Space
  const handleSaveExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExtension(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/student/extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stt: session.stt,
          hobbies,
          dreams,
          personalNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setExtension(data.extension);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.message || "Không thể lưu thông tin.");
      }
    } catch {
      alert("Lỗi kết nối khi lưu thông tin.");
    } finally {
      setSavingExtension(false);
    }
  };

  // Gửi tin nhắn cho GVCN
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgContent.trim()) return;

    setSendingMsg(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: msgContent,
          isConfidential,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok && data.data) {
        setMessages((prev) => [...prev, data.data]);
        setMsgContent("");
        setIsConfidential(false);
      } else {
        alert(data.message || "Không thể gửi tin nhắn.");
      }
    } catch {
      alert("Lỗi kết nối khi gửi tin nhắn.");
    } finally {
      setSendingMsg(false);
    }
  };

  // In Phiếu Rèn Luyện Cá Nhân A4
  const handlePrintMyScorecard = () => {
    if (!myRankItem) return;

    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Vui lòng cho phép popup trình duyệt để in phiếu đánh giá.");
      return;
    }

    const eventsRowsHtml =
      myEventsThisWeek.length > 0
        ? myEventsThisWeek
            .map(
              (ev, idx) => `
          <tr style="font-size: 12px; text-align: center; border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 6px;">${idx + 1}</td>
            <td style="padding: 6px;">${ev.eventDate || "Trong tuần"}</td>
            <td style="padding: 6px;">${ev.period ? `Tiết ${ev.period}` : "Cả ngày"}</td>
            <td style="padding: 6px;">${ev.subject || "---"}</td>
            <td style="padding: 6px; font-weight: bold; color: #1e3a8a;">${ev.code}</td>
            <td style="padding: 6px; text-align: left;">${ev.description}</td>
            <td style="padding: 6px; font-weight: bold; color: ${ev.plus > 0 ? "#16a34a" : "#dc2626"};">
              ${ev.plus > 0 ? `+${ev.plus}` : `-${ev.minus}`}
            </td>
            <td style="padding: 6px;">${ev.createdByName || "Ban cán sự"}</td>
            <td style="padding: 6px; font-style: italic; text-align: left;">${ev.note || "---"}</td>
          </tr>
        `
            )
            .join("")
        : `
          <tr>
            <td colspan="9" style="text-align: center; padding: 12px; font-style: italic; color: #64748b; font-size: 13px;">
              🌟 Không có ghi nhận vi phạm nào trong tuần. Học sinh chấp hành nề nếp xuất sắc!
            </td>
          </tr>
        `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu Đánh Giá Nề Nếp Học Sinh - ${session.name} - Tuần ${week}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 12mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.35; margin: 0; padding: 0; }
          .header { display: flex; justify-content: space-between; text-align: center; margin-bottom: 12px; }
          .title { text-align: center; margin: 15px 0 10px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f1f5f9; padding: 6px 4px; font-size: 12px; border: 1px solid #cbd5e1; }
          td { border: 1px solid #cbd5e1; }
          .card-grid { display: flex; justify-content: space-between; margin: 12px 0; }
          .card { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: center; width: 18%; border-radius: 4px; }
          .signature { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="width: 45%;">
            <strong>TRƯỜNG THCS QUANG TRUNG</strong><br/>
            <strong>LỚP 8A6 – TỔ ${myTeamNumber}</strong><br/>
            <span style="font-size: 12px;">GVCN: Thầy Vũ Minh Tuấn</span>
          </div>
          <div style="width: 50%;">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
            <strong>Độc lập – Tự do – Hạnh phúc</strong><br/>
            <span style="font-size: 12px;">-------------------------</span>
          </div>
        </div>

        <div class="title">
          <h2 style="margin: 0; text-transform: uppercase; font-size: 16px; color: #1e3a8a;">
            PHIẾU THEO DÕI NỀ NẾP & RÈN LUYỆN HỌC SINH
          </h2>
          <div style="font-style: italic; font-size: 13px; margin-top: 4px;">
            Tuần học số ${week} – Năm học 2025 - 2026 (Ngày in: ${new Date().toLocaleDateString("vi-VN")})
          </div>
        </div>

        <div style="margin: 10px 0; font-size: 13px; border: 1px dashed #cbd5e1; padding: 8px 12px; background-color: #f8fafc;">
          <div><strong>Họ và tên học sinh:</strong> ${session.name} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Mã HS:</strong> ${myRankItem.studentId} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>STT:</strong> ${session.stt}</div>
          <div style="margin-top: 4px;"><strong>Lớp:</strong> 8A6 &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Tổ sinh hoạt:</strong> Tổ ${myTeamNumber} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Vị trí:</strong> Hạng <strong>${myRankItem.rank}/45</strong> toàn lớp (Hạng <strong>${myRankInTeam}/${myTeamMembers.length}</strong> trong Tổ)</div>
        </div>

        <div class="card-grid">
          <div class="card">
            <div style="font-size: 11px; color: #64748b;">Khởi Điểm</div>
            <div style="font-size: 15px; font-weight: bold; color: #1e3a8a;">100 đ</div>
          </div>
          <div class="card">
            <div style="font-size: 11px; color: #16a34a;">Điểm Thưởng</div>
            <div style="font-size: 15px; font-weight: bold; color: #16a34a;">+${myRankItem.plus} đ</div>
          </div>
          <div class="card">
            <div style="font-size: 11px; color: #dc2626;">Điểm Phạt</div>
            <div style="font-size: 15px; font-weight: bold; color: #dc2626;">-${myRankItem.minus} đ</div>
          </div>
          <div class="card">
            <div style="font-size: 11px; color: #1e3a8a;">Tổng Điểm Tuần</div>
            <div style="font-size: 16px; font-weight: bold; color: #1e3a8a;">${myRankItem.score} đ</div>
          </div>
          <div class="card">
            <div style="font-size: 11px; color: #64748b;">Xếp Loại Tuần</div>
            <div style="font-size: 14px; font-weight: bold; color: #0284c7;">${myRankItem.grade}</div>
          </div>
        </div>

        <div style="font-size: 13px; font-weight: bold; margin-top: 10px; color: #1e3a8a;">
          NHẬT KÝ CHI TIẾT CÁC SỰ VIỆC NỀ NẾP TRONG TUẦN ${week}:
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">STT</th>
              <th style="width: 65px;">Ngày</th>
              <th style="width: 50px;">Tiết</th>
              <th style="width: 55px;">Môn</th>
              <th style="width: 50px;">Mã</th>
              <th>Nội Dung Tiêu Chuẩn Quy Định</th>
              <th style="width: 50px;">Điểm</th>
              <th style="width: 75px;">Người Ghi</th>
              <th style="width: 80px;">Ghi Chú</th>
            </tr>
          </thead>
          <tbody>
            ${eventsRowsHtml}
          </tbody>
        </table>

        <div class="signature">
          <div style="width: 45%;">
            <strong>Ý KIẾN CỦA PHỤ HUYNH HỌC SINH</strong><br/>
            <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ ý kiến nhận xét)</span>
            <br/><br/><br/><br/>
            ........................................................
          </div>
          <div style="width: 45%;">
            <em>Hà Nội, ngày .... tháng .... năm 2026</em><br/>
            <strong>GIÁO VIÊN CHỦ NHIỆM</strong><br/>
            <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</span>
            <br/><br/><br/><br/>
            <strong>Thầy Vũ Minh Tuấn</strong>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-brandText-muted">
            Đang tải không gian cá nhân của em...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0d6e64] via-[#128a7e] to-[#18ab9d] text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex flex-wrap items-center gap-2">
            <span>🎓 CỔNG HỌC SINH LỚP 8A6</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
              STT: {session.stt} • TỔ {myTeamNumber}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">{session.name}</h1>
          <p className="text-xs text-emerald-100 mt-0.5">
            Trường THCS Quang Trung · Năm học 2025 - 2026
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onLogout}
            className="self-start md:self-auto px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-white"
          >
            <span>🚪</span> Đăng xuất
          </button>
        </div>
      </div>

      {/* 4 Tabs Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-white p-1 sm:p-1.5 rounded-2xl border border-line shadow-sm gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab("competition")}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 text-center ${
            activeTab === "competition"
              ? "bg-[#0d6e64] text-white shadow-sm"
              : "text-brandText-muted hover:text-brandText hover:bg-[#f3f9f8]"
          }`}
        >
          <span>🏆</span> <span className="truncate">Nề Nếp & Thi Đua</span>
        </button>

        <button
          onClick={() => setActiveTab("myspace")}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 text-center ${
            activeTab === "myspace"
              ? "bg-[#0d6e64] text-white shadow-sm"
              : "text-brandText-muted hover:text-brandText hover:bg-[#f3f9f8]"
          }`}
        >
          <span>🌟</span> <span className="truncate">Sở Thích & Ước Mơ</span>
        </button>

        <button
          onClick={() => setActiveTab("messages")}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 relative text-center ${
            activeTab === "messages"
              ? "bg-[#0d6e64] text-white shadow-sm"
              : "text-brandText-muted hover:text-brandText hover:bg-[#f3f9f8]"
          }`}
        >
          <div className="flex items-center gap-1">
            <span>💬</span> <span className="truncate">Nhắn GVCN</span>
          </div>
          {messages.length > 0 && (
            <span className="w-4 h-4 sm:w-5 sm:h-5 bg-amber-400 text-amber-950 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
              {messages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 text-center ${
            activeTab === "profile"
              ? "bg-[#0d6e64] text-white shadow-sm"
              : "text-brandText-muted hover:text-brandText hover:bg-[#f3f9f8]"
          }`}
        >
          <span>📋</span> <span className="truncate">Hồ Sơ 49 Trường</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: THEO DÕI NỀ NẾP & THI ĐUA (CÁ NHÂN, TỔ CỦA EM & TOÀN LỚP) */}
      {/* ========================================================================= */}
      {activeTab === "competition" && (
        <div className="space-y-6">
          {/* Header Bảng Thi Đua */}
          <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h2 className="text-lg font-bold text-[#0d6e64] flex items-center gap-2">
                  <span>🏆</span> Theo Dõi Nề Nếp & Điểm Thi Đua Của Em
                </h2>
                <p className="text-xs text-brandText-muted mt-1">
                  Minh bạch kết quả rèn luyện của bản thân, theo dõi thi đua trong Tổ {myTeamNumber} và toàn bộ 45 bạn trong Lớp 8A6.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600">Chọn Tuần:</span>
                <select
                  value={week}
                  onChange={(e) => setWeek(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs font-bold bg-[#f0f9f8] text-[#0d6e64] border border-[#a8dfd8] rounded-xl outline-none cursor-pointer"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Tuần {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3 NÚT CHUYỂN CHẾ ĐỘ XEM: CÁ NHÂN / TRONG TỔ / TOÀN LỚP */}
            <div className="flex items-center gap-2 bg-[#f4faf9] p-1.5 rounded-xl border border-[#d8eee9] overflow-x-auto">
              <button
                onClick={() => setCompetitionViewMode("personal")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  competitionViewMode === "personal"
                    ? "bg-[#0d6e64] text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <span>👤</span> 1. Phiếu Điểm Cá Nhân Em
              </button>

              <button
                onClick={() => setCompetitionViewMode("team")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  competitionViewMode === "team"
                    ? "bg-[#0d6e64] text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <span>👥</span> 2. Nề Nếp Trong Tổ {myTeamNumber} ({myTeamMembers.length} bạn)
              </button>

              <button
                onClick={() => setCompetitionViewMode("class")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  competitionViewMode === "class"
                    ? "bg-[#0d6e64] text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <span>🏫</span> 3. Bảng Xếp Hạng Toàn Lớp (45 Bạn)
              </button>
            </div>

            {/* ── CHẾ ĐỘ 1: PHIẾU ĐIỂM CÁ NHÂN HỌC SINH ── */}
            {competitionViewMode === "personal" && (
              <div className="space-y-5">
                {/* 4 Thẻ KPI Điểm Số */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                    <div className="text-[11px] font-semibold text-blue-700">Điểm Khởi Điểm</div>
                    <div className="text-xl font-bold text-blue-950 mt-0.5">100 đ</div>
                    <div className="text-[10px] text-blue-600 mt-0.5">Mức chuẩn đầu tuần</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <div className="text-[11px] font-semibold text-emerald-700">Khen Thưởng (+)</div>
                    <div className="text-xl font-bold text-emerald-700 mt-0.5">
                      +{myRankItem?.plus || 0} đ
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">Điểm tốt, phong trào</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                    <div className="text-[11px] font-semibold text-rose-700">Vi Phạm (-)</div>
                    <div className="text-xl font-bold text-rose-700 mt-0.5">
                      -{myRankItem?.minus || 0} đ
                    </div>
                    <div className="text-[10px] text-rose-600 mt-0.5">Lỗi kỷ luật, nề nếp</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
                    <div className="text-[11px] font-semibold text-amber-800">Tổng Điểm Tuần {week}</div>
                    <div className="text-xl font-bold text-amber-900 mt-0.5">
                      {myRankItem?.score || 100} đ
                    </div>
                    <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                      {myRankItem?.grade || "Xuất Sắc"}
                    </div>
                  </div>
                </div>

                {/* Vị trí Thứ Hạng & Nút In A4 */}
                <div className="p-4 rounded-xl bg-[#f0f9f8] border border-[#a8dfd8] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#0d6e64] font-bold uppercase tracking-wider">
                      Vị Trí Thi Đua Tuần {week}:
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-3">
                      <span>
                        🥇 Hạng <strong>{myRankItem?.rank || 1}</strong> / 45 Toàn Lớp
                      </span>
                      <span>•</span>
                      <span>
                        👥 Hạng <strong>{myRankInTeam}</strong> / {myTeamMembers.length} Trong Tổ {myTeamNumber}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handlePrintMyScorecard}
                    className="px-4 py-2 bg-[#0d6e64] hover:bg-[#0b5951] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🖨️</span> In Phiếu Rèn Luyện A4 Của Em
                  </button>
                </div>

                {/* Nhật Ký Sự Việc Chi Tiết Trong Tuần */}
                <div className="space-y-3">
                  <div className="font-bold text-sm text-slate-800 flex items-center justify-between">
                    <span>📋 Nhật Ký Nề Nếp & Chấm Điểm Tuần {week} Của Em:</span>
                    <span className="text-xs text-slate-500 font-normal">
                      Tổng số: <strong>{myEventsThisWeek.length}</strong> sự việc
                    </span>
                  </div>

                  {myEventsThisWeek.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                      🌟 Tuần {week} em chấp hành nề nếp rất tốt, không có sự việc trừ điểm nào!
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase">
                            <th className="p-3 w-10 text-center">STT</th>
                            <th className="p-3">Ngày & Tiết</th>
                            <th className="p-3">Môn Học</th>
                            <th className="p-3">Mã Tiêu Chí</th>
                            <th className="p-3">Nội Dung Sự Việc</th>
                            <th className="p-3 text-center">Điểm (+/-)</th>
                            <th className="p-3">Người Chấm</th>
                            <th className="p-3">Ghi Chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {myEventsThisWeek.map((ev, idx) => (
                            <tr key={ev.eventId || idx} className="hover:bg-slate-50 transition">
                              <td className="p-3 text-center text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="p-3">
                                <div>{ev.eventDate}</div>
                                <div className="text-[10px] text-slate-500">{ev.period ? `Tiết ${ev.period}` : "Cả ngày"}</div>
                              </td>
                              <td className="p-3 font-medium text-slate-700">{ev.subject || "---"}</td>
                              <td className="p-3 font-bold text-blue-900">{ev.code}</td>
                              <td className="p-3 font-medium text-slate-800">{ev.description}</td>
                              <td className="p-3 text-center">
                                <span
                                  className={`font-bold px-2 py-0.5 rounded ${
                                    ev.plus > 0
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {ev.plus > 0 ? `+${ev.plus}` : `-${ev.minus}`}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600">{ev.createdByName || "Cán sự lớp"}</td>
                              <td className="p-3 text-slate-500 italic">{ev.note || "---"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CHẾ ĐỘ 2: THEO DÕI NỀ NẾP CÁC BẠN TRONG TỔ ── */}
            {competitionViewMode === "team" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-bold text-blue-900 text-sm">
                      👥 Danh Sách Thi Đua Thành Viên Tổ {myTeamNumber} (Tuần {week})
                    </div>
                    <div className="text-xs text-blue-700 mt-0.5">
                      Tổ gồm <strong>{myTeamMembers.length}</strong> bạn học sinh cùng phấn đấu thi đua học tập và nề nếp.
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase">
                        <th className="p-3 w-14 text-center">Hạng Tổ</th>
                        <th className="p-3">Học Sinh</th>
                        <th className="p-3 text-center">Điểm Tuần</th>
                        <th className="p-3 text-center">Thưởng (+)</th>
                        <th className="p-3 text-center">Phạt (-)</th>
                        <th className="p-3 text-center">Xếp Loại</th>
                        <th className="p-3 text-center">Hạng Lớp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {myTeamMembers.map((member, idx) => {
                        const isMe = member.studentId === myRankItem?.studentId;
                        return (
                          <tr
                            key={member.studentId}
                            className={`transition hover:bg-emerald-50/50 ${
                              isMe ? "bg-[#f0f9f8] font-bold border-l-4 border-[#0d6e64]" : ""
                            }`}
                          >
                            <td className="p-3 text-center">
                              {idx === 0 ? (
                                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold inline-flex items-center justify-center">
                                  🥇 1
                                </span>
                              ) : (
                                <span className="text-slate-600 font-semibold">{idx + 1}</span>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{member.fullName}</span>
                                {isMe && (
                                  <span className="text-[10px] bg-[#0d6e64] text-white px-1.5 py-0.2 rounded">
                                    Là Em
                                  </span>
                                )}
                                {member.isTeamLeader && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                                    Tổ Trưởng
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">{member.studentId}</div>
                            </td>

                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                                {member.score} đ
                              </span>
                            </td>

                            <td className="p-3 text-center font-bold text-emerald-600">
                              +{member.plus}
                            </td>

                            <td className="p-3 text-center font-bold text-rose-600">
                              -{member.minus}
                            </td>

                            <td className="p-3 text-center font-semibold text-slate-700">
                              {member.grade}
                            </td>

                            <td className="p-3 text-center text-slate-600 font-semibold">
                              #{member.rank}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── CHẾ ĐỘ 3: BẢNG XẾP HẠNG TOÀN LỚP 8A6 ── */}
            {competitionViewMode === "class" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="font-bold text-sm text-slate-800">
                    🏫 Bảng Xếp Hạng Thi Đua Toàn Lớp 8A6 (45 Học Sinh • 4 Tổ)
                  </div>

                  <input
                    type="text"
                    placeholder="Tìm tên bạn trong lớp..."
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#0d6e64] w-full sm:w-56"
                  />
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase">
                        <th className="p-3 w-14 text-center">Hạng</th>
                        <th className="p-3">Họ và Tên</th>
                        <th className="p-3 text-center">Tổ</th>
                        <th className="p-3 text-center">Điểm Tuần</th>
                        <th className="p-3 text-center">Thưởng (+)</th>
                        <th className="p-3 text-center">Phạt (-)</th>
                        <th className="p-3 text-center">Xếp Loại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredClassRanking.map((item) => {
                        const isMe = item.studentId === myRankItem?.studentId;
                        return (
                          <tr
                            key={item.studentId}
                            className={`transition hover:bg-slate-50 ${
                              isMe ? "bg-[#f0f9f8] font-bold border-l-4 border-[#0d6e64]" : ""
                            }`}
                          >
                            <td className="p-3 text-center">
                              {item.rank === 1 ? (
                                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold inline-flex items-center justify-center">
                                  🥇 1
                                </span>
                              ) : item.rank === 2 ? (
                                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold inline-flex items-center justify-center">
                                  🥈 2
                                </span>
                              ) : item.rank === 3 ? (
                                <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-900 font-bold inline-flex items-center justify-center">
                                  🥉 3
                                </span>
                              ) : (
                                <span className="text-slate-600 font-semibold">{item.rank}</span>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{item.fullName}</span>
                                {isMe && (
                                  <span className="text-[10px] bg-[#0d6e64] text-white px-1.5 py-0.2 rounded">
                                    Là Em
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">{item.studentId}</div>
                            </td>

                            <td className="p-3 text-center font-bold text-slate-700">
                              Tổ {item.team}
                            </td>

                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                                {item.score} đ
                              </span>
                            </td>

                            <td className="p-3 text-center font-bold text-emerald-600">
                              +{item.plus}
                            </td>

                            <td className="p-3 text-center font-bold text-rose-600">
                              -{item.minus}
                            </td>

                            <td className="p-3 text-center font-semibold text-slate-700">
                              {item.grade}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GÓC CÁ NHÂN (MY SPACE) */}
      {/* ========================================================================= */}
      {activeTab === "myspace" && (
        <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[#0d6e64] flex items-center gap-2">
              <span>🌟</span> Không Gian Cá Nhân & Nguyện Vọng Của Em
            </h2>
            <p className="text-xs text-brandText-muted mt-1">
              Hãy chia sẻ sở thích, ước mơ và mong muốn của em để thầy/cô chủ nhiệm hiểu và đồng hành cùng em tốt hơn.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <span>✓</span> Đã lưu thông tin sở thích và ước mơ của em thành công!
            </div>
          )}

          <form onSubmit={handleSaveExtension} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brandText uppercase mb-1.5 flex items-center gap-1.5">
                <span>🎨</span> Sở thích cá nhân của em
              </label>
              <textarea
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                placeholder="Ví dụ: Thích đọc truyện tranh, chơi cầu lông, vẽ tranh, nghe nhạc, lập trình..."
                rows={3}
                className="w-full p-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-[#0d6e64] focus:ring-2 focus:ring-[#0d6e64]/20 transition bg-[#fbfdff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brandText uppercase mb-1.5 flex items-center gap-1.5">
                <span>🚀</span> Ước mơ & Định hướng tương lai của em
              </label>
              <textarea
                value={dreams}
                onChange={(e) => setDreams(e.target.value)}
                placeholder="Ví dụ: Em ước mơ trở thành kỹ sư công nghệ thông tin, bác sĩ, thiết kế đồ họa..."
                rows={3}
                className="w-full p-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-[#0d6e64] focus:ring-2 focus:ring-[#0d6e64]/20 transition bg-[#fbfdff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brandText uppercase mb-1.5 flex items-center gap-1.5">
                <span>✍️</span> Lời nhắn gửi riêng đến Thầy/Cô chủ nhiệm (nếu có)
              </label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Ví dụ: Em muốn cải thiện môn Tiếng Anh trong năm nay, mong thầy/cô giúp đỡ..."
                rows={2}
                className="w-full p-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-[#0d6e64] focus:ring-2 focus:ring-[#0d6e64]/20 transition bg-[#fbfdff]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingExtension}
                className="px-6 py-3 bg-gradient-to-r from-[#0d6e64] to-[#149d8f] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition text-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {savingExtension ? "Đang lưu..." : "💾 LƯU THÔNG TIN CỦA EM"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NHẮN TIN VỚI GVCN */}
      {/* ========================================================================= */}
      {activeTab === "messages" && (
        <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0d6e64] flex items-center gap-2">
              <span>💬</span> Hòm Thư Trao Đổi Riêng Với Giáo Viên Chủ Nhiệm
            </h2>
            <p className="text-xs text-brandText-muted mt-1">
              Em có thể gửi câu hỏi về bài học, chia sẻ tâm tư, thắc mắc hoặc báo cáo tình hình cho thầy/cô chủ nhiệm.
            </p>
          </div>

          {/* Danh sách tin nhắn */}
          <div className="bg-[#f8fcff] border border-line rounded-2xl p-3 sm:p-4 min-h-[220px] max-h-[380px] overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-10 text-xs text-brandText-muted">
                <span>📭</span> Chưa có tin nhắn nào. Em có thể gửi tin nhắn đầu tiên ở bên dưới!
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "student" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="text-[10px] text-brandText-muted mb-0.5 px-1 flex items-center gap-1.5">
                    <strong>{m.sender === "student" ? "Em" : "GVCN"}</strong>
                    <span>·</span>
                    <span>{new Date(m.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                    {m.isConfidential && (
                      <span className="text-amber-600 bg-amber-50 px-1 rounded text-[9px] font-bold">
                        🔒 Bí mật
                      </span>
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      m.sender === "student"
                        ? "bg-[#0d6e64] text-white rounded-br-none"
                        : "bg-white text-brandText border border-[#d8e8f4] rounded-bl-none font-medium"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Khung soạn tin nhắn */}
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div>
              <textarea
                value={msgContent}
                onChange={(e) => setMsgContent(e.target.value)}
                placeholder="Nhập nội dung nhắn gửi thầy/cô chủ nhiệm..."
                rows={3}
                required
                className="w-full p-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-[#0d6e64] focus:ring-2 focus:ring-[#0d6e64]/20 transition bg-[#fbfdff]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-brandText cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="rounded text-[#0d6e64] focus:ring-[#0d6e64] w-4 h-4 cursor-pointer"
                />
                <span>🔒 Đánh dấu tin nhắn riêng tư</span>
              </label>

              <button
                type="submit"
                disabled={sendingMsg || !msgContent.trim()}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#0d6e64] to-[#149d8f] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {sendingMsg ? "Đang gửi..." : "GỬI TIN NHẮN ✉️"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HỒ SƠ 49 TRƯỜNG CỦA EM */}
      {/* ========================================================================= */}
      {activeTab === "profile" && student && (
        <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
          <StudentDetailView student={student} />
        </div>
      )}
    </div>
  );
}
