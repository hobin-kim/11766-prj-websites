import { useNavigate } from "react-router";
import { Shield, AlertTriangle, CheckCircle, Info, MessageSquare, ArrowLeft } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";

interface NetworkInspection {
  url: string;
  status: "safe" | "warning" | "suspicious";
  category: string;
  details: string;
  dataShared: string[];
  riskLevel: "Low" | "Medium" | "High";
}

const mockInspections: NetworkInspection[] = [
  {
    url: "https://analytics.google.com/collect",
    status: "warning",
    category: "Analytics & Tracking",
    details: "Collects user behavior data and page interactions for analytics purposes",
    dataShared: ["User ID", "Page views", "Session duration", "Device info"],
    riskLevel: "Medium",
  },
  {
    url: "https://api.example-ads.com/beacon",
    status: "suspicious",
    category: "Advertising",
    details: "Third-party advertising network with extensive cross-site tracking capabilities",
    dataShared: ["Browsing history", "Location data", "Device fingerprint", "Ad interactions"],
    riskLevel: "High",
  },
  {
    url: "https://cdn.cloudflare.com/assets/bundle.js",
    status: "safe",
    category: "Content Delivery",
    details: "Standard content delivery network for static assets and libraries",
    dataShared: ["IP address (temporary)", "Request headers"],
    riskLevel: "Low",
  },
  {
    url: "https://tracking.social-media.com/pixel",
    status: "warning",
    category: "Social Media Tracking",
    details: "Social media pixel for conversion tracking and audience building",
    dataShared: ["Profile data", "Page visits", "Custom events", "Email hash"],
    riskLevel: "Medium",
  },
  {
    url: "https://api.secure-payment.com/checkout",
    status: "safe",
    category: "Payment Processing",
    details: "Encrypted payment gateway with PCI compliance for secure transactions",
    dataShared: ["Transaction amount", "Payment method type"],
    riskLevel: "Low",
  },
  {
    url: "https://fingerprint.tracker-network.io/v2/identify",
    status: "suspicious",
    category: "Device Fingerprinting",
    details: "Advanced fingerprinting service that creates unique device signatures",
    dataShared: ["Canvas fingerprint", "WebGL data", "Font list", "Browser plugins", "Screen resolution"],
    riskLevel: "High",
  },
  {
    url: "https://api.weather-service.com/forecast",
    status: "safe",
    category: "API Services",
    details: "Public weather data API with minimal data collection",
    dataShared: ["Location (if provided)", "API key"],
    riskLevel: "Low",
  },
  {
    url: "https://retargeting.adnetwork.io/sync",
    status: "warning",
    category: "Retargeting",
    details: "Cookie syncing for cross-domain retargeting campaigns",
    dataShared: ["Cookie IDs", "Site visits", "Product views", "Cart data"],
    riskLevel: "Medium",
  },
];

export function AnalysisPage() {
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "safe":
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
      case "safe":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "suspicious":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return "bg-green-100 text-green-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      case "High":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const stats = {
    total: mockInspections.length,
    safe: mockInspections.filter(i => i.status === "safe").length,
    warning: mockInspections.filter(i => i.status === "warning").length,
    suspicious: mockInspections.filter(i => i.status === "suspicious").length,
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
              <h1 className="text-3xl mb-2">Network Inspection Report</h1>
              <p className="text-slate-600">Detailed analysis of privacy and security</p>
            </div>
            <Button onClick={() => navigate("/chatbot")} className="bg-blue-600 hover:bg-blue-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Ask AI Assistant
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white">
            <div className="text-sm text-slate-600 mb-1">Total Requests</div>
            <div className="text-2xl">{stats.total}</div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="text-sm text-slate-600 mb-1">Safe</div>
            <div className="text-2xl text-green-600">{stats.safe}</div>
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
            {mockInspections.map((inspection, index) => (
              <Card key={index} className="p-6 bg-white hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(inspection.status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <code className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {inspection.url}
                        </code>
                      </div>
                      <Badge className={`ml-4 ${getRiskColor(inspection.riskLevel)}`}>
                        {inspection.riskLevel} Risk
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className={getStatusColor(inspection.status)}>
                        {inspection.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-slate-600">{inspection.category}</span>
                    </div>

                    <p className="text-slate-700 mb-3">{inspection.details}</p>

                    <div>
                      <div className="text-sm text-slate-600 mb-2">Data Shared:</div>
                      <div className="flex flex-wrap gap-2">
                        {inspection.dataShared.map((data, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-slate-100">
                            {data}
                          </Badge>
                        ))}
                      </div>
                    </div>
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
