import * as React from "react"
import { Eye, EyeSlash } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

const PasswordInput = React.forwardRef(({ className, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className="relative group">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-11", className)}
        ref={ref}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-all duration-200 focus:outline-none"
        tabIndex={-1}
        title={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeSlash size={20} weight="duotone" className="transition-transform group-hover:scale-110" />
        ) : (
          <Eye size={20} weight="duotone" className="transition-transform group-hover:scale-110" />
        )}
      </button>
    </div>
  )
})
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
