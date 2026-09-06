"use client";

import React, { useState, useEffect } from "react";
import { UpdatedProfileItem } from "@/app/api/student/updated-profiles/route";

interface Props {
  onClose: () => void;
  onOpenStudentProfile?: (stt: string) => void;
}

export function UpdatedProfilesModal({ onClose, onOpenStudentProfile }: Props) {
  const [profiles, setProfiles] = useState<UpdatedProfileItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    teacherUpdated: 0,
    studentShared: 0,
    aiAnalyzed: 0,
    fullyUpdated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<
    "all" | "teacher_updated" | "student_shared" | "ai_analyzed" | "not_updated"
  >("all");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch("/api/student/updated-profiles");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.profiles) {
            setProfiles(data.profiles);
            if (data.stats) setStats(data.stats);
          }
        }
      } catch (err) {
        console.error("Lỗi tải hồ sơ lưu trữ:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredList = profiles.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.stt.includes(term) ||
      (item.extension.strengths || "").toLowerCase().includes(term) ||
      (item.extension.hobbies || "").toLowerCase().includes(term) ||
      (item.extension.dreams || "").toLowerCase().includes(term);

    if (!matchSearch) return false;

    if (filterMode === "teacher_updated") return item.hasTeacherNote;
    if (filterMode === "student_shared") return item.hasStudentShare;
    if (filterMode === "ai_analyzed") return item.hasAiReport;
    if (filterMode === "not_updated") return !item.hasTeacherNote && !item.hasStudentShare;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/45 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-line max-h-[94vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center text-xl shrink-0">
              📂
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-bold text-teal-950 uppercase tracking-tight truncate">
                  Sổ Lưu Trữ Thông Tin Học Sinh Đã Cập Nhật
                </h2>
                <span className="px-2 py-0.5 bg-teal-600 text-white rounded-full text-[10px] font-bold shrink-0">
                  {stats.teacherUpdated}/{stats.total} đã đánh giá
                </span>
              </div>
              <p className="text-[11px] text-brandText-muted truncate hidden sm:block">
                Theo dõi toàn diện tiến độ cập nhật đánh giá sư phạm GVCN, sở thích học sinh và phân tích AI
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

        {/* 4 Thẻ Thống Kê Tiến Độ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 shrink-0">
          <div className="bg-[#f0f9f8] border border-[#bfe7e2] p-2.5 rounded-2xl">
            <div className="text-[10px] uppercase font-bold text-teal-800">👩‍🏫 Đánh Giá GVCN</div>
            <div className="text-lg font-bold text-teal-950 mt-0.5">
              {stats.teacherUpdated} <span className="text-xs text-teal-700 font-normal">/ {stats.total} HS</span>
            </div>
            <div className="text-[10px] text-teal-700 mt-0.5">
              Đạt {Math.round((stats.teacherUpdated / (stats.total || 1)) * 100)}% sĩ số
            </div>
          </div>

          <div className="bg-[#fdfcf0] border border-[#f5e8b7] p-2.5 rounded-2xl">
            <div className="text-[10px] uppercase font-bold text-amber-800">🌟 Học Sinh Chia Sẻ</div>
            <div className="text-lg font-bold text-amber-950 mt-0.5">
              {stats.studentShared} <span className="text-xs text-amber-700 font-normal">/ {stats.total} HS</span>
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">Sở thích & ước mơ</div>
          </div>

          <div className="bg-[#f2f8fd] border border-[#bcdbf5] p-2.5 rounded-2xl">
            <div className="text-[10px] uppercase font-bold text-blue-800">🤖 Phân Tích Gemini</div>
            <div className="text-lg font-bold text-blue-950 mt-0.5">
              {stats.aiAnalyzed} <span className="text-xs text-blue-700 font-normal">/ {stats.total} HS</span>
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">Báo cáo sư phạm AI</div>
          </div>

          <div className="bg-[#fbf7fd] border border-[#e4ccf5] p-2.5 rounded-2xl">
            <div className="text-[10px] uppercase font-bold text-purple-800">✨ Toàn Diện</div>
            <div className="text-lg font-bold text-purple-950 mt-0.5">
              {stats.fullyUpdated} <span className="text-xs text-purple-700 font-normal">/ {stats.total} HS</span>
            </div>
            <div className="text-[10px] text-purple-700 mt-0.5">Có cả 2 bên</div>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="mb-3 space-y-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo STT, tên học sinh, môn thế mạnh, sở thích, ước mơ..."
              className="w-full h-10 pl-9 pr-3 text-xs border border-[#c9deed] rounded-xl outline-none focus:border-primary bg-[#fbfdff]"
            />
            <span className="absolute left-3 top-2.5 text-xs text-brandText-muted">🔍</span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterMode === "all"
                  ? "bg-teal-800 text-white shadow-sm"
                  : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
              }`}
            >
              Tất cả ({profiles.length})
            </button>
            <button
              onClick={() => setFilterMode("teacher_updated")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterMode === "teacher_updated"
                  ? "bg-teal-800 text-white shadow-sm"
                  : "bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
              }`}
            >
              👩‍🏫 Đã có đánh giá GVCN ({stats.teacherUpdated})
            </button>
            <button
              onClick={() => setFilterMode("student_shared")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterMode === "student_shared"
                  ? "bg-amber-700 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              🌟 Học sinh đã chia sẻ ({stats.studentShared})
            </button>
            <button
              onClick={() => setFilterMode("ai_analyzed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterMode === "ai_analyzed"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              🤖 Đã phân tích AI ({stats.aiAnalyzed})
            </button>
            <button
              onClick={() => setFilterMode("not_updated")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterMode === "not_updated"
                  ? "bg-gray-700 text-white shadow-sm"
                  : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              ⏳ Chưa cập nhật ({stats.total - stats.teacherUpdated})
            </button>
          </div>
        </div>

        {/* Danh sách thẻ Học sinh */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-12 text-xs text-brandText-muted">
              <div className="w-6 h-6 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
              Đang tải danh sách hồ sơ học sinh lớp 8A6...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 text-xs text-brandText-muted bg-[#fcfbf9] rounded-2xl border border-dashed border-[#ead8c7]">
              <span>🔍</span> Không có hồ sơ nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map((item) => (
                <div
                  key={item.stt}
                  className="bg-[#fcfdff] border border-[#d6e7f4] hover:border-teal-400 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Header học sinh */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#edf4f9] gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 bg-teal-100 text-teal-900 font-bold rounded-xl flex items-center justify-center text-xs shrink-0">
                          {item.stt}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[#183d5a] truncate">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-brandText-muted">
                            Sinh: {item.birthDate} · GT: {item.gender}
                          </div>
                        </div>
                      </div>

                      {onOpenStudentProfile && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenStudentProfile(item.stt);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-primary-soft text-primary border border-[#cde2f2] rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>📋</span> Hồ sơ
                        </button>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.hasTeacherNote ? (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-900 border border-teal-300 rounded-md text-[10px] font-bold">
                          ✓ Đã có đánh giá GVCN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px]">
                          ⏳ Chưa đánh giá GVCN
                        </span>
                      )}

                      {item.hasStudentShare && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-bold">
                          🌟 Có chia sẻ học sinh
                        </span>
                      )}

                      {item.hasAiReport && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded-md text-[10px] font-bold">
                          🤖 Đã phân tích AI
                        </span>
                      )}
                    </div>

                    {/* Khung tóm tắt thông tin đã cập nhật */}
                    {item.hasTeacherNote || item.hasStudentShare ? (
                      <div className="bg-white p-2.5 rounded-xl border border-[#e2eef7] text-xs space-y-1.5 text-[#1e415b]">
                        {item.hasTeacherNote && (
                          <div className="space-y-0.5 text-[11px]">
                            <div className="flex gap-2">
                              <span>Học lực: <strong>{item.extension.academicLastYear || "Khá"}</strong></span>
                              <span>Hạnh kiểm: <strong>{item.extension.conductLastYear || "Tốt"}</strong></span>
                            </div>
                            {item.extension.strengths && (
                              <div>• Thế mạnh: <em>{item.extension.strengths}</em></div>
                            )}
                            {item.extension.weaknesses && (
                              <div>• Cần hỗ trợ: <em>{item.extension.weaknesses}</em></div>
                            )}
                            {item.extension.teacherProgressNote && (
                              <div className="text-teal-900">• Tiến bộ: &ldquo;{item.extension.teacherProgressNote}&rdquo;</div>
                            )}
                          </div>
                        )}

                        {item.hasStudentShare && (
                          <div className="pt-1 border-t border-[#f0f5fa] text-[11px] text-[#0d6e64]">
                            {item.extension.hobbies && <div>• Sở thích: {item.extension.hobbies}</div>}
                            {item.extension.dreams && <div>• Ước mơ: {item.extension.dreams}</div>}
                            {item.extension.personalNote && (
                              <div className="italic text-amber-800">• Lời nhắn: &ldquo;{item.extension.personalNote}&rdquo;</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-[11px] text-gray-400">
                        Chưa có đánh giá sư phạm hoặc chia sẻ nào từ học sinh.
                      </div>
                    )}
                  </div>

                  {item.updatedAt && (
                    <div className="text-[10px] text-brandText-muted text-right italic pt-1 border-t border-line/60">
                      Cập nhật lần cuối: {new Date(item.updatedAt).toLocaleDateString("vi-VN")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
