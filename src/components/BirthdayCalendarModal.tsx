"use client";

import React, { useState, useEffect } from "react";
import { BirthdayItem } from "@/lib/types";

interface Props {
  onClose: () => void;
  onOpenStudentProfile?: (stt: string) => void;
}

interface BirthdayApiResponse {
  ok: boolean;
  currentMonth: number;
  currentDay: number;
  totalStudentsWithBirthday: number;
  upcoming: BirthdayItem[];
  groupedByMonth: Record<number, BirthdayItem[]>;
}

export function BirthdayCalendarModal({ onClose, onOpenStudentProfile }: Props) {
  const [data, setData] = useState<BirthdayApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<"month" | "upcoming">("month");

  useEffect(() => {
    async function loadBirthdays() {
      setLoading(true);
      try {
        const res = await fetch("/api/student/birthdays");
        if (res.ok) {
          const json = await res.json();
          if (json.ok) {
            setData(json);
            if (json.currentMonth) {
              setSelectedMonth(json.currentMonth);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi tải lịch sinh nhật:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBirthdays();
  }, []);

  const monthStudents = data?.groupedByMonth?.[selectedMonth] || [];
  const upcomingStudents = data?.upcoming || [];
  const todayBirthdays = upcomingStudents.filter((s) => s.isToday);
  const thisWeekBirthdays = upcomingStudents.filter((s) => !s.isToday && s.isThisWeek);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/45 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-line max-h-[94vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-700 border border-pink-200 flex items-center justify-center text-xl shrink-0">
              🎂
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-bold text-pink-900 uppercase tracking-tight truncate">
                  Lịch Sinh Nhật Học Sinh Lớp 8A6
                </h2>
                <span className="px-2 py-0.5 bg-pink-500 text-white rounded-full text-[10px] font-bold shrink-0">
                  {data?.totalStudentsWithBirthday || 0} học sinh
                </span>
              </div>
              <p className="text-[11px] text-brandText-muted truncate hidden sm:block">
                Theo dõi sinh nhật 12 tháng, đếm ngược tự động và gửi lời chúc mừng kịp thời
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

        {/* Highlights: Hôm nay & Tuần này */}
        {todayBirthdays.length > 0 && (
          <div className="mt-3 p-3 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-2xl text-white shadow-md flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl">🎉</span>
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm uppercase tracking-wider">
                  HÔM NAY LÀ SINH NHẬT:
                </div>
                <div className="text-xs font-medium truncate">
                  {todayBirthdays.map((s) => `${s.name} (STT ${s.stt}${s.age ? ` - tròn ${s.age} tuổi` : ""})`).join(", ")}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg shrink-0">
              🎂 Chúc mừng!
            </span>
          </div>
        )}

        {thisWeekBirthdays.length > 0 && todayBirthdays.length === 0 && (
          <div className="mt-3 p-2.5 bg-pink-50 border border-pink-200 rounded-xl text-pink-950 flex items-center gap-2 text-xs">
            <span className="text-base">🎈</span>
            <div className="min-w-0 flex-1 truncate">
              <strong>Sinh nhật trong 7 ngày tới:</strong>{" "}
              {thisWeekBirthdays.map((s) => `${s.name} (${s.day}/${s.month} - còn ${s.daysUntil} ngày)`).join("; ")}
            </div>
          </div>
        )}

        {/* Chế độ xem & Tab 12 tháng */}
        <div className="my-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewMode === "month"
                    ? "bg-pink-700 text-white shadow-sm"
                    : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
                }`}
              >
                📅 Xem theo 12 Tháng
              </button>
              <button
                onClick={() => setViewMode("upcoming")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewMode === "upcoming"
                    ? "bg-pink-700 text-white shadow-sm"
                    : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
                }`}
              >
                ⚡ Sắp tới (30 ngày) ({upcomingStudents.length})
              </button>
            </div>

            {viewMode === "month" && (
              <span className="text-[11px] font-semibold text-pink-800 hidden sm:inline">
                Tháng {selectedMonth} có <strong>{monthStudents.length}</strong> bạn
              </span>
            )}
          </div>

          {/* 12 Tabs Tháng */}
          {viewMode === "month" && (
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 pt-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const count = data?.groupedByMonth?.[m]?.length || 0;
                const isCurrentMonthNow = data?.currentMonth === m;
                const isSelected = selectedMonth === m;

                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`py-1.5 px-1 rounded-xl text-center text-xs font-bold transition cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? "bg-pink-600 text-white border-pink-700 shadow-sm ring-2 ring-pink-300"
                        : isCurrentMonthNow
                        ? "bg-pink-50 text-pink-900 border-pink-300 hover:bg-pink-100"
                        : count > 0
                        ? "bg-white text-[#183d5a] border-gray-200 hover:border-pink-300 hover:bg-pink-50/50"
                        : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-[11px] leading-tight">T.{m}</span>
                    <span
                      className={`text-[9px] px-1 rounded-full font-semibold ${
                        isSelected
                          ? "bg-white/30 text-white"
                          : count > 0
                          ? "bg-pink-100 text-pink-800"
                          : "text-gray-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Danh sách học sinh */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading ? (
            <div className="text-center py-12 text-xs text-brandText-muted">
              <div className="w-6 h-6 border-2 border-pink-600/30 border-t-pink-600 rounded-full animate-spin mx-auto mb-2" />
              Đang tổng hợp lịch sinh nhật cả năm...
            </div>
          ) : viewMode === "month" ? (
            monthStudents.length === 0 ? (
              <div className="text-center py-12 text-xs text-brandText-muted bg-[#fcfbf9] rounded-2xl border border-dashed border-[#ead8c7]">
                <span>🎈</span> Không có học sinh nào sinh vào Tháng {selectedMonth}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {monthStudents.map((item) => (
                  <div
                    key={item.stt}
                    className={`rounded-2xl p-3.5 border transition flex flex-col justify-between ${
                      item.isToday
                        ? "bg-gradient-to-br from-pink-50 to-rose-100 border-pink-400 shadow-md ring-2 ring-pink-400/40"
                        : item.isThisWeek
                        ? "bg-amber-50/80 border-amber-300"
                        : "bg-[#fdfcfb] border-[#ecd9c9] hover:border-pink-300 shadow-sm"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 bg-pink-100 text-pink-900 font-bold rounded-xl flex items-center justify-center text-xs shrink-0">
                            {item.stt}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-[#183d5a] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] font-semibold text-pink-700">
                              📅 {item.day}/{item.month}{item.year ? `/${item.year}` : ""}
                            </div>
                          </div>
                        </div>

                        {item.isToday ? (
                          <span className="px-2 py-0.5 bg-pink-600 text-white rounded-lg text-[10px] font-bold shrink-0 animate-bounce">
                            🎂 Hôm nay!
                          </span>
                        ) : item.daysUntil <= 30 ? (
                          <span className="px-2 py-0.5 bg-pink-100 text-pink-900 border border-pink-300 rounded-lg text-[10px] font-bold shrink-0">
                            Còn {item.daysUntil} ngày
                          </span>
                        ) : null}
                      </div>

                      {item.age && (
                        <div className="text-[11px] text-brandText-muted flex items-center gap-2">
                          <span>Tuổi: <strong>{item.age}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-line/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-brandText-muted italic">
                        {item.isToday
                          ? "Hãy gửi lời chúc mừng!"
                          : item.daysUntil <= 7
                          ? "Sắp tới sinh nhật"
                          : `Tháng ${item.month}`}
                      </span>

                      {onOpenStudentProfile && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenStudentProfile(item.stt);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-primary-soft text-primary border border-[#cde2f2] rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <span>📋</span> Hồ sơ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Chế độ xem 30 ngày sắp tới */
            upcomingStudents.length === 0 ? (
              <div className="text-center py-12 text-xs text-brandText-muted bg-[#fcfbf9] rounded-2xl border border-dashed border-[#ead8c7]">
                <span>✨</span> Không có sinh nhật nào trong 30 ngày tới.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {upcomingStudents.map((item) => (
                  <div
                    key={item.stt}
                    className={`rounded-2xl p-3.5 border transition flex flex-col justify-between ${
                      item.isToday
                        ? "bg-gradient-to-br from-pink-50 to-rose-100 border-pink-400 shadow-md ring-2 ring-pink-400/40"
                        : item.isThisWeek
                        ? "bg-amber-50/80 border-amber-300 shadow-sm"
                        : "bg-[#fdfcfb] border-[#ecd9c9] hover:border-pink-300 shadow-sm"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 bg-pink-100 text-pink-900 font-bold rounded-xl flex items-center justify-center text-xs shrink-0">
                            {item.stt}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-[#183d5a] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] font-semibold text-pink-700">
                              📅 {item.day}/{item.month}{item.year ? `/${item.year}` : ""}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${
                            item.isToday
                              ? "bg-pink-600 text-white animate-bounce"
                              : item.isThisWeek
                              ? "bg-amber-500 text-white"
                              : "bg-pink-100 text-pink-900 border border-pink-300"
                          }`}
                        >
                          {item.isToday ? "🎂 Hôm nay!" : `Còn ${item.daysUntil} ngày`}
                        </span>
                      </div>

                      {item.age && (
                        <div className="text-[11px] text-brandText-muted">
                          Tuổi: <strong>{item.age}</strong>
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-line/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-brandText-muted italic">
                        {item.isToday ? "Ngày đặc biệt trong năm!" : `Sinh nhật ngày ${item.day}/${item.month}`}
                      </span>

                      {onOpenStudentProfile && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenStudentProfile(item.stt);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-primary-soft text-primary border border-[#cde2f2] rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <span>📋</span> Hồ sơ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
