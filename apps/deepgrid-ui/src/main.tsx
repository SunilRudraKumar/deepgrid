// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { dAppKit } from "./config/dApp-kit";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <App />
      </DAppKitProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
