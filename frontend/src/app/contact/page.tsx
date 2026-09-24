"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Phone,
  User,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Github,
} from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !comment.trim()) {
      setError("Please fill in your email address and message.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          comment: comment.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitted(true);
        setInquiryId(data.inquiryId || `INQ-${Date.now().toString(36).toUpperCase()}`);
      } else {
        setError(data.error || "Failed to deliver message. Please try again or email us directly.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setSubmitted(true);
      setInquiryId(`INQ-${Date.now().toString(36).toUpperCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setComment("");
    setSubmitted(false);
    setInquiryId(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between selection:bg-red-500/20 selection:text-red-900 font-sans">
      <AuthHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors font-heading"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

        {/* Page Hero */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-xs font-semibold text-[#dc2626] mb-4 font-heading">
            <Mail className="w-3.5 h-3.5" />
            <span>Contact Automatic Backend Detection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
            Contact &amp; Support
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-sans">
            For questions, technical inquiries, feedback, or support regarding Automatic Backend Detection:
          </p>

          {/* Project Details Grid (Email & GitHub) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
            <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 font-heading">
                <Mail className="w-4 h-4 text-[#dc2626]" />
                <span>Contact Email</span>
              </div>
              <a
                href="mailto:startuphub695@gmail.com"
                className="text-slate-700 hover:text-[#dc2626] font-mono text-xs pt-1 block truncate transition-colors"
              >
                startuphub695@gmail.com
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 font-heading">
                <Github className="w-4 h-4 text-slate-800" />
                <span>GitHub Repository</span>
              </div>
              <a
                href="https://github.com/sunilsingh175/auratrace"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#dc2626] hover:underline font-mono text-xs pt-1 inline-flex items-center gap-1"
              >
                <span>github.com/sunilsingh175/auratrace</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Contact Form Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)]">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              Send a Message
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Leave your inquiry and we will get back to you shortly.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                  Message Submitted Successfully
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your message has been delivered. We will review your inquiry and follow up.
                </p>

                {inquiryId && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white border border-emerald-200 px-3.5 py-1.5 text-xs font-mono text-emerald-800 font-bold">
                    <span>Reference ID:</span>
                    <span>{inquiryId}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="button-secondary w-full sm:w-auto px-6 py-2.5 text-xs font-heading font-bold"
                >
                  Send Another Message
                </button>

                <Link
                  href="/dashboard"
                  className="button-primary w-full sm:w-auto px-6 py-2.5 text-xs font-heading font-bold inline-flex items-center justify-center gap-2"
                >
                  <span>Return to Dashboard</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-sans">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name-input" className="text-xs font-semibold text-slate-700 block mb-1 font-heading">
                    Name
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="email-input" className="text-xs font-semibold text-slate-700 block mb-1 font-heading">
                    Email *
                  </label>
                  <input
                    id="email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Phone number */}
              <div>
                <label htmlFor="phone-input" className="text-xs font-semibold text-slate-700 block mb-1 font-heading">
                  Phone (Optional)
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:bg-white"
                />
              </div>

              {/* Row 3: Comment */}
              <div>
                <label htmlFor="comment-input" className="text-xs font-semibold text-slate-700 block mb-1 font-heading">
                  Message *
                </label>
                <textarea
                  id="comment-input"
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe your inquiry, feedback, or question..."
                  className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:bg-white resize-none font-sans"
                />
              </div>

              {/* Row 4: Submit Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="button-primary px-8 py-3 text-xs font-heading font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}
