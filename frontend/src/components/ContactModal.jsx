import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";

export default function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await api.post("/contact", formData);
      
      // Show success message
      toast.success("Message sent successfully!", {
        description: "We'll get back to you soon.",
      });

      // Reset form and close modal
      setFormData({ name: "", email: "", message: "" });
      onClose();
    } catch (error) {
      console.error("Contact Form Error:", error);
      toast.error("Failed to send message", {
        description: formatApiError(error.response?.data?.detail),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-semibold text-slate-50">Contact Support</DialogTitle>
          <DialogDescription className="text-slate-400">
            Send us a message and we'll get back to you as soon as possible.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-2 p-3 rounded-lg bg-slate-950/50 border border-slate-800/50 flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,48H32a16,16,0,0,0-16,16V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm-8,144H40V64h176V192Zm-24-96a8,8,0,0,1-8,8H72a8,8,0,0,1,0-16h96A8,8,0,0,1,192,96Zm0,32a8,8,0,0,1-8,8H72a8,8,0,0,1,0-16h96A8,8,0,0,1,192,128Zm0,32a8,8,0,0,1-8,8H72a8,8,0,0,1,0-16h96A8,8,0,0,1,192,160Z" opacity="0.2"></path><path d="M224,40H32A24,24,0,0,0,8,64V192a24,24,0,0,0,24,24H224a24,24,0,0,0,24-24V64A24,24,0,0,0,224,40Zm8,152a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H224a8,8,0,0,1,8,8ZM184,96a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,96Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,128Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,160Z"></path></svg>
          </div>
          <div className="text-xs text-slate-400">
            <span className="font-medium text-slate-300">Support Email:</span>{" "}
            <a 
              href="mailto:support.campusdesk@gmail.com" 
              className="text-emerald-400 hover:text-emerald-300 transition-colors underline decoration-emerald-400/30 underline-offset-2"
            >
              support.campusdesk@gmail.com
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-slate-300">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
              required
              className="bg-slate-950 border-slate-800 text-slate-100 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="bg-slate-950 border-slate-800 text-slate-100 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium text-slate-300">
              Message
            </Label>
            <Textarea
              id="message"
              name="message"
              placeholder="How can we help you?"
              value={formData.message}
              onChange={handleChange}
              required
              className="min-h-[100px] bg-slate-950 border-slate-800 text-slate-100 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-lg shadow-emerald-900/20"
            >
              {isSubmitting ? "Sending..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
