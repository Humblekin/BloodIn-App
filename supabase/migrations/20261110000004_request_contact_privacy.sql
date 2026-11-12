-- BloodIn — Restrict blood request contact numbers
--
-- Contact numbers are no longer stored on the publicly readable blood_requests
-- row. They live in a separate table that only the requester and donors who
-- offered to help can read.

CREATE TABLE IF NOT EXISTS public.blood_request_contacts (
  request_id UUID PRIMARY KEY REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  contact_number TEXT NOT NULL CHECK (char_length(btrim(contact_number)) BETWEEN 1 AND 128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.blood_request_contacts (request_id, contact_number)
SELECT id, btrim(contact_number)
FROM public.blood_requests
WHERE contact_number IS NOT NULL
  AND btrim(contact_number) <> ''
ON CONFLICT (request_id) DO NOTHING;

ALTER TABLE public.blood_request_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requester and responders can read request contact" ON public.blood_request_contacts;
CREATE POLICY "Requester and responders can read request contact"
  ON public.blood_request_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.blood_requests br
      WHERE br.id = blood_request_contacts.request_id
        AND br.requester_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.request_responses rr
      WHERE rr.request_id = blood_request_contacts.request_id
        AND rr.responder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Requester can create request contact" ON public.blood_request_contacts;
CREATE POLICY "Requester can create request contact"
  ON public.blood_request_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.blood_requests br
      WHERE br.id = blood_request_contacts.request_id
        AND br.requester_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Requester can update request contact" ON public.blood_request_contacts;
CREATE POLICY "Requester can update request contact"
  ON public.blood_request_contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.blood_requests br
      WHERE br.id = blood_request_contacts.request_id
        AND br.requester_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.blood_requests br
      WHERE br.id = blood_request_contacts.request_id
        AND br.requester_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Requester can delete request contact" ON public.blood_request_contacts;
CREATE POLICY "Requester can delete request contact"
  ON public.blood_request_contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.blood_requests br
      WHERE br.id = blood_request_contacts.request_id
        AND br.requester_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_request_contacts TO authenticated;

ALTER TABLE public.blood_requests DROP COLUMN IF EXISTS contact_number;
