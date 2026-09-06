"use client";

import React, { useState, useEffect } from "react";
import { ParentContactItem } from "@/app/api/student/parent-directory/route";

interface Props {
  onClose: () => void;
  onOpenStudentProfile?: (stt: string) => void;
}

export function ParentDirectoryModal({ onClose, onOpenStudentProfile }: Props) {
  const [contacts, setContacts] = useState<ParentContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "has_father" | "has_mother" | "no_phone">("all");
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Template tin nhắn nhanh Zalo/SMS
  const [selectedStudentForTemplate, setSelectedStudentForTemplate] = useState<ParentContactItem | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<"absent" | "conduct" | "fee" | "meeting">("absent");

  useEffect(() => {
    async function loadDirectory() {
      setLoading(true);
      try {
        const res = await fetch("/api/student/parent-directory");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.contacts) {
            setContacts(data.contacts);
          }
        }
      } catch (err) {
        console.error("Lỗi tải danh bạ phụ huynh:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDirectory();
  }, []);

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const clean = phone.replace(/\D/g, "");
    if (!clean) return;
    navigator.clipboard.writeText(clean);
    setCopiedPhone(clean);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "").trim();
  };

  const formatPhone = (phone?: string) => {
    const clean = getCleanPhone(phone);
    if (!clean) return "Chưa có SĐT";
    if (clean.length === 10) {
      return `${clean.slice(0, 4)}.${clean.slice(4, 7)}.${clean.slice(7)}`;
    }
    return clean;
  };

  // Lọc danh bạ
  const filteredContacts = contacts.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      c.studentName.toLowerCase().includes(term) ||
      c.stt.includes(term) ||
      c.fatherName.toLowerCase().includes(term) ||
      c.motherName.toLowerCase().includes(term) ||
      c.fatherPhone.includes(term) ||
      c.motherPhone.includes(term) ||
      c.sllPhone.includes(term);

    if (!matchSearch) return false;

    if (filterType === "has_father") return Boolean(c.fatherPhone);
    if (filterType === "has_mother") return Boolean(c.motherPhone);
    if (filterType === "no_phone") return !c.hasPhone;
    return true;
  });

  const countFatherPhone = contacts.filter((c) => Boolean(c.fatherPhone)).length;
  const countMotherPhone = contacts.filter((c) => Boolean(c.motherPhone)).length;
  const countNoPhone = contacts.filter((c) => !c.hasPhone).length;

  // Soạn sẵn nội dung tin nhắn Zalo/SMS
  const generateMessageContent = (item: ParentContactItem, type: string) => {
    const parentTitle = item.primaryContactName || "Kính gửi Quý Phụ huynh";
    const dateStr = new Date().toLocaleDateString("vi-VN");

    switch (type) {
      case "absent":
        return `Kính gửi ${parentTitle} của em ${item.studentName} (STT ${item.stt} - Lớp 8A6, THCS Quang Trung). Hôm nay ngày ${dateStr}, em ${item.studentName} chưa thấy có mặt tại lớp. Kính nhờ Quý Phụ huynh xác nhận giúp GVCN. Trân trọng cảm ơn!`;
      case "conduct":
        return `Kính gửi ${parentTitle} của em ${item.studentName} (Lớp 8A6, THCS Quang Trung). GVCN xin phép trao đổi một số nội dung học tập và nề nếp của em trong tuần qua. Kính mong Quý Phụ huynh bố trí chút thời gian phản hồi hoặc gọi lại cho GVCN ạ.`;
      case "fee":
        return `Kính gửi ${parentTitle} của em ${item.studentName} (Lớp 8A6). GVCN xin gửi thông báo nhắc nhở về việc hoàn tất các khoản thu/bảo hiểm định kỳ theo quy định của nhà trường. Trân trọng cảm ơn Quý Phụ huynh!`;
      case "meeting":
        return `Kính gửi ${parentTitle} của em ${item.studentName}. GVCN trân trọng kính mời Quý Phụ huynh đến tham dự buổi Họp Phụ Huynh Lớp 8A6 tại Phòng học 8A6, Trường THCS Quang Trung. Sự hiện diện của Quý Phụ huynh là niềm động viên lớn cho các em học sinh.`;
      default:
        return "";
    }
  };

  const openZaloChat = (phone: string, text?: string) => {
    const clean = getCleanPhone(phone);
    if (!clean) return;
    const zaloUrl = `https://zalo.me/${clean}`;
    window.open(zaloUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/45 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-line max-h-[94vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-xl shrink-0">
              📞
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-bold text-blue-950 uppercase tracking-tight truncate">
                  Danh Bạ Điện Thoại Bố Mẹ & Phụ Huynh 8A6
                </h2>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold shrink-0">
                  {contacts.length} học sinh
                </span>
              </div>
              <p className="text-[11px] text-brandText-muted truncate hidden sm:block">
                Tra cứu nhanh số điện thoại Bố/Mẹ, gọi điện 1-chạm, mở Zalo và gửi tin nhắn mẫu tiện lợi
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

        {/* Search & Filters */}
        <div className="my-3 space-y-2.5 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo STT, tên học sinh, tên Bố/Mẹ, hoặc số điện thoại..."
                className="w-full h-10 pl-9 pr-3 text-xs border border-[#c9deed] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-[#fbfdff]"
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
          </div>

          {/* Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === "all"
                  ? "bg-blue-800 text-white shadow-sm"
                  : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
              }`}
            >
              Tất cả ({contacts.length})
            </button>
            <button
              onClick={() => setFilterType("has_father")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === "has_father"
                  ? "bg-blue-800 text-white shadow-sm"
                  : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              👨 Có SĐT Bố ({countFatherPhone})
            </button>
            <button
              onClick={() => setFilterType("has_mother")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === "has_mother"
                  ? "bg-blue-800 text-white shadow-sm"
                  : "bg-pink-50 text-pink-800 border border-pink-200 hover:bg-pink-100"
              }`}
            >
              👩 Có SĐT Mẹ ({countMotherPhone})
            </button>
            {countNoPhone > 0 && (
              <button
                onClick={() => setFilterType("no_phone")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  filterType === "no_phone"
                    ? "bg-rose-700 text-white shadow-sm"
                    : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                ⚠️ Chưa có SĐT ({countNoPhone})
              </button>
            )}
          </div>
        </div>

        {/* Thông báo Copy thành công */}
        {copiedPhone && (
          <div className="mb-2 p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn">
            <span>✓ Đã sao chép số điện thoại: {copiedPhone}</span>
            <span className="text-[10px] text-emerald-600 font-normal">Sẵn sàng dán vào Zalo/Tin nhắn</span>
          </div>
        )}

        {/* Danh sách thẻ Danh bạ Phụ huynh */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-12 text-xs text-brandText-muted">
              <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
              Đang tổng hợp danh bạ phụ huynh lớp 8A6...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-xs text-brandText-muted bg-[#fcfbf9] rounded-2xl border border-dashed border-[#ead8c7]">
              <span>🔍</span> Không tìm thấy thông tin phụ huynh phù hợp với từ khóa.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredContacts.map((item) => (
                <div
                  key={item.stt}
                  className="bg-[#fcfdff] border border-[#d6e7f4] hover:border-blue-400 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3 transition flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Header học sinh */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#edf4f9] gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 bg-blue-100 text-blue-900 font-bold rounded-xl flex items-center justify-center text-xs shrink-0">
                          {item.stt}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[#183d5a] truncate">
                            {item.studentName}
                          </div>
                          <div className="text-[10px] text-brandText-muted truncate">
                            Sinh: {item.birthDate} · GT: {item.gender}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setSelectedStudentForTemplate(item)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Soạn tin nhắn mẫu gửi phụ huynh"
                        >
                          <span>💬</span> Mẫu tin
                        </button>

                        {onOpenStudentProfile && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenStudentProfile(item.stt);
                            }}
                            className="px-2 py-1 bg-white hover:bg-primary-soft text-primary border border-[#cde2f2] rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Xem đầy đủ hồ sơ"
                          >
                            <span>📋</span> Hồ sơ
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Khối Thông tin Bố */}
                    <div className="bg-white p-2.5 rounded-xl border border-[#e2eef7] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-[#1e415b] flex items-center gap-1">
                          <span>👨</span> Bố: {item.fatherName || "Chưa có tên"}
                          {item.fatherJob && (
                            <span className="text-[10px] text-brandText-muted font-normal">
                              ({item.fatherJob})
                            </span>
                          )}
                        </div>
                      </div>

                      {item.fatherPhone ? (
                        <div className="flex items-center justify-between pt-1 gap-1 flex-wrap">
                          <span className="font-bold text-blue-900 text-xs">
                            📱 {formatPhone(item.fatherPhone)}
                          </span>

                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${getCleanPhone(item.fatherPhone)}`}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1"
                            >
                              📞 Gọi
                            </a>
                            <button
                              onClick={() => openZaloChat(item.fatherPhone)}
                              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              💬 Zalo
                            </button>
                            <button
                              onClick={(e) => handleCopyPhone(item.fatherPhone, e)}
                              className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-brandText-muted rounded-md text-[10px] font-medium cursor-pointer"
                              title="Sao chép SĐT"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-400 italic pt-0.5">
                          Chưa cập nhật số điện thoại bố
                        </div>
                      )}
                    </div>

                    {/* Khối Thông tin Mẹ */}
                    <div className="bg-white p-2.5 rounded-xl border border-[#e2eef7] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-[#1e415b] flex items-center gap-1">
                          <span>👩</span> Mẹ: {item.motherName || "Chưa có tên"}
                          {item.motherJob && (
                            <span className="text-[10px] text-brandText-muted font-normal">
                              ({item.motherJob})
                            </span>
                          )}
                        </div>
                      </div>

                      {item.motherPhone ? (
                        <div className="flex items-center justify-between pt-1 gap-1 flex-wrap">
                          <span className="font-bold text-pink-900 text-xs">
                            📱 {formatPhone(item.motherPhone)}
                          </span>

                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${getCleanPhone(item.motherPhone)}`}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1"
                            >
                              📞 Gọi
                            </a>
                            <button
                              onClick={() => openZaloChat(item.motherPhone)}
                              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              💬 Zalo
                            </button>
                            <button
                              onClick={(e) => handleCopyPhone(item.motherPhone, e)}
                              className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-brandText-muted rounded-md text-[10px] font-medium cursor-pointer"
                              title="Sao chép SĐT"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-400 italic pt-0.5">
                          Chưa cập nhật số điện thoại mẹ
                        </div>
                      )}
                    </div>

                    {/* Điện thoại Sổ liên lạc / Địa chỉ */}
                    <div className="text-[10px] text-brandText-muted flex items-center justify-between px-1">
                      <span>🏠 {item.address}</span>
                      {item.sllPhone && item.sllPhone !== item.fatherPhone && item.sllPhone !== item.motherPhone && (
                        <span>SLL: <strong>{formatPhone(item.sllPhone)}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL CON: SOẠN & GỬI MẪU TIN NHẮN ZALO CHO PHỤ HUYNH */}
        {selectedStudentForTemplate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-line space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <div className="font-bold text-sm text-[#183d5a] flex items-center gap-1.5">
                  <span>💬</span> Mẫu Tin Nhắn Cho Phụ Huynh Em {selectedStudentForTemplate.studentName}
                </div>
                <button
                  onClick={() => setSelectedStudentForTemplate(null)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 rounded-lg p-1.5 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Loại mẫu tin */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  onClick={() => setSelectedTemplateType("absent")}
                  className={`p-2 rounded-xl border text-left font-bold transition cursor-pointer ${
                    selectedTemplateType === "absent"
                      ? "bg-rose-50 border-rose-300 text-rose-900"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  🚨 Báo vắng học hôm nay
                </button>
                <button
                  onClick={() => setSelectedTemplateType("conduct")}
                  className={`p-2 rounded-xl border text-left font-bold transition cursor-pointer ${
                    selectedTemplateType === "conduct"
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  ⭐ Nhắc nhở nề nếp / học tập
                </button>
                <button
                  onClick={() => setSelectedTemplateType("fee")}
                  className={`p-2 rounded-xl border text-left font-bold transition cursor-pointer ${
                    selectedTemplateType === "fee"
                      ? "bg-blue-50 border-blue-300 text-blue-900"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  💳 Nhắc khoản thu / BHYT
                </button>
                <button
                  onClick={() => setSelectedTemplateType("meeting")}
                  className={`p-2 rounded-xl border text-left font-bold transition cursor-pointer ${
                    selectedTemplateType === "meeting"
                      ? "bg-purple-50 border-purple-300 text-purple-900"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  📅 Giấy mời họp phụ huynh
                </button>
              </div>

              {/* Khung nội dung tin nhắn mẫu */}
              <div className="bg-[#f8fcff] border border-[#dce9f2] rounded-xl p-3 text-xs leading-relaxed text-[#1e415b] whitespace-pre-wrap font-sans">
                {generateMessageContent(selectedStudentForTemplate, selectedTemplateType)}
              </div>

              {/* Nút hành động gửi */}
              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  onClick={() => {
                    const text = generateMessageContent(selectedStudentForTemplate, selectedTemplateType);
                    navigator.clipboard.writeText(text);
                    alert("✓ Đã sao chép nội dung tin nhắn!");
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-brandText font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <span>📋</span> Sao chép tin nhắn
                </button>

                {selectedStudentForTemplate.primaryPhone && (
                  <button
                    onClick={() => {
                      const text = generateMessageContent(selectedStudentForTemplate, selectedTemplateType);
                      navigator.clipboard.writeText(text);
                      openZaloChat(selectedStudentForTemplate.primaryPhone);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>💬</span> Mở Zalo & Dán gửi ({selectedStudentForTemplate.primaryPhone})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
