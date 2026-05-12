import React, { useState } from "react";
import { Envelope } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import ContactModal from "./ContactModal";

const ALLOWED_ROLES = ["student", "staff"];

export default function ContactButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const role = user?.role;

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return null;
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed right-5 bottom-5 z-[100] rounded-full px-5 py-6 shadow-2xl shadow-slate-950/60 border border-slate-700 text-slate-100 bg-slate-900/95 hover:bg-slate-800 transition-all hover:scale-105"
        data-testid="contact-us-button"
      >
        <Envelope size={20} weight="duotone" className="mr-2" />
        <span className="font-medium">Contact Us</span>
      </Button>
      
      <ContactModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
