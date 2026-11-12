-- BloodIn — Organization membership lifecycle
--
-- Makes organizations behave like communities for membership:
--   * organizations.join_policy  (open | request | invite_only)
--   * organizations.member_count (maintained by trigger)
--   * organization_members.status (pending | active | suspended | left), with
--     is_active kept in sync for the existing RLS helper functions.
--   * Join/leave/rejoin + approval/promotion guards.
--
-- Existing organizations are backfilled with their creator as `owner` so the
-- seeded institutions can be managed. The migration is additive; no tables or
-- columns are dropped.

-- ── 1. Columns ──────────────────────────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS join_policy TEXT NOT NULL DEFAULT 'request'
    CHECK (join_policy IN ('open', 'request', 'invite_only')),
  ADD COLUMN IF NOT EXISTS member_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended', 'left'));

-- Rows added above default to 'active'; correct any previously-inactive rows.
UPDATE public.organization_members
SET status = 'suspended'
WHERE status = 'active' AND is_active = false;

-- Embed profiles in membership queries (matches community_members).
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ── 2. Keep is_active in sync with status ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_organization_member_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_organization_member_active ON public.organization_members;
CREATE TRIGGER sync_organization_member_active
  BEFORE INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_organization_member_active();

-- ── 3. Membership helpers consider status ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_organization_member(
  target_organization_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND user_id = target_user_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_leader(
  target_organization_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND user_id = target_user_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

-- ── 4. Accurate member_count ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recount_organization_members(p_organization_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.organizations
  SET member_count = (
    SELECT COUNT(*)
    FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND status = 'active'
  )
  WHERE id = p_organization_id;
$$;

CREATE OR REPLACE FUNCTION public.sync_organization_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recount_organization_members(OLD.organization_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recount_organization_members(OLD.organization_id);
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      PERFORM public.recount_organization_members(NEW.organization_id);
    END IF;
  ELSE
    PERFORM public.recount_organization_members(NEW.organization_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_organization_member_count ON public.organization_members;
CREATE TRIGGER sync_organization_member_count
  AFTER INSERT OR DELETE OR UPDATE OF status, organization_id
  ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_organization_member_count();

-- ── 5. Join guard: enforce role + status from join_policy ───────────────────
CREATE OR REPLACE FUNCTION public.guard_organization_member_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy TEXT;
  v_creator UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service-role / migration context
  END IF;

  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only join as yourself';
  END IF;

  SELECT join_policy, created_by INTO v_policy, v_creator
  FROM public.organizations
  WHERE id = NEW.organization_id;

  -- The organization creator is seeded as an active owner.
  IF NEW.user_id = v_creator AND NEW.role = 'owner' THEN
    NEW.status := 'active';
    RETURN NEW;
  END IF;

  NEW.role := 'staff';
  NEW.status := CASE WHEN v_policy = 'open' THEN 'active' ELSE 'pending' END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_organization_member_insert ON public.organization_members;
CREATE TRIGGER guard_organization_member_insert
  BEFORE INSERT ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_organization_member_insert();

-- ── 6. Update guard: leave, rejoin, approve, promote, demote ────────────────
CREATE OR REPLACE FUNCTION public.guard_organization_member_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_role TEXT;
  v_is_self BOOLEAN;
BEGIN
  IF v_actor IS NULL THEN
    RETURN NEW; -- service-role / migration context
  END IF;

  v_is_self := (NEW.user_id = v_actor);

  SELECT role INTO v_actor_role
  FROM public.organization_members
  WHERE organization_id = NEW.organization_id
    AND user_id = v_actor
    AND status = 'active';

  IF v_is_self THEN
    -- Leaving: status -> left, demoted to staff.
    IF NEW.status = 'left' AND NEW.role = 'staff'
       AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
       AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
      IF OLD.role = 'owner' AND NOT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = OLD.organization_id
          AND role = 'owner'
          AND status = 'active'
          AND user_id <> OLD.user_id
      ) THEN
        RAISE EXCEPTION 'The last owner cannot leave. Transfer ownership first.';
      END IF;
      RETURN NEW;
    END IF;

    -- Rejoining a previously-left membership as staff.
    IF OLD.status = 'left' AND NEW.status IN ('active', 'pending') AND NEW.role = 'staff'
       AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
       AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
      RETURN NEW;
    END IF;

    IF v_actor_role IS NULL OR v_actor_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'You can only leave or rejoin the organization';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'You cannot change your own role';
    END IF;
  END IF;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only organization leaders can manage members';
  END IF;

  -- Only owners may grant/revoke owner or touch an owner row.
  IF v_actor_role <> 'owner' AND (OLD.role = 'owner' OR NEW.role = 'owner') THEN
    RAISE EXCEPTION 'Only owners can manage owner roles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_organization_member_update ON public.organization_members;
CREATE TRIGGER guard_organization_member_update
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_organization_member_update();

-- ── 7. RLS: roster visibility + self-service leave/rejoin ───────────────────
-- Active members can read the roster; everyone can read their own row so the
-- join/leave state stays usable. Mirrors community_members.
DROP POLICY IF EXISTS "Members can view org memberships" ON public.organization_members;
CREATE POLICY "Members can view org memberships"
  ON public.organization_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_organization_member(organization_id, auth.uid())
  );

DROP POLICY IF EXISTS "Members can update own org membership" ON public.organization_members;
CREATE POLICY "Members can update own org membership"
  ON public.organization_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 8. Backfill: creator becomes owner of existing organizations ────────────
INSERT INTO public.organization_members (organization_id, user_id, role, status, is_active)
SELECT o.id, o.created_by, 'owner', 'active', true
FROM public.organizations o
-- Only backfill creators that still have a profile (user_id now FKs profiles).
JOIN public.profiles p ON p.id = o.created_by
WHERE o.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = o.id AND m.role = 'owner'
  )
ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = 'owner', status = 'active', is_active = true;

-- Recompute counts for every organization.
UPDATE public.organizations o
SET member_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT organization_id, COUNT(*) FILTER (WHERE status = 'active') AS cnt
  FROM public.organization_members
  GROUP BY organization_id
) sub
WHERE o.id = sub.organization_id;

UPDATE public.organizations o
SET member_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members m WHERE m.organization_id = o.id
);
