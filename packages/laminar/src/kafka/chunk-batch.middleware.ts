import { DecodedEachBatchPayload } from './types';
import { AbstractMiddleware } from '../types';

export const chunkBatchMiddleware = ({ size = 1000 }): AbstractMiddleware<DecodedEachBatchPayload<unknown>, void> => (
  next,
) => async (payload) => {
  let start = 0;
  do {
    const messages = payload.batch.messages.slice(start, start + size);
    const offsets = messages.map(({ offset }) => +offset).sort((a, b) => a - b);

    const highestOffset = offsets[offsets.length - 1].toString();
    const lowestOffset = offsets[0].toString();

    await next({
      ...payload,
      batch: {
        ...payload.batch,
        messages,
        firstOffset: () => lowestOffset,
        lastOffset: () => highestOffset,
      },
    });
    start += size;
    await payload.heartbeat();
    payload.resolveOffset(highestOffset.toString());
    await payload.commitOffsetsIfNecessary();
  } while (payload.isRunning() && !payload.isStale() && start < payload.batch.messages.length);
};
