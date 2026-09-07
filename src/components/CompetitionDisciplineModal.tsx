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

  // Record Form state (3 bước truyền thống)
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

  // =========================================================================
  // 💡 STATE TRỢ LÝ GỢI Ý & NHẬN DIỆN ĐIỂM THÔNG MINH (TAB 4 MỚI)
  // =========================================================================
  const [helperStudentId, setHelperStudentId] = useState<string>("");
  const [helperTeamFilter, setHelperTeamFilter] = useState<number>(0); // 0: Tất cả, 1-4
  const [helperStudentSearch, setHelperStudentSearch] = useState<string>("");
  const [helperKeyword, setHelperKeyword] = useState<string>("");
  const [helperRole, setHelperRole] = useState<"teacher" | "team_leader">("teacher");
  const [helperLeaderTeam, setHelperLeaderTeam] = useState<number>(1);
  const [helperEventDate, setHelperEventDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [helperEventPeriod, setHelperEventPeriod] = useState<string>("");
  const [helperEventNote, setHelperEventNote] = useState<string>("");
  const [helperRecording, setHelperRecording] = useState<boolean>(false);
  const [helperRecentLogs, setHelperRecentLogs] = useState<
    { id: string; studentName: string; team: number; code: string; desc: string; points: number; time: string }[]
  >([]);

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
            if (data.today) {
              setEventDate(data.today);
              setHelperEventDate(data.today);
            }
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

  // Lọc học sinh trong tab Ghi nhận truyền thống
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

  // Lọc học sinh trong tab Trợ Lý Gợi Ý Thông Minh
  const helperFilteredStudents = useMemo(() => {
    const q = normalizeVietnamese(helperStudentSearch);
    return students.filter((s) => {
      if (helperRole === "team_leader" && s.team !== helperLeaderTeam) return false;
      if (helperRole === "teacher" && helperTeamFilter > 0 && s.team !== helperTeamFilter) return false;
      if (!q) return true;
      const normName = normalizeVietnamese(s.fullName);
      const normId = normalizeVietnamese(s.studentId);
      return normName.includes(q) || normId.includes(q) || s.stt.includes(q);
    });
  }, [students, helperRole, helperLeaderTeam, helperTeamFilter, helperStudentSearch]);

  const helperSelectedStudent = useMemo(() => {
    return students.find((s) => s.studentId === helperStudentId) || null;
  }, [students, helperStudentId]);

  // Điểm số tuần hiện tại của học sinh đang được chọn trong Trợ Lý
  const helperStudentScore = useMemo(() => {
    if (!helperSelectedStudent || !dashboard?.ranking) return 100;
    const item = dashboard.ranking.find((r) => r.studentId === helperSelectedStudent.studentId);
    return item ? item.score : 100;
  }, [helperSelectedStudent, dashboard]);

  // Tự động lọc tiêu chí phù hợp theo từ khóa gợi ý
  const helperSuggestedCriteria = useMemo(() => {
    const key = helperKeyword.trim();
    if (!key) {
      // 12 tiêu chí phổ biến & hay sử dụng nhất
      const topCodes = [
        "HT01", "HT05", "PT02", "UX01", "VS01", "CC01",
        "CC02", "CC03", "HT07", "NN06", "NN01", "VS03"
      ];
      return topCodes
        .map((c) => findCatalogItemByCode(c))
        .filter((i): i is CompetitionCatalogItem => Boolean(i));
    }

    const normKey = normalizeVietnamese(key);
    return COMPETITION_CATALOG.filter((item) => {
      const normCode = item.code.toLowerCase();
      const normDesc = normalizeVietnamese(item.description);
      const normGroup = normalizeVietnamese(item.group);
      const normKeywords = (item.keywords || []).map((k) => normalizeVietnamese(k)).join(" ");

      return (
        normCode.includes(normKey) ||
        normDesc.includes(normKey) ||
        normGroup.includes(normKey) ||
        normKeywords.includes(normKey)
      );
    });
  }, [helperKeyword]);

  // Lọc mã sự việc trong tab truyền thống
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

  // Lấy danh sách sự việc cho phiếu cá nhân
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

  // Lưu sự việc truyền thống
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

  // =========================================================================
  // ⚡ XỬ LÝ GHI NHẬN NHANH QUA TRỢ LÝ THÔNG MINH (TAB 4)
  // =========================================================================
  const handleHelperQuickApply = async (
    catalogItem: CompetitionCatalogItem,
    customPts?: number
  ) => {
    if (!helperSelectedStudent) {
      alert("⚠️ Vui lòng chọn 1 học sinh ở phía trên trước khi ghi nhận.");
      return;
    }

    const calculatedPts =
      customPts !== undefined
        ? customPts
        : catalogItem.plus > 0
        ? catalogItem.plus
        : -catalogItem.minus;

    const isLeader = helperRole === "team_leader";

    setHelperRecording(true);
    try {
      if (isLeader) {
        // Tổ trưởng gửi báo cáo thi đua
        const res = await fetch("/api/competition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submitReport",
            studentId: helperSelectedStudent.studentId,
            studentName: helperSelectedStudent.fullName,
            team: helperSelectedStudent.team,
            code: catalogItem.code,
            description: catalogItem.description,
            plus: catalogItem.plus,
            minus: catalogItem.minus,
            eventDate: helperEventDate || new Date().toISOString().split("T")[0],
            note: helperEventNote
              ? `[Tổ trưởng Tổ ${helperSelectedStudent.team}] ${helperEventNote}`
              : `[Tổ trưởng Tổ ${helperSelectedStudent.team} ghi nhận qua Trợ lý nề nếp]`,
            week,
            createdByName: `Tổ Trưởng Tổ ${helperSelectedStudent.team}`,
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          alert(
            `✓ Đã gửi báo cáo [${catalogItem.code}: ${catalogItem.description} (${
              calculatedPts > 0 ? `+${calculatedPts}` : `${calculatedPts}`
            }đ)] cho ${helperSelectedStudent.fullName}!`
          );
          setHelperRecentLogs((prev) => [
            {
              id: `log_${Date.now()}`,
              studentName: helperSelectedStudent.fullName,
              team: helperSelectedStudent.team,
              code: catalogItem.code,
              desc: catalogItem.description,
              points: calculatedPts,
              time: new Date().toLocaleTimeString("vi-VN"),
            },
            ...prev.slice(0, 4),
          ]);
          setHelperEventNote("");
          fetchDashboard(week, selectedTeamFilter);
        } else {
          alert(data.message || "Không thể gửi báo cáo.");
        }
      } else {
        // Giáo viên ghi nhận trực tiếp vào Sổ nề nếp
        const res = await fetch("/api/competition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "recordEvent",
            studentId: helperSelectedStudent.studentId,
            code: catalogItem.code,
            title: `[${catalogItem.code}] ${catalogItem.description}`,
            points: calculatedPts,
            category: catalogItem.plus > 0 ? "praise" : "violation",
            week,
            eventDate: helperEventDate || new Date().toISOString().split("T")[0],
            period: helperEventPeriod || undefined,
            note: helperEventNote || "Ghi nhận qua Trợ lý gợi ý nề nếp",
            serious: catalogItem.serious,
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          alert(
            `✓ Đã ghi nhận [${catalogItem.code}: ${catalogItem.description} (${
              calculatedPts > 0 ? `+${calculatedPts}` : `${calculatedPts}`
            }đ)] cho ${helperSelectedStudent.fullName}!`
          );
          setHelperRecentLogs((prev) => [
            {
              id: `log_${Date.now()}`,
              studentName: helperSelectedStudent.fullName,
              team: helperSelectedStudent.team,
              code: catalogItem.code,
              desc: catalogItem.description,
              points: calculatedPts,
              time: new Date().toLocaleTimeString("vi-VN"),
            },
            ...prev.slice(0, 4),
          ]);
          setHelperEventNote("");
          fetchDashboard(week, selectedTeamFilter);
        } else {
          alert(data.message || "Không thể ghi nhận sự việc.");
        }
      }
    } catch {
      alert("Lỗi kết nối khi ghi nhận sự việc.");
    } finally {
      setHelperRecording(false);
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

  // Xuất file CSV báo cáo thi đua tuần
  const handleExportCompetitionCsv = () => {
    if (!dashboard || !dashboard.ranking) return;

    let csv = "\uFEFF";
    csv += "TRƯỜNG THCS QUANG TRUNG - XUÂN HƯƠNG - ĐÀ LẠT\r\n";
    csv += `BẢNG TỔNG KẾT THI ĐUA & NỀ NẾP LỚP 8A6 - TUẦN ${week}\r\n`;
    csv += `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}\r\n\r\n`;

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
    csv += [teamHeaders.join(","), ...teamRows.map((r) => r.join(","))].join("\r\n");

    csv += "\r\n\r\n=== 2. BẢNG ĐIỂM RÈN LUYỆN CHI TIẾT TỪNG HỌC SINH (45 EM) ===\r\n";
    const studentHeaders = ["Hạng", "STT", "Mã HS", "Họ và Tên", "Tổ", "Vai Trò", "Điểm Khởi Điểm", "Điểm Thưởng (+)", "Điểm Phạt (-)", "Điểm Tuần", "Xếp Loại"];
    const studentRows = dashboard.ranking.map((r) => [
      r.rank,
      r.stt || r.studentId.replace(/\D/g, ""),
      r.studentId,
      `"${r.fullName}"`,
      `Tổ ${r.team}`,
      r.isTeamLeader ? "Tổ trưởng" : "Thành viên",
      100,
      `+${r.plus}`,
      `-${r.minus}`,
      r.score,
      `"${r.grade}"`,
    ]);
    csv += [studentHeaders.join(","), ...studentRows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Thi_Dua_Ne_Nep_8A6_Tuan_${week}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // In bảng báo cáo tuần A4
  const handlePrintWeeklyReport = () => {
    if (!dashboard || !dashboard.ranking) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bảng Thi Đua Lớp 8A6 - Tuần ${week}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Times New Roman', serif; padding: 25px; color: #111; font-size: 13px; }
          .header { text-align: center; margin-bottom: 20px; line-height: 1.4; }
          .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-top: 10px; }
          .subtitle { font-size: 14px; font-style: italic; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #333; padding: 6px 5px; text-align: center; font-size: 12px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .left { text-align: left; }
          .gold { background-color: #fff9db; font-weight: bold; }
          .footer { margin-top: 35px; display: flex; justify-content: space-between; }
          .sig-box { text-align: center; width: 220px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>TRƯỜNG THCS QUANG TRUNG - TP ĐÀ LẠT</div>
          <div style="font-weight: bold;">LỚP 8A6 • NĂM HỌC 2024 - 2025</div>
          <div class="title">BẢNG TỔNG HỢP THI ĐUA & NỀ NẾP 4 TỔ</div>
          <div class="subtitle">Tuần thứ ${week} (Điểm khởi đầu: 100đ/học sinh)</div>
        </div>

        <h4 style="margin-bottom: 5px;">I. XẾP HẠNG THI ĐUA 4 TỔ:</h4>
        <table>
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Tên Tổ</th>
              <th>Tổ Trưởng</th>
              <th>Sĩ Số</th>
              <th>Điểm TB Tổ</th>
              <th>Thưởng (+)</th>
              <th>Phạt (-)</th>
              <th>Số Em 100đ</th>
            </tr>
          </thead>
          <tbody>
            ${dashboard.teamSummaries
              ?.map(
                (t) => `
              <tr class="${t.rank === 1 ? "gold" : ""}">
                <td><strong>${t.rank}</strong></td>
                <td class="left"><strong>${t.teamName}</strong></td>
                <td class="left">${t.leaderName || "Chưa có"}</td>
                <td>${t.memberCount} HS</td>
                <td><strong>${t.avgScore}đ</strong></td>
                <td style="color: #0d6e64;">+${t.totalPlus}</td>
                <td style="color: #b91c1c;">-${t.totalMinus}</td>
                <td><strong>${t.perfectCount}</strong></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <h4 style="margin-top: 25px; margin-bottom: 5px;">II. BẢNG ĐIỂM CHI TIẾT 45 HỌC SINH:</h4>
        <table>
          <thead>
            <tr>
              <th style="width: 35px;">Hạng</th>
              <th style="width: 35px;">STT</th>
              <th>Họ và Tên</th>
              <th>Tổ</th>
              <th>Thưởng</th>
              <th>Phạt</th>
              <th>Tổng Điểm</th>
              <th>Xếp Loại</th>
            </tr>
          </thead>
          <tbody>
            ${dashboard.ranking
              .map(
                (r) => `
              <tr class="${r.rank <= 3 ? "gold" : ""}">
                <td><strong>${r.rank}</strong></td>
                <td>${r.stt || r.studentId.replace(/\D/g, "")}</td>
                <td class="left"><strong>${r.fullName}</strong> ${r.isTeamLeader ? "(Tổ trưởng)" : ""}</td>
                <td>Tổ ${r.team}</td>
                <td style="color: #0d6e64;">+${r.plus}</td>
                <td style="color: #b91c1c;">-${r.minus}</td>
                <td><strong>${r.score}đ</strong></td>
                <td>${r.grade}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-box">
            <div>BAN CÁN SỰ LỚP</div>
            <div style="margin-top: 50px; font-weight: bold;">Lớp Trưởng</div>
          </div>
          <div class="sig-box">
            <div>Đà Lạt, ngày .... tháng .... năm 2025</div>
            <div style="font-weight: bold;">GIÁO VIÊN CHỦ NHIỆM</div>
            <div style="margin-top: 50px; font-weight: bold;">Cô Nguyễn Thúy Hằng</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[92vh] shadow-2xl border border-line overflow-hidden flex flex-col">
        {/* HEADER MODAL */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#123f62] via-[#0e524b] to-[#123f62] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl shadow-inner">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  HỆ THỐNG THI ĐUA & NỀ NẾP LỚP 8A6 (40 TIÊU CHÍ QUY CHUẨN 6 NHÓM)
                </h2>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 ${
                    weekLocked ? "bg-rose-500 text-white" : "bg-emerald-400 text-slate-950"
                  }`}
                >
                  {weekLocked ? "🔒 ĐÃ KHÓA SỔ" : "🔓 ĐANG MỞ"}
                </span>
              </div>
              <p className="text-xs text-blue-100/80">
                Quản lý xếp hạng 4 Tổ, bảng điểm cá nhân /100đ, Trợ lý gợi ý thông minh và minh bạch hóa tiêu chí chấm điểm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Chọn Tuần */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/20">
              <span className="text-xs text-blue-100 font-semibold">Tuần:</span>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="bg-white text-slate-900 font-bold text-xs px-2 py-0.5 rounded-lg outline-none cursor-pointer"
              >
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút Khóa / Mở Khóa Tuần */}
            <button
              type="button"
              onClick={handleToggleLockWeek}
              className={`p-2 rounded-xl transition cursor-pointer text-sm font-bold border ${
                weekLocked
                  ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-400/40"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/40"
              }`}
              title={weekLocked ? "Mở khóa sổ tuần" : "Khóa sổ tuần (chỉ GVCN chấm)"}
            >
              {weekLocked ? "🔒" : "🔓"}
            </button>

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
            >
              ✕ Đóng
            </button>
          </div>
        </div>

        {/* TAB BAR NAVIGATION */}
        <div className="px-4 sm:px-6 py-2 bg-[#f4f8fb] border-b border-line flex items-center gap-1.5 overflow-x-auto shrink-0 shadow-inner">
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

          {/* TAB 4 ĐÃ ĐƯỢC NÂNG CẤP TOÀN DIỆN */}
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "chat"
                ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md ring-2 ring-emerald-400"
                : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300"
            }`}
          >
            <span>💡</span> 4. Trợ Lý Gợi Ý & Nhận Diện Điểm (GVCN & Tổ Trưởng)
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-bold text-xs uppercase text-[#123f62] flex items-center gap-1.5">
                  <span>🏆</span> Tóm Tắt Xếp Hạng 4 Tổ (Tuần {week})
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("teams")}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition"
                >
                  Xem Bảng Thi Đua 4 Tổ Đầy Đủ ➔
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {dashboard?.teamSummaries?.map((t) => (
                  <div
                    key={t.team}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      t.rank === 1
                        ? "bg-amber-50/80 border-amber-300 shadow-xs"
                        : "bg-slate-50/60 border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        <span>{t.rank === 1 ? "🥇" : t.rank === 2 ? "🥈" : t.rank === 3 ? "🥉" : "🎖️"}</span>
                        <span>{t.teamName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        +{t.totalPlus}đ / -{t.totalMinus}đ · {t.memberCount} HS
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-[#0d6e64]">{t.avgScore}đ</div>
                      <div className="text-[9px] font-bold text-slate-600">Hạng {t.rank}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BẢNG XẾP HẠNG CÁ NHÂN & SỰ VIỆC GẦN ĐÂY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Bảng Xếp Hạng Cá Nhân */}
              <div className="lg:col-span-2 bg-white border border-line rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase text-[#123f62] flex items-center gap-1.5">
                      <span>🎖️</span> Bảng Xếp Hạng Cá Nhân 45 Học Sinh
                    </h3>
                    <span className="text-[11px] text-gray-500 font-medium">
                      (Bấm vào tên để xem & in Phiếu Điểm /100đ)
                    </span>
                  </div>

                  {/* Filter Tổ */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-500 text-[11px]">Lọc Tổ:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTeamFilter(0)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                        selectedTeamFilter === 0 ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      Tất cả
                    </button>
                    {[1, 2, 3, 4].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTeamFilter(t)}
                        className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                          selectedTeamFilter === t ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Tổ {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Danh Sách Học Sinh */}
                <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
                  {dashboard?.ranking?.map((r) => (
                    <div
                      key={r.studentId}
                      onClick={() => setSelectedStudentForReport(r)}
                      className="p-2 bg-[#fcfdfe] hover:bg-blue-50/70 border border-line-subtle rounded-xl transition cursor-pointer space-y-1 group"
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
                        className={`p-2.5 rounded-xl border text-xs space-y-1 transition ${
                          e.plus > 0 ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-gray-800 truncate">
                            {e.studentName} (T{e.team})
                          </span>
                          <span
                            className={`font-black text-xs px-1.5 py-0.2 rounded shrink-0 ${
                              e.plus > 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                            }`}
                          >
                            {e.plus > 0 ? `+${e.plus}` : `-${e.minus}`}đ
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 font-medium">
                          [{e.code}] {e.description}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center justify-between pt-0.5">
                          <span>{e.eventDate}</span>
                          <span>Bởi: {e.createdByName}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THI ĐUA 4 TỔ */}
        {activeTab === "teams" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
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
                        setHelperStudentId("");
                        setHelperRole("team_leader");
                        setHelperLeaderTeam(t.team);
                        setActiveTab("chat");
                      }}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                    >
                      + Chấm nề nếp cho Tổ {t.team}
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
                        className={`p-1.5 rounded-lg text-left text-xs transition cursor-pointer flex items-center gap-1.5 border ${
                          isSelected
                            ? "bg-primary text-white font-bold border-primary shadow-xs"
                            : "bg-white hover:bg-blue-50 text-gray-800 border-gray-200"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-white text-primary" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {s.stt}
                        </span>
                        <span className="truncate">{s.fullName}</span>
                      </button>
                    );
                  })}
                </div>

                {currentSelectedStudent && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      Đang chọn: <strong>{currentSelectedStudent.fullName}</strong> (STT: {currentSelectedStudent.stt}, Mã: {currentSelectedStudent.studentId})
                    </div>
                    <span className="font-bold text-blue-900 bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                      Tổ {currentSelectedStudent.team}
                    </span>
                  </div>
                )}
              </div>

              {/* BƯỚC 2: CHỌN MÃ SỰ VIỆC NỀ NẾP */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>Chọn Tiêu Chí Nề Nếp / Khen Thưởng Trong 40 Mã Quy Chuẩn:</span>
                </label>

                {/* Tab 6 Nhóm */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {COMPETITION_GROUPS.map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => {
                        setSelectedGroup(grp);
                        setCatalogSearch("");
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        selectedGroup === grp
                          ? "bg-[#0d6e64] text-white font-bold shadow-xs"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {grp}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="🔍 Gõ mã (CC01, HT02...) hoặc tên hành vi nề nếp..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="flex-1 h-9 px-3 text-xs border border-[#c9deed] rounded-xl outline-none focus:border-primary bg-white"
                  />
                </div>

                {/* Danh sách tiêu chí */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredCatalog.map((item) => {
                    const isSelected = selectedEventCode === item.code;
                    const isPraise = item.plus > 0;
                    return (
                      <div
                        key={item.code}
                        onClick={() => setSelectedEventCode(item.code)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? isPraise
                              ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300"
                              : "bg-rose-50 border-rose-500 ring-2 ring-rose-300"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 bg-gray-100 px-1.5 py-0.2 rounded text-[11px]">
                              {item.code}
                            </span>
                            <span className="font-bold text-gray-800 truncate">{item.description}</span>
                          </div>
                          <div className="text-[10px] text-gray-500">{item.group}</div>
                        </div>

                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-lg shrink-0 ${
                            isPraise ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isPraise ? `+${item.plus}đ` : `-${item.minus}đ`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Khung tùy biến điểm cho TS01 / PT02 */}
                {currentSelectedCatalogItem?.code === "TS01" && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center justify-between gap-2">
                    <span className="text-rose-900 font-bold">
                      ⚠️ Mã TS01 (Làm hỏng/Mất tài sản): Chọn mức phạt từ -3 đến -10 điểm:
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

        {/* ========================================================================= */}
        {/* TAB 4: TRỢ LÝ GỢI Ý & NHẬN DIỆN ĐIỂM NỀ NẾP (NÂNG CẤP HOÀN CHỈNH) */}
        {/* ========================================================================= */}
        {activeTab === "chat" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* BANNER ĐIỀU HƯỚNG & PHÂN QUYỀN GVCN / TỔ TRƯỞNG */}
            <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-teal-950 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl">
                  💡
                </div>
                <div>
                  <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                    <span>Trợ Lý Gợi Ý & Nhận Diện Điểm Nề Nếp Lớp 8A6</span>
                    <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                      THÔNG MINH & CHUẨN XÁC
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-100/80 mt-0.5">
                    Chọn 1 học sinh và nhập thông tin gợi ý (hoặc bấm gợi ý nhanh), hệ thống sẽ tự động hiện điểm cộng/trừ phù hợp.
                  </p>
                </div>
              </div>

              {/* BỘ CHUYỂN ĐỔI VAI TRÒ GVCN / TỔ TRƯỞNG */}
              <div className="bg-white/10 p-1 rounded-xl border border-white/20 flex items-center gap-1 self-stretch sm:self-auto justify-end">
                <button
                  type="button"
                  onClick={() => setHelperRole("teacher")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    helperRole === "teacher"
                      ? "bg-white text-teal-950 shadow-sm"
                      : "text-teal-100 hover:text-white"
                  }`}
                >
                  <span>👩‍🏫</span> Giáo Viên Chủ Nhiệm
                </button>

                <button
                  type="button"
                  onClick={() => setHelperRole("team_leader")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    helperRole === "team_leader"
                      ? "bg-amber-400 text-slate-950 shadow-sm font-black"
                      : "text-teal-100 hover:text-white"
                  }`}
                >
                  <span>👑</span> Tổ Trưởng
                </button>
              </div>
            </div>

            {/* PHẦN 1: CHỌN 1 HỌC SINH */}
            <div className="bg-white border border-[#d2e4f2] rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-extrabold text-[#123f62] uppercase flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#123f62] text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Chọn 1 Học Sinh Cần Đánh Giá Nề Nếp:</span>
                </label>

                {/* Bộ lọc Tổ theo vai trò */}
                {helperRole === "teacher" ? (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-500 text-[11px] font-semibold">Lọc Tổ:</span>
                    <button
                      type="button"
                      onClick={() => setHelperTeamFilter(0)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                        helperTeamFilter === 0 ? "bg-[#123f62] text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      Tất cả (45 HS)
                    </button>
                    {[1, 2, 3, 4].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setHelperTeamFilter(t)}
                        className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                          helperTeamFilter === t ? "bg-[#123f62] text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Tổ {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 text-amber-950 font-bold">
                    <span>👑 Bạn đang là Tổ trưởng:</span>
                    <select
                      value={helperLeaderTeam}
                      onChange={(e) => setHelperLeaderTeam(Number(e.target.value))}
                      className="bg-white px-2 py-0.5 rounded-lg border border-amber-300 font-black outline-none cursor-pointer"
                    >
                      <option value={1}>Tổ 1</option>
                      <option value={2}>Tổ 2</option>
                      <option value={3}>Tổ 3</option>
                      <option value={4}>Tổ 4</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Ô tìm kiếm học sinh */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="🔍 Nhập STT hoặc Họ Tên học sinh cần tìm..."
                  value={helperStudentSearch}
                  onChange={(e) => setHelperStudentSearch(e.target.value)}
                  className="flex-1 h-9 px-3 text-xs border border-[#c9deed] rounded-xl outline-none focus:border-teal-600 bg-white"
                />
              </div>

              {/* Danh sách chip học sinh */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-[#f8fbfe] border border-line-subtle rounded-xl">
                {helperFilteredStudents.map((s) => {
                  const isSelected = helperStudentId === s.studentId;
                  return (
                    <button
                      key={s.studentId}
                      type="button"
                      onClick={() => setHelperStudentId(s.studentId)}
                      className={`p-1.5 rounded-lg text-left text-xs transition cursor-pointer flex items-center justify-between gap-1 border ${
                        isSelected
                          ? "bg-teal-700 text-white font-bold border-teal-700 shadow-sm"
                          : "bg-white hover:bg-teal-50 text-gray-800 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-white text-teal-800" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {s.stt}
                        </span>
                        <span className="truncate">{s.fullName}</span>
                      </div>
                      <span className="text-[10px] opacity-75 shrink-0">T{s.team}</span>
                    </button>
                  );
                })}
              </div>

              {/* THẺ HỌC SINH ĐANG ĐƯỢC CHỌN NỔI BẬT */}
              {helperSelectedStudent ? (
                <div className="p-3 bg-gradient-to-r from-teal-50 via-emerald-50 to-blue-50 border border-teal-200 rounded-xl flex items-center justify-between flex-wrap gap-2 animate-in fade-in duration-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {helperSelectedStudent.stt}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-teal-950 flex items-center gap-1.5">
                        <span>{helperSelectedStudent.fullName}</span>
                        {helperSelectedStudent.isTeamLeader && (
                          <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded-md">
                            👑 Tổ trưởng
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-teal-800 mt-0.5">
                        Mã HS: <strong>{helperSelectedStudent.studentId}</strong> · Tổ <strong>{helperSelectedStudent.team}</strong> · Lớp <strong>8A6</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Điểm Tuần {week}</div>
                      <div className="text-base font-black text-[#0d6e64]">{helperStudentScore}đ</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHelperStudentId("")}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      ✕ Đổi HS
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <span>👉</span>
                  <span>Vui lòng <strong>chọn 1 học sinh</strong> ở trên trước khi chọn điểm cộng/trừ bên dưới.</span>
                </div>
              )}
            </div>

            {/* PHẦN 2: NHẬP GỢI Ý & DANH SÁCH TIÊU CHÍ KHỚP ĐIỂM */}
            <div className="bg-white border border-[#d2e4f2] rounded-2xl p-4 shadow-sm space-y-3.5">
              <label className="text-xs font-extrabold text-[#123f62] uppercase flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#123f62] text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Nhập Gợi Ý Hành Vi ➔ Hiện Tiêu Chí & Điểm Cộng/Trừ Phù Hợp:</span>
              </label>

              {/* Ô nhập từ khóa gợi ý */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="🔍 Gõ gợi ý sự việc (VD: 'muộn', 'trễ', 'phát biểu', '10 điểm', 'đồng phục', 'khăn quàng', 'không làm bài', 'trực nhật', 'vệ sinh', 'điện thoại'...)"
                  value={helperKeyword}
                  onChange={(e) => setHelperKeyword(e.target.value)}
                  className="flex-1 h-10 px-3.5 text-xs font-semibold border border-teal-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 rounded-xl outline-none bg-white shadow-xs"
                />
                {helperKeyword && (
                  <button
                    type="button"
                    onClick={() => setHelperKeyword("")}
                    className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              {/* CÁC NÚT GỢI Ý NHANH (TAGS 1 CHẠM) */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Gợi ý nhanh phổ biến (Bấm để lọc nhanh):</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "🌟 Phát biểu bài (+2đ)", key: "phat bieu" },
                    { label: "💯 Điểm 9, 10 (+2đ)", key: "diem 10" },
                    { label: "🏆 Thành tích phong trào (+3đ)", key: "phong trao" },
                    { label: "🤝 Giúp bạn tiến bộ (+2đ)", key: "giup ban" },
                    { label: "🧹 Trực nhật tốt (+2đ)", key: "truc nhat" },
                    { label: "⏰ Đi học muộn (-2đ)", key: "muon" },
                    { label: "❌ Nghỉ không phép (-5đ)", key: "khong phep" },
                    { label: "📖 Không làm bài tập (-2đ)", key: "khong lam bai" },
                    { label: "👔 Sai đồng phục / Khăn quàng (-2đ)", key: "dong phuc" },
                    { label: "💬 Nói chuyện riêng (-2đ)", key: "noi chuyen" },
                    { label: "🚯 Xả rác bừa bãi (-3đ)", key: "xa rac" },
                    { label: "📱 Dùng ĐT trái phép (-5đ)", key: "dien thoai" },
                  ].map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setHelperKeyword(tag.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                        helperKeyword === tag.key
                          ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                          : "bg-slate-100 hover:bg-teal-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* BẢNG DANH SÁCH TIÊU CHÍ KHỚP & ĐIỂM PHÙ HỢP */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Tiêu chí phù hợp ({helperSuggestedCriteria.length} mã quy chuẩn):</span>
                  <span className="text-[11px] text-gray-500">
                    {helperKeyword ? `Khớp với từ khóa '${helperKeyword}'` : "12 tiêu chí phổ biến nhất"}
                  </span>
                </div>

                {helperSuggestedCriteria.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-xl">
                    Không tìm thấy tiêu chí nào khớp với từ khóa "{helperKeyword}". Vui lòng thử từ khóa khác.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {helperSuggestedCriteria.map((item) => {
                      const isPraise = item.plus > 0;
                      const ptsDisplay = isPraise ? `+${item.plus}đ` : `-${item.minus}đ`;

                      return (
                        <div
                          key={item.code}
                          className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                            isPraise
                              ? "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/80"
                              : "bg-rose-50/50 hover:bg-rose-50 border-rose-200/80"
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  isPraise ? "bg-emerald-200 text-emerald-950" : "bg-rose-200 text-rose-950"
                                }`}
                              >
                                {item.code}
                              </span>
                              <span className="text-[10px] text-gray-500 font-semibold uppercase">
                                {item.group}
                              </span>
                            </div>
                            <div className="font-bold text-xs text-gray-900 leading-snug">
                              {item.description}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-black text-sm px-2.5 py-1 rounded-lg shadow-2xs ${
                                isPraise ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                              }`}
                            >
                              {ptsDisplay}
                            </span>

                            <button
                              type="button"
                              disabled={helperRecording || !helperSelectedStudent}
                              onClick={() => handleHelperQuickApply(item)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1 ${
                                helperSelectedStudent
                                  ? isPraise
                                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                                    : "bg-rose-700 hover:bg-rose-800 text-white"
                                  : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                              }`}
                              title={
                                helperSelectedStudent
                                  ? `Ghi nhận cho ${helperSelectedStudent.fullName}`
                                  : "Vui lòng chọn học sinh trước"
                              }
                            >
                              <span>⚡</span>
                              <span>{helperRole === "teacher" ? "Lưu" : "Báo Cáo"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* PHẦN 3: TÙY CHỈNH THÔNG TIN THÊM (NGÀY, TIẾT, GHI CHÚ) */}
            <div className="bg-white border border-[#d2e4f2] rounded-2xl p-4 shadow-sm space-y-2.5 text-xs">
              <div className="font-bold text-gray-700 uppercase flex items-center gap-1.5">
                <span>📝</span> Thông Tin Tùy Chọn Bổ Sung (Áp dụng khi bấm Lưu / Báo cáo):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-gray-500 font-semibold block text-[10px] mb-0.5">Ngày xảy ra</label>
                  <input
                    type="date"
                    value={helperEventDate}
                    onChange={(e) => setHelperEventDate(e.target.value)}
                    className="w-full h-8 px-2 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-semibold block text-[10px] mb-0.5">Tiết học (tuỳ chọn)</label>
                  <input
                    type="text"
                    placeholder="VD: Tiết 1, Tiết 3, Đầu giờ..."
                    value={helperEventPeriod}
                    onChange={(e) => setHelperEventPeriod(e.target.value)}
                    className="w-full h-8 px-2 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-semibold block text-[10px] mb-0.5">Ghi chú diễn biến (tuỳ chọn)</label>
                  <input
                    type="text"
                    placeholder="Ghi chú chi tiết nếu có..."
                    value={helperEventNote}
                    onChange={(e) => setHelperEventNote(e.target.value)}
                    className="w-full h-8 px-2 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  />
                </div>
              </div>
            </div>

            {/* PHẦN 4: NHẬT KÝ VỪA GHI NHẬN TRONG PHIÊN */}
            {helperRecentLogs.length > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                  <span>✓</span> Sự Việc Vừa Ghi Nhận Thành Công ({helperRecentLogs.length} sự việc):
                </div>
                <div className="space-y-1.5">
                  {helperRecentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 bg-white rounded-xl border border-emerald-200 text-xs flex items-center justify-between gap-2"
                    >
                      <div>
                        <strong>{log.studentName}</strong> (Tổ {log.team}) · [{log.code}] {log.desc}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                            log.points > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {log.points > 0 ? `+${log.points}đ` : `${log.points}đ`}
                        </span>
                        <span className="text-[10px] text-gray-400">{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-gray-900 text-sm">{e.studentName}</strong>
                        <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.2 rounded border">
                          Tổ {e.team}
                        </span>
                        <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.2 rounded">
                          [{e.code}] {e.description}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600">
                        Ngày: {e.eventDate} {e.period ? `· ${e.period}` : ""} {e.subject ? `· ${e.subject}` : ""} · Ghi nhận bởi: <strong>{e.createdByName}</strong>
                      </div>
                      {e.note && <div className="text-[11px] text-gray-500 italic">Ghi chú: {e.note}</div>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                          e.plus > 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        }`}
                      >
                        {e.plus > 0 ? `+${e.plus}đ` : `-${e.minus}đ`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancelEvent(e.eventId)}
                        className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                        title="Hủy/Xóa sự việc này"
                      >
                        ✕ Xóa
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
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-xs text-amber-950 uppercase flex items-center gap-1.5">
                  <span>👑</span> Quản Lý Phân Quyền & Bổ Nhiệm 4 Tổ Trưởng
                </div>
                <div className="text-[11px] text-amber-800 mt-0.5">
                  Tổ trưởng có tài khoản riêng (to1..to4), đăng nhập bằng mã PIN để gửi báo cáo thi đua của tổ mình.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamsData.map((t) => (
                <div key={t.team} className="bg-white border border-line rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <div className="font-bold text-sm text-[#123f62] flex items-center gap-1.5">
                      <span>👑</span> Tổ {t.team} · Tài khoản: <code>{t.username}</code>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold">{t.students.length} học sinh</span>
                  </div>

                  {/* Đang là Tổ trưởng */}
                  {t.leader ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-emerald-800 font-semibold">Tổ trưởng hiện tại:</div>
                          <div className="font-black text-sm text-emerald-950">{t.leader.studentName}</div>
                          <div className="text-[10px] text-emerald-700">Mã: {t.leader.studentId} · PIN: {t.leader.pin}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeLeader(t.team)}
                          className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Thu hồi quyền
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/60">
                        <input
                          type="text"
                          value={leaderPins[t.team] || ""}
                          onChange={(e) =>
                            setLeaderPins((prev) => ({ ...prev, [t.team]: e.target.value }))
                          }
                          className="w-24 h-7 px-2 text-xs border border-emerald-300 rounded-lg bg-white font-mono font-bold text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleResetPin(t.team)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Đổi PIN
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold">
                      Chưa bổ nhiệm Tổ trưởng cho Tổ {t.team}.
                    </div>
                  )}

                  {/* Chọn học sinh làm Tổ trưởng */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-gray-700 block">Bổ nhiệm Tổ trưởng mới:</label>
                    <div className="flex gap-2">
                      <select
                        value={leaderSelections[t.team] || ""}
                        onChange={(e) =>
                          setLeaderSelections((prev) => ({ ...prev, [t.team]: e.target.value }))
                        }
                        className="flex-1 h-9 px-2.5 text-xs border border-[#c9deed] rounded-xl outline-none bg-white font-medium"
                      >
                        <option value="">-- Chọn học sinh trong Tổ {t.team} --</option>
                        {t.students.map((s) => (
                          <option key={s.studentId} value={s.studentId}>
                            {s.stt}. {s.fullName} ({s.studentId})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAssignLeader(t.team)}
                        className="px-4 bg-[#0d6e64] hover:bg-[#149d8f] text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
                      >
                        Bổ nhiệm
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: SUBMISSIONS CHỜ DUYỆT */}
        {activeTab === "submissions" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-bold text-[#123f62] uppercase">
                Danh Sách Báo Cáo Thi Đua Chờ Duyệt (Tuần {week})
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                Tổng cộng: <strong>{submissionsList.length}</strong> báo cáo
              </span>
            </div>

            <div className="space-y-2">
              {submissionsList.length === 0 ? (
                <div className="text-center py-16 text-xs text-gray-400 bg-gray-50 rounded-2xl">
                  Không có báo cáo nào đang chờ duyệt trong tuần này.
                </div>
              ) : (
                submissionsList.map((sub) => (
                  <div
                    key={sub.submissionId}
                    className={`p-3.5 rounded-2xl border text-xs space-y-2 transition ${
                      sub.status === "PENDING"
                        ? "bg-amber-50/70 border-amber-300"
                        : sub.status === "APPROVED"
                        ? "bg-emerald-50/70 border-emerald-300 opacity-80"
                        : "bg-rose-50/70 border-rose-300 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-gray-900">{sub.studentName}</strong>
                        <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.2 rounded border">
                          Tổ {sub.team}
                        </span>
                        <span className="font-bold text-gray-800 bg-white px-2 py-0.5 rounded-md border">
                          [{sub.suggestedCode}] {sub.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md ${
                            sub.plus > 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                          }`}
                        >
                          {sub.plus > 0 ? `+${sub.plus}đ` : `-${sub.minus}đ`}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.status === "PENDING"
                              ? "bg-amber-200 text-amber-900 animate-pulse"
                              : sub.status === "APPROVED"
                              ? "bg-emerald-200 text-emerald-900"
                              : "bg-rose-200 text-rose-900"
                          }`}
                        >
                          {sub.status === "PENDING"
                            ? "Chờ duyệt"
                            : sub.status === "APPROVED"
                            ? "Đã duyệt"
                            : "Từ chối"}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-600">
                      Ngày: {sub.eventDate} · Người báo cáo: <strong>{sub.createdByName}</strong>
                      {sub.note && ` · Chi tiết: ${sub.note}`}
                    </div>

                    {sub.reviewNote && (
                      <div className="text-[11px] text-blue-900 bg-white/80 p-1.5 rounded-lg border">
                        Ý kiến GVCN: {sub.reviewNote}
                      </div>
                    )}

                    {sub.status === "PENDING" && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/60">
                        <button
                          type="button"
                          onClick={() => handleReviewSubmission(sub.submissionId, "rejectSubmission")}
                          className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg font-bold text-xs transition cursor-pointer"
                        >
                          ✕ Từ chối
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewSubmission(sub.submissionId, "approveSubmission")}
                          className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-sm"
                        >
                          ✓ Duyệt & Ghi nhận
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 8: BẢNG 40 TIÊU CHÍ CHUẨN */}
        {activeTab === "rubric" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-bold text-xs text-teal-950 uppercase flex items-center gap-1.5">
                  <span>📋</span> Bảng Danh Mục Quy Chuẩn 40 Tiêu Chí Chấm Điểm Nề Nếp Lớp 8A6
                </div>
                <div className="text-[11px] text-teal-800 mt-0.5">
                  Gồm 6 nhóm quy chuẩn chuẩn hóa, áp dụng đồng bộ cho toàn thể học sinh, tổ trưởng và giáo viên.
                </div>
              </div>
            </div>

            {/* Bộ lọc nhóm & tìm kiếm */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {["Tất cả", ...COMPETITION_GROUPS].map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setRubricGroupFilter(grp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      rubricGroupFilter === grp
                        ? "bg-teal-700 text-white font-bold shadow-xs"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="🔍 Tìm tiêu chí..."
                value={rubricSearch}
                onChange={(e) => setRubricSearch(e.target.value)}
                className="w-full sm:w-64 h-9 px-3 text-xs border border-[#c9deed] rounded-xl outline-none bg-white"
              />
            </div>

            {/* Bảng danh sách tiêu chí */}
            <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#f4f8fb] text-gray-700 font-bold border-b border-line">
                  <tr>
                    <th className="p-3 w-16 text-center">Mã</th>
                    <th className="p-3 w-40">Nhóm Quy Chuẩn</th>
                    <th className="p-3">Hành Vi / Tiêu Chí</th>
                    <th className="p-3 w-28 text-center">Điểm Đánh Giá</th>
                    <th className="p-3 w-24 text-center">Mức Độ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {filteredRubricCatalog.map((item) => (
                    <tr key={item.code} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center font-mono font-bold text-teal-900 bg-teal-50/40">
                        {item.code}
                      </td>
                      <td className="p-3 font-semibold text-gray-700">{item.group}</td>
                      <td className="p-3 font-medium text-gray-900">{item.description}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-black px-2 py-0.5 rounded-md ${
                            item.plus > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.plus > 0 ? `+${item.plus}đ` : `-${item.minus}đ`}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.serious ? (
                          <span className="px-2 py-0.5 bg-rose-500 text-white font-bold rounded-full text-[10px]">
                            Nghiêm trọng
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Thông thường</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL PHIẾU ĐIỂM CHI TIẾT CÁ NHÂN HỌC SINH */}
        {selectedStudentForReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-line space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#123f62] uppercase">
                      Phiếu Đánh Giá Rèn Luyện & Nề Nếp Cá Nhân
                    </h3>
                    <div className="text-xs text-gray-500">Tuần {week} · Lớp 8A6</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForReport(null)}
                  className="text-gray-400 hover:text-gray-700 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Thông tin học sinh */}
              <div className="bg-[#f8fbfe] border border-line rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-black text-base text-gray-900">
                    {selectedStudentForReport.fullName}
                  </div>
                  <span className="font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-lg">
                    Tổ {selectedStudentForReport.team}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <div>Mã HS: <strong>{selectedStudentForReport.studentId}</strong></div>
                  <div>STT: <strong>{selectedStudentForReport.stt || selectedStudentForReport.studentId.replace(/\D/g, "")}</strong></div>
                  <div>Vai trò: <strong>{selectedStudentForReport.isTeamLeader ? "Tổ trưởng" : "Thành viên"}</strong></div>
                  <div>Xếp hạng tuần: <strong>Hạng {selectedStudentForReport.rank}</strong></div>
                </div>
              </div>

              {/* Bảng điểm tổng kết */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">Điểm Thưởng</div>
                  <div className="text-xl font-black text-emerald-800 mt-0.5">+{selectedStudentForReport.plus}đ</div>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-[10px] text-rose-700 font-bold uppercase">Điểm Phạt</div>
                  <div className="text-xl font-black text-rose-800 mt-0.5">-{selectedStudentForReport.minus}đ</div>
                </div>
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl">
                  <div className="text-[10px] text-sky-700 font-bold uppercase">Điểm Tuần</div>
                  <div className="text-xl font-black text-sky-800 mt-0.5">{selectedStudentForReport.score}đ</div>
                </div>
              </div>

              {/* Danh sách các sự kiện ghi nhận */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2">
                  Lịch sử vi phạm / khen thưởng trong tuần:
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {studentEventsForReport.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 rounded-xl">
                      Chưa có ghi nhận nào trong tuần này (Điểm giữ nguyên 100đ).
                    </div>
                  ) : (
                    studentEventsForReport.map((ev, i) => (
                      <div
                        key={ev.eventId || i}
                        className="p-2 bg-gray-50 rounded-lg text-xs flex items-center justify-between border border-line/60"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-semibold text-gray-800 truncate">
                            {ev.description || ev.code}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Ngày {ev.eventDate} • Bởi {ev.createdByName}
                          </div>
                        </div>
                        <span
                          className={`font-black text-xs shrink-0 ${
                            ev.plus > 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {ev.plus > 0 ? `+${ev.plus}` : `-${ev.minus}`}đ
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Nút hành động */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
                {onOpenStudentProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenStudentProfile(selectedStudentForReport.stt || selectedStudentForReport.studentId.replace(/\D/g, ""));
                      setSelectedStudentForReport(null);
                    }}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Xem Hồ Sơ Cá Nhân Đầy Đủ
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedStudentForReport(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN GHI NHẬN SỰ VIỆC TRUYỀN THỐNG */}
        {showConfirmModal && currentSelectedStudent && currentSelectedCatalogItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-line space-y-4">
              <div className="text-center space-y-1">
                <div className="text-3xl">
                  {currentSelectedCatalogItem.plus > 0 ? "🌟" : "⚠️"}
                </div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Xác Nhận Ghi Nhận Sự Việc Thi Đua
                </h3>
                <p className="text-xs text-gray-500">
                  Vui lòng kiểm tra lại thông tin trước khi lưu vào sổ thi đua
                </p>
              </div>

              <div className="bg-[#f8fbfe] border border-line rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Học sinh:</span>
                  <strong className="text-gray-900 font-bold">{currentSelectedStudent.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tổ & Lớp:</span>
                  <span className="font-bold">Tổ {currentSelectedStudent.team} · Lớp 8A6</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mã tiêu chí:</span>
                  <span className="font-mono font-bold text-primary">[{currentSelectedCatalogItem.code}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nội dung:</span>
                  <span className="font-semibold text-gray-800 text-right max-w-[200px]">
                    {currentSelectedCatalogItem.description}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Điểm thay đổi:</span>
                  <span
                    className={`font-black text-sm ${
                      currentSelectedCatalogItem.plus > 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {currentSelectedCatalogItem.plus > 0
                      ? `+${customPoints || currentSelectedCatalogItem.plus}đ`
                      : `-${customPoints || currentSelectedCatalogItem.minus}đ`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngày ghi nhận:</span>
                  <span className="font-medium">{eventDate} {eventPeriod ? `(${eventPeriod})` : ""}</span>
                </div>
                {eventNote && (
                  <div className="pt-1 border-t border-gray-200 text-gray-600 italic">
                    Ghi chú: {eventNote}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveEvent}
                  className="flex-1 py-2.5 bg-[#0d6e64] hover:bg-[#149d8f] text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  {loading ? "Đang lưu..." : "✓ Xác Nhận Lưu"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
