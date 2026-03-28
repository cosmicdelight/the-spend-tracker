import { useRef, useState } from "react";
import { Paperclip, X, FileText, Image, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  useTransactionAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  getSignedAttachmentUrl,
  MAX_FILES,
  type TransactionAttachment,
} from "@/hooks/useTransactionAttachments";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";

interface Props {
  transactionId: string | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ contentType }: { contentType: string }) {
  if (contentType === "application/pdf") return <FileText className="h-4 w-4 shrink-0 text-destructive" />;
  return <Image className="h-4 w-4 shrink-0 text-primary" />;
}

export default function TransactionAttachments({ transactionId }: Props) {
  const { data: attachments = [], isLoading } = useTransactionAttachments(transactionId);
  const upload = useUploadAttachment();
  const remove = useDeleteAttachment();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);

  const canUpload = attachments.length < MAX_FILES;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !transactionId) return;
    const remaining = MAX_FILES - attachments.length;
    const toUpload = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      try {
        await upload.mutateAsync({ transactionId, file });
      } catch (err) {
        toast({ title: "Upload failed", description: getErrorMessage(err), variant: "destructive" });
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = (attachment: TransactionAttachment) => {
    remove.mutate(
      { attachment },
      { onError: (err) => toast({ title: "Delete failed", description: getErrorMessage(err), variant: "destructive" }) }
    );
  };

  const handleOpen = async (attachment: TransactionAttachment) => {
    setOpeningFile(attachment.id);
    try {
      const url = await getSignedAttachmentUrl(attachment.file_path);
      window.open(url, "_blank");
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setOpeningFile(null);
    }
  };

  if (!transactionId) return null;

  return (
    <div className="space-y-1.5">
      <Label>Attachments (optional)</Label>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <>
          {attachments.length > 0 && (
            <div className="space-y-1">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                  <FileIcon contentType={att.content_type} />
                  <button
                    type="button"
                    className="flex-1 truncate text-left hover:underline"
                    onClick={() => handleOpen(att)}
                    disabled={openingFile === att.id}
                  >
                    {att.file_name}
                  </button>
                  <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.file_size)}</span>
                  {openingFile === att.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <button type="button" onClick={() => handleOpen(att)} className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(att)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={remove.isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {canUpload && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
                {upload.isPending ? "Uploading…" : "Add file"}
              </Button>
              <p className="text-xs text-muted-foreground">
                PDF, JPG, PNG · max 10 MB · {attachments.length}/{MAX_FILES}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
