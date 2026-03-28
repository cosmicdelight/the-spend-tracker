import { useRef } from "react";
import { Paperclip, X, FileText, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type === "application/pdf") return <FileText className="h-4 w-4 shrink-0 text-destructive" />;
  return <Image className="h-4 w-4 shrink-0 text-primary" />;
}

export default function StagedAttachments({ files, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = (fileList: FileList | null) => {
    if (!fileList) return;
    const remaining = MAX_FILES - files.length;
    const valid = Array.from(fileList)
      .filter((f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE)
      .slice(0, remaining);
    onChange([...files, ...valid]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      <Label className="block">Attachments (optional)</Label>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
              <FileIcon type={file.type} />
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatSize(file.size)}</span>
              <button type="button" onClick={() => handleRemove(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < MAX_FILES && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            className="hidden"
            onChange={(e) => handleAdd(e.target.files)}
          />
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
            <Paperclip className="h-3.5 w-3.5" />
            Add file
          </Button>
          <p className="text-xs text-muted-foreground">
            PDF, JPG, PNG · max 10 MB · {files.length}/{MAX_FILES}
          </p>
        </>
      )}
    </div>
  );
}
