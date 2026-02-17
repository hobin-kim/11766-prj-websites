import { createBrowserRouter } from "react-router";
import { UploadPage } from "./pages/upload-page";
import { AnalysisPage } from "./pages/analysis-page";
import { ChatbotPage } from "./pages/chatbot-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: UploadPage,
  },
  {
    path: "/analysis",
    Component: AnalysisPage,
  },
  {
    path: "/chatbot",
    Component: ChatbotPage,
  },
]);
