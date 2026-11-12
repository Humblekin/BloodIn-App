-- BloodIn — Voice notes and request conversations
--
-- Voice notes are stored in a private storage bucket and referenced from the
-- existing messages table. A request conversation is created when a donor
-- offers to help, so the donor and requester can exchange voice notes.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'voice')),
  ADD COLUMN IF NOT EXISTS media_path TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER
    CHECK (duration_seconds IS NULL OR (duration_seconds >= 0 AND duration_seconds <= 600));

ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_check CHECK (
    (message_type = 'text' AND content IS NOT NULL AND char_length(content) BETWEEN 1 AND 5000)
    OR (message_type = 'voice' AND media_path IS NOT NULL)
  );

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS conversations_request_id_idx
  ON public.conversations (request_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-notes',
  'voice-notes',
  false,
  10485760,
  ARRAY['audio/m4a', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/3gpp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Voice notes upload by participants" ON storage.objects;
CREATE POLICY "Voice notes upload by participants"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "Voice notes read by participants" ON storage.objects;
CREATE POLICY "Voice notes read by participants"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE OR REPLACE FUNCTION public.create_request_conversation(
  p_request_id UUID,
  p_responder_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_requester UUID;
  v_existing UUID;
  v_conv UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT requester_id INTO v_requester
  FROM public.blood_requests
  WHERE id = p_request_id;

  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF auth.uid() <> v_requester AND auth.uid() <> p_responder_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.request_responses
    WHERE request_id = p_request_id
      AND responder_id = p_responder_id
  ) THEN
    RAISE EXCEPTION 'The responder has not offered to help with this request';
  END IF;

  SELECT c.id INTO v_existing
  FROM public.conversations c
  JOIN public.conversation_participants cp1
    ON cp1.conversation_id = c.id AND cp1.user_id = v_requester
  JOIN public.conversation_participants cp2
    ON cp2.conversation_id = c.id AND cp2.user_id = p_responder_id
  WHERE c.type = 'request'
    AND c.request_id = p_request_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.conversations (type, request_id)
  VALUES ('request', p_request_id)
  RETURNING id INTO v_conv;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conv, v_requester), (v_conv, p_responder_id);

  RETURN v_conv;
END;
$$;

REVOKE ALL ON FUNCTION public.create_request_conversation(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_request_conversation(UUID, UUID) TO authenticated;
