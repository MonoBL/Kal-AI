"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLang } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

type Step = "menu" | "bug" | "feature";

export default function FeedbackWidget() {
  const { t } = useLang();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("menu");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const MAX_SCREENSHOTS = 5;

  const reset = () => {
    setStep("menu");
    setDescription("");
    setScreenshots([]);
    setPreviews([]);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const remaining = MAX_SCREENSHOTS - screenshots.length;
      const newFiles = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, remaining);
      if (newFiles.length === 0) return;

      setScreenshots((prev) => [...prev, ...newFiles]);
      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    },
    [screenshots.length]
  );

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle paste anywhere in the form
  useEffect(() => {
    if (!open || step === "menu") return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addFiles(imageFiles);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [open, step, addFiles]);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSending(true);

    try {
      const formData = new FormData();
      formData.append("type", step === "bug" ? "bug" : "feature");
      formData.append("description", description.trim());
      if (user?.id) formData.append("user_id", user.id);
      if (profile?.email || user?.email) formData.append("email", profile?.email || user?.email || "");
      screenshots.forEach((file) => formData.append("screenshots", file));

      const res = await fetch("/api/feedback", { method: "POST", body: formData });

      if (res.ok) {
        setToast(t.feedbackSent);
        handleClose();
      } else {
        setToast(t.feedbackError);
      }
    } catch {
      setToast(t.feedbackError);
    } finally {
      setSending(false);
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const formType = step === "bug" ? "bug" : "feature";

  if (!user) return null;

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: toast === t.feedbackSent ? "#34C759" : "#FF3B30",
            color: "white",
            padding: "12px 24px",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            zIndex: 10002,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            animation: "fadeInUp 0.3s ease",
          }}
        >
          {toast}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 96,
          right: 76,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#3a3f47",
          color: "white",
          border: "none",
          cursor: "pointer",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          transition: "transform 0.15s",
        }}
        aria-label="Feedback"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 10000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "20px 20px 0 0",
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "20px 20px 32px",
              animation: "slideUp 0.3s ease",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t.feedback}</h2>
              <button
                onClick={handleClose}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#8E8E93", padding: 4 }}
              >
                ✕
              </button>
            </div>

            {/* Step: Menu */}
            {step === "menu" && (
              <>
                <p style={{ textAlign: "center", color: "#636366", fontSize: 15, marginBottom: 20 }}>
                  {t.feedback === "Feedback"
                    ? "What would you like to share?"
                    : "O que gostarias de partilhar?"}
                </p>

                <button onClick={() => setStep("bug")} style={menuButtonStyle}>
                  <div style={{ ...iconCircle, background: "#FFF0F0", color: "#FF3B30" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{t.reportBug}</div>
                    <div style={{ color: "#8E8E93", fontSize: 13, marginTop: 2 }}>{t.reportBugDesc}</div>
                  </div>
                </button>

                <button onClick={() => setStep("feature")} style={{ ...menuButtonStyle, marginTop: 10 }}>
                  <div style={{ ...iconCircle, background: "#F0F0FF", color: "#007AFF" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{t.requestFeature}</div>
                    <div style={{ color: "#8E8E93", fontSize: 13, marginTop: 2 }}>{t.requestFeatureDesc}</div>
                  </div>
                </button>
              </>
            )}

            {/* Step: Bug or Feature form */}
            {(step === "bug" || step === "feature") && (
              <>
                <button
                  onClick={() => setStep("menu")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8E93", fontSize: 14, padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
                >
                  ‹ {t.back}
                </button>

                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 16,
                    background: formType === "bug" ? "#FFF0F0" : "#F0F0FF",
                    color: formType === "bug" ? "#FF3B30" : "#007AFF",
                  }}
                >
                  {formType === "bug" ? t.reportBug : t.requestFeature}
                </span>

                {/* Description */}
                <label style={{ fontSize: 14, fontWeight: 600, color: "#333", display: "block", marginBottom: 6 }}>
                  {formType === "bug" ? t.describeBug : t.describeFeature}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={formType === "bug" ? t.bugPlaceholder : t.featurePlaceholder}
                  style={{
                    width: "100%",
                    minHeight: 100,
                    border: "2px solid #E5E5EA",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 15,
                    resize: "vertical",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#007AFF")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E5EA")}
                />

                {/* Screenshots */}
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
                    {t.attachScreenshots} ({screenshots.length}/{MAX_SCREENSHOTS})
                  </label>

                  {/* Previews */}
                  {previews.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {previews.map((src, i) => (
                        <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                          <img
                            src={src}
                            alt={`Screenshot ${i + 1}`}
                            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #E5E5EA" }}
                          />
                          <button
                            onClick={() => removeScreenshot(i)}
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -6,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "#FF3B30",
                              color: "white",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              lineHeight: 1,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload zone */}
                  {screenshots.length < MAX_SCREENSHOTS && (
                    <div
                      ref={dropZoneRef}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#007AFF"; }}
                      onDragLeave={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = "#E5E5EA";
                        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
                      }}
                      style={{
                        marginTop: 10,
                        border: "2px dashed #E5E5EA",
                        borderRadius: 12,
                        padding: "24px 16px",
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px" }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <div style={{ color: "#8E8E93", fontSize: 13 }}>{t.clickToUploadOrPaste}</div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={!description.trim() || sending}
                  style={{
                    marginTop: 20,
                    width: "100%",
                    padding: "14px",
                    borderRadius: 14,
                    border: "none",
                    background: "#007AFF",
                    color: "white",
                    fontSize: 17,
                    fontWeight: 600,
                    cursor: description.trim() && !sending ? "pointer" : "not-allowed",
                    opacity: description.trim() && !sending ? 1 : 0.4,
                    transition: "opacity 0.15s",
                  }}
                >
                  {sending ? "..." : t.submit}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}

const menuButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "14px 16px",
  border: "1px solid #E5E5EA",
  borderRadius: 14,
  background: "white",
  cursor: "pointer",
  textAlign: "left",
  transition: "background 0.15s",
};

const iconCircle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
