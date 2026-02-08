-- CreateTable
CREATE TABLE "StepLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "step" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "durationMs" INTEGER,
    "env" TEXT NOT NULL,
    "poolKey" TEXT,
    "address" TEXT,
    "managerId" TEXT,
    "managerKey" TEXT,
    "output" TEXT,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "TxLog" (
    "digest" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "env" TEXT NOT NULL,
    "poolKey" TEXT,
    "sender" TEXT,
    "kind" TEXT,
    "success" BOOLEAN,
    "error" TEXT,
    "meta" TEXT
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "env" TEXT NOT NULL,
    "poolKey" TEXT,
    "managerId" TEXT,
    "managerKey" TEXT,
    "baseKey" TEXT,
    "quoteKey" TEXT,
    "availBase" TEXT,
    "availQuote" TEXT,
    "lockedBase" TEXT,
    "lockedQuote" TEXT,
    "meta" TEXT
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "env" TEXT NOT NULL,
    "poolKey" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "managerKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "priceMicro" TEXT,
    "qtyBase" TEXT,
    "clientOrderId" TEXT,
    "orderId" TEXT,
    "txDigest" TEXT,
    "meta" TEXT
);
