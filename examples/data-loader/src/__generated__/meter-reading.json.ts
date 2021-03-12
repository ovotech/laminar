/* eslint-disable @typescript-eslint/no-namespace */

import Decimal from "decimal.js";

export type MeterReading = ComExampleEvents.MeterReading;

export namespace ComExampleMetadata {
    export const EventMetadataName = "com.example.metadata.EventMetadata";
    /**
     * Metadata, to be used in each event class
     */
    export interface EventMetadata {
        /**
         * A globally unique ID for this Kafka message
         */
        eventId: string;
        /**
         * An ID that can be used to link all the requests and Kafka messages in a given transaction. If you already have a trace token from a previous event/request, you should copy it here. If this is the very start of a transaction, you should generate a fresh trace token and put it here. A UUID is suitable
         */
        traceToken: string;
        /**
         * A timestamp for when the event was created (in epoch millis)
         */
        createdAt: Date;
    }
}

export namespace ComExampleEvents {
    export const MeterReadingName = "com.example.events.MeterReading";
    /**
     * A meter reading
     */
    export interface MeterReading {
        metadata: ComExampleMetadata.EventMetadata;
        serialNumber: string;
        date: Date;
        value: Decimal;
    }
}
