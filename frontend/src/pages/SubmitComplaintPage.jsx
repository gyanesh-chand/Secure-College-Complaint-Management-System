import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { PaperPlaneTilt, UploadSimple, X, Image as ImageIcon, Video as VideoIcon, File as FileIcon } from "@phosphor-icons/react";

const CATEGORIES = ["Women Safety", "Anti Ragging", "Security", "Infrastructure", "Medical Emergency", "Discipline", "Examination", "Others"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "video/mp4", "video/quicktime"];

export default function SubmitComplaintPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Infrastructure" });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];
    const newPreviews = [];

    selectedFiles.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 10MB limit`);
        return;
      }
      validFiles.push(file);
      
      // Create preview
      if (file.type.startsWith("image/")) {
        newPreviews.push({ name: file.name, url: URL.createObjectURL(file), type: "image" });
      } else {
        newPreviews.push({ name: file.name, url: null, type: "video" });
      }
    });

    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    
    // Reset input value so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index) => {
    const fileToRemove = previews[index];
    if (fileToRemove.url) URL.revokeObjectURL(fileToRemove.url);
    
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.title.length < 3) return toast.error("Title is too short");
    if (form.description.length < 5) return toast.error("Description is too short");
    
    setSubmitting(true);
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("category", form.category);
    
    files.forEach((file) => {
      formData.append("attachments", file);
    });

    try {
      await api.post("/complaints", formData);
      toast.success("Complaint submitted successfully");
      navigate("/complaints");
    } catch (e) {
      console.error("Submission failed:", e);
      if (e.response) {
        console.error("Response data:", e.response.data);
        console.error("Response status:", e.response.status);
      } else if (e.request) {
        console.error("Request was made but no response received:", e.request);
      } else {
        console.error("Error setting up request:", e.message);
      }
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20" data-testid="submit-page">
      <div className="label-caps">New submission</div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-2 text-slate-50">File a complaint</h1>
      <p className="text-slate-400 text-sm mt-2">
        Describe the issue clearly. Staff will be notified and review it shortly.
      </p>

      <form onSubmit={onSubmit} className="mt-8 panel p-6 md:p-8 space-y-6 bg-slate-900/40 border-slate-800" data-testid="submit-complaint-form">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-slate-300">Title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Wi-Fi outage in Block C"
            data-testid="complaint-title-input"
            className="bg-slate-950 border-slate-800 h-11 text-slate-100"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-slate-100" data-testid="complaint-category-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4} className="bg-slate-900 border-slate-800 text-slate-100">
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc" className="text-slate-300">Description</Label>
          <Textarea
            id="desc"
            rows={6}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Provide details: what happened, when, location, any reference IDs…"
            data-testid="complaint-description-input"
            className="bg-slate-950 border-slate-800 resize-none text-slate-100"
            required
          />
        </div>

        <div className="space-y-3">
          <Label className="text-slate-300">Upload Evidence (Photo/Video)</Label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center gap-3 bg-slate-950/30 hover:bg-slate-900/50 hover:border-slate-700 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all">
              <UploadSimple size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-300 font-medium">Click to upload files</p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, MP4 or MOV (max 10MB each)</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple 
              accept=".jpg,.jpeg,.png,.mp4,.mov"
              className="hidden" 
            />
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              {previews.map((file, i) => (
                <div key={i} className="relative group rounded-lg border border-slate-800 bg-slate-900/50 p-2 overflow-hidden">
                  <button 
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 z-10 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X size={14} weight="bold" />
                  </button>
                  <div className="aspect-video rounded-md bg-slate-950 flex items-center justify-center overflow-hidden">
                    {file.type === "image" ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <VideoIcon size={32} weight="duotone" className="text-sky-400" />
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 px-1">
                    {file.type === "image" ? <ImageIcon size={14} className="text-emerald-400" /> : <VideoIcon size={14} className="text-sky-400" />}
                    <span className="text-[10px] text-slate-400 truncate">{file.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-slate-400 hover:text-slate-200" data-testid="cancel-submit">
            Cancel
          </button>
          <Button type="submit" disabled={submitting} data-testid="submit-complaint-btn"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium px-6">
            <PaperPlaneTilt size={18} className="mr-1.5" />
            {submitting ? "Submitting…" : "Submit complaint"}
          </Button>
        </div>
      </form>
    </div>
  );
}
