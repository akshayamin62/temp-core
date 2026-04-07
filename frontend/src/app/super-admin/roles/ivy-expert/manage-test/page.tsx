"use client";

import { useState, useEffect } from "react";
import ivyApi from "@/lib/ivyApi";
import AuthImage from '@/components/AuthImage';
import { fetchBlobUrl } from '@/lib/useBlobUrl';

/* ────────────────────────── Types ─────────────────────────────────── */

interface Option {
  label: string;
  text: string;
}

interface Question {
  _id: string;
  section: string;
  questionText: string;
  questionImageUrl?: string | null;
  options: Option[];
  correctOption: string;
  explanation?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SectionCount {
  _id: string;
  count: number;
}

/* ────────────────────────── Constants ─────────────────────────────── */

const SECTIONS = [
  "Global Awareness",
  "Critical Thinking",
  "Academic Aptitude",
  "Quantitative Logic",
] as const;

const SECTION_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  "Global Awareness":   { icon: "🌍", color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200" },
  "Critical Thinking":  { icon: "💡", color: "text-purple-700",  bg: "bg-purple-50",  border: "border-purple-200" },
  "Academic Aptitude":  { icon: "📊", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  "Quantitative Logic": { icon: "🧮", color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200" },
};

const OPTION_LABELS = ["A", "B", "C", "D"];

const EMPTY_FORM = {
  section: "Global Awareness",
  questionText: "",
  explanation: "",
  correctOption: "A",
  options: OPTION_LABELS.map((l) => ({ label: l, text: "" })),
};

/* ──────────────────────── Component ──────────────────────────────── */

export default function ManageTestPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sectionCounts, setSectionCounts] = useState<SectionCount[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterSection, setFilterSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  /* ── Fetch ────────────────────────────────────────────────────── */

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(""); setError(""); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const fetchQuestions = async () => {
    setFetching(true);
    try {
      const res = await ivyApi.get("/test-questions");
      if (res.data.success) {
        setQuestions(res.data.data);
        setSectionCounts(res.data.sectionCounts || []);
      }
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setFetching(false);
    }
  };

  /* ── Submit ───────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.questionText.trim()) { setError("Question text is required"); return; }

    const filledOptions = formData.options.filter((o) => o.text.trim());
    if (filledOptions.length < 2) { setError("At least 2 options must be filled"); return; }

    // Check correct option exists among filled options
    const filled = filledOptions.map((o) => o.label);
    if (!filled.includes(formData.correctOption)) {
      setError(`Correct option "${formData.correctOption}" has no text. Please fill it in or choose another.`);
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("section", formData.section);
      fd.append("questionText", formData.questionText);
      fd.append("correctOption", formData.correctOption);
      fd.append("explanation", formData.explanation);
      fd.append("options", JSON.stringify(filledOptions));
      if (selectedImage) fd.append("questionImage", selectedImage);

      const res = editingId
        ? await ivyApi.put(`/test-questions/${editingId}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
        : await ivyApi.post("/test-questions", fd, { headers: { "Content-Type": "multipart/form-data" } });

      if (res.data.success) {
        setSuccess(editingId ? "Question updated successfully!" : "Question added successfully!");
        resetForm();
        fetchQuestions();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create question");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM, options: OPTION_LABELS.map((l) => ({ label: l, text: "" })) });
    setSelectedImage(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setEditingId(null);
    setShowForm(false);
  };

  /* ── Delete ───────────────────────────────────────────────────── */

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setDeletingId(id);
    try {
      const res = await ivyApi.delete(`/test-questions/${id}`);
      if (res.data.success) { setSuccess("Question deleted"); fetchQuestions(); }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete question");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Toggle Active ────────────────────────────────────────────── */

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await ivyApi.patch(`/test-questions/${id}/toggle`);
      if (res.data.success) {
        setQuestions((prev) =>
          prev.map((q) => (q._id === id ? { ...q, isActive: res.data.data.isActive } : q)),
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to toggle question");
    } finally {
      setTogglingId(null);
    }
  };

  /* ── Edit ────────────────────────────────────────────────────── */

  const handleEdit = (q: Question) => {
    setEditingId(q._id);
    setFormData({
      section: q.section,
      questionText: q.questionText,
      explanation: q.explanation || "",
      correctOption: q.correctOption,
      options: OPTION_LABELS.map((l) => {
        const existing = q.options.find((o) => o.label === l);
        return existing || { label: l, text: "" };
      }),
    });
    setExistingImageUrl(q.questionImageUrl || null);
    setSelectedImage(null);
    setImagePreview(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Image preview ────────────────────────────────────────────── */

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  /* ── Filter ───────────────────────────────────────────────────── */

  const filtered = questions.filter((q) => {
    const matchSec = !filterSection || q.section === filterSection;
    const matchSearch =
      !searchQuery ||
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSec && matchSearch;
  });

  /* ── Counts helpers ───────────────────────────────────────────── */

  const getCount = (sec: string) => sectionCounts.find((s) => s._id === sec)?.count ?? 0;
  const totalQuestions = sectionCounts.reduce((acc, s) => acc + s.count, 0);

  /* ── RENDER ───────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Test Questions</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Ivy League Readiness Test — {totalQuestions} questions
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (showForm) { resetForm(); }
                else { setFormData({ ...EMPTY_FORM, options: OPTION_LABELS.map((l) => ({ label: l, text: "" })) }); setEditingId(null); setExistingImageUrl(null); setSelectedImage(null); setImagePreview(null); setShowForm(true); }
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md ${
                showForm
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-none"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-200"
              }`}
            >
              {showForm ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {editingId ? "Cancel Edit" : "Close Form"}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Question
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast */}
        {(error || success) && (
          <div className={`mb-6 flex items-center gap-3 p-4 rounded-xl border shadow-sm ${
            error ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${error ? "bg-red-100" : "bg-emerald-100"}`}>
              {error ? (
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              )}
            </span>
            <span className="text-sm font-medium">{error || success}</span>
          </div>
        )}

        {/* ── Add Question Form ──────────────────────────────────── */}
        {showForm && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
                {editingId ? "Edit Question" : "Add New Question"}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {editingId ? "Update the question details below" : "Fill in the details to add a question to the Ivy League test"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Row 1: Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50 hover:bg-white transition-colors"
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>{SECTION_META[s].icon} {s}</option>
                  ))}
                </select>
              </div>

              {/* Row 2: Question Text */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  placeholder="Type the question here..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50 hover:bg-white transition-colors resize-none"
                />
              </div>

              {/* Row 3: Question Image (optional) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Question Image <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex items-start gap-4">
                  <label className="flex-shrink-0 cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {existingImageUrl && !imagePreview ? "Replace Image" : "Choose Image"}
                    </div>
                  </label>
                  {/* New image preview */}
                  {imagePreview && (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="h-24 rounded-lg border border-gray-200 object-contain" />
                      <button
                        type="button"
                        onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {/* Existing image in edit mode */}
                  {existingImageUrl && !imagePreview && (
                    <div className="relative">
                      <AuthImage path={existingImageUrl} alt="Current" className="h-24 rounded-lg border border-gray-200 object-contain" />
                      <span className="absolute -top-2 -left-2 text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-semibold">Current</span>
                    </div>
                  )}
                  {selectedImage && !imagePreview && (
                    <span className="text-sm text-gray-500 py-2">{selectedImage.name}</span>
                  )}
                </div>
              </div>

              {/* Row 4: Options */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Options <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-2">(fill at least 2)</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.options.map((opt, idx) => (
                    <div key={opt.label} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, correctOption: opt.label })}
                        className={`flex-shrink-0 w-9 h-9 rounded-lg font-bold text-sm border-2 transition-all ${
                          formData.correctOption === opt.label
                            ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-200"
                            : "bg-white border-gray-200 text-gray-500 hover:border-green-300"
                        }`}
                        title={formData.correctOption === opt.label ? "Correct answer" : "Click to mark as correct"}
                      >
                        {opt.label}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...formData.options];
                          newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                          setFormData({ ...formData, options: newOpts });
                        }}
                        placeholder={`Option ${opt.label}`}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50 hover:bg-white transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <span className="inline-block w-4 h-4 rounded bg-green-500 text-white text-[10px] flex items-center justify-center font-bold">✓</span>
                  Click the option letter to mark it as the correct answer
                </p>
              </div>

              {/* Row 5: Explanation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Explanation <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Explain why the correct answer is right..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50 hover:bg-white transition-colors resize-none"
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {editingId ? "Updating..." : "Saving..."}</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {editingId ? "Update Question" : "Save Question"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Section Overview Cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {SECTIONS.map((sec) => {
            const m = SECTION_META[sec];
            const cnt = getCount(sec);
            const isActive = filterSection === sec;
            return (
              <button
                key={sec}
                onClick={() => setFilterSection(isActive ? null : sec)}
                className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                  isActive ? `${m.bg} ${m.border} shadow-md` : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{m.icon}</span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? m.color : "text-gray-400"}`}>
                    Section {SECTIONS.indexOf(sec) + 1}
                  </span>
                </div>
                <p className={`text-sm font-semibold ${isActive ? m.color : "text-gray-700"} truncate`}>{sec}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-500">{cnt} Qs</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Search bar ─────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* ── Questions list ──────────────────────────────────────── */}
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No questions found</h3>
            <p className="text-sm text-gray-500">
              {questions.length === 0
                ? 'Click "Add Question" to create your first test question.'
                : "Try adjusting your search or section filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((q, idx) => {
              const m = SECTION_META[q.section] || SECTION_META["Global Awareness"];
              const isExpanded = expandedId === q._id;
              return (
                <div
                  key={q._id}
                  className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
                    !q.isActive ? "opacity-60 border-gray-200" : "border-gray-100 shadow-sm hover:shadow-md"
                  }`}
                >
                  {/* Row */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : q._id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : q._id); }}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {/* Section badge */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${m.bg} ${m.border} border flex items-center justify-center text-lg`}>
                      {m.icon}
                    </div>
                    {/* Question text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{q.questionText}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-gray-400">{q.options.length} options</span>
                        {!q.isActive && <span className="text-[10px] font-bold text-red-500 uppercase">Inactive</span>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggle(q._id)}
                        disabled={togglingId === q._id}
                        title={q.isActive ? "Deactivate" : "Activate"}
                        className={`p-2 rounded-lg border transition-colors ${
                          q.isActive
                            ? "border-green-200 text-green-600 hover:bg-green-50"
                            : "border-gray-200 text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {togglingId === q._id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : q.isActive ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(q)}
                        title="Edit"
                        className="p-2 rounded-lg border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(q._id)}
                        disabled={deletingId === q._id}
                        title="Delete"
                        className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                      >
                        {deletingId === q._id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        )}
                      </button>
                    </div>
                    {/* Chevron */}
                    <svg
                      className={`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                      {/* Full question */}
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Question</p>
                        <p className="text-gray-900">{q.questionText}</p>
                      </div>

                      {/* Image */}
                      {q.questionImageUrl && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Image</p>
                          <AuthImage
                            path={q.questionImageUrl}
                            alt="Question"
                            className="max-h-48 rounded-lg border border-gray-200 object-contain"
                          />
                        </div>
                      )}

                      {/* Options */}
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Options</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((o) => (
                            <div
                              key={o.label}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                                o.label === q.correctOption
                                  ? "bg-green-50 border-green-300 text-green-800 font-semibold"
                                  : "bg-gray-50 border-gray-200 text-gray-700"
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                                o.label === q.correctOption ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                              }`}>
                                {o.label}
                              </span>
                              {o.text}
                              {o.label === q.correctOption && (
                                <svg className="w-4 h-4 ml-auto text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Explanation</p>
                          <p className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">{q.explanation}</p>
                        </div>
                      )}

                      {/* Mobile actions */}
                      <div className="flex sm:hidden items-center gap-2 pt-2">
                        <button
                          onClick={() => handleEdit(q)}
                          className="flex-1 py-2 rounded-lg text-sm font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(q._id)}
                          disabled={togglingId === q._id}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            q.isActive ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-green-200 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {q.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(q._id)}
                          disabled={deletingId === q._id}
                          className="flex-1 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>

                      <p className="text-[10px] text-gray-400 pt-1">
                        Created: {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
