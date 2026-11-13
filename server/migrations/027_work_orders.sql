-- Arbetsorder: a type of its own under Anteckningar, kept apart from the sticky notes.
-- A work order has a title, a description, the people working on it and a list of
-- tasks, each with one person responsible. Everyone on the work order sees all of it.
-- The status follows from the dates: Slutförd once completed_at is set, Pågår once
-- started_at is set (someone started it or marked a task as done), otherwise Ej påbörjad.
CREATE TABLE work_orders (
  id text PRIMARY KEY,
  author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (title <> ''),
  description text NOT NULL DEFAULT '',
  started_at timestamptz,
  completed_at timestamptz,
  completed_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_orders_author_idx ON work_orders (author_id);

-- The people working on the work order, apart from the one who created it.
CREATE TABLE work_order_people (
  work_order_id text NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (work_order_id, user_id)
);
CREATE INDEX work_order_people_user_idx ON work_order_people (user_id);

-- The tasks, in the order they were added. Who marked a task as done, and when, is kept
-- with it; the person stays NULL if their account is removed later.
CREATE TABLE work_order_tasks (
  id text PRIMARY KEY,
  work_order_id text NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (title <> ''),
  assignee_id text REFERENCES users(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  done_at timestamptz,
  done_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_order_tasks_order_idx ON work_order_tasks (work_order_id, position);
CREATE INDEX work_order_tasks_assignee_idx ON work_order_tasks (assignee_id);

-- Notifications about a work order disappear with it.
ALTER TABLE notifications ADD COLUMN work_order_id text REFERENCES work_orders(id) ON DELETE CASCADE;

-- The Anteckningar page hears that something changed and fetches what it may see.
CREATE TRIGGER work_orders_notify AFTER INSERT OR UPDATE OR DELETE ON work_orders
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('notes');
CREATE TRIGGER work_order_people_notify AFTER INSERT OR DELETE ON work_order_people
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('notes');
CREATE TRIGGER work_order_tasks_notify AFTER INSERT OR UPDATE OR DELETE ON work_order_tasks
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('notes');
