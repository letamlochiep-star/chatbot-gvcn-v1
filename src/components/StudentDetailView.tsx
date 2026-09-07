"use client";

import React, { useState, useEffect } from "react";
import {
  StudentRecord,
  StudentExtensionData,
  StudentMessage,
  StudentAttendanceSummary,
  ConductLog,
} from "@/lib/types";
import { groupStudentFields } from "@/lib/schema";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getStudentTeam } from "@/lib/competitionCatalog";

interface Props {
  student: StudentRecord;
  onClose?: () => void;
  isModal?: boolean;
  isTeacher?: boolean;
  onStudentUpdate?: (updatedStudent: StudentRecord) => void;
}

export function StudentDetailView({
  student,
  onClose,
  isModal = false,
  isTeacher = true,
  onStudentUpdate,
}: Props) {
  const groups = groupStudentFields(student);

  // Dữ liệu mở rộng
  const [ext, setExt] = useState<StudentExtensionData>(
    student.extension || { stt: student.stt }
  );

  // State Chuyên cần & Nề nếp
  const [attendanceSummary, setAttendanceSummary] = useState<StudentAttendanceSummary | null>(null);
  const [conductLogs, setConductLogs] = useState<ConductLog[]>([]);
  const [conductScore, setConductScore] = useState<number>(100);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // State Tin Nhắn Trao Đổi Với Học Sinh
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // State Form Giáo viên
  const [academic, setAcademic] = useState(
    ext.academicLastYear === "Tốt" ? "Giỏi" : ext.academicLastYear || "Khá"
  );
  const [conduct, setConduct] = useState(ext.conductLastYear || "Tốt");
  const [strengths, setStrengths] = useState(ext.strengths || "");
  const [weaknesses, setWeaknesses] = useState(ext.weaknesses || "");
  const [teacherProgressNote, setTeacherProgressNote] = useState(
    ext.teacherProgressNote || ""
  );
  const [teacherSpecialNote, setTeacherSpecialNote] = useState(
    ext.teacherSpecialNote || ""
  );

  const [savingExt, setSavingExt] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // State AI Analysis
  const [aiReport, setAiReport] = useState<string>(ext.aiAnalysisReport || "");
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState("");

  // Tự động tải thông tin mở rộng mới nhất từ cơ sở dữ liệu khi mở hồ sơ & Auto-Polling 3s
  useEffect(() => {
    if (!student.stt) return;

    let isMounted = true;
    const fetchLatestExtension = async () => {
      try {
        const res = await fetch(`/api/student/extension?stt=${encodeURIComponent(student.stt)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.extension && isMounted) {
            const e: StudentExtensionData = data.extension;
            setExt(e);
            student.extension = e;

            if (e.academicLastYear) {
              setAcademic(e.academicLastYear === "Tốt" ? "Giỏi" : e.academicLastYear);
            }
            if (e.conductLastYear) setConduct(e.conductLastYear);
            if (e.strengths !== undefined) setStrengths(e.strengths || "");
            if (e.weaknesses !== undefined) setWeaknesses(e.weaknesses || "");
            if (e.teacherProgressNote !== undefined) setTeacherProgressNote(e.teacherProgressNote || "");
            if (e.teacherSpecialNote !== undefined) setTeacherSpecialNote(e.teacherSpecialNote || "");
            if (e.aiAnalysisReport !== undefined) setAiReport(e.aiAnalysisReport || "");
          }
        }
      } catch (err) {
        console.error("Lỗi tải thông tin mở rộng của học sinh:", err);
      }
    };

    fetchLatestExtension();

    // Auto-Polling 3s đồng bộ tức thì nếu học sinh cập nhật sở thích/ước mơ bên cổng học sinh
    const extInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchLatestExtension();
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(extInterval);
    };
  }, [student.stt]);

  // Tải danh sách tin nhắn của học sinh này
  useEffect(() => {
    if (!student.stt) return;

    const loadStudentMessages = async (showSpinner = false) => {
      if (showSpinner) setLoadingMessages(true);
      try {
        const res = await fetch(`/api/messages?stt=${student.stt}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.messages) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error("Lỗi tải tin nhắn của học sinh:", err);
      } finally {
        if (showSpinner) setLoadingMessages(false);
      }
    };

    loadStudentMessages(true);

    // 1. Lắng nghe tin nhắn thời gian thực qua Firebase (nếu có)
    let unsub: (() => void) | undefined;
    const db = getFirebaseDb();
    if (db && student.stt) {
      try {
        const cleanStt = student.stt.trim();
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
        // Fallback
      }
    }

    // 2. Auto-Polling 3s thông minh
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadStudentMessages(false);
    }, 3000);

    return () => {
      if (unsub) unsub();
      clearInterval(interval);
    };
  }, [student.stt]);

  // Tải tổng hợp chuyên cần và sổ nề nếp của học sinh này
  useEffect(() => {
    if (!student.stt) return;

    const loadStudentConductAndAttendance = async () => {
      setLoadingSummary(true);
      try {
        // 1. Tải chuyên cần
        const attRes = await fetch("/api/attendance?summary=true");
        if (attRes.ok) {
          const attData = await attRes.json();
          if (attData.ok && attData.summary && attData.summary[student.stt]) {
            setAttendanceSummary(attData.summary[student.stt]);
          } else {
            setAttendanceSummary(null);
          }
        }

        // 2. Tải nề nếp
        const condRes = await fetch(`/api/conduct?stt=${encodeURIComponent(student.stt)}`);
        if (condRes.ok) {
          const condData = await condRes.json();
          if (condData.ok) {
            setConductLogs(condData.logs || []);
            setConductScore(condData.totalScore !== undefined ? condData.totalScore : 100);
          }
        }
      } catch (err) {
        console.error("Lỗi tải chuyên cần & nề nếp:", err);
      } finally {
        setLoadingSummary(false);
      }
    };

    loadStudentConductAndAttendance();
  }, [student.stt]);

  // Gửi tin nhắn phản hồi trực tiếp từ hồ sơ học sinh
  const handleSendReplyFromProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || sendingReply) return;
    setSendingReply(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stt: student.stt,
          studentName: student.hoVaTen,
          content: replyContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok && data.data) {
        setMessages((prev) => [...prev, data.data]);
        setReplyContent("");
      } else {
        alert(data.message || "Không thể gửi phản hồi.");
      }
    } catch {
      alert("Lỗi kết nối khi gửi phản hồi.");
    } finally {
      setSendingReply(false);
    }
  };

  // Đánh dấu tin nhắn đã đọc
  const handleMarkMessageRead = async (id: string) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          messageId: id,
          newStatus: "read",
        }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "read" } : m))
      );
    } catch {}
  };

  // Lưu đánh giá sư phạm
  const handleSaveTeacherNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExt(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/student/extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stt: student.stt,
          academicLastYear: academic,
          conductLastYear: conduct,
          strengths,
          weaknesses,
          teacherProgressNote,
          teacherSpecialNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok && data.extension) {
        const newExt = data.extension;
        setExt(newExt);
        student.extension = newExt;
        if (onStudentUpdate) {
          onStudentUpdate({
            ...student,
            extension: newExt,
          });
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.message || "Không thể lưu đánh giá.");
      }
    } catch {
      alert("Lỗi kết nối khi lưu đánh giá sư phạm.");
    } finally {
      setSavingExt(false);
    }
  };

  // Chạy phân tích AI Gemini Flash
  const handleRunAiAnalysis = async () => {
    setAnalyzingAi(true);
    setAiError("");

    try {
      const res = await fetch("/api/ai/analyze-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stt: student.stt }),
      });

      const data = await res.json();
      if (res.ok && data.ok && data.report) {
        setAiReport(data.report);
        const updatedExt = { ...ext, aiAnalysisReport: data.report };
        setExt(updatedExt);
        student.extension = updatedExt;
        if (onStudentUpdate) {
          onStudentUpdate({
            ...student,
            extension: updatedExt,
          });
        }
      } else {
        setAiError(data.message || "Không thể tạo báo cáo phân tích AI.");
      }
    } catch {
      setAiError("Lỗi kết nối đến dịch vụ AI Gemini.");
    } finally {
      setAnalyzingAi(false);
    }
  };

  const content = (
    <div className="space-y-3.5 text-left">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-primary to-primary-hover text-white p-3.5 sm:p-4 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="min-w-0 pr-2">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-blue-100 font-bold truncate">
            Hồ sơ học sinh lớp 8A6
          </div>
          <div className="text-base sm:text-xl font-bold mt-0.5 truncate">{student.hoVaTen}</div>
          <div className="text-[11px] text-blue-100 mt-1 flex flex-wrap gap-1.5">
            <span className="bg-white/20 px-1.5 py-0.5 rounded">STT: {student.stt}</span>
            <span className="bg-amber-300 text-amber-950 px-1.5 py-0.5 rounded font-bold">
              Tổ {getStudentTeam(student.stt)}
            </span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded">Sinh: {student.ngaySinh}</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded">GT: {student.gioiTinh}</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white bg-white/15 hover:bg-white/25 rounded-xl p-2 transition text-xs sm:text-sm font-bold cursor-pointer shrink-0"
            title="Đóng"
          >
            ✕ Đóng
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="max-h-[70vh] sm:max-h-[72vh] overflow-y-auto pr-1 space-y-3.5">
        {/* KHỐI TỔNG HỢP CHUYÊN CẦN & ĐIỂM RÈN LUYỆN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Thẻ Chuyên cần */}
          <div className="bg-[#f7fbfd] border border-[#cde2f2] rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-primary-dark">
                <span>📋</span> Chuyên Cần Đi Học
              </div>
              {attendanceSummary ? (
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                    attendanceSummary.attendanceRate >= 95
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : attendanceSummary.attendanceRate >= 85
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300"
                  }`}
                >
                  {attendanceSummary.attendanceRate}% có mặt
                </span>
              ) : (
                <span className="text-[10px] text-brandText-muted">Chưa có dữ liệu</span>
              )}
            </div>

            {loadingSummary ? (
              <div className="text-[11px] text-brandText-muted py-2 text-center">Đang tải chuyên cần...</div>
            ) : attendanceSummary ? (
              <div className="grid grid-cols-4 gap-1 text-center text-xs pt-1">
                <div className="bg-white p-1.5 rounded-xl border border-emerald-200">
                  <div className="text-emerald-700 font-bold text-sm">{attendanceSummary.presentDays}</div>
                  <div className="text-[9px] text-brandText-muted">Có mặt</div>
                </div>
                <div className="bg-white p-1.5 rounded-xl border border-amber-200">
                  <div className="text-amber-700 font-bold text-sm">{attendanceSummary.excusedDays}</div>
                  <div className="text-[9px] text-brandText-muted">Có phép</div>
                </div>
                <div className="bg-white p-1.5 rounded-xl border border-rose-200">
                  <div className="text-rose-700 font-bold text-sm">{attendanceSummary.unexcusedDays}</div>
                  <div className="text-[9px] text-brandText-muted">Không phép</div>
                </div>
                <div className="bg-white p-1.5 rounded-xl border border-blue-200">
                  <div className="text-blue-700 font-bold text-sm">{attendanceSummary.lateDays}</div>
                  <div className="text-[9px] text-brandText-muted">Đi trễ</div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-brandText-muted bg-white p-2 rounded-xl border border-dashed border-[#cfe0ed] text-center">
                Chưa có buổi điểm danh nào được ghi nhận cho học sinh này.
              </div>
            )}
          </div>

          {/* Thẻ Rèn luyện & Nề nếp */}
          <div className="bg-[#fbfaf8] border border-[#ecd9c9] rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-amber-900">
                <span>⭐</span> Điểm Rèn Luyện & Nề Nếp
              </div>
              <span
                className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                  conductScore >= 100
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : conductScore >= 90
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : conductScore >= 80
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}
              >
                {conductScore} điểm
              </span>
            </div>

            {loadingSummary ? (
              <div className="text-[11px] text-brandText-muted py-2 text-center">Đang tải sổ nề nếp...</div>
            ) : conductLogs.length > 0 ? (
              <div className="space-y-1 pt-0.5">
                <div className="text-[10px] text-brandText-muted flex justify-between">
                  <span>Ghi nhận gần nhất:</span>
                  <span>Tổng {conductLogs.length} sự việc</span>
                </div>
                <div className="max-h-[64px] overflow-y-auto space-y-1 pr-0.5">
                  {conductLogs.slice(0, 2).map((log) => (
                    <div
                      key={log.id}
                      className="bg-white p-1.5 rounded-lg border border-[#f0dfd1] text-[11px] flex items-center justify-between gap-1"
                    >
                      <div className="min-w-0 truncate">
                        <span className="font-semibold text-[#183d5a]">{log.title}</span>
                        {log.note && <span className="text-brandText-muted"> ({log.note})</span>}
                      </div>
                      <span
                        className={`font-bold shrink-0 text-xs ${
                          log.points > 0
                            ? "text-emerald-600"
                            : log.points < 0
                            ? "text-rose-600"
                            : "text-gray-500"
                        }`}
                      >
                        {log.points > 0 ? `+${log.points}` : log.points}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded-xl border border-emerald-200 text-center">
                ✨ Chưa có vi phạm nề nếp. Duy trì nề nếp xuất sắc!
              </div>
            )}
          </div>
        </div>

        {/* NẾU LÀ GIÁO VIÊN -> KHỐI ĐÁNH GIÁ SƯ PHẠM & AI GEMINI FLASH */}
        {isTeacher && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* CỘT 1: FORM GHI CHÚ SƯ PHẠM CỦA GVCN */}
            <div className="bg-[#fcfdff] border border-[#d6e7f4] rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#edf4f9]">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-primary-dark">
                  <span>👩‍🏫</span> Đánh Giá Sư Phạm GVCN
                </div>
                {saveSuccess && (
                  <span className="text-[11px] text-emerald-600 font-bold animate-fadeIn">
                    ✓ Đã lưu!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveTeacherNotes} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#7890a3] uppercase text-[10px] mb-1">
                      Học lực năm trước
                    </label>
                    <select
                      value={academic}
                      onChange={(e) => setAcademic(e.target.value)}
                      className="w-full h-9 px-2 border border-[#c9deed] rounded-lg bg-white outline-none focus:border-primary text-xs"
                    >
                      <option value="Xuất sắc">Xuất sắc</option>
                      <option value="Giỏi">Giỏi</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#7890a3] uppercase text-[10px] mb-1">
                      Hạnh kiểm năm trước
                    </label>
                    <select
                      value={conduct}
                      onChange={(e) => setConduct(e.target.value)}
                      className="w-full h-9 px-2 border border-[#c9deed] rounded-lg bg-white outline-none focus:border-primary text-xs"
                    >
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#7890a3] uppercase text-[10px] mb-1">
                      Môn thế mạnh
                    </label>
                    <input
                      type="text"
                      value={strengths}
                      onChange={(e) => setStrengths(e.target.value)}
                      placeholder="Toán, Văn, Tin..."
                      className="w-full h-9 px-2.5 border border-[#c9deed] rounded-lg bg-white outline-none focus:border-primary text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#7890a3] uppercase text-[10px] mb-1">
                      Môn cần hỗ trợ
                    </label>
                    <input
                      type="text"
                      value={weaknesses}
                      onChange={(e) => setWeaknesses(e.target.value)}
                      placeholder="Tiếng Anh, Lý..."
                      className="w-full h-9 px-2.5 border border-[#c9deed] rounded-lg bg-white outline-none focus:border-primary text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#7890a3] uppercase text-[10px] mb-1">
                    Đánh giá quá trình tiến bộ
                  </label>
                  <textarea
                    value={teacherProgressNote}
                    onChange={(e) => setTeacherProgressNote(e.target.value)}
                    placeholder="Nhận xét ý thức, nề nếp, sự cải thiện trong học tập..."
                    rows={2}
                    className="w-full p-2 border border-[#c9deed] rounded-lg bg-white outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#7890a3] uppercase text-[10px] mb-1">
                    Lưu ý riêng / Hoàn cảnh nhạy cảm
                  </label>
                  <input
                    type="text"
                    value={teacherSpecialNote}
                    onChange={(e) => setTeacherSpecialNote(e.target.value)}
                    placeholder="Sức khỏe, hoàn cảnh gia đình..."
                    className="w-full h-9 px-2.5 border border-[#c9deed] rounded-lg bg-white outline-none focus:border-primary text-xs"
                  />
                </div>

                {/* THÔNG TIN HỌC SINH TỰ CHIA SẺ */}
                <div className="p-2.5 bg-[#f0f9f8] border border-[#bce8e3] rounded-xl space-y-1">
                  <div className="font-bold text-[#0d6e64] text-[11px] flex items-center gap-1">
                    <span>🌟</span> Học sinh tự chia sẻ:
                  </div>
                  <div className="text-[11px] text-[#1e415b]">
                    <strong>Sở thích:</strong> {ext.hobbies || "Chưa cập nhật"}
                  </div>
                  <div className="text-[11px] text-[#1e415b]">
                    <strong>Ước mơ:</strong> {ext.dreams || "Chưa cập nhật"}
                  </div>
                  {ext.personalNote && (
                    <div className="text-[11px] text-[#1e415b] italic">
                      <strong>Lời nhắn:</strong> &ldquo;{ext.personalNote}&rdquo;
                    </div>
                  )}
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingExt}
                    className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {savingExt ? "Đang lưu..." : "💾 Lưu Đánh Giá Sư Phạm"}
                  </button>
                </div>
              </form>
            </div>

            {/* CỘT 2: TRỢ LÝ SƯ PHẠM AI GEMINI FLASH */}
            <div className="bg-gradient-to-b from-[#f8faff] to-[#f2f7fc] border border-[#cbdff2] rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#dfeaf5] gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-primary-dark truncate">
                    <span className="text-base">🤖</span> Phân Tích Gemini Flash
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAiAnalysis}
                    disabled={analyzingAi}
                    className="px-2.5 py-1.5 sm:px-3 bg-gradient-to-r from-primary to-[#2b7eb8] hover:from-primary-dark hover:to-primary text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-60 flex items-center gap-1 shrink-0"
                  >
                    {analyzingAi ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Đang phân tích...
                      </>
                    ) : (
                      <>✨ {aiReport ? "Phân tích lại" : "Chạy phân tích AI"}</>
                    )}
                  </button>
                </div>

                {aiError && (
                  <div className="p-2.5 my-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                    {aiError}
                  </div>
                )}

                {/* Khung hiển thị báo cáo AI */}
                <div className="mt-2 max-h-[300px] sm:max-h-[360px] overflow-y-auto text-xs leading-relaxed space-y-2 text-[#1e415b] bg-white p-3 sm:p-3.5 rounded-xl border border-[#dce9f2]">
                  {analyzingAi ? (
                    <div className="py-10 text-center space-y-2 text-brandText-muted">
                      <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                      <p className="font-semibold text-xs text-primary">
                        Gemini Flash đang tổng hợp hồ sơ và phân tích sư phạm...
                      </p>
                    </div>
                  ) : aiReport ? (
                    <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed space-y-2">
                      {aiReport}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-brandText-muted space-y-2">
                      <div className="text-2xl">💡</div>
                      <p className="font-medium text-xs">
                        Bấm nút <strong>&ldquo;Chạy phân tích AI&rdquo;</strong> ở trên để Gemini Flash tự động đánh giá chân dung học sinh và xuất khuyến nghị sư phạm cho GVCN.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {aiReport && (
                <div className="text-[10px] text-brandText-muted text-right italic">
                  * Báo cáo được tạo bởi Gemini Flash dựa trên hồ sơ lớp 8A6.
                </div>
              )}
            </div>
          </div>
        )}

        {/* KHỐI HÒM THƯ & TIN NHẮN TRAO ĐỔI VỚI HỌC SINH */}
        {isTeacher && (
          <div className="bg-[#fcfdff] border border-[#d6e7f4] rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#edf4f9] gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">💬</span>
                <div className="font-bold text-xs uppercase tracking-wide text-primary-dark truncate">
                  Hòm Thư Trao Đổi Với Em {student.hoVaTen}
                </div>
                {messages.filter((m) => m.sender === "student" && m.status === "unread").length > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold shrink-0 animate-pulse">
                    {messages.filter((m) => m.sender === "student" && m.status === "unread").length} tin mới
                  </span>
                )}
              </div>

              <span className="text-[11px] text-brandText-muted shrink-0">
                Tổng cộng: <strong>{messages.length}</strong> tin nhắn
              </span>
            </div>

            {/* Khung cuộn danh sách tin nhắn */}
            <div className="bg-[#f8fcff] border border-[#dce9f2] rounded-xl p-3 max-h-[260px] overflow-y-auto space-y-2.5">
              {loadingMessages ? (
                <div className="text-center py-6 text-xs text-brandText-muted">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-1.5" />
                  Đang tải tin nhắn...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-6 text-xs text-brandText-muted">
                  <span>📭</span> Chưa có tin nhắn nào từ em {student.hoVaTen}. Thầy/Cô có thể gửi phản hồi đầu tiên cho em ở bên dưới.
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 sm:p-3 rounded-xl text-xs ${
                      m.sender === "student"
                        ? m.isConfidential
                          ? "bg-amber-50 border border-amber-200 text-amber-950"
                          : "bg-white border border-[#e2eef7] text-[#1e415b]"
                        : "bg-primary-soft border border-[#cfe6f8] text-primary-dark ml-4 sm:ml-8"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px] text-brandText-muted">
                      <span className="font-bold">
                        {m.sender === "student" ? `👤 ${m.studentName || student.hoVaTen}` : "👩‍🏫 GVCN"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {m.isConfidential && (
                          <span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded text-[9px]">
                            🔒 Giữ kín
                          </span>
                        )}
                        <span>
                          {new Date(m.createdAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {m.sender === "student" && (
                          m.status === "unread" ? (
                            <button
                              onClick={() => handleMarkMessageRead(m.id)}
                              className="text-[9px] bg-rose-100 hover:bg-rose-200 text-rose-700 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                              title="Bấm để đánh dấu đã đọc"
                            >
                              🔴 Chưa đọc · Đánh dấu
                            </button>
                          ) : (
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                              ✓ {m.status === "replied" ? "Đã phản hồi" : "Đã đọc"}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))
              )}
            </div>

            {/* Form phản hồi nhanh cho học sinh */}
            <form onSubmit={handleSendReplyFromProfile} className="space-y-2 pt-1">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Nhập phản hồi hoặc lời dặn dò gửi cho em ${student.hoVaTen}...`}
                rows={2}
                className="w-full p-2.5 text-xs border border-[#c9deed] rounded-xl outline-none focus:border-primary bg-white transition"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingReply || !replyContent.trim()}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {sendingReply ? "Đang gửi..." : "Gửi phản hồi cho em ✉️"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 9 KHỐI THÔNG TIN HÀNH CHÍNH (49 CỘT THEO SCHEMA) */}
        <div>
          <div className="font-bold text-xs uppercase tracking-wide text-primary-dark mb-2 flex items-center gap-1.5">
            <span>📑</span> Hồ Sơ 49 Trường Hành Chính (Google Drive)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="border border-[#dce9f2] rounded-xl bg-white p-3 shadow-sm hover:border-[#b7d5eb] transition"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-primary-dark pb-1.5 mb-2 border-b border-[#edf4f9]">
                  <span className="text-sm">{group.icon}</span>
                  <span>{group.title}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {group.fields.map((f, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg bg-[#fbfdff] border border-[#edf4f9] ${
                        f.label.includes("SN/Xóm") ||
                        f.label.includes("Thông tin") ||
                        f.label.includes("Ghi chú")
                          ? "sm:col-span-2"
                          : ""
                      }`}
                    >
                      <div className="text-[10px] font-bold text-[#7890a3] uppercase mb-0.5">
                        {f.label}
                      </div>
                      <div className="font-medium text-[#1e415b] break-words">
                        {f.value || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/45 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-5xl w-full p-3 sm:p-5 shadow-2xl border border-line max-h-[95vh] flex flex-col">
          {content}
        </div>
      </div>
    );
  }

  return <div className="mt-3">{content}</div>;
}
