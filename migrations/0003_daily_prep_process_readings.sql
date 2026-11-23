-- 仕込み水温・捏ね上げ温度、気象欠測、冪等キー（local 検証用）

ALTER TABLE pizza_lab_daily_prep_records ADD COLUMN process_readings_json TEXT;
ALTER TABLE pizza_lab_daily_prep_records ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX idx_pizza_lab_daily_prep_idempotency
  ON pizza_lab_daily_prep_records (idempotency_key)
  WHERE idempotency_key IS NOT NULL;