"use client";

import React, { useState } from "react";
import { AuthSession } from "@/lib/types";

interface Props {
  onSuccess: (user: AuthSession) => void;
}

export function AuthModal({ onSuccess }: Props) {
  const [tab, setTab] = useState<"teacher" | "student">("teacher");

  // State giáo viên (Không điền sẵn)
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPin, setTeacherPin] = useState("");

  // State học sinh (Chỉ cần CCCD)
  const [studentCccd, setStudentCccd] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: teacherEmail, pin: teacherPin }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Đăng nhập thất bại.");
      }

      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cccd: studentCccd }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Đăng nhập thất bại.");
      }

      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-line overflow-hidden">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mx-auto text-2xl mb-2.5 border border-[#d3e9f9]">
            {tab === "teacher" ? "👩‍🏫" : "🎓"}
          </div>
          <h2 className="text-lg font-bold text-primary-dark uppercase tracking-tight">
            {tab === "teacher" ? "Đăng Nhập Cổng Giáo Viên" : "Đăng Nhập Cổng Học Sinh 8A6"}
          </h2>
          <p className="text-xs text-brandText-muted mt-0.5">
            {tab === "teacher"
              ? "Dành cho Giáo viên Chủ nhiệm quản lý và đánh giá học sinh"
              : "Học sinh nhập số Căn cước công dân (CCCD) để vào xem hồ sơ"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#eef6fc] p-1 rounded-xl mb-4 border border-[#d6e8f5]">
          <button
            type="button"
            onClick={() => {
              setTab("teacher");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "teacher"
                ? "bg-white text-primary shadow-sm"
                : "text-brandText-muted hover:text-brandText"
            }`}
          >
            <span>👩‍🏫</span> Giáo viên
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("student");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "student"
                ? "bg-white text-primary shadow-sm"
                : "text-brandText-muted hover:text-brandText"
            }`}
          >
            <span>🎓</span> Học sinh (CCCD)
          </button>
        </div>

        {error && (
          <div className="p-3 mb-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl leading-relaxed">
            {error}
          </div>
        )}

        {/* TAB GIÁO VIÊN */}
        {tab === "teacher" ? (
          <form onSubmit={handleTeacherSubmit} className="space-y-3 text-left">
            <div>
              <label className="block text-xs font-bold text-brandText uppercase mb-1">
                Tài khoản Email giáo viên
              </label>
              <input
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                required
                placeholder="Nhập email giáo viên (ví dụ: letambp2003@gmail.com)"
                className="w-full h-11 px-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition bg-[#fbfdff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brandText uppercase mb-1">
                Mật khẩu giáo viên
              </label>
              <input
                type="password"
                value={teacherPin}
                onChange={(e) => setTeacherPin(e.target.value)}
                required
                placeholder="Nhập mật khẩu"
                className="w-full h-11 px-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition bg-[#fbfdff]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !teacherEmail.trim() || !teacherPin.trim()}
                className="w-full h-11 bg-gradient-to-r from-primary to-primary-hover text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  "ĐĂNG NHẬP GIÁO VIÊN"
                )}
              </button>
            </div>
          </form>
        ) : (
          /* TAB HỌC SINH (GỌN GÀNG - KHÔNG CÓ MẪU THỬ) */
          <form onSubmit={handleStudentSubmit} className="space-y-3.5 text-left">
            <div>
              <label className="block text-xs font-bold text-brandText uppercase mb-1">
                Số Căn cước công dân (CCCD) của học sinh
              </label>
              <input
                type="text"
                value={studentCccd}
                onChange={(e) => setStudentCccd(e.target.value)}
                required
                placeholder="Nhập 12 chữ số CCCD"
                maxLength={12}
                className="w-full h-11 px-3.5 text-sm border border-[#c9deed] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition bg-[#fbfdff] tracking-wider"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading || !studentCccd.trim()}
                className="w-full h-11 bg-gradient-to-r from-[#0d6e64] to-[#149d8f] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  "XÁC THỰC & VÀO HỒ SƠ HỌC SINH"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
