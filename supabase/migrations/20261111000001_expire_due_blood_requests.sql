-- Expire blood requests at their deadline and prevent new offers after expiry.

UPDATE public.blood_requests
SET status = 'expired'
WHERE status = 'active'
  AND expires_at <= now();

CREATE INDEX IF NOT EXISTS blood_requests_active_expiration_idx
  ON public.blood_requests (expires_at)
  WHERE status = 'active';

DROP POLICY IF EXISTS "Authenticated users can view requests" ON public.blood_requests;
CREATE POLICY "Authenticated users can view requests"
  ON public.blood_requests FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND expires_at > now()
  );

DROP POLICY IF EXISTS "Users can manage own requests" ON public.blood_requests;
CREATE POLICY "Users can manage own requests"
  ON public.blood_requests FOR ALL
  USING (auth.uid() = requester_id)
  WITH CHECK (
    auth.uid() = requester_id
    AND (status <> 'active' OR expires_at > now())
  );

DROP POLICY IF EXISTS "Authenticated users can offer to respond" ON public.request_responses;
CREATE POLICY "Authenticated users can offer to respond"
  ON public.request_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = responder_id
    AND EXISTS (
      SELECT 1
      FROM public.blood_requests request
      WHERE request.id = request_responses.request_id
        AND request.status = 'active'
        AND request.expires_at > now()
    )
  );

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  FOR existing_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'bloodin-expire-due-requests'
  LOOP
    PERFORM cron.unschedule(existing_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'bloodin-expire-due-requests',
    '* * * * *',
    $job$
      UPDATE public.blood_requests
      SET status = 'expired'
      WHERE status = 'active'
        AND expires_at <= now();
    $job$
  );
END;
$$;
