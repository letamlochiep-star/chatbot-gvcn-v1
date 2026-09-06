"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  StudentRecord,
  AttendanceStatus,
  AttendanceRecord,
  DailyAttendance,
  ConductLog,
} from "@/lib/types";

interface Props {
  onClose: () => void;
  onOpenStudentProfile?: (stt: string) => void;
}

interface StudentOption {
  stt: string;
  hoVaTen: string;
  gioiTinh: string;
  ngaySinh: string;
  maHocSinh?: string;
}

export function AttendanceConductModal({ onClose, onOpenStudentProfile }: Props) {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "conduct">("daily");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // === State Điểm Danh Hàng Ngày ===
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSavedMessage, setAttendanceSavedMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // === State Điểm Danh Theo Tuần ===
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [allAttendanceData, setAllAttendanceData] = useState<Record<string, DailyAttendance>>({});
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  // === State Sổ Nề Nếp ===
  const [conductLogs, setConductLogs] = useState<ConductLog[]>([]);
  const [conductSummary, setConductSummary] = useState<
    Record<string, { totalPoints: number; praiseCount: number; violationCount: number }>
  >({});
  const [selectedSttForConduct, setSelectedSttForConduct] = useState<string>("");
  const [conductType, setConductType] = useState<"praise" | "violation">("praise");
  const [conductTitle, setConductTitle] = useState("");
  const [conductPoints, setConductPoints] = useState<number>(5);
  const [conductNote, setConductNote] = useState("");
  const [savingConduct, setSavingConduct] = useState(false);
  const [conductViewMode, setConductViewMode] = useState<"history" | "summary">("history");

  // 1. Tải toàn bộ danh sách 45 học sinh từ API /api/student/list
  useEffect(() => {
    async function fetchAllStudents() {
      setLoadingStudents(true);
      try {
        const res = await fetch("/api/student/list");
        if (res.ok) {
          const data = await res.json();
          if (data.students && Array.isArray(data.students)) {
            const list: StudentRecord[] = data.students.map((s: StudentOption) => ({
              id: `stt-${s.stt}`,
              stt: s.stt,
              hoVaTen: s.hoVaTen,
              gioiTinh: s.gioiTinh || "",
              ngaySinh: s.ngaySinh || "",
              maHocSinh: s.maHocSinh || "",
              maVemis: "",
              maMoet: "",
              soDangBo: "",
              ngayVaoTruong: "",
              quocTich: "",
              choO_SNXom: "",
              choO_KhuDanCu: "",
              choO_XaPhuong: "",
              choO_TinhTp: "",
              hokhau_SNXom: "",
              hokhau_KhuDanCu: "",
              hokhau_XaPhuong: "",
              hokhau_TinhTp: "",
              noiSinh_ThongTin: "",
              noiSinh_XaPhuong: "",
              noiSinh_TinhTp: "",
              queQuan_ThongTin: "",
              queQuan_XaPhuong: "",
              queQuan_TinhTp: "",
              noiKhaiSinh_XaPhuong: "",
              noiKhaiSinh_TinhTp: "",
              canCuoc: "",
              ngayCapCanCuoc: "",
              noiCapCanCuoc: "",
              danToc: "",
              tonGiao: "",
              dienChinhSach: "",
              canNgheo: "",
              doanVien: "",
              doiVien: "",
              tenCha: "",
              ngheNghiepCha: "",
              namSinhCha: "",
              tenMe: "",
              ngheNghiepMe: "",
              namSinhMe: "",
              dienThoaiSLL: "",
              emailSLL: "",
              dienThoaiBo: "",
              dienThoaiMe: "",
              dienThoaiHS: "",
              khuyetTat: "",
              ntruBtru: "",
              ghiChu: "",
              rawData: {},
            }));
            list.sort((a, b) => parseInt(a.stt, 10) - parseInt(b.stt, 10));
            setStudents(list);
            if (list.length > 0) {
              setSelectedSttForConduct(list[0].stt);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi tải danh sách học sinh cho điểm danh:", err);
      } finally {
        setLoadingStudents(false);
      }
    }
    fetchAllStudents();
  }, []);

  // 2. Tải dữ liệu điểm danh theo ngày đã chọn
  useEffect(() => {
    async function loadAttendanceForDate() {
      try {
        const res = await fetch(`/api/attendance?date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.attendance && data.attendance.records) {
            setAttendanceRecords(data.attendance.records);
          } else {
            // Mặc định: Có mặt tất cả
            const initial: Record<string, AttendanceRecord> = {};
            students.forEach((s) => {
              initial[s.stt] = {
                stt: s.stt,
                studentName: s.hoVaTen,
                status: "present",
              };
            });
            setAttendanceRecords(initial);
          }
        }
      } catch (err) {
        console.error("Lỗi tải điểm danh:", err);
      }
    }

    if (students.length > 0) {
      loadAttendanceForDate();
    }
  }, [selectedDate, students]);

  // 3. Tải tất cả dữ liệu điểm danh khi mở tab Tuần
  const loadAllAttendance = async () => {
    setLoadingWeekly(true);
    try {
      const res = await fetch("/api/attendance?all=true");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.attendance) {
          setAllAttendanceData(data.attendance);
        }
      }
    } catch (err) {
      console.error("Lỗi tải toàn bộ điểm danh tuần:", err);
    } finally {
      setLoadingWeekly(false);
    }
  };

  useEffect(() => {
    if (activeTab === "weekly") {
      loadAllAttendance();
    }
  }, [activeTab]);

  // 4. Tải danh sách nề nếp
  const loadConductData = async () => {
    try {
      const [resLogs, resSum] = await Promise.all([
        fetch("/api/conduct"),
        fetch("/api/conduct?summary=true"),
      ]);
      if (resLogs.ok) {
        const dataLogs = await resLogs.json();
        if (dataLogs.ok && dataLogs.logs) setConductLogs(dataLogs.logs);
      }
      if (resSum.ok) {
        const dataSum = await resSum.json();
        if (dataSum.ok && dataSum.summary) setConductSummary(dataSum.summary);
      }
    } catch (err) {
      console.error("Lỗi tải sổ nề nếp:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "conduct") {
      loadConductData();
    }
  }, [activeTab]);

  // Thay đổi trạng thái điểm danh của 1 học sinh
  const handleStatusChange = (stt: string, status: AttendanceStatus) => {
    const student = students.find((s) => s.stt === stt);
    setAttendanceRecords((prev) => ({
      ...prev,
      [stt]: {
        stt,
        studentName: student?.hoVaTen || prev[stt]?.studentName || "",
        status,
        note: prev[stt]?.note || "",
      },
    }));
  };

  // Thay đổi ghi chú điểm danh
  const handleNoteChange = (stt: string, note: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [stt]: {
        ...prev[stt],
        stt,
        status: prev[stt]?.status || "present",
        note,
      },
    }));
  };

  // Đánh dấu có mặt tất cả
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceRecord> = {};
    students.forEach((s) => {
      updated[s.stt] = {
        stt: s.stt,
        studentName: s.hoVaTen,
        status: "present",
        note: attendanceRecords[s.stt]?.note || "",
      };
    });
    setAttendanceRecords(updated);
  };

  // Lưu điểm danh
  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    setAttendanceSavedMessage("");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          records: attendanceRecords,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAttendanceSavedMessage("✓ Đã lưu điểm danh thành công!");
        setTimeout(() => setAttendanceSavedMessage(""), 3500);
      } else {
        alert(data.message || "Không thể lưu điểm danh.");
      }
    } catch {
      alert("Lỗi kết nối khi lưu điểm danh.");
    } finally {
      setSavingAttendance(false);
    }
  };

  // Tính toán danh sách các ngày trong tuần (Thứ 2 đến Thứ 7)
  const weekDays = useMemo(() => {
    const curr = new Date(selectedWeekDate);
    const day = curr.getDay(); // 0: CN, 1: T2, ..., 6: T7
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    const days = [
      { dayName: "Thứ 2", offset: 0 },
      { dayName: "Thứ 3", offset: 1 },
      { dayName: "Thứ 4", offset: 2 },
      { dayName: "Thứ 5", offset: 3 },
      { dayName: "Thứ 6", offset: 4 },
      { dayName: "Thứ 7", offset: 5 },
    ];

    return days.map((d) => {
      const dObj = new Date(monday);
      dObj.setDate(monday.getDate() + d.offset);
      const y = dObj.getFullYear();
      const m = String(dObj.getMonth() + 1).padStart(2, "0");
      const dayNum = String(dObj.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dayNum}`;
      return {
        dayName: d.dayName,
        dateStr,
        label: `${d.dayName} (${dayNum}/${m})`,
        shortLabel: `${dayNum}/${m}`,
      };
    });
  }, [selectedWeekDate]);

  // Xuất file Excel / CSV báo cáo điểm danh tuần
  const handleExportWeeklyCsv = () => {
    if (students.length === 0) return;

    let csv = "\uFEFF"; // UTF-8 BOM để Excel hiển thị tiếng Việt chuẩn
    csv += "TRƯỜNG THCS QUANG TRUNG - XUÂN HƯƠNG - ĐÀ LẠT\n";
    csv += `BẢNG ĐIỂM DANH CHUYÊN CẦN LỚP 8A6 - TUẦN (${weekDays[0].label} ĐẾN ${weekDays[weekDays.length - 1].label})\n\n`;

    const headers = [
      "STT",
      "Họ và Tên",
      "Giới tính",
      "Ngày sinh",
      ...weekDays.map((w) => w.label),
      "Tổng ngày có mặt",
      "Vắng có phép (P)",
      "Vắng không phép (KP)",
      "Đi trễ (T)",
      "Tỷ lệ chuyên cần",
      "Ghi chú",
    ];
    csv += headers.map((h) => `"${h}"`).join(",") + "\n";

    students.forEach((s) => {
      let presentCount = 0;
      let excusedCount = 0;
      let unexcusedCount = 0;
      let lateCount = 0;
      let trackedDays = 0;
      const notes: string[] = [];

      const dayStatuses = weekDays.map((w) => {
        const daily = allAttendanceData[w.dateStr];
        const rec = daily?.records?.[s.stt];
        if (!rec) return "-";
        trackedDays++;
        if (rec.note) notes.push(`${w.dayName}: ${rec.note}`);
        if (rec.status === "present") {
          presentCount++;
          return "Có mặt (✓)";
        } else if (rec.status === "excused") {
          excusedCount++;
          return "Có phép (P)";
        } else if (rec.status === "unexcused") {
          unexcusedCount++;
          return "Không phép (KP)";
        } else if (rec.status === "late") {
          lateCount++;
          return "Đi trễ (T)";
        }
        return "-";
      });

      const attendanceRate =
        trackedDays > 0 ? `${Math.round(((presentCount + lateCount) / trackedDays) * 100)}%` : "—";

      const row = [
        s.stt,
        s.hoVaTen,
        s.gioiTinh || "",
        s.ngaySinh || "",
        ...dayStatuses,
        presentCount,
        excusedCount,
        unexcusedCount,
        lateCount,
        attendanceRate,
        notes.join("; "),
      ];

      csv += row.map((r) => `"${String(r).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Bao_Cao_Diem_Danh_Tuan_8A6_${weekDays[0].dateStr}_${weekDays[weekDays.length - 1].dateStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // In bảng điểm danh tuần
  const handlePrintWeekly = () => {
    window.print();
  };

  // Áp dụng mẫu nhanh nề nếp
  const applyConductPreset = (
    type: "praise" | "violation",
    title: string,
    points: number
  ) => {
    setConductType(type);
    setConductTitle(title);
    setConductPoints(points);
  };

  // Lưu ghi nhận nề nếp
  const handleSaveConduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSttForConduct || !conductTitle.trim()) return;

    setSavingConduct(true);
    const student = students.find((s) => s.stt === selectedSttForConduct);

    try {
      const res = await fetch("/api/conduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stt: selectedSttForConduct,
          studentName: student?.hoVaTen || "Học sinh",
          type: conductType,
          title: conductTitle,
          points: conductType === "violation" ? -Math.abs(conductPoints) : Math.abs(conductPoints),
          note: conductNote,
          date: selectedDate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setConductTitle("");
        setConductNote("");
        loadConductData();
      } else {
        alert(data.message || "Không thể ghi nhận nề nếp.");
      }
    } catch {
      alert("Lỗi kết nối khi lưu nề nếp.");
    } finally {
      setSavingConduct(false);
    }
  };

  // Xóa bản ghi nề nếp
  const handleDeleteConduct = async (id: string) => {
    if (!window.confirm("Thầy/Cô có chắc chắn muốn xóa bản ghi nề nếp này?")) return;
    try {
      const res = await fetch(`/api/conduct?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setConductLogs((prev) => prev.filter((l) => l.id !== id));
        loadConductData();
      }
    } catch {}
  };

  // Thống kê sĩ số ngày hiện tại
  const presentCount = Object.values(attendanceRecords).filter((r) => r.status === "present").length;
  const excusedCount = Object.values(attendanceRecords).filter((r) => r.status === "excused").length;
  const unexcusedCount = Object.values(attendanceRecords).filter((r) => r.status === "unexcused").length;
  const lateCount = Object.values(attendanceRecords).filter((r) => r.status === "late").length;
  const totalStudents = students.length || 45;

  // Lọc học sinh theo từ khóa
  const filteredStudents = students.filter(
    (s) =>
      s.hoVaTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.stt.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/45 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl border border-line max-h-[94vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0d6e64] border border-emerald-200 flex items-center justify-center text-xl shrink-0">
              📋
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-bold text-[#0d6e64] uppercase tracking-tight truncate">
                Quản Lý Điểm Danh & Nề Nếp Lớp 8A6 (Sĩ số: {totalStudents} học sinh)
              </h2>
              <p className="text-[11px] text-brandText-muted truncate hidden sm:block">
                Theo dõi chuyên cần từng ngày, tổng hợp xuất báo cáo tuần và sổ rèn luyện nề nếp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-brandText-muted hover:text-brandText bg-gray-100 hover:bg-gray-200 rounded-xl px-2.5 py-1.5 transition text-xs font-bold cursor-pointer shrink-0"
          >
            ✕ Đóng
          </button>
        </div>

        {/* 3 Tab Navigation */}
        <div className="flex gap-2 my-3 shrink-0 flex-wrap">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "daily"
                ? "bg-[#0d6e64] text-white shadow-sm"
                : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
            }`}
          >
            <span>📅</span> 1. Điểm Danh Hàng Ngày
          </button>

          <button
            onClick={() => setActiveTab("weekly")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "weekly"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            <span>📊</span> 2. Báo Cáo & Xuất Điểm Danh Tuần
          </button>

          <button
            onClick={() => setActiveTab("conduct")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "conduct"
                ? "bg-[#0d6e64] text-white shadow-sm"
                : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
            }`}
          >
            <span>🌟</span> 3. Sổ Nề Nếp & Rèn Luyện
          </button>
        </div>

        {/* TAB 1: ĐIỂM DANH HÀNG NGÀY */}
        {activeTab === "daily" && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-3">
            {/* Thanh công cụ điểm danh */}
            <div className="bg-[#f0f8f7] border border-[#cbebe7] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-bold text-[#0d6e64] flex items-center gap-1">
                  <span>📅</span> Ngày:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-[#a4ddd6] rounded-xl outline-none focus:border-[#0d6e64] bg-white font-medium cursor-pointer"
                />

                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <span>✓</span> Có mặt tất cả (45 em)
                </button>

                <input
                  type="text"
                  placeholder="🔍 Tìm nhanh tên hoặc STT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-[#a4ddd6] rounded-xl outline-none focus:border-[#0d6e64] bg-white w-40 sm:w-48 font-medium"
                />
              </div>

              {/* Sĩ số thống kê */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="bg-white px-2 py-0.5 rounded-lg border border-[#cbebe7] text-[#0d6e64] font-bold">
                  Sĩ số: {totalStudents}
                </span>
                <span className="bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-emerald-700 font-semibold">
                  Hiện diện: <strong>{presentCount}</strong>
                </span>
                <span className="bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 text-blue-700 font-semibold">
                  Có phép: <strong>{excusedCount}</strong>
                </span>
                <span className="bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-rose-700 font-semibold">
                  Không phép: <strong>{unexcusedCount}</strong>
                </span>
                <span className="bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-amber-700 font-semibold">
                  Trễ: <strong>{lateCount}</strong>
                </span>
              </div>
            </div>

            {/* Danh sách 45 học sinh điểm danh */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {loadingStudents ? (
                <div className="text-center py-12 text-xs text-brandText-muted">
                  <div className="w-6 h-6 border-2 border-[#0d6e64]/30 border-t-[#0d6e64] rounded-full animate-spin mx-auto mb-2" />
                  Đang tải đầy đủ 45 học sinh lớp 8A6...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-xs text-brandText-muted bg-gray-50 rounded-2xl">
                  Không tìm thấy học sinh nào phù hợp.
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const rec = attendanceRecords[s.stt] || {
                    stt: s.stt,
                    status: "present",
                  };
                  return (
                    <div
                      key={s.stt}
                      className="p-2 sm:p-2.5 bg-[#fbfdff] border border-[#dce9f2] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:border-[#b7d5eb] transition"
                    >
                      <div className="flex items-center gap-2 min-w-[200px]">
                        <span className="w-6 h-6 bg-primary-soft text-primary font-bold rounded-lg flex items-center justify-center text-[10px] shrink-0">
                          {s.stt}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpenStudentProfile && onOpenStudentProfile(s.stt)}
                            className="font-bold text-primary-dark hover:underline truncate text-left cursor-pointer"
                            title="Xem chi tiết học sinh"
                          >
                            {s.hoVaTen}
                          </button>
                          <div className="text-[10px] text-brandText-muted">
                            Sinh: {s.ngaySinh || "—"} · GT: {s.gioiTinh || "—"}
                          </div>
                        </div>
                      </div>

                      {/* 4 Nút chọn trạng thái */}
                      <div className="flex items-center gap-1 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.stt, "present")}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            rec.status === "present"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          Có mặt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.stt, "excused")}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            rec.status === "excused"
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                          }`}
                        >
                          Có phép (P)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.stt, "unexcused")}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            rec.status === "unexcused"
                              ? "bg-rose-600 text-white shadow-sm"
                              : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                          }`}
                        >
                          Không phép (KP)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.stt, "late")}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            rec.status === "late"
                              ? "bg-amber-600 text-white shadow-sm"
                              : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                          }`}
                        >
                          Đi trễ (T)
                        </button>
                      </div>

                      {/* Ghi chú */}
                      <input
                        type="text"
                        value={rec.note || ""}
                        onChange={(e) => handleNoteChange(s.stt, e.target.value)}
                        placeholder="Lý do/Ghi chú..."
                        className="w-full sm:w-44 px-2 py-1 text-[11px] border border-[#c9deed] rounded-lg outline-none focus:border-[#0d6e64] bg-white"
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Lưu */}
            <div className="pt-2 border-t border-line flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-bold text-emerald-600">
                {attendanceSavedMessage}
              </span>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="px-6 py-2.5 bg-gradient-to-r from-[#0d6e64] to-[#149d8f] text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingAttendance ? "Đang lưu..." : "💾 LƯU ĐIỂM DANH NGÀY"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: BÁO CÁO & XUẤT ĐIỂM DANH TUẦN */}
        {activeTab === "weekly" && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-3">
            {/* Thanh chọn tuần & nút xuất file */}
            <div className="bg-[#eef8f5] border border-[#c2e8df] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-bold text-[#0d6e64] flex items-center gap-1">
                  <span>📅</span> Chọn Tuần:
                </label>
                <input
                  type="date"
                  value={selectedWeekDate}
                  onChange={(e) => setSelectedWeekDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-[#a4ddd6] rounded-xl outline-none focus:border-[#0d6e64] bg-white font-medium cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-900 bg-emerald-100/70 px-2.5 py-1 rounded-xl">
                  {weekDays[0].label} ➜ {weekDays[weekDays.length - 1].label}
                </span>
              </div>

              {/* Bộ 2 nút xuất dữ liệu */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportWeeklyCsv}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Tải bảng điểm danh tuần dạng file Excel (.CSV)"
                >
                  <span>📥</span> Xuất File Excel (.CSV)
                </button>
                <button
                  type="button"
                  onClick={handlePrintWeekly}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 text-[#0d6e64] border border-[#a4ddd6] rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="In bảng điểm danh A4"
                >
                  <span>🖨️</span> In Bảng A4
                </button>
              </div>
            </div>

            {/* Bảng ma trận điểm danh tuần 45 học sinh */}
            <div className="flex-1 overflow-x-auto overflow-y-auto border border-[#dce9f2] rounded-2xl bg-white shadow-inner">
              {loadingWeekly ? (
                <div className="text-center py-16 text-xs text-brandText-muted">
                  <div className="w-6 h-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                  Đang tổng hợp dữ liệu điểm danh tuần...
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-[#f0f8f7] text-[#0d6e64] font-bold border-b border-[#dce9f2] sticky top-0 z-10">
                      <th className="py-2 px-2 text-center w-10">STT</th>
                      <th className="py-2 px-3 min-w-[150px]">Họ và Tên</th>
                      {weekDays.map((w) => (
                        <th key={w.dateStr} className="py-2 px-2 text-center font-bold">
                          <div>{w.dayName}</div>
                          <div className="text-[10px] text-gray-500 font-normal">{w.shortLabel}</div>
                        </th>
                      ))}
                      <th className="py-2 px-2 text-center text-emerald-700">Có mặt</th>
                      <th className="py-2 px-2 text-center text-blue-700">Có phép (P)</th>
                      <th className="py-2 px-2 text-center text-rose-700">Không phép (KP)</th>
                      <th className="py-2 px-2 text-center text-amber-700">Đi trễ (T)</th>
                      <th className="py-2 px-2 text-center text-[#0d6e64]">Chuyên cần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((s, idx) => {
                      let presentCount = 0;
                      let excusedCount = 0;
                      let unexcusedCount = 0;
                      let lateCount = 0;
                      let trackedDays = 0;

                      return (
                        <tr key={s.stt} className={`hover:bg-blue-50/50 transition ${idx % 2 === 0 ? "bg-white" : "bg-[#fafcfe]"}`}>
                          <td className="py-2 px-2 text-center font-bold text-gray-600">{s.stt}</td>
                          <td className="py-2 px-3 font-semibold text-primary-dark">
                            <button
                              type="button"
                              onClick={() => onOpenStudentProfile && onOpenStudentProfile(s.stt)}
                              className="hover:underline text-left cursor-pointer"
                            >
                              {s.hoVaTen}
                            </button>
                          </td>

                          {weekDays.map((w) => {
                            const daily = allAttendanceData[w.dateStr];
                            const rec = daily?.records?.[s.stt];
                            if (!rec) {
                              return (
                                <td key={w.dateStr} className="py-2 px-1 text-center text-gray-300">
                                  —
                                </td>
                              );
                            }
                            trackedDays++;
                            if (rec.status === "present") presentCount++;
                            else if (rec.status === "excused") excusedCount++;
                            else if (rec.status === "unexcused") unexcusedCount++;
                            else if (rec.status === "late") lateCount++;

                            return (
                              <td key={w.dateStr} className="py-2 px-1 text-center">
                                {rec.status === "present" && (
                                  <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                                    ✓
                                  </span>
                                )}
                                {rec.status === "excused" && (
                                  <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]" title={rec.note || "Có phép"}>
                                    P
                                  </span>
                                )}
                                {rec.status === "unexcused" && (
                                  <span className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-[10px]" title={rec.note || "Không phép"}>
                                    KP
                                  </span>
                                )}
                                {rec.status === "late" && (
                                  <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]" title={rec.note || "Đi trễ"}>
                                    T
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="py-2 px-2 text-center font-bold text-emerald-700">{presentCount}</td>
                          <td className="py-2 px-2 text-center font-bold text-blue-700">{excusedCount > 0 ? excusedCount : "0"}</td>
                          <td className="py-2 px-2 text-center font-bold text-rose-700">{unexcusedCount > 0 ? unexcusedCount : "0"}</td>
                          <td className="py-2 px-2 text-center font-bold text-amber-700">{lateCount > 0 ? lateCount : "0"}</td>
                          <td className="py-2 px-2 text-center font-bold">
                            {trackedDays > 0 ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                (presentCount + lateCount) === trackedDays
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {Math.round(((presentCount + lateCount) / trackedDays) * 100)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SỔ NỀ NẾP & RÈN LUYỆN */}
        {activeTab === "conduct" && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-3">
            {/* Form Ghi nhận nề nếp nhanh */}
            <form
              onSubmit={handleSaveConduct}
              className="bg-[#fcfdff] border border-[#d6e7f4] rounded-2xl p-3 sm:p-4 space-y-2.5 shrink-0"
            >
              <div className="text-xs font-bold text-[#0d6e64] uppercase flex items-center gap-1.5">
                <span>✍️</span> Ghi Nhận Nề Nếp & Điểm Rèn Luyện
              </div>

              {/* Mẫu nhanh */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <span className="font-bold text-brandText-muted">Mẫu nhanh:</span>
                <button
                  type="button"
                  onClick={() => applyConductPreset("praise", "Phát biểu hăng hái", 5)}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium border border-emerald-200 cursor-pointer"
                >
                  +5đ Phát biểu
                </button>
                <button
                  type="button"
                  onClick={() => applyConductPreset("praise", "Làm việc tốt / Giúp bạn", 5)}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium border border-emerald-200 cursor-pointer"
                >
                  +5đ Việc tốt
                </button>
                <button
                  type="button"
                  onClick={() => applyConductPreset("praise", "Thành tích xuất sắc / Phong trào", 10)}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium border border-emerald-200 cursor-pointer"
                >
                  +10đ Phong trào
                </button>
                <button
                  type="button"
                  onClick={() => applyConductPreset("violation", "Quên bài tập / Chưa chuẩn bị bài", 2)}
                  className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-medium border border-rose-200 cursor-pointer"
                >
                  -2đ Quên bài
                </button>
                <button
                  type="button"
                  onClick={() => applyConductPreset("violation", "Không mặc đúng đồng phục", 2)}
                  className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-medium border border-rose-200 cursor-pointer"
                >
                  -2đ Đồng phục
                </button>
                <button
                  type="button"
                  onClick={() => applyConductPreset("violation", "Nói chuyện riêng / Làm mất trật tự", 3)}
                  className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-medium border border-rose-200 cursor-pointer"
                >
                  -3đ Mất trật tự
                </button>
              </div>

              {/* Input hàng nề nếp */}
              <div className="grid grid-cols-1 sm:grid-cols-[160px_100px_1fr_80px_auto] gap-2 items-center text-xs">
                {/* Chọn học sinh (45 em) */}
                <select
                  value={selectedSttForConduct}
                  onChange={(e) => setSelectedSttForConduct(e.target.value)}
                  className="h-9 px-2 bg-white border border-[#c9deed] rounded-xl font-bold text-primary outline-none focus:border-primary"
                >
                  {students.map((s) => (
                    <option key={s.stt} value={s.stt}>
                      {s.stt}. {s.hoVaTen}
                    </option>
                  ))}
                </select>

                {/* Loại (Khen / Vi phạm) */}
                <select
                  value={conductType}
                  onChange={(e) => setConductType(e.target.value as any)}
                  className={`h-9 px-2 font-bold rounded-xl outline-none border ${
                    conductType === "praise"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-rose-50 text-rose-800 border-rose-300"
                  }`}
                >
                  <option value="praise">🌟 Tuyên dương</option>
                  <option value="violation">⚠️ Vi phạm</option>
                </select>

                {/* Nội dung */}
                <input
                  type="text"
                  placeholder="Nhập nội dung nề nếp..."
                  value={conductTitle}
                  onChange={(e) => setConductTitle(e.target.value)}
                  className="h-9 px-3 border border-[#c9deed] rounded-xl outline-none focus:border-primary bg-white"
                  required
                />

                {/* Điểm */}
                <div className="flex items-center gap-1">
                  <span className="font-bold text-gray-500">Điểm:</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={conductPoints}
                    onChange={(e) => setConductPoints(parseInt(e.target.value, 10) || 1)}
                    className="h-9 w-14 px-1.5 text-center font-bold border border-[#c9deed] rounded-xl outline-none focus:border-primary bg-white"
                  />
                </div>

                {/* Nút thêm */}
                <button
                  type="submit"
                  disabled={savingConduct || !conductTitle.trim()}
                  className="h-9 px-4 bg-[#0d6e64] hover:bg-[#149d8f] text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {savingConduct ? "Đang lưu..." : "+ Ghi Nhận"}
                </button>
              </div>
            </form>

            {/* Chuyển chế độ xem Lịch sử / Tổng kết */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setConductViewMode("history")}
                  className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                    conductViewMode === "history"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  🕒 Lịch sử ghi nhận ({conductLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setConductViewMode("summary")}
                  className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                    conductViewMode === "summary"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  📊 Bảng tổng kết điểm 45 học sinh
                </button>
              </div>
            </div>

            {/* Danh sách nề nếp */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {conductViewMode === "history" ? (
                conductLogs.length === 0 ? (
                  <div className="text-center py-10 text-xs text-brandText-muted bg-gray-50 rounded-2xl">
                    Chưa có bản ghi nề nếp nào.
                  </div>
                ) : (
                  conductLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                        log.type === "praise"
                          ? "bg-emerald-50/60 border-emerald-200"
                          : "bg-rose-50/60 border-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-white border flex items-center justify-center font-bold text-gray-700 text-[10px] shrink-0">
                          {log.stt}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">
                            {log.studentName} —{" "}
                            <span className={log.type === "praise" ? "text-emerald-700" : "text-rose-700"}>
                              {log.title}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Ngày: {log.date} {log.note ? `· ${log.note}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md ${
                            log.type === "praise"
                              ? "bg-emerald-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {log.points > 0 ? `+${log.points}` : log.points}đ
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteConduct(log.id)}
                          className="text-gray-400 hover:text-rose-600 p-1 transition cursor-pointer"
                          title="Xóa"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                /* Bảng tổng kết điểm nề nếp của 45 học sinh */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {students.map((s) => {
                    const sum = conductSummary[s.stt] || {
                      totalPoints: 100,
                      praiseCount: 0,
                      violationCount: 0,
                    };
                    return (
                      <div
                        key={s.stt}
                        className="p-2.5 bg-white border border-line rounded-xl flex items-center justify-between text-xs hover:border-primary transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 bg-gray-100 rounded text-gray-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {s.stt}
                          </span>
                          <span className="font-bold text-gray-800 truncate">{s.hoVaTen}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-emerald-700">+{sum.praiseCount}</span>
                          <span className="text-[10px] text-rose-700">-{sum.violationCount}</span>
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded ${
                              sum.totalPoints >= 100
                                ? "bg-emerald-100 text-emerald-900"
                                : sum.totalPoints >= 80
                                ? "bg-blue-100 text-blue-900"
                                : "bg-rose-100 text-rose-900"
                            }`}
                          >
                            {sum.totalPoints}đ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
