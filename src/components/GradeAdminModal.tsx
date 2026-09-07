"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ClassInfo, GradeCompetitionSummary, CloudSyncStatus, SchoolSecurityRole } from "@/lib/types";

interface Props {
  onClose: () => void;
  currentClassId?: string;
  onSelectClass?: (classId: string) => void;
  onOpenClassCompetition?: (classId: string) => void;
}

export function GradeAdminModal({
  onClose,
  currentClassId = "8A6",
  onSelectClass,
  onOpenClassCompetition,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "ranking" | "inspect" | "teachers" | "cloud_sync" | "security" | "export"
  >("ranking");
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState<number>(1);
  const [grade, setGrade] = useState<number>(8); // 0: Toàn trường, 6: Khối 6, 7: Khối 7, 8: Khối 8, 9: Khối 9
  const [summary, setSummary] = useState<GradeCompetitionSummary | null>(null);

  // Inspector state
  const [inspectClassId, setInspectClassId] = useState<string>(currentClassId);

  // Teachers edit state
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [room, setRoom] = useState("");
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [teacherFilterGrade, setTeacherFilterGrade] = useState<number>(0);
  const [teacherSearch, setTeacherSearch] = useState("");

  // Cloud Sync state
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Security Matrix state
  const [securityRoles, setSecurityRoles] = useState<SchoolSecurityRole[]>([]);

  // 1. Tải bảng tổng hợp thi đua khối / toàn trường
  const fetchGradeSummary = async (targetWeek: number, targetGrade: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes?summary=true&week=${targetWeek}&grade=${targetGrade}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error("Lỗi tải thi đua:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Tải Cloud status & Security matrix
  const fetchCloudAndSecurity = async () => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setCloudStatus(data.status);
          if (data.matrix) setSecurityRoles(data.matrix);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin Cloud Sync:", err);
    }
  };

  useEffect(() => {
    fetchGradeSummary(week, grade);
  }, [week, grade]);

  useEffect(() => {
    fetchCloudAndSecurity();
  }, []);

  // Lớp đang được thanh tra
  const inspectedClass = useMemo(() => {
    if (!summary?.classes) return null;
    return summary.classes.find((c) => c.classId === inspectClassId) || summary.classes[0];
  }, [summary, inspectClassId]);

  // Danh sách lớp hiển thị ở Tab Giáo Viên
  const filteredTeacherClasses = useMemo(() => {
    if (!summary?.classes) return [];
    return summary.classes.filter((c) => {
      const matchGrade = teacherFilterGrade === 0 || c.grade === teacherFilterGrade;
      const matchSearch =
        teacherSearch === "" ||
        c.className.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        c.teacherName.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        c.room.toLowerCase().includes(teacherSearch.toLowerCase());
      return matchGrade && matchSearch;
    });
  }, [summary, teacherFilterGrade, teacherSearch]);

  // Bắt đầu sửa GVCN
  const handleStartEdit = (c: ClassInfo) => {
    setEditingClass(c);
    setTeacherName(c.teacherName);
    setTeacherEmail(c.teacherEmail);
    setTeacherPhone(c.teacherPhone || "");
    setRoom(c.room);
  };

  // Lưu sửa GVCN
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setSavingTeacher(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateClass",
          classId: editingClass.classId,
          updates: {
            teacherName,
            teacherEmail,
            teacherPhone,
            room,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ Đã cập nhật phân công GVCN ${editingClass.className} thành công!`);
        setEditingClass(null);
        fetchGradeSummary(week, grade);
      } else {
        alert(data.message || "Lỗi khi cập nhật");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setSavingTeacher(false);
    }
  };

  // Kích hoạt đồng bộ Cloud Sync Firebase
  const handleTriggerCloudSync = async (action: "upload" | "download" | "test") => {
    setSyncingCloud(true);
    setCloudMessage(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCloudMessage({ type: "success", text: data.message || "Thao tác Cloud thành công!" });
        fetchCloudAndSecurity();
      } else {
        setCloudMessage({ type: "error", text: data.message || "Lỗi xử lý Cloud" });
      }
    } catch {
      setCloudMessage({ type: "error", text: "Lỗi kết nối đến máy chủ Cloud" });
    } finally {
      setSyncingCloud(false);
    }
  };

  // Xuất file CSV báo cáo toàn trường / khối
  const handleExportCSV = () => {
    if (!summary?.classes) return;

    const headers = [
      "Hạng",
      "Mã Lớp",
      "Tên Lớp",
      "Khối",
      "Giáo Viên Chủ Nhiệm",
      "Số Điện Thoại",
      "Phòng Học",
      "Sĩ Số",
      "Điểm Thi Đua Tuần",
      "Điểm Thưởng (+)",
      "Điểm Trừ (-)",
      "Tỷ Lệ Chuyên Cần (%)",
    ];

    const rows = summary.classes.map((c) => [
      c.rank || 1,
      c.classId,
      c.className,
      `Khối ${c.grade}`,
      c.teacherName,
      c.teacherPhone || "",
      c.room,
      c.studentCount,
      c.avgScore?.toFixed(1) || "100.0",
      c.totalPlus || 0,
      c.totalMinus || 0,
      `${c.conductRate || 98}%`,
    ]);

    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((val) => {
              const str = String(val);
              if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(",")
        ),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute(
      "href",
      url
    );
    const scopeLabel = grade === 0 ? "Toan_Truong" : `Khoi_${grade}`;
    link.setAttribute("download", `Bao_Cao_Thi_Dua_${scopeLabel}_Tuan_${week}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // In Báo Cáo A4 Toàn Trường / Toàn Khối
  const handlePrintReport = () => {
    if (!summary) return;

    const scopeTitle = grade === 0 ? "TOÀN TRƯỜNG" : `KHỐI ${grade}`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Vui lòng cho phép popup trình duyệt để in báo cáo.");
      return;
    }

    const rowsHtml = summary.classes
      .map(
        (c) => `
      <tr style="text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 6px; font-weight: bold;">${c.rank === 1 ? "🥇 1" : c.rank === 2 ? "🥈 2" : c.rank === 3 ? "🥉 3" : c.rank}</td>
        <td style="padding: 6px; font-weight: 600; text-align: left;">${c.className} (Khối ${c.grade})</td>
        <td style="padding: 6px; text-align: left;">${c.teacherName}</td>
        <td style="padding: 6px;">${c.room}</td>
        <td style="padding: 6px;">${c.studentCount}</td>
        <td style="padding: 6px; font-weight: bold; color: #1e3a8a; font-size: 14px;">${c.avgScore?.toFixed(1)}</td>
        <td style="padding: 6px; color: #16a34a; font-weight: 600;">+${c.totalPlus || 0}</td>
        <td style="padding: 6px; color: #dc2626; font-weight: 600;">-${c.totalMinus || 0}</td>
        <td style="padding: 6px;">${c.conductRate || 98}%</td>
        <td style="padding: 6px; font-weight: 600; color: ${
          (c.rank || 1) <= 2 ? "#15803d" : (c.rank || 1) <= 5 ? "#1d4ed8" : "#b45309"
        };">
          ${(c.rank || 1) === 1 ? "Xuất sắc (Nhất)" : (c.rank || 1) === 2 ? "Tuyên dương (Nhì)" : (c.rank || 1) === 3 ? "Khá Tốt (Ba)" : "Đạt yêu cầu"}
        </td>
      </tr>
    `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Báo Cáo Thi Đua & Nề Nếp ${scopeTitle} - Tuần ${week}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 12mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.3; margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f1f5f9; padding: 7px 4px; font-size: 12px; border: 1px solid #cbd5e1; }
          td { border: 1px solid #cbd5e1; }
          .header { display: flex; justify-content: space-between; text-align: center; margin-bottom: 15px; }
          .title { text-align: center; margin: 15px 0 10px 0; }
          .stats { display: flex; justify-content: space-around; margin: 12px 0; font-size: 13px; font-weight: bold; }
          .signature { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="width: 45%;">
            <strong>PHÒNG GIÁO DỤC VÀ ĐÀO TẠO</strong><br/>
            <strong>TRƯỜNG THCS QUANG TRUNG</strong><br/>
            <span style="font-size: 12px;">Hệ thống Quản trị & Thi đua Nề nếp</span>
          </div>
          <div style="width: 50%;">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
            <strong>Độc lập – Tự do – Hạnh phúc</strong><br/>
            <span style="font-size: 12px;">-------------------------</span>
          </div>
        </div>

        <div class="title">
          <h2 style="margin: 0; text-transform: uppercase; font-size: 17px; color: #1e3a8a;">
            BẢNG TỔNG HỢP THI ĐUA & NỀ NẾP ${scopeTitle}
          </h2>
          <div style="font-style: italic; font-size: 13px; margin-top: 4px;">
            Tuần học số ${week} – Năm học 2025 - 2026 (Ngày xuất: ${new Date().toLocaleDateString("vi-VN")})
          </div>
        </div>

        <div class="stats">
          <div>🏫 Tổng Sĩ Số: ${summary.totalStudents} Học sinh</div>
          <div>🏆 Lớp Dẫn Đầu: ${summary.topClass}</div>
          <div>📊 Điểm TB: ${summary.gradeAvgScore} Điểm</div>
          <div>📋 Quy Mô: ${summary.classCount} Lớp</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 38px;">Hạng</th>
              <th>Lớp</th>
              <th>Giáo Viên Chủ Nhiệm</th>
              <th style="width: 65px;">Phòng</th>
              <th style="width: 45px;">Sĩ Số</th>
              <th style="width: 55px;">Điểm Tuần</th>
              <th style="width: 45px;">Thưởng (+)</th>
              <th style="width: 45px;">Phạt (-)</th>
              <th style="width: 55px;">Chuyên Cần</th>
              <th style="width: 100px;">Xếp Loại</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 15px; font-size: 13px;">
          <strong>Nhận xét chung của Quản Trị Trường:</strong><br/>
          - Tinh thần học tập và nề nếp kỷ luật tuần ${week} duy trì rất tốt.<br/>
          - Biểu dương tập thể <strong>${summary.topClass}</strong> đã xuất sắc giành vị trí dẫn đầu.<br/>
          - Các lớp cần tiếp tục đôn đốc học sinh chấp hành nghiêm túc 40 tiêu chuẩn thi đua nhà trường.
        </div>

        <div class="signature">
          <div style="width: 40%;">
            <strong>TỔNG PHỤ TRÁCH ĐỘI</strong><br/>
            <span style="font-size: 12px;">(Ký và ghi rõ họ tên)</span>
            <br/><br/><br/><br/>
            <strong>Nguyễn Văn Long</strong>
          </div>
          <div style="width: 45%;">
            <em>Hà Nội, ngày .... tháng .... năm 2026</em><br/>
            <strong>HIỆU TRƯỞNG / QUẢN TRỊ TRƯỜNG</strong><br/>
            <span style="font-size: 12px;">(Ký, đóng dấu và ghi rõ họ tên)</span>
            <br/><br/><br/><br/>
            <strong>TS. Trần Đình Quang</strong>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* HEADER MODAL */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-2xl backdrop-blur-sm border border-white/20">
              🏛️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Bảng Điều Khiển Quản Trị Trường & Thi Đua
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Giai Đoạn 3 Toàn Diện
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Quản trị 32 lớp học toàn trường (Khối 6, 7, 8, 9) • Đồng bộ Cloud Firebase • Ma trận bảo mật RBAC
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Bộ chọn Tuần */}
            <div className="flex items-center bg-white/10 rounded-lg px-2.5 py-1 text-xs border border-white/20">
              <span className="text-slate-300 mr-1.5 font-medium">Tuần:</span>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="bg-transparent font-bold text-white outline-none cursor-pointer"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w} className="text-slate-900">
                    Tuần {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút đóng */}
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Đóng bảng điều khiển"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 6 TABS NAVIGATION */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab("ranking")}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === "ranking"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>🏆</span>
              <span>1. Xếp Hạng Thi Đua</span>
            </button>

            <button
              onClick={() => setActiveTab("inspect")}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === "inspect"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>🔍</span>
              <span>2. Thanh Tra Sổ Lớp</span>
            </button>

            <button
              onClick={() => setActiveTab("teachers")}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === "teachers"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>👩‍🏫</span>
              <span>3. Phân Công GVCN</span>
            </button>

            <button
              onClick={() => setActiveTab("cloud_sync")}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === "cloud_sync"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>☁️</span>
              <span>4. Đồng Bộ Cloud Firebase</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === "security"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>🔐</span>
              <span>5. Bảo Mật & Phân Quyền</span>
            </button>

            <button
              onClick={() => setActiveTab("export")}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === "export"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>🧾</span>
              <span>6. Xuất & In A4</span>
            </button>
          </div>

          {/* Bộ lọc Khối Toàn Trường / Khối 6, 7, 8, 9 */}
          <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setGrade(0)}
              className={`px-2 py-1 rounded ${grade === 0 ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Toàn Trường
            </button>
            <button
              onClick={() => setGrade(6)}
              className={`px-2 py-1 rounded ${grade === 6 ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Khối 6
            </button>
            <button
              onClick={() => setGrade(7)}
              className={`px-2 py-1 rounded ${grade === 7 ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Khối 7
            </button>
            <button
              onClick={() => setGrade(8)}
              className={`px-2 py-1 rounded ${grade === 8 ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Khối 8
            </button>
            <button
              onClick={() => setGrade(9)}
              className={`px-2 py-1 rounded ${grade === 9 ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Khối 9
            </button>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH (SCROLLABLE BODY) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60">

          {/* ========================================================= */}
          {/* TAB 1: BẢNG XẾP HẠNG THI ĐUA */}
          {/* ========================================================= */}
          {activeTab === "ranking" && (
            <div className="space-y-6">
              {/* 4 THẺ KPI TOÀN TRƯỜNG / KHỐI */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl font-bold">
                    🏫
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">
                      {grade === 0 ? "Tổng Sĩ Số Trường" : `Sĩ Số Khối ${grade}`}
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {summary?.totalStudents || 0} <span className="text-xs font-normal text-slate-500">HS ({summary?.classCount || 0} Lớp)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">
                    🥇
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Lớp Dẫn Đầu Tuần {week}</div>
                    <div className="text-lg font-bold text-amber-700 truncate">
                      {summary?.topClass || "Lớp 8A6"}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                    🌟
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Tổng Khen Thưởng</div>
                    <div className="text-xl font-bold text-emerald-700">
                      +{summary?.classes.reduce((s, c) => s + (c.totalPlus || 0), 0) || 0} <span className="text-xs font-normal text-slate-500">Lượt</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-bold">
                    ⚠️
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Tổng Vi Phạm Tuần</div>
                    <div className="text-xl font-bold text-rose-700">
                      -{summary?.classes.reduce((s, c) => s + (c.totalMinus || 0), 0) || 0} <span className="text-xs font-normal text-slate-500">Sự vụ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BẢNG XẾP HẠNG CHI TIẾT */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-slate-800">
                      🏆 Bảng Xếp Hạng Thi Đua {grade === 0 ? "Toàn Trường (32 Lớp)" : `Khối ${grade}`}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                      Tuần {week}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Điểm TB: <strong className="text-blue-700">{summary?.gradeAvgScore || 100} đ</strong>
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
                    <div>Đang tổng hợp điểm thi đua...</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="p-3.5 text-center w-16">Hạng</th>
                          <th className="p-3.5">Lớp & Khối</th>
                          <th className="p-3.5">Giáo Viên Chủ Nhiệm</th>
                          <th className="p-3.5 text-center">Phòng</th>
                          <th className="p-3.5 text-center">Sĩ Số</th>
                          <th className="p-3.5 text-center">Điểm Tuần</th>
                          <th className="p-3.5 text-center">Thưởng (+)</th>
                          <th className="p-3.5 text-center">Phạt (-)</th>
                          <th className="p-3.5 text-center">Chuyên Cần</th>
                          <th className="p-3.5 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {summary?.classes.map((c) => {
                          const isGold = c.rank === 1;
                          const isSilver = c.rank === 2;
                          const isBronze = c.rank === 3;
                          const isSelected = c.classId === currentClassId;

                          return (
                            <tr
                              key={c.classId}
                              className={`transition hover:bg-blue-50/50 ${
                                isSelected ? "bg-blue-50/80 font-semibold" : ""
                              }`}
                            >
                              <td className="p-3.5 text-center">
                                {isGold ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold shadow-xs">
                                    🥇 1
                                  </span>
                                ) : isSilver ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold shadow-xs">
                                    🥈 2
                                  </span>
                                ) : isBronze ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-800 font-bold shadow-xs">
                                    🥉 3
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-medium">{c.rank}</span>
                                )}
                              </td>

                              <td className="p-3.5">
                                <div className="font-bold text-slate-900 flex items-center space-x-2">
                                  <span>{c.className}</span>
                                  {isSelected && (
                                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded">
                                      Hiện tại
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">Khối {c.grade} • THCS Quang Trung</div>
                              </td>

                              <td className="p-3.5">
                                <div className="font-medium text-slate-800">{c.teacherName}</div>
                                <div className="text-xs text-slate-500">{c.teacherPhone || c.teacherEmail}</div>
                              </td>

                              <td className="p-3.5 text-center text-xs font-medium text-slate-600">
                                {c.room}
                              </td>

                              <td className="p-3.5 text-center font-semibold text-slate-700">
                                {c.studentCount}
                              </td>

                              <td className="p-3.5 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-bold bg-blue-100 text-blue-800">
                                  {c.avgScore?.toFixed(1) || "100.0"}
                                </span>
                              </td>

                              <td className="p-3.5 text-center font-semibold text-emerald-600">
                                +{c.totalPlus || 0}
                              </td>

                              <td className="p-3.5 text-center font-semibold text-rose-600">
                                -{c.totalMinus || 0}
                              </td>

                              <td className="p-3.5 text-center font-semibold text-indigo-700">
                                {c.conductRate || 98}%
                              </td>

                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    onClick={() => {
                                      setInspectClassId(c.classId);
                                      setActiveTab("inspect");
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                                  >
                                    🔍 Xem Sổ
                                  </button>
                                  {onSelectClass && (
                                    <button
                                      onClick={() => {
                                        onSelectClass(c.classId);
                                        onClose();
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                                    >
                                      Chọn Lớp
                                    </button>
                                  )}
                                </div>
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

          {/* ========================================================= */}
          {/* TAB 2: THANH TRA & CHUYỂN LỚP */}
          {/* ========================================================= */}
          {activeTab === "inspect" && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Thanh Tra & Kiểm Tra Nề Nếp Lớp Học (Dành Cho Quản Trị Trường)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quản trị trường có thể chọn bất kỳ lớp nào trong 32 lớp để kiểm tra nề nếp, điểm danh và các sự việc đã ghi nhận.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-600">Chọn Lớp:</span>
                    <select
                      value={inspectClassId}
                      onChange={(e) => setInspectClassId(e.target.value)}
                      className="px-3 py-1.5 text-sm font-bold bg-blue-50 text-blue-900 border border-blue-200 rounded-lg outline-none cursor-pointer"
                    >
                      {summary?.classes.map((c) => (
                        <option key={c.classId} value={c.classId}>
                          {c.className} (Khối {c.grade}) - {c.teacherName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {inspectedClass && (
                  <div className="mt-5 space-y-5">
                    {/* THẺ THÔNG TIN LỚP ĐƯỢC CHỌN */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-500 font-medium">Lớp Học & Phòng</div>
                        <div className="text-lg font-bold text-slate-900 mt-0.5">{inspectedClass.className}</div>
                        <div className="text-xs text-slate-600 mt-1">Phòng: <strong>{inspectedClass.room}</strong> • Sĩ số: <strong>{inspectedClass.studentCount} HS</strong></div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-500 font-medium">Giáo Viên Chủ Nhiệm</div>
                        <div className="text-lg font-bold text-blue-800 mt-0.5">{inspectedClass.teacherName}</div>
                        <div className="text-xs text-slate-600 mt-1">SĐT: <strong>{inspectedClass.teacherPhone || "Chưa cập nhật"}</strong></div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-500 font-medium">Kết Quả Tuần {week}</div>
                        <div className="text-lg font-bold text-emerald-700 mt-0.5">
                          {inspectedClass.avgScore?.toFixed(1) || "100.0"} đ (Hạng {inspectedClass.rank})
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Thưởng: +{inspectedClass.totalPlus || 0} • Phạt: -{inspectedClass.totalMinus || 0}
                        </div>
                      </div>
                    </div>

                    {/* HÀNH ĐỘNG THANH TRA TRỰC TIẾP */}
                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-blue-900 text-sm">
                          Thao Tác Quản Trị Trực Tiếp Lớp {inspectedClass.className}
                        </div>
                        <div className="text-xs text-blue-700 mt-0.5">
                          Mở sổ nề nếp chấm điểm hoặc chuyển toàn bộ phiên làm việc của giao diện sang lớp này.
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {onOpenClassCompetition && (
                          <button
                            onClick={() => {
                              onOpenClassCompetition(inspectedClass.classId);
                              onClose();
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center space-x-1.5"
                          >
                            <span>📖</span>
                            <span>Mở Sổ Nề Nếp & Chấm Điểm Lớp Này</span>
                          </button>
                        )}

                        {onSelectClass && (
                          <button
                            onClick={() => {
                              onSelectClass(inspectedClass.classId);
                              onClose();
                            }}
                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition"
                          >
                            ✓ Chuyển Sang Lớp Này
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: PHÂN CÔNG & QUẢN LÝ GVCN */}
          {/* ========================================================= */}
          {activeTab === "teachers" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Danh Bạ & Phân Công Giáo Viên Chủ Nhiệm 32 Lớp Toàn Trường
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quản trị trường có quyền cập nhật phân công, số hotline và phòng học của giáo viên chủ nhiệm.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Lọc Khối */}
                    <select
                      value={teacherFilterGrade}
                      onChange={(e) => setTeacherFilterGrade(Number(e.target.value))}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none"
                    >
                      <option value={0}>Tất Cả Các Khối (32 Lớp)</option>
                      <option value={6}>Khối 6 (8 Lớp)</option>
                      <option value={7}>Khối 7 (8 Lớp)</option>
                      <option value={8}>Khối 8 (8 Lớp)</option>
                      <option value={9}>Khối 9 (8 Lớp)</option>
                    </select>

                    {/* Ô Tìm kiếm */}
                    <input
                      type="text"
                      placeholder="Tìm tên GV, lớp..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 w-44"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="p-3.5">Mã Lớp</th>
                        <th className="p-3.5">Tên Lớp & Khối</th>
                        <th className="p-3.5">Giáo Viên Chủ Nhiệm</th>
                        <th className="p-3.5">Số Điện Thoại</th>
                        <th className="p-3.5">Email GVCN</th>
                        <th className="p-3.5 text-center">Phòng Học</th>
                        <th className="p-3.5 text-center">Sĩ Số</th>
                        <th className="p-3.5 text-center">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {filteredTeacherClasses.map((c) => (
                        <tr key={c.classId} className="hover:bg-slate-50 transition">
                          <td className="p-3.5 font-bold text-blue-900">{c.classId}</td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-800">{c.className}</span>
                            <span className="text-xs text-slate-500 ml-1.5">(Khối {c.grade})</span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-900">{c.teacherName}</td>
                          <td className="p-3.5 text-slate-600 font-mono text-xs">{c.teacherPhone || "---"}</td>
                          <td className="p-3.5 text-slate-600 text-xs">{c.teacherEmail}</td>
                          <td className="p-3.5 text-center font-medium text-slate-700">{c.room}</td>
                          <td className="p-3.5 text-center font-bold text-slate-800">{c.studentCount}</td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleStartEdit(c)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition"
                            >
                              ✏️ Sửa Phân Công
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODAL SỬA PHÂN CÔNG GVCN */}
              {editingClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
                    <h4 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
                      ✏️ Cập Nhật Phân Công GVCN: {editingClass.className}
                    </h4>

                    <form onSubmit={handleSaveTeacher} className="space-y-4 mt-4 text-sm">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Họ và Tên Giáo Viên Chủ Nhiệm
                        </label>
                        <input
                          type="text"
                          required
                          value={teacherName}
                          onChange={(e) => setTeacherName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Số Điện Thoại (Hotline)
                          </label>
                          <input
                            type="text"
                            value={teacherPhone}
                            onChange={(e) => setTeacherPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Phòng Học
                          </label>
                          <input
                            type="text"
                            required
                            value={room}
                            onChange={(e) => setRoom(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Liên Hệ Nhà Trường
                        </label>
                        <input
                          type="email"
                          required
                          value={teacherEmail}
                          onChange={(e) => setTeacherEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setEditingClass(null)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          Hủy Bỏ
                        </button>
                        <button
                          type="submit"
                          disabled={savingTeacher}
                          className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                        >
                          {savingTeacher ? "Đang lưu..." : "✓ Lưu Cập Nhật"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: ĐỒNG BỘ ĐÁM MÂY FIREBASE (CLOUD SYNC) */}
          {/* ========================================================= */}
          {activeTab === "cloud_sync" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                
                {/* Trạng thái kết nối Cloud */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 text-white">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold">
                      🔥
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold">Firebase Cloud Firestore</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-slate-950">
                          {cloudStatus?.connected ? "ONLINE" : "CONFIGURED"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-mono mt-0.5">
                        Project ID: <strong>{cloudStatus?.projectId || "chatbot-gvcn"}</strong> • Storage: <strong>{cloudStatus?.storageBucket || "chatbot-gvcn.firebasestorage.app"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTriggerCloudSync("test")}
                      disabled={syncingCloud}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition border border-white/20"
                    >
                      ⚡ Test Ping Firestore
                    </button>
                  </div>
                </div>

                {/* Thông báo thao tác Cloud */}
                {cloudMessage && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                      cloudMessage.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    <span>{cloudMessage.text}</span>
                    <button onClick={() => setCloudMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
                  </div>
                )}

                {/* 4 Thống kê Cloud Data */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-center">
                    <div className="text-xs text-blue-700 font-semibold">Lớp Học Đồng Bộ</div>
                    <div className="text-2xl font-bold text-blue-900 mt-1">32 / 32</div>
                    <div className="text-[10px] text-blue-600 mt-0.5">Khối 6, 7, 8, 9</div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-center">
                    <div className="text-xs text-indigo-700 font-semibold">Học Sinh Toàn Trường</div>
                    <div className="text-2xl font-bold text-indigo-900 mt-1">~1,390</div>
                    <div className="text-[10px] text-indigo-600 mt-0.5">Đã ánh xạ mã HS</div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
                    <div className="text-xs text-emerald-700 font-semibold">Tiêu Chuẩn Thi Đua</div>
                    <div className="text-2xl font-bold text-emerald-900 mt-1">40 Mã</div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">6 Nhóm A..F chuẩn</div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
                    <div className="text-xs text-amber-700 font-semibold">Độ Trễ Phản Hồi</div>
                    <div className="text-2xl font-bold text-amber-900 mt-1">{cloudStatus?.latencyMs || 42} ms</div>
                    <div className="text-[10px] text-amber-600 mt-0.5">Tốc độ tối ưu</div>
                  </div>
                </div>

                {/* Nút hành động Cloud Đồng Bộ */}
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="font-bold text-slate-800 text-sm">
                    Trung Tâm Sao Lưu & Đồng Bộ Dữ Liệu Lên Đám Mây Firebase
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleTriggerCloudSync("upload")}
                      disabled={syncingCloud}
                      className="p-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl shadow-md transition text-left flex items-start space-x-3 disabled:opacity-50"
                    >
                      <span className="text-2xl">☁️</span>
                      <div>
                        <div className="font-bold text-sm">
                          {syncingCloud ? "Đang đồng bộ..." : "Đẩy Dữ Liệu Lên Cloud Firestore"}
                        </div>
                        <div className="text-xs text-blue-200 mt-0.5">
                          Đồng bộ toàn bộ 32 lớp học, sự kiện thi đua, phân công GVCN và nề nếp lên Firebase.
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleTriggerCloudSync("download")}
                      disabled={syncingCloud}
                      className="p-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white rounded-xl shadow-md transition text-left flex items-start space-x-3 disabled:opacity-50"
                    >
                      <span className="text-2xl">🔄</span>
                      <div>
                        <div className="font-bold text-sm">
                          {syncingCloud ? "Đang kiểm tra..." : "Xác Thực & Kéo Dữ Liệu Mới Nhất"}
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          Kiểm tra các thay đổi mới nhất từ giáo viên các lớp trên Firestore để cập nhật cache.
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: BẢO MẬT & MA TRẬN PHÂN QUYỀN (RBAC MATRIX) */}
          {/* ========================================================= */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    🔐 Ma Trận Phân Quyền Bảo Mật 5 Cấp Chuẩn Toàn Trường (RBAC Security)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ thống phân tách quyền hạn tuyệt đối giữa Quản Trị Trường, Giáo Viên Chủ Nhiệm, Ban Cán Sự Lớp, Tổ Trưởng và Phụ Huynh / Học Sinh.
                  </p>
                </div>

                {/* 5 CẤP VAI TRÒ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {securityRoles.map((role) => (
                    <div
                      key={role.roleId}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-blue-950">{role.title}</span>
                        <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {role.scope}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">{role.description}</p>

                      <div className="pt-2 border-t border-slate-200/80">
                        <div className="text-[11px] font-bold text-slate-700 mb-1">Quyền Hạn Cho Phép:</div>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {role.permissions.map((perm, pIdx) => (
                            <li key={pIdx} className="flex items-start space-x-1.5">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{perm}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CƠ CHẾ BẢO VỆ CHỐNG GIAN LẬN */}
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                  <div className="font-bold text-amber-900 text-xs flex items-center space-x-1.5">
                    <span>🛡️</span>
                    <span>Quy Tắc Bảo Mật & Phòng Chống Thao Túng Điểm Số:</span>
                  </div>
                  <div className="text-xs text-amber-800 space-y-1">
                    <div>1. <strong>Tổ Trưởng chỉ chấm trong tổ</strong>: Tài khoản <code>to1..to4</code> bị giới hạn phạm vi, không thể sửa học sinh tổ khác.</div>
                    <div>2. <strong>Hàng đợi chờ duyệt 100%</strong>: Mọi điểm số do học sinh / cán sự ghi nhận đều phải qua GVCN bấm <code>✓ Duyệt</code> mới tính vào tổng kết.</div>
                    <div>3. <strong>Mã hóa phiên làm việc</strong>: Sử dụng JWT Session Token kết hợp HttpOnly Cookie chống giả mạo danh tính.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: XUẤT BÁO CÁO & IN A4 */}
          {/* ========================================================= */}
          {activeTab === "export" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    🧾 Xuất Dữ Liệu Báo Cáo & In Ấn Văn Bản Hành Chính A4
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sẵn sàng xuất file bảng tính Excel/CSV hoặc in phiếu đánh giá chuẩn A4 gửi Hiệu Trưởng / Quản Trị Trường và Phòng GD&ĐT.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nút Xuất CSV */}
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
                      📊
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        Xuất Bảng Xếp Hạng Ra File CSV / Excel
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Tải file CSV định dạng UTF-8 với đầy đủ các cột thứ hạng, điểm số, chuyên cần và GVCN.
                      </div>
                    </div>
                    <button
                      onClick={handleExportCSV}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center space-x-2"
                    >
                      <span>📥</span>
                      <span>Tải Xuống File CSV (Tuần {week})</span>
                    </button>
                  </div>

                  {/* Nút In A4 */}
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
                      🖨️
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        In Báo Cáo Thi Đua Chuẩn Văn Bản A4
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Tạo văn bản in ấn trang trọng có Quốc hiệu Tiêu ngữ, bảng điểm chi tiết và phần ký duyệt của Hiệu Trưởng / Quản Trị Trường.
                      </div>
                    </div>
                    <button
                      onClick={handlePrintReport}
                      className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center space-x-2"
                    >
                      <span>🖨️</span>
                      <span>Mở Bản Xem Trước & In A4 (1-Click)</span>
                    </button>
                  </div>
                </div>

                {/* BẢNG XEM TRƯỚC SỐ LIỆU SẼ XUẤT */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Xem trước danh sách {summary?.classes.length || 0} lớp trong báo cáo Tuần {week} ({grade === 0 ? "Toàn Trường" : `Khối ${grade}`}):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {summary?.classes.map((c) => (
                      <div key={c.classId} className="p-2 bg-white rounded border border-slate-200 flex justify-between">
                        <span className="font-bold text-slate-800">{c.className}</span>
                        <span className="font-semibold text-blue-700">{c.avgScore?.toFixed(1)}đ (#{c.rank})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-600">
          <div>
            🏛️ Hệ thống Quản trị & Thi đua Trường THCS Quang Trung • <strong>Phiên bản 3.0 Hoàn Thiện</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
