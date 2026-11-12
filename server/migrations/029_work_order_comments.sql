-- Comments on a work order, by anyone on it. They go with the work order.
CREATE TABLE work_order_comments (
  id text PRIMARY KEY,
  work_order_id text NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (body <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_order_comments_order_idx ON work_order_comments (work_order_id, created_at);

CREATE TRIGGER work_order_comments_notify AFTER INSERT OR DELETE ON work_order_comments
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('notes');
