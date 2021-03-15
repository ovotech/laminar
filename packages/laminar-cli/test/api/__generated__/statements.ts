import { OapiContext, OapiConfig, Empty, HttpListener, openApi, OapiSecurityResolver, OapiAuthInfo, ResponseOapi } from "@ovotech/laminar";

import { Readable } from "stream";

export const openApiTyped = <R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo>(config: Config<R, TAuthInfo>): Promise<HttpListener<R>> => openApi(config);

export type ResponseWellknownHealthcheckGet = ResponseOapi<{
    success: boolean;
}, 200, "application/json">;

/**
 * Health check endpoint
 */
export type PathWellknownHealthcheckGet<R extends Empty = Empty> = (req: OapiContext & R) => Promise<ResponseWellknownHealthcheckGet>;

export type ResponseWellknownOpenapiyamlGet = ResponseOapi<string | Readable | Buffer, 200, "application/yaml">;

/**
 * The open api spec for the service. OpenAPI v3.
 */
export type PathWellknownOpenapiyamlGet<R extends Empty = Empty> = (req: OapiContext & R) => Promise<ResponseWellknownOpenapiyamlGet>;

export type ResponseWellknownOpenapihtmlGet = ResponseOapi<string | Readable | Buffer, 200, "text/html">;

/**
 * API Docs
 * The open api spec for the service. OpenAPI v3.
 */
export interface RequestWellknownOpenapihtmlGet<TAuthInfo> extends OapiContext {
    authInfo: TAuthInfo;
}

/**
 * The open api spec for the service. OpenAPI v3.
 */
export type PathWellknownOpenapihtmlGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestWellknownOpenapihtmlGet<TAuthInfo> & R) => Promise<ResponseWellknownOpenapihtmlGet>;

export type StatementsList = StatementsListItem[];

export interface StatementsListItem {
    id: string;
    ref: string;
    accountId: string;
    createdAt: string;
    isModified: boolean;
    errors: StatementError[];
    state: StatementState;
}

export interface StatementError {
    id: string;
    title?: string;
    description?: string;
}

export type StatementState = "CREATED" | "GENERATING_QUEUED" | "IDENTIFICATION_STARTED" | "IDENTIFICATION_COMPLETED" | "IDENTIFICATION_FAILED" | "GATHERING_DATA_STARTED" | "GATHERING_DATA_COMPLETED" | "GENERATING_STATEMENT_STARTED" | "GENERATING_STATEMENT_COMPLETED" | "GENERATING_ASSETS_STARTED" | "GENERATING_ASSETS_COMPLETED" | "PENDING_APPROVAL" | "SENDING_COMM_QUEUED" | "SENDING_COMM_STARTED" | "SENDING_COMM_COMPLETED" | "SENDING_DATA_TO_REFUND_TEAM" | "INVALID" | "TESTING_ONLY" | "SENDING_COMM_RETRY_POSTAL" | "SENDING_COMM_FAILED" | "COMPLETED";

export interface HttpError {
    message?: string;
}

export type ResponseV2StatementsGet = ResponseOapi<StatementsList, 200, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Account Statements
 * A full history of statements generated for an account, including invalid statements
 */
export interface RequestV2StatementsGet<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    query: {
        /**
         * Id for the account
         */
        accountId: string;
    };
    authInfo: TAuthInfo;
}

/**
 * A full history of statements generated for an account, including invalid statements
 */
export type PathV2StatementsGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2StatementsGet<TAuthInfo> & R) => Promise<ResponseV2StatementsGet>;

export type LossType = "ChangeOfTenancy" | "EstimatedLoss" | "SupplyLoss";

export type ResponseV2StatementsPost = ResponseOapi<StatementsListItem, 200, "application/json"> | ResponseOapi<HttpError, 409, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Generate a Statement
 * Manually start generating a statement for a given account
 */
export interface RequestV2StatementsPost<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    body: {
        accountId: string;
        force?: boolean;
        forceLossType?: LossType;
        forceLossDate?: string;
    };
    authInfo: TAuthInfo;
}

/**
 * Manually start generating a statement for a given account
 */
export type PathV2StatementsPost<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2StatementsPost<TAuthInfo> & R) => Promise<ResponseV2StatementsPost>;

export interface StatementData {
    id: string;
    ref: string;
    state: StatementState;
    errors?: StatementError[];
    account: StatementDataAccount;
    html?: boolean;
    pdf?: boolean;
    comm?: StatementComm;
    modification?: StatementDataModification;
    money?: StatementMoney;
    supplies: (StatementDataSupplyGas | StatementDataSupplyElec)[];
}

export interface StatementDataAccount {
    id: string;
    globalId?: string;
    lossType?: LossType;
    isEconomyEnergy?: boolean;
    address?: Address;
    transactions: Transaction[];
}

export interface Address {
    firstName: string;
    lastName: string;
    town: string;
    postcode: string;
    address: string;
}

export interface Transaction {
    id: string;
    type: "Billy" | "Old" | "Bit" | "Finance";
    date: string;
    description: string;
    amount: number;
    balance?: number;
    included?: boolean;
}

export type StatementComm = {
    id: string;
    status?: string;
    sentAt?: string;
} | {
    queuedAt: string;
};

export interface StatementDataModification {
    note?: string;
    createdAt: string;
    modifications: Modification[];
}

export type Modification = ModificationTransactionRemove | ModificationMeterTransactionRemove | ModificationTransactionAdd;

export interface ModificationTransactionRemove {
    type: "BillyTransactionRemove" | "FinanceTransactionRemove" | "QuantumTopUpRemove" | "D188Remove" | "OldTopUpRemove" | "BitTransactionRemove";
    id: string;
}

export interface ModificationMeterTransactionRemove {
    type: "VendTransactionRemove" | "S2TopUpRemove";
    id: string;
    meterType: "gas" | "elec";
}

export interface ModificationTransactionAdd {
    type: "AddManualTransaction" | "AddManualTopUp";
    description: string;
    dateTime: string;
    amount: number;
}

export interface StatementMoney {
    totalIn: number;
    totalOut: number;
    balance: number;
}

export interface StatementDataSupplyGas {
    type: "gas";
    mpxn: string;
    service: DateInterval;
    ownership: DateInterval;
    flows: FlowGas[];
    msds: MsdGas[];
    rates: Rate[];
    projection: Projection;
    address?: string;
    transactions: MeterTransaction[];
}

export interface DateInterval {
    from?: string;
    to?: string;
}

export interface FlowGas {
    type: string;
    msn: string;
    date: string;
    value: number;
    details: string;
}

export interface MsdGas {
    msn: string;
    date?: string;
    value: number;
    balance?: number;
}

export interface Rate {
    dates: DateInterval;
    plan: string;
    unit?: number;
    unitAdditional?: number;
    standing?: number;
}

export interface Projection {
    source: string;
    plan?: string;
    from?: string;
    value?: number;
    valueAdditional?: number;
}

export interface MeterTransaction {
    msn: string;
    id: string;
    type: "Vend" | "S2" | "Quantum" | "D188";
    date: string;
    description: string;
    amount: number;
    balance?: number;
    included?: boolean;
}

export interface StatementDataSupplyElec {
    type: "elec";
    mpxn: string;
    service: DateInterval;
    ownership: DateInterval;
    flows: FlowElec[];
    msds: MsdElec[];
    rates: Rate[];
    projection: Projection;
    address?: string;
    transactions: MeterTransaction[];
}

export interface FlowElec {
    type: string;
    msn: string;
    date: string;
    registers: RegisterValue[];
    details: string;
}

export interface RegisterValue {
    id: string;
    value: number;
}

export interface MsdElec {
    msn: string;
    balance?: number;
    date: string;
    register1: number;
    register2?: number;
    totalRegister: number;
}

export type ResponseV2StatementsIdDataGet = ResponseOapi<StatementData, 200, "application/json"> | ResponseOapi<HttpError, 404, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Statement Data
 * Raw data used to generate a statement for an account, at the point of generation.
 */
export interface RequestV2StatementsIdDataGet<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    path: {
        /**
         * Statement Id number
         */
        id: string;
    };
    authInfo: TAuthInfo;
}

/**
 * Raw data used to generate a statement for an account, at the point of generation.
 */
export type PathV2StatementsIdDataGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2StatementsIdDataGet<TAuthInfo> & R) => Promise<ResponseV2StatementsIdDataGet>;

export type ResponseV2StatementsIdApprovalPost = ResponseOapi<{
    success: boolean;
}, 200, "application/json"> | ResponseOapi<HttpError, 400, "application/json"> | ResponseOapi<HttpError, 404, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Approve a statement
 * Approve a given statement to be sent to the customer
 */
export interface RequestV2StatementsIdApprovalPost<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    path: {
        /**
         * Statement Id number
         */
        id: string;
    };
    authInfo: TAuthInfo;
}

/**
 * Approve a given statement to be sent to the customer
 */
export type PathV2StatementsIdApprovalPost<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2StatementsIdApprovalPost<TAuthInfo> & R) => Promise<ResponseV2StatementsIdApprovalPost>;

export type ResponseV2StatementsIdModificationsPost = ResponseOapi<StatementData, 200, "application/json"> | ResponseOapi<HttpError, 400, "application/json"> | ResponseOapi<HttpError, 404, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Apply modifications
 * Save modificaitons for the current statement
 */
export interface RequestV2StatementsIdModificationsPost<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    path: {
        /**
         * Statement Id number
         */
        id: string;
    };
    body: {
        modification: StatementDataModification;
        dryRun?: boolean;
    };
    authInfo: TAuthInfo;
}

/**
 * Save modificaitons for the current statement
 */
export type PathV2StatementsIdModificationsPost<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2StatementsIdModificationsPost<TAuthInfo> & R) => Promise<ResponseV2StatementsIdModificationsPost>;

export type ResponseV2StatementsIdPdfGet = ResponseOapi<string | Readable | Buffer, 200, "application/pdf"> | ResponseOapi<HttpError, 400, "application/json"> | ResponseOapi<HttpError, 404, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Statement PDF
 * Retrieve the pdf of a generated statement
 */
export interface RequestV2StatementsIdPdfGet<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    path: {
        /**
         * Statement Id number
         */
        id: string;
    };
    authInfo: TAuthInfo;
}

/**
 * Retrieve the pdf of a generated statement
 */
export type PathV2StatementsIdPdfGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2StatementsIdPdfGet<TAuthInfo> & R) => Promise<ResponseV2StatementsIdPdfGet>;

export type ResponseV2StatementsIdHtmlGet = ResponseOapi<string | Readable | Buffer, 200, "text/html"> | ResponseOapi<HttpError, 404, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Statement Html
 * Retrieve the html, used to generate the statement pdf
 */
export interface RequestV2StatementsIdHtmlGet<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    path: {
        /**
         * Statement Id number
         */
        id: string;
    };
    authInfo: TAuthInfo;
}

/**
 * Retrieve the html, used to generate the statement pdf
 */
export type PathV2StatementsIdHtmlGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2StatementsIdHtmlGet<TAuthInfo> & R) => Promise<ResponseV2StatementsIdHtmlGet>;

export type ResponseV2ReportsDailyPost = ResponseOapi<{
    success: boolean;
}, 200, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Generate Daily Reports
 * Generate all daily reports for the day. Should be called by a cron service
 */
export interface RequestV2ReportsDailyPost<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    authInfo: TAuthInfo;
}

/**
 * Generate all daily reports for the day. Should be called by a cron service
 */
export type PathV2ReportsDailyPost<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2ReportsDailyPost<TAuthInfo> & R) => Promise<ResponseV2ReportsDailyPost>;

export interface ReportsList {
    items: ReportsListItem[];
    total: number;
}

export interface ReportsListItem {
    filename: string;
    createdAt: string;
}

export type ResponseV2ReportsTypeGet = ResponseOapi<ReportsList, 200, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Report list
 * Return a list of reports for a specific type
 */
export interface RequestV2ReportsTypeGet<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    path: {
        /**
         * Report type
         */
        type: "errors" | "foundation" | "statements" | "memos" | "refunds";
    };
    query: {
        /**
         * Start from this id
         */
        offset?: string;
    };
    authInfo: TAuthInfo;
}

/**
 * Return a list of reports for a specific type
 */
export type PathV2ReportsTypeGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2ReportsTypeGet<TAuthInfo> & R) => Promise<ResponseV2ReportsTypeGet>;

export type ResponseV2ReportsTypePost = ResponseOapi<{
    success: boolean;
}, 200, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Generate a Report
 * Trigger report generation for a specific type, you can pick the date range, but by default it would use the current day
 */
export interface RequestV2ReportsTypePost<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    path: {
        /**
         * Report type
         */
        type: "errors" | "foundation" | "statements" | "memos" | "refunds";
    };
    body: {
        date: string;
    } | {
        fromDate: string;
        toDate: string;
    };
    authInfo: TAuthInfo;
}

/**
 * Trigger report generation for a specific type, you can pick the date range, but by default it would use the current day
 */
export type PathV2ReportsTypePost<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2ReportsTypePost<TAuthInfo> & R) => Promise<ResponseV2ReportsTypePost>;

export type ResponseV2ReportsTypeFilenameGet = ResponseOapi<string | Readable | Buffer, 200, "text/csv"> | ResponseOapi<HttpError, 404, "application/json"> | ResponseOapi<HttpError, 500, "application/json">;

/**
 * Report file
 * A report file in CSV format
 */
export interface RequestV2ReportsTypeFilenameGet<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    path: {
        /**
         * Report type
         */
        type: "errors" | "foundation" | "statements" | "memos" | "refunds";
        /**
         * Report filename
         */
        filename: string;
    };
    authInfo: TAuthInfo;
}

/**
 * A report file in CSV format
 */
export type PathV2ReportsTypeFilenameGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestV2ReportsTypeFilenameGet<TAuthInfo> & R) => Promise<ResponseV2ReportsTypeFilenameGet>;

export interface Config<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> extends OapiConfig<R> {
    paths: {
        "/.well-known/health-check": {
            /**
             * Health check endpoint
             */
            get: PathWellknownHealthcheckGet<R>;
        };
        "/.well-known/openapi.yaml": {
            /**
             * The open api spec for the service. OpenAPI v3.
             */
            get: PathWellknownOpenapiyamlGet<R>;
        };
        "/.well-known/openapi.html": {
            /**
             * The open api spec for the service. OpenAPI v3.
             */
            get: PathWellknownOpenapihtmlGet<R, TAuthInfo>;
        };
        "/v2/statements": {
            /**
             * A full history of statements generated for an account, including invalid statements
             */
            get: PathV2StatementsGet<R, TAuthInfo>;
            /**
             * Manually start generating a statement for a given account
             */
            post: PathV2StatementsPost<R, TAuthInfo>;
        };
        "/v2/statements/{id}/data": {
            /**
             * Raw data used to generate a statement for an account, at the point of generation.
             */
            get: PathV2StatementsIdDataGet<R, TAuthInfo>;
        };
        "/v2/statements/{id}/approval": {
            /**
             * Approve a given statement to be sent to the customer
             */
            post: PathV2StatementsIdApprovalPost<R, TAuthInfo>;
        };
        "/v2/statements/{id}/modifications": {
            /**
             * Save modificaitons for the current statement
             */
            post: PathV2StatementsIdModificationsPost<R, TAuthInfo>;
        };
        "/v2/statements/{id}/pdf": {
            /**
             * Retrieve the pdf of a generated statement
             */
            get: PathV2StatementsIdPdfGet<R, TAuthInfo>;
        };
        "/v2/statements/{id}/html": {
            /**
             * Retrieve the html, used to generate the statement pdf
             */
            get: PathV2StatementsIdHtmlGet<R, TAuthInfo>;
        };
        "/v2/reports/daily": {
            /**
             * Generate all daily reports for the day. Should be called by a cron service
             */
            post: PathV2ReportsDailyPost<R, TAuthInfo>;
        };
        "/v2/reports/{type}": {
            /**
             * Return a list of reports for a specific type
             */
            get: PathV2ReportsTypeGet<R, TAuthInfo>;
            /**
             * Trigger report generation for a specific type, you can pick the date range, but by default it would use the current day
             */
            post: PathV2ReportsTypePost<R, TAuthInfo>;
        };
        "/v2/reports/{type}/{filename}": {
            /**
             * A report file in CSV format
             */
            get: PathV2ReportsTypeFilenameGet<R, TAuthInfo>;
        };
    };
    security: {
        BearerAuth: OapiSecurityResolver<R, TAuthInfo>;
    };
}
