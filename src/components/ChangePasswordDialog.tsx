import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PasswordInput from "@/components/PasswordInput";
import PasswordRequirements from "@/components/PasswordRequirements";
import { isPasswordValid } from "@/lib/passwordValidation";

export default function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const reset = () => { setPassword(""); setConfirm(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(password)) {
      toast({ title: "Password doesn't meet requirements", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated" });
      reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <KeyRound className="h-4 w-4" />
          <span className="hidden sm:inline ml-1.5">Change Password</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <PasswordRequirements password={password} />
          <div className="space-y-1.5">
            <Label>Confirm Password</Label>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
