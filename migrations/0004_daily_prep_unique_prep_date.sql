-- 同一店舗・同一仕込み日（JST）の記録は1件（別保存操作の重複防止）

CREATE UNIQUE INDEX idx_pizza_lab_daily_prep_shop_prep_date
  ON pizza_lab_daily_prep_records (COALESCE(shop_id, ''), prep_date_jst);