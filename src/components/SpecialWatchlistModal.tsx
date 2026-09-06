"use client";

import React, { useState, useEffect } from "react";
import { WatchlistStudent, WatchlistCategory } from "@/lib/types";

interface Props {
  onClose: () => void;
  onOpenStudentProfile?: (stt: string) => void;
}

export function SpecialWatchlistModal({ onClose, onOpenStudentProfile }: Props) {
  const [watchlist, setWatchlist] = useState<WatchlistStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<WatchlistCategory | "all">("all");
  const [categoriesCount, setCategoriesCount] = useState({
    policy: 0,
    health: 0,
    academic: 0,
    confidential: 0,
  });

  useEffect(() => {
    async function loadWatchlist() {
      setLoading(true);
      try {
        const res = await fetch("/api/student/watchlist");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.watchlist) {
            setWatchlist(data.watchlist);
            if (data.categoriesCount) {
              setCategoriesCount(data.categoriesCount);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi tải danh sách quan tâm đặc biệt:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWatchlist();
  }, []);

  const filteredList = watchlist.filter((item) => {
    if (filterCategory === "all") return true;
    return item.categories.includes(filterCategory);
  });

  const getCategoryBadge = (cat: WatchlistCategory) => {
    switch (cat) {
      case "policy":
        return (
          <span
            key={cat}
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
          >
            🎗️ Chính sách / Hộ nghèo
          </span>
        );
      case "health":
        return (
          <span
            key={cat}
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300"
          >
            🏥 Sức khỏe / Thể trạng
          </span>
        );
      case "academic":
        return (
          <span
            key={cat}
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300"
          >
            📚 Cần phụ đạo môn yếu
          </span>
        );
      case "confidential":
        return (
          <span
            key={cat}
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300"
          >
            🔒 Có tâm tư giữ kín
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/45 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-line max-h-[94vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-xl shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-bold text-amber-900 uppercase tracking-tight truncate">
                  Danh Sách Học Sinh Cần Quan Tâm Đặc Biệt
                </h2>
                <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold shrink-0">
                  {watchlist.length} học sinh
                </span>
              </div>
              <p className="text-[11px] text-brandText-muted truncate hidden sm:block">
                Hệ thống tự động phát hiện học sinh diện chính sách, thể trạng nhạy cảm, cần phụ đạo và tâm tư giữ kín
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

        {/* Filter Categories */}
        <div className="flex gap-1.5 my-3 overflow-x-auto pb-1 shrink-0">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filterCategory === "all"
                ? "bg-amber-700 text-white shadow-sm"
                : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
            }`}
          >
            Tất cả ({watchlist.length})
          </button>
          <button
            onClick={() => setFilterCategory("policy")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filterCategory === "policy"
                ? "bg-amber-700 text-white shadow-sm"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            🎗️ Chính sách & Hộ nghèo ({categoriesCount.policy})
          </button>
          <button
            onClick={() => setFilterCategory("health")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filterCategory === "health"
                ? "bg-rose-700 text-white shadow-sm"
                : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            🏥 Sức khỏe & Hoàn cảnh ({categoriesCount.health})
          </button>
          <button
            onClick={() => setFilterCategory("academic")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filterCategory === "academic"
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
            }`}
          >
            📚 Cần phụ đạo môn yếu ({categoriesCount.academic})
          </button>
          <button
            onClick={() => setFilterCategory("confidential")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filterCategory === "confidential"
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
            }`}
          >
            🔒 Có tâm tư giữ kín ({categoriesCount.confidential})
          </button>
        </div>

        {/* Danh sách thẻ học sinh */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-12 text-xs text-brandText-muted">
              <div className="w-6 h-6 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-2" />
              Đang quét dữ liệu học sinh cần quan tâm...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 text-xs text-brandText-muted bg-[#fcfbf9] rounded-2xl border border-dashed border-[#ead8c7]">
              <span>✨</span> Không có học sinh nào trong phân loại này.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map((item) => (
                <div
                  key={item.stt}
                  className="bg-[#fdfcfb] border border-[#ecd9c9] hover:border-amber-400 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-[#f3e7db] gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 bg-amber-100 text-amber-900 font-bold rounded-xl flex items-center justify-center text-xs shrink-0">
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
                          className="px-2.5 py-1 bg-white hover:bg-primary-soft text-primary border border-[#cde2f2] rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <span>📋</span> Hồ sơ
                        </button>
                      )}
                    </div>

                    {/* Badges nhóm quan tâm */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.categories.map((cat) => getCategoryBadge(cat))}
                    </div>

                    {/* Danh sách lý do chi tiết */}
                    <div className="bg-white p-2.5 rounded-xl border border-[#f0dfd1] text-xs space-y-1 text-[#334e68]">
                      {item.reasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px]">
                          <span className="text-amber-600 font-bold">▪</span>
                          <span className="leading-snug">{reason}</span>
                        </div>
                      ))}
                    </div>

                    {/* Ghi chú sư phạm của GVCN nếu có */}
                    {item.extension?.teacherSpecialNote && (
                      <div className="text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded-lg border border-amber-200/80 italic">
                        <strong>Lưu ý GVCN:</strong> &ldquo;{item.extension.teacherSpecialNote}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
