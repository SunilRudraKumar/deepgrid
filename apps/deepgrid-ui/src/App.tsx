import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/layout/AppHeader";
import { TradePage } from "./pages/trade/TradePage";
import { GridBotPage } from "./pages/grid/GridBotPage";
import { DebugPage } from "./pages/debug/DebugPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />

        <main className="mx-auto w-full max-w-7xl p-4">
          <Routes>
            <Route path="/" element={<TradePage />} />
            <Route path="/grid" element={<GridBotPage />} />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
