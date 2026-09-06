"use client";
import React, { useState, useEffect } from "react";
import { StudentMessage } from "@/lib/types";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface Props {
  onClose: () => void;
  onOpenStudentProfile?: (stt: string) => void;
}

export function TeacherInboxModal({ onClose, onOpenStudentProfile }: Props) {
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "confidential">("all");
  const [loading, setLoading] = useState(true);

  const [selectedStudentStt, setSelectedStudentStt] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadMessages(true);

    // 1. Lắng nghe tin nhắn thời gian thực qua Firebase Firestore (nếu có)
    let unsub: (() => void) | undefined;
    const db = getFirebaseDb();
    if (db) {
      try {
        unsub = onSnapshot(collection(db, "messages"), (snapshot) => {
          const list: StudentMessage[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as StudentMessage);
          });
          list.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          setMessages(list);
          setLoading(false);
        });
      } catch (e) {
        console.warn("[Firebase] Không thể kích hoạt Realtime listener:", e);
      }
    }

    // 2. Auto-Polling 3s thông minh (Tự động đồng bộ dù chưa cấu hình Firebase)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return; // Tiết kiệm tài nguyên khi ẩn tab
      loadMessages(false);
    }, 3000);

    return () => {
      if (unsub) unsub();
      clearInterval(interval);
    };
  }, []);

  const loadMessages = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error("Lỗi tải hòm thư giáo viên:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleSendReply = async (stt: string, studentName: string) => {
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stt,
          studentName,
          content: replyText,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok && data.data) {
        setMessages((prev) => [...prev, data.data]);
        setReplyText("");
      } else {
        alert(data.message || "Không thể gửi phản hồi.");
      }
    } catch {
      alert("Lỗi kết nối khi gửi phản hồi.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleMarkStatus = async (id: string, newStatus: "read" | "replied") => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          messageId: id,
          newStatus,
        }),
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái tin nhắn:", err);
    }
  };

  const handleMarkAllStudentRead = async (stt: string) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_student_read",
          studentStt: stt,
        }),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.stt === stt && m.sender === "student" && m.status === "unread"
            ? { ...m, status: "read" }
            : m
        )
      );
    } catch (err) {
      console.error("Lỗi cập nhật đã đọc hàng loạt:", err);
    }
  };

  // Lọc tin nhắn
  const filteredMessages = messages.filter((m) => {
    if (filter === "unread") return m.status === "unread" && m.sender === "student";
    if (filter === "confidential") return m.isConfidential;
    return true;
  });

  // Gom nhóm tin nhắn theo từng học sinh
  const groupedByStudent = filteredMessages.reduce<
    Record<string, { name: string; msgs: StudentMessage[] }>
  >((acc, m) => {
    if (!acc[m.stt]) {
      acc[m.stt] = { name: m.studentName, msgs: [] };
    }
    acc[m.stt].msgs.push(m);
    return acc;
  }, {});

  const unreadTotal = messages.filter(
    (m) => m.status === "unread" && m.sender === "student"
  ).length;
  const confidentialTotal = messages.filter((m) => m.isConfidential).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/45 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-line max-h-[94vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-soft text-primary border border-[#d3e9f9] flex items-center justify-center text-lg sm:text-xl shrink-0">
              📬
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-bold text-primary-dark uppercase tracking-tight truncate">
                  Hòm Thư Học Sinh 8A6
                </h2>
                {unreadTotal > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold shrink-0 animate-pulse">
                    {unreadTotal} tin mới
                  </span>
                )}
              </div>
              <p className="text-[11px] text-brandText-muted truncate hidden sm:block">
                Theo dõi tâm tư, nguyện vọng và trao đổi trực tiếp với học sinh
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

        {/* Filter Bar (Scrollable on mobile) */}
        <div className="flex gap-1.5 my-3 overflow-x-auto pb-1 shrink-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filter === "all"
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
            }`}
          >
            Tất cả ({messages.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filter === "unread"
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-brandText-muted hover:bg-gray-200"
            }`}
          >
            Chưa đọc ({unreadTotal})
          </button>
          <button
            onClick={() => setFilter("confidential")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filter === "confidential"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            🔒 Cần giữ kín ({confidentialTotal})
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 sm:pr-1">
          {loading ? (
            <div className="text-center py-12 text-xs text-brandText-muted">
              <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
              Đang tải tin nhắn...
            </div>
          ) : Object.keys(groupedByStudent).length === 0 ? (
            <div className="text-center py-12 text-xs text-brandText-muted bg-[#fbfdff] rounded-2xl border border-dashed border-[#d8e8f4]">
              <span>📭</span> Chưa có tin nhắn nào từ học sinh trong mục này.
            </div>
          ) : (
            Object.entries(groupedByStudent).map(([stt, group]) => {
              const studentUnreadCount = group.msgs.filter(
                (m) => m.sender === "student" && m.status === "unread"
              ).length;

              return (
                <div
                  key={stt}
                  className="bg-[#fbfdff] border border-[#dce9f2] rounded-2xl p-3 sm:p-4 shadow-sm space-y-2.5 transition hover:border-[#b7d5eb]"
                >
                  <div className="flex flex-wrap items-center justify-between pb-2 border-b border-[#edf4f9] gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-primary-dark truncate">
                        STT {stt}: {group.name}
                      </span>
                      <span className="text-[10px] bg-primary-soft text-primary px-2 py-0.5 rounded font-bold shrink-0">
                        {group.msgs.length} tin
                      </span>
                      {studentUnreadCount > 0 && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold shrink-0">
                          🔴 {studentUnreadCount} mới
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onOpenStudentProfile && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenStudentProfile(stt);
                          }}
                          className="text-[11px] font-semibold text-primary hover:bg-primary-soft px-2 py-1 rounded-lg transition cursor-pointer border border-[#cde2f2] flex items-center gap-1"
                        >
                          <span>📋</span> Hồ sơ 49 trường
                        </button>
                      )}

                      {studentUnreadCount > 0 && (
                        <button
                          onClick={() => handleMarkAllStudentRead(stt)}
                          className="text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition cursor-pointer border border-emerald-200 flex items-center gap-1"
                        >
                          <span>✓</span> Đã đọc hết
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setSelectedStudentStt(
                            selectedStudentStt === stt ? null : stt
                          )
                        }
                        className="text-xs font-bold text-primary hover:underline cursor-pointer px-1 py-1"
                      >
                        {selectedStudentStt === stt ? "Thu gọn ▴" : "Phản hồi ▾"}
                      </button>
                    </div>
                  </div>

                  {/* Danh sách tin nhắn con */}
                  <div className="space-y-2">
                    {group.msgs.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 sm:p-3 rounded-xl text-xs transition ${
                          m.sender === "student"
                            ? m.isConfidential
                              ? "bg-amber-50/90 border border-amber-200 text-amber-950"
                              : "bg-white border border-[#e2eef7] text-[#1e415b]"
                            : "bg-primary-soft border border-[#cfe6f8] text-primary-dark ml-4 sm:ml-6"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 text-[10px] text-brandText-muted">
                          <span className="font-bold">
                            {m.sender === "student"
                              ? `👤 ${m.studentName || group.name}`
                              : "👩‍🏫 GVCN"}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
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

                            {/* Badge trạng thái */}
                            {m.sender === "student" && (
                              m.status === "unread" ? (
                                <button
                                  onClick={() => handleMarkStatus(m.id, "read")}
                                  className="text-[9px] bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-1.5 py-0.5 rounded cursor-pointer transition flex items-center gap-0.5"
                                  title="Bấm để đánh dấu đã đọc"
                                >
                                  <span>🔴 Chưa đọc</span> · <u>Đánh dấu</u>
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
                    ))}
                  </div>

                  {/* Form Soạn Phản Hồi của GVCN */}
                  {selectedStudentStt === stt && (
                    <div className="pt-2.5 border-t border-[#edf4f9] space-y-2 animate-fadeIn">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Nhập nội dung phản hồi cho em ${group.name}...`}
                        rows={2}
                        className="w-full p-2.5 text-xs border border-[#c9deed] rounded-xl outline-none focus:border-primary bg-white transition"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedStudentStt(null)}
                          className="px-3 py-1 text-xs text-brandText-muted hover:bg-gray-100 rounded-lg cursor-pointer transition"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSendReply(stt, group.name)}
                          disabled={sendingReply || !replyText.trim()}
                          className="px-4 py-1.5 bg-primary text-white font-bold rounded-xl text-xs shadow-sm hover:bg-primary-hover transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          {sendingReply ? "Đang gửi..." : "Gửi phản hồi ✉️"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
