-- A handover from one shift to the shift leaders the sender chose, shown in the chat
-- as a card. It holds the priority, how GD, ETIKETTO and Packning went and the
-- recipients' names as they were when it was sent (see server/handover.js).
ALTER TABLE chat_messages ADD COLUMN handover jsonb;
ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_content_check
  CHECK (body <> '' OR image IS NOT NULL OR handover IS NOT NULL);
