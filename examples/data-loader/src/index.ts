import { init } from "@ovotech/laminar";
import { services } from "./services";


await init([pool, [httpServer, meterReadingService]], console);

main();
