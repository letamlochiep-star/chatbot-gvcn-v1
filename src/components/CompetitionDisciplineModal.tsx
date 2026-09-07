"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CompetitionEvent,
  WeeklyDashboard,
  StudentRankItem,
  TeamLeaderInfo,
  CompetitionSubmission,
  TeamCompetitionSummary,
} from "@/lib/types";
import {
  COMPETITION_GROUPS,
  COMPETITION_CATALOG,
  CompetitionCatalogItem,
  findCatalogItemByCode,
  normalizeVietnamese,
  getStudentTeam,
} from "@/lib/competitionCatalog";

interface Props {
  onClose: () => void;
  onOpenStudentProfile?: (stt: string) => void;
}

interface StudentItem {
  studentId: string;
  stt: string;
  fullName: string;
  team: number;
  isTeamLeader: boolean;
}

export function CompetitionDisciplineModal({ onClose, onOpenStudentProfile }: Props) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "teams" | "record" | "chat" | "history" | "leaders" | "submissions" | "rubric"
  >("dashboard");

  // State chung
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState<number>(1);
  const [totalWeeks, setTotalWeeks] = useState<number>(40);
  const [weekLocked, setWeekLocked] = useState<boolean>(false);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<number>(0); // 0 = All

  // Dashboard state
  const [dashboard, setDashboard] = useState<WeeklyDashboard | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Phiếu chi tiết chấm điểm cá nhân học sinh
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentRankItem | null>(null);

  // Record Form state (3 bước)
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [recordTeamFilter, setRecordTeamFilter] = useState<number>(0);

  const [selectedGroup, setSelectedGroup] = useState<string>(COMPETITION_GROUPS[0]);
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const [selectedEventCode, setSelectedEventCode] = useState<string>("");
  const [customPoints, setCustomPoints] = useState<number>(0);

  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [eventPeriod, setEventPeriod] = useState<string>("");
  const [eventSubject, setEventSubject] = useState<string>("");
  const [eventNote, setEventNote] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<
    { id: string; sender: "bot" | "user"; text: string; suggestion?: any }[]
  >([
    {
      id: "intro",
      sender: "bot",
      text: "Xin chào Thầy/Cô! Hãy mô tả sự việc nề nếp (ví dụ: 'Minh đi học muộn', 'Lan phát biểu xây dựng bài tốt', 'Huy không trực nhật'), Chatbot sẽ tự động nhận diện học sinh và đề xuất mã quy chuẩn tương ứng.",
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");

  // History state
  const [historyEvents, setHistoryEvents] = useState<CompetitionEvent[]>([]);

  // Leaders state
  const [teamsData, setTeamsData] = useState<
    { team: number; username: string; leader: TeamLeaderInfo | null; students: StudentItem[] }[]
  >([]);
  const [leaderPins, setLeaderPins] = useState<Record<number, string>>({
    1: "123456",
    2: "123456",
    3: "123456",
    4: "123456",
  });
  const [leaderSelections, setLeaderSelections] = useState<Record<number, string>>({});

  // Submissions state
  const [submissionsList, setSubmissionsList] = useState<CompetitionSubmission[]>([]);

  // Tra cứu bảng 40 tiêu chí
  const [rubricGroupFilter, setRubricGroupFilter] = useState<string>("Tất cả");
  const [rubricSearch, setRubricSearch] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. BOOTSTRAP TẢI DỮ LIỆU BAN ĐẦU
  useEffect(() => {
    async function loadBootstrap() {
      setLoading(true);
      try {
        const res = await fetch("/api/competition?action=bootstrap");
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setStudents(data.students || []);
            setWeek(data.currentWeek || 1);
            setTotalWeeks(data.totalWeeks || 40);
            setWeekLocked(Boolean(data.weekLocked));
            setDashboard(data.dashboard);
            if (data.today) setEventDate(data.today);
          }
        }
      } catch (err) {
        console.error("Lỗi tải bootstrap thi đua:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBootstrap();
  }, []);

  // 2. FETCH DASHBOARD KHI ĐỔI TUẦN HOẶC TỔ
  const fetchDashboard = async (targetWeek: number, targetTeam?: number) => {
    setLoading(true);
    try {
      const url = `/api/competition?action=dashboard&week=${targetWeek}${
        targetTeam ? `&team=${targetTeam}` : ""
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setDashboard(data.dashboard);
          setPendingCount(data.pendingSubmissionsCount || 0);
          setWeekLocked(Boolean(data.weekLocked));
        }
      }
    } catch (err) {
      console.error("Lỗi tải dashboard thi đua:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (targetWeek: number, targetTeam?: number) => {
    try {
      const url = `/api/competition?action=history&week=${targetWeek}${
        targetTeam ? `&team=${targetTeam}` : ""
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setHistoryEvents(data.events || []);
      }
    } catch (err) {
      console.error("Lỗi tải history:", err);
    }
  };

  const fetchLeaders = async () => {
    try {
      const res = await fetch("/api/competition?action=leaders");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.teams)) {
          setTeamsData(data.teams);
          const initialSelections: Record<number, string> = {};
          data.teams.forEach((t: any) => {
            if (t.leader && t.leader.studentId) {
              initialSelections[t.team] = t.leader.studentId;
            }
          });
          setLeaderSelections(initialSelections);
        }
      }
    } catch (err) {
      console.error("Lỗi tải leaders:", err);
    }
  };

  const fetchSubmissions = async (targetWeek: number, targetTeam?: number) => {
    try {
      const url = `/api/competition?action=submissions&week=${targetWeek}${
        targetTeam ? `&team=${targetTeam}` : ""
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setSubmissionsList(data.submissions || []);
      }
    } catch (err) {
      console.error("Lỗi tải submissions:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard" || activeTab === "teams") fetchDashboard(week, selectedTeamFilter);
    if (activeTab === "history") fetchHistory(week, selectedTeamFilter);
    if (activeTab === "leaders") fetchLeaders();
    if (activeTab === "submissions") fetchSubmissions(week, selectedTeamFilter);
  }, [activeTab, week, selectedTeamFilter]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Cập nhật điểm tùy biến khi chọn mã
  useEffect(() => {
    const item = findCatalogItemByCode(selectedEventCode);
    if (item) {
      if (item.code === "TS01") setCustomPoints(5);
      else if (item.code === "PT02") setCustomPoints(3);
      else setCustomPoints(item.plus > 0 ? item.plus : item.minus);
    }
  }, [selectedEventCode]);

  // Lọc học sinh
  const filteredStudents = useMemo(() => {
    const q = normalizeVietnamese(studentSearch);
    return students.filter((s) => {
      if (recordTeamFilter > 0 && s.team !== recordTeamFilter) return false;
      if (!q) return true;
      const normName = normalizeVietnamese(s.fullName);
      const normId = normalizeVietnamese(s.studentId);
      return normName.includes(q) || normId.includes(q) || s.stt.includes(q);
    });
  }, [students, studentSearch, recordTeamFilter]);

  // Lọc mã sự việc
  const filteredCatalog = useMemo(() => {
    const q = normalizeVietnamese(catalogSearch);
    return COMPETITION_CATALOG.filter((item) => {
      if (selectedGroup && item.group !== selectedGroup) return false;
      if (!q) return true;
      const normCode = normalizeVietnamese(item.code);
      const normDesc = normalizeVietnamese(item.description);
      return normCode.includes(q) || normDesc.includes(q);
    });
  }, [selectedGroup, catalogSearch]);

  const currentSelectedStudent = useMemo(() => {
    return students.find((s) => s.studentId === selectedStudentId);
  }, [students, selectedStudentId]);

  const currentSelectedCatalogItem = useMemo(() => {
    return findCatalogItemByCode(selectedEventCode);
  }, [selectedEventCode]);

  // Lọc danh mục tra cứu 40 tiêu chí
  const filteredRubricCatalog = useMemo(() => {
    const q = normalizeVietnamese(rubricSearch);
    return COMPETITION_CATALOG.filter((item) => {
      if (rubricGroupFilter !== "Tất cả" && item.group !== rubricGroupFilter) return false;
      if (!q) return true;
      const normCode = normalizeVietnamese(item.code);
      const normDesc = normalizeVietnamese(item.description);
      return normCode.includes(q) || normDesc.includes(q);
    });
  }, [rubricGroupFilter, rubricSearch]);

  // Lấy danh sách tất cả sự việc của học sinh đang xem phiếu điểm cá nhân
  const studentEventsForReport = useMemo(() => {
    if (!selectedStudentForReport) return [];
    const all = dashboard?.recentEvents || [];
    const fromHist = historyEvents || [];
    const combined = [...all, ...fromHist];
    const uniqueMap = new Map<string, CompetitionEvent>();
    combined.forEach((e) => {
      if (e.studentId === selectedStudentForReport.studentId) {
        uniqueMap.set(e.eventId, e);
      }
    });
    return Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    );
  }, [selectedStudentForReport, dashboard, historyEvents]);

  // Lưu sự việc
  const handleSaveEvent = async () => {
    if (!selectedStudentId) {
      alert("Vui lòng chọn học sinh.");
      return;
    }
    if (!selectedEventCode) {
      alert("Vui lòng chọn tiêu chí nề nếp / thi đua trong 40 mã quy chuẩn.");
      return;
    }

    const item = findCatalogItemByCode(selectedEventCode);
    if (!item) return;

    let pts = customPoints;
    if (item.code === "TS01") {
      pts = Math.max(3, Math.min(10, customPoints || 5));
    } else if (item.code === "PT02") {
      pts = Math.max(2, Math.min(5, customPoints || 3));
    } else {
      pts = item.plus > 0 ? item.plus : item.minus;
    }

    const calculatedPoints = item.plus > 0 ? Math.abs(pts) : -Math.abs(pts);

    setLoading(true);
    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recordEvent",
          studentId: selectedStudentId,
          code: item.code,
          title: `[${item.code}] ${item.description}`,
          points: calculatedPoints,
          category: item.plus > 0 ? "praise" : "violation",
          week,
          eventDate,
          period: eventPeriod || undefined,
          subject: eventSubject || undefined,
          note: eventNote || undefined,
          serious: item.serious,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setShowConfirmModal(false);
        alert(`✓ Đã ghi nhận thành công cho ${currentSelectedStudent?.fullName}!`);
        // Reset form
        setSelectedEventCode("");
        setEventPeriod("");
        setEventSubject("");
        setEventNote("");
        fetchDashboard(week, selectedTeamFilter);
      } else {
        alert(data.message || "Không thể ghi nhận sự việc.");
      }
    } catch {
      alert("Lỗi kết nối khi lưu sự việc thi đua.");
    } finally {
      setLoading(false);
    }
  };

  // Chatbot xử lý
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = chatInput.trim();
    if (!raw) return;

    const userMsgId = `u_${Date.now()}`;
    setChatMessages((prev) => [...prev, { id: userMsgId, sender: "user", text: raw }]);
    setChatInput("");

    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parseNaturalLanguage", text: raw }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.parsed) {
        const p = data.parsed;
        if (p.matched && p.matchedEvent) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              sender: "bot",
              text: `Đã nhận diện: ${p.matchedStudent.fullName} (Tổ ${p.matchedStudent.team}) — ${p.matchedEvent.code}: ${p.matchedEvent.description} (${p.matchedEvent.plus > 0 ? `+${p.matchedEvent.plus}đ` : `-${p.matchedEvent.minus}đ`}).`,
              suggestion: {
                studentId: p.matchedStudent.studentId,
                studentName: p.matchedStudent.fullName,
                team: p.matchedStudent.team,
                code: p.matchedEvent.code,
                group: p.matchedEvent.group,
                description: p.matchedEvent.description,
                plus: p.matchedEvent.plus,
                minus: p.matchedEvent.minus,
                serious: p.matchedEvent.serious,
                note: p.matchedEvent.note,
              },
            },
          ]);
        } else {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              sender: "bot",
              text: p.message || "Chưa nhận diện được học sinh hoặc hành vi tương ứng.",
            },
          ]);
        }
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: "bot",
          text: "Lỗi kết nối khi phân tích ngôn ngữ tự nhiên.",
        },
      ]);
    }
  };

  // Xác nhận lưu từ Chatbot suggestion
  const handleApplyChatbotSuggestion = async (sug: any) => {
    if (!sug) return;
    const pts = sug.plus > 0 ? sug.plus : -sug.minus;
    setLoading(true);
    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recordEvent",
          studentId: sug.studentId,
          code: sug.code,
          title: `[${sug.code}] ${sug.description}`,
          points: pts,
          category: sug.plus > 0 ? "praise" : "violation",
          week,
          eventDate: new Date().toISOString().split("T")[0],
          note: sug.note || "Ghi nhận qua Chatbot AI",
          serious: sug.serious,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ Đã ghi nhận thành công cho ${sug.studentName}!`);
        fetchDashboard(week, selectedTeamFilter);
      } else {
        alert(data.message || "Không thể lưu.");
      }
    } catch {
      alert("Lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  };

  // Khóa / Mở khóa tuần
  const handleToggleLockWeek = async () => {
    const actionName = weekLocked ? "unlockWeek" : "lockWeek";
    const confirmMsg = weekLocked
      ? `Mở khóa Tuần ${week}? (Học sinh và tổ trưởng sẽ có thể gửi báo cáo)`
      : `Khóa sổ Tuần ${week}? (Sau khi khóa, chỉ Giáo viên Chủ nhiệm mới có quyền ghi nhận)`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, week }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setWeekLocked(!weekLocked);
        alert(weekLocked ? `Đã mở khóa Tuần ${week}` : `Đã khóa sổ Tuần ${week}`);
      }
    } catch {}
  };

  // Bổ nhiệm tổ trưởng
  const handleAssignLeader = async (team: number) => {
    const studentId = leaderSelections[team];
    const pin = leaderPins[team] || "123456";
    if (!studentId) {
      alert(`Vui lòng chọn học sinh làm Tổ trưởng Tổ ${team}.`);
      return;
    }
    const student = students.find((s) => s.studentId === studentId);
    if (!window.confirm(`Xác nhận bổ nhiệm ${student?.fullName} làm Tổ trưởng Tổ ${team}?\nTài khoản: to${team}\nMã PIN: ${pin}`)) return;

    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assignLeader", team, studentId, pin }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ Đã bổ nhiệm Tổ trưởng Tổ ${team} thành công!`);
        fetchLeaders();
      }
    } catch {}
  };

  const handleResetPin = async (team: number) => {
    const pin = leaderPins[team] || "123456";
    if (!window.confirm(`Cấp lại mã PIN ${pin} cho Tổ trưởng Tổ ${team}?`)) return;

    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetPin", team, pin }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ Đã cấp lại mã PIN thành công!`);
        fetchLeaders();
      }
    } catch {}
  };

  const handleRevokeLeader = async (team: number) => {
    if (!window.confirm(`Xác nhận thu hồi quyền Tổ trưởng Tổ ${team}?`)) return;

    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revokeLeader", team }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`Đã thu hồi quyền Tổ trưởng Tổ ${team}`);
        fetchLeaders();
      }
    } catch {}
  };

  // Duyệt submission
  const handleReviewSubmission = async (
    submissionId: string,
    action: "approveSubmission" | "rejectSubmission"
  ) => {
    const isApprove = action === "approveSubmission";
    const note = prompt(
      isApprove ? "Ghi chú duyệt (tuỳ chọn):" : "Lý do từ chối (tuỳ chọn):",
      ""
    );
    if (note === null) return;

    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, submissionId, reviewNote: note }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert(isApprove ? "✓ Đã duyệt sự việc!" : "Đã từ chối sự việc.");
        fetchSubmissions(week, selectedTeamFilter);
        fetchDashboard(week, selectedTeamFilter);
      }
    } catch {}
  };

  // Xóa sự việc trong nhật ký
  const handleCancelEvent = async (eventId: string) => {
    const reason = prompt("Lý do hủy/xóa sự việc này:", "GVCN điều chỉnh");
    if (!reason) return;

    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancelEvent", eventId, cancelReason: reason }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert("Đã hủy sự việc.");
        fetchHistory(week, selectedTeamFilter);
        fetchDashboard(week, selectedTeamFilter);
      }
    } catch {}
  };

  // Xuất file CSV báo cáo thi đua tuần (Bao gồm Bảng 4 Tổ & Bảng Cá Nhân)
  const handleExportCompetitionCsv = () => {
    if (!dashboard || !dashboard.ranking) return;

    let csv = "\uFEFF";
    csv += "TRƯỜNG THCS QUANG TRUNG - XUÂN HƯƠNG - ĐÀ LẠT\r\n";
    csv += `BẢNG TỔNG KẾT THI ĐUA & NỀ NẾP LỚP 8A6 - TUẦN ${week}\r\n`;
    csv += `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}\r\n\r\n`;

    // PHẦN 1: BẢNG XẾP HẠNG THI ĐUA 4 TỔ
    const teamSums = dashboard?.teamSummaries || [];
    csv += "=== 1. BẢNG XẾP HẠNG THI ĐUA 4 TỔ ===\r\n";
    const teamHeaders = ["Hạng Tổ", "Tên Tổ", "Tổ Trưởng", "Sĩ Số", "Điểm TB Tuần", "Tổng Điểm Cộng", "Tổng Điểm Trừ", "Số Em Xuất Sắc (100đ)"];
    const teamRows = teamSums.map((t) => [
      `Hạng ${t.rank}`,
      t.teamName,
      t.leaderName || "Chưa có",
      `${t.memberCount} học sinh`,
      t.avgScore,
      `+${t.totalPlus}`,
      `-${t.totalMinus}`,
      t.perfectCount,
    ]);

    // PHẦN 2: BẢNG ĐIỂM CHI TIẾT TỪNG HỌC SINH
    const studentHeaders = ["Hạng Lớp", "Mã Định Danh", "STT", "Họ và Tên", "Tổ Quy Định", "Điểm Gốc", "Điểm Cộng (+)", "Điểm Trừ (-)", "Điểm Tổng Kết (/100)", "Xếp Loại Nề Nếp", "Số Sự Việc"];
    const studentRows = dashboard.ranking.map((r) => [
      r.rank,
      r.studentId,
      r.studentId.replace(/\D/g, ""),
      r.fullName,
      `Tổ ${r.team}`,
      100,
      `+${r.plus}`,
      `-${r.minus}`,
      r.score,
      r.grade,
      r.eventCount,
    ]);

    csv +=
      [teamHeaders, ...teamRows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n") +
      "\r\n\r\n=== 2. DANH SÁCH ĐIỂM CHI TIẾT TỪNG HỌC SINH ===\r\n" +
      [studentHeaders, ...studentRows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Bang_Tong_Ket_Thi_Dua_4_To_8A6_Tuan_${week}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // In Bảng Tổng Kết Thi Đua Tuần A4
  const handlePrintWeeklyReport = () => {
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      alert("Vui lòng cho phép mở popup để in ấn.");
      return;
    }

    const teamSums = dashboard?.teamSummaries || [];
    const teamRowsHtml = teamSums
      .map(
        (t) => `
      <tr>
        <td style="text-align:center;font-weight:bold">${t.rank === 1 ? "🥇 Hạng 1" : t.rank === 2 ? "🥈 Hạng 2" : t.rank === 3 ? "🥉 Hạng 3" : "🎖️ Hạng 4"}</td>
        <td style="text-align:center;font-weight:bold">${t.teamName}</td>
        <td>${t.leaderName || "Chưa có"}</td>
        <td style="text-align:center">${t.memberCount} HS</td>
        <td style="text-align:center;font-weight:bold;color:#0d6e64">${t.avgScore}đ</td>
        <td style="text-align:center;color:#059669">+${t.totalPlus}</td>
        <td style="text-align:center;color:#dc2626">-${t.totalMinus}</td>
        <td style="text-align:center">${t.perfectCount} em</td>
      </tr>
    `
      )
      .join("");

    const studentRowsHtml = (dashboard?.ranking || [])
      .map(
        (r) => `
      <tr>
        <td style="text-align:center;font-weight:bold">${r.rank}</td>
        <td style="text-align:center;font-family:monospace">${r.studentId}</td>
        <td><strong>${r.fullName}</strong> ${r.isTeamLeader ? "(Tổ trưởng)" : ""}</td>
        <td style="text-align:center">Tổ ${r.team}</td>
        <td style="text-align:center;color:#059669">+${r.plus}</td>
        <td style="text-align:center;color:#dc2626">-${r.minus}</td>
        <td style="text-align:center;font-weight:bold;font-size:13px">${r.score}đ</td>
        <td style="text-align:center">
          <span style="font-weight:bold;padding:2px 6px;border-radius:4px;font-size:11px;${
            r.score >= 100
              ? "background:#d1fae5;color:#065f46"
              : r.score >= 90
              ? "background:#dbeafe;color:#1e40af"
              : r.score >= 75
              ? "background:#fef3c7;color:#92400e"
              : "background:#fee2e2;color:#991b1b"
          }">${r.grade}</span>
        </td>
      </tr>
    `
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bảng Thi Đua 4 Tổ & Nề Nếp Lớp 8A6 - Tuần ${week}</title>
          <style>
            body { font-family: "Segoe UI", Arial, sans-serif; padding: 20px; color: #111; font-size: 12px; }
            h2, h3 { text-align: center; margin: 4px 0; text-transform: uppercase; }
            .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
            th, td { border: 1px solid #999; padding: 5px 6px; font-size: 11px; }
            th { background-color: #f3f4f6; text-transform: uppercase; font-size: 10px; }
            .kpi-row { display: flex; gap: 10px; justify-content: space-around; margin: 12px 0; background: #f9fafb; padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .kpi-card { text-align: center; }
            .kpi-num { font-size: 16px; font-weight: bold; color: #0d6e64; }
            .sign-box { display: flex; justify-content: space-between; margin-top: 24px; }
            .sign-col { text-align: center; width: 200px; }
            @media print {
              body { padding: 0; }
              @page { size: A4 portrait; margin: 12mm; }
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <strong>TRƯỜNG THCS QUANG TRUNG</strong><br/>
              <span>Phường Xuân Hương - TP. Đà Lạt</span>
            </div>
            <div style="text-align: right">
              <strong>LỚP 8A6 - NĂM HỌC 2025-2026</strong><br/>
              <span>GVCN: Nguyễn Thúy Hằng</span>
            </div>
          </div>

          <h2>BẢNG TỔNG KẾT THI ĐUA 4 TỔ & NỀ NẾP HỌC SINH</h2>
          <h3>TUẦN THỨ ${week} (THANG ĐIỂM CHUẨN 100/100)</h3>

          <div class="kpi-row">
            <div class="kpi-card"><div>Điểm TB Lớp</div><div class="kpi-num">${dashboard?.avgScore || 100}đ</div></div>
            <div class="kpi-card"><div>Tổng Điểm Cộng</div><div class="kpi-num" style="color:#059669">+${dashboard?.totalPlus || 0}đ</div></div>
            <div class="kpi-card"><div>Tổng Điểm Trừ</div><div class="kpi-num" style="color:#dc2626">-${dashboard?.totalMinus || 0}đ</div></div>
            <div class="kpi-card"><div>Sĩ Số Học Sinh</div><div class="kpi-num">${dashboard?.studentCount || 45} em</div></div>
            <div class="kpi-card"><div>Xuất Sắc (100đ)</div><div class="kpi-num">${dashboard?.perfectCount || 0} em</div></div>
          </div>

          <h4 style="margin: 8px 0 4px; text-transform: uppercase; color: #0d6e64;">1. BẢNG XẾP HẠNG THI ĐUA 4 TỔ</h4>
          <table>
            <thead>
              <tr>
                <th>Hạng Tổ</th>
                <th>Tên Tổ</th>
                <th>Tổ Trưởng</th>
                <th>Sĩ Số</th>
                <th>Điểm TB</th>
                <th>Điểm Cộng (+)</th>
                <th>Điểm Trừ (-)</th>
                <th>Số Em Xuất Sắc</th>
              </tr>
            </thead>
            <tbody>
              ${teamRowsHtml}
            </tbody>
          </table>

          <h4 style="margin: 8px 0 4px; text-transform: uppercase; color: #0d6e64;">2. BẢNG ĐIỂM CHI TIẾT TỪNG HỌC SINH (45 EM)</h4>
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Mã HS</th>
                <th>Họ và Tên</th>
                <th>Tổ</th>
                <th>Cộng (+)</th>
                <th>Trừ (-)</th>
                <th>Tổng Điểm</th>
                <th>Xếp Loại</th>
              </tr>
            </thead>
            <tbody>
              ${studentRowsHtml}
            </tbody>
          </table>

          <div class="sign-box">
            <div class="sign-col">
              <strong>LỚP TRƯỞNG</strong><br/><br/><br/>
              <span>(Ký & ghi rõ họ tên)</span>
            </div>
            <div class="sign-col">
              <strong>GIÁO VIÊN CHỦ NHIỆM</strong><br/><br/><br/>
              <span>Nguyễn Thúy Hằng</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // In Phiếu Điểm Cá Nhân Cho 1 Học Sinh A4
  const handlePrintStudentReport = (student: StudentRankItem) => {
    const printWin = window.open("", "_blank", "width=850,height=700");
    if (!printWin) {
      alert("Vui lòng cho phép popup để in phiếu học sinh.");
      return;
    }

    const eventsHtml = studentEventsForReport
      .map(
        (e, idx) => `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="text-align:center">${e.eventDate}</td>
        <td style="text-align:center;font-family:monospace;font-weight:bold">${e.code}</td>
        <td>${e.description}</td>
        <td style="text-align:center;font-weight:bold;color:${e.plus > 0 ? "#059669" : "#dc2626"}">${
          e.plus > 0 ? `+${e.plus}đ` : `-${e.minus}đ`
        }</td>
        <td>${e.createdByName || "GVCN"}</td>
        <td>${e.note || "—"}</td>
      </tr>
    `
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Phiếu Đánh Giá Nề Nếp - ${student.fullName} (Tuần ${week})</title>
          <style>
            body { font-family: "Segoe UI", Arial, sans-serif; padding: 24px; color: #111; font-size: 13px; line-height: 1.4; }
            h2, h3 { text-align: center; margin: 4px 0; text-transform: uppercase; }
            .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th, td { border: 1px solid #888; padding: 6px 8px; font-size: 12px; }
            th { background-color: #f3f4f6; text-transform: uppercase; font-size: 11px; }
            .student-info { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .score-box { display: flex; justify-content: space-around; background: #e0f2fe; border: 1px solid #90cdf4; border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center; }
            .score-val { font-size: 18px; font-weight: bold; }
            .sign-box { display: flex; justify-content: space-between; margin-top: 30px; }
            .sign-col { text-align: center; width: 220px; }
            @media print {
              body { padding: 0; }
              @page { size: A4 portrait; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <strong>TRƯỜNG THCS QUANG TRUNG</strong><br/>
              <span>Phường Xuân Hương - TP. Đà Lạt</span>
            </div>
            <div style="text-align: right">
              <strong>LỚP 8A6 - NĂM HỌC 2025-2026</strong><br/>
              <span>GVCN: Nguyễn Thúy Hằng</span>
            </div>
          </div>

          <h2>PHIẾU ĐÁNH GIÁ NỀ NẾP & RÈN LUYỆN HỌC SINH</h2>
          <h3>KẾT QUẢ THI ĐUA TUẦN THỨ ${week}</h3>

          <div class="student-info">
            <div><strong>Họ và tên học sinh:</strong> ${student.fullName} ${student.isTeamLeader ? "(👑 Tổ trưởng)" : ""}</div>
            <div><strong>Mã định danh:</strong> ${student.studentId} (STT: ${student.studentId.replace(/\D/g, "")})</div>
            <div><strong>Tổ sinh hoạt:</strong> Tổ ${student.team}</div>
            <div><strong>Thứ hạng trong lớp:</strong> Hạng ${student.rank} / 45 học sinh</div>
          </div>

          <div class="score-box">
            <div>
              <div>Điểm Khởi Điểm</div>
              <div class="score-val" style="color: #4b5563">100đ</div>
            </div>
            <div>
              <div>Tổng Điểm Cộng (+)</div>
              <div class="score-val" style="color: #059669">+${student.plus}đ</div>
            </div>
            <div>
              <div>Tổng Điểm Trừ (-)</div>
              <div class="score-val" style="color: #dc2626">-${student.minus}đ</div>
            </div>
            <div>
              <div>ĐIỂM TỔNG KẾT</div>
              <div class="score-val" style="color: #0d6e64">${student.score}đ</div>
            </div>
            <div>
              <div>XẾP LOẠI</div>
              <div class="score-val" style="color: #1e40af">${student.grade}</div>
            </div>
          </div>

          <h4 style="margin: 12px 0 6px; text-transform: uppercase; color: #0d6e64;">
            NHẬT KÝ CÁC SỰ VIỆC NỀ NẾP TRONG TUẦN (${studentEventsForReport.length} sự việc)
          </h4>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Ngày</th>
                <th>Mã</th>
                <th>Nội dung tiêu chí</th>
                <th>Điểm</th>
                <th>Người ghi nhận</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${eventsHtml || '<tr><td colspan="7" style="text-align:center;padding:12px">Không có sự việc vi phạm hay trừ điểm nào. Duy trì nề nếp xuất sắc!</td></tr>'}
            </tbody>
          </table>

          <div class="sign-box">
            <div class="sign-col">
              <strong>Ý KIẾN PHỤ HUYNH</strong><br/><br/><br/>
              <span>(Ký & ghi rõ họ tên)</span>
            </div>
            <div class="sign-col">
              <strong>GIÁO VIÊN CHỦ NHIỆM</strong><br/><br/><br/>
              <span>Nguyễn Thúy Hằng</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl border border-line max-h-[96vh] flex flex-col text-left">
        {/* HEADER CỦA MODAL */}
        <div className="flex items-center justify-between pb-3 border-b border-line gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-xl shadow-md shrink-0">
              🏆
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-base font-bold text-[#123f62] uppercase tracking-tight truncate">
                  Hệ Thống Thi Đua & Nề Nếp Lớp 8A6 (40 Tiêu Chí Quy Chuẩn 6 Nhóm)
                </h2>
                {weekLocked ? (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    🔒 ĐÃ KHÓA SỔ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    🔓 ĐANG MỞ
                  </span>
                )}
              </div>
              <p className="text-[11px] text-brandText-muted truncate hidden sm:block">
                Quản lý xếp hạng 4 Tổ, bảng điểm cá nhân /100đ, Chatbot AI và minh bạch hóa tiêu chí chấm điểm
              </p>
            </div>
          </div>

          {/* Bộ điều khiển Tuần & Nút Đóng */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-[#f0f8ff] border border-[#cde2f2] rounded-xl px-2 py-1 text-xs">
              <label className="font-bold text-[#123f62] text-[11px]">Tuần:</label>
              <select
                value={week}
                onChange={(e) => setWeek(parseInt(e.target.value, 10))}
                className="font-black text-primary bg-transparent outline-none cursor-pointer"
              >
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleToggleLockWeek}
              className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                weekLocked
                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
              title={weekLocked ? "Mở khóa tuần" : "Khóa sổ tuần"}
            >
              {weekLocked ? "🔒" : "🔓"}
            </button>

            <button
              onClick={onClose}
              className="text-brandText-muted hover:text-brandText bg-gray-100 hover:bg-gray-200 rounded-xl px-2.5 py-1.5 transition text-xs font-bold cursor-pointer shrink-0"
            >
              ✕ Đóng
            </button>
          </div>
        </div>

        {/* 8 TAB NAVIGATION (BỔ SUNG TAB BẢNG 40 TIÊU CHÍ CHUẨN) */}
        <div className="flex gap-1.5 my-2.5 shrink-0 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>📊</span> 1. Tổng quan Lớp
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("teams")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "teams"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <span>🏆</span> 2. Thi Đua 4 Tổ
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("record")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "record"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>✍️</span> 3. Ghi nhận Nề nếp (40 Mã)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "chat"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>💬</span> 4. Chatbot Nhận diện AI
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "history"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>🧾</span> 5. Nhật ký & Báo Cáo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leaders")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "leaders"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>👑</span> 6. Quản lý Tổ trưởng
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("submissions")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer relative ${
              activeTab === "submissions"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>✅</span> 7. Chờ duyệt
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rubric")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "rubric"
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200"
            }`}
          >
            <span>📋</span> 8. Bảng 40 Tiêu Chí Chuẩn
          </button>
        </div>

        {/* TAB 1: TỔNG QUAN LỚP (DASHBOARD) */}
        {activeTab === "dashboard" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* 5 KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 rounded-2xl p-3.5 shadow-sm">
                <div className="text-[11px] font-bold text-blue-700 uppercase">Điểm TB Lớp</div>
                <div className="text-2xl font-black text-[#123f62] mt-1">
                  {dashboard?.avgScore || 100}
                  <span className="text-xs font-normal text-gray-500">/100</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 rounded-2xl p-3.5 shadow-sm">
                <div className="text-[11px] font-bold text-emerald-700 uppercase">Tổng Điểm Cộng</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  +{dashboard?.totalPlus || 0}
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-50 to-red-50/50 border border-rose-200/80 rounded-2xl p-3.5 shadow-sm">
                <div className="text-[11px] font-bold text-rose-700 uppercase">Tổng Điểm Trừ</div>
                <div className="text-2xl font-black text-rose-700 mt-1">
                  -{dashboard?.totalMinus || 0}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-3.5 shadow-sm">
                <div className="text-[11px] font-bold text-amber-700 uppercase">Sĩ Số Đánh Giá</div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {dashboard?.studentCount || 45}
                  <span className="text-xs font-normal text-gray-500"> học sinh</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 border border-purple-200/80 rounded-2xl p-3.5 shadow-sm">
                <div className="text-[11px] font-bold text-purple-700 uppercase">Xuất Sắc (100đ)</div>
                <div className="text-2xl font-black text-purple-900 mt-1">
                  {dashboard?.perfectCount || 0}
                  <span className="text-xs font-normal text-gray-500"> em</span>
                </div>
              </div>
            </div>

            {/* BẢNG TỔNG HỢP 4 TỔ NHANH */}
            <div className="bg-white border border-[#dce9f2] rounded-2xl p-3.5 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase text-[#123f62] flex items-center gap-1.5">
                  <span>🏆</span> Bảng Tổng Hợp Thi Đua 4 Tổ (Tuần {week})
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("teams")}
                  className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Xem chi tiết 4 Tổ ➜
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {dashboard?.teamSummaries?.map((t) => (
                  <div
                    key={t.team}
                    onClick={() => setActiveTab("teams")}
                    className="p-3 rounded-xl border bg-gradient-to-b from-white to-[#fbfdfe] border-gray-200 hover:border-amber-400 hover:shadow-sm transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-gray-800 flex items-center gap-1">
                        <span>
                          {t.rank === 1
                            ? "🥇"
                            : t.rank === 2
                            ? "🥈"
                            : t.rank === 3
                            ? "🥉"
                            : "🎖️"}
                        </span>
                        <span>{t.teamName}</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded">
                        Hạng {t.rank}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                      <span className="text-[11px] text-gray-500">Điểm TB:</span>
                      <span className="text-base font-black text-[#0d6e64]">{t.avgScore}đ</span>
                    </div>
                    <div className="text-[10px] text-gray-500 flex justify-between border-t border-gray-100 pt-1">
                      <span>Tổ trưởng: <strong>{t.leaderName ? t.leaderName.split(" ").slice(-2).join(" ") : "—"}</strong></span>
                      <span>+{t.totalPlus} / -{t.totalMinus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2 Cột: Bảng Xếp Hạng Cá Nhân & Sự Việc Gần Đây */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
              {/* Bảng Xếp Hạng Cá Nhân Toàn Lớp */}
              <div className="bg-white border border-line rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="text-xs font-bold uppercase text-[#123f62] flex items-center gap-1.5">
                    <span>🏅</span> Xếp Hạng Cá Nhân (Toàn Lớp 45 Em)
                  </h3>
                  <span className="text-[10px] text-primary font-semibold">
                    💡 Click vào học sinh để xem Phiếu Chấm Điểm
                  </span>
                </div>

                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                  {dashboard?.ranking?.map((r) => (
                    <div
                      key={r.studentId}
                      onClick={() => setSelectedStudentForReport(r)}
                      className="p-2.5 bg-[#fbfdff] border border-line/80 rounded-xl hover:border-primary/80 hover:bg-blue-50/30 transition space-y-1.5 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg font-black text-[11px] flex items-center justify-center shrink-0 ${
                              r.rank === 1
                                ? "bg-amber-400 text-amber-950 shadow-sm"
                                : r.rank === 2
                                ? "bg-slate-300 text-slate-900"
                                : r.rank === 3
                                ? "bg-amber-600/30 text-amber-900"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {r.rank}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 group-hover:text-primary transition truncate flex items-center gap-1">
                              {r.isTeamLeader && <span title="Tổ trưởng">👑</span>}
                              <span>{r.fullName}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Tổ {r.team} {r.isTeamLeader ? "· Tổ trưởng" : ""} · +{r.plus} / -{r.minus}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              r.score >= 100
                                ? "bg-emerald-100 text-emerald-900"
                                : r.score >= 90
                                ? "bg-blue-100 text-blue-900"
                                : r.score >= 75
                                ? "bg-amber-100 text-amber-900"
                                : "bg-rose-100 text-rose-900"
                            }`}
                          >
                            {r.grade}
                          </span>
                          <span className="font-black text-sm text-[#123f62]">{r.score}đ</span>
                          <span className="text-gray-400 group-hover:text-primary text-xs">🔍</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            r.score >= 100
                              ? "bg-emerald-500"
                              : r.score >= 90
                              ? "bg-blue-500"
                              : r.score >= 75
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, r.score))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sự Việc Gần Đây */}
              <div className="bg-white border border-line rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="text-xs font-bold uppercase text-[#123f62] flex items-center gap-1.5">
                    <span>⚡</span> Sự Việc Gần Đây
                  </h3>
                  <span className="text-[11px] text-gray-500">Tuần {week}</span>
                </div>

                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                  {!dashboard?.recentEvents || dashboard.recentEvents.length === 0 ? (
                    <div className="text-center py-12 text-xs text-gray-400 bg-gray-50 rounded-2xl">
                      Chưa có sự việc nào được ghi nhận trong tuần này.
                    </div>
                  ) : (
                    dashboard.recentEvents.map((e) => (
                      <div
                        key={e.eventId}
                        className={`p-3 rounded-xl border text-xs space-y-1 transition ${
                          e.plus > 0
                            ? "bg-emerald-50/50 border-emerald-200"
                            : "bg-rose-50/50 border-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-gray-900">
                            {e.studentName} · <span className="text-primary font-mono">{e.code}</span>
                          </span>
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded ${
                              e.plus > 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                            }`}
                          >
                            {e.plus > 0 ? `+${e.plus}` : `-${e.minus}`}đ
                          </span>
                        </div>
                        <div className="text-gray-700 font-medium">{e.description}</div>
                        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                          <span>
                            {e.eventDate} · Người ghi: {e.createdByName}
                          </span>
                          {e.serious && (
                            <span className="px-1.5 py-0.2 bg-rose-500 text-white font-bold rounded">
                              CẦN GVCN
                            </span>
                          )}
                        </div>
                        {e.note && <div className="text-[10px] text-gray-600 italic bg-white/60 p-1.5 rounded">Ghi chú: {e.note}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THI ĐUA 4 TỔ (TEAM EVALUATION ENGINE) */}
        {activeTab === "teams" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Header & Bộ lọc */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-yellow-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 flex-wrap shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-amber-950 uppercase">
                    Bảng Đánh Giá & Xếp Hạng Thi Đua 4 Tổ (Lớp 8A6 - Tuần {week})
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Điểm TB Tổ = Tổng điểm thành viên / Sĩ số tổ · Tiêu chí xét: Điểm TB cao nhất ➔ Điểm trừ ít nhất
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCompetitionCsv}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <span>📥</span> Xuất CSV 4 Tổ
                </button>
                <button
                  type="button"
                  onClick={handlePrintWeeklyReport}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <span>🖨️</span> In Bảng Tuần A4
                </button>
              </div>
            </div>

            {/* 4 Thẻ Xếp Hạng 4 Tổ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {dashboard?.teamSummaries?.map((t) => (
                <div
                  key={t.team}
                  className={`bg-white border rounded-2xl p-4 shadow-sm space-y-3 transition ${
                    t.rank === 1
                      ? "border-amber-400 ring-2 ring-amber-300/60 bg-gradient-to-b from-amber-50/40 to-white"
                      : t.rank === 2
                      ? "border-slate-300"
                      : t.rank === 3
                      ? "border-amber-600/30"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {t.rank === 1 ? "🥇" : t.rank === 2 ? "🥈" : t.rank === 3 ? "🥉" : "🎖️"}
                      </span>
                      <div>
                        <div className="font-extrabold text-sm text-[#123f62]">
                          {t.teamName} · Hạng {t.rank}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Sĩ số: <strong>{t.memberCount} HS</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Điểm TB & Chỉ số */}
                  <div className="bg-[#f8fbfe] border border-[#e2eef7] rounded-xl p-2.5 text-center space-y-1">
                    <div className="text-[11px] text-gray-500 font-semibold uppercase">Điểm Trung Bình Tổ</div>
                    <div className="text-3xl font-black text-[#0d6e64]">{t.avgScore}đ</div>
                    <div className="flex justify-around text-[10px] pt-1 text-gray-600 border-t border-gray-200/60">
                      <span className="text-emerald-700 font-bold">+{t.totalPlus}đ thưởng</span>
                      <span className="text-rose-700 font-bold">-{t.totalMinus}đ phạt</span>
                    </div>
                  </div>

                  {/* Thông tin Tổ trưởng */}
                  <div className="text-xs text-gray-700 bg-amber-50/60 border border-amber-200/60 rounded-xl p-2 flex items-center justify-between">
                    <span className="text-[11px] text-amber-900 font-bold flex items-center gap-1">
                      <span>👑</span> Tổ trưởng:
                    </span>
                    <strong className="text-amber-950 truncate max-w-[120px]">
                      {t.leaderName || "Chưa bổ nhiệm"}
                    </strong>
                  </div>

                  {/* Danh sách thành viên tổ */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-gray-600 flex justify-between">
                      <span>Thành viên ({t.members?.length || 0}):</span>
                      <span>Điểm /100</span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {t.members?.map((m) => (
                        <div
                          key={m.studentId}
                          onClick={() => setSelectedStudentForReport(m)}
                          className="p-1.5 bg-[#fcfdfe] hover:bg-blue-50 border border-gray-100 rounded-lg text-xs flex items-center justify-between gap-1 cursor-pointer transition"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded bg-gray-100 text-gray-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {m.studentId.replace(/\D/g, "")}
                            </span>
                            <span className="font-semibold text-gray-800 truncate">
                              {m.isTeamLeader && "👑 "}
                              {m.fullName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-emerald-600 font-bold">+{m.plus}</span>
                            <span className="text-[10px] text-rose-600 font-bold">-{m.minus}</span>
                            <span
                              className={`font-black text-xs px-1.5 py-0.2 rounded ${
                                m.score >= 100
                                  ? "bg-emerald-100 text-emerald-900"
                                  : m.score >= 90
                                  ? "bg-blue-100 text-blue-900"
                                  : "bg-rose-100 text-rose-900"
                              }`}
                            >
                              {m.score}đ
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setRecordTeamFilter(t.team);
                        setActiveTab("record");
                      }}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                    >
                      + Ghi nhận cho Tổ {t.team}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GHI NHẬN NỀ NẾP (40 MÃ QUY CHUẨN) */}
        {activeTab === "record" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="bg-[#fcfdff] border border-[#d6e7f4] rounded-2xl p-4 shadow-sm space-y-4">
              <div className="text-xs font-bold text-[#0d6e64] uppercase flex items-center gap-1.5">
                <span>✍️</span> Biểu Mẫu Ghi Nhận Nề Nếp & Chấm Điểm Thi Đua
              </div>

              {/* BƯỚC 1: CHỌN HỌC SINH */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>Chọn Học Sinh Lớp 8A6:</span>
                  </label>

                  {/* Filter Tổ */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-500 text-[11px]">Lọc Tổ:</span>
                    <button
                      type="button"
                      onClick={() => setRecordTeamFilter(0)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                        recordTeamFilter === 0 ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      Tất cả
                    </button>
                    {[1, 2, 3, 4].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRecordTeamFilter(t)}
                        className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                          recordTeamFilter === t ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Tổ {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="🔍 Gõ tên hoặc STT học sinh..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="flex-1 h-9 px-3 text-xs border border-[#c9deed] rounded-xl outline-none focus:border-primary bg-white"
                  />
                </div>

                {/* Grid chọn học sinh */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#f8fbfe] border border-line-subtle rounded-xl">
                  {filteredStudents.map((s) => {
                    const isSelected = selectedStudentId === s.studentId;
                    return (
                      <button
                        key={s.studentId}
                        type="button"
                        onClick={() => setSelectedStudentId(s.studentId)}
                        className={`p-1.5 rounded-lg border text-left flex items-center justify-between gap-1 transition cursor-pointer text-xs ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-sm font-bold"
                            : "bg-white text-gray-800 border-gray-200 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected ? "bg-white text-primary" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {s.stt}
                          </span>
                          <span className="truncate text-[11px]">{s.fullName}</span>
                        </div>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded shrink-0 ${
                            isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          T{s.team}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BƯỚC 2: CHỌN TIÊU CHÍ TRONG 40 MÃ (6 NHÓM) */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Chọn Tiêu Chí Quy Chuẩn (6 Nhóm - 40 Mã):</span>
                  </label>

                  <input
                    type="text"
                    placeholder="🔍 Tìm tiêu chí..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="h-7 px-2 text-[11px] border border-[#c9deed] rounded-lg outline-none focus:border-primary bg-white w-36 sm:w-48"
                  />
                </div>

                {/* 6 Nhóm Chips */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {COMPETITION_GROUPS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGroup(g)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                        selectedGroup === g
                          ? "bg-[#0d6e64] text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                {/* Grid 40 Mã */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-[#f8fbfe] border border-line-subtle rounded-xl">
                  {filteredCatalog.map((item) => {
                    const isSelected = selectedEventCode === item.code;
                    const isPlus = item.plus > 0;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setSelectedEventCode(item.code)}
                        className={`p-2 rounded-xl border text-left flex items-start justify-between gap-2 transition cursor-pointer ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/30 bg-blue-50/60 shadow-sm"
                            : "border-gray-200 bg-white hover:border-primary/40"
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs text-primary">{item.code}</span>
                            {item.serious && (
                              <span className="px-1 py-0.2 bg-rose-100 text-rose-800 text-[9px] font-bold rounded">
                                ⚠️ CẦN GVCN
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-medium text-gray-800 leading-tight">
                            {item.description}
                          </div>
                        </div>

                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-lg shrink-0 ${
                            isPlus ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isPlus ? `+${item.plus}` : `-${item.minus}`}đ
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Tùy chỉnh điểm cho TS01 hoặc PT02 */}
                {currentSelectedCatalogItem?.code === "TS01" && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center justify-between gap-2">
                    <span className="text-rose-900 font-bold">
                      ⚠️ Mã TS01 (Phá hoại tài sản): Chọn mức trừ từ -3 đến -10 điểm:
                    </span>
                    <div className="flex items-center gap-1">
                      {[3, 5, 7, 10].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setCustomPoints(pts)}
                          className={`px-2 py-1 rounded font-black cursor-pointer ${
                            customPoints === pts ? "bg-rose-600 text-white" : "bg-white text-rose-800 border"
                          }`}
                        >
                          -{pts}đ
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentSelectedCatalogItem?.code === "PT02" && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center justify-between gap-2">
                    <span className="text-emerald-900 font-bold">
                      🌟 Mã PT02 (Thành tích phong trào): Chọn mức cộng từ +2 đến +5 điểm:
                    </span>
                    <div className="flex items-center gap-1">
                      {[2, 3, 4, 5].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setCustomPoints(pts)}
                          className={`px-2 py-1 rounded font-black cursor-pointer ${
                            customPoints === pts
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-emerald-800 border"
                          }`}
                        >
                          +{pts}đ
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BƯỚC 3: CHI TIẾT & GHI NHẬN */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>Thời Gian & Ghi Chú:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-gray-500 font-semibold block text-[10px] mb-0.5">Ngày xảy ra</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full h-9 px-2 border border-[#c9deed] rounded-xl outline-none bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 font-semibold block text-[10px] mb-0.5">Tiết học (tuỳ chọn)</label>
                    <input
                      type="text"
                      placeholder="VD: Tiết 2, Ra chơi, Đầu giờ..."
                      value={eventPeriod}
                      onChange={(e) => setEventPeriod(e.target.value)}
                      className="w-full h-9 px-2 border border-[#c9deed] rounded-xl outline-none bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 font-semibold block text-[10px] mb-0.5">Môn học (tuỳ chọn)</label>
                    <input
                      type="text"
                      placeholder="VD: Toán, Văn, Thể dục..."
                      value={eventSubject}
                      onChange={(e) => setEventSubject(e.target.value)}
                      className="w-full h-9 px-2 border border-[#c9deed] rounded-xl outline-none bg-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 font-semibold block text-[10px] mb-0.5">Ghi chú diễn biến cụ thể</label>
                  <input
                    type="text"
                    placeholder="Mô tả tóm tắt sự việc..."
                    value={eventNote}
                    onChange={(e) => setEventNote(e.target.value)}
                    className="w-full h-9 px-3 border border-[#c9deed] rounded-xl outline-none bg-white text-xs font-medium"
                  />
                </div>

                {/* Button Xác nhận */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedStudentId || !selectedEventCode) {
                        alert("Vui lòng chọn học sinh và tiêu chí nề nếp.");
                        return;
                      }
                      setShowConfirmModal(true);
                    }}
                    className="px-6 py-2.5 bg-[#0d6e64] hover:bg-[#149d8f] text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>✓</span> Tiếp Tục Xác Nhận Ghi Nhận
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHATBOT AI NHẬN DIỆN */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-5 space-y-3">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <div className="font-bold text-xs text-blue-950 uppercase">
                    Trợ Lý AI Nhận Diện Tự Nhiên Nề Nếp 8A6
                  </div>
                  <div className="text-[10px] text-blue-800">
                    Nhập câu nói tự nhiên, AI sẽ tự động phân tích học sinh và mã nề nếp tương ứng.
                  </div>
                </div>
              </div>
            </div>

            {/* Khung chat */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[#f8fbfe] border border-line rounded-2xl">
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-line rounded-bl-none shadow-sm"
                    }`}
                  >
                    {m.text}

                    {m.suggestion && (
                      <div className="mt-2.5 pt-2 border-t border-gray-200 space-y-2">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-emerald-950 text-xs">
                          <div className="font-bold">
                            Xác nhận ghi nhận cho {m.suggestion.studentName} (Tổ {m.suggestion.team})?
                          </div>
                          <div className="text-[11px] text-emerald-800 mt-0.5">
                            Mã: <strong>{m.suggestion.code}</strong> — {m.suggestion.description} (
                            {m.suggestion.plus > 0 ? `+${m.suggestion.plus}đ` : `-${m.suggestion.minus}đ`})
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyChatbotSuggestion(m.suggestion)}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
                        >
                          ✓ Xác Nhận Lưu Ngay
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Chat */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Ví dụ: 'Minh đi học muộn 10 phút', 'Lan phát biểu xây dựng bài rất tốt'..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 h-10 px-3 text-xs border border-[#c9deed] rounded-xl outline-none focus:border-primary bg-white"
              />
              <button
                type="submit"
                className="h-10 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
              >
                Gửi AI
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: NHẬT KÝ & XUẤT BÁO CÁO */}
        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-bold text-[#123f62] uppercase">
                Nhật Ký Sự Việc Nề Nếp Tuần {week} ({historyEvents.length} sự việc)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCompetitionCsv}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>📥</span> Xuất File CSV
                </button>
                <button
                  type="button"
                  onClick={handlePrintWeeklyReport}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 text-[#123f62] border border-[#c9deed] rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>🖨️</span> In Báo Cáo A4
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {historyEvents.length === 0 ? (
                <div className="text-center py-16 text-xs text-gray-400 bg-gray-50 rounded-2xl">
                  Chưa có sự việc nào trong tuần này.
                </div>
              ) : (
                historyEvents.map((e) => (
                  <div
                    key={e.eventId}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                      e.plus > 0 ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{e.studentName}</span>
                        <span className="px-1.5 py-0.2 bg-white text-gray-700 border rounded font-mono text-[10px]">
                          Tổ {e.team}
                        </span>
                        <span className="font-mono font-bold text-primary">[{e.code}]</span>
                        <span className="text-gray-700 font-medium truncate">{e.description}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-2">
                        <span>Ngày: {e.eventDate}</span>
                        <span>· Người ghi: {e.createdByName} ({e.createdByRole})</span>
                        {e.note && <span>· Ghi chú: {e.note}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded ${
                          e.plus > 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        }`}
                      >
                        {e.plus > 0 ? `+${e.plus}` : `-${e.minus}`}đ
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancelEvent(e.eventId)}
                        className="text-gray-400 hover:text-rose-600 p-1 transition cursor-pointer"
                        title="Hủy sự việc"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: QUẢN LÝ TỔ TRƯỞNG */}
        {activeTab === "leaders" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-3.5 shadow-sm space-y-1">
              <div className="font-bold text-xs text-purple-950 uppercase flex items-center gap-1.5">
                <span>👑</span> Bổ Nhiệm & Quản Lý 4 Tổ Trưởng Lớp 8A6
              </div>
              <div className="text-[11px] text-purple-800">
                Mỗi Tổ trưởng được cấp 1 tài khoản đăng nhập (<code>to1</code>, <code>to2</code>, <code>to3</code>, <code>to4</code>) kèm mã PIN để chấm nề nếp thành viên trong tổ.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[1, 2, 3, 4].map((teamNum) => {
                const teamInfo = teamsData.find((t) => t.team === teamNum);
                const currentLeader = teamInfo?.leader;
                const teamStudents = students.filter((s) => s.team === teamNum);

                return (
                  <div
                    key={teamNum}
                    className="bg-white border border-[#dce9f2] rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="font-extrabold text-xs text-[#123f62] flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-primary text-white rounded-md text-[10px]">
                          Tổ {teamNum}
                        </span>
                        <span>Quản Lý Tổ Trưởng</span>
                      </span>
                      <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        User: to{teamNum}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-gray-500 font-semibold block text-[10px] mb-1">
                          Học sinh giữ chức vụ Tổ trưởng:
                        </label>
                        <select
                          value={leaderSelections[teamNum] || ""}
                          onChange={(e) =>
                            setLeaderSelections({ ...leaderSelections, [teamNum]: e.target.value })
                          }
                          className="w-full h-9 px-2.5 bg-white border border-[#c9deed] rounded-xl font-bold text-gray-900 outline-none focus:border-primary"
                        >
                          <option value="">-- Chọn học sinh làm Tổ trưởng --</option>
                          {teamStudents.map((s) => (
                            <option key={s.studentId} value={s.studentId}>
                              {s.stt}. {s.fullName} ({s.studentId})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-gray-500 font-semibold block text-[10px] mb-1">
                          Mã PIN đăng nhập (6 số):
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={leaderPins[teamNum] || "123456"}
                          onChange={(e) =>
                            setLeaderPins({ ...leaderPins, [teamNum]: e.target.value })
                          }
                          className="w-full h-9 px-3 bg-white border border-[#c9deed] rounded-xl font-mono font-bold text-gray-900 outline-none focus:border-primary tracking-wider"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2">
                        {currentLeader ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeLeader(teamNum)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold text-xs cursor-pointer transition"
                          >
                            Thu Hồi
                          </button>
                        ) : (
                          <span />
                        )}

                        <div className="flex gap-1.5">
                          {currentLeader && (
                            <button
                              type="button"
                              onClick={() => handleResetPin(teamNum)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs cursor-pointer transition"
                            >
                              Đổi PIN
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAssignLeader(teamNum)}
                            className="px-4 py-1.5 bg-[#0d6e64] hover:bg-[#149d8f] text-white rounded-xl font-bold text-xs cursor-pointer transition shadow-sm"
                          >
                            Lưu Bổ Nhiệm
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 7: CHỜ DUYỆT (SUBMISSIONS) */}
        {activeTab === "submissions" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#123f62] uppercase">
                Danh Sách Sự Việc Chờ GVCN Phê Duyệt ({submissionsList.length})
              </div>
            </div>

            <div className="space-y-2">
              {submissionsList.length === 0 ? (
                <div className="text-center py-16 text-xs text-gray-400 bg-gray-50 rounded-2xl">
                  Không có sự việc nào đang chờ duyệt.
                </div>
              ) : (
                submissionsList.map((sub) => (
                  <div
                    key={sub.submissionId}
                    className="p-3 bg-white border border-[#dce9f2] rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{sub.studentName}</span>
                        <span className="px-1.5 py-0.2 bg-teal-50 text-teal-800 border border-teal-200 rounded font-mono text-[10px]">
                          Tổ {sub.team}
                        </span>
                        <span className="font-mono font-bold text-primary">[{sub.suggestedCode}]</span>
                        <span className="text-gray-700 font-medium truncate">{sub.description}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-2">
                        <span>Ngày: {sub.eventDate}</span>
                        <span>· Người gửi: {sub.createdByName}</span>
                        {sub.note && <span>· Ghi chú: {sub.note}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded ${
                          sub.plus > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {sub.plus > 0 ? `+${sub.plus}` : `-${sub.minus}`}đ
                      </span>

                      <button
                        type="button"
                        onClick={() => handleReviewSubmission(sub.submissionId, "approveSubmission")}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
                      >
                        ✓ Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewSubmission(sub.submissionId, "rejectSubmission")}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        ✕ Từ Chối
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 8: TRA CỨU BẢNG 40 TIÊU CHÍ QUY CHUẨN MINH BẠCH */}
        {activeTab === "rubric" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 flex-wrap shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-teal-950 uppercase">
                    Bảng Quy Chuẩn 40 Tiêu Chí Nề Nếp & Chấm Điểm Thi Đua (6 Nhóm A..F)
                  </h3>
                  <p className="text-[11px] text-teal-800">
                    Công khai, minh bạch 100% biểu mẫu chấm điểm cho Giáo viên, Tổ trưởng và Học sinh cùng đối chiếu
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="🔍 Tra cứu mã hoặc từ khóa..."
                  value={rubricSearch}
                  onChange={(e) => setRubricSearch(e.target.value)}
                  className="h-8 px-3 text-xs border border-teal-300 rounded-xl outline-none bg-white w-48 sm:w-60 font-medium"
                />
              </div>
            </div>

            {/* Filter chips 6 nhóm */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setRubricGroupFilter("Tất cả")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  rubricGroupFilter === "Tất cả"
                    ? "bg-teal-800 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tất cả (40 tiêu chí)
              </button>
              {COMPETITION_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setRubricGroupFilter(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    rubricGroupFilter === g
                      ? "bg-teal-700 text-white shadow-sm"
                      : "bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200"
                  }`}
                >
                  {g} ({COMPETITION_CATALOG.filter((i) => i.group === g).length})
                </button>
              ))}
            </div>

            {/* Bảng chi tiết 40 tiêu chí */}
            <div className="border border-[#dce9f2] rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f0f8f7] text-[#0d6e64] font-bold border-b border-[#dce9f2]">
                    <th className="py-2.5 px-3 w-16 text-center">Mã</th>
                    <th className="py-2.5 px-3 w-36">Nhóm Quy Định</th>
                    <th className="py-2.5 px-4">Nội Dung Tiêu Chí Đánh Giá</th>
                    <th className="py-2.5 px-3 w-28 text-center">Điểm Số Quy Định</th>
                    <th className="py-2.5 px-3 w-32 text-center">Tính Chất</th>
                    <th className="py-2.5 px-3 w-24 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRubricCatalog.map((item, idx) => {
                    const isPlus = item.plus > 0;
                    return (
                      <tr key={item.code} className={idx % 2 === 0 ? "bg-white" : "bg-[#fafcfe]"}>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-primary">
                          {item.code}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-700">{item.group}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-gray-900">{item.description}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block font-black text-xs px-2 py-0.5 rounded-lg ${
                              isPlus
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isPlus
                              ? item.code === "PT02"
                                ? "+2 đến +5đ"
                                : `+${item.plus}đ`
                              : item.code === "TS01"
                              ? "-3 đến -10đ"
                              : `-${item.minus}đ`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.serious ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md text-[10px]">
                              ⚠️ Nghiêm trọng
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 font-medium rounded-md text-[10px]">
                              Thường quy
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEventCode(item.code);
                              setActiveTab("record");
                            }}
                            className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-[10px] transition cursor-pointer shadow-2xs"
                          >
                            + Ghi mã này
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN GHI NHẬN */}
        {showConfirmModal && currentSelectedCatalogItem && currentSelectedStudent && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-line space-y-3 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <h4 className="font-bold text-sm text-[#123f62] uppercase">
                  Xác Nhận Ghi Nhận Nề Nếp
                </h4>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="bg-[#f8fbfe] border border-line rounded-xl p-3 space-y-2 text-xs">
                <div>
                  <span className="text-gray-500">Học sinh:</span>{" "}
                  <strong>{currentSelectedStudent.fullName}</strong> (Mã: {currentSelectedStudent.studentId} · Tổ {currentSelectedStudent.team})
                </div>
                <div>
                  <span className="text-gray-500">Tiêu chí:</span>{" "}
                  <strong className="text-primary">[{currentSelectedCatalogItem.code}]</strong> {currentSelectedCatalogItem.description}
                </div>
                <div>
                  <span className="text-gray-500">Điểm áp dụng:</span>{" "}
                  <strong
                    className={`text-sm ${
                      currentSelectedCatalogItem.plus > 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {currentSelectedCatalogItem.plus > 0 ? `+${customPoints || currentSelectedCatalogItem.plus}` : `-${customPoints || currentSelectedCatalogItem.minus}`} điểm
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500">Ngày:</span> <strong>{eventDate}</strong> {eventPeriod ? `· ${eventPeriod}` : ""} {eventSubject ? `· Môn ${eventSubject}` : ""}
                </div>
                {eventNote && (
                  <div>
                    <span className="text-gray-500">Ghi chú:</span> <em>{eventNote}</em>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Quay Lại
                </button>
                <button
                  type="button"
                  onClick={handleSaveEvent}
                  disabled={loading}
                  className="px-5 py-1.5 bg-[#0d6e64] hover:bg-[#149d8f] text-white rounded-xl font-bold text-xs cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? "Đang lưu..." : "✓ Xác Nhận & Lưu"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PHIẾU CHẤM ĐIỂM & ĐÁNH GIÁ NỀ NẾP CHI TIẾT CỦA HỌC SINH */}
        {selectedStudentForReport && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-line max-h-[92vh] flex flex-col text-left space-y-3">
              {/* Header phiếu học sinh */}
              <div className="flex items-center justify-between pb-2.5 border-b border-line gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-base font-black shrink-0">
                    {selectedStudentForReport.studentId.replace(/\D/g, "")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#123f62] truncate flex items-center gap-1.5">
                      <span>{selectedStudentForReport.fullName}</span>
                      {selectedStudentForReport.isTeamLeader && (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">
                          👑 Tổ trưởng
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span>Mã: {selectedStudentForReport.studentId}</span>
                      <span>· Tổ {selectedStudentForReport.team}</span>
                      <span>· Tuần {week}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePrintStudentReport(selectedStudentForReport)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span>🖨️</span> In Phiếu A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForReport(null)}
                    className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl p-1.5 transition text-xs font-bold cursor-pointer"
                  >
                    ✕ Đóng
                  </button>
                </div>
              </div>

              {/* BẢNG TỔNG HỢP ĐIỂM MINH BẠCH 100% */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
                <div className="bg-[#f8fafc] border border-gray-200 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Điểm Khởi Điểm</div>
                  <div className="text-lg font-black text-gray-700">100đ</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">Điểm Cộng (+)</div>
                  <div className="text-lg font-black text-emerald-700">+{selectedStudentForReport.plus}đ</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-rose-700 font-bold uppercase">Điểm Trừ (-)</div>
                  <div className="text-lg font-black text-rose-700">-{selectedStudentForReport.minus}đ</div>
                </div>
                <div className="bg-[#eef8f5] border border-teal-200 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-teal-800 font-bold uppercase">ĐIỂM TỔNG KẾT</div>
                  <div className="text-xl font-black text-[#0d6e64]">{selectedStudentForReport.score}đ</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-blue-700 font-bold uppercase">XẾP LOẠI</div>
                  <div className="text-sm font-black text-blue-900 mt-0.5">{selectedStudentForReport.grade}</div>
                </div>
              </div>

              {/* Vị trí xếp hạng */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2 text-xs flex items-center justify-between text-amber-950 shrink-0">
                <span>
                  🏆 Xếp hạng: <strong>Hạng {selectedStudentForReport.rank}</strong> trên toàn lớp 45 học sinh
                </span>
                <span className="font-bold text-[11px] bg-white px-2 py-0.5 rounded-lg border border-amber-300">
                  Tổ {selectedStudentForReport.team}
                </span>
              </div>

              {/* NHẬT KÝ CÁC SỰ VIỆC ĐÃ GHI NHẬN CỦA HỌC SINH NÀY */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                <div className="text-xs font-bold text-gray-700 flex justify-between">
                  <span>Nhật ký sự việc trong tuần ({studentEventsForReport.length} sự việc):</span>
                </div>

                {studentEventsForReport.length === 0 ? (
                  <div className="text-center py-10 text-xs text-emerald-800 bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4">
                    ✨ Không có sự việc vi phạm nào. Học sinh duy trì điểm tuyệt đối 100/100!
                  </div>
                ) : (
                  studentEventsForReport.map((ev) => (
                    <div
                      key={ev.eventId}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        ev.plus > 0 ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-primary">[{ev.code}]</span>
                          <span className="font-bold text-gray-900 truncate">{ev.description}</span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Ngày: {ev.eventDate} {ev.period ? `· ${ev.period}` : ""} {ev.subject ? `· Môn ${ev.subject}` : ""} · Người ghi: {ev.createdByName}
                          {ev.note ? ` · Ghi chú: ${ev.note}` : ""}
                        </div>
                      </div>

                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded shrink-0 ${
                          ev.plus > 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        }`}
                      >
                        {ev.plus > 0 ? `+${ev.plus}` : `-${ev.minus}`}đ
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer hành động */}
              <div className="pt-2 border-t border-line flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentId(selectedStudentForReport.studentId);
                    setSelectedStudentForReport(null);
                    setActiveTab("record");
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  + Ghi Thêm Nề Nếp Cho Em Này
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudentForReport(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
