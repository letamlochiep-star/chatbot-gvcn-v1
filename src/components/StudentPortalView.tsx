"use client";

import React, { useState, useEffect } from "react";
import { AuthSession, StudentRecord, StudentExtensionData, StudentMessage } from "@/lib/types";
import { StudentDetailView } from "./StudentDetailView";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

interface Props {
  session: AuthSession;
  onLogout: () => void;
}

export function StudentPortalView({ session, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<"profile" | "myspace" | "messages">("myspace");
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [extension, setExtension] = useState<StudentExtensionData>({ stt: session.stt || "" });
  const [messages, setMessages] = useState<StudentMessage[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingExtension, setSavingExtension] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form My Space
  const [hobbies, setHobbies] = useState("");
  const [dreams, setDreams] = useState("");
  const [personalNote, setPersonalNote] = useState("");

  // Form Tin nhắn
  const [msgContent, setMsgContent] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Tải thông tin học sinh
  useEffect(() => {
    async function loadData() {
      if (!session.stt) return;
      try {
        setLoading(true);

        // 1. Tải hồ sơ học sinh
        const resStudent = await fetch(`/api/student/${session.stt}`);
        if (resStudent.ok) {
          const data = await resStudent.json();
          if (data.ok && data.student) {
            setStudent(data.student);
          }
        }

        // 2. Tải dữ liệu mở rộng
        const resExt = await fetch(`/api/student/extension?stt=${session.stt}`);
        if (resExt.ok) {
          const dataExt = await resExt.json();
          if (dataExt.ok && dataExt.extension) {
            setExtension(dataExt.extension);
            setHobbies(dataExt.extension.hobbies || "");
            setDreams(dataExt.extension.dreams || "");
            setPersonalNote(dataExt.extension.personalNote || "");
          }
        }

        // 3. Tải tin nhắn ban đầu
        const resMsg = await fetch(`/api/messages?stt=${session.stt}`);
        if (resMsg.ok) {
          const dataMsg = await resMsg.json();
          if (dataMsg.ok && dataMsg.messages) {
            setMessages(dataMsg.messages);
          }
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu cổng học sinh:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // 1. Lắng nghe tin nhắn thời gian thực của học sinh (nếu có Firebase)
    let unsub: (() => void) | undefined;
    const db = getFirebaseDb();
    if (db && session.stt) {
      try {
        const cleanStt = session.stt.trim();
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
        console.warn("[Firebase] Không thể kết nối Realtime tin nhắn học sinh:", e);
      }
    }

    // 2. Auto-Polling 3s thông minh cho học sinh
    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (!session.stt) return;
      try {
        const resMsg = await fetch(`/api/messages?stt=${session.stt}`);
        if (resMsg.ok) {
          const dataMsg = await resMsg.json();
          if (dataMsg.ok && dataMsg.messages) {
            setMessages(dataMsg.messages);
          }
        }
      } catch {}
    }, 3000);

    return () => {
      if (unsub) unsub();
      clearInterval(interval);
    };
  }, [session.stt]);

  // Lưu thông tin My Space
  const handleSaveExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExtension(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/student/extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stt: session.stt,
          hobbies,
          dreams,
          personalNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setExtension(data.extension);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.message || "Không thể lưu thông tin.");
      }
    } catch {
      alert("Lỗi kết nối khi lưu thông tin.");
    } finally {
      setSavingExtension(false);
    }
  };

  // Gửi tin nhắn cho GVCN
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgContent.trim()) return;

    setSendingMsg(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: msgContent,
          isConfidential,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok && data.data) {
        setMessages((prev) => [...prev, data.data]);
        setMsgContent("");
        setIsConfidential(false);
      } else {
        alert(data.message || "Không thể gửi tin nhắn.");
      }
    } catch {
      alert("Lỗi kết nối khi gửi tin nhắn.");
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-brandText-muted">
            Đang tải không gian cá nhân của em...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0d6e64] via-[#128a7e] to-[#18ab9d] text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex flex-wrap items-center gap-2">
            <span>🎓 CỔNG HỌC SINH 8A6</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
              STT: {session.stt}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">{session.name}</h1>
          <p className="text-xs text-emerald-100 mt-0.5">
            Trường THCS Quang Trung · Năm học 2025 - 2026
          </p>
        </div>

        <button
          onClick={onLogout}
          className="self-start md:self-auto px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-white"
        >
          <span>🚪</span> Đăng xuất
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-3 bg-white p-1 sm:p-1.5 rounded-2xl border border-line shadow-sm gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab("myspace")}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center ${
            activeTab === "myspace"
              ? "bg-[#0d6e64] text-white shadow-sm"
              : "text-brandText-muted hover:text-brandText hover:bg-[#f3f9f8]"
          }`}
        >
          <span>🌟</span> <span className="truncate">Sở thích & Ước mơ</span>
        </button>

        <button
          onClick={() => setActiveTab("messages")}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 relative text-center ${
            activeTab === "messages"
              ? "bg-[#0d6e64] text-white shadow-sm"
              : "text-brandText-muted hover:text-brandText hover:bg-[#f3f9f8]"
          }`}
        >
          <div className="flex items-center gap-1">
            <span>💬</span> <span className="truncate">Nhắn GVCN</span>
          </div>
          {messages.length > 0 && (
            <span className="w-4 h-4 sm:w-5 sm:h-5 bg-amber-400 text-amber-950 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
              {messages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center ${
            activeTab === "profile"
              ? "bg-[#0d6e64] text-white shadow-sm"
              : "text-brandText-muted hover:text-brandText hover:bg-[#f3f9f8]"
          }`}
        >
          <span>📋</span> <span className="truncate">Hồ sơ 49 trường</span>
        </button>
      </div>

      {/* TAB 1: GÓC CÁ NHÂN (MY SPACE) */}
      {activeTab === "myspace" && (
        <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[#0d6e64] flex items-center gap-2">
              <span>🌟</span> Không Gian Cá Nhân & Nguyện Vọng Của Em
            </h2>
            <p className="text-xs text-brandText-muted mt-1">
              Hãy chia sẻ sở thích, ước mơ và mong muốn của em để thầy/cô chủ nhiệm hiểu và đồng hành cùng em tốt hơn.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <span>✓</span> Đã lưu thông tin sở thích và ước mơ của em thành công!
            </div>
          )}

          <form onSubmit={handleSaveExtension} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brandText uppercase mb-1.5 flex items-center gap-1.5">
                <span>🎨</span> Sở thích cá nhân của em
              </label>
              <textarea
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                placeholder="Ví dụ: Thích đọc truyện tranh, chơi cầu lông, vẽ tranh, nghe nhạc, lập trình..."
                rows={3}
                className="w-full p-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-[#0d6e64] focus:ring-2 focus:ring-[#0d6e64]/20 transition bg-[#fbfdff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brandText uppercase mb-1.5 flex items-center gap-1.5">
                <span>🚀</span> Ước mơ & Định hướng tương lai của em
              </label>
              <textarea
                value={dreams}
                onChange={(e) => setDreams(e.target.value)}
                placeholder="Ví dụ: Em ước mơ trở thành kỹ sư công nghệ thông tin, bác sĩ, thiết kế đồ họa..."
                rows={3}
                className="w-full p-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-[#0d6e64] focus:ring-2 focus:ring-[#0d6e64]/20 transition bg-[#fbfdff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brandText uppercase mb-1.5 flex items-center gap-1.5">
                <span>✍️</span> Lời nhắn gửi riêng đến Thầy/Cô chủ nhiệm (nếu có)
              </label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Ví dụ: Em muốn cải thiện môn Tiếng Anh trong năm nay, mong thầy/cô giúp đỡ..."
                rows={2}
                className="w-full p-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-[#0d6e64] focus:ring-2 focus:ring-[#0d6e64]/20 transition bg-[#fbfdff]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingExtension}
                className="px-6 py-3 bg-gradient-to-r from-[#0d6e64] to-[#149d8f] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition text-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {savingExtension ? "Đang lưu..." : "💾 LƯU THÔNG TIN CỦA EM"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: NHẮN TIN VỚI GVCN */}
      {activeTab === "messages" && (
        <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0d6e64] flex items-center gap-2">
              <span>💬</span> Hòm Thư Trao Đổi Riêng Với Giáo Viên Chủ Nhiệm
            </h2>
            <p className="text-xs text-brandText-muted mt-1">
              Em có thể gửi câu hỏi về bài học, chia sẻ tâm tư, thắc mắc hoặc báo cáo tình hình cho thầy/cô chủ nhiệm.
            </p>
          </div>

          {/* Danh sách tin nhắn */}
          <div className="bg-[#f8fcff] border border-line rounded-2xl p-3 sm:p-4 min-h-[220px] max-h-[380px] overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-10 text-xs text-brandText-muted">
                <span>📭</span> Chưa có tin nhắn nào. Em có thể gửi tin nhắn đầu tiên ở bên dưới!
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "student" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="text-[10px] text-brandText-muted mb-0.5 px-1 flex items-center gap-1.5">
                    <strong>{m.sender === "student" ? "Em" : "GVCN"}</strong>
                    <span>·</span>
                    <span>{new Date(m.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                    {m.isConfidential && (
                      <span className="text-amber-600 bg-amber-50 px-1 rounded text-[9px] font-bold">
                        🔒 Bí mật
                      </span>
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      m.sender === "student"
                        ? "bg-[#0d6e64] text-white rounded-br-none"
                        : "bg-white text-brandText border border-[#d8e8f4] rounded-bl-none font-medium"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Khung soạn tin nhắn */}
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div>
              <textarea
                value={msgContent}
                onChange={(e) => setMsgContent(e.target.value)}
                placeholder="Nhập nội dung nhắn gửi thầy/cô chủ nhiệm..."
                rows={3}
                required
                className="w-full p-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-[#0d6e64] focus:ring-2 focus:ring-[#0d6e64]/20 transition bg-[#fbfdff]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-brandText cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="rounded text-[#0d6e64] focus:ring-[#0d6e64] w-4 h-4 cursor-pointer"
                />
                <span>🔒 Đánh dấu tin nhắn riêng tư</span>
              </label>

              <button
                type="submit"
                disabled={sendingMsg || !msgContent.trim()}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#0d6e64] to-[#149d8f] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {sendingMsg ? "Đang gửi..." : "GỬI TIN NHẮN ✉️"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: HỒ SƠ 49 TRƯỜNG CỦA EM */}
      {activeTab === "profile" && student && (
        <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
          <StudentDetailView student={student} />
        </div>
      )}
    </div>
  );
}
