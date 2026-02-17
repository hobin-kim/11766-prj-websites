import { useState } from "react";
import { UploadPanel } from "./components/upload-panel";
import { AnalysisPanel } from "./components/analysis-panel";
import { AnalysisPage as ChatbotPanel } from "./components/chatbot-panel";

export default function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setIsAnalyzed(false);
  };

  const handleAnalyze = () => {
    setIsAnalyzed(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl text-slate-900">Privacy Inspector</h1>
          <p className="text-sm text-slate-600">Network Analysis & AI Assistant</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-4">
          <UploadPanel 
            onFileUpload={handleFileUpload}
            onAnalyze={handleAnalyze}
            uploadedFile={uploadedFile}
          />
          <AnalysisPanel isAnalyzed={isAnalyzed} />
          <ChatbotPanel />
        </div>
      </div>
    </div>
  );
}