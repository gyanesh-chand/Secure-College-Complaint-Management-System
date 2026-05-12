import { Image as ImageIcon, Video as VideoIcon, File as FileIcon, Play } from "@phosphor-icons/react";

const API_BASE = "http://localhost:8000";

export function EvidenceRenderer({ attachments }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map((path, idx) => {
        const fullUrl = path.startsWith("http") ? path : `${API_BASE}${path}`;
        const isImage = /\.(jpg|jpeg|png|webp)$/i.test(path);
        const isVideo = /\.(mp4|mov|webm)$/i.test(path);

        if (isImage) {
          return (
            <div key={idx} className="relative group w-16 h-16 rounded-md overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer" onClick={() => window.open(fullUrl, "_blank")}>
              <img src={fullUrl} alt="Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ImageIcon size={14} className="text-white" />
              </div>
            </div>
          );
        }

        if (isVideo) {
          return (
            <div key={idx} className="relative group w-16 h-16 rounded-md overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer flex items-center justify-center" onClick={() => window.open(fullUrl, "_blank")}>
              <VideoIcon size={20} weight="duotone" className="text-sky-400" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play size={14} weight="fill" className="text-white" />
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 py-0.5 px-1 text-[8px] text-slate-500 truncate text-center">
                VIDEO
              </div>
            </div>
          );
        }

        return (
          <a key={idx} href={fullUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:bg-slate-700 transition-colors">
            <FileIcon size={12} />
            Attachment {idx + 1}
          </a>
        );
      })}
    </div>
  );
}
