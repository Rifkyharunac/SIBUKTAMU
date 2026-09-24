ALTER TABLE whatsapp_notification_logs ADD COLUMN recipient_user_id TEXT REFERENCES users(id);
ALTER TABLE whatsapp_notification_logs ADD COLUMN event_type TEXT NOT NULL DEFAULT 'ARRIVAL';
CREATE INDEX notification_user_unread_idx ON whatsapp_notification_logs(recipient_user_id, is_read, created_at);
CREATE TABLE admin_push_config (id TEXT PRIMARY KEY, public_key TEXT NOT NULL, private_key TEXT NOT NULL);
CREATE TABLE admin_push_subscriptions (
 endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
 session_id TEXT NOT NULL REFERENCES admin_sessions(id) ON DELETE CASCADE,
 p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX admin_push_user_idx ON admin_push_subscriptions(user_id);
