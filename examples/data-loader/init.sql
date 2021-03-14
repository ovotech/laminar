CREATE TABLE meter_reads (
  id SERIAL PRIMARY KEY,
  serial_number varchar NOT NULL,
  value DECIMAL NOT NULL,
  date TIMESTAMP NOT NULL
);

CREATE INDEX meter_reads_serial_number ON meter_reads (serial_number);
