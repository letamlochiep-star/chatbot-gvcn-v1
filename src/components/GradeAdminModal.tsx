"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  ClassInfo,
  GradeCompetitionSummary,
  CloudSyncStatus,
  SchoolSecurityRole,
  TeacherAccountInfo,
  CompetitionPeriod,
  PeriodCompetitionSummary,
} from "@/lib/types";

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
    "ranking" | "inspect" | "teachers" | "accounts" | "cloud_sync" | "security" | "export"
  >("ranking");
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<CompetitionPeriod>("week");
  const [week, setWeek] = useState<number>(1);
  const [grade, setGrade] = useState<number>(0); // 0: Toàn trường, 6: Khối 6, 7: Khối 7, 8: Khối 8, 9: Khối 9
  const [summary, setSummary] = useState<PeriodCompetitionSummary | null>(null);

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

  // Create Class state
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [newClassGrade, setNewClassGrade] = useState<number>(8);
  const [newClassTeacher, setNewClassTeacher] = useState("");
  const [newClassPhone, setNewClassPhone] = useState("");
  const [newClassEmail, setNewClassEmail] = useState("");
  const [newClassRoom, setNewClassRoom] = useState("");
  const [newClassStudents, setNewClassStudents] = useState<number>(45);
  const [addingClass, setAddingClass] = useState(false);

  // Excel Import Class state
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [importedPreviewClasses, setImportedPreviewClasses] = useState<ClassInfo[]>([]);
  const [importingFile, setImportingFile] = useState(false);
  const [importOverwrite, setImportOverwrite] = useState(true);
  const classFileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // 🔑 TEACHER ACCOUNTS STATE (CẤP TÀI KHOẢN GVCN)
  // ==========================================
  const [teacherAccounts, setTeacherAccounts] = useState<TeacherAccountInfo[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountFilterGrade, setAccountFilterGrade] = useState<number>(0);
  const [accountSearch, setAccountSearch] = useState("");
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Modal Sinh tài khoản hàng loạt
  const [showBatchGenModal, setShowBatchGenModal] = useState(false);
  const [genFormat, setGenFormat] = useState<"prefix_class" | "email" | "phone">("prefix_class");
  const [genDefaultPass, setGenDefaultPass] = useState("Antam2025@");
  const [genRandomPass, setGenRandomPass] = useState(false);
  const [generatingAccounts, setGeneratingAccounts] = useState(false);

  // Modal Sửa tài khoản đơn lẻ
  const [editingAccount, setEditingAccount] = useState<TeacherAccountInfo | null>(null);
  const [editAccUsername, setEditAccUsername] = useState("");
  const [editAccPassword, setEditAccPassword] = useState("");
  const [editAccStatus, setEditAccStatus] = useState<"active" | "locked">("active");
  const [savingAccount, setSavingAccount] = useState(false);

  // Modal Đặt lại mật khẩu chung
  const [showResetAllPassModal, setShowResetAllPassModal] = useState(false);
  const [bulkNewPassword, setBulkNewPassword] = useState("Antam2025@");
  const [resettingBulkPass, setResettingBulkPass] = useState(false);

  // Excel Import Teacher Accounts
  const [showImportAccModal, setShowImportAccModal] = useState(false);
  const [importedPreviewAccounts, setImportedPreviewAccounts] = useState<TeacherAccountInfo[]>([]);
  const [importAccOverwrite, setImportAccOverwrite] = useState(false);
  const [importingAccFile, setImportingAccFile] = useState(false);
  const accFileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Sync state
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Security Matrix state
  const [securityRoles, setSecurityRoles] = useState<SchoolSecurityRole[]>([]);

  // 1. Tải bảng tổng hợp thi đua khối / toàn trường theo kỳ
  const fetchGradeSummary = async (targetPeriod: CompetitionPeriod = period, targetWeek: number = week, targetGrade: number = grade) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes?summary=true&period=${targetPeriod}&week=${targetWeek}&grade=${targetGrade}`);
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

  useEffect(() => {
    fetchGradeSummary(period, week, grade);
  }, [period, week, grade]);

  // 2. Tải danh sách tài khoản GVCN
  const fetchTeacherAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/classes?teacherAccounts=true");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.accounts)) {
          setTeacherAccounts(data.accounts);
        }
      }
    } catch (err) {
      console.error("Lỗi tải danh sách tài khoản GVCN:", err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 3. Tải Cloud status & Security matrix
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
    fetchTeacherAccounts();
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

  // Danh sách tài khoản GVCN đã lọc
  const filteredTeacherAccounts = useMemo(() => {
    return teacherAccounts.filter((a) => {
      const matchGrade = accountFilterGrade === 0 || a.grade === accountFilterGrade;
      const matchSearch =
        accountSearch === "" ||
        a.className.toLowerCase().includes(accountSearch.toLowerCase()) ||
        a.teacherName.toLowerCase().includes(accountSearch.toLowerCase()) ||
        a.username.toLowerCase().includes(accountSearch.toLowerCase()) ||
        (a.phone && a.phone.includes(accountSearch)) ||
        (a.email && a.email.toLowerCase().includes(accountSearch.toLowerCase()));
      return matchGrade && matchSearch;
    });
  }, [teacherAccounts, accountFilterGrade, accountSearch]);

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
        fetchGradeSummary(period, week, grade);
        fetchTeacherAccounts();
      } else {
        alert(data.message || "Lỗi khi cập nhật");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setSavingTeacher(false);
    }
  };

  // Tạo lớp học mới
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const classId = newClassId.trim() || newClassName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    setAddingClass(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addClass",
          newClass: {
            classId,
            className: newClassName.trim().startsWith("Lớp") ? newClassName.trim() : `Lớp ${newClassName.trim()}`,
            grade: newClassGrade,
            teacherName: newClassTeacher.trim() || "Chưa phân công",
            teacherEmail: newClassEmail.trim() || `gvcn.${classId.toLowerCase()}@thcsquangtrung.edu.vn`,
            teacherPhone: newClassPhone.trim(),
            room: newClassRoom.trim() || `Phòng ${classId}`,
            studentCount: newClassStudents || 45,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ Đã tạo lớp ${newClassName} và phân công GVCN thành công!`);
        setShowAddClassModal(false);
        setNewClassName("");
        setNewClassId("");
        setNewClassTeacher("");
        setNewClassPhone("");
        setNewClassEmail("");
        setNewClassRoom("");
        fetchGradeSummary(period, week, grade);
        fetchTeacherAccounts();
      } else {
        alert(data.message || "Không thể tạo lớp học.");
      }
    } catch {
      alert("Lỗi kết nối khi tạo lớp học.");
    } finally {
      setAddingClass(false);
    }
  };

  // Xóa lớp học
  const handleDeleteClass = async (c: ClassInfo) => {
    if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa lớp ${c.className} (Mã: ${c.classId}) khỏi hệ thống?`)) {
      return;
    }

    // Cập nhật giao diện ngay lập tức
    if (summary?.classes) {
      setSummary({
        ...summary,
        classes: summary.classes.filter((cls) => cls.classId.toUpperCase() !== c.classId.toUpperCase()),
        classCount: Math.max(0, summary.classCount - 1),
      });
    }

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteClass",
          classId: c.classId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ Đã xóa lớp ${c.className} thành công!`);
        fetchGradeSummary(period, week, grade);
        fetchTeacherAccounts();
      } else {
        alert(data.message || "Không thể xóa lớp.");
        fetchGradeSummary(period, week, grade);
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
      fetchGradeSummary(period, week, grade);
    }
  };

  // Xóa sạch toàn bộ lớp demo
  const handleClearAllClasses = async () => {
    if (!confirm("⚠️ Bạn có chắc chắn muốn xóa sạch toàn bộ danh mục lớp demo hiện tại để nạp danh sách lớp mới?")) {
      return;
    }

    // Giao diện tức thì
    if (summary) {
      setSummary({ ...summary, classes: [], classCount: 0, totalStudents: 0 });
    }

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearAllClasses" }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert("✓ Đã làm sạch danh mục lớp demo! Bạn có thể nhập danh sách lớp mới từ file Excel.");
        fetchGradeSummary(period, week, grade);
        fetchTeacherAccounts();
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
      fetchGradeSummary(period, week, grade);
    }
  };

  // Khôi phục 32 lớp mẫu
  const handleResetDemoClasses = async () => {
    if (!confirm("Khôi phục lại 32 lớp mẫu ban đầu của trường THCS Quang Trung?")) {
      return;
    }

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetDemoClasses" }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert("✓ Đã khôi phục 32 lớp mẫu thành công!");
        fetchGradeSummary(period, week, grade);
        fetchTeacherAccounts();
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    }
  };

  // Tải file Excel mẫu: STT | LỚP | GVCN
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      { STT: 1, "Lớp": "8A1", "GVCN": "Cô Trần Thị Mai", "Phòng Học": "Phòng 201", "Số Điện Thoại": "0912.345.801" },
      { STT: 2, "Lớp": "8A2", "GVCN": "Thầy Lê Văn Hùng", "Phòng Học": "Phòng 202", "Số Điện Thoại": "0912.345.802" },
      { STT: 3, "Lớp": "8A3", "GVCN": "Cô Phạm Thanh Hà", "Phòng Học": "Phòng 203", "Số Điện Thoại": "0912.345.803" },
      { STT: 4, "Lớp": "8A6", "GVCN": "Cô Nguyễn Thúy Hằng", "Phòng Học": "Phòng 206", "Số Điện Thoại": "0912.345.806" },
      { STT: 5, "Lớp": "6A1", "GVCN": "Cô Nguyễn Thu Hà", "Phòng Học": "Phòng 101", "Số Điện Thoại": "0912.345.601" },
      { STT: 6, "Lớp": "7A1", "GVCN": "Cô Ngô Thị Vân", "Phòng Học": "Phòng 109", "Số Điện Thoại": "0912.345.701" },
      { STT: 7, "Lớp": "9A1", "GVCN": "Cô Nguyễn Thị Phương", "Phòng Học": "Phòng 209", "Số Điện Thoại": "0912.345.901" },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachLop");
    XLSX.writeFile(wb, "Mau_Danh_Sach_Lop_GVCN.xlsx");
  };

  // Đọc và phân tích file Excel danh mục lớp
  const handleClassFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          alert("File Excel không có dữ liệu!");
          return;
        }

        const parsedClasses: ClassInfo[] = [];

        rawJson.forEach((row, idx) => {
          const classField =
            row["Lớp"] || row["lop"] || row["Lop"] || row["Lớp học"] || row["Tên lớp"] || row["ten_lop"] || "";
          const gvcnField =
            row["GVCN"] || row["gvcn"] || row["Giáo viên chủ nhiệm"] || row["Giao vien chu nhiem"] || row["Tên GVCN"] || "";
          const roomField = row["Phòng Học"] || row["Phòng"] || row["phong"] || row["Phong"] || "";
          const phoneField = row["Số Điện Thoại"] || row["SĐT"] || row["sdt"] || row["Dien thoai"] || "";

          if (classField) {
            const rawName = String(classField).trim();
            const cleanClassName = rawName.startsWith("Lớp") ? rawName : `Lớp ${rawName}`;
            const cleanId = rawName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const gradeMatch = cleanClassName.match(/\b([6-9])/);
            const gradeNum = gradeMatch ? parseInt(gradeMatch[1], 10) : 8;

            parsedClasses.push({
              classId: cleanId,
              className: cleanClassName,
              grade: gradeNum,
              teacherName: String(gvcnField).trim() || "Chưa phân công",
              teacherEmail: `gvcn.${cleanId.toLowerCase()}@thcsquangtrung.edu.vn`,
              teacherPhone: String(phoneField).trim(),
              room: String(roomField).trim() || `Phòng ${cleanId}`,
              studentCount: 45,
              avgScore: 98.0,
              rank: idx + 1,
              totalPlus: 0,
              totalMinus: 0,
              conductRate: 100,
            });
          }
        });

        if (parsedClasses.length === 0) {
          alert("Không tìm thấy dữ liệu lớp hợp lệ trong file Excel. Vui lòng kiểm tra tiêu đề cột (Lớp, GVCN).");
          return;
        }

        setImportedPreviewClasses(parsedClasses);
        setShowImportExcelModal(true);
      } catch (err) {
        console.error("Lỗi đọc file Excel:", err);
        alert("Lỗi khi xử lý file Excel. Vui lòng kiểm tra định dạng .xlsx hoặc .xls");
      }
    };
    reader.readAsBinaryString(file);

    if (e.target) {
      e.target.value = "";
    }
  };

  // Xác nhận lưu danh mục lớp từ Excel
  const handleConfirmImportExcel = async () => {
    if (importedPreviewClasses.length === 0) return;

    setImportingFile(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batchImportClasses",
          classes: importedPreviewClasses,
          overwrite: importOverwrite,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ ${data.message}`);
        setShowImportExcelModal(false);
        setImportedPreviewClasses([]);
        fetchGradeSummary(period, week, grade);
        fetchTeacherAccounts();
      } else {
        alert(data.message || "Lỗi khi lưu danh sách lớp");
      }
    } catch {
      alert("Lỗi kết nối khi lưu danh sách lớp");
    } finally {
      setImportingFile(false);
    }
  };

  // =========================================================================
  // 🔑 CÁC HÀM XỬ LÝ QUẢN TRỊ TÀI KHOẢN GVCN HÀNG LOẠT
  // =========================================================================

  // Sinh tài khoản hàng loạt cho tất cả GVCN
  const handleBatchGenerateAccounts = async () => {
    setGeneratingAccounts(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batchGenerateTeacherAccounts",
          options: {
            usernameFormat: genFormat,
            defaultPassword: genDefaultPass,
            randomPasswords: genRandomPass,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ ${data.message}`);
        setShowBatchGenModal(false);
        fetchTeacherAccounts();
      } else {
        alert(data.message || "Lỗi khi sinh tài khoản GVCN");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setGeneratingAccounts(false);
    }
  };

  // Mở modal sửa tài khoản đơn lẻ
  const handleStartEditAccount = (acc: TeacherAccountInfo) => {
    setEditingAccount(acc);
    setEditAccUsername(acc.username);
    setEditAccPassword(acc.password);
    setEditAccStatus(acc.status || "active");
  };

  // Lưu sửa tài khoản đơn lẻ
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    setSavingAccount(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateTeacherAccount",
          classId: editingAccount.classId,
          updates: {
            username: editAccUsername.trim().toLowerCase(),
            password: editAccPassword.trim(),
            status: editAccStatus,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ Đã cập nhật tài khoản GVCN lớp ${editingAccount.className} thành công!`);
        setEditingAccount(null);
        fetchTeacherAccounts();
      } else {
        alert(data.message || "Lỗi khi cập nhật tài khoản");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setSavingAccount(false);
    }
  };

  // Đặt lại mật khẩu chung cho toàn trường
  const handleResetAllPasswords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkNewPassword.trim()) return;

    setResettingBulkPass(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetAllTeacherPasswords",
          newPassword: bulkNewPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ ${data.message}`);
        setShowResetAllPassModal(false);
        fetchTeacherAccounts();
      } else {
        alert(data.message || "Lỗi khi đặt lại mật khẩu");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setResettingBulkPass(false);
    }
  };

  // Xuất danh sách tài khoản GVCN ra Excel để bàn giao
  const handleExportAccountsToExcel = () => {
    if (teacherAccounts.length === 0) {
      alert("Chưa có danh sách tài khoản GVCN nào để xuất!");
      return;
    }

    const exportData = teacherAccounts.map((acc, idx) => ({
      "STT": idx + 1,
      "Mã Lớp": acc.classId,
      "Tên Lớp": acc.className,
      "Khối": `Khối ${acc.grade}`,
      "Họ Tên GVCN": acc.teacherName,
      "Tên Đăng Nhập": acc.username,
      "Mật Khẩu Khởi Tạo": acc.password,
      "Số Điện Thoại": acc.phone || "",
      "Email": acc.email || "",
      "Trạng Thái": acc.status === "active" ? "Đang hoạt động" : "Đã khóa",
      "Ghi Chú": "Đăng nhập tại Cổng Giáo Viên để quản lý lớp",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TaiKhoanGVCN");
    XLSX.writeFile(wb, `Danh_Sach_Tai_Khoan_GVCN_THCS_Quang_Trung_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Sao chép thông tin tài khoản GVCN để gửi Zalo / SMS
  const handleCopyAccountInfo = (acc: TeacherAccountInfo) => {
    const text = `[THCS QUANG TRUNG] Thông tin tài khoản GVCN ${acc.className}:\n- Giáo viên: ${acc.teacherName}\n- Tên đăng nhập: ${acc.username}\n- Mật khẩu: ${acc.password}\n- Cổng đăng nhập: Chọn tab Giáo Viên để truy cập.`;
    navigator.clipboard.writeText(text);
    alert(`✓ Đã sao chép thông tin tài khoản GVCN lớp ${acc.className} vào bộ nhớ tạm!`);
  };

  // Đọc file Excel tài khoản GVCN
  const handleAccFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          alert("File Excel không có dữ liệu!");
          return;
        }

        const parsed: TeacherAccountInfo[] = [];

        rawJson.forEach((row) => {
          const classField = row["Mã Lớp"] || row["Lớp"] || row["Lop"] || row["ClassId"] || "";
          const gvcnField = row["Họ Tên GVCN"] || row["GVCN"] || row["Giao vien"] || "";
          const usernameField = row["Tên Đăng Nhập"] || row["Username"] || row["Tai khoan"] || "";
          const passwordField = row["Mật Khẩu"] || row["Password"] || row["Mat khau"] || "Antam2025@";
          const phoneField = row["Số Điện Thoại"] || row["SĐT"] || row["Phone"] || "";
          const emailField = row["Email"] || "";

          if (classField) {
            const rawClass = String(classField).trim();
            const classId = rawClass.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const gradeMatch = rawClass.match(/\b([6-9])/);
            const gradeNum = gradeMatch ? parseInt(gradeMatch[1], 10) : 8;

            parsed.push({
              classId,
              className: rawClass.startsWith("Lớp") ? rawClass : `Lớp ${rawClass}`,
              grade: gradeNum,
              teacherName: String(gvcnField).trim() || "Chưa phân công",
              username: String(usernameField).trim().toLowerCase() || `gvcn.${classId.toLowerCase()}`,
              password: String(passwordField).trim() || "Antam2025@",
              phone: String(phoneField).trim(),
              email: String(emailField).trim() || `${classId.toLowerCase()}@thcsquangtrung.edu.vn`,
              status: "active",
            });
          }
        });

        if (parsed.length === 0) {
          alert("Không tìm thấy dữ liệu tài khoản hợp lệ trong file Excel!");
          return;
        }

        setImportedPreviewAccounts(parsed);
        setShowImportAccModal(true);
      } catch (err) {
        console.error("Lỗi đọc Excel tài khoản:", err);
        alert("Lỗi khi đọc file Excel tài khoản.");
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = "";
  };

  // Xác nhận import tài khoản GVCN từ Excel
  const handleConfirmImportAccounts = async () => {
    if (importedPreviewAccounts.length === 0) return;

    setImportingAccFile(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "importTeacherAccounts",
          accounts: importedPreviewAccounts,
          overwrite: importAccOverwrite,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`✓ ${data.message}`);
        setShowImportAccModal(false);
        setImportedPreviewAccounts([]);
        fetchTeacherAccounts();
      } else {
        alert(data.message || "Lỗi khi lưu tài khoản");
      }
    } catch {
      alert("Lỗi kết nối khi lưu tài khoản");
    } finally {
      setImportingAccFile(false);
    }
  };

  // Kích hoạt đồng bộ Cloud Firebase thủ công
  const handleTriggerCloudSync = async () => {
    setSyncingCloud(true);
    setCloudMessage(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "syncAll" }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCloudStatus(data.status);
        setCloudMessage({
          type: "success",
          text: `Đồng bộ Cloud thành công! Đã đồng bộ ${data.syncedSummary?.classes || 0} lớp, ${data.syncedSummary?.conductLogs || 0} nề nếp, ${data.syncedSummary?.events || 0} thi đua.`,
        });
      } else {
        setCloudMessage({ type: "error", text: data.message || "Lỗi khi đồng bộ dữ liệu lên Firebase Cloud." });
      }
    } catch {
      setCloudMessage({ type: "error", text: "Lỗi kết nối mạng khi đồng bộ Cloud." });
    } finally {
      setSyncingCloud(false);
    }
  };

  // Xuất file Excel bảng thi đua theo mốc thời gian (Tuần / HK1 / HK2 / Cả Năm)
  const handleExportExcelPeriod = () => {
    if (!summary?.classes) return;
    let filename = "";
    let rows: any[] = [];

    if (period === "week") {
      filename = `ThiDua_Tuan_${week}_${grade === 0 ? "ToanTruong" : `Khoi_${grade}`}.xlsx`;
      rows = summary.classes.map((c) => ({
        "Hạng": c.rank,
        "Lớp": c.className,
        "Khối": c.grade,
        "GVCN": c.teacherName,
        "Phòng": c.room,
        "Sĩ Số": c.studentCount,
        "Điểm Tuần": c.avgScore?.toFixed(1) || "100.0",
        "Thưởng (+)": `+${c.totalPlus || 0}`,
        "Phạt (-)": `-${c.totalMinus || 0}`,
        "Xếp Loại": c.gradeClassification || "Tốt",
      }));
    } else if (period === "semester1") {
      filename = `TongKet_ThiDua_HocKy1_${grade === 0 ? "ToanTruong" : `Khoi_${grade}`}.xlsx`;
      rows = summary.classes.map((c) => ({
        "Hạng HK1": c.rank,
        "Lớp": c.className,
        "Khối": c.grade,
        "GVCN": c.teacherName,
        "Phòng": c.room,
        "Sĩ Số": c.studentCount,
        "Điểm TB HK1": c.semester1Score?.toFixed(1) || c.avgScore?.toFixed(1) || "100.0",
        "Tổng Thưởng HK1": `+${c.totalPlus || 0}`,
        "Tổng Phạt HK1": `-${c.totalMinus || 0}`,
        "Xếp Loại HK1": c.gradeClassification || "Tốt",
      }));
    } else if (period === "semester2") {
      filename = `TongKet_ThiDua_HocKy2_${grade === 0 ? "ToanTruong" : `Khoi_${grade}`}.xlsx`;
      rows = summary.classes.map((c) => ({
        "Hạng HK2": c.rank,
        "Lớp": c.className,
        "Khối": c.grade,
        "GVCN": c.teacherName,
        "Điểm TB HK1": c.semester1Score?.toFixed(1) || "---",
        "Điểm TB HK2": c.semester2Score?.toFixed(1) || c.avgScore?.toFixed(1) || "100.0",
        "Biến Động Thứ Hạng": c.progressTrend === "up" ? "Tăng hạng ⬆" : c.progressTrend === "down" ? "Giảm hạng ⬇" : "Giữ hạng ⏺",
        "Tổng Thưởng HK2": `+${c.totalPlus || 0}`,
        "Tổng Phạt HK2": `-${c.totalMinus || 0}`,
        "Xếp Loại HK2": c.gradeClassification || "Tốt",
      }));
    } else {
      filename = `TongKet_ThiDua_CaNam_2024_2025_${grade === 0 ? "ToanTruong" : `Khoi_${grade}`}.xlsx`;
      rows = summary.classes.map((c) => ({
        "Hạng Cả Năm": c.rank,
        "Lớp": c.className,
        "Khối": c.grade,
        "GVCN": c.teacherName,
        "Sĩ Số": c.studentCount,
        "Điểm TB HK1": c.semester1Score?.toFixed(1) || "---",
        "Điểm TB HK2": c.semester2Score?.toFixed(1) || "---",
        "Điểm Cả Năm": c.yearScore?.toFixed(1) || c.avgScore?.toFixed(1) || "100.0",
        "Danh Hiệu Thi Đua Trao Tặng": c.yearTitle || "Tập Thể Lớp Tiên Tiến",
        "Xếp Loại": c.gradeClassification || "Xuất sắc",
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TongKetThiDua");
    XLSX.writeFile(wb, filename);
  };

  // Xuất báo cáo In Tổng hợp thi đua Toàn trường
  const handleExportRankingReport = () => {
    if (!summary?.classes) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const reportTitle =
      period === "week"
        ? `BẢNG TỔNG HỢP XẾP HẠNG THI ĐUA NỀ NẾP ${grade === 0 ? "TOÀN TRƯỜNG" : `KHỐI ${grade}`} - TUẦN ${week}`
        : period === "semester1"
        ? `BẢNG TỔNG KẾT THI ĐUA NỀ NẾP HỌC KỲ I (TUẦN 1 - 18) • ${grade === 0 ? "TOÀN TRƯỜNG" : `KHỐI ${grade}`}`
        : period === "semester2"
        ? `BẢNG TỔNG KẾT THI ĐUA NỀ NẾP HỌC KỲ II (TUẦN 19 - 35) • ${grade === 0 ? "TOÀN TRƯỜNG" : `KHỐI ${grade}`}`
        : `BẢNG TỔNG KẾT THI ĐUA NỀ NẾP CẢ NĂM HỌC 2024 - 2025 • ${grade === 0 ? "TOÀN TRƯỜNG" : `KHỐI ${grade}`}`;

    const subtitle =
      period === "week"
        ? `Tuần thứ ${week} • Năm học 2024 - 2025`
        : period === "semester1"
        ? `Học Kỳ I • Năm học 2024 - 2025 (18 tuần thi đua)`
        : period === "semester2"
        ? `Học Kỳ II • Năm học 2024 - 2025 (17 tuần thi đua)`
        : `Tổng Kết Toàn Diện 35 Tuần • Năm học 2024 - 2025`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Times New Roman', serif; padding: 25px; color: #111; }
          .header { text-align: center; margin-bottom: 20px; line-height: 1.4; }
          .title { font-size: 17px; font-weight: bold; text-transform: uppercase; margin-top: 10px; color: #1e3a8a; }
          .subtitle { font-size: 13px; font-style: italic; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12.5px; }
          th, td { border: 1px solid #333; padding: 6px 4px; text-align: center; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .left { text-align: left; }
          .gold { background-color: #fef9c3; font-weight: bold; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 13px; }
          .sig-box { text-align: center; width: 220px; }
          .insights { margin-top: 15px; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>TRƯỜNG THCS QUANG TRUNG - TP ĐÀ LẠT</div>
          <div style="font-weight: bold;">HỘI ĐỒNG THI ĐUA KHEN THƯỞNG</div>
          <div class="title">${reportTitle}</div>
          <div class="subtitle">${subtitle}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">Hạng</th>
              <th>Lớp</th>
              <th>Khối</th>
              <th>Giáo Viên Chủ Nhiệm</th>
              <th>Phòng</th>
              <th>Sĩ Số</th>
              ${
                period === "year"
                  ? `<th>ĐTB HK1</th><th>ĐTB HK2</th><th>ĐTB Cả Năm</th><th>Danh Hiệu Trao Tặng</th>`
                  : period === "semester2"
                  ? `<th>ĐTB HK1</th><th>ĐTB HK2</th><th>Biến Động</th><th>Tổng Thưởng</th><th>Tổng Phạt</th><th>Xếp Loại</th>`
                  : period === "semester1"
                  ? `<th>ĐTB HK1</th><th>Tổng Thưởng</th><th>Tổng Phạt</th><th>Xếp Loại</th>`
                  : `<th>Điểm Tuần</th><th>Thưởng (+)</th><th>Vi Phạm (-)</th><th>Xếp Loại</th>`
              }
            </tr>
          </thead>
          <tbody>
            ${summary.classes
              .map(
                (c) => `
              <tr class="${c.rank === 1 ? "gold" : ""}">
                <td><strong>${c.rank}</strong></td>
                <td class="left"><strong>${c.className}</strong></td>
                <td>Khối ${c.grade}</td>
                <td class="left">${c.teacherName}</td>
                <td>${c.room}</td>
                <td>${c.studentCount}</td>
                ${
                  period === "year"
                    ? `<td>${c.semester1Score?.toFixed(1) || "---"}</td><td>${c.semester2Score?.toFixed(1) || "---"}</td><td><strong>${c.yearScore?.toFixed(1) || c.avgScore?.toFixed(1) || "100.0"}</strong></td><td><strong>${c.yearTitle || "Tập Thể Lớp Tiên Tiến"}</strong></td>`
                    : period === "semester2"
                    ? `<td>${c.semester1Score?.toFixed(1) || "---"}</td><td><strong>${c.semester2Score?.toFixed(1) || c.avgScore?.toFixed(1) || "100.0"}</strong></td><td>${c.progressTrend === "up" ? "Tăng ⬆" : c.progressTrend === "down" ? "Giảm ⬇" : "Giữ ⏺"}</td><td style="color: #0d6e64;">+${c.totalPlus || 0}</td><td style="color: #b91c1c;">-${c.totalMinus || 0}</td><td>${c.gradeClassification || "Tốt"}</td>`
                    : period === "semester1"
                    ? `<td><strong>${c.semester1Score?.toFixed(1) || c.avgScore?.toFixed(1) || "100.0"}</strong></td><td style="color: #0d6e64;">+${c.totalPlus || 0}</td><td style="color: #b91c1c;">-${c.totalMinus || 0}</td><td>${c.gradeClassification || "Tốt"}</td>`
                    : `<td><strong>${c.avgScore?.toFixed(1) || "100.0"}</strong></td><td style="color: #0d6e64;">+${c.totalPlus || 0}</td><td style="color: #b91c1c;">-${c.totalMinus || 0}</td><td>${c.gradeClassification || "Tốt"}</td>`
                }
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="insights">
          <div><strong>* Tổng kết tình hình chung:</strong> ${summary.overallAssessment || ""}</div>
          <div style="margin-top: 4px;"><strong>* Điểm TB ${period === "year" ? "Cả Năm" : period === "semester1" ? "Học Kỳ I" : period === "semester2" ? "Học Kỳ II" : `Tuần ${week}`}:</strong> ${summary.periodAvgScore || 100} đ • <strong>Lớp Dẫn Đầu:</strong> ${summary.topClass || "---"}</div>
        </div>

        <div class="footer">
          <div class="sig-box">
            <div>NGƯỜI LẬP BẢNG</div>
            <div style="margin-top: 60px; font-weight: bold;">Tổng Phụ Trách Đội</div>
          </div>
          <div class="sig-box">
            <div>Đà Lạt, ngày .... tháng .... năm 2025</div>
            <div style="font-weight: bold;">QUẢN TRỊ TRƯỜNG / BAN GIÁM HIỆU</div>
            <div style="margin-top: 60px; font-weight: bold;">(Ký & đóng dấu)</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* File input ẩn cho import danh mục lớp */}
      <input
        type="file"
        ref={classFileInputRef}
        onChange={handleClassFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* File input ẩn cho import tài khoản GVCN */}
      <input
        type="file"
        ref={accFileInputRef}
        onChange={handleAccFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-6xl w-full h-[92vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* HEADER MODAL */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-xl">
              🏛️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Quản Trị Trường & Phân Quyền GVCN Toàn Trường
                </h2>
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
                  ADMIN TRƯỜNG
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                THCS Quang Trung • Quản lý danh mục lớp, cấp tài khoản GVCN hàng loạt & Giám sát thi đua
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer text-sm font-bold"
              title="Đóng cửa sổ"
            >
              ✕
            </button>
          </div>
        </div>

        {/* THANH ĐIỀU HƯỚNG TABS & LỌC KHỐI / TUẦN */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          {/* TABS CHÍNH */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab("ranking")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "ranking"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🏆</span>
              <span>Bảng Xếp Hạng Thi Đua</span>
            </button>

            <button
              onClick={() => setActiveTab("inspect")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "inspect"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🔍</span>
              <span>Thanh Tra & Chuyển Lớp</span>
            </button>

            <button
              onClick={() => setActiveTab("teachers")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "teachers"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>👩‍🏫</span>
              <span>Danh Mục Lớp Học</span>
            </button>

            {/* TAB MỚI: CẤP TÀI KHOẢN GVCN HÀNG LOẠT */}
            <button
              onClick={() => {
                setActiveTab("accounts");
                fetchTeacherAccounts();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "accounts"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <span>🔑</span>
              <span>Cấp Tài Khoản GVCN Hàng Loạt</span>
            </button>

            <button
              onClick={() => setActiveTab("cloud_sync")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "cloud_sync"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>☁️</span>
              <span>Đồng Bộ Cloud</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "security"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🛡️</span>
              <span>Phân Quyền</span>
            </button>

            <button
              onClick={() => setActiveTab("export")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "export"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🖨️</span>
              <span>Báo Cáo In A4</span>
            </button>
          </div>

          {/* LỌC KỲ / TUẦN / KHỐI & HÀNH ĐỘNG IN/XUẤT */}
          <div className="flex items-center space-x-2 text-xs font-semibold flex-wrap gap-y-1">
            {/* BỘ CHỌN MỐC THỜI GIAN THI ĐUA */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setPeriod("week")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                  period === "week"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📅</span>
                <span>Theo Tuần</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriod("semester1")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                  period === "semester1"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📘</span>
                <span>Học Kỳ I</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriod("semester2")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                  period === "semester2"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📙</span>
                <span>Học Kỳ II</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriod("year")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                  period === "year"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🏆</span>
                <span>Cả Năm</span>
              </button>
            </div>

            {/* CHỌN TUẦN KHI Ở CHẾ ĐỘ THEO TUẦN */}
            {period === "week" && (
              <div className="flex items-center space-x-1">
                <span className="text-slate-500">Tuần:</span>
                <select
                  value={week}
                  onChange={(e) => setWeek(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Tuần {w}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* BỘ LỌC KHỐI LỚP */}
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setGrade(0)}
                className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                  grade === 0 ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                Toàn Trường
              </button>
              {[6, 7, 8, 9].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                    grade === g ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Khối {g}
                </button>
              ))}
            </div>

            {/* NÚT XUẤT EXCEL & IN TRỰC TIẾP */}
            <button
              type="button"
              onClick={handleExportExcelPeriod}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-xs"
              title="Xuất bảng điểm thi đua ra file Excel"
            >
              <span>📥</span>
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportRankingReport}
              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-xs"
              title="In bảng tổng kết thi đua A4"
            >
              <span>🖨️</span>
              <span>In Báo Cáo</span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH (SCROLLABLE BODY) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60">

          {/* ========================================================= */}
          {/* TAB 1: BẢNG XẾP HẠNG & TỔNG KẾT THI ĐUA */}
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
                    {period === "year" ? "🏆" : "🥇"}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium truncate">
                      {period === "year"
                        ? "Cờ Dẫn Đầu Cả Năm"
                        : period === "semester1"
                        ? "Lớp Quán Quân HK I"
                        : period === "semester2"
                        ? "Lớp Quán Quân HK II"
                        : `Lớp Dẫn Đầu Tuần ${week}`}
                    </div>
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
                    <div className="text-xs text-slate-500 font-medium">
                      {period === "year" ? "Khen Thưởng Cả Năm" : period === "semester1" ? "Khen Thưởng HK I" : period === "semester2" ? "Khen Thưởng HK II" : "Khen Thưởng Tuần"}
                    </div>
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
                    <div className="text-xs text-slate-500 font-medium">
                      {period === "year" ? "Vi Phạm Cả Năm" : period === "semester1" ? "Vi Phạm HK I" : period === "semester2" ? "Vi Phạm HK II" : "Vi Phạm Tuần"}
                    </div>
                    <div className="text-xl font-bold text-rose-700">
                      -{summary?.classes.reduce((s, c) => s + (c.totalMinus || 0), 0) || 0} <span className="text-xs font-normal text-slate-500">Sự vụ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI THEO DÕI TÌNH HÌNH CHUNG & PHÂN TÍCH CHUYÊN SÂU CỦA BGH */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">📊</span>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                      Tổng Hợp Tình Hình Nề Nếp & Thi Đua Chung • {summary?.periodLabel || "Học Kỳ I"}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-500">Điểm TB Thi Đua:</span>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 font-black rounded-lg text-sm">
                      {summary?.periodAvgScore || 100} đ
                    </span>
                  </div>
                </div>

                {/* 3 CỘT PHÂN TÍCH: VI PHẠM PHỔ BIẾN - THÀNH TÍCH TIÊU BIỂU - PHÂN BỐ XẾP LOẠI */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* CỘT 1: TOP 5 VI PHẠM CẦN CHẤN CHỈNH */}
                  <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-900 flex items-center space-x-1.5">
                        <span>🚨</span>
                        <span>Top Vi Phạm Cần Chấn Chỉnh</span>
                      </span>
                      <span className="text-[11px] font-semibold text-rose-700">
                        {summary?.totalMinusEvents || 0} vụ
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {(summary?.commonViolations || []).map((v, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-800 font-semibold truncate pr-2">
                              {i + 1}. [{v.code}] {v.name}
                            </span>
                            <span className="font-bold text-rose-700 shrink-0">
                              {v.count} vụ (-{v.points}đ)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-rose-200/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(10, v.percent))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CỘT 2: TOP 5 THÀNH TÍCH TIÊU BIỂU */}
                  <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-900 flex items-center space-x-1.5">
                        <span>🌟</span>
                        <span>Top Khen Thưởng & Điểm Sáng</span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {summary?.totalPlusEvents || 0} lượt
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {(summary?.topAchievements || []).map((a, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-800 font-semibold truncate pr-2">
                              {i + 1}. [{a.code}] {a.name}
                            </span>
                            <span className="font-bold text-emerald-700 shrink-0">
                              {a.count} lượt (+{a.points}đ)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-emerald-200/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(10, a.percent))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CỘT 3: PHÂN BỐ XẾP LOẠI & ĐÁNH GIÁ BGH */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <span>📈</span>
                      <span>Phân Bố Xếp Loại Toàn Trường</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 bg-emerald-100/70 rounded-lg border border-emerald-200">
                        <div className="text-[10px] text-emerald-800 font-bold uppercase">Xuất Sắc</div>
                        <div className="text-base font-black text-emerald-900 mt-0.5">
                          {summary?.conductDistribution.excellent || 0} <span className="text-[10px] font-normal">lớp</span>
                        </div>
                      </div>

                      <div className="p-2 bg-blue-100/70 rounded-lg border border-blue-200">
                        <div className="text-[10px] text-blue-800 font-bold uppercase">Tốt</div>
                        <div className="text-base font-black text-blue-900 mt-0.5">
                          {summary?.conductDistribution.good || 0} <span className="text-[10px] font-normal">lớp</span>
                        </div>
                      </div>

                      <div className="p-2 bg-amber-100/70 rounded-lg border border-amber-200">
                        <div className="text-[10px] text-amber-800 font-bold uppercase">Khá</div>
                        <div className="text-base font-black text-amber-900 mt-0.5">
                          {summary?.conductDistribution.fair || 0} <span className="text-[10px] font-normal">lớp</span>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-200/80 rounded-lg border border-slate-300">
                        <div className="text-[10px] text-slate-700 font-bold uppercase">Cần Cố Gắng</div>
                        <div className="text-base font-black text-slate-800 mt-0.5">
                          {summary?.conductDistribution.poor || 0} <span className="text-[10px] font-normal">lớp</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 text-xs text-slate-700 leading-relaxed">
                      <div className="font-bold text-blue-900 text-[11px] mb-1">📝 Nhận xét khái quát BGH:</div>
                      {summary?.overallAssessment || "Nề nếp toàn trường duy trì tốt. Phong trào thi đua học tốt được giữ vững qua các tuần."}
                    </div>
                  </div>
                </div>
              </div>

              {/* BẢNG XẾP HẠNG CHI TIẾT TỪNG LỚP THEO MỐC THỜI GIAN */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-slate-800">
                      🏆 Bảng Xếp Hạng Thi Đua {grade === 0 ? "Toàn Trường" : `Khối ${grade}`}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                      {summary?.periodLabel || `Tuần ${week}`}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center space-x-3">
                    <span>Tổng số: <strong className="text-slate-800">{summary?.classCount || 0} Lớp</strong></span>
                    <span>•</span>
                    <span>Điểm TB: <strong className="text-blue-700">{summary?.periodAvgScore || 100} đ</strong></span>
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
                    <div>Đang tổng hợp điểm thi đua {summary?.periodLabel}...</div>
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
                          {period === "year" ? (
                            <>
                              <th className="p-3.5 text-center">ĐTB HK1</th>
                              <th className="p-3.5 text-center">ĐTB HK2</th>
                              <th className="p-3.5 text-center bg-amber-50 text-amber-900">ĐTB Cả Năm</th>
                              <th className="p-3.5 text-center">Danh Hiệu Trao Tặng</th>
                            </>
                          ) : period === "semester2" ? (
                            <>
                              <th className="p-3.5 text-center">ĐTB HK1</th>
                              <th className="p-3.5 text-center bg-indigo-50 text-indigo-900">ĐTB HK2</th>
                              <th className="p-3.5 text-center">Biến Động</th>
                              <th className="p-3.5 text-center">Thưởng (+)</th>
                              <th className="p-3.5 text-center">Phạt (-)</th>
                              <th className="p-3.5 text-center">Xếp Loại</th>
                            </>
                          ) : period === "semester1" ? (
                            <>
                              <th className="p-3.5 text-center bg-indigo-50 text-indigo-900">ĐTB HK1</th>
                              <th className="p-3.5 text-center">Tổng Thưởng</th>
                              <th className="p-3.5 text-center">Tổng Phạt</th>
                              <th className="p-3.5 text-center">Xếp Loại HK1</th>
                            </>
                          ) : (
                            <>
                              <th className="p-3.5 text-center bg-blue-50 text-blue-900">Điểm Tuần</th>
                              <th className="p-3.5 text-center">Thưởng (+)</th>
                              <th className="p-3.5 text-center">Phạt (-)</th>
                              <th className="p-3.5 text-center">Chuyên Cần</th>
                              <th className="p-3.5 text-center">Xếp Loại</th>
                            </>
                          )}
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

                              {/* CÁC CỘT ĐIỂM SỐ ĐỘNG THEO KỲ */}
                              {period === "year" ? (
                                <>
                                  <td className="p-3.5 text-center text-slate-700 font-semibold">
                                    {c.semester1Score?.toFixed(1) || "---"}
                                  </td>
                                  <td className="p-3.5 text-center text-slate-700 font-semibold">
                                    {c.semester2Score?.toFixed(1) || "---"}
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-black bg-amber-100 text-amber-900 border border-amber-200">
                                      {c.yearScore?.toFixed(1) || c.avgScore?.toFixed(1) || "100.0"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                      c.rank === 1
                                        ? "bg-amber-500 text-white shadow-xs"
                                        : (c.yearScore ?? 0) >= 97.5
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : "bg-blue-100 text-blue-800 border border-blue-300"
                                    }`}>
                                      {c.yearTitle || "Tập Thể Lớp Tiên Tiến"}
                                    </span>
                                  </td>
                                </>
                              ) : period === "semester2" ? (
                                <>
                                  <td className="p-3.5 text-center text-slate-600 font-semibold">
                                    {c.semester1Score?.toFixed(1) || "---"} (Hạng {c.semester1Rank || "---"})
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                                      {c.semester2Score?.toFixed(1) || c.avgScore?.toFixed(1) || "100.0"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-center text-xs font-bold">
                                    {c.progressTrend === "up" ? (
                                      <span className="text-emerald-600">⬆ Tăng hạng</span>
                                    ) : c.progressTrend === "down" ? (
                                      <span className="text-rose-600">⬇ Giảm hạng</span>
                                    ) : (
                                      <span className="text-slate-400">⏺ Giữ hạng</span>
                                    )}
                                  </td>
                                  <td className="p-3.5 text-center font-semibold text-emerald-600">
                                    +{c.totalPlus || 0}
                                  </td>
                                  <td className="p-3.5 text-center font-semibold text-rose-600">
                                    -{c.totalMinus || 0}
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                      {c.gradeClassification || "Tốt"}
                                    </span>
                                  </td>
                                </>
                              ) : period === "semester1" ? (
                                <>
                                  <td className="p-3.5 text-center">
                                    <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                                      {c.semester1Score?.toFixed(1) || c.avgScore?.toFixed(1) || "100.0"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-center font-semibold text-emerald-600">
                                    +{c.totalPlus || 0}
                                  </td>
                                  <td className="p-3.5 text-center font-semibold text-rose-600">
                                    -{c.totalMinus || 0}
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                      {c.gradeClassification || "Tốt"}
                                    </span>
                                  </td>
                                </>
                              ) : (
                                <>
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
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                      {c.gradeClassification || "Tốt"}
                                    </span>
                                  </td>
                                </>
                              )}

                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    onClick={() => {
                                      setInspectClassId(c.classId);
                                      setActiveTab("inspect");
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                                  >
                                    🔍 Xem Sổ
                                  </button>
                                  {onSelectClass && (
                                    <button
                                      onClick={() => {
                                        onSelectClass(c.classId);
                                        onClose();
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition cursor-pointer"
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
                      Quản trị trường có thể chọn bất kỳ lớp nào trong danh mục để kiểm tra nề nếp, điểm danh và các sự việc đã ghi nhận.
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
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
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
                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
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
          {/* TAB 3: TẠO DANH MỤC LỚP HỌC & NHẬP EXCEL */}
          {/* ========================================================= */}
          {activeTab === "teachers" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span>👩‍🏫</span> Danh Mục Lớp Học & Phân Công Giáo Viên Chủ Nhiệm
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quản trị trường có thể tạo lớp mới, xóa lớp demo, hoặc <strong>upload trực tiếp từ file Excel</strong> theo mẫu (STT | LỚP | GVCN).
                    </p>
                  </div>

                  {/* CÁC NÚT HÀNH ĐỘNG IMPORT EXCEL & TẠO LỚP */}
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    {/* Nút Tải Mẫu Excel */}
                    <button
                      onClick={handleDownloadExcelTemplate}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                      title="Tải mẫu Excel 3 cột: STT | Lớp | GVCN"
                    >
                      <span>📥</span> Tải File Mẫu Excel
                    </button>

                    {/* Nút Upload File Excel */}
                    <button
                      onClick={() => classFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📤</span> Nhập Từ File Excel
                    </button>

                    {/* Nút Tạo Lớp Mới Thủ Công */}
                    <button
                      onClick={() => setShowAddClassModal(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>➕</span> Tạo Lớp Mới
                    </button>

                    {/* Nút Xóa Lớp Demo */}
                    <button
                      onClick={handleClearAllClasses}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                      title="Xóa sạch các lớp demo cũ để nạp mới"
                    >
                      <span>🗑️</span> Xóa Lớp Demo
                    </button>

                    {/* Lọc Khối */}
                    <select
                      value={teacherFilterGrade}
                      onChange={(e) => setTeacherFilterGrade(Number(e.target.value))}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none cursor-pointer"
                    >
                      <option value={0}>Tất Cả Khối</option>
                      <option value={6}>Khối 6</option>
                      <option value={7}>Khối 7</option>
                      <option value={8}>Khối 8</option>
                      <option value={9}>Khối 9</option>
                    </select>

                    {/* Ô Tìm kiếm */}
                    <input
                      type="text"
                      placeholder="Tìm GV, lớp..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 w-32 sm:w-40"
                    />
                  </div>
                </div>

                {filteredTeacherClasses.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-3">
                    <div className="text-3xl">📭</div>
                    <div className="text-sm font-semibold">Chưa có lớp học nào trong danh mục.</div>
                    <div className="text-xs text-slate-400">
                      Hãy bấm <strong>"📤 Nhập Từ File Excel"</strong> để nạp danh sách lớp hoặc bấm <strong>"➕ Tạo Lớp Mới"</strong>.
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={handleResetDemoClasses}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        🔄 Khôi Phục Danh Mục 32 Lớp Mẫu Ban Đầu
                      </button>
                    </div>
                  </div>
                ) : (
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
                          <th className="p-3.5 text-center">Thao Tác</th>
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
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => handleStartEdit(c)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                                  title="Sửa phân công GVCN"
                                >
                                  ✏️ Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteClass(c)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition cursor-pointer border border-rose-200 flex items-center gap-1"
                                  title="Xóa lớp học này"
                                >
                                  <span>🗑️</span>
                                  <span>Xóa</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* MODAL XEM TRƯỚC & XÁC NHẬN IMPORT EXCEL LỚP HỌC */}
              {showImportExcelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[85vh]">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>📤</span> Xác Nhận Nhập Danh Sách Lớp Từ File Excel
                      </h4>
                      <button
                        onClick={() => setShowImportExcelModal(false)}
                        className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="my-4 text-xs text-slate-600">
                      Đã đọc được <strong>{importedPreviewClasses.length} lớp học</strong> từ file Excel theo mẫu chuẩn. Vui lòng chọn cách thức lưu:
                    </div>

                    {/* TÙY CHỌN GHI ĐÈ HOẶC BỔ SUNG */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 mb-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importOverwrite}
                          onChange={() => setImportOverwrite(true)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>🗑️ Ghi đè / Xóa sạch lớp demo cũ & Thay thế toàn bộ bằng danh sách Excel ({importedPreviewClasses.length} lớp)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="importMode"
                          checked={!importOverwrite}
                          onChange={() => setImportOverwrite(false)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>➕ Bổ sung / Cập nhật vào danh mục lớp hiện có</span>
                      </label>
                    </div>

                    {/* BẢNG XEM TRƯỚC */}
                    <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl mb-4">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                          <tr>
                            <th className="p-2.5 w-10 text-center">STT</th>
                            <th className="p-2.5">Lớp Học</th>
                            <th className="p-2.5">Khối</th>
                            <th className="p-2.5">Giáo Viên Chủ Nhiệm</th>
                            <th className="p-2.5">Phòng Học</th>
                            <th className="p-2.5">Số Điện Thoại</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {importedPreviewClasses.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-blue-900">{item.className}</td>
                              <td className="p-2.5 font-semibold text-slate-700">Khối {item.grade}</td>
                              <td className="p-2.5 font-bold text-slate-900">{item.teacherName}</td>
                              <td className="p-2.5 text-slate-600">{item.room}</td>
                              <td className="p-2.5 text-slate-600 font-mono">{item.teacherPhone || "---"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowImportExcelModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        Hủy Bỏ
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImportExcel}
                        disabled={importingFile}
                        className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        {importingFile ? "Đang lưu..." : `✓ Xác Nhận Lưu ${importedPreviewClasses.length} Lớp`}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL TẠO LỚP HỌC MỚI THỦ CÔNG */}
              {showAddClassModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
                    <h4 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                      <span>➕</span> Tạo Lớp Học Mới & Phân Công GVCN
                    </h4>

                    <form onSubmit={handleCreateClass} className="space-y-3.5 mt-4 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Tên Lớp (Ví dụ: 8A9)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: 8A9 hoặc Lớp 8A9"
                            value={newClassName}
                            onChange={(e) => {
                              setNewClassName(e.target.value);
                              if (!newClassId) {
                                setNewClassId(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
                              }
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Khối
                          </label>
                          <select
                            value={newClassGrade}
                            onChange={(e) => setNewClassGrade(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold bg-white cursor-pointer"
                          >
                            <option value={6}>Khối 6</option>
                            <option value={7}>Khối 7</option>
                            <option value={8}>Khối 8</option>
                            <option value={9}>Khối 9</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Họ và Tên Giáo Viên Chủ Nhiệm
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Cô Trần Thị Mai"
                          value={newClassTeacher}
                          onChange={(e) => setNewClassTeacher(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Số Điện Thoại GVCN
                          </label>
                          <input
                            type="text"
                            placeholder="0912.xxx.xxx"
                            value={newClassPhone}
                            onChange={(e) => setNewClassPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Phòng Học
                          </label>
                          <input
                            type="text"
                            placeholder="Phòng 209"
                            value={newClassRoom}
                            onChange={(e) => setNewClassRoom(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Sĩ Số Lớp (Học sinh)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={newClassStudents}
                          onChange={(e) => setNewClassStudents(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-xs font-bold"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowAddClassModal(false)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={addingClass}
                          className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                        >
                          {addingClass ? "Đang tạo..." : "✓ Tạo Lớp Học"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL SỬA PHÂN CÔNG GVCN */}
              {editingClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
                    <h4 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                      <span>✏️</span> Cập Nhật Phân Công GVCN: {editingClass.className}
                    </h4>

                    <form onSubmit={handleSaveTeacher} className="space-y-3.5 mt-4 text-sm">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Họ và Tên Giáo Viên Chủ Nhiệm
                        </label>
                        <input
                          type="text"
                          required
                          value={teacherName}
                          onChange={(e) => setTeacherName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Số Điện Thoại
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
                            value={room}
                            onChange={(e) => setRoom(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email GVCN
                        </label>
                        <input
                          type="email"
                          value={teacherEmail}
                          onChange={(e) => setTeacherEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setEditingClass(null)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={savingTeacher}
                          className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
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
          {/* TAB 4: CẤP TÀI KHOẢN QUẢN TRỊ LỚP CHO GVCN HÀNG LOẠT (MỚI) */}
          {/* ========================================================= */}
          {activeTab === "accounts" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                      <span>🔑</span> Cấp Tài Khoản Quản Trị Lớp Cho Giáo Viên Chủ Nhiệm (Hàng Loạt)
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Tự động sinh tài khoản cho toàn bộ GVCN, cấp mật khẩu khởi tạo, đổi mật khẩu và xuất Excel bàn giao cho các thầy cô.
                    </p>
                  </div>

                  {/* CÁC NÚT THAO TÁC TÀI KHOẢN HÀNG LOẠT */}
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    {/* Nút Sinh Tài Khoản Hàng Loạt */}
                    <button
                      onClick={() => setShowBatchGenModal(true)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>⚡</span> Sinh Tài Khoản Hàng Loạt
                    </button>

                    {/* Nút Xuất Excel Tài Khoản */}
                    <button
                      onClick={handleExportAccountsToExcel}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      title="Xuất file Excel danh sách tài khoản & mật khẩu để gửi GVCN"
                    >
                      <span>📥</span> Xuất Excel Bàn Giao
                    </button>

                    {/* Nút Nhập File Excel Tài Khoản */}
                    <button
                      onClick={() => accFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      title="Nhập danh sách tài khoản từ file Excel nếu đã có sẵn"
                    >
                      <span>📤</span> Nhập Từ Excel
                    </button>

                    {/* Nút Đặt Lại Mật Khẩu Chung */}
                    <button
                      onClick={() => setShowResetAllPassModal(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🔒</span> Đặt Lại Mật Khẩu Chung
                    </button>

                    {/* Lọc Khối */}
                    <select
                      value={accountFilterGrade}
                      onChange={(e) => setAccountFilterGrade(Number(e.target.value))}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none cursor-pointer"
                    >
                      <option value={0}>Tất Cả Khối</option>
                      <option value={6}>Khối 6</option>
                      <option value={7}>Khối 7</option>
                      <option value={8}>Khối 8</option>
                      <option value={9}>Khối 9</option>
                    </select>

                    {/* Ô Tìm kiếm */}
                    <input
                      type="text"
                      placeholder="Tìm tài khoản, GV..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-amber-500 w-32 sm:w-40"
                    />
                  </div>
                </div>

                {loadingAccounts ? (
                  <div className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
                    <div>Đang tải danh sách tài khoản GVCN...</div>
                  </div>
                ) : filteredTeacherAccounts.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-3">
                    <div className="text-3xl">📭</div>
                    <div className="text-sm font-semibold">Chưa có tài khoản nào được sinh.</div>
                    <div className="text-xs text-slate-400">
                      Bấm nút <strong>"⚡ Sinh Tài Khoản Hàng Loạt"</strong> để tự động cấp tài khoản và mật khẩu cho toàn bộ GVCN.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="p-3 text-center w-12">STT</th>
                          <th className="p-3">Mã & Lớp Học</th>
                          <th className="p-3">Giáo Viên Chủ Nhiệm</th>
                          <th className="p-3">Tên Đăng Nhập (Username)</th>
                          <th className="p-3">Mật Khẩu Khởi Tạo</th>
                          <th className="p-3">Số Điện Thoại / Email</th>
                          <th className="p-3 text-center">Trạng Thái</th>
                          <th className="p-3 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {filteredTeacherAccounts.map((acc, idx) => {
                          const showPass = showPasswordMap[acc.classId] || false;

                          return (
                            <tr key={acc.classId} className="hover:bg-amber-50/40 transition">
                              <td className="p-3 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                              <td className="p-3">
                                <div className="font-bold text-blue-900">{acc.className}</div>
                                <div className="text-xs text-slate-500 font-mono">Mã: {acc.classId} • Khối {acc.grade}</div>
                              </td>
                              <td className="p-3 font-semibold text-slate-900">{acc.teacherName}</td>
                              <td className="p-3 font-mono font-bold text-amber-900 bg-amber-50/50 px-2 py-1 rounded">
                                {acc.username}
                              </td>
                              <td className="p-3 font-mono text-xs">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded font-bold ${showPass ? "bg-slate-100 text-slate-900" : "bg-slate-200 text-slate-500 tracking-widest"}`}>
                                    {showPass ? acc.password : "••••••••"}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setShowPasswordMap((prev) => ({
                                        ...prev,
                                        [acc.classId]: !prev[acc.classId],
                                      }))
                                    }
                                    className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                                    title={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                  >
                                    {showPass ? "🙈" : "👁️"}
                                  </button>
                                </div>
                              </td>
                              <td className="p-3 text-xs text-slate-600">
                                <div>{acc.phone ? <span className="font-mono">{acc.phone}</span> : "---"}</div>
                                <div className="text-[11px] text-slate-400">{acc.email}</div>
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    acc.status === "active"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {acc.status === "active" ? "✓ Đang dùng" : "🔒 Đã khóa"}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    onClick={() => handleCopyAccountInfo(acc)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                                    title="Sao chép thông tin tài khoản để gửi Zalo/SMS"
                                  >
                                    📋 Gửi
                                  </button>
                                  <button
                                    onClick={() => handleStartEditAccount(acc)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                                    title="Sửa / Đổi mật khẩu GVCN này"
                                  >
                                    ✏️ Đổi MK
                                  </button>
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

              {/* MODAL SINH TÀI KHOẢN HÀNG LOẠT */}
              {showBatchGenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
                    <h4 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                      <span>⚡</span> Cấu Hình Sinh Tài Khoản Hàng Loạt Cho GVCN
                    </h4>

                    <div className="space-y-4 mt-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">
                          1. Quy tắc đặt Tên Đăng Nhập (Username):
                        </label>
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                            <input
                              type="radio"
                              name="genFormat"
                              value="prefix_class"
                              checked={genFormat === "prefix_class"}
                              onChange={() => setGenFormat("prefix_class")}
                            />
                            <span>Chuẩn hóa theo mã lớp: <code>gvcn.[malop]</code> (VD: <code>gvcn.8a6</code>, <code>gvcn.6a1</code>)</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                            <input
                              type="radio"
                              name="genFormat"
                              value="email"
                              checked={genFormat === "email"}
                              onChange={() => setGenFormat("email")}
                            />
                            <span>Theo địa chỉ Email của GVCN</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                            <input
                              type="radio"
                              name="genFormat"
                              value="phone"
                              checked={genFormat === "phone"}
                              onChange={() => setGenFormat("phone")}
                            />
                            <span>Theo Số Điện Thoại của GVCN</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">
                          2. Mật khẩu khởi tạo:
                        </label>
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                            <input
                              type="radio"
                              name="genPassMode"
                              checked={!genRandomPass}
                              onChange={() => setGenRandomPass(false)}
                            />
                            <span>Dùng mật khẩu chung:</span>
                          </label>
                          {!genRandomPass && (
                            <input
                              type="text"
                              value={genDefaultPass}
                              onChange={(e) => setGenDefaultPass(e.target.value)}
                              placeholder="Nhập mật khẩu mặc định (VD: Antam2025@)"
                              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none font-bold text-blue-900 bg-white"
                            />
                          )}

                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 pt-1">
                            <input
                              type="radio"
                              name="genPassMode"
                              checked={genRandomPass}
                              onChange={() => setGenRandomPass(true)}
                            />
                            <span>Sinh mật khẩu riêng theo lớp (VD: <code>Gvcn@8A6!</code>, <code>Gvcn@6A1!</code>)</span>
                          </label>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 text-blue-900 rounded-xl text-[11px] leading-relaxed border border-blue-200">
                        ℹ️ Hệ thống sẽ sinh tài khoản cho tất cả <strong>{summary?.classes.length || 32} lớp</strong> hiện có trong danh mục trường.
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowBatchGenModal(false)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleBatchGenerateAccounts}
                          disabled={generatingAccounts}
                          className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                          {generatingAccounts ? "Đang xử lý..." : "⚡ Xác Nhận Sinh Hàng Loạt"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL SỬA TÀI KHOẢN ĐƠN LẺ */}
              {editingAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
                    <h4 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                      <span>✏️</span> Cập Nhật Tài Khoản GVCN {editingAccount.className}
                    </h4>

                    <form onSubmit={handleSaveAccount} className="space-y-3.5 mt-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Giáo viên chủ nhiệm</label>
                        <div className="px-3 py-2 bg-slate-100 rounded-lg font-bold text-slate-800">
                          {editingAccount.teacherName} (Lớp {editingAccount.className})
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Tên Đăng Nhập (Username)</label>
                        <input
                          type="text"
                          required
                          value={editAccUsername}
                          onChange={(e) => setEditAccUsername(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-amber-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mật Khẩu</label>
                        <input
                          type="text"
                          required
                          value={editAccPassword}
                          onChange={(e) => setEditAccPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-amber-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Trạng Thái Tài Khoản</label>
                        <select
                          value={editAccStatus}
                          onChange={(e) => setEditAccStatus(e.target.value as "active" | "locked")}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-bold bg-white cursor-pointer"
                        >
                          <option value="active">✓ Đang hoạt động (Cho phép đăng nhập)</option>
                          <option value="locked">🔒 Khóa tài khoản (Tạm dừng truy cập)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setEditingAccount(null)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={savingAccount}
                          className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                        >
                          {savingAccount ? "Đang lưu..." : "✓ Lưu Cập Nhật"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL ĐẶT LẠI MẬT KHẨU CHUNG TOÀN TRƯỜNG */}
              {showResetAllPassModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
                    <h4 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                      <span>🔒</span> Đặt Lại Mật Khẩu Chung Cho Toàn Bộ GVCN
                    </h4>

                    <form onSubmit={handleResetAllPasswords} className="space-y-4 mt-4 text-xs">
                      <p className="text-slate-600">
                        Tất cả các tài khoản GVCN sẽ được gán mật khẩu mới này. Bạn có thể xuất file Excel sau khi đổi để gửi cho các thầy cô.
                      </p>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mật khẩu mới toàn trường:</label>
                        <input
                          type="text"
                          required
                          value={bulkNewPassword}
                          onChange={(e) => setBulkNewPassword(e.target.value)}
                          placeholder="Nhập mật khẩu mới (VD: Antam2025@)"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-amber-500 font-mono font-bold text-sm"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowResetAllPassModal(false)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={resettingBulkPass}
                          className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                        >
                          {resettingBulkPass ? "Đang đổi..." : "✓ Xác Nhận Đặt Lại"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL IMPORT TÀI KHOẢN GVCN TỪ EXCEL */}
              {showImportAccModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[85vh]">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>📤</span> Xác Nhận Nhập Tài Khoản GVCN Từ Excel
                      </h4>
                      <button
                        onClick={() => setShowImportAccModal(false)}
                        className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="my-4 text-xs text-slate-600">
                      Đã đọc được <strong>{importedPreviewAccounts.length} tài khoản GVCN</strong> từ file Excel.
                    </div>

                    {/* BẢNG XEM TRƯỚC */}
                    <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl mb-4">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                          <tr>
                            <th className="p-2.5 w-10 text-center">STT</th>
                            <th className="p-2.5">Lớp</th>
                            <th className="p-2.5">GVCN</th>
                            <th className="p-2.5">Tên Đăng Nhập</th>
                            <th className="p-2.5">Mật Khẩu</th>
                            <th className="p-2.5">Số ĐT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {importedPreviewAccounts.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-blue-900">{item.className}</td>
                              <td className="p-2.5 font-bold text-slate-900">{item.teacherName}</td>
                              <td className="p-2.5 font-mono text-amber-900 font-bold">{item.username}</td>
                              <td className="p-2.5 font-mono text-slate-700">{item.password}</td>
                              <td className="p-2.5 text-slate-600 font-mono">{item.phone || "---"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowImportAccModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        Hủy Bỏ
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImportAccounts}
                        disabled={importingAccFile}
                        className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        {importingAccFile ? "Đang lưu..." : `✓ Xác Nhận Nhập ${importedPreviewAccounts.length} Tài Khoản`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: ĐỒNG BỘ CLOUD FIREBASE */}
          {/* ========================================================= */}
          {activeTab === "cloud_sync" && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span>☁️</span> Trạng Thái Đồng Bộ Firebase Cloud Toàn Trường
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dữ liệu 32 lớp học, sổ nề nếp và tài khoản được đồng bộ thời gian thực 2 chiều giữa Local & Cloud Firestore.
                    </p>
                  </div>

                  <button
                    onClick={handleTriggerCloudSync}
                    disabled={syncingCloud}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>{syncingCloud ? "⏳" : "🔄"}</span>
                    <span>{syncingCloud ? "Đang Đồng Bộ..." : "Kích Hoạt Đồng Bộ Ngay"}</span>
                  </button>
                </div>

                {cloudMessage && (
                  <div
                    className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                      cloudMessage.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    <span>{cloudMessage.type === "success" ? "✓" : "⚠️"}</span>
                    <span>{cloudMessage.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500">Trạng Thái Kết Nối</div>
                    <div className="text-base font-bold text-emerald-700 mt-1 flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>{cloudStatus?.connected ? "Đang Kết Nối" : "Sẵn Sàng Local/Cloud"}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500">Lớp Đã Đồng Bộ</div>
                    <div className="text-xl font-bold text-blue-900 mt-1">
                      {cloudStatus?.totalClassesSynced || summary?.classCount || 32} / 32 Lớp
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500">Sự Việc & Nề Nếp Synced</div>
                    <div className="text-xl font-bold text-indigo-700 mt-1">
                      {(cloudStatus?.totalEventsSynced || 0) + (cloudStatus?.totalConductLogsSynced || 0)} Bản ghi
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500">Độ Trễ Phản Hồi</div>
                    <div className="text-xl font-bold text-slate-800 mt-1">
                      {cloudStatus?.latencyMs || 24} ms
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: MA TRẬN BẢO MẬT & PHÂN QUYỀN (SECURITY MATRIX) */}
          {/* ========================================================= */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="pb-4 border-b border-slate-200">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>🛡️</span> Ma Trận Phân Quyền 5 Cấp Độ (Toàn Trường)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mô hình bảo mật phân quyền đa lớp: Quản Trị Trường, Giáo Viên Chủ Nhiệm, Lớp Trưởng, Tổ Trưởng và Học Sinh.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 uppercase">Cấp 1 • Admin Trường</span>
                      <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Toàn Quyền</span>
                    </div>
                    <p className="text-xs text-slate-600">Toàn quyền tạo/xóa lớp, cấp tài khoản GVCN hàng loạt, đồng bộ Cloud và giám sát 32 lớp.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 uppercase">Cấp 2 • GVCN Lớp</span>
                      <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">Quản Trị Lớp</span>
                    </div>
                    <p className="text-xs text-slate-600">Quản lý chuyên cần, chấm điểm nề nếp, duyệt sự việc thi đua và xem hồ sơ học sinh của lớp mình.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 uppercase">Cấp 3 • Lớp Trưởng / Cờ Đỏ</span>
                      <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">Ghi Nhận Thi Đua</span>
                    </div>
                    <p className="text-xs text-slate-600">Ghi nhận sự việc vi phạm/khen thưởng theo 40 tiêu chí nề nếp trình GVCN phê duyệt.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 uppercase">Cấp 4 • Tổ Trưởng (Tổ 1-4)</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">Theo Dõi Tổ</span>
                    </div>
                    <p className="text-xs text-slate-600">Đánh giá nề nếp hàng tuần của các thành viên trong tổ và báo cáo sự việc cho Lớp trưởng/GVCN.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase">Cấp 5 • Học Sinh / Phụ Huynh</span>
                      <span className="text-[10px] bg-slate-600 text-white px-2 py-0.5 rounded-full font-bold">Xem Hồ Sơ & In Phiếu</span>
                    </div>
                    <p className="text-xs text-slate-600">Tra cứu hồ sơ cá nhân, xem điểm rèn luyện, theo dõi bảng nề nếp tổ và in phiếu rèn luyện A4.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 7: XUẤT BÁO CÁO & IN ẤN */}
          {/* ========================================================= */}
          {activeTab === "export" && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="pb-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span>🖨️</span> Xuất Báo Cáo Xếp Hạng & Sổ Nề Nếp Chuẩn Khổ A4
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Định dạng chuẩn in trình BGH, lưu hồ sơ Đoàn Đội hoặc gửi thông báo toàn trường.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleExportExcelPeriod}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
                    >
                      <span>📥</span>
                      <span>Xuất File Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportRankingReport}
                      className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
                    >
                      <span>🖨️</span>
                      <span>In Báo Cáo {summary?.periodLabel || `Tuần ${week}`} (Khổ A4)</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed">
                  <div className="font-bold text-slate-800 text-sm">Hướng dẫn in ấn & lưu trữ:</div>
                  <div>• Bảng in đã được căn chỉnh lề chuẩn 20mm, tương thích máy in Laser và xuất file PDF sắc nét.</div>
                  <div>• Bao gồm đầy đủ quốc hiệu, tiêu ngữ, chữ ký Tổng Phụ Trách Đội và xác nhận của Ban Giám Hiệu.</div>
                  <div>• Hỗ trợ in theo từng khối riêng biệt (Khối 6, 7, 8, 9) hoặc toàn trường 32 lớp.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
