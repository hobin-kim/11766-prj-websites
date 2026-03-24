import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  MessageSquare,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";

const API_BASE = "http://localhost:8000";

interface AppAccess {
  id: number;
  bundle_id: string;
  app_name: string;
  categories: Record<string, number>;
  access_count: number;
  risk_score: number;
  status: "normal" | "warning" | "suspicious";
  analysis: string;
  sample_entry: string | null;
}

interface ReportData {
  report_id: number;
  filename: string;
  app_accesses: AppAccess[];
}

export function AnalysisPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("reportId");

  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setError("No report ID provided. Please upload a file first.");
      setIsLoading(false);
      return;
    }

    fetch(`${API_BASE}/reports/${reportId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load report (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setReport(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [reportId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "normal":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "suspicious":
        return <Shield className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "suspicious":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      location: "bg-blue-100 text-blue-700 border-blue-200",
      contacts: "bg-purple-100 text-purple-700 border-purple-200",
      photos: "bg-pink-100 text-pink-700 border-pink-200",
      camera: "bg-orange-100 text-orange-700 border-orange-200",
      microphone: "bg-teal-100 text-teal-700 border-teal-200",
    };
    return colors[category] ?? "bg-slate-100 text-slate-700 border-slate-200";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading analysis...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 bg-white text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg text-slate-800 mb-2">Could not load report</h2>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700">
            Back to Upload
          </Button>
        </Card>
      </div>
    );
  }

  const accesses = report.app_accesses;
  const stats = {
    total: accesses.length,
    normal: accesses.filter((a) => a.status === "normal").length,
    warning: accesses.filter((a) => a.status === "warning").length,
    suspicious: accesses.filter((a) => a.status === "suspicious").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl mb-1">Network Inspection Report</h1>
              <p className="text-slate-500 text-sm">{report.filename}</p>
            </div>
            <Button
              onClick={() => navigate(`/chatbot?reportId=${reportId}`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Ask AI Assistant
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white">
            <div className="text-sm text-slate-600 mb-1">Total Apps</div>
            <div className="text-2xl">{stats.total}</div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="text-sm text-slate-600 mb-1">Normal</div>
            <div className="text-2xl text-green-600">{stats.normal}</div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="text-sm text-slate-600 mb-1">Warnings</div>
            <div className="text-2xl text-yellow-600">{stats.warning}</div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="text-sm text-slate-600 mb-1">Suspicious</div>
            <div className="text-2xl text-red-600">{stats.suspicious}</div>
          </Card>
        </div>

        {/* Inspection Results */}
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="space-y-4 pr-4">
            {accesses.map((app) => (
              <Card
                key={app.id}
                className="p-6 bg-white hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getStatusIcon(app.status)}</div>

                  <div className="flex-1">
                    {/* App name */}
                    <div className="mb-2">
                      <p className="text-base text-slate-900">{app.app_name}</p>
                      <code className="text-xs text-slate-500">{app.bundle_id}</code>
                    </div>

                    {/* Status + categories */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className={getStatusColor(app.status)}
                      >
                        {app.status.toUpperCase()}
                      </Badge>
                      {Object.entries(app.categories).map(([cat, count]) => (
                        <Badge
                          key={cat}
                          variant="outline"
                          className={`text-xs border ${getCategoryColor(cat)}`}
                        >
                          {cat} ×{count}
                        </Badge>
                      ))}
                      <span className="text-xs text-slate-500">
                        {app.access_count} total access{app.access_count !== 1 ? "es" : ""}
                      </span>
                    </div>

                    {/* Analysis */}
                    <p className="text-sm text-slate-700 mb-3">{app.analysis}</p>

                    {/* Sample entry */}
                    {app.sample_entry && (
                      <div className="bg-slate-50 rounded p-2 border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1">Information from privacy report:</div>
                        <code className="text-xs text-green-700 break-all">
                          {app.sample_entry}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
