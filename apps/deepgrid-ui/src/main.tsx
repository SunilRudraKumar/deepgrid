import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { dAppKit } from "./config/dApp-kit.ts";
import "./index.css";
import { DAppKitProvider } from "@mysten/dapp-kit-react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DAppKitProvider dAppKit={dAppKit} defaultNetwork="mainnet">
      <App />
    </DAppKitProvider>
  </React.StrictMode>,
);
