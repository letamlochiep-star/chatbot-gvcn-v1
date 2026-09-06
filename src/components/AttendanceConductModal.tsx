"use client";

import React, { useState, useEffect } from "react";
import {
  StudentRecord,
  AttendanceStatus,
  AttendanceRecord,
  ConductLog,
} from "@/lib/types";

interface Props {
  onClose: () => void;
  onOpenStudentProfile?: (stt: string) => void;
}

export function AttendanceConductModal({ onClose, onOpenStudentProfile }: Props) {
  const [activeTab, setActiveTab] = useState<"attendance" | "conduct">("attendance");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // === State Điểm Danh ===
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSavedMessage, setAttendanceSavedMessage] = useState("");

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

  // Tải danh sách học sinh từ API watchlist (có đầy đủ thông tin học sinh)
  useEffect(() => {
    async function fetchAllStudents() {
      setLoadingStudents(true);
      try {
        const res = await fetch("/api/student/watchlist");
        if (res.ok) {
          const data = await res.json();
          if (data.watchlist) {
            const list: StudentRecord[] = data.watchlist.map((w: any) => w.student);
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

  // Tải dữ liệu điểm danh theo ngày đã chọn
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

  // Tải danh sách nề nếp
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
  const totalStudents = students.length || Object.keys(attendanceRecords).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/45 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-line max-h-[94vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0d6e64] border border-emerald-200 flex items-center justify-center text-xl shrink-0">
              📋
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-bold text-[#0d6e64] uppercase tracking-tight truncate">
                Quản Lý Điểm Danh & Nề Nếp Lớp 8A6
              </h2>
              <p className="text-[11px] text-brandText-muted truncate hidden sm:block">
                Theo dõi chuyên cần hàng ngày và chấm điểm rèn luyện nề nếp học sinh
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

        {/* Tab Navigation */}
        <div className="flex gap-2 my-3 shrink-0">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "attendance"
                ? "bg-[#0d6e64] text-white shadow-sm"
                : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
            }`}
          >
            <span>📅</span> Điểm Danh Sĩ Số
          </button>

          <button
            onClick={() => setActiveTab("conduct")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "conduct"
                ? "bg-[#0d6e64] text-white shadow-sm"
                : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
            }`}
          >
            <span>🌟</span> Sổ Nề Nếp & Rèn Luyện
          </button>
        </div>

        {/* TAB 1: ĐIỂM DANH SĨ SỐ */}
        {activeTab === "attendance" && (
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
                  className="px-2.5 py-1 text-xs border border-[#a4ddd6] rounded-xl outline-none focus:border-[#0d6e64] bg-white font-medium"
                />

                <button
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <span>✓</span> Có mặt tất cả
                </button>
              </div>

              {/* Sĩ số thống kê */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
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

            {/* Danh sách học sinh điểm danh */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingStudents ? (
                <div className="text-center py-12 text-xs text-brandText-muted">
                  <div className="w-6 h-6 border-2 border-[#0d6e64]/30 border-t-[#0d6e64] rounded-full animate-spin mx-auto mb-2" />
                  Đang tải danh sách học sinh...
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-10 text-xs text-brandText-muted bg-gray-50 rounded-2xl">
                  Chưa có dữ liệu học sinh.
                </div>
              ) : (
                students.map((s) => {
                  const rec = attendanceRecords[s.stt] || {
                    stt: s.stt,
                    status: "present",
                  };
                  return (
                    <div
                      key={s.stt}
                      className="p-2.5 bg-[#fbfdff] border border-[#dce9f2] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:border-[#b7d5eb] transition"
                    >
                      <div className="flex items-center gap-2 min-w-[200px]">
                        <span className="w-6 h-6 bg-primary-soft text-primary font-bold rounded-lg flex items-center justify-center text-[10px] shrink-0">
                          {s.stt}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-primary-dark truncate">
                            {s.hoVaTen}
                          </div>
                          <div className="text-[10px] text-brandText-muted">
                            Sinh: {s.ngaySinh} · GT: {s.gioiTinh}
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
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="px-6 py-2.5 bg-gradient-to-r from-[#0d6e64] to-[#149d8f] text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingAttendance ? "Đang lưu..." : "💾 LƯU ĐIỂM DANH NGÀY"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SỔ NỀ NẾP & RÈN LUYỆN */}
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
                  onClick={() => applyConductPreset("violation", "Nói chuyện riêng / Mất trật tự", 3)}
                  className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-medium border border-rose-200 cursor-pointer"
                >
                  -3đ Mất trật tự
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-brandText-muted uppercase mb-1">
                    Chọn học sinh
                  </label>
                  <select
                    value={selectedSttForConduct}
                    onChange={(e) => setSelectedSttForConduct(e.target.value)}
                    className="w-full h-9 px-2 border border-[#c9deed] rounded-xl bg-white outline-none focus:border-[#0d6e64] text-xs font-medium"
                  >
                    {students.map((s) => (
                      <option key={s.stt} value={s.stt}>
                        STT {s.stt}: {s.hoVaTen}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brandText-muted uppercase mb-1">
                    Loại ghi nhận
                  </label>
                  <select
                    value={conductType}
                    onChange={(e) =>
                      setConductType(e.target.value as "praise" | "violation")
                    }
                    className="w-full h-9 px-2 border border-[#c9deed] rounded-xl bg-white outline-none focus:border-[#0d6e64] text-xs font-medium"
                  >
                    <option value="praise">🌟 Tuyên dương / Điểm cộng (+)</option>
                    <option value="violation">⚠️ Nhắc nhở / Điểm trừ (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brandText-muted uppercase mb-1">
                    Nội dung nề nếp
                  </label>
                  <input
                    type="text"
                    value={conductTitle}
                    onChange={(e) => setConductTitle(e.target.value)}
                    placeholder="Ví dụ: Phát biểu hăng hái, quên vở..."
                    required
                    className="w-full h-9 px-2.5 border border-[#c9deed] rounded-xl bg-white outline-none focus:border-[#0d6e64] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brandText-muted uppercase mb-1">
                    Điểm số (Điểm)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={conductPoints}
                      onChange={(e) => setConductPoints(Number(e.target.value))}
                      min={1}
                      max={50}
                      className="w-20 h-9 px-2.5 border border-[#c9deed] rounded-xl bg-white outline-none focus:border-[#0d6e64] text-xs font-bold"
                    />
                    <button
                      type="submit"
                      disabled={savingConduct || !conductTitle.trim()}
                      className="flex-1 h-9 px-3 bg-[#0d6e64] hover:bg-[#118579] text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {savingConduct ? "..." : "+ Ghi nhận"}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Sub-view switcher */}
            <div className="flex items-center justify-between gap-2 pb-1 shrink-0">
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setConductViewMode("history")}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    conductViewMode === "history"
                      ? "bg-primary-soft text-primary border border-[#cde2f2]"
                      : "text-brandText-muted hover:bg-gray-100"
                  }`}
                >
                  📜 Lịch Sử Ghi Nhận ({conductLogs.length})
                </button>
                <button
                  onClick={() => setConductViewMode("summary")}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    conductViewMode === "summary"
                      ? "bg-primary-soft text-primary border border-[#cde2f2]"
                      : "text-brandText-muted hover:bg-gray-100"
                  }`}
                >
                  📊 Bảng Tổng Hợp Điểm Rèn Luyện
                </button>
              </div>
            </div>

            {/* Danh sách lịch sử hoặc bảng tổng kết */}
            <div className="flex-1 overflow-y-auto pr-1">
              {conductViewMode === "history" ? (
                conductLogs.length === 0 ? (
                  <div className="text-center py-12 text-xs text-brandText-muted bg-gray-50 rounded-2xl">
                    Chưa có bản ghi nề nếp nào. Hãy ghi nhận ở biểu mẫu phía trên!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conductLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                          log.type === "praise"
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                            : "bg-rose-50/70 border-rose-200 text-rose-950"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                              log.type === "praise"
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {log.points > 0 ? `+${log.points}` : log.points}đ
                          </span>
                          <span className="font-bold text-primary-dark">
                            STT {log.stt}: {log.studentName}
                          </span>
                          <span>—</span>
                          <span className="font-medium truncate">{log.title}</span>
                          {log.note && (
                            <span className="text-[10px] text-brandText-muted italic truncate">
                              ({log.note})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-[10px] text-brandText-muted">
                          <span>{log.date}</span>
                          <button
                            onClick={() => handleDeleteConduct(log.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-100 cursor-pointer font-bold"
                            title="Xóa bản ghi"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Bảng tổng hợp điểm rèn luyện */
                <div className="border border-[#dce9f2] rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f0f8f7] text-[#0d6e64] font-bold border-b border-[#cbebe7]">
                      <tr>
                        <th className="p-2.5">STT</th>
                        <th className="p-2.5">Họ và tên</th>
                        <th className="p-2.5 text-center">Tuyên dương</th>
                        <th className="p-2.5 text-center">Vi phạm</th>
                        <th className="p-2.5 text-center">Điểm rèn luyện</th>
                        <th className="p-2.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf4f9]">
                      {students.map((s) => {
                        const sum = conductSummary[s.stt] || {
                          totalPoints: 100,
                          praiseCount: 0,
                          violationCount: 0,
                        };
                        return (
                          <tr key={s.stt} className="hover:bg-[#fbfdff]">
                            <td className="p-2.5 font-bold">{s.stt}</td>
                            <td className="p-2.5 font-bold text-primary-dark">
                              {s.hoVaTen}
                            </td>
                            <td className="p-2.5 text-center text-emerald-700 font-semibold">
                              {sum.praiseCount > 0 ? `🌟 ${sum.praiseCount}` : "—"}
                            </td>
                            <td className="p-2.5 text-center text-rose-700 font-semibold">
                              {sum.violationCount > 0 ? `⚠️ ${sum.violationCount}` : "—"}
                            </td>
                            <td className="p-2.5 text-center font-bold">
                              <span
                                className={`px-2 py-0.5 rounded-lg text-xs ${
                                  sum.totalPoints >= 100
                                    ? "bg-emerald-100 text-emerald-800"
                                    : sum.totalPoints >= 90
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {sum.totalPoints} đ
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              {onOpenStudentProfile && (
                                <button
                                  onClick={() => {
                                    onClose();
                                    onOpenStudentProfile(s.stt);
                                  }}
                                  className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                                >
                                  Hồ sơ ▾
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
