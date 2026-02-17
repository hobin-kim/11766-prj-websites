import { useState } from "react";
import { useNavigate } from "react-router";
import { Upload, FileJson, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
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
    if (droppedFile && droppedFile.type === "application/json") {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/json") {
      setFile(selectedFile);
    }
  };

  const handleAnalyze = () => {
    if (file) {
      navigate("/analysis");
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
          <p className="text-slate-600">Upload your privacy report to begin network inspection</p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
            ${isDragging 
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
                Drag your privacy report (JSON file) here
              </p>
              <p className="text-sm text-slate-500">or click to browse</p>
            </div>
          )}
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="block w-full h-full absolute inset-0 cursor-pointer"
          />
        </div>

        {file && (
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => setFile(null)}
              variant="outline"
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              onClick={handleAnalyze}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Analyze Report
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
