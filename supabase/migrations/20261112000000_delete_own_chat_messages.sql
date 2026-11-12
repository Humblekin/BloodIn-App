-- Allow message authors to remove their own chat messages and voice notes.
-- Full replica identity provides the conversation ID in DELETE events.
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Users delete own messages" ON public.messages;
CREATE POLICY "Users delete own messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid()
    AND COALESCE(is_system_message, false) = false
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Voice notes delete by sender" ON storage.objects;
CREATE POLICY "Voice notes delete by sender"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.is_conversation_participant(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );
