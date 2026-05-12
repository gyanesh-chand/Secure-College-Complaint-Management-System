import { useState, useRef, useEffect } from "react";
import { api, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { PaperPlaneTilt, UploadSimple, X, Image as ImageIcon, Video as VideoIcon } from "@phosphor-icons/react";

const CATEGORIES = ["Women Safety", "Anti Ragging", "Security", "Infrastructure", "Medical Emergency", "Discipline", "Examination", "Others"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "video/mp4", "video/quicktime"];

export function EditComplaintDialog({ complaint, open, onOpenChange, onUpdated }) {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Infrastructure" });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (complaint && open) {
      setForm({
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
      });
      setExistingAttachments(complaint.attachments || []);
      setFiles([]);
      setPreviews([]);
    }
  }, [complaint, open]);

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
      
      if (file.type.startsWith("image/")) {
        newPreviews.push({ name: file.name, url: URL.createObjectURL(file), type: "image" });
      } else {
        newPreviews.push({ name: file.name, url: null, type: "video" });
      }
    });

    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewFile = (index) => {
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
      const { data } = await api.patch(`/complaints/${complaint.id}`, formData);
      toast.success("Complaint updated successfully");
      onUpdated(data);
      onOpenChange(false);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-slim">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Complaint</DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            You can modify your complaint within 10 minutes of submission.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-slate-950 border-slate-800 text-slate-100"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" sideOffset={4} className="bg-slate-900 border-slate-800 text-slate-100">
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Description</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-slate-950 border-slate-800 text-slate-100 resize-none"
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="text-slate-300">Add more evidence</Label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-slate-950/30 hover:bg-slate-900/50 cursor-pointer group transition-all"
            >
              <UploadSimple size={20} className="text-slate-500 group-hover:text-emerald-400" />
              <p className="text-xs text-slate-400">Click to upload more files</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".jpg,.jpeg,.png,.mp4,.mov" className="hidden" />
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {previews.map((file, i) => (
                  <div key={i} className="relative group rounded border border-slate-800 bg-slate-950 p-1">
                    <button type="button" onClick={() => removeNewFile(i)} className="absolute -top-1 -right-1 z-10 p-0.5 rounded-full bg-rose-500 text-white shadow-lg">
                      <X size={10} weight="bold" />
                    </button>
                    <div className="aspect-video rounded overflow-hidden flex items-center justify-center">
                      {file.type === "image" ? <img src={file.url} alt="preview" className="w-full h-full object-cover" /> : <VideoIcon size={20} className="text-sky-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8">
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
