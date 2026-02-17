import { Shield, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface PrivacyAccess {
  bundleId: string;
  appName: string;
  category: "location" | "contacts" | "photos" | "camera" | "microphone";
  accessCount: number;
  status: "normal" | "warning" | "suspicious";
  analysis: string;
  riskScore: number;
  sampleData: string;
}

const mockInspections: PrivacyAccess[] = [
  {
    bundleId: "com.apple.weather",
    appName: "Weather",
    category: "location",
    accessCount: 12,
    status: "normal",
    analysis: "Standard location access for weather forecasting, multiple interval accesses detected",
    riskScore: 3.2,
    sampleData: '{"accessor":{"identifier":"com.apple.weather","identifierType":"bundleID"},"category":"location","kind":"intervalBegin","timeStamp":"2026-02-16T14:08:41.961-05:00"}'
  },
  {
    bundleId: "com.apple.mobilemail",
    appName: "Mail",
    category: "contacts",
    accessCount: 1,
    status: "normal",
    analysis: "Normal contacts access for email autocomplete and contact suggestions",
    riskScore: 2.8,
    sampleData: '{"accessor":{"identifier":"com.apple.mobilemail","identifierType":"bundleID"},"category":"contacts","kind":"intervalBegin","timeStamp":"2026-02-16T14:09:37.204-05:00"}'
  },
  {
    bundleId: "com.apple.mobilecal",
    appName: "Calendar",
    category: "contacts",
    accessCount: 1,
    status: "normal",
    analysis: "Expected contacts access for event invitations and attendee management",
    riskScore: 2.5,
    sampleData: '{"accessor":{"identifier":"com.apple.mobilecal","identifierType":"bundleID"},"category":"contacts","kind":"intervalBegin","timeStamp":"2026-02-16T14:09:37.688-05:00"}'
  },
  {
    bundleId: "com.apple.MobileSMS",
    appName: "Messages",
    category: "contacts",
    accessCount: 2,
    status: "normal",
    analysis: "Standard contacts access for messaging functionality, two separate intervals detected",
    riskScore: 2.9,
    sampleData: '{"accessor":{"identifier":"com.apple.MobileSMS","identifierType":"bundleID"},"category":"contacts","kind":"intervalBegin","timeStamp":"2026-02-16T14:09:38.167-05:00"}'
  },
  {
    bundleId: "com.suspicious.tracker",
    appName: "Unknown App",
    category: "location",
    accessCount: 45,
    status: "suspicious",
    analysis: "Excessive location access detected - significantly higher than normal app behavior",
    riskScore: 8.7,
    sampleData: '{"accessor":{"identifier":"com.suspicious.tracker","identifierType":"bundleID"},"category":"location","kind":"intervalBegin","timeStamp":"2026-02-16T15:30:00.000-05:00"}'
  },
  {
    bundleId: "com.example.photoshare",
    appName: "Photo Sharing App",
    category: "photos",
    accessCount: 8,
    status: "warning",
    analysis: "Moderate photo library access - review if app requires this level of access",
    riskScore: 6.1,
    sampleData: '{"accessor":{"identifier":"com.example.photoshare","identifierType":"bundleID"},"category":"photos","kind":"intervalBegin","timeStamp":"2026-02-16T16:00:00.000-05:00"}'
  },
];

interface AnalysisPanelProps {
  isAnalyzed: boolean;
}

export function AnalysisPanel({ isAnalyzed }: AnalysisPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "normal":
        return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />;
      case "suspicious":
        return <Shield className="w-3.5 h-3.5 text-red-600" />;
      default:
        return null;
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 4) return "text-green-600";
    if (score < 7) return "text-yellow-600";
    return "text-red-600";
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      location: "bg-blue-100 text-blue-700 border-blue-200",
      contacts: "bg-purple-100 text-purple-700 border-purple-200",
      photos: "bg-pink-100 text-pink-700 border-pink-200",
      camera: "bg-orange-100 text-orange-700 border-orange-200",
      microphone: "bg-teal-100 text-teal-700 border-teal-200",
    };
    return colors[category] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  const stats = {
    total: mockInspections.length,
    avgRisk: (mockInspections.reduce((acc, i) => acc + i.riskScore, 0) / mockInspections.length).toFixed(1),
    high: mockInspections.filter(i => i.riskScore >= 7).length,
  };

  return (
    <Card className="bg-white border-slate-200 p-5 flex flex-col h-[500px] shadow-sm">
      <div className="mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-50 rounded-lg mb-2">
          <Search className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="text-xl text-slate-900 mb-1">Inspection Results</h2>
        <p className="text-xs text-slate-600">Privacy access analysis</p>
      </div>

      {!isAnalyzed ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Waiting for file analysis...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-50 border border-slate-200 p-2 rounded">
              <div className="text-xs text-slate-600">Total Apps</div>
              <div className="text-lg text-slate-900">{stats.total}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded">
              <div className="text-xs text-slate-600">Avg Risk</div>
              <div className={`text-lg ${getRiskColor(parseFloat(stats.avgRisk))}`}>{stats.avgRisk}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded">
              <div className="text-xs text-slate-600">High Risk</div>
              <div className="text-lg text-red-600">{stats.high}</div>
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {mockInspections.map((inspection, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-start gap-2 mb-2">
                    {getStatusIcon(inspection.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-900">{inspection.appName}</span>
                        <span className={`text-xs font-mono ${getRiskColor(inspection.riskScore)}`}>
                          {inspection.riskScore}
                        </span>
                      </div>
                      <code className="text-xs text-slate-600 block truncate">
                        {inspection.bundleId}
                      </code>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-xs px-1.5 py-0 border ${getCategoryColor(inspection.category)}`}>
                      {inspection.category}
                    </Badge>
                    <span className="text-xs text-slate-600">{inspection.accessCount} accesses</span>
                  </div>

                  <p className="text-xs text-slate-700 mb-2 leading-relaxed">
                    {inspection.analysis}
                  </p>

                  {/* Sample Data */}
                  <div className="bg-white rounded p-2 border border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">Sample data:</div>
                    <code className="text-xs text-green-700 break-all">
                      {inspection.sampleData}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </Card>
  );
}
