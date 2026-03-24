import { useState } from "react";
import { useNavigate } from "react-router";
import { Upload, FileJson, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

const API_BASE = "http://localhost:8000";

export function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const isValidFile = (f: File) =>
    f.name.endsWith(".ndjson") || f.name.endsWith(".jsonl");

  const handleAnalyze = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Server error: ${res.status}`);
      }

      const data = await res.json();
      navigate(`/analysis?reportId=${data.report_id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to backend."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8 bg-white shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <FileJson className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl mb-2">Privacy Report Analysis</h1>
          <p className="text-slate-600">
            Upload your privacy report to begin inspection
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
            ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : file
                  ? "border-green-500 bg-green-50"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50"
            }
          `}
        >
          {file ? (
            <div className="space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <p className="text-green-700">{file.name}</p>
              <p className="text-sm text-slate-600">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-slate-700">
                Drag your privacy report (.ndjson) here
              </p>
              <p className="text-sm text-slate-500">or click to browse</p>
            </div>
          )}
          <input
            type="file"
            accept=".ndjson,.jsonl"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="block w-full h-full absolute inset-0 cursor-pointer"
          />
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        {file && (
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => {
                setFile(null);
                setError(null);
              }}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Clear
            </Button>
            <Button
              onClick={handleAnalyze}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Report"
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
