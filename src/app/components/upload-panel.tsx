import { useState } from "react";
import { Upload, FileJson, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface UploadPanelProps {
  onFileUpload: (file: File) => void;
  onAnalyze: () => void;
  uploadedFile: File | null;
}

export function UploadPanel({ onFileUpload, onAnalyze, uploadedFile }: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);

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
    if (droppedFile && (droppedFile.name.endsWith('.ndjson') || droppedFile.name.endsWith('.jsonl'))) {
      onFileUpload(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.name.endsWith('.ndjson') || selectedFile.name.endsWith('.jsonl'))) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <Card className="bg-white border-slate-200 p-5 flex flex-col h-[500px] shadow-sm">
      <div className="mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg mb-2">
          <FileJson className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-xl text-slate-900 mb-1">Upload Report</h2>
        <p className="text-xs text-slate-600">NDJSON format</p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer w-full
            ${isDragging 
              ? "border-blue-500 bg-blue-50" 
              : uploadedFile 
                ? "border-green-500 bg-green-50" 
                : "border-slate-300 hover:border-slate-400 bg-slate-50"
            }
          `}
        >
          {uploadedFile ? (
            <div className="space-y-2">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
              <p className="text-green-700 text-xs break-all px-2">{uploadedFile.name}</p>
              <p className="text-xs text-slate-600">
                {(uploadedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-700">
                Drag your privacy report here
              </p>
              <p className="text-xs text-slate-500">.ndjson or .jsonl file</p>
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
      </div>

      {uploadedFile && (
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => onFileUpload(null as any)}
            variant="outline"
            className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100"
            size="sm"
          >
            Clear
          </Button>
          <Button
            onClick={onAnalyze}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            Analyze
          </Button>
        </div>
      )}

      {/* Sample Data Info */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-600 mb-2">Sample NDJSON format:</p>
        <pre className="text-xs text-slate-700 bg-slate-50 p-2 rounded overflow-x-auto border border-slate-200">
{`{"accessor":{"identifier":"com.apple.weather"},"category":"location","kind":"intervalBegin"}
{"accessor":{"identifier":"com.apple.mobilemail"},"category":"contacts","kind":"intervalEnd"}`}
        </pre>
      </div>
    </Card>
  );
}